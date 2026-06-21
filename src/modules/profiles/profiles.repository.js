const { cli } = require('winston/lib/winston/config');
const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

const handleSupabaseError = (error, message, statusCode = 500) => {
  if (error) {
    throw new AppError(message, statusCode, {
      code: error.code,
      hint: error.hint,
    });
  }
};

const AVATAR_BUCKET = 'profile-images';

const uploadAvatarFile = async ({ storagePath, buffer, contentType }) => {
  const client = ensureSupabase();
  const { data, error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  handleSupabaseError(error, 'Failed to upload profile image');
  return data;
};

const getAvatarPublicUrl = (storagePath) => {
  const client = ensureSupabase();
  const { data } = client.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
};

const deleteAvatarFile = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  const client = ensureSupabase();
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .remove([storagePath]);

  handleSupabaseError(error, 'Failed to delete profile image');
};

const findProfileByUserId = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch profile');
  return data;
};

const findProfileWithUserByUserId = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*, users(name)')
    .eq('user_id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch profile');
  return data;
};

const updateProfile = async (userId, payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  handleSupabaseError(error, 'Failed to update profile');
  return data;
};

const findEducationById = async (id) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('profile_education')
    .select(
      `
        *,
        profile:profiles (
          user_id
        )
      `,
    )
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    handleSupabaseError(error, 'Failed to create profile experience');
  }
  return data || null;
};

const findExperiencesByProfileId = async (profileId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profile_experiences')
    .select('*')
    .eq('profile_id', profileId)
    .order('display_order', { ascending: true })
    .order('start_date', { ascending: false });

  handleSupabaseError(error, 'Failed to fetch profile experiences');
  return data || [];
};

const findEducationByProfileId = async (profileId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('profile_education')
    .select('*')
    .eq('profile_id', profileId)
    .order('start_date', { ascending: false });

  handleSupabaseError(error, 'Failed to fetch profile education');
  return data;
};

const findExperienceByIdForProfile = async (experienceId, profileId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profile_experiences')
    .select('*')
    .eq('id', experienceId)
    .eq('profile_id', profileId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch profile experience');
  return data;
};

const createEducation = async (profileId, educationData) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profile_education')
    .insert([
      {
        profile_id: profileId,
        ...educationData,
      },
    ])
    .select()
    .single();

  handleSupabaseError(error, 'Failed to create profile education');
  return data;
};

const createExperience = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profile_experiences')
    .insert(payload)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create profile experience');
  return data;
};

const updateEducation = async (id, updateData) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('profile_education')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  handleSupabaseError(error, 'Failed to update profile education');
  return data;
};

const updateExperience = async ({ experienceId, profileId, payload }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profile_experiences')
    .update(payload)
    .eq('id', experienceId)
    .eq('profile_id', profileId)
    .select('*')
    .maybeSingle();

  handleSupabaseError(error, 'Failed to update profile experience');
  return data;
};

const deleteEducation = async (id) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('profile_education')
    .delete()
    .eq('id', id)
    .select()
    .single();

  handleSupabaseError(error, 'Failed to delete profile education');
  return data;
};

const deleteExperience = async ({ experienceId, profileId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profile_experiences')
    .delete()
    .eq('id', experienceId)
    .eq('profile_id', profileId)
    .select('id')
    .maybeSingle();

  handleSupabaseError(error, 'Failed to delete profile experience');
  return data;
};

const getAllTargetCareerPaths = async () => {
  const client = ensureSupabase();
  const { data, error } = await client.from('career_paths').select('id,title');

  handleSupabaseError(error,'Failed to get career paths');

  return data;
};

module.exports = {
  createExperience,
  deleteExperience,
  findExperienceByIdForProfile,
  findExperiencesByProfileId,
  findProfileByUserId,
  findProfileWithUserByUserId,
  updateProfile,
  uploadAvatarFile,
  getAvatarPublicUrl,
  deleteAvatarFile,
  updateExperience,
  findEducationById,
  findEducationByProfileId,
  deleteEducation,
  updateEducation,
  createEducation,
  getAllTargetCareerPaths,
};
