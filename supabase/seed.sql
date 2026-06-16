-- PathFinder AI mock data.
-- Safe to run more than once. Password for mock Node auth users: Pathfinder123!

begin;

insert into public.users (id, name, email, password_hash, role_id, is_active, last_login_at, last_active_at)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'Admin Mentor',
    'admin@pathfinder.ai',
    extensions.crypt('Pathfinder123!', extensions.gen_salt('bf')),
    (select id from public.roles where name = 'admin'),
    true,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Nour Hassan',
    'nour@example.com',
    extensions.crypt('Pathfinder123!', extensions.gen_salt('bf')),
    (select id from public.roles where name = 'user'),
    true,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Omar Ali',
    'omar@example.com',
    extensions.crypt('Pathfinder123!', extensions.gen_salt('bf')),
    (select id from public.roles where name = 'user'),
    true,
    now(),
    now()
  )
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.career_paths (id, title, description, category, average_salary, difficulty_level, is_active, created_by, updated_by)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Frontend Developer',
    'Build responsive user interfaces with modern web technologies.',
    'Software Development',
    '6000-18000 EGP',
    'Beginner',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Backend Developer',
    'Design APIs, databases, authentication, and server-side workflows.',
    'Software Development',
    '8000-22000 EGP',
    'Intermediate',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Data Analyst',
    'Analyze data, build dashboards, and communicate business insights.',
    'Data',
    '7000-20000 EGP',
    'Beginner',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  average_salary = excluded.average_salary,
  difficulty_level = excluded.difficulty_level,
  updated_at = now();

insert into public.education_level (id, education_level)
values
  ('11000000-0000-0000-0000-000000000001', 'High school'),
  ('11000000-0000-0000-0000-000000000002', 'Associate''s'),
  ('11000000-0000-0000-0000-000000000003', 'Bachelor''s'),
  ('11000000-0000-0000-0000-000000000004', 'Master''s'),
  ('11000000-0000-0000-0000-000000000005', 'PhD'),
  ('11000000-0000-0000-0000-000000000006', 'Bootcamp/self-taught')
on conflict (education_level) do nothing;

insert into public.experience_year (id, experience_level)
values
  ('12000000-0000-0000-0000-000000000001', '0-1years'),
  ('12000000-0000-0000-0000-000000000002', '1-2years'),
  ('12000000-0000-0000-0000-000000000003', '2-4years'),
  ('12000000-0000-0000-0000-000000000004', '4-7years'),
  ('12000000-0000-0000-0000-000000000005', '+7years')
on conflict (experience_level) do nothing;

insert into public.current_status (id, current_status)
values
  ('13000000-0000-0000-0000-000000000001', 'actively looking'),
  ('13000000-0000-0000-0000-000000000002', 'open to offers'),
  ('13000000-0000-0000-0000-000000000003', 'employed'),
  ('13000000-0000-0000-0000-000000000004', 'open to shift'),
  ('13000000-0000-0000-0000-000000000005', 'student/fresh grad')
on conflict (current_status) do nothing;

insert into public.profiles (
  id,
  user_id,
  education_level_id,
  university,
  major,
  current_status_id,
  experience_year_id,
  target_career_id,
  location,
  headline,
  bio,
  avatar_url,
  avatar_storage_path
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '11000000-0000-0000-0000-000000000003',
    'Cairo University',
    'Computer Science',
    '13000000-0000-0000-0000-000000000005',
    '12000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Cairo, Egypt',
    'Junior Frontend Developer',
    'Computer science graduate focused on React, UI quality, and building practical portfolio projects.',
    'https://example.com/avatars/nour.png',
    'mock/avatars/nour.png'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '11000000-0000-0000-0000-000000000006',
    'ITI',
    'Full Stack Development',
    '13000000-0000-0000-0000-000000000004',
    '12000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'Alexandria, Egypt',
    'Backend Developer in Training',
    'ITI graduate building strong fundamentals in Node.js, PostgreSQL, and API design.',
    'https://example.com/avatars/omar.png',
    'mock/avatars/omar.png'
  )
on conflict (user_id) do update set
  education_level_id = excluded.education_level_id,
  university = excluded.university,
  major = excluded.major,
  current_status_id = excluded.current_status_id,
  experience_year_id = excluded.experience_year_id,
  target_career_id = excluded.target_career_id,
  location = excluded.location,
  headline = excluded.headline,
  bio = excluded.bio,
  avatar_url = excluded.avatar_url,
  avatar_storage_path = excluded.avatar_storage_path,
  updated_at = now();

