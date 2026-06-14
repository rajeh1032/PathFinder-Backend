const express = require('express');
const multer = require('multer');

const AppError = require('../../common/errors/AppError');
const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../../common/middlewares/validate.middleware');
const ragController = require('./rag.controller');
const {
  createRagDocumentSchema,
  listRagDocumentsQuerySchema,
  updateRagDocumentSchema,
  uploadRagDocumentSchema,
  uuidParamSchema,
} = require('./rag.schema');

const router = express.Router();
const MAX_RAG_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024;
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RAG_DOCUMENT_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' &&
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return cb(new AppError('Only PDF files are allowed', 415));
    }

    return cb(null, true);
  },
});

const uploadPdfFile = (req, res, next) => {
  pdfUpload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError('PDF file must be 20MB or smaller', 413),
        );
      }

      return next(new AppError(error.message, 400));
    }

    return next(error);
  });
};

// Temporary admin-auth bypass until the auth module is implemented.

router.post(
  '/documents',
  validateBody(createRagDocumentSchema),
  ragController.createRagDocument,
);

router.post(
  '/documents/upload',
  uploadPdfFile,
  validateBody(uploadRagDocumentSchema),
  ragController.uploadRagDocument,
);

router.get(
  '/documents',
  validateQuery(listRagDocumentsQuerySchema),
  ragController.listRagDocuments,
);

router.get(
  '/documents/:id',
  validateParams(uuidParamSchema),
  ragController.getRagDocument,
);

router.patch(
  '/documents/:id',
  validateParams(uuidParamSchema),
  validateBody(updateRagDocumentSchema),
  ragController.updateRagDocument,
);

router.delete(
  '/documents/:id',
  validateParams(uuidParamSchema),
  ragController.deleteRagDocument,
);

module.exports = router;
