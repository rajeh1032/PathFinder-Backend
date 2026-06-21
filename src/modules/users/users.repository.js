const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

const USER_SELECT = `
  id,
  name,
  email,
  is_active,
  created_at,
  last_login_at,
  last_active_at,
  role:roles (
    id,
    name
  )
`;

const PROFILE_SELECT = `
  id,
  user_id,
  university,
  major,
  location,
  headline,
  bio,
  avatar_url,
  education_level (
    id,
    education_level
  ),
  experience_year (
    id,
    experience_level
  ),
  current_status (
    id,
    current_status
  ),
  career_paths (
    id,
    title
  )
`;

const findRoleIdByName = async (roleName, client = ensureSupabase()) => {
  const { data: role, error } = await client
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  return role?.id || null;
};

const findUserById = async (userId) => {
  const client = ensureSupabase();

  const { data: user, error: userError } = await client
    .from('users')
    .select(USER_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw new AppError(userError.message, 500);
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw new AppError(profileError.message, 500);
  }

  return {
    ...user,
    profile,
  };
};

const updateUserById = async (userId, updates) => {
  const client = ensureSupabase();

  const { data: user, error } = await client
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  if (!user) {
    return null;
  }

  return findUserById(user.id);
};

const findAllUsers = async ({
  page = 1,
  limit = 20,
  search = '',
  role = '',
  status = '',
} = {}) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let usersQuery = client
    .from('users')
    .select(USER_SELECT, { count: 'exact' });

  if (search) {
    const safeSearch = search.replace(/[,()]/g, '').trim();
    usersQuery = usersQuery.or(
      `name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`,
    );
  }

  if (status === 'active') {
    usersQuery = usersQuery.eq('is_active', true);
  }

  if (status === 'inactive') {
    usersQuery = usersQuery.eq('is_active', false);
  }

  if (role) {
    const roleId = await findRoleIdByName(role, client);

    if (!roleId) {
      return { users: [], totalItems: 0 };
    }

    usersQuery = usersQuery.eq('role_id', roleId);
  }

  const { data: users, error: usersError, count } = await usersQuery
    .order('created_at', { ascending: false })
    .range(from, to);

  if (usersError) {
    throw new AppError(usersError.message, 500);
  }

  if (!users || users.length === 0) {
    return { users: [], totalItems: count || 0 };
  }

  const userIds = users.map((user) => user.id);

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select(PROFILE_SELECT)
    .in('user_id', userIds);

  if (profilesError) {
    throw new AppError(profilesError.message, 500);
  }

  const profilesByUserId = new Map(
    (profiles || []).map((profile) => [profile.user_id, profile]),
  );

  return {
    users: users.map((user) => ({
      ...user,
      profile: profilesByUserId.get(user.id) || null,
    })),
    totalItems: count || 0,
  };
};


const countForUser = async (client, table, userId, column = 'user_id') => {
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, userId);

  if (error) {
    throw new AppError(`Failed to count ${table}: ${error.message}`, 500);
  }

  return count || 0;
};

const getUserStats = async (userId) => {
  const client = ensureSupabase();

  const { data: cvRows, error: cvError } = await client
    .from('cvs')
    .select('id')
    .eq('user_id', userId);

  if (cvError) {
    throw new AppError(`Failed to read cvs: ${cvError.message}`, 500);
  }

  const cvIds = (cvRows || []).map((row) => row.id);

  let cvAnalysesCount = 0;

  if (cvIds.length > 0) {
    const { count, error } = await client
      .from('cv_analyses')
      .select('id', { count: 'exact', head: true })
      .in('cv_id', cvIds);

    if (error) {
      throw new AppError(`Failed to count cv_analyses: ${error.message}`, 500);
    }

    cvAnalysesCount = count || 0;
  }

  const { data: aiRows, error: aiError } = await client
    .from('ai_logs')
    .select('tokens_used, cost')
    .eq('user_id', userId);

  if (aiError) {
    throw new AppError(`Failed to read ai_logs: ${aiError.message}`, 500);
  }

  const aiUsage = (aiRows || []).reduce(
    (totals, row) => {
      totals.tokensUsed += Number(row.tokens_used) || 0;
      totals.cost += Number(row.cost) || 0;
      totals.calls += 1;
      return totals;
    },
    { tokensUsed: 0, cost: 0, calls: 0 },
  );

  const [
    skills,
    roadmaps,
    jobMatches,
    interviews,
    coverLetters,
    chatSessions,
  ] = await Promise.all([
    countForUser(client, 'user_skills', userId),
    countForUser(client, 'roadmaps', userId),
    countForUser(client, 'job_matches', userId),
    countForUser(client, 'interview_sessions', userId),
    countForUser(client, 'cover_letters', userId),
    countForUser(client, 'chat_sessions', userId),
  ]);

  return {
    counts: {
      skills,
      cvs: cvIds.length,
      cvAnalyses: cvAnalysesCount,
      roadmaps,
      jobMatches,
      interviews,
      coverLetters,
      chatSessions,
    },
    aiUsage: {
      tokensUsed: aiUsage.tokensUsed,
      cost: Number(aiUsage.cost.toFixed(2)),
      calls: aiUsage.calls,
    },
  };
};
module.exports = {
  findAllUsers,
  getUserStats,
  findRoleIdByName,
  findUserById,
  updateUserById,
};