insert into public.profile_experiences (
  id,
  profile_id,
  job_title,
  company_name,
  employment_type,
  location,
  start_date,
  end_date,
  is_current,
  description,
  skills,
  display_order
)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Frontend Intern',
    'BrightApps',
    'Internship',
    'Cairo, Egypt',
    '2025-07-01',
    '2025-10-01',
    false,
    'Built reusable React components and improved responsive UI states.',
    '["React","JavaScript","CSS"]',
    1
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'Backend Trainee',
    'ITI Graduation Project',
    'Training',
    'Alexandria, Egypt',
    '2026-01-01',
    null,
    true,
    'Designing Express APIs, Supabase schemas, and service-layer workflows.',
    '["Node.js","PostgreSQL","REST APIs"]',
    1
  )
on conflict (id) do update set
  job_title = excluded.job_title,
  company_name = excluded.company_name,
  employment_type = excluded.employment_type,
  location = excluded.location,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  is_current = excluded.is_current,
  description = excluded.description,
  skills = excluded.skills,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.profile_education (
  id,
  profile_id,
  institution,
  degree,
  field_of_study,
  education_level_id,
  start_date,
  end_date,
  is_current,
  grade,
  description,
  display_order
)
values
  (
    '42000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Cairo University',
    'Bachelor''s',
    'Computer Science',
    '11000000-0000-0000-0000-000000000003',
    '2021-09-01',
    '2025-06-30',
    false,
    'Very Good',
    'Focused on frontend projects and software engineering basics.',
    1
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'Information Technology Institute',
    'Bootcamp',
    'Full Stack Development',
    '11000000-0000-0000-0000-000000000006',
    '2025-10-01',
    null,
    true,
    null,
    'Intensive full-stack training with Node.js, React, and database design.',
    1
  )
on conflict (id) do update set
  institution = excluded.institution,
  degree = excluded.degree,
  field_of_study = excluded.field_of_study,
  education_level_id = excluded.education_level_id,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  is_current = excluded.is_current,
  grade = excluded.grade,
  description = excluded.description,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.user_preferences (
  id,
  user_id,
  preferred_job_types,
  preferred_locations,
  remote_preference,
  salary_expectation_min,
  salary_expectation_max,
  salary_currency,
  preferred_career_path_ids,
  learning_goal,
  metadata
)
values
  (
    '43000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '["Full-time","Internship"]',
    '["Cairo","Remote"]',
    'hybrid',
    8000,
    14000,
    'EGP',
    array['30000000-0000-0000-0000-000000000001']::uuid[],
    'Become job-ready for junior frontend roles in 3 months.',
    '{"preferred_language":"en","weekly_learning_hours":8}'
  ),
  (
    '43000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '["Internship","Remote"]',
    '["Alexandria","Remote"]',
    'remote',
    6000,
    12000,
    'EGP',
    array['30000000-0000-0000-0000-000000000002']::uuid[],
    'Build a backend portfolio and apply for internships.',
    '{"preferred_language":"en","weekly_learning_hours":10}'
  )
