const express = require('express');
const {
  authenticate,
  authorize,
} = require('../../common/middlewares/auth.middleware');
const usersController = require('./users.controller');

const router = express.Router();

router.get('/me', authenticate, usersController.getMe);
router.get('/', authenticate, usersController.getAllUsers);
router.get('/:id', authenticate, usersController.getUserById);
router.get(
  '/:id/stats',
  authenticate,
  authorize('admin'),
  usersController.getUserStatsById,
);
router.patch(
  '/:id/activate',
  authenticate,
  authorize('admin'),
  usersController.activateUserById,
);
router.patch(
  '/:id/deactivate',
  authenticate,
  authorize('admin'),
  usersController.deactivateUserById,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  usersController.updateUserById,
);

module.exports = router;

