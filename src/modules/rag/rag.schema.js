const Joi = require('joi');

const RAG_DOCUMENT_TYPES = [
  'cv_analysis',
  'interview',
  'job_matching',
  'cover_letter',
  'chat',
  'roadmap',
  'general',
];

const RAG_DOCUMENT_SOURCES = ['manual', 'upload', 'api'];

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const createRagDocumentSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  type: Joi.string()
    .valid(...RAG_DOCUMENT_TYPES)
    .required(),
  source: Joi.string()
    .valid(...RAG_DOCUMENT_SOURCES)
    .required(),
  content: Joi.string().trim().min(1).required(),
});

const uploadRagDocumentSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  type: Joi.string()
    .empty('')
    .valid(...RAG_DOCUMENT_TYPES)
    .default('cv_analysis'),
});

const listRagDocumentsQuerySchema = Joi.object({
  type: Joi.string().valid(...RAG_DOCUMENT_TYPES),
});

const updateRagDocumentSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  type: Joi.string().valid(...RAG_DOCUMENT_TYPES),
  source: Joi.string().valid(...RAG_DOCUMENT_SOURCES),
  content: Joi.string().trim().min(1),
  is_active: Joi.boolean(),
})
  .min(1)
  .required();

module.exports = {
  RAG_DOCUMENT_TYPES,
  RAG_DOCUMENT_SOURCES,
  uuidParamSchema,
  createRagDocumentSchema,
  uploadRagDocumentSchema,
  listRagDocumentsQuerySchema,
  updateRagDocumentSchema,
};
