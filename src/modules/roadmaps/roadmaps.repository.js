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

const findUserProfileContext = async (userId) => {
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
          target_career:career_paths(
            id,
            title,
            description,
            category,
            average_salary,
            difficulty_level,
            is_active
          )
        )
      `,
    )
    .eq('id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch roadmap profile context');
  return data;
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

const findCoursesForSkillIds = async (skillIds) => {
  if (!skillIds.length) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('course_skills')
    .select(
      `
        skill_id,
        confidence,
        source,
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
    )
    .in('skill_id', skillIds);

  handleSupabaseError(error, 'Failed to fetch roadmap courses');
  return data || [];
};

const findLatestActiveRoadmapForUser = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch active roadmap');
  return data;
};

const findRoadmapByIdForUser = async (roadmapId, userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('roadmaps')
    .select('*')
    .eq('id', roadmapId)
    .eq('user_id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch roadmap');
  return data;
};

const findRoadmapSteps = async (roadmapId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('roadmap_steps')
    .select(
      `
        *,
        skills(id, name, category, level, aliases),
        roadmap_step_courses(
          recommendation_order,
          source,
          courses(
            id,
            title,
            provider,
            url,
            thumbnail_url,
            video_url,
            duration,
            level
          )
        )
      `,
    )
    .eq('roadmap_id', roadmapId)
    .order('step_order', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch roadmap steps');
  return data || [];
};

const createRoadmapAtomic = async ({
  userId,
  careerPathId,
  title,
  description,
  metadata,
  generatedByType,
  steps,
  forceRegenerate,
}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc('create_roadmap_atomic', {
    p_user_id: userId,
    p_career_path_id: careerPathId,
    p_title: title,
    p_description: description,
    p_metadata: metadata,
    p_generated_by_type: generatedByType,
    p_steps: steps,
    p_force_regenerate: forceRegenerate,
  });

  handleSupabaseError(error, 'Failed to create roadmap atomically');
  return data;
};

const updateRoadmapStepProgressAtomic = async ({
  userId,
  roadmapId,
  stepId,
  progress,
  isCompleted,
}) => {
  const client = ensureSupabase();
  const { data, error } = await client.rpc(
    'update_roadmap_step_progress_atomic',
    {
      p_user_id: userId,
      p_roadmap_id: roadmapId,
      p_step_id: stepId,
      p_progress: progress,
      p_is_completed: isCompleted,
    },
  );

  handleSupabaseError(
    error,
    error?.code === 'P0002'
      ? error.message
      : 'Failed to update roadmap progress atomically',
    error?.code === 'P0002' ? 404 : 500,
  );
  return data;
};

module.exports = {
  findUserProfileContext,
  findLatestCompletedCvAnalysis,
  findUserSkills,
  findCvSkills,
  findCareerPathSkills,
  findCoursesForSkillIds,
  findLatestActiveRoadmapForUser,
  findRoadmapByIdForUser,
  findRoadmapSteps,
  createRoadmapAtomic,
  updateRoadmapStepProgressAtomic,
};
