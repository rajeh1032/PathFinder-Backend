const AppError = require('../errors/AppError');
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
      details: error.details,
    });
  }
};

module.exports = {
  ensureSupabase,
  handleSupabaseError,
};
