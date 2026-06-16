const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const { openai, config, isConfigured } = require('../../config/openai');
const { fetch } = globalThis;

const ensureAiConfigured = () => {
  if (!isConfigured) {
    throw new AppError('AI provider is not configured', 500);
  }

  return true;
};

const getProvider = () => config.provider || 'none';

const getGeminiBaseUrl = (model, method) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseJsonPayload = (content) => {
  const sanitized = String(content || '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(sanitized);
  } catch (error) {
    const match = sanitized.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (jsonError) {
        try {
          return Function(`"use strict"; return (${match[0]});`)();
        } catch (jsError) {
          throw new AppError('AI returned invalid JSON', 500, {
            reason: jsError.message || jsonError.message,
          });
        }
      }
    }

    throw new AppError('AI returned invalid JSON', 500, {
      reason: error.message,
    });
  }
};

const extractGeminiText = (payload) => {
  const candidates = payload?.candidates || [];
  const parts = candidates[0]?.content?.parts || [];
  return parts.map((part) => part?.text || '').join('').trim();
};

const extractGeminiEmbedding = (payload) => {
  const embedding =
    payload?.embedding?.values ||
    payload?.embeddings?.[0]?.values ||
    payload?.embeddings?.[0]?.embeddingValues ||
    [];

  return Array.isArray(embedding) ? embedding : [];
};

const fetchJsonWithRetry = async (url, options, attempts = 2) => {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const rawText = await response.text();

      let payload = {};
      try {
        payload = rawText ? JSON.parse(rawText) : {};
      } catch (error) {
        throw new AppError('AI returned invalid JSON', 500, {
          reason: error.message,
        });
      }

      return { response, payload };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError;
};

const interviewQuestionsResponseSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question_order: { type: 'integer' },
          question: { type: 'string' },
          type: { type: 'string' },
          skill: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
          correct_option_index: { type: 'integer' },
        },
        required: [
          'question_order',
          'question',
          'type',
          'skill',
          'options',
          'correct_option_index',
        ],
        propertyOrdering: [
          'question_order',
          'question',
          'type',
          'skill',
          'options',
          'correct_option_index',
        ],
      },
    },
  },
  required: ['questions'],
  propertyOrdering: ['questions'],
};

const callGeminiJsonCompletion = async ({
  systemPrompt,
  userPrompt,
  model = config.geminiModel,
  maxTokens = config.geminiMaxOutputTokens,
  temperature = config.geminiTemperature,
}) => {
  ensureAiConfigured();

  const { response, payload } = await fetchJsonWithRetry(
    `${getGeminiBaseUrl(model, 'generateContent')}?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          responseSchema: interviewQuestionsResponseSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    const message =
      payload?.error?.message || `Gemini request failed with status ${response.status}`;
    throw new AppError(message, 500, {
      status: response.status,
    });
  }

  const content = extractGeminiText(payload) || '{}';
  const parsed = parseJsonPayload(content);

  return {
    ...parsed,
    content,
    raw: payload,
    model,
    tokensUsed: payload?.usageMetadata?.totalTokenCount || null,
  };
};

const createEmbedding = async (input) => {
  ensureAiConfigured();

  if (getProvider() === 'gemini' && config.geminiApiKey) {
    const { response, payload } = await fetchJsonWithRetry(
      `${getGeminiBaseUrl(config.geminiEmbeddingModel, 'embedContent')}?key=${encodeURIComponent(config.geminiApiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.geminiEmbeddingModel,
          content: {
            parts: [{ text: input }],
          },
          taskType: 'SEMANTIC_SIMILARITY',
          outputDimensionality: config.geminiEmbeddingDimensions,
        }),
      },
    );

    if (!response.ok) {
      const message =
        payload?.error?.message || `Gemini embedding request failed with status ${response.status}`;
      throw new AppError(message, 500, {
        status: response.status,
      });
    }

    const embedding = extractGeminiEmbedding(payload);
    if (!embedding.length) {
      throw new AppError('Failed to generate embedding', 500);
    }

    return {
      embedding,
      model: config.geminiEmbeddingModel,
      raw: payload,
    };
  }

  const client = openai;
  if (!client) {
    throw new AppError('OpenAI is not configured', 500);
  }

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input,
  });

  const embedding = response?.data?.[0]?.embedding || [];
  if (!embedding.length) {
    throw new AppError('Failed to generate embedding', 500);
  }

  return {
    embedding,
    model: 'text-embedding-3-small',
    raw: response,
  };
};

const generateJsonCompletion = async ({
  systemPrompt,
  userPrompt,
  model = getProvider() === 'gemini' ? config.geminiModel : config.openaiModel,
  maxTokens = getProvider() === 'gemini'
    ? config.geminiMaxOutputTokens
    : config.openaiMaxTokens,
  temperature = Math.min(
    getProvider() === 'gemini' ? config.geminiTemperature : config.openaiTemperature,
    0.4,
  ),
}) => {
  ensureAiConfigured();

  try {
    if (getProvider() === 'gemini' && config.geminiApiKey) {
      return await callGeminiJsonCompletion({
        systemPrompt,
        userPrompt,
        model,
        maxTokens,
        temperature,
      });
    }

    const client = openai;
    if (!client) {
      throw new AppError('OpenAI is not configured', 500);
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });

    const content = response?.choices?.[0]?.message?.content || '{}';
    const parsed = parseJsonPayload(content);

    return {
      ...parsed,
      content,
      raw: response,
      model,
      tokensUsed: response?.usage?.total_tokens || null,
    };
  } catch (error) {
    logger.error('AI JSON completion failed', {
      reason: error.message,
      model,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to generate interview questions', 500, {
      reason: error.message,
    });
  }
};

module.exports = {
  createEmbedding,
  generateJsonCompletion,
};
