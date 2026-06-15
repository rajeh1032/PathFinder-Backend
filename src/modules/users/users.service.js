const AppError = require('../../common/errors/AppError');
const { buildPaginationMeta } = require('../../common/utils/pagination');
const usersRepository = require('./users.repository');

const normalizeUsersQuery = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const role = typeof query.role === 'string' ? query.role.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim() : '';

  if (status && !['active', 'inactive'].includes(status)) {
    throw new AppError('Status must be active or inactive', 400);
  }

  return {
    page,
    limit,
    search,
    role,
    status,
  };
};

const getCurrentUser = async (authUser) => {
  const userId = authUser?.userId || authUser?.id;

  if (!userId) {
    throw new AppError('Authenticated user id missing', 401);
  }

  const user = await usersRepository.findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

const getAllUsers = async (query) => {
  const filters = normalizeUsersQuery(query);
  const { users, totalItems } = await usersRepository.findAllUsers(filters);

  return {
    users,
    pagination: buildPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      totalItems,
    }),
  };
};

const getUserById = async (userId) => {
  if (!userId) {
    throw new AppError('User id is required', 400);
  }

  const user = await usersRepository.findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

const normalizeUserUpdates = async (body = {}) => {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new AppError('Name must be a non-empty string', 400);
    }

    updates.name = body.name.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    if (typeof body.email !== 'string' || !body.email.trim()) {
      throw new AppError('Email must be a non-empty string', 400);
    }

    updates.email = body.email.trim().toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
    if (typeof body.is_active !== 'boolean') {
      throw new AppError('is_active must be a boolean', 400);
    }

    updates.is_active = body.is_active;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (!['active', 'inactive'].includes(body.status)) {
      throw new AppError('Status must be active or inactive', 400);
    }

    updates.is_active = body.status === 'active';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'role')) {
    if (typeof body.role !== 'string' || !body.role.trim()) {
      throw new AppError('Role must be a non-empty string', 400);
    }

    const roleId = await usersRepository.findRoleIdByName(body.role.trim());

    if (!roleId) {
      throw new AppError('Invalid role', 400);
    }

    updates.role_id = roleId;
  }

  return updates;
};

const updateUserById = async (userId, body) => {
  if (!userId) {
    throw new AppError('User id is required', 400);
  }

  const updates = await normalizeUserUpdates(body);

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid user fields provided for update', 400);
  }

  const user = await usersRepository.updateUserById(userId, updates);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

const deactivateUserById = async (userId) => {
  if (!userId) {
    throw new AppError('User id is required', 400);
  }

  const user = await usersRepository.updateUserById(userId, {
    is_active: false,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

const activateUserById = async (userId) => {
  if (!userId) {
    throw new AppError('User id is required', 400);
  }

  const user = await usersRepository.updateUserById(userId, {
    is_active: true,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

module.exports = {
  activateUserById,
  deactivateUserById,
  getAllUsers,
  getCurrentUser,
  getUserById,
  updateUserById,
};
