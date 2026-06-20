const express = require('express');
const appliedJobsController = require('./appliedJobs.controller');
const router = express.Router();
router.get('/', appliedJobsController.listAppliedJobs);
module.exports = router;
