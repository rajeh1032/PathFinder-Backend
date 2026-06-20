const express = require('express');
const { validateBody, validateParams, validateQuery } = require('../../common/middlewares/validate.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const coverLettersController = require('./coverLetters.controller');
const { generateCoverLetterSchema, listCoverLettersQuerySchema, updateCoverLetterSchema, uuidParamSchema } = require('./coverLetters.schema');

const router = express.Router();
router.use(authenticate);
router.post('/generate', validateBody(generateCoverLetterSchema), coverLettersController.generateCoverLetter);
router.get('/', validateQuery(listCoverLettersQuerySchema), coverLettersController.listCoverLetters);
router.get('/:id/versions', validateParams(uuidParamSchema), coverLettersController.listVersions);
router.post('/:id/export', validateParams(uuidParamSchema), coverLettersController.exportCoverLetter);
router.get('/:id', validateParams(uuidParamSchema), coverLettersController.getCoverLetter);
router.patch('/:id', validateParams(uuidParamSchema), validateBody(updateCoverLetterSchema), coverLettersController.updateCoverLetter);
router.delete('/:id', validateParams(uuidParamSchema), coverLettersController.deleteCoverLetter);
module.exports = router;
