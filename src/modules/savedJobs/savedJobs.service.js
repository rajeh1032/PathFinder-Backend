const { ensureSupabase, handleSupabaseError } = require('../../common/utils/supabaseRepository');

const SAVED_SELECT = 'id,created_at,jobs(id,title,company,location,description,source,source_type,external_id,apply_url,required_skills,employment_type,salary_range,level,category,thumbnail_url,company_logo_url,certificate_provider,duration,is_active,status,posted_at,created_at,updated_at)';

const listSavedJobs = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('saved_jobs')
    .select(SAVED_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  handleSupabaseError(error, 'Failed to list saved jobs');
  return data || [];
};

const saveJob = async (userId, jobId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('saved_jobs')
    .upsert({ user_id: userId, job_id: jobId }, { onConflict: 'user_id,job_id' })
    .select(SAVED_SELECT)
    .single();
  handleSupabaseError(error, 'Failed to save job');
  return data;
};

const unsaveJob = async (userId, jobId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('saved_jobs')
    .delete()
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .select(SAVED_SELECT)
    .maybeSingle();
  handleSupabaseError(error, 'Failed to remove saved job');
  return data;
};

module.exports = { listSavedJobs, saveJob, unsaveJob };
