const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

const handleSupabaseError = (error, message, statusCode = 500) => {
  if (error) {
    throw new AppError(message, statusCode, {
      code: error.code,
      hint: error.hint,
    });
  }
};

const createAiLog = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('ai_logs')
    .insert(payload)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create AI log');
  return data;
};

module.exports = {
  createAiLog,
};
