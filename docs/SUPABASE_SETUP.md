# Supabase Setup

## Current Session Status

Supabase MCP server is reachable, but MCP tools are not exposed in this Codex session yet. The project now includes `.mcp.json` pointing to:

```txt
https://mcp.supabase.com/mcp
```

After OAuth is completed and the session is reloaded, Supabase MCP tools should be available for applying and verifying schema changes.

Supabase CLI is not installed on this machine right now.

The configured Supabase project host could not be resolved by DNS from this machine during setup, so Storage buckets and database tables were not created remotely in this run. Re-run the setup when the Supabase project URL resolves correctly.

## What To Apply

Run the SQL in:

```txt
supabase/migrations/20260609233000_init_pathfinder_schema.sql
```

Use one of these paths:

1. Supabase MCP `execute_sql`, preferred when available.
2. Supabase Dashboard SQL Editor.
3. Supabase CLI after installing and linking the project.

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
