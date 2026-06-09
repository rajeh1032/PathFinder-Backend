const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isConfigured = Boolean(
  supabaseUrl && (supabaseAnonKey || serviceRoleKey),
);

const supabase = isConfigured
  ? createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const getSupabaseClient = (role = 'service') => {
  if (!isConfigured) {
    return null;
  }

  const key =
    role === 'service' ? serviceRoleKey || supabaseAnonKey : supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

module.exports = {
  supabaseUrl,
  supabaseAnonKey,
  serviceRoleKey,
  isConfigured,
  supabase,
  getSupabaseClient,
};
