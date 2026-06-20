const express = require('express');
const { validateBody, validateParams, validateQuery } = require('../../common/middlewares/validate.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const jobMatchesController = require('./jobMatches.controller');
const { generateJobMatchesSchema, listJobMatchesQuerySchema, uuidParamSchema } = require('./jobMatches.schema');

const router = express.Router();

router.use(authenticate);
router.post('/generate', validateBody(generateJobMatchesSchema), jobMatchesController.generateMatches);
router.get('/', validateQuery(listJobMatchesQuerySchema), jobMatchesController.listMatches);
router.get('/:id', validateParams(uuidParamSchema), jobMatchesController.getMatch);

module.exports = router;
