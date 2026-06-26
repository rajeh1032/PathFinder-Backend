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

const USER_CV_SELECT = `
  id,
  user_id,
  file_url,
  storage_path,
  original_name,
  mime_type,
  size_bytes,
  status,
  uploaded_at,
  created_at,
  updated_at,
  cv_analyses (
    id,
    score,
    status,
    created_at
  )
`;

const findCvHistoryForUser = async ({
  userId,
  page = 1,
  limit = 20,
  status = '',
} = {}) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from('cvs')
    .select(USER_CV_SELECT, { count: 'exact' })
    .eq('user_id', userId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('uploaded_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  handleSupabaseError(error, 'Failed to fetch CV history');

  return { items: data || [], totalItems: count || 0 };
};

const findCvForUserById = async ({ userId, cvId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .select(USER_CV_SELECT)
    .eq('id', cvId)
    .eq('user_id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch CV');
  return data;
};

const createCvFileSignedUrl = async ({ storagePath, expiresIn }) => {
  const client = ensureSupabase();
  const { data, error } = await client.storage
    .from('cvs')
    .createSignedUrl(storagePath, expiresIn);

  handleSupabaseError(error, 'Failed to create CV file URL');
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
  findCvHistoryForUser,
  findCvForUserById,
  createCvFileSignedUrl,
};

// ===== Admin CV analyses (read-only) =====
// Joins cv_analyses -> cvs -> users so admins can review every analysis.
const ADMIN_CV_ANALYSIS_SELECT = `
  id,
  cv_id,
  score,
  model,
  summary,
  strengths,
  weaknesses,
  suggestions,
  detected_skills,
  extracted,
  generated_by_type,
  status,
  reviewed_by_admin_id,
  reviewed_at,
  created_at,
  cvs!inner (
    id,
    original_name,
    mime_type,
    size_bytes,
    status,
    created_at,
    user_id,
    users!inner ( id, name, email )
  )
`;

const findAllCvAnalyses = async ({ page = 1, limit = 20, status = '' } = {}) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from('cv_analyses')
    .select(ADMIN_CV_ANALYSIS_SELECT, { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  handleSupabaseError(error, 'Failed to fetch CV analyses');

  return { items: data || [], totalItems: count || 0 };
};

const findCvAnalysisById = async (analysisId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cv_analyses')
    .select(ADMIN_CV_ANALYSIS_SELECT)
    .eq('id', analysisId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch CV analysis');
  return data;
};

Object.assign(module.exports, {
  findAllCvAnalyses,
  findCvAnalysisById,
});
