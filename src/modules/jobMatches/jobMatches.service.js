const { ensureSupabase, handleSupabaseError } = require('../../common/utils/supabaseRepository');
const jobsRepository = require('../jobs/jobs.repository');
const jobsService = require('../jobs/jobs.service');
const aiService = require('../ai/ai.service');
const ragService = require('../rag/rag.service');
const {
  JOB_MATCHING_GEMINI_SCHEMA,
  buildJobMatchingMessages,
} = require('../ai/prompts/jobMatching.prompt');
const AppError = require('../../common/errors/AppError');

const MATCH_SELECT = 'id,user_id,job_id,cv_id,match_percentage,matched_skills,missing_skills,ai_reason,generated_by_type,status,created_at,jobs(id,title,company,location,source,source_type,required_skills,employment_type,salary_range,level,category,company_logo_url,apply_url)';
const DEFAULT_MIN_MATCH_SCORE = 50;
const SYNCED_JOB_SOURCE = 'apify_linkedin';
const SYNCED_JOB_SOURCE_TYPE = 'linkedin';

const asArray = (value) => Array.isArray(value) ? value : [];
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const cleanSkillList = (items) => [...new Set(asArray(items).map((item) => String(item || '').trim()).filter(Boolean))];
const includeManualJobs = (value) => value === true || value === 'true';
const isSyncedJob = (job) =>
  job?.source === SYNCED_JOB_SOURCE || job?.source_type === SYNCED_JOB_SOURCE_TYPE;
const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const normalizeAiMatch = (data) => ({
  match_percentage: clampScore(data?.match_percentage),
  matched_skills: cleanSkillList(data?.matched_skills),
  missing_skills: cleanSkillList(data?.missing_skills).slice(0, 8),
  ai_reason: String(data?.ai_reason || 'AI generated a job fit assessment.').trim(),
  generated_by_type: 'ai',
});

const createAiMatch = async (userId, job, skills, profile, ragContext) => {
  const result = await aiService.generateJsonCompletion({
    userId,
    feature: 'job_matching',
    messages: buildJobMatchingMessages({ profile, skills, job, ragContext }),
    responseSchemaHint: 'Job matching score, matched skills, missing skills, and reason',
    responseJsonSchema: JOB_MATCHING_GEMINI_SCHEMA,
  });

  return normalizeAiMatch(result.data);
};

const createFallbackMatch = (job, skills, profile) => ({
  ...jobsService.calculateJobMatch(job, skills, profile),
  generated_by_type: 'system',
});

const createMatch = async (userId, job, skills, profile, ragContext) => {
  try {
    return await createAiMatch(userId, job, skills, profile, ragContext);
  } catch (error) {
    return createFallbackMatch(job, skills, profile);
  }
};

const saveMatch = async (userId, job, match) => {
  const client = ensureSupabase();
  const payload = {
    user_id: userId,
    job_id: job.id,
    match_percentage: match.match_percentage,
    matched_skills: match.matched_skills,
    missing_skills: match.missing_skills,
    ai_reason: match.ai_reason,
    generated_by_type: match.generated_by_type || 'system',
    status: 'generated',
  };

  const { data: existing, error: existingError } = await client
    .from('job_matches')
    .select('id')
    .eq('user_id', userId)
    .eq('job_id', job.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  handleSupabaseError(existingError, 'Failed to find existing job match');

  const query = existing?.id
    ? client.from('job_matches').update(payload).eq('id', existing.id)
    : client.from('job_matches').insert(payload);

  const { data, error } = await query.select(MATCH_SELECT).single();
  handleSupabaseError(error, 'Failed to save job match');
  return data;
};

const generateMatches = async (userId, {
  jobId,
  limit,
  concurrency,
  keyword,
  location,
  category,
  level,
  includeManual,
} = {}) => {
  const [skills, profile] = await Promise.all([
    jobsRepository.listUserSkills(userId),
    jobsRepository.getUserProfile(userId),
  ]);
  const ragContext = await ragService.getRagContextForFeature('job_matching');
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const safeConcurrency = Math.min(5, Math.max(1, Number(concurrency) || 2));
  const searchKeyword = keyword || profile?.career_paths?.title || profile?.headline;
  const candidateLimit = Math.min(100, Math.max(safeLimit * 3, safeLimit));
  const jobs = jobId
    ? [await jobsRepository.findJobById(jobId)]
    : (await jobsRepository.listJobs({
      limit: candidateLimit,
      status: 'published',
      keyword: searchKeyword,
      location,
      category,
      level,
      ...(!includeManualJobs(includeManual) && {
        source: SYNCED_JOB_SOURCE,
        sourceType: SYNCED_JOB_SOURCE_TYPE,
      }),
    })).jobs
      .filter((job) => jobsService.isCareerAlignedJob(job, profile))
      .slice(0, safeLimit);

  const matches = await mapWithConcurrency(jobs.filter(Boolean), safeConcurrency, async (job) => {
    const match = await createMatch(userId, job, skills, profile, ragContext);
    return saveMatch(userId, job, match);
  });

  return matches.filter(Boolean).sort((a, b) => b.match_percentage - a.match_percentage);
};

const listMatches = async (userId, query = {}) => {
  const client = ensureSupabase();
  const profile = await jobsRepository.getUserProfile(userId);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const includeWeak = query.includeWeak === true || query.includeWeak === 'true';
  const includeFallback = query.includeFallback === true || query.includeFallback === 'true';
  const minScore = includeWeak ? 0 : Math.max(0, Math.min(100, Number(query.minScore) || DEFAULT_MIN_MATCH_SCORE));
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  let request = client
    .from('job_matches')
    .select(MATCH_SELECT, { count: 'exact' })
    .eq('user_id', userId)
    .gte('match_percentage', minScore);

  if (!includeFallback) request = request.eq('generated_by_type', 'ai');

  const { data, error, count } = await request
    .order('match_percentage', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);
  handleSupabaseError(error, 'Failed to list job matches');
  const seenJobs = new Set();
  const matches = (data || []).filter((match) => {
    if (!match.job_id || seenJobs.has(match.job_id)) return false;
    if (!includeManualJobs(query.includeManual) && !isSyncedJob(match.jobs)) return false;
    if (!jobsService.isCareerAlignedJob(match.jobs, profile)) return false;
    seenJobs.add(match.job_id);
    return true;
  });

  return {
    matches,
    pagination: {
      page,
      limit,
      totalItems: matches.length,
      totalPages: Math.max(1, Math.ceil(matches.length / limit)),
    },
  };
};

const getMatch = async (userId, id) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('job_matches').select(MATCH_SELECT).eq('id', id).eq('user_id', userId).maybeSingle();
  handleSupabaseError(error, 'Failed to fetch job match');
  if (!data) throw new AppError('Job match not found', 404);
  return data;
};

module.exports = { generateMatches, listMatches, getMatch };
