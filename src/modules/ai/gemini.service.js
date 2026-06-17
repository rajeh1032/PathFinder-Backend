const { gemini, config, isConfigured } = require('../../config/gemini');
const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const aiRepository = require('./ai.repository');

const ensureConfigured = () => {
  if (!isConfigured || !gemini) {
    throw new AppError('Gemini API is not configured', 503);
  }
};

const buildGenerationConfig = (options = {}) => ({
  temperature:
    options.temperature === undefined ? config.temperature : options.temperature,
  maxOutputTokens: options.maxOutputTokens || config.maxOutputTokens,
  systemInstruction: options.systemInstruction,
  responseMimeType: options.responseMimeType,
  responseJsonSchema: options.responseJsonSchema,
});

const cleanConfig = (rawConfig) =>
  Object.fromEntries(
    Object.entries(rawConfig).filter(([, value]) => value !== undefined),
  );

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
};

const generateContent = async ({
  contents,
  model = config.model,
  ...options
}) => {
  ensureConfigured();

  const request = {
    model,
    contents,
    config: cleanConfig(buildGenerationConfig(options)),
  };

  const response = await gemini.models.generateContent(request);

  return {
    text: response.text || '',
    model,
    request,
    response,
    usage: response.usageMetadata || null,
  };
};

const generateText = async (params) => generateContent(params);

const parseJsonText = (text) => JSON.parse(stripJsonFences(text));

const repairJsonResponse = async ({
  invalidJson,
  parseError,
  model,
  responseJsonSchema,
}) => {
  const repairPrompt = [
    'Repair the following invalid/truncated JSON into one complete valid JSON object.',
    'Return JSON only. Do not add markdown or explanations.',
    'If a field is missing because the input was truncated, use an empty object, empty array, empty string, or 0 that matches the schema.',
    '',
    `Parse error: ${parseError}`,
    '',
    'Invalid JSON:',
    invalidJson,
  ].join('\n');

  return generateContent({
    model,
    contents: repairPrompt,
    temperature: 0,
    maxOutputTokens: Math.max(config.maxOutputTokens, 8192),
    responseMimeType: 'application/json',
    responseJsonSchema,
  });
};

const generateJson = async (params) => {
  const result = await generateContent({
    ...params,
    responseMimeType: 'application/json',
    maxOutputTokens: Math.max(params.maxOutputTokens || 0, config.maxOutputTokens),
  });

  try {
    return {
      ...result,
      json: parseJsonText(result.text),
    };
  } catch (error) {
    try {
      const repaired = await repairJsonResponse({
        invalidJson: result.text,
        parseError: error.message,
        model: result.model,
        responseJsonSchema: params.responseJsonSchema,
      });

      return {
        ...repaired,
        json: parseJsonText(repaired.text),
        originalText: result.text,
        repaired: true,
      };
    } catch (repairError) {
      throw new AppError('Gemini returned invalid JSON', 502, {
        rawResponse: result.text,
        parseError: error.message,
        repairError: repairError.message,
      });
    }
  }
};

const stripJsonFences = (text) =>
  String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const toGeminiPrompt = (messages = []) => {
  const systemInstruction = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const roleLabel = message.role || 'user';
      return `${roleLabel.toUpperCase()}:\n${message.content || ''}`;
    })
    .join('\n\n');

  return {
    systemInstruction: systemInstruction || undefined,
    contents,
  };
};

const getTokenCount = (usage) =>
  usage?.totalTokenCount ||
  usage?.totalTokens ||
  usage?.promptTokenCount + usage?.candidatesTokenCount ||
  null;

const logAiCall = async (payload) => {
  try {
    await aiRepository.createAiLog(payload);
  } catch (error) {
    logger.warn('Failed to create AI log', { reason: error.message });
  }
};

const generateJsonCompletion = async ({
  userId = null,
  feature,
  messages,
  responseSchemaHint,
  responseJsonSchema,
  model = config.model,
  maxTokens,
  temperature,
}) => {
  const startedAt = Date.now();
  const { contents, systemInstruction } = toGeminiPrompt(messages);
  const prompt = [systemInstruction, contents].filter(Boolean).join('\n\n');

  try {
    const result = await generateJson({
      model,
      contents,
      systemInstruction,
      responseJsonSchema,
      maxOutputTokens: maxTokens,
      temperature,
    });
    const latencyMs = Date.now() - startedAt;

    await logAiCall({
      user_id: userId,
      feature,
      model: result.model,
      prompt,
      response: result.text,
      tokens_used: getTokenCount(result.usage),
      latency_ms: latencyMs,
      cost: null,
      status: 'success',
      error_message: null,
      request_payload: {
        provider: 'gemini',
        responseSchemaHint,
        hasResponseJsonSchema: Boolean(responseJsonSchema),
        model,
      },
      response_payload: {
        usage: result.usage,
        repaired: Boolean(result.repaired),
      },
    });

    return {
      data: result.json,
      model: result.model,
      raw: result.text,
      usage: result.usage,
      latency_ms: latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    await logAiCall({
      user_id: userId,
      feature,
      model,
      prompt,
      response: null,
      tokens_used: null,
      latency_ms: latencyMs,
      cost: null,
      status: 'failed',
      error_message: error.message,
      request_payload: {
        provider: 'gemini',
        responseSchemaHint,
        hasResponseJsonSchema: Boolean(responseJsonSchema),
        model,
      },
      response_payload: null,
    });

    throw error;
  }
};

const embedText = async ({
  input,
  model = config.embeddingModel,
  taskType = 'SEMANTIC_SIMILARITY',
  outputDimensionality = config.embeddingDimensions,
}) => {
  ensureConfigured();

  const embeddingConfig = {
    outputDimensionality,
  };

  if (model === 'gemini-embedding-001' && taskType) {
    embeddingConfig.taskType = taskType;
  }

  const request = {
    model,
    contents: input,
    config: embeddingConfig,
  };

  const response = await gemini.models.embedContent(request);
  const embeddings = response.embeddings || [];
  const shouldNormalize =
    model === 'gemini-embedding-001' && outputDimensionality !== 3072;

  return {
    embeddings: embeddings.map((embedding) => {
      const values = embedding.values || [];
      return shouldNormalize ? normalizeVector(values) : values;
    }),
    model,
    request,
    response,
  };
};

module.exports = {
  generateContent,
  generateText,
  generateJson,
  generateJsonCompletion,
  embedText,
};
