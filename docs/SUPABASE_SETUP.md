# Supabase Setup

## Current Session Status

Supabase MCP server is reachable, but MCP tools are not exposed in this Codex session yet. The project now includes `.mcp.json` pointing to:

```txt
https://mcp.supabase.com/mcp
```

After OAuth is completed and the session is reloaded, Supabase MCP tools should be available for applying and verifying schema changes.

Supabase CLI is installed locally in this project as a dev dependency:

```txt
npx supabase --version
```

Current project ref:

```txt
siklkhhiporcupiqxhui
```

Local Supabase Postgres was initialized and the migration was applied successfully. Remote Storage buckets were also initialized through the Supabase service client.

Remote database table upload is still waiting on Supabase CLI or MCP authentication. The CLI reported:

```txt
Access token not provided. Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

The older project URL typo has been corrected in `.env`.

## What To Apply

Run the SQL in:

```txt
supabase/migrations/20260609233000_init_pathfinder_schema.sql
```

Use one of these paths:

1. Supabase MCP `execute_sql`, preferred when available.
2. Supabase Dashboard SQL Editor.
3. Supabase CLI after login and project linking.

## Local CLI Commands

```powershell
npm run supabase:start:db
npm run supabase:verify:local
```

The full local stack may need Docker Desktop settings on Windows. If Analytics fails, local database work can still use:

```powershell
npm run supabase:start:db
```

## Remote CLI Commands

Create a Supabase access token from the dashboard, then run:

```powershell
npx supabase login --token YOUR_SUPABASE_ACCESS_TOKEN
npm run supabase:link
npm run supabase:push
```

To push both schema migrations and mock data:

```powershell
npm run supabase:push:with-seed
```

Or set the token only for the current PowerShell session:

```powershell
$env:SUPABASE_ACCESS_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"
npm run supabase:link
npm run supabase:push:with-seed
```

## Verification Queries

After applying the migration, run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

```sql
select typname
from pg_type
where typname in (
  'cv_status',
  'analysis_status',
  'job_status',
  'job_match_status',
  'applied_job_status',
  'interview_status',
  'cover_letter_status',
  'roadmap_status',
  'rag_index_status',
  'api_sync_status',
  'generated_by_type'
)
order by typname;
```

```sql
select id, name, public
from storage.buckets
where id in ('cvs', 'profile-images', 'interview-recordings', 'rag-documents')
order by id;
```

```sql
select extname
from pg_extension
where extname in ('pgcrypto', 'vector')
order by extname;
```

## Database vs Storage Rule

Use database tables for searchable data, relational data, statuses, JSON AI output, and embeddings.

Use Storage for binary files only. Database rows should keep the storage path and metadata.

## Auth Decision

Authentication is handled by the Node.js/Express backend, not Supabase Auth.

The `public.users` table contains `password_hash`. Backend auth services should:

- Hash passwords before insert/update.
- Never return `password_hash` in API responses.
- Issue and verify backend JWTs with `JWT_SECRET`.
- Use Supabase as database/storage only for auth data persistence.
