const express = require('express');
const savedJobsController = require('./savedJobs.controller');
const router = express.Router();
router.get('/', savedJobsController.listSavedJobs);
module.exports = router;
