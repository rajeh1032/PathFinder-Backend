const asyncHandler = require('../../common/utils/asyncHandler');
const { sendSuccess } = require('../../common/utils/apiResponse');
const usersService = require('./users.service');

const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getCurrentUser(req.user);

  return sendSuccess(res, { user }, 'User fetched successfully');
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { users, pagination } = await usersService.getAllUsers(req.query);

  return sendSuccess(
    res,
    { users },
    'Users fetched successfully',
    200,
    { pagination },
  );
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);

  return sendSuccess(res, { user }, 'User fetched successfully');
});

const updateUserById = asyncHandler(async (req, res) => {
  const user = await usersService.updateUserById(req.params.id, req.body);

  return sendSuccess(res, { user }, 'User updated successfully');
});

const deactivateUserById = asyncHandler(async (req, res) => {
  const user = await usersService.deactivateUserById(req.params.id);

  return sendSuccess(res, { user }, 'User deactivated successfully');
});

const activateUserById = asyncHandler(async (req, res) => {
  const user = await usersService.activateUserById(req.params.id);

  return sendSuccess(res, { user }, 'User activated successfully');
});


const getUserStatsById = asyncHandler(async (req, res) => {
  const stats = await usersService.getUserStats(req.params.id);

  return sendSuccess(res, stats, 'User stats fetched successfully');
});
module.exports = {
  activateUserById,
  getUserStatsById,
  deactivateUserById,
  getAllUsers,
  getMe,
  getUserById,
  updateUserById,
};

