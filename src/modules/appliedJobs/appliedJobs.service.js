const { ensureSupabase, handleSupabaseError } = require('../../common/utils/supabaseRepository');

const APPLIED_SELECT = 'id,status,applied_at,cover_letter_id,next_step,next_step_at,notes,created_at,updated_at,jobs(id,title,company,location,description,required_skills,employment_type,salary_range,level,category,company_logo_url,apply_url,status)';

const listAppliedJobs = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('applied_jobs')
    .select(APPLIED_SELECT)
    .eq('user_id', userId)
    .order('applied_at', { ascending: false });
  handleSupabaseError(error, 'Failed to list applied jobs');
  return data || [];
};

const applyToJob = async (userId, jobId, payload = {}) => {
  const client = ensureSupabase();
  const row = {
    user_id: userId,
    job_id: jobId,
    status: 'applied',
    cover_letter_id: payload.coverLetterId || null,
    next_step: payload.nextStep || null,
    next_step_at: payload.nextStepAt || null,
    notes: payload.notes || null,
  };
  const { data, error } = await client
    .from('applied_jobs')
    .upsert(row, { onConflict: 'user_id,job_id' })
    .select(APPLIED_SELECT)
    .single();
  handleSupabaseError(error, 'Failed to apply to job');
  return data;
};

const updateStatus = async (userId, appliedJobId, payload) => {
  const client = ensureSupabase();
  const update = { status: payload.status };
  if (Object.prototype.hasOwnProperty.call(payload, 'nextStep')) update.next_step = payload.nextStep;
  if (Object.prototype.hasOwnProperty.call(payload, 'nextStepAt')) update.next_step_at = payload.nextStepAt;
  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) update.notes = payload.notes;

  const { data, error } = await client
    .from('applied_jobs')
    .update(update)
    .eq('id', appliedJobId)
    .eq('user_id', userId)
    .select(APPLIED_SELECT)
    .single();
  handleSupabaseError(error, 'Failed to update applied job');
  return data;
};

module.exports = { listAppliedJobs, applyToJob, updateStatus };
