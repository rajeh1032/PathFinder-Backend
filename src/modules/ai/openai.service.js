const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const {
  openai,
  config: openaiConfig,
  isConfigured,
} = require('../../config/openai');
const aiRepository = require('./ai.repository');

const stringifyForLog = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    return '[unserializable]';
  }
};

const extractJsonText = (content) => {
  const trimmed = String(content || '').trim();

  if (!trimmed) {
    throw new AppError('OpenAI returned an empty response', 502);
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return trimmed;
};

const parseJsonResponse = (content) => {
  try {
    return JSON.parse(extractJsonText(content));
  } catch (error) {
    throw new AppError('OpenAI returned invalid JSON', 502, {
      reason: error.message,
    });
  }
};

const logAiCall = async (payload) => {
  try {
    return await aiRepository.createAiLog(payload);
  } catch (error) {
    logger.warn('Failed to persist AI log', {
      feature: payload.feature,
      status: payload.status,
      reason: error.message,
    });
    return null;
  }
};

const generateJsonCompletion = async ({
  userId = null,
  feature,
  messages,
  responseSchemaHint = null,
}) => {
  if (!isConfigured || !openai) {
    throw new AppError('OpenAI is not configured', 500);
  }

  const model = openaiConfig.model;
  const requestPayload = {
    model,
    messages,
    temperature: openaiConfig.temperature,
    max_tokens: Math.max(openaiConfig.maxTokens, 1800),
    response_format: { type: 'json_object' },
  };

  const startedAt = Date.now();

  try {
    const completion = await openai.chat.completions.create(requestPayload);
    const latencyMs = Date.now() - startedAt;
    const choice = completion.choices?.[0];
    const responseText = choice?.message?.content || '';
    const parsed = parseJsonResponse(responseText);

    await logAiCall({
      user_id: userId,
      feature,
      model,
      prompt: stringifyForLog(messages),
      response: responseText,
      tokens_used: completion.usage?.total_tokens || null,
      latency_ms: latencyMs,
      status: 'success',
      error_message: null,
      request_payload: {
        model,
        messages,
        responseSchemaHint,
        response_format: requestPayload.response_format,
      },
      response_payload: completion,
    });

    return {
      data: parsed,
      rawResponse: responseText,
      model,
      tokensUsed: completion.usage?.total_tokens || null,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    await logAiCall({
      user_id: userId,
      feature,
      model,
      prompt: stringifyForLog(messages),
      response: null,
      tokens_used: null,
      latency_ms: latencyMs,
      status: 'failed',
      error_message: error.message,
      request_payload: {
        model,
        messages,
        responseSchemaHint,
        response_format: requestPayload.response_format,
      },
      response_payload: error.response || {},
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('OpenAI request failed', 502, {
      reason: error.message,
    });
  }
};

module.exports = {
  generateJsonCompletion,
};
