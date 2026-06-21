const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

// Count rows of a table without transferring the rows themselves.
const countTable = async (table, applyFilters) => {
  const client = ensureSupabase();
  let query = client.from(table).select('id', { count: 'exact', head: true });

  if (typeof applyFilters === 'function') {
    query = applyFilters(query);
  }

  const { count, error } = await query;

  if (error) {
    throw new AppError(`Failed to count ${table}: ${error.message}`, 500);
  }

  return count || 0;
};

// Sum AI token usage and estimated cost from ai_logs.
const getAiTotals = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('ai_logs')
    .select('tokens_used, cost');

  if (error) {
    throw new AppError(`Failed to read ai_logs: ${error.message}`, 500);
  }

  return (data || []).reduce(
    (totals, row) => {
      totals.tokensUsed += Number(row.tokens_used) || 0;
      totals.cost += Number(row.cost) || 0;
      return totals;
    },
    { tokensUsed: 0, cost: 0 },
  );
};

// Most selected career paths (profiles.target_career_id -> career_paths.title).
const getTopCareerPaths = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('target_career_id, career_paths:target_career_id (title)')
    .not('target_career_id', 'is', null);

  if (error) {
    throw new AppError(`Failed to read profiles: ${error.message}`, 500);
  }

  return (data || []).map((row) => ({
    id: row.target_career_id,
    name: row.career_paths?.title || 'Unknown',
  }));
};

// Most requested skills (user_skills.skill_id -> skills.name).
const getTopSkills = async () => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('user_skills')
    .select('skill_id, skills:skill_id (name)');

  if (error) {
    throw new AppError(`Failed to read user_skills: ${error.message}`, 500);
  }

  return (data || []).map((row) => ({
    id: row.skill_id,
    name: row.skills?.name || 'Unknown',
  }));
};

// Fetch created_at (and optional extra columns) for rows newer than sinceIso.
const getCreatedAtSeries = async (table, sinceIso, extraColumns = '') => {
  const client = ensureSupabase();
  const columns = extraColumns
    ? `created_at, ${extraColumns}`
    : 'created_at';
  const { data, error } = await client
    .from(table)
    .select(columns)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError(`Failed to read ${table}: ${error.message}`, 500);
  }

  return data || [];
};

module.exports = {
  countTable,
  getAiTotals,
  getTopCareerPaths,
  getTopSkills,
  getCreatedAtSeries,
};
