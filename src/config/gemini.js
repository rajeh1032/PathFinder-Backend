const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  embeddingDimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS) || 1536,
  maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 1000,
  temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
};

const gemini = config.apiKey
  ? new GoogleGenAI({
      apiKey: config.apiKey,
    })
  : null;

const isConfigured = Boolean(config.apiKey);

module.exports = {
  gemini,
  config,
  isConfigured,
};
