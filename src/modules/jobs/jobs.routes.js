const express = require('express');
const { validateBody, validateParams, validateQuery } = require('../../common/middlewares/validate.middleware');
const jobsController = require('./jobs.controller');
const savedJobsController = require('../savedJobs/savedJobs.controller');
const appliedJobsController = require('../appliedJobs/appliedJobs.controller');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const { listJobsQuerySchema, syncJobsSchema, uuidParamSchema } = require('./jobs.schema');
const { applyJobSchema, updateAppliedJobStatusSchema, appliedJobParamSchema } = require('../appliedJobs/appliedJobs.schema');

const router = express.Router();

router.get('/', validateQuery(listJobsQuerySchema), jobsController.listJobs);
router.get('/matched', authenticate, validateQuery(listJobsQuerySchema), jobsController.listMatchedJobs);
router.post('/sync', validateBody(syncJobsSchema), jobsController.syncJobs);
router.get('/saved', authenticate, savedJobsController.listSavedJobs);
router.get('/applied', authenticate, appliedJobsController.listAppliedJobs);
router.patch('/applied/:id/status', authenticate, validateParams(appliedJobParamSchema), validateBody(updateAppliedJobStatusSchema), appliedJobsController.updateAppliedJobStatus);
router.post('/:id/save', authenticate, validateParams(uuidParamSchema), savedJobsController.saveJob);
router.delete('/:id/save', authenticate, validateParams(uuidParamSchema), savedJobsController.unsaveJob);
router.post('/:id/apply', authenticate, validateParams(uuidParamSchema), validateBody(applyJobSchema), appliedJobsController.applyToJob);
router.get('/:id', validateParams(uuidParamSchema), jobsController.getJobById);

module.exports = router;
