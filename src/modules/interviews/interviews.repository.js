const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
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

const isMissingRelationError = (error) => {
  const code = error?.code || '';
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42883' ||
    code === 'PGRST205' ||
    message.includes('does not exist')
  );
};

const normalizeEmbeddingValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item) || 0);
  }

  if (typeof value === 'string') {
    return value
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map((item) => Number(item.trim()) || 0);
  }

  return [];
};

const serializeEmbedding = (embedding = []) =>
  `[${embedding.map((value) => Number(value) || 0).join(',')}]`;

const listActiveCareerPaths = async () => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('career_paths')
    .select('id, title, category, difficulty_level')
    .eq('is_active', true)
    .order('title', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch career paths');

  return data || [];
};

const findCareerPathById = async (id) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('career_paths')
    .select('id, title, category, difficulty_level, is_active')
    .eq('id', id)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch career path');

  if (!data || !data.is_active) {
    return null;
  }

  return data;
};

const findUserProfileByUserId = async (userId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('profiles')
    .select(
      'id, user_id, education_level_id, current_status_id, experience_year_id, target_career_id, location, headline, bio',
    )
    .eq('user_id', userId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch user profile');
  return data;
};

const findExperienceYearById = async (id) => {
  if (!id) {
    return null;
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('experience_year')
    .select('id, experience_level')
    .eq('id', id)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch experience level');
  return data;
};

const findCurrentStatusById = async (id) => {
  if (!id) {
    return null;
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('current_status')
    .select('id, current_status')
    .eq('id', id)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch current status');
  return data;
};

const listUserSkills = async (userId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('user_skills')
    .select('skill_id, level, skills(id, name, category, level)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch user skills');

  return (data || [])
    .map((row) => ({
      id: row.skills?.id || row.skill_id,
      name: row.skills?.name || null,
      category: row.skills?.category || null,
      level: row.level || row.skills?.level || null,
      source: 'user_skill',
    }))
    .filter((skill) => skill.name);
};

const listUserCvs = async (userId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('cvs')
    .select('id, status, created_at, uploaded_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  handleSupabaseError(error, 'Failed to fetch user CVs');
  return data || [];
};

const listCvSkills = async (cvId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('cv_skills')
    .select('skill_id, source, skills(id, name, category, level)')
    .eq('cv_id', cvId)
    .order('created_at', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch CV skills');

  return (data || [])
    .map((row) => ({
      id: row.skills?.id || row.skill_id,
      name: row.skills?.name || null,
      category: row.skills?.category || null,
      level: row.skills?.level || null,
      source: row.source || 'cv_skill',
    }))
    .filter((skill) => skill.name);
};

const listUserInterviewSessions = async (userId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_sessions')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (data?.length > 100) {
    data.length = 100;
  }

  handleSupabaseError(error, 'Failed to fetch interview sessions');
  return data || [];
};

const listInterviewSessionHistory = async (userId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_sessions')
    .select(
      `
        id,
        user_id,
        career_path_id,
        job_id,
        status,
        interview_type,
        total_questions,
        started_at,
        completed_at,
        overall_score,
        score_breakdown,
        quick_ai_insight,
        feedback_text,
        recording_url,
        created_at,
        updated_at,
        career_path:career_paths(
          id,
          title,
          category,
          difficulty_level
        )
      `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  handleSupabaseError(error, 'Failed to fetch interview session history');
  return data || [];
};

const listAllInterviewSessionHistory = async () => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_sessions')
    .select(
      `
        id,
        user_id,
        career_path_id,
        job_id,
        status,
        interview_type,
        total_questions,
        started_at,
        completed_at,
        overall_score,
        score_breakdown,
        quick_ai_insight,
        feedback_text,
        recording_url,
        created_at,
        updated_at,
        user:users(
          id,
          name,
          email
        ),
        career_path:career_paths(
          id,
          title,
          category,
          difficulty_level
        )
      `,
    )
    .order('created_at', { ascending: false });

  handleSupabaseError(error, 'Failed to fetch interview session history');
  return data || [];
};

const findInterviewSessionById = async (sessionId, userId = null) => {
  const client = ensureSupabase();
  let query = client
    .from('interview_sessions')
    .select(
      `
        id,
        user_id,
        career_path_id,
        job_id,
        status,
        interview_type,
        total_questions,
        started_at,
        completed_at,
        overall_score,
        score_breakdown,
        quick_ai_insight,
        feedback_text,
        recording_url,
        created_at,
        updated_at,
        career_path:career_paths(
          id,
          title,
          category,
          difficulty_level
        )
      `,
    )
    .eq('id', sessionId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.maybeSingle();
  handleSupabaseError(error, 'Failed to fetch interview session');
  return data;
};

const findAdminInterviewSessionById = async (sessionId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_sessions')
    .select(
      `
        id,
        user_id,
        career_path_id,
        job_id,
        status,
        interview_type,
        total_questions,
        started_at,
        completed_at,
        overall_score,
        score_breakdown,
        quick_ai_insight,
        feedback_text,
        recording_url,
        created_at,
        updated_at,
        user:users(
          id,
          name,
          email
        ),
        career_path:career_paths(
          id,
          title,
          category,
          difficulty_level
        )
      `,
    )
    .eq('id', sessionId)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch interview session');
  return data;
};

const listCareerPathSkills = async (careerPathId) => {
  if (!careerPathId) {
    return [];
  }

  const client = ensureSupabase();

  const { data, error } = await client
    .from('career_path_skills')
    .select('skill_id, required_level, priority, skills(id, name, category, level)')
    .eq('career_path_id', careerPathId)
    .order('priority', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch career path skills');

  return (data || [])
    .map((row) => ({
      id: row.skills?.id || row.skill_id,
      name: row.skills?.name || null,
      category: row.skills?.category || null,
      level: row.required_level || row.skills?.level || null,
      priority: row.priority ?? null,
    }))
    .filter((skill) => skill.name);
};

const findPreviousCompletedInterviewSession = async ({
  userId,
  careerPathId,
  interviewType,
  beforeCompletedAt,
  excludeSessionId = null,
}) => {
  if (!userId || !careerPathId || !interviewType || !beforeCompletedAt) {
    return null;
  }

  const client = ensureSupabase();
  let query = client
    .from('interview_sessions')
    .select(
      `
        id,
        user_id,
        career_path_id,
        job_id,
        status,
        interview_type,
        total_questions,
        started_at,
        completed_at,
        overall_score,
        score_breakdown,
        quick_ai_insight,
        feedback_text,
        recording_url,
        created_at,
        updated_at
      `,
    )
    .eq('user_id', userId)
    .eq('career_path_id', careerPathId)
    .eq('interview_type', interviewType)
    .eq('status', 'completed')
    .lt('completed_at', beforeCompletedAt)
    .order('completed_at', { ascending: false })
    .limit(1);

  if (excludeSessionId) {
    query = query.neq('id', excludeSessionId);
  }

  const { data, error } = await query.maybeSingle();
  handleSupabaseError(error, 'Failed to fetch previous interview session');
  return data;
};

const listQuestionsBySessionIds = async (sessionIds = []) => {
  if (!sessionIds.length) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('interview_questions')
    .select(
      `
        id,
        interview_session_id,
        question_order,
        question,
        options,
        correct_option_index,
        question_format,
        user_answer,
        is_skipped,
        answer_type,
        answered_at,
        feedback,
        score,
        question_status,
        ai_suggestion,
        generated_by_type
      `,
    )
    .in('interview_session_id', sessionIds)
    .order('interview_session_id', { ascending: true })
    .order('question_order', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch interview questions');
  return data || [];
};

const createInterviewSession = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('interview_sessions')
    .insert(payload)
    .select('id, user_id, career_path_id, interview_type, total_questions, status, started_at')
    .single();

  handleSupabaseError(error, 'Failed to create interview session');
  return data;
};

const createInterviewQuestions = async (rows = []) => {
  if (!rows.length) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('interview_questions')
    .insert(rows)
    .select('id, interview_session_id, question_order, question, options, correct_option_index, question_format');

  handleSupabaseError(error, 'Failed to create interview questions');
  return data || [];
};

const findInterviewQuestionById = async ({ sessionId, questionId, userId = null }) => {
  const client = ensureSupabase();

  const query = client
    .from('interview_questions')
    .select(
      `
        id,
        interview_session_id,
        question_order,
        question,
        options,
        correct_option_index,
        question_format,
        user_answer,
        is_skipped,
        answer_type,
        answered_at,
        feedback,
        score,
        question_status,
        ai_suggestion,
        generated_by_type
      `,
    )
    .eq('id', questionId)
    .eq('interview_session_id', sessionId);

  const { data, error } = await query.maybeSingle();
  handleSupabaseError(error, 'Failed to fetch interview question');
  return data;
};

const updateInterviewQuestion = async (questionId, payload) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_questions')
    .update(payload)
    .eq('id', questionId)
    .select(
      `
        id,
        interview_session_id,
        question_order,
        question,
        options,
        correct_option_index,
        question_format,
        user_answer,
        is_skipped,
        answer_type,
        answered_at,
        feedback,
        score,
        question_status,
        ai_suggestion,
        generated_by_type
      `,
    )
    .single();

  handleSupabaseError(error, 'Failed to update interview question');
  return data;
};

const updateInterviewSession = async (sessionId, payload) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_sessions')
    .update(payload)
    .eq('id', sessionId)
    .select(
      `
        id,
        user_id,
        career_path_id,
        job_id,
        status,
        interview_type,
        total_questions,
        started_at,
        completed_at,
        overall_score,
        score_breakdown,
        quick_ai_insight,
        feedback_text,
        recording_url,
        created_at,
        updated_at
      `,
    )
    .single();

  handleSupabaseError(error, 'Failed to update interview session');
  return data;
};

const deleteInterviewSession = async (sessionId) => {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('interview_sessions')
    .delete()
    .eq('id', sessionId)
    .select('id')
    .maybeSingle();

  handleSupabaseError(error, 'Failed to delete interview session');
  return data;
};

const listQuestionSetCacheCandidates = async ({
  interviewType,
  careerPathId,
  embedding = [],
  matchThreshold = 0.9,
  matchCount = 10,
}) => {
  const client = ensureSupabase();

  const { data: matchedData, error: matchError } = await client.rpc(
    'match_interview_question_sets',
    {
      query_embedding: serializeEmbedding(embedding || []),
      p_interview_type: interviewType,
      p_career_path_id: careerPathId || null,
      match_threshold: matchThreshold,
      match_count: matchCount,
    },
  );

  if (!matchError) {
    return matchedData || [];
  }

  logger.warn('Falling back from interview question cache RPC', {
    reason: matchError.message,
    code: matchError.code,
  });

  let query = client
    .from('interview_question_sets')
    .select(
      'id, career_path_id, interview_type, request_text, embedding, questions, metadata, created_at',
    )
    .eq('interview_type', interviewType)
    .order('created_at', { ascending: false });

  if (careerPathId) {
    query = query.eq('career_path_id', careerPathId);
  }

  const { data, error } = await query;

  if (error) {
    if (!isMissingRelationError(error)) {
      logger.warn('Interview question cache fallback query failed', {
        reason: error.message,
        code: error.code,
      });
    }

    return [];
  }

  return data || [];
};

const createQuestionSetCache = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('interview_question_sets')
    .insert({
      ...payload,
      embedding: serializeEmbedding(payload.embedding || []),
    })
    .select('id, career_path_id, interview_type, request_text, questions, metadata, created_at')
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    handleSupabaseError(error, 'Failed to store interview question cache');
  }

  return data;
};

module.exports = {
  listActiveCareerPaths,
  findCareerPathById,
  listCareerPathSkills,
  findUserProfileByUserId,
  findExperienceYearById,
  findCurrentStatusById,
  listUserSkills,
  listUserCvs,
  listCvSkills,
  listUserInterviewSessions,
  listInterviewSessionHistory,
  listAllInterviewSessionHistory,
  findInterviewSessionById,
  findAdminInterviewSessionById,
  findPreviousCompletedInterviewSession,
  listQuestionsBySessionIds,
  createInterviewSession,
  createInterviewQuestions,
  findInterviewQuestionById,
  updateInterviewQuestion,
  updateInterviewSession,
  deleteInterviewSession,
  listQuestionSetCacheCandidates,
  createQuestionSetCache,
  normalizeEmbeddingValue,
};
