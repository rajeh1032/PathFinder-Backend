const express = require('express');
const Joi = require('joi');

const { authenticate } = require('../../common/middlewares/auth.middleware');
const {
  validateBody,
} = require('../../common/middlewares/validate.middleware');
const testController = require('./test.controller');

const router = express.Router();

const testSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
});

router.get('/auth', authenticate, testController.authTest);
router.post('/validate', validateBody(testSchema), testController.validateTest);
router.get('/error', testController.errorTest);

module.exports = router;
