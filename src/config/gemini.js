const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  embeddingDimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS) || 1536,
  maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 8192,
  temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
};

const isConfigured = Boolean(config.apiKey);

const getBaseUrl = (model, method) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}`;

const buildResponseUsage = (payload = {}) => payload?.usageMetadata || null;

const normalizeText = (value) => String(value ?? '').trim();

const asGeminiContent = (value, defaultRole = 'user') => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const text = normalizeText(value);
    return text ? { role: defaultRole, parts: [{ text }] } : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((part) => {
        if (typeof part === 'string') {
          const text = normalizeText(part);
          return text ? { text } : null;
        }

        if (part && typeof part === 'object' && part.text !== undefined) {
          const text = normalizeText(part.text);
          return text ? { text } : null;
        }

        return null;
      })
      .filter(Boolean);

    return parts.length ? { role: defaultRole, parts } : null;
  }

  if (typeof value === 'object') {
    const role = value.role || defaultRole;
    const parts = Array.isArray(value.parts)
      ? value.parts
          .map((part) => {
            if (typeof part === 'string') {
              const text = normalizeText(part);
              return text ? { text } : null;
            }

            if (part && typeof part === 'object' && part.text !== undefined) {
              const text = normalizeText(part.text);
              return text ? { text } : null;
            }

            return null;
          })
          .filter(Boolean)
      : [];

    return parts.length ? { role, parts } : null;
  }

  return null;
};

const normalizeContents = (contents) => {
  if (Array.isArray(contents)) {
    return contents.map((content) => asGeminiContent(content)).filter(Boolean);
  }

  const content = asGeminiContent(contents);
  return content ? [content] : [];
};

const normalizeSystemInstruction = (systemInstruction) => {
  const instruction = asGeminiContent(systemInstruction, 'user');
  if (!instruction) {
    return undefined;
  }

  delete instruction.role;
  return instruction;
};

const extractText = (payload = {}) => {
  const candidates = payload?.candidates || [];
  const parts = candidates[0]?.content?.parts || [];

  return parts.map((part) => part?.text || '').join('').trim();
};

const extractEmbeddings = (payload = {}) => {
  const embedding =
    payload?.embedding?.values ||
    payload?.embeddings?.[0]?.values ||
    payload?.embeddings?.[0]?.embeddingValues ||
    [];

  return Array.isArray(embedding) ? embedding : [];
};

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const payload = rawText ? JSON.parse(rawText) : {};

  return { response, payload };
};

const models = {
  generateContent: async (request = {}) => {
    if (!isConfigured) {
      throw new Error('Gemini is not configured');
    }

  const { response, payload } = await postJson(
      `${getBaseUrl(request.model || config.model, 'generateContent')}?key=${encodeURIComponent(config.apiKey)}`,
      {
        systemInstruction: normalizeSystemInstruction(request.systemInstruction),
        contents: normalizeContents(request.contents),
        generationConfig: request.config || request.generationConfig || {},
      },
    );

    if (!response.ok) {
      const message = payload?.error?.message || `Gemini request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return {
      text: extractText(payload),
      candidates: payload?.candidates || [],
      usageMetadata: buildResponseUsage(payload),
      raw: payload,
    };
  },

  embedContent: async (request = {}) => {
    if (!isConfigured) {
      throw new Error('Gemini is not configured');
    }

    const inputText = String(
      request.content || request.contents || request.input || request.text || '',
    );
  const { response, payload } = await postJson(
      `${getBaseUrl(request.model || config.embeddingModel, 'embedContent')}?key=${encodeURIComponent(config.apiKey)}`,
      {
        model: request.model || config.embeddingModel,
        content: {
          parts: [{ text: inputText }],
        },
        taskType: request.taskType || 'SEMANTIC_SIMILARITY',
        outputDimensionality:
          request.config?.outputDimensionality ||
          request.outputDimensionality ||
          config.embeddingDimensions,
      },
    );

    if (!response.ok) {
      const message = payload?.error?.message || `Gemini embedding request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return {
      embeddings: [
        {
          values: extractEmbeddings(payload),
        },
      ],
      raw: payload,
    };
  },
};

const gemini = {
  models,
};

module.exports = {
  gemini,
  config,
  isConfigured,
};
