const express = require('express');

const router = express.Router();
const authController = require('./auth.controller.js');
const { validateBody } = require('../../common/middlewares/validate.middleware');
const { authenticate } = require('../../common/middlewares/auth.middleware');
const authSchema = require('./auth.schema.js');

router.post(
  '/register',
  validateBody(authSchema.registerSchema),
  authController.register,
);
router.post(
  '/login',
  validateBody(authSchema.loginSchema),
  authController.login,
);
router.get('/me', authenticate, authController.me);
router.get('/profile', authenticate, authController.getUser);
router.post(
  '/change-password',
  authenticate,
  validateBody(authSchema.changePasswordSchema),
  authController.changeUserPassword,
);

module.exports = router;
