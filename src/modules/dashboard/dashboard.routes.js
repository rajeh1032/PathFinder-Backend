const express = require('express');
const {
  authenticate,
  authorize,
} = require('../../common/middlewares/auth.middleware');
const dashboardController = require('./dashboard.controller');

const router = express.Router();

router.get(
  '/overview',
  authenticate,
  authorize('admin'),
  dashboardController.getOverview,
);

module.exports = router;