on conflict (user_id) do update set
  preferred_job_types = excluded.preferred_job_types,
  preferred_locations = excluded.preferred_locations,
  remote_preference = excluded.remote_preference,
  salary_expectation_min = excluded.salary_expectation_min,
  salary_expectation_max = excluded.salary_expectation_max,
  salary_currency = excluded.salary_currency,
  preferred_career_path_ids = excluded.preferred_career_path_ids,
  learning_goal = excluded.learning_goal,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.user_achievements (
  id,
  user_id,
  title,
  description,
  achievement_type,
  issuer,
  issued_at,
  certificate_url,
  metadata,
  display_order
)
values
  (
    '44000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'React Portfolio Completed',
    'Completed a frontend portfolio with responsive components and API integration.',
    'project',
    'PathFinder Academy',
    '2026-02-01',
    'https://example.com/certificates/react-portfolio',
    '{"skills":["React","CSS","REST APIs"]}',
    1
  ),
  (
    '44000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    'Node API Milestone',
    'Built a CRUD API with validation, errors, and PostgreSQL persistence.',
    'project',
    'ITI',
    '2026-02-15',
    'https://example.com/certificates/node-api',
    '{"skills":["Node.js","PostgreSQL","REST APIs"]}',
    1
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  achievement_type = excluded.achievement_type,
  issuer = excluded.issuer,
  issued_at = excluded.issued_at,
  certificate_url = excluded.certificate_url,
  metadata = excluded.metadata,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.skills (id, name, category, level, aliases, is_active, created_by, updated_by)
values
  ('50000000-0000-0000-0000-000000000001', 'HTML', 'Frontend', 'Beginner', array['html5'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', 'CSS', 'Frontend', 'Beginner', array['css3'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', 'JavaScript', 'Frontend', 'Intermediate', array['js','ecmascript'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000004', 'React', 'Frontend', 'Intermediate', array['react.js','reactjs'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000005', 'Node.js', 'Backend', 'Intermediate', array['node','nodejs'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000006', 'PostgreSQL', 'Database', 'Intermediate', array['postgres','sql'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000007', 'REST APIs', 'Backend', 'Intermediate', array['rest','api'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000008', 'Data Analysis', 'Data', 'Beginner', array['analytics','analysis'], true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  level = excluded.level,
  aliases = excluded.aliases,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.user_skills (id, user_id, skill_id, level)
values
  ('51000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Intermediate'),
  ('51000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'Intermediate'),
  ('51000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', 'Beginner'),
  ('51000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005', 'Beginner'),
  ('51000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006', 'Beginner')
on conflict (user_id, skill_id) do update set level = excluded.level;

insert into public.career_path_skills (id, career_path_id, skill_id, required_level, priority)
values
  ('52000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Beginner', 1),
  ('52000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Beginner', 2),
  ('52000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'Intermediate', 3),
  ('52000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', 'Intermediate', 1),
  ('52000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000006', 'Intermediate', 2),
  ('52000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000007', 'Intermediate', 3),
  ('52000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000008', 'Beginner', 1),
  ('52000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006', 'Beginner', 2)
on conflict (career_path_id, skill_id) do update set
  required_level = excluded.required_level,
  priority = excluded.priority;

insert into public.course_categories (id, name, icon, display_order, is_active)
values
  ('14000000-0000-0000-0000-000000000001', 'Frontend', 'code-2', 1, true),
  ('14000000-0000-0000-0000-000000000002', 'Backend', 'server', 2, true),
  ('14000000-0000-0000-0000-000000000003', 'Database', 'database', 3, true),
  ('14000000-0000-0000-0000-000000000004', 'Data', 'bar-chart-3', 4, true)
on conflict (name) do update set
  icon = excluded.icon,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

insert into public.courses (
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
  category_id,
  learning_outcomes,
  price,
  currency,
  is_free,
  rating,
  reviews_count,
  enrollment_count,
  popularity_score,
  is_active,
  created_by,
  updated_by
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    'Modern React Basics',
    'Learn React fundamentals, components, props, state, hooks, and API integration.',
    'PathFinder Academy',
    'https://example.com/react-basics',
    'https://example.com/react.png',
    'https://example.com/react-video',
    'Beginner',
    '6 hours',
    'Frontend',
    '14000000-0000-0000-0000-000000000001',
    '["Build reusable React components","Use hooks for state and side effects","Fetch data from REST APIs"]',
    0,
    'USD',
    true,
    4.70,
    128,
    420,
    95,
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'Node.js API Foundations',
    'Create clean Express APIs with routing, validation, error handling, and PostgreSQL persistence.',
    'PathFinder Academy',
    'https://example.com/node-api',
    'https://example.com/node.png',
    'https://example.com/node-video',
    'Intermediate',
    '8 hours',
    'Backend',
    '14000000-0000-0000-0000-000000000002',
    '["Design REST endpoints","Validate requests","Connect APIs to PostgreSQL"]',
    19.99,
    'USD',
    false,
    4.60,
    94,
    260,
    88,
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    'SQL for Backend Developers',
    'Understand relational schema design, joins, indexes, constraints, and practical SQL queries.',
    'PathFinder Academy',
    'https://example.com/sql',
    'https://example.com/sql.png',
    'https://example.com/sql-video',
    'Beginner',
    '5 hours',
    'Database',
    '14000000-0000-0000-0000-000000000003',
    '["Model relational data","Write joins and aggregates","Use constraints safely"]',
    0,
    'USD',
    true,
    4.50,
    80,
    310,
    82,
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '60000000-0000-0000-0000-000000000004',
    'Data Analysis Starter Kit',
    'Start analyzing datasets, asking useful questions, and communicating insights.',
    'PathFinder Academy',
    'https://example.com/data-analysis',
    'https://example.com/data.png',
    'https://example.com/data-video',
    'Beginner',
    '7 hours',
    'Data',
    '14000000-0000-0000-0000-000000000004',
    '["Clean basic datasets","Create summary metrics","Explain insights clearly"]',
    9.99,
    'USD',
    false,
    4.40,
    65,
    190,
    73,
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  provider = excluded.provider,
  url = excluded.url,
  thumbnail_url = excluded.thumbnail_url,
  video_url = excluded.video_url,
  level = excluded.level,
  duration = excluded.duration,
  category = excluded.category,
  category_id = excluded.category_id,
  learning_outcomes = excluded.learning_outcomes,
  price = excluded.price,
  currency = excluded.currency,
  is_free = excluded.is_free,
  rating = excluded.rating,
  reviews_count = excluded.reviews_count,
  enrollment_count = excluded.enrollment_count,
  popularity_score = excluded.popularity_score,
  updated_at = now();

insert into public.course_skills (id, course_id, skill_id)
values
  ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004'),
  ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003'),
  ('61000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005'),
  ('61000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000007'),
  ('61000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006'),
  ('61000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000008')
on conflict (course_id, skill_id) do nothing;

insert into public.saved_courses (id, user_id, course_id)
values
  ('62000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003'),
  ('62000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002')
on conflict (user_id, course_id) do nothing;

insert into public.course_enrollments (id, user_id, course_id, status, progress, enrolled_at, completed_at)
values
  ('63000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'active', 45, now() - interval '12 days', null),
  ('63000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'completed', 100, now() - interval '30 days', now() - interval '5 days'),
  ('63000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'active', 25, now() - interval '8 days', null)
on conflict (user_id, course_id) do update set
  status = excluded.status,
  progress = excluded.progress,
  enrolled_at = excluded.enrolled_at,
  completed_at = excluded.completed_at,
  updated_at = now();

insert into public.cvs (id, user_id, file_url, storage_path, original_name, mime_type, size_bytes, parsed_text, status)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'https://example.com/cvs/nour-cv.pdf', 'mock/nour-cv.pdf', 'nour-cv.pdf', 'application/pdf', 245000, 'Frontend graduate with HTML, CSS, JavaScript and React projects.', 'completed'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'https://example.com/cvs/omar-cv.pdf', 'mock/omar-cv.pdf', 'omar-cv.pdf', 'application/pdf', 210000, 'Career shifter learning Node.js, PostgreSQL, and REST API development.', 'completed')
on conflict (id) do update set
  parsed_text = excluded.parsed_text,
  status = excluded.status,
  updated_at = now();

insert into public.cv_skills (id, cv_id, skill_id, source)
values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'ai'),
  ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'ai'),
  ('71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'ai'),
  ('71000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', 'ai'),
  ('71000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000006', 'ai')
on conflict (cv_id, skill_id) do update set source = excluded.source;

insert into public.cv_analyses (id, cv_id, score, model, summary, strengths, weaknesses, suggestions, detected_skills, extracted, generated_by_type, status, reviewed_by_admin_id, reviewed_at)
values
  ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 78, 'gpt-4.1-mini', 'Good frontend foundation with room to improve TypeScript and testing.', '["HTML/CSS foundation","React projects","Clear education section"]', '["No TypeScript","Few measurable achievements"]', '["Add TypeScript project","Add project metrics","Add testing basics"]', '["HTML","CSS","JavaScript","React"]', '{"education":"Computer Science","projects":2}', 'ai', 'reviewed', '10000000-0000-0000-0000-000000000001', now()),
  ('72000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 71, 'gpt-4.1-mini', 'Promising backend beginner profile needing stronger API projects.', '["Node.js basics","SQL interest","Career motivation"]', '["Limited production projects","Needs auth/security practice"]', '["Build REST API","Add PostgreSQL schema project","Learn authentication"]', '["Node.js","PostgreSQL","REST APIs"]', '{"education":"ITI","projects":1}', 'ai', 'completed', null, null)
on conflict (cv_id) do update set
  score = excluded.score,
  summary = excluded.summary,
  strengths = excluded.strengths,
  weaknesses = excluded.weaknesses,
  suggestions = excluded.suggestions,
  detected_skills = excluded.detected_skills,
  extracted = excluded.extracted,
  status = excluded.status,
  reviewed_by_admin_id = excluded.reviewed_by_admin_id,
  reviewed_at = excluded.reviewed_at;

insert into public.roadmaps (id, user_id, career_path_id, title, description, progress, status, generated_by_type)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Frontend Job Ready Roadmap', 'Move from basics to a job-ready frontend portfolio.', 35, 'active', 'ai'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Backend Foundations Roadmap', 'Build API, database, and authentication fundamentals.', 20, 'active', 'ai')
on conflict (id) do update set
  progress = excluded.progress,
  status = excluded.status,
  updated_at = now();

insert into public.roadmap_steps (id, roadmap_id, skill_id, title, description, step_order, progress, is_completed, completed_at)
values
  ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'Build React portfolio', 'Create two React projects with API integration.', 1, 60, false, null),
  ('81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'Deepen JavaScript', 'Practice async JavaScript and ES modules.', 2, 40, false, null),
  ('81000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', 'Create Node.js API', 'Build CRUD APIs with validation and errors.', 1, 30, false, null),
  ('81000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000006', 'Design PostgreSQL schema', 'Model relational data and write joins.', 2, 10, false, null)
on conflict (roadmap_id, step_order) do update set
  title = excluded.title,
  description = excluded.description,
  progress = excluded.progress,
  is_completed = excluded.is_completed,
  completed_at = excluded.completed_at;

insert into public.jobs (
  id,
  title,
  company,
  location,
  description,
  source,
  source_type,
  external_id,
  apply_url,
  required_skills,
  employment_type,
  salary_range,
  level,
  category,
  thumbnail_url,
  company_logo_url,
  certificate_provider,
  duration,
  is_active,
  status,
  created_by,
  updated_by,
  posted_at
)
values
  ('90000000-0000-0000-0000-000000000001', 'Junior Frontend Developer', 'BrightApps', 'Cairo, Egypt', 'Build React interfaces and integrate REST APIs.', 'manual', 'manual', 'manual-frontend-1', 'https://example.com/jobs/frontend', '["HTML","CSS","JavaScript","React","REST APIs"]', 'Full-time', '8000-12000 EGP', 'Junior', 'Frontend', 'https://example.com/jobs/frontend-thumb.png', 'https://example.com/logos/brightapps.png', 'BrightApps Academy', '3 months', true, 'published', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now()),
  ('90000000-0000-0000-0000-000000000002', 'Backend Node.js Intern', 'ApiWorks', 'Remote', 'Support API development using Node.js and PostgreSQL.', 'Remotive', 'api', 'remote-backend-1', 'https://example.com/jobs/backend', '["Node.js","PostgreSQL","REST APIs"]', 'Internship', 'Paid internship', 'Entry', 'Backend', 'https://example.com/jobs/backend-thumb.png', 'https://example.com/logos/apiworks.png', 'ApiWorks Labs', '8 weeks', true, 'published', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now()),
  ('90000000-0000-0000-0000-000000000003', 'Junior Data Analyst', 'DataNile', 'Giza, Egypt', 'Analyze datasets and build dashboards for business teams.', 'Adzuna', 'api', 'adzuna-data-1', 'https://example.com/jobs/data', '["Data Analysis","PostgreSQL"]', 'Full-time', '9000-14000 EGP', 'Junior', 'Data', 'https://example.com/jobs/data-thumb.png', 'https://example.com/logos/datanile.png', 'DataNile Academy', '10 weeks', true, 'published', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now())
on conflict (id) do update set
  title = excluded.title,
  company = excluded.company,
  description = excluded.description,
  required_skills = excluded.required_skills,
  level = excluded.level,
  category = excluded.category,
  thumbnail_url = excluded.thumbnail_url,
  company_logo_url = excluded.company_logo_url,
  certificate_provider = excluded.certificate_provider,
  duration = excluded.duration,
  status = excluded.status,
  updated_at = now();

insert into public.saved_jobs (id, user_id, job_id)
values
  ('91000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001'),
  ('91000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002')
on conflict (user_id, job_id) do nothing;

insert into public.applied_jobs (id, user_id, job_id, status, applied_at, next_step, next_step_at, notes)
values
  ('92000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'interviewing', now(), 'Technical interview', now() + interval '3 days', 'Prepare React API integration examples.'),
  ('92000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002', 'applied', now(), 'Follow up with recruiter', now() + interval '5 days', 'Attach updated backend portfolio link.')
on conflict (user_id, job_id) do update set
  status = excluded.status,
  next_step = excluded.next_step,
  next_step_at = excluded.next_step_at,
  notes = excluded.notes,
  updated_at = now();

insert into public.job_matches (id, user_id, job_id, cv_id, match_percentage, matched_skills, missing_skills, ai_reason, generated_by_type, status)
values
  ('93000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 82, '["HTML","CSS","JavaScript","React"]', '["REST APIs","TypeScript"]', 'Strong frontend match. Add REST API practice to improve readiness.', 'ai', 'generated'),
  ('93000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 76, '["Node.js","PostgreSQL"]', '["Authentication","Testing"]', 'Good backend internship fit. Needs more complete API portfolio.', 'ai', 'generated'),
  ('93000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 42, '["PostgreSQL"]', '["Data Analysis","Dashboarding"]', 'Partial match only. Better suited to frontend jobs right now.', 'ai', 'generated')
on conflict (id) do update set
  match_percentage = excluded.match_percentage,
  matched_skills = excluded.matched_skills,
  missing_skills = excluded.missing_skills,
  ai_reason = excluded.ai_reason,
  status = excluded.status;

insert into public.chat_sessions (id, user_id, title, status)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Frontend career advice', 'active'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Backend roadmap questions', 'active')
on conflict (id) do update set title = excluded.title, status = excluded.status, updated_at = now();

insert into public.chat_messages (id, session_id, sender, message, tokens)
values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'user', 'What should I learn after JavaScript?', 9),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'assistant', 'Learn React, REST API integration, Git workflow, and TypeScript basics.', 18),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'user', 'How can I become backend ready?', 8),
  ('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'assistant', 'Build a Node.js API with PostgreSQL, validation, authentication, and tests.', 17)
on conflict (id) do update set message = excluded.message, tokens = excluded.tokens;

insert into public.interview_sessions (
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
  recording_url
)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    'completed',
    'technical',
    2,
    now() - interval '2 days',
    now() - interval '2 days' + interval '35 minutes',
    74,
    '{"technical":76,"communication":72}',
    'Strong React knowledge',
    '{"summary":"Overall good performance","strengths":["Strong React knowledge","Good problem solving"],"areas_for_improvement":["Explain API error handling more clearly","Use more structured examples"]}'::jsonb,
    null
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000002',
    'in_progress',
    'mock_hr',
    1,
    now() - interval '1 day',
    null,
    null,
    '{}',
    null,
    '{}'::jsonb,
    null
  )
on conflict (id) do update set
  status = excluded.status,
  interview_type = excluded.interview_type,
  total_questions = excluded.total_questions,
  started_at = excluded.started_at,
  completed_at = excluded.completed_at,
  overall_score = excluded.overall_score,
  score_breakdown = excluded.score_breakdown,
  quick_ai_insight = excluded.quick_ai_insight,
  feedback_text = excluded.feedback_text,
  updated_at = now();

insert into public.interview_questions (
  id,
  interview_session_id,
  question,
  question_order,
  user_answer,
  is_skipped,
  answer_type,
  answered_at,
  feedback,
  score,
  question_status,
  ai_suggestion,
  generated_by_type
)
values
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Explain how React state updates work.', 1, 'State updates are async and trigger re-rendering.', false, 'text', now() - interval '2 days' + interval '10 minutes', 'Correct direction, add batching details.', 75, 'passed', 'Review React state batching and render timing.', 'ai'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'How do you call a REST API from React?', 2, 'I use fetch inside useEffect and store data in state.', false, 'text', now() - interval '2 days' + interval '20 minutes', 'Good, mention loading and error states.', 78, 'passed', 'Practice loading, empty, and error state examples.', 'ai'),
  ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'What is middleware in Express?', 1, null, true, null, null, null, null, 'skipped', 'Prepare one middleware example before the next mock interview.', 'ai')
on conflict (id) do update set
  question_order = excluded.question_order,
  user_answer = excluded.user_answer,
  is_skipped = excluded.is_skipped,
  answer_type = excluded.answer_type,
  answered_at = excluded.answered_at,
  feedback = excluded.feedback,
  score = excluded.score,
  question_status = excluded.question_status,
  ai_suggestion = excluded.ai_suggestion;

insert into public.cover_letters (
  id,
  user_id,
  job_id,
  content,
  status,
  version,
  language,
  generated_by_type,
  title,
  score,
  tone,
  target_role,
  company_name,
  word_count,
  last_edited_at,
  exported_at
)
values
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'Dear BrightApps team, I am excited to apply for the Junior Frontend Developer role...', 'generated', 1, 'en', 'ai', 'BrightApps Frontend Cover Letter', 86, 'professional', 'Junior Frontend Developer', 'BrightApps', 142, null, now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002', 'Dear ApiWorks team, I am applying for the Backend Node.js Intern position...', 'edited', 2, 'en', 'ai', 'ApiWorks Backend Internship Cover Letter', 79, 'confident', 'Backend Node.js Intern', 'ApiWorks', 128, now() - interval '6 hours', null)
on conflict (id) do update set
  content = excluded.content,
  status = excluded.status,
  version = excluded.version,
  title = excluded.title,
  score = excluded.score,
  tone = excluded.tone,
  target_role = excluded.target_role,
  company_name = excluded.company_name,
  word_count = excluded.word_count,
  last_edited_at = excluded.last_edited_at,
  exported_at = excluded.exported_at,
  updated_at = now();

update public.applied_jobs
set cover_letter_id = 'c0000000-0000-0000-0000-000000000001'
where id = '92000000-0000-0000-0000-000000000001';

update public.applied_jobs
set cover_letter_id = 'c0000000-0000-0000-0000-000000000002'
where id = '92000000-0000-0000-0000-000000000002';

insert into public.cover_letter_versions (id, cover_letter_id, content, version, edited_by_user)
values
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Dear BrightApps team, I am excited to apply for the Junior Frontend Developer role...', 1, false),
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Dear ApiWorks team, I am applying for the Backend Node.js Intern position...', 1, false),
  ('c1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Dear ApiWorks team, I am applying for the Backend Node.js Intern position and can contribute with Node.js and PostgreSQL basics...', 2, true)
on conflict (cover_letter_id, version) do update set content = excluded.content, edited_by_user = excluded.edited_by_user;

insert into public.cover_letter_insights (id, cover_letter_id, type, message)
values
  ('c2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'strength', 'Strong match between React experience and the role requirements.'),
  ('c2000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'improvement', 'Add one measurable project impact to make the letter stronger.'),
  ('c2000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'improvement', 'Mention one backend API project with PostgreSQL details.')
on conflict (id) do update set
  type = excluded.type,
  message = excluded.message;

insert into public.ai_logs (id, user_id, feature, model, prompt, response, tokens_used, latency_ms, cost, status, error_message, request_payload, response_payload)
values
  ('d0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'cv_analysis', 'gpt-4.1-mini', 'Analyze Nour CV', 'Score: 78', 950, 1200, 0.004200, 'success', null, '{"cvId":"70000000-0000-0000-0000-000000000001"}', '{"score":78}'),
  ('d0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'cv_analysis', 'gpt-4.1-mini', 'Analyze Omar CV', 'Score: 71', 870, 1100, 0.003900, 'success', null, '{"cvId":"70000000-0000-0000-0000-000000000002"}', '{"score":71}'),
  ('d0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'job_match', 'gpt-4.1-mini', 'Explain frontend match', 'Strong frontend match.', 320, 600, 0.001200, 'success', null, '{"jobId":"90000000-0000-0000-0000-000000000001"}', '{"match":82}'),
  ('d0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'chat', 'gpt-4.1-mini', 'What next after JavaScript?', 'Learn React and REST APIs.', 210, 500, 0.000900, 'success', null, '{}', '{}'),
  ('d0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'cover_letter', 'gpt-4.1-mini', 'Generate cover letter', 'Dear ApiWorks team...', 540, 900, 0.002100, 'success', null, '{}', '{}')
on conflict (id) do update set status = excluded.status, response = excluded.response;

insert into public.rag_documents (id, title, type, source, content, storage_path, vector_id, index_status, index_error, is_active, uploaded_by)
values
  ('e0000000-0000-0000-0000-000000000001', 'Frontend Career Guide', 'general', 'manual', 'Frontend developers should learn HTML, CSS, JavaScript, React, API integration, Git, and TypeScript.', null, null, 'indexed', null, true, '10000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'Backend Career Guide', 'course_analysis', 'manual', 'Backend developers should learn Node.js, REST APIs, PostgreSQL, authentication, security, testing, and deployment.', null, null, 'indexed', null, true, '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set title = excluded.title, type = excluded.type, content = excluded.content, index_status = excluded.index_status, is_active = excluded.is_active, updated_at = now();

insert into public.rag_chunks (id, rag_document_id, content, chunk_index, token_count, vector_id, embedding, metadata)
values
  ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Frontend roadmap: HTML, CSS, JavaScript, React, APIs, Git, TypeScript.', 0, 16, null, null, '{"category":"frontend"}'),
  ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Backend roadmap: Node.js, REST APIs, PostgreSQL, authentication, testing.', 0, 14, null, null, '{"category":"backend"}'),
  ('e1000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'Backend portfolios should include schema design, validation, error handling, and deployment.', 1, 13, null, null, '{"category":"portfolio"}')
on conflict (rag_document_id, chunk_index) do update set content = excluded.content, token_count = excluded.token_count, metadata = excluded.metadata;

insert into public.api_sources (id, name, provider, base_url, type, schedule_cron, enabled, is_active, last_sync_at, created_by, updated_by)
values
  ('f0000000-0000-0000-0000-000000000001', 'Adzuna Egypt Jobs', 'Adzuna', 'https://api.adzuna.com/v1/api/jobs/eg/search/1', 'jobs', '0 6 * * *', true, true, now(), '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000002', 'JSearch RapidAPI', 'JSearch', 'https://jsearch.p.rapidapi.com/search', 'jobs', '0 8 * * *', true, true, now(), '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000003', 'Remotive Remote Jobs', 'Remotive', 'https://remotive.com/api/remote-jobs', 'jobs', '0 10 * * *', true, true, now(), '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set last_sync_at = excluded.last_sync_at, enabled = excluded.enabled, updated_at = now();

insert into public.api_sync_runs (id, api_source_id, started_at, finished_at, status, raw_response_count, jobs_added, jobs_updated, jobs_rejected, error_message)
values
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', now() - interval '1 hour', now() - interval '55 minutes', 'success', 40, 12, 5, 2, null),
  ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', now() - interval '2 hours', now() - interval '115 minutes', 'success', 25, 8, 3, 1, null),
  ('f1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', now() - interval '3 hours', now() - interval '170 minutes', 'failed', 0, 0, 0, 0, 'Mock timeout from provider')
on conflict (id) do update set status = excluded.status, jobs_added = excluded.jobs_added, error_message = excluded.error_message;

insert into public.system_settings (id, setting_key, setting_value, type, description, updated_by)
values
  ('f2000000-0000-0000-0000-000000000001', 'ai.default_model', '"gpt-4.1-mini"', 'string', 'Default OpenAI model for MVP AI features', '10000000-0000-0000-0000-000000000001'),
  ('f2000000-0000-0000-0000-000000000002', 'jobs.match_threshold', '65', 'number', 'Minimum match percentage considered recommended', '10000000-0000-0000-0000-000000000001'),
  ('f2000000-0000-0000-0000-000000000003', 'features.voice_coach_enabled', 'false', 'boolean', 'Voice coach feature flag for post-MVP', '10000000-0000-0000-0000-000000000001')
on conflict (setting_key) do update set
  setting_value = excluded.setting_value,
  type = excluded.type,
  description = excluded.description,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.notification_settings (id, user_id, push_enabled, email_enabled, job_alerts_enabled, roadmap_reminders_enabled, interview_reminders_enabled, ai_tips_enabled)
values
  ('f3000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', true, true, false, false, false, false),
  ('f3000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', true, true, true, true, true, true),
  ('f3000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', true, false, true, true, false, true)
on conflict (user_id) do update set
  push_enabled = excluded.push_enabled,
  email_enabled = excluded.email_enabled,
  job_alerts_enabled = excluded.job_alerts_enabled,
  roadmap_reminders_enabled = excluded.roadmap_reminders_enabled,
  interview_reminders_enabled = excluded.interview_reminders_enabled,
  ai_tips_enabled = excluded.ai_tips_enabled,
  updated_at = now();

insert into public.activity_logs (id, admin_user_id, action, module, target_id, target_type, old_data, new_data, ip_address, user_agent, status)
values
  ('f4000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'create', 'skills', '50000000-0000-0000-0000-000000000004', 'skill', null, '{"name":"React"}', '127.0.0.1', 'PathFinder Seed', 'success'),
  ('f4000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'sync', 'jobs', 'f0000000-0000-0000-0000-000000000001', 'api_source', null, '{"jobs_added":12}', '127.0.0.1', 'PathFinder Seed', 'success'),
  ('f4000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'review', 'cv_analyses', '72000000-0000-0000-0000-000000000001', 'cv_analysis', '{"status":"completed"}', '{"status":"reviewed"}', '127.0.0.1', 'PathFinder Seed', 'success')
on conflict (id) do update set
  action = excluded.action,
  module = excluded.module,
  new_data = excluded.new_data,
  status = excluded.status;

commit;
