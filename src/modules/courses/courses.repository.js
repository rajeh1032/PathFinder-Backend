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

const findCourseByProviderExternalId = async ({ provider, externalId }) => {
  if (!externalId) {
    return null;
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('courses')
    .select('*')
    .eq('provider', provider)
    .eq('external_id', externalId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to check existing course import');
  return data;
};

const findAllActiveSkills = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('skills')
    .select('id, name, category, level, aliases, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch skills catalog');
  return data || [];
};

const createCourse = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('courses')
    .insert(payload)
    .select('*')
    .single();

  if (error?.code === '23505') {
    throw new AppError('Course already exists', 409, {
      code: error.code,
      hint: error.hint,
    });
  }

  handleSupabaseError(error, 'Failed to create course');
  return data;
};

const upsertCourseSkills = async (courseSkillRows) => {
  if (!courseSkillRows.length) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('course_skills')
    .upsert(courseSkillRows, { onConflict: 'course_id,skill_id' })
    .select('*, skills(id, name, category, level, aliases)');

  handleSupabaseError(error, 'Failed to save course skills');
  return data || [];
};

const findLatestCompletedCvAnalysis = async (userId) => {
  const client = ensureSupabase();
  const { data: cvs, error: cvsError } = await client
    .from('cvs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5);

  handleSupabaseError(cvsError, 'Failed to fetch latest completed CV');

  for (const cv of cvs || []) {
    const { data: analysis, error: analysisError } = await client
      .from('cv_analyses')
      .select('*')
      .eq('cv_id', cv.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    handleSupabaseError(analysisError, 'Failed to fetch CV analysis');

    if (analysis) {
      return { cv, analysis };
    }
  }

  return null;
};

const findUserProfileContext = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('users')
    .select(
      `
        id,
        name,
        profiles(
          id,
          user_id,
          target_career_id,
          experience_year_lookup:experience_year(experience_level),
          target_career:career_paths(
            id,
            title,
            category,
            difficulty_level
          )
        )
      `,
    )
    .eq('id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch user course context');
  return data;
};

const findUserSkills = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('user_skills')
    .select('id, user_id, skill_id, level, skills(id, name, category, level, aliases)')
    .eq('user_id', userId);

  handleSupabaseError(error, 'Failed to fetch user skills');
  return data || [];
};

const findCvSkills = async (cvId) => {
  if (!cvId) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('cv_skills')
    .select('id, cv_id, skill_id, source, skills(id, name, category, level, aliases)')
    .eq('cv_id', cvId);

  handleSupabaseError(error, 'Failed to fetch CV skills');
  return data || [];
};

const findCareerPathSkills = async (careerPathId) => {
  if (!careerPathId) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('career_path_skills')
    .select(
      'id, career_path_id, skill_id, required_level, priority, skills(id, name, category, level, aliases)',
    )
    .eq('career_path_id', careerPathId)
    .order('priority', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch target career skills');
  return data || [];
};

const findLatestActiveRoadmapSteps = async (userId) => {
  const client = ensureSupabase();
  const { data: roadmap, error: roadmapError } = await client
    .from('roadmaps')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(roadmapError, 'Failed to fetch active roadmap');

  if (!roadmap) {
    return [];
  }

  const { data, error } = await client
    .from('roadmap_steps')
    .select('id, roadmap_id, skill_id, title, step_order, skills(id, name, category, level, aliases)')
    .eq('roadmap_id', roadmap.id)
    .order('step_order', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch roadmap steps');
  return data || [];
};

const findApprovedCourseSkillRows = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('course_skills')
    .select(
      `
        id,
        course_id,
        skill_id,
        confidence,
        source,
        skills(id, name, category, level, aliases),
        courses(
          id,
          title,
          description,
          provider,
          external_id,
          url,
          thumbnail_url,
          video_url,
          level,
          duration,
          category,
          category_id,
          learning_outcomes,
          language,
          analysis_status,
          analysis_confidence,
          price,
          currency,
          is_free,
          rating,
          reviews_count,
          enrollment_count,
          popularity_score,
          is_active
        )
      `,
    );

  handleSupabaseError(error, 'Failed to fetch approved course recommendations');
  return data || [];
};

module.exports = {
  findCourseByProviderExternalId,
  findAllActiveSkills,
  createCourse,
  upsertCourseSkills,
  findLatestCompletedCvAnalysis,
  findUserProfileContext,
  findUserSkills,
  findCvSkills,
  findCareerPathSkills,
  findLatestActiveRoadmapSteps,
  findApprovedCourseSkillRows,
};
