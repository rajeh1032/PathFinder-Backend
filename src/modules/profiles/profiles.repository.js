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
  updateExperience,
  findEducationById,
  findEducationByProfileId,
  deleteEducation,
  updateEducation,
  createEducation,
  getAllTargetCareerPaths,
};
