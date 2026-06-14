const { PDFParse } = require('pdf-parse');

const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');

const normalizeCvText = (text) =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const parsePdfBuffer = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new AppError('CV file buffer is empty', 400);
  }

  let parser = null;

  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = normalizeCvText(result.text);

    if (!text) {
      throw new AppError('CV PDF text could not be extracted', 400);
    }

    return text;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to parse CV PDF', 400, {
      reason: error.message,
    });
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (error) {
        logger.warn('Failed to destroy CV PDF parser', {
          reason: error.message,
        });
      }
    }
  }
};

module.exports = {
  normalizeCvText,
  parsePdfBuffer,
};
