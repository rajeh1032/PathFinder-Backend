const crypto = require('crypto');
const { ensureSupabase, handleSupabaseError } = require('../../common/utils/supabaseRepository');

const JOB_FIELDS = 'id,title,company,location,description,source,source_type,external_id,apply_url,required_skills,employment_type,salary_range,level,category,thumbnail_url,company_logo_url,certificate_provider,duration,is_active,status,posted_at,created_at,updated_at';
const MATCHED_JOB_FIELDS = `id,user_id,job_id,cv_id,match_percentage,matched_skills,missing_skills,ai_reason,generated_by_type,status,created_at,jobs(${JOB_FIELDS})`;

const pageLimit = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
};

const applyFilters = (query, filters = {}) => {
  let next = query.eq('is_active', true);
  next = filters.status ? next.eq('status', filters.status) : next.neq('status', 'archived');

  if (filters.keyword) {
    const keyword = String(filters.keyword).replace(/[%]/g, '').trim();
    if (keyword) next = next.or(`title.ilike.%${keyword}%,company.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  }
  if (filters.location) next = next.ilike('location', `%${filters.location}%`);
  if (filters.category) next = next.ilike('category', `%${filters.category}%`);
  if (filters.level) next = next.ilike('level', `%${filters.level}%`);
  if (filters.source) next = next.eq('source', filters.source);
  if (filters.sourceType) next = next.eq('source_type', filters.sourceType);
  if (filters.source_type) next = next.eq('source_type', filters.source_type);
  if (filters.remote === true || filters.remote === 'true') {
    next = next.or('location.ilike.%remote%,employment_type.ilike.%remote%');
  }

  return next;
};

const listJobs = async (filters = {}) => {
  const client = ensureSupabase();
  const { page, limit, from, to } = pageLimit(filters);
  let query = client.from('jobs').select(JOB_FIELDS, { count: 'exact' });
  query = applyFilters(query, filters)
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  handleSupabaseError(error, 'Failed to list jobs');
  const totalItems = count || 0;

  return {
    jobs: data || [],
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      hasNextPage: to + 1 < totalItems,
      hasPreviousPage: page > 1,
    },
  };
};

const findJobById = async (id) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('jobs').select(JOB_FIELDS).eq('id', id).maybeSingle();
  handleSupabaseError(error, 'Failed to fetch job');
  return data;
};

const findBySourceExternalId = async (source, externalId) => {
  if (!source || !externalId) return null;
  const client = ensureSupabase();
  const { data, error } = await client
    .from('jobs')
    .select('id')
    .eq('source', source)
    .eq('external_id', externalId)
    .maybeSingle();
  handleSupabaseError(error, 'Failed to find existing job');
  return data;
};

const createJob = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('jobs').insert(payload).select(JOB_FIELDS).single();
  handleSupabaseError(error, 'Failed to create job');
  return data;
};

const updateJob = async (id, payload) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('jobs').update(payload).eq('id', id).select(JOB_FIELDS).single();
  handleSupabaseError(error, 'Failed to update job');
  return data;
};

const upsertJobs = async (jobs) => {
  const saved = [];
  for (const job of jobs) {
    const existing = await findBySourceExternalId(job.source, job.external_id);
    saved.push(existing ? await updateJob(existing.id, job) : await createJob(job));
  }
  return saved;
};

const listUserSkillNames = async (userId) => {
  const skills = await listUserSkills(userId);
  return skills.map((skill) => skill.name).filter(Boolean);
};

const listStoredMatchedJobs = async (userId, filters = {}) => {
  const client = ensureSupabase();
  const { page, limit, from, to } = pageLimit(filters);
  const includeWeak = filters.includeWeak === true || filters.includeWeak === 'true';
  const includeFallback = filters.includeFallback === true || filters.includeFallback === 'true';
  const minScore = includeWeak ? 0 : Math.max(0, Math.min(100, Number(filters.minScore) || 50));

  let query = client
    .from('job_matches')
    .select(MATCHED_JOB_FIELDS, { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'generated')
    .gte('match_percentage', minScore);

  if (!includeFallback) query = query.eq('generated_by_type', 'ai');

  query = query
    .order('match_percentage', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  handleSupabaseError(error, 'Failed to list matched jobs');
  const totalItems = count || 0;

  return {
    matches: data || [],
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      hasNextPage: to + 1 < totalItems,
      hasPreviousPage: page > 1,
    },
  };
};

const listProfileUserSkills = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('user_skills')
    .select('level,skills(id,name,category,level)')
    .eq('user_id', userId);
  handleSupabaseError(error, 'Failed to fetch user skills');
  return (data || [])
    .map((row) => ({
      id: row.skills?.id,
      name: row.skills?.name,
      category: row.skills?.category || 'General',
      level: row.level || row.skills?.level || null,
    }))
    .filter((skill) => skill.name);
};

const listLatestCvSkills = async (userId) => {
  const client = ensureSupabase();
  const { data: latestCv, error: latestCvError } = await client
    .from('cvs')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  handleSupabaseError(latestCvError, 'Failed to fetch latest CV');

  if (!latestCv?.id) return [];

  const { data, error } = await client
    .from('cv_skills')
    .select('skills(id,name,category,level)')
    .eq('cv_id', latestCv.id);
  handleSupabaseError(error, 'Failed to fetch CV skills');

  return (data || [])
    .map((row) => ({
      id: row.skills?.id,
      name: row.skills?.name,
      category: row.skills?.category || 'General',
      level: row.skills?.level || null,
    }))
    .filter((skill) => skill.name);
};

const uniqueSkillsByName = (skills) => {
  const seen = new Set();
  const result = [];
  for (const skill of skills) {
    const key = String(skill.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(skill);
  }
  return result;
};

const listUserSkills = async (userId) => {
  const [userSkills, cvSkills] = await Promise.all([
    listProfileUserSkills(userId),
    listLatestCvSkills(userId),
  ]);
  return uniqueSkillsByName([...userSkills, ...cvSkills]);
};

const getUserProfile = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('location,headline,career_paths(title,category)')
    .eq('user_id', userId)
    .maybeSingle();
  handleSupabaseError(error, 'Failed to fetch user profile');
  return data;
};

const createExternalId = (value) => crypto.createHash('sha1').update(String(value || crypto.randomUUID())).digest('hex');

module.exports = {
  JOB_FIELDS,
  listJobs,
  listStoredMatchedJobs,
  findJobById,
  upsertJobs,
  listUserSkillNames,
  listUserSkills,
  getUserProfile,
  createExternalId,
};
