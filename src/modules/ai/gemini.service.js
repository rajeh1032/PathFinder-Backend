const { gemini, config, isConfigured } = require('../../config/gemini');
const AppError = require('../../common/errors/AppError');

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

const generateJson = async (params) => {
  const result = await generateContent({
    ...params,
    responseMimeType: 'application/json',
  });

  try {
    return {
      ...result,
      json: JSON.parse(result.text),
    };
  } catch (error) {
    throw new AppError('Gemini returned invalid JSON', 502, {
      rawResponse: result.text,
      parseError: error.message,
    });
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
  embedText,
};
