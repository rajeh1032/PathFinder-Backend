const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORGANIZATION || '',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 1000,
  temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
};

const openai = config.apiKey
  ? new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization || undefined,
    })
  : null;

const isConfigured = Boolean(config.apiKey);

module.exports = {
  openai,
  config,
  isConfigured,
};
