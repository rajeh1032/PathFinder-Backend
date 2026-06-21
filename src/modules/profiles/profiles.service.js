const crypto = require('crypto');
const path = require('path');

const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const profilesRepository = require('./profiles.repository');

const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const AVATAR_EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
};

const assertValidAvatarFile = (file) => {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      'Only JPG, PNG, WEBP, or GIF images are allowed',
      415,
    );
  }

  if (file.size > AVATAR_MAX_FILE_SIZE) {
    throw new AppError('Profile image must be 5MB or smaller', 413);
  }
};

const buildAvatarStoragePath = ({ userId, file }) => {
  const extension =
    AVATAR_EXTENSION_BY_MIME[file.mimetype] ||
    (path.extname(file.originalname || '').replace('.', '').toLowerCase() ||
      'jpg');

  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
};

const getProfileForUser = async (userId) => {
  const profile = await profilesRepository.findProfileByUserId(userId);

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  return profile;
};

const getMyProfile = async (user) => {
  const userId = getAuthenticatedUserId(user);
  const profile = await profilesRepository.findProfileWithUserByUserId(userId);

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  // Flatten the embedded user record so the response exposes a top-level `name`.
  const { users, ...profileFields } = profile;

  return { profile: { ...profileFields, name: users?.name ?? null } };
};

const updateMyProfile = async ({ user, body = {}, file = null }) => {
  const userId = getAuthenticatedUserId(user);
  // Ensure the profile exists (and capture the current avatar for cleanup).
  const existingProfile = await getProfileForUser(userId);

  const payload = { ...body };

  // Guard against no-op updates.
  if (Object.keys(payload).length === 0 && !file) {
    throw new AppError('No profile fields provided to update', 400);
  }

  let uploadedStoragePath = null;

  if (file) {
    assertValidAvatarFile(file);

    const storagePath = buildAvatarStoragePath({ userId, file });

    await profilesRepository.uploadAvatarFile({
      storagePath,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    uploadedStoragePath = storagePath;
    payload.avatar_url = profilesRepository.getAvatarPublicUrl(storagePath);
    payload.avatar_storage_path = storagePath;
  }

  let profile;

  try {
    profile = await profilesRepository.updateProfile(userId, payload);
  } catch (error) {
    // Roll back the freshly uploaded image if the DB update fails.
    if (uploadedStoragePath) {
      try {
        await profilesRepository.deleteAvatarFile(uploadedStoragePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded profile image', {
          storagePath: uploadedStoragePath,
          reason: cleanupError.message,
        });
      }
    }

    throw error;
  }

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  // Best-effort removal of the previous avatar after a successful replacement.
  if (
    uploadedStoragePath &&
    existingProfile.avatar_storage_path &&
    existingProfile.avatar_storage_path !== uploadedStoragePath
  ) {
    try {
      await profilesRepository.deleteAvatarFile(
        existingProfile.avatar_storage_path,
      );
    } catch (cleanupError) {
      logger.warn('Failed to delete previous profile image', {
        storagePath: existingProfile.avatar_storage_path,
        reason: cleanupError.message,
      });
    }
  }

  return { profile };
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
  const experiences = await profilesRepository.findExperiencesByProfileId(
    profile.id,
  );

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
    throw new AppError(
      'end_date must be greater than or equal to start_date',
      400,
    );
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

const getUserEducationHistory = async (userId) => {
  const profile = await getProfileForUser(userId);
  return profilesRepository.findEducationByProfileId(profile.id);
};

const getEducationById = async (userId, educationId) => {
  const education = await profilesRepository.findEducationById(educationId);

  if (!education) {
    throw new AppError('Education record not found.', 404);
  }
  // Business Rule: Ensure user owns this profile record
  if (education.profile?.user_id !== userId) {
    throw new AppError(
      'Unauthorized: You do not own this education record.',
      403,
    );
  }

  return education;
};

const addEducation = async (userId, educationData) => {
  const profile = await getProfileForUser(userId);
  return profilesRepository.createEducation(profile.id, educationData);
};

const updateEducation = async (userId, educationId, updateData) => {
  const education = await profilesRepository.findEducationById(educationId);

  if (!education) {
    throw new AppError('Education record not found.', 404);
  }
  // Business Rule: Ensure user owns this profile record
  if (education.profile.user_id !== userId) {
    throw new AppError(
      'Unauthorized: You do not own this education record.',
      403,
    );
  }

  return profilesRepository.updateEducation(educationId, updateData);
};

const removeEducation = async (userId, educationId) => {
  const education = await profilesRepository.findEducationById(educationId);

  if (!education) {
    throw new AppError('Education record not found.', 404);
  }
  // Business Rule: Ensure user owns this profile record
  if (education.profile.user_id !== userId) {
    throw new AppError(
      'Unauthorized: You do not own this education record.',
      403,
    );
  }

  await profilesRepository.deleteEducation(educationId);
  return { id: educationId, deleted: true };
};

const getAllTargetPaths = async ()=>{
  const careerPahts = await profilesRepository.getAllTargetCareerPaths();

  if(!careerPahts){
    throw new AppError('Can not reterive career paths',500)
  }
  return careerPahts;
}

module.exports = {
  AVATAR_MAX_FILE_SIZE,
  ALLOWED_AVATAR_MIME_TYPES,
  createMyExperience,
  deleteMyExperience,
  getMyExperienceById,
  getMyExperiences,
  updateMyExperience,
  getMyProfile,
  updateMyProfile,
  getUserEducationHistory,
  getEducationById,
  removeEducation,
  updateEducation,
  addEducation,
  getAllTargetPaths
};
