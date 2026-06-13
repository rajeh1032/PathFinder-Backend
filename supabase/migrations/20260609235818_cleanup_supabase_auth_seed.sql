delete from auth.identities
where user_id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
)
or (provider = 'email' and provider_id in (
  'admin@pathfinder.ai',
  'nour@example.com',
  'omar@example.com'
));

delete from auth.users
where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
)
or email in (
  'admin@pathfinder.ai',
  'nour@example.com',
  'omar@example.com'
);
