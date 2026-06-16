const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const { supabase, isConfigured } = require('../../config/supabase');

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
  if (!isConfigured || !supabase || !feature) {
    return null;
  }

  try {
    const { error } = await supabase.from('ai_logs').insert({
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

    if (error) {
      throw new AppError('Failed to save AI log', 500, {
        code: error.code,
        hint: error.hint,
      });
    }

    return true;
  } catch (error) {
    logger.warn('AI log insert failed', {
      feature,
      reason: error.message,
    });
    return null;
  }
};

module.exports = {
  logAiCall,
};
