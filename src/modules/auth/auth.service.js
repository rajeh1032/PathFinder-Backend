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

const createUser = async (userData) => {
  const client = ensureSupabase();
  //TODO: check email uniqueness

  const { data: existingUser, error: fetchError } = await client
    .from('users')
    .select('id')
    .eq('email', userData.email)
    .maybeSingle();

  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  //TODO: hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12); // Replace with actual hashing logic

  //TODO: create user in database
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
      role_id: '506e5db9-9f35-4b76-9cca-cc08fa9e420a',
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
    userData.experienceYear,
    'experience year',
  );
  const currentStatusId = await getLookupId(
    client,
    'current_status',
    'current_status',
    userData.currentStatus,
    'current status',
  );

  const careerPathId = await getLookupId(
    client,
    'career_paths',
    'title',
    userData.targetCareer,
    'Target Path'
  )

  const { data: userProfile, error: profileError } = await client
    .from('profiles')
    .insert({
      user_id: newUser.id,
      education_level_id: educationLevelId,
      experience_year_id: experienceYearId,
      current_status_id: currentStatusId,
      target_career_id:careerPathId,
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

  //TODO: Generate access token for the user
  const accessToken = generateToken({
    userId: newUser.id,
    email: newUser.email,
    role: 'user',
  });

  //TODO: Genereate refresh token for the user
  const refreshToken = generateToken(
    { userId: newUser.id, email: newUser.email, role: 'user' },
    '7d',
  );

  //TODO: Return user data and tokens
  return {
    id: newUser.id,
    email: newUser.email,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (email, password) => {
  const client = ensureSupabase();

  //TODO: find user by email
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

  //TODO: verfiy password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  //TODO: check user is active status
  if (!user.is_active) {
    throw new AppError('User is not active', 401);
  }

  //TODO: Update last login and last active timestamps
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

  //TODO: Genereate access token and refresh token for the user
  const accessToken = await generateToken({
    userId: user.id,
    email: user.email,
    role: 'user',
  });

  const refreshToken = await generateToken(
    { userId: user.id, email: user.email, role: 'user' },
    '7d',
  );

  // TODO: Return user data and tokens
  return { user: updatedUser, accessToken, refreshToken };
};

module.exports = {
  createUser,
  loginUser,
};
