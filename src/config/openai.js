const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const openaiApiKey = process.env.OPENAI_API_KEY || '';

const config = {
  provider: process.env.AI_PROVIDER || (geminiApiKey ? 'gemini' : openaiApiKey ? 'openai' : 'none'),
  openaiApiKey,
  organization: process.env.OPENAI_ORGANIZATION || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiMaxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 1000,
  openaiTemperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
  geminiApiKey,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  geminiEmbeddingDimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS) || 1536,
  geminiMaxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 1000,
  geminiTemperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
};

const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
      organization: config.organization || undefined,
    })
  : null;

const isConfigured = Boolean(config.geminiApiKey || openaiApiKey);

module.exports = {
  openai,
  config,
  isConfigured,
};
