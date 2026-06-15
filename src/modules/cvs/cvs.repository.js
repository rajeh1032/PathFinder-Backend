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

const uploadCvFile = async ({ storagePath, buffer, contentType }) => {
  const client = ensureSupabase();
  const { data, error } = await client.storage
    .from('cvs')
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  handleSupabaseError(error, 'Failed to upload CV file');
  return data;
};

const deleteCvFile = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  const client = ensureSupabase();
  const { error } = await client.storage.from('cvs').remove([storagePath]);

  handleSupabaseError(error, 'Failed to delete CV file');
};

const createCv = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .insert(payload)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create CV record');
  return data;
};

const updateCv = async (cvId, payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .update(payload)
    .eq('id', cvId)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to update CV record');
  return data;
};

const createCvAnalysis = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cv_analyses')
    .insert(payload)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create CV analysis');
  return data;
};

const findUserContextById = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('users')
    .select(
      `
        id,
        name,
        email,
        profiles(
          id,
          user_id,
          education_level_id,
          university,
          major,
          current_status_id,
          experience_year_id,
          target_career_id,
          location,
          headline,
          bio,
          education_level_lookup:education_level(education_level),
          current_status_lookup:current_status(current_status),
          experience_year_lookup:experience_year(experience_level),
          target_career:career_paths(title)
        )
      `,
    )
    .eq('id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch user context');
  return data;
};

const findProfileDetails = async (profileId, userId) => {
  const client = ensureSupabase();

  const [
    experiencesResult,
    educationResult,
    preferencesResult,
    achievementsResult,
  ] = await Promise.all([
    profileId
      ? client
          .from('profile_experiences')
          .select('*')
          .eq('profile_id', profileId)
          .order('display_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    profileId
      ? client
          .from('profile_education')
          .select('*, education_level_lookup:education_level(education_level)')
          .eq('profile_id', profileId)
          .order('display_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    client
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true }),
  ]);

  handleSupabaseError(
    experiencesResult.error,
    'Failed to fetch profile experiences',
  );
  handleSupabaseError(educationResult.error, 'Failed to fetch profile education');
  handleSupabaseError(preferencesResult.error, 'Failed to fetch user preferences');
  handleSupabaseError(achievementsResult.error, 'Failed to fetch achievements');

  return {
    experiences: experiencesResult.data || [],
    education: educationResult.data || [],
    preferences: preferencesResult.data || null,
    achievements: achievementsResult.data || [],
  };
};

const findSkillByNameCaseInsensitive = async (name) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('skills')
    .select('*')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch skill');
  return data;
};

const createSkill = async ({ name, category, level }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('skills')
    .insert({
      name,
      category: category || null,
      level: level || null,
      aliases: [],
      is_active: true,
    })
    .select('*')
    .single();

  if (error?.code === '23505') {
    return findSkillByNameCaseInsensitive(name);
  }

  handleSupabaseError(error, 'Failed to create skill');
  return data;
};

const upsertCvSkill = async ({ cvId, skillId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cv_skills')
    .upsert(
      {
        cv_id: cvId,
        skill_id: skillId,
        source: 'ai',
      },
      { onConflict: 'cv_id,skill_id' },
    )
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to upsert CV skill');
  return data;
};

const upsertUserSkill = async ({ userId, skillId, level }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('user_skills')
    .upsert(
      {
        user_id: userId,
        skill_id: skillId,
        level: level || null,
      },
      { onConflict: 'user_id,skill_id' },
    )
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to upsert user skill');
  return data;
};

const findLatestCompletedAnalysisForUser = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .select('*, cv_analyses(*)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch latest CV analysis');
  return data;
};

const findLatestCvForUser = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .select('id, status, created_at, uploaded_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch latest CV status');
  return data;
};

module.exports = {
  uploadCvFile,
  deleteCvFile,
  createCv,
  updateCv,
  createCvAnalysis,
  findUserContextById,
  findProfileDetails,
  findSkillByNameCaseInsensitive,
  createSkill,
  upsertCvSkill,
  upsertUserSkill,
  findLatestCompletedAnalysisForUser,
  findLatestCvForUser,
};
