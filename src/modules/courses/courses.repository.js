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

const PUBLIC_COURSE_FIELDS = `
  id,
  title,
  description,
  provider,
  url,
  thumbnail_url,
  video_url,
  level,
  duration,
  category,
  learning_outcomes,
  language,
  price,
  currency,
  is_free,
  rating,
  reviews_count,
  enrollment_count,
  popularity_score,
  created_at,
  updated_at,
  course_skills(confidence, source, skills(id, name, category, level))
`;

const applyAvailableCourseFilters = (query) => query
  .eq('is_active', true)
  .eq('analysis_status', 'approved');

const applyCourseSort = (query, sort) => {
  if (sort === 'rating') {
    return query
      .order('rating', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true });
  }

  if (sort === 'popular') {
    return query
      .order('popularity_score', { ascending: false })
      .order('enrollment_count', { ascending: false })
      .order('id', { ascending: true });
  }

  return query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true });
};

const findCoursesPage = async ({ page, limit, filters }) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = applyAvailableCourseFilters(
    client.from('courses').select(PUBLIC_COURSE_FIELDS, { count: 'exact' }),
  );

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  if (filters.category) query = query.ilike('category', filters.category);
  if (filters.level) query = query.ilike('level', filters.level);
  if (filters.provider) query = query.ilike('provider', filters.provider);
  if (filters.language) query = query.ilike('language', filters.language);
  if (typeof filters.isFree === 'boolean') query = query.eq('is_free', filters.isFree);

  const { data, error, count } = await applyCourseSort(query, filters.sort)
    .range(from, to);
  handleSupabaseError(error, 'Failed to fetch courses');
  return { rows: data || [], totalItems: count || 0 };
};

const findAvailableCourseById = async (courseId) => {
  const client = ensureSupabase();
  const { data, error } = await applyAvailableCourseFilters(
    client.from('courses').select(PUBLIC_COURSE_FIELDS),
  )
    .eq('id', courseId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch course');
  return data;
};

const findUserCourseStates = async ({ userId, courseIds }) => {
  if (!courseIds.length) return { savedRows: [], enrollmentRows: [] };
  const client = ensureSupabase();
  const [savedResult, enrollmentResult] = await Promise.all([
    client
      .from('saved_courses')
      .select('id, course_id, created_at')
      .eq('user_id', userId)
      .in('course_id', courseIds),
    client
      .from('course_enrollments')
      .select('id, course_id, status, progress, enrolled_at, completed_at, created_at, updated_at')
      .eq('user_id', userId)
      .in('course_id', courseIds),
  ]);

  handleSupabaseError(savedResult.error, 'Failed to fetch saved course state');
  handleSupabaseError(enrollmentResult.error, 'Failed to fetch enrollment state');
  return {
    savedRows: savedResult.data || [],
    enrollmentRows: enrollmentResult.data || [],
  };
};

const findSavedCoursesPage = async ({ userId, page, limit }) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const { data, error, count } = await client
    .from('saved_courses')
    .select(`id, created_at, courses!inner(${PUBLIC_COURSE_FIELDS})`, { count: 'exact' })
    .eq('user_id', userId)
    .eq('courses.is_active', true)
    .eq('courses.analysis_status', 'approved')
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  handleSupabaseError(error, 'Failed to fetch saved courses');
  return { rows: data || [], totalItems: count || 0 };
};

const findEnrollmentCoursesPage = async ({ userId, page, limit }) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const { data, error, count } = await client
    .from('course_enrollments')
    .select(`id, status, progress, enrolled_at, completed_at, created_at, updated_at, courses!inner(${PUBLIC_COURSE_FIELDS})`, { count: 'exact' })
    .eq('user_id', userId)
    .eq('courses.is_active', true)
    .eq('courses.analysis_status', 'approved')
    .order('updated_at', { ascending: false })
    .range(from, from + limit - 1);

  handleSupabaseError(error, 'Failed to fetch course enrollments');
  return { rows: data || [], totalItems: count || 0 };
};

const findSavedCourse = async ({ userId, courseId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('saved_courses')
    .select('id, user_id, course_id, created_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  handleSupabaseError(error, 'Failed to fetch saved course');
  return data;
};

const createSavedCourse = async ({ userId, courseId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('saved_courses')
    .insert({ user_id: userId, course_id: courseId })
    .select('id, user_id, course_id, created_at')
    .single();
  if (error?.code === '23505') return findSavedCourse({ userId, courseId });
  handleSupabaseError(error, 'Failed to save course');
  return data;
};

const deleteSavedCourse = async ({ userId, courseId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('saved_courses')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .select('id');
  handleSupabaseError(error, 'Failed to unsave course');
  return (data || []).length > 0;
};

const findCourseEnrollment = async ({ userId, courseId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  handleSupabaseError(error, 'Failed to fetch course enrollment');
  return data;
};

const createCourseEnrollment = async ({ userId, courseId }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('course_enrollments')
    .insert({ user_id: userId, course_id: courseId })
    .select('*')
    .single();
  if (error?.code === '23505') return findCourseEnrollment({ userId, courseId });
  handleSupabaseError(error, 'Failed to enroll in course');
  return data;
};

const updateCourseEnrollment = async ({ userId, courseId, changes }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('course_enrollments')
    .update(changes)
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .select('*')
    .maybeSingle();
  handleSupabaseError(error, 'Failed to update course enrollment');
  return data;
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

const findActiveSkillsByNames = async (names) => {
  if (!names.length) return [];
  const client = ensureSupabase();
  const { data, error } = await client
    .from('skills')
    .select('id, name, category, level, aliases')
    .eq('is_active', true)
    .in('name', names);
  handleSupabaseError(error, 'Failed to resolve recommendation skills');
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

const findApprovedCourseSkillRows = async (skillIds) => {
  if (!skillIds.length) return [];
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
        courses!inner(
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
          is_active,
          created_at,
          updated_at
        )
      `,
    )
    .in('skill_id', skillIds)
    .eq('courses.is_active', true)
    .eq('courses.analysis_status', 'approved');

  handleSupabaseError(error, 'Failed to fetch approved course recommendations');
  return data || [];
};

const findCourseById = async (courseId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('courses')
    .select(PUBLIC_COURSE_FIELDS)
    .eq('id', courseId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch course');
  return data;
};

const updateCourse = async ({ courseId, changes }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('courses')
    .update(changes)
    .eq('id', courseId)
    .select(PUBLIC_COURSE_FIELDS)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to update course');
  return data;
};

const deleteCourse = async (courseId) => {
  const client = ensureSupabase();
  // All FKs referencing courses(id) are ON DELETE CASCADE, so dependent
  // course_skills/saved_courses/course_enrollments rows are removed by the DB.
  const { data, error } = await client
    .from('courses')
    .delete()
    .eq('id', courseId)
    .select('id')
    .maybeSingle();

  handleSupabaseError(error, 'Failed to delete course');
  return data;
};

module.exports = {
  findCoursesPage,
  findAvailableCourseById,
  findCourseById,
  updateCourse,
  deleteCourse,
  findUserCourseStates,
  findSavedCoursesPage,
  findEnrollmentCoursesPage,
  findSavedCourse,
  createSavedCourse,
  deleteSavedCourse,
  findCourseEnrollment,
  createCourseEnrollment,
  updateCourseEnrollment,
  findCourseByProviderExternalId,
  findAllActiveSkills,
  findActiveSkillsByNames,
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
