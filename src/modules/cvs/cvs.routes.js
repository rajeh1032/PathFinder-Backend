const express = require('express');
const multer = require('multer');

const AppError = require('../../common/errors/AppError');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../../common/middlewares/validate.middleware');
const cvsController = require('./cvs.controller');
const {
  analyzeCvSchema,
  cvFileUrlQuerySchema,
  cvHistoryQuerySchema,
  cvIdParamSchema,
} = require('./cvs.schema');
const { CV_BUCKET_MAX_FILE_SIZE } = require('./cvs.service');

const router = express.Router();

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CV_BUCKET_MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' &&
      (file.originalname || '').toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return cb(new AppError('Only PDF CV files are allowed', 415));
    }

    return cb(null, true);
  },
});

const uploadCvFile = (req, res, next) => {
  cvUpload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('CV file must be 10MB or smaller', 413));
      }

      return next(new AppError(error.message, 400));
    }

    return next(error);
  });
};

router.post(
  '/analyze',
  authenticate,
  uploadCvFile,
  validateBody(analyzeCvSchema),
  cvsController.analyzeCv,
);

router.get('/me/latest-analysis', authenticate, cvsController.getLatestAnalysis);
router.get('/me/status', authenticate, cvsController.getStatus);
router.get(
  '/me/history',
  authenticate,
  validateQuery(cvHistoryQuerySchema),
  cvsController.getHistory,
);
router.get(
  '/me/:cvId/file-url',
  authenticate,
  validateParams(cvIdParamSchema),
  validateQuery(cvFileUrlQuerySchema),
  cvsController.getFileUrl,
);

module.exports = router;

// ===== Admin CV analyses (read-only) =====
// Registered after the user-scoped routes above so `/me/*` is matched first.
const { authorize } = require('../../common/middlewares/auth.middleware');
const { cvAnalysisIdParamSchema } = require('./cvs.schema');

router.get('/', authenticate, authorize('admin'), cvsController.listCvAnalyses);

router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(cvAnalysisIdParamSchema),
  cvsController.getCvAnalysisById,
);
