const AppError = require("../../common/errors/AppError");
const { supabase, isConfigured } = require("../../config/supabase");

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError("Supabase is not configured", 500);
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

// Read every system setting row. setting_value is jsonb, so the Supabase
// client returns it already parsed into the matching JS type.
const findAllSettings = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("system_settings")
    .select("setting_key, setting_value, type, description, updated_at");

  handleSupabaseError(error, "Failed to read system settings");
  return data || [];
};

// Upsert a batch of { setting_key, setting_value, type } rows, keyed by the
// unique setting_key. updated_by/updated_at are stamped on every write.
const upsertSettings = async (entries, updatedBy = null) => {
  const client = ensureSupabase();
  const rows = entries.map((entry) => ({
    setting_key: entry.setting_key,
    setting_value: entry.setting_value,
    type: entry.type,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await client
    .from("system_settings")
    .upsert(rows, { onConflict: "setting_key" })
    .select("setting_key, setting_value, type, description, updated_at");

  handleSupabaseError(error, "Failed to update system settings");
  return data || [];
};

module.exports = {
  findAllSettings,
  upsertSettings,
};
