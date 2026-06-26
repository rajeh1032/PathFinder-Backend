const express = require('express');
const { validateBody, validateParams, validateQuery } = require('../../common/middlewares/validate.middleware');
const { authenticate, authorize } = require('../../common/middlewares/auth.middleware');
const jobMatchesController = require('./jobMatches.controller');
const { generateJobMatchesSchema, listJobMatchesQuerySchema, listAdminJobMatchesQuerySchema, uuidParamSchema } = require('./jobMatches.schema');

const router = express.Router();

router.use(authenticate);
router.post('/generate', validateBody(generateJobMatchesSchema), jobMatchesController.generateMatches);
router.get('/', validateQuery(listJobMatchesQuerySchema), jobMatchesController.listMatches);
router.get('/admin', authorize('admin'), validateQuery(listAdminJobMatchesQuerySchema), jobMatchesController.listAdminMatches);
router.get('/admin/:id', authorize('admin'), validateParams(uuidParamSchema), jobMatchesController.getAdminMatch);
router.get('/:id', validateParams(uuidParamSchema), jobMatchesController.getMatch);

module.exports = router;
