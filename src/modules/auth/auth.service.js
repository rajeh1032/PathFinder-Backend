const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../common/utils/token.js');

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

const getLookupId = async (client, table, column, value, label) => {
  const { data, error } = await client
    .from(table)
    .select('id')
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  if (!data) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return data.id;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

const createUser = async (userData) => {
  const client = ensureSupabase();

  const { data: existingUser } = await client
    .from('users')
    .select('id')
    .eq('email', userData.email)
    .maybeSingle();

  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(userData.password, 12);
  const roleID = await getLookupId(
    client,
    'roles',
    'name',
    userData.role || 'user',
    'user role',
  );

  const { data: newUser, error: insertError } = await client
    .from('users')
    .insert({
      email: userData.email,
      password_hash: hashedPassword,
      name: userData.name || '',
      created_at: new Date(),
      updated_at: new Date(),
      last_active_at: new Date(),
      last_login_at: new Date(),
      is_active: true,
      role_id: roleID || '506e5db9-9f35-4b76-9cca-cc08fa9e420a',
    })
    .select('*')
    .single();

  if (insertError || !newUser) {
    throw new AppError(insertError?.message || 'Failed to create user', 500);
  }

  const educationLevelId = await getLookupId(
    client,
    'education_level',
    'education_level',
    userData.educationLevel,
    'education level',
  );
  const experienceYearId = await getLookupId(
    client,
    'experience_year',
    'experience_level',
    userData.experienceYear.replace(/\s+/g, ''),
    'experience year',
  );
  const currentStatusId = await getLookupId(
    client,
    'current_status',
    'current_status',
    userData.currentStatus.toLowerCase(),
    'current status',
  );
  const careerPathId = await getLookupId(
    client,
    'career_paths',
    'title',
    userData.targetCareer.trim(),
    'Target Path',
  );

  const { data: userProfile, error: profileError } = await client
    .from('profiles')
    .insert({
      user_id: newUser.id,
      education_level_id: educationLevelId,
      experience_year_id: experienceYearId,
      current_status_id: currentStatusId,
      target_career_id: careerPathId,
      university: userData.university || '',
      major: userData.major || '',
      location: userData.location || '',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .select('*')
    .single();

  if (profileError || !userProfile) {
    throw new AppError(
      profileError?.message || 'Failed to create user profile',
      500,
    );
  }

  const accessToken = generateToken({
    userId: newUser.id,
    email: newUser.email,
    role: 'user',
  });
  const refreshToken = generateToken(
    { userId: newUser.id, email: newUser.email, role: 'user' },
    '7d',
  );

  return {
    user: sanitizeUser(newUser),
    accessToken,
    refreshToken,
  };
};

const loginUser = async (email, password) => {
  const client = ensureSupabase();

  const { data: user, error: fetchError } = await client
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    throw new AppError(fetchError.message, 500);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_active) {
    throw new AppError('User is not active', 401);
  }

  const { data: updatedUser, error: updateError } = await client
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('*')
    .single();

  if (updateError || !updatedUser) {
    throw new AppError(
      updateError?.message || 'Failed to update user login time',
      500,
    );
  }

  const { data: role, error } = await client
    .from('roles')
    .select('name')
    .eq('id', user.role_id)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500);
  }

  const accessToken = await generateToken({
    userId: user.id,
    email: user.email,
    role: role?.name || 'user',
  });

  const refreshToken = await generateToken(
    { userId: user.id, email: user.email, role: role?.name || 'user' },
    '7d',
  );

  // TODO: Return user data and tokens
  return {accessToken, refreshToken };
};

const getMe = async (userId) => {
  const client = ensureSupabase();

  const { data: user, error: userFetchError } = await client
    .from('users')
    .select('name,email,is_active,created_at')
    .eq('id', userId)
    .maybeSingle();

  if (userFetchError) {
    throw new AppError(userFetchError.message, 500);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { data: profile, error } = await client
    .from('profiles')
    .select(`
      university,
      major,
      location,
      headline,
      bio,
      avatar_url,
      education_level(id,education_level),
      experience_year(id,experience_level),
      current_status(id,current_status),
      career_paths(id,title)
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new AppError(error.message, 500);
  }

  user.profile = profile;
  return user;
};

const getCurrentUser = async (userId) => {
  const client = ensureSupabase();

  const { data: user, error: userError } = await client
    .from('users')
    .select('id,name,email,role_id,is_active,last_login_at,last_active_at,created_at,updated_at,roles(name)')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw new AppError(userError.message, 500);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select(`
      id,
      user_id,
      university,
      major,
      location,
      headline,
      bio,
      avatar_url,
      target_career_id,
      career_paths(id,title,category,description),
      education_level(id,education_level),
      experience_year(id,experience_level),
      current_status(id,current_status)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw new AppError(profileError.message, 500);
  }

  const { data: skills, error: skillsError } = await client
    .from('user_skills')
    .select('id,level,created_at,skills(id,name,category,level)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (skillsError) {
    throw new AppError(skillsError.message, 500);
  }

  return {
    user: {
      ...sanitizeUser(user),
      role: user.roles?.name || 'user',
      roles: undefined,
    },
    profile: profile || null,
    skills: (skills || [])
      .map((row) => ({
        id: row.skills?.id,
        userSkillId: row.id,
        name: row.skills?.name,
        category: row.skills?.category || 'General',
        level: row.level || row.skills?.level || null,
        created_at: row.created_at,
      }))
      .filter((skill) => skill.name),
  };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const client = ensureSupabase();

  const { data: user, error: fetchError } = await client
    .from('users')
    .select('id,password_hash')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    throw new AppError('User not found', 404);
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);

  if (isSamePassword) {
    throw new AppError(
      'New password must be different from current password',
      400,
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const { error: updateError } = await client
    .from('users')
    .update({
      password_hash: hashedPassword,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    throw new AppError(updateError.message, 500);
  }

  return {
    message: 'Password changed successfully',
  };
};

module.exports = {
  createUser,
  loginUser,
  getMe,
  getCurrentUser,
  changePassword,
  sanitizeUser,
};
