const crypto = require('crypto');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const ragRepository = require('./rag.repository');

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 120;
const PDF_MIME_TYPE = 'application/pdf';
const PDF_SIGNATURE = Buffer.from('%PDF-');
const ACTIVE_RAG_DOCUMENT_TYPE_CONFLICT_MESSAGE =
  'An active RAG document for this type already exists. Delete it before adding a new one.';

const normalizeContent = (content) =>
  content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const estimateTokenCount = (text) => Math.ceil(text.length / 4);

const hasPdfSignature = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    return false;
  }

  return buffer.subarray(0, 1024).includes(PDF_SIGNATURE);
};

const isPdfFile = (file) => hasPdfSignature(file?.buffer);

const buildStoragePath = ({ type, originalname }) => {
  const safeName = path
    .basename(originalname || 'rag-document.pdf', '.pdf')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${type}/${Date.now()}-${crypto.randomUUID()}-${safeName || 'document'}.pdf`;
};

const extractPdfText = async (buffer) => {
  let parser = null;

  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = normalizeContent(result.text || '');

    if (!text) {
      throw new AppError('PDF text could not be extracted', 400);
    }

    return text;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to parse PDF document', 400, {
      reason: error.message,
    });
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (error) {
        logger.warn('Failed to destroy PDF parser', { reason: error.message });
      }
    }
  }
};

const splitContentIntoChunks = (content) => {
  const text = normalizeContent(content);
  const chunks = [];
  let cursor = 0;

  while (cursor < text.length) {
    let end = Math.min(cursor + CHUNK_SIZE, text.length);

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const sentenceBreak = text.lastIndexOf('. ', end);
      const spaceBreak = text.lastIndexOf(' ', end);
      const minimumEnd = cursor + Math.floor(CHUNK_SIZE * 0.6);

      if (paragraphBreak > minimumEnd) {
        end = paragraphBreak;
      } else if (sentenceBreak > minimumEnd) {
        end = sentenceBreak + 1;
      } else if (spaceBreak > minimumEnd) {
        end = spaceBreak;
      }
    }

    const chunk = text.slice(cursor, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    cursor = Math.max(end - CHUNK_OVERLAP, cursor + 1);
  }

  return chunks;
};

const buildChunkRows = (document, chunks) =>
  chunks.map((chunk, index) => ({
    rag_document_id: document.id,
    content: chunk,
    chunk_index: index,
    token_count: estimateTokenCount(chunk),
    metadata: {
      title: document.title,
      type: document.type,
      source: document.source,
      chunk_size: chunk.length,
    },
  }));

const assertDocumentExists = (document) => {
  if (!document) {
    throw new AppError('RAG document not found', 404);
  }
};

const assertActiveDocumentTypeAvailable = async (type, id = null) => {
  const activeDocument = id
    ? await ragRepository.findActiveDocumentByTypeExcludingId(type, id)
    : await ragRepository.findActiveDocumentByType(type);

  if (activeDocument) {
    throw new AppError(ACTIVE_RAG_DOCUMENT_TYPE_CONFLICT_MESSAGE, 409);
  }
};

const createRagDocument = async (payload, user = null) => {
  await assertActiveDocumentTypeAvailable(payload.type);

  const content = normalizeContent(payload.content);
  const document = await ragRepository.createDocument({
    title: payload.title,
    type: payload.type,
    source: payload.source,
    content,
    index_status: 'indexed',
    is_active: true,
    uploaded_by: user?.id || null,
  });

  const chunkRows = buildChunkRows(document, splitContentIntoChunks(content));
  const chunks = await ragRepository.createChunks(chunkRows);

  return {
    ...document,
    chunksCount: chunks.length,
  };
};

const uploadRagDocument = async (payload, file, user = null) => {
  if (!file) {
    throw new AppError('PDF file is required', 400);
  }

  if (!isPdfFile(file)) {
    throw new AppError('Only PDF files are allowed', 415);
  }

  await assertActiveDocumentTypeAvailable(payload.type);

  const content = await extractPdfText(file.buffer);
  const storagePath = buildStoragePath({
    type: payload.type,
    originalname: file.originalname,
  });

  await ragRepository.uploadDocumentFile({
    storagePath,
    buffer: file.buffer,
    contentType: PDF_MIME_TYPE,
  });

  try {
    const document = await ragRepository.createDocument({
      title: payload.title,
      type: payload.type,
      source: 'upload',
      content,
      storage_path: storagePath,
      index_status: 'indexed',
      is_active: true,
      uploaded_by: user?.id || null,
    });

    const chunkRows = buildChunkRows(document, splitContentIntoChunks(content));
    const chunks = await ragRepository.createChunks(chunkRows);

    return {
      ...document,
      chunksCount: chunks.length,
    };
  } catch (error) {
    try {
      await ragRepository.deleteDocumentFile(storagePath);
    } catch (cleanupError) {
      logger.warn('Failed to clean up uploaded RAG document file', {
        storagePath,
        reason: cleanupError.message,
      });
    }

    throw error;
  }
};

const listRagDocuments = async (filters) => {
  return ragRepository.listDocuments(filters);
};

const getRagDocumentById = async (id) => {
  const document = await ragRepository.findDocumentWithChunksById(id);
  assertDocumentExists(document);

  const chunks = document.rag_chunks || [];
  delete document.rag_chunks;

  return {
    ...document,
    chunks,
    chunksCount: chunks.length,
  };
};

const updateRagDocument = async (id, payload) => {
  const existingDocument = await ragRepository.findDocumentById(id);
  assertDocumentExists(existingDocument);

  const nextType = Object.prototype.hasOwnProperty.call(payload, 'type')
    ? payload.type
    : existingDocument.type;
  const nextIsActive = Object.prototype.hasOwnProperty.call(payload, 'is_active')
    ? payload.is_active
    : existingDocument.is_active;
  const typeWillChange =
    Object.prototype.hasOwnProperty.call(payload, 'type') &&
    payload.type !== existingDocument.type;
  const willReactivate = !existingDocument.is_active && nextIsActive === true;

  if (nextIsActive === true && (typeWillChange || willReactivate)) {
    await assertActiveDocumentTypeAvailable(nextType, id);
  }

  const updatePayload = {};

  ['title', 'type', 'source', 'is_active'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updatePayload[field] = payload[field];
    }
  });

  const contentChanged = Object.prototype.hasOwnProperty.call(
    payload,
    'content',
  );

  if (contentChanged) {
    updatePayload.content = normalizeContent(payload.content);
    updatePayload.index_status = 'indexed';
    updatePayload.index_error = null;
  }

  const updatedDocument = await ragRepository.updateDocument(id, updatePayload);
  let chunksCount = null;

  if (contentChanged) {
    await ragRepository.deleteChunksByDocumentId(id);
    const chunkRows = buildChunkRows(
      updatedDocument,
      splitContentIntoChunks(updatePayload.content),
    );
    const chunks = await ragRepository.createChunks(chunkRows);
    chunksCount = chunks.length;
  }

  return {
    ...updatedDocument,
    ...(chunksCount !== null ? { chunksCount } : {}),
  };
};

const deleteRagDocument = async (id) => {
  const existingDocument = await ragRepository.findDocumentById(id);
  assertDocumentExists(existingDocument);

  return ragRepository.updateDocument(id, { is_active: false });
};

const getRagContextForFeature = async (feature) => {
  const documents = await ragRepository.findActiveIndexedDocumentsByType(feature);

  if (!documents.length) {
    return '';
  }

  const documentIds = documents.map((document) => document.id);
  const chunks = await ragRepository.findChunksByDocumentIds(documentIds);
  const chunksByDocumentId = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.rag_document_id]) {
      acc[chunk.rag_document_id] = [];
    }

    acc[chunk.rag_document_id].push(chunk);
    return acc;
  }, {});

  return documents
    .map((document) => {
      const documentChunks = chunksByDocumentId[document.id] || [];

      if (!documentChunks.length) {
        return '';
      }

      const content = documentChunks
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .map((chunk) => chunk.content)
        .join('\n\n');

      return `--- RAG Document: ${document.title} ---\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
};

module.exports = {
  createRagDocument,
  uploadRagDocument,
  listRagDocuments,
  getRagDocumentById,
  updateRagDocument,
  deleteRagDocument,
  getRagContextForFeature,
  splitContentIntoChunks,
  extractPdfText,
};
