const { sendSuccess } = require('../../common/utils/apiResponse');
const asyncHandler = require('../../common/utils/asyncHandler');
const ragService = require('./rag.service');

const createRagDocument = asyncHandler(async (req, res) => {
  const document = await ragService.createRagDocument(req.body, req.user);
  return sendSuccess(res, document, 'RAG document created successfully', 201);
});

const uploadRagDocument = asyncHandler(async (req, res) => {
  const document = await ragService.uploadRagDocument(
    req.body,
    req.file,
    req.user,
  );

  return sendSuccess(res, document, 'RAG document uploaded successfully', 201);
});

const listRagDocuments = asyncHandler(async (req, res) => {
  const documents = await ragService.listRagDocuments(req.query);
  return sendSuccess(res, documents, 'RAG documents fetched successfully');
});

const getRagDocument = asyncHandler(async (req, res) => {
  const document = await ragService.getRagDocumentById(req.params.id);
  return sendSuccess(res, document, 'RAG document fetched successfully');
});

const updateRagDocument = asyncHandler(async (req, res) => {
  const document = await ragService.updateRagDocument(req.params.id, req.body);
  return sendSuccess(res, document, 'RAG document updated successfully');
});

const deleteRagDocument = asyncHandler(async (req, res) => {
  const document = await ragService.deleteRagDocument(req.params.id);
  return sendSuccess(res, document, 'RAG document deleted successfully');
});

module.exports = {
  createRagDocument,
  uploadRagDocument,
  listRagDocuments,
  getRagDocument,
  updateRagDocument,
  deleteRagDocument,
};
