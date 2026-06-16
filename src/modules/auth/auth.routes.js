const express = require('express');

const router = express.Router();
const authController = require('./auth.controller.js');
const { validateBody } = require('../../common/middlewares/validate.middleware');
const authSchema = require('./auth.schema.js');

router.post('/register', validateBody(authSchema.registerSchema), authController.register);
router.post('/login', validateBody(authSchema.loginSchema), authController.login);

module.exports = router;
