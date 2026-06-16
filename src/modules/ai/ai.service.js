const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const aiRepository = require('./ai.repository');
const geminiService = require('./gemini.service');

const logAiCall = async ({
  userId = null,
  feature,
  model = null,
  prompt = null,
  response = null,
  tokensUsed = null,
  latencyMs = null,
  cost = null,
  status = 'success',
  errorMessage = null,
  requestPayload = {},
  responsePayload = {},
}) => {
  if (!feature) {
    return null;
  }

  try {
    await aiRepository.createAiLog({
      user_id: userId,
      feature,
      model,
      prompt,
      response,
      tokens_used: tokensUsed,
      latency_ms: latencyMs,
      cost,
      status,
      error_message: errorMessage,
      request_payload: requestPayload,
      response_payload: responsePayload,
    });

    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.warn('AI log insert failed', {
      feature,
      reason: error.message,
    });

    return null;
  }
};

module.exports = {
  ...geminiService,
  logAiCall,
};
