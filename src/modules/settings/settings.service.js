const settingsRepository = require("./settings.repository");

/**
 * Registry of the admin-configurable settings the console exposes. Each entry
 * defines the stored jsonb `type` and the default returned when the row does
 * not exist yet. Keys are flat (e.g. `ai_model`) to match the admin UI.
 *
 * The `system_settings` table is a generic key/value store; seed rows that use
 * dotted keys (e.g. `ai.default_model`) are left untouched and simply ignored
 * by this registry-backed view.
 */
const SETTINGS_REGISTRY = {
  app_name: { type: "string", default: "PathFinder AI" },
  support_email: { type: "string", default: "support@pathfinder.ai" },
  default_language: { type: "string", default: "en" },
  ai_provider: { type: "string", default: "google" },
  ai_model: { type: "string", default: "gemini-3.1-flash-lite" },
  max_tokens: { type: "number", default: 4096 },
  temperature: { type: "number", default: 0.7 },
  maintenance_enabled: { type: "boolean", default: false },
  maintenance_message: {
    type: "string",
    default:
      "The platform is currently under maintenance. Please check back soon.",
  },
};

const SETTING_KEYS = Object.keys(SETTINGS_REGISTRY);

// Build the settings object: start from registry defaults, then overlay any
// stored rows whose key is known to the registry.
const getSettings = async () => {
  const rows = await settingsRepository.findAllSettings();
  const stored = new Map(
    rows.map((row) => [row.setting_key, row.setting_value]),
  );

  const settings = {};
  SETTING_KEYS.forEach((key) => {
    settings[key] = stored.has(key)
      ? stored.get(key)
      : SETTINGS_REGISTRY[key].default;
  });

  return settings;
};

// Upsert only the provided, registry-known keys. Returns the full settings
// object so the client always receives the canonical current state.
const updateSettings = async ({ payload, userId }) => {
  const entries = Object.entries(payload)
    .filter(([key]) =>
      Object.prototype.hasOwnProperty.call(SETTINGS_REGISTRY, key),
    )
    .map(([key, value]) => ({
      setting_key: key,
      setting_value: value,
      type: SETTINGS_REGISTRY[key].type,
    }));

  if (entries.length > 0) {
    await settingsRepository.upsertSettings(entries, userId || null);
  }

  return getSettings();
};

module.exports = {
  SETTINGS_REGISTRY,
  getSettings,
  updateSettings,
};
