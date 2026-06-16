const AppError = require('../../common/errors/AppError');
const profilesRepository = require('./profiles.repository');

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
};

const getProfileForUser = async (userId) => {
  const profile = await profilesRepository.findProfileByUserId(userId);

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  return profile;
};

const normalizeDate = (value) => {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const normalizeExperiencePayload = (body = {}) => {
  const payload = { ...body };

  if (payload.is_current === true) {
    payload.end_date = null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'start_date')) {
    payload.start_date = normalizeDate(payload.start_date);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'end_date')) {
    payload.end_date = normalizeDate(payload.end_date);
  }

  if (!Array.isArray(payload.skills)) {
    delete payload.skills;
  }

  return payload;
};

const getMyExperiences = async (user) => {
  const userId = getAuthenticatedUserId(user);
  const profile = await getProfileForUser(userId);
  const experiences = await profilesRepository.findExperiencesByProfileId(profile.id);

  return { experiences };
};

const getMyExperienceById = async ({ user, experienceId }) => {
  const userId = getAuthenticatedUserId(user);
  const profile = await getProfileForUser(userId);
  const experience = await profilesRepository.findExperienceByIdForProfile(
    experienceId,
    profile.id,
  );

  if (!experience) {
    throw new AppError('Profile experience not found', 404);
  }

  return { experience };
};

const createMyExperience = async ({ user, body }) => {
  const userId = getAuthenticatedUserId(user);
  const profile = await getProfileForUser(userId);
  const experience = await profilesRepository.createExperience({
    ...normalizeExperiencePayload(body),
    profile_id: profile.id,
  });

  return { experience };
};

const updateMyExperience = async ({ user, experienceId, body }) => {
  const userId = getAuthenticatedUserId(user);
  const profile = await getProfileForUser(userId);
  const existing = await profilesRepository.findExperienceByIdForProfile(
    experienceId,
    profile.id,
  );

  if (!existing) {
    throw new AppError('Profile experience not found', 404);
  }

  const payload = normalizeExperiencePayload(body);
  const merged = {
    ...existing,
    ...payload,
  };

  if (
    merged.start_date &&
    merged.end_date &&
    new Date(merged.end_date) < new Date(merged.start_date)
  ) {
    throw new AppError('end_date must be greater than or equal to start_date', 400);
  }

  const experience = await profilesRepository.updateExperience({
    experienceId,
    profileId: profile.id,
    payload,
  });

  return { experience };
};

const deleteMyExperience = async ({ user, experienceId }) => {
  const userId = getAuthenticatedUserId(user);
  const profile = await getProfileForUser(userId);
  const deleted = await profilesRepository.deleteExperience({
    experienceId,
    profileId: profile.id,
  });

  if (!deleted) {
    throw new AppError('Profile experience not found', 404);
  }

  return { id: deleted.id };
};

module.exports = {
  createMyExperience,
  deleteMyExperience,
  getMyExperienceById,
  getMyExperiences,
  updateMyExperience,
};
