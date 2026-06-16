# Config folder explanation

This folder contains the environment-driven configuration modules used by the backend. It keeps API credentials, storage settings, and shared runtime configuration centralized so the feature modules can stay focused on business logic.

## Files

### gemini.js

- Initializes the Gemini configuration from environment variables.
- Exposes the configured generation model, embedding model, embedding dimensions, token/temperature settings, and a helper flag for whether Gemini is ready to use.
- This is the only AI provider config in the repository; there is no `openai.js`.

### supabase.js

- Initializes the Supabase client for database and storage access.
- Supports both anonymous and service-role keys.
- Exposes helpers to create clients when needed by different modules.

### storage.js

- Configures local file upload handling.
- Creates upload folders automatically.
- Exposes helpers for file paths and public URL generation.

### Root .env

- Stores secret and environment values such as API keys and storage settings at the project root.
- Keep this file private and never commit real credentials.

## Required environment variables

### Gemini

- GEMINI_API_KEY
- GEMINI_MODEL (optional, defaults to `gemini-3.1-flash-lite`)
- GEMINI_EMBEDDING_MODEL (optional, defaults to `gemini-embedding-001`)
- GEMINI_EMBEDDING_DIMENSIONS (optional, defaults to `1536`)
- GEMINI_MAX_OUTPUT_TOKENS (optional)
- GEMINI_TEMPERATURE (optional)

### Auth

- JWT_SECRET
- JWT_EXPIRES_IN (optional)

### Supabase

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Storage

- STORAGE_MODE
- UPLOAD_DIR
- STORAGE_BUCKET
- STORAGE_ALLOWED_TYPES
- STORAGE_MAX_FILE_SIZE
- STORAGE_PUBLIC_BASE_URL

## Usage example

```js
const { gemini, config, isConfigured } = require('../config/gemini');
const { supabase } = require('../config/supabase');
const { storageConfig, ensureUploadDir } = require('../config/storage');
```

## Notes

- The configuration modules are safe to import even when credentials are missing.
- They should be used by service modules instead of hardcoding secrets directly.
- Fill the values in the local .env file before using AI or Supabase features.
