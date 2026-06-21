# API Conventions

This document records current conventions and recommended conventions for future implementation. Current runtime API surface is minimal.

## Current Runtime Routes

Mounted by `src/server.js`:

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/` | Health/basic server status | No |
| `GET` | `/openapi/rag.json` | Serve RAG OpenAPI spec file | No |
| `GET` | `/test/auth` | Auth middleware diagnostic | Yes |
| `POST` | `/test/validate` | Joi validation diagnostic | No |
| `GET` | `/test/error` | Error handler diagnostic | No |
| `POST` | `/api/v1/auth/register` | Register account | No |
| `POST` | `/api/v1/auth/login` | Login, issue JWT | No |
| `GET` | `/api/v1/auth/me` | Current user | Yes |
| `POST` | `/api/v1/auth/change-password` | Change password | Yes |
| `GET` | `/api/v1/users/me` | Current user record | Yes |
| `GET` | `/api/v1/users` | List users | Yes |
| `GET` | `/api/v1/users/:id` | Get user | Yes |
| `PATCH` | `/api/v1/users/:id` | Update user | Yes, admin |
| `PATCH` | `/api/v1/users/:id/activate` | Activate user | Yes, admin |
| `PATCH` | `/api/v1/users/:id/deactivate` | Deactivate user | Yes, admin |
| `POST` | `/api/v1/cvs/analyze` | Upload + analyze CV (multipart) | Yes |
| `GET` | `/api/v1/cvs/me/latest-analysis` | Latest CV analysis | Yes |
| `GET` | `/api/v1/cvs/me/status` | CV processing status | Yes |
| `POST` | `/api/v1/rag/documents` | Create RAG document | No (temporary bypass) |
| `POST` | `/api/v1/rag/documents/upload` | Upload RAG document (multipart) | No (temporary bypass) |
| `GET` | `/api/v1/rag/documents` | List RAG documents | No (temporary bypass) |
| `GET` | `/api/v1/rag/documents/:id` | Get RAG document | No (temporary bypass) |
| `PATCH` | `/api/v1/rag/documents/:id` | Update RAG document | No (temporary bypass) |
| `DELETE` | `/api/v1/rag/documents/:id` | Delete RAG document | No (temporary bypass) |
| `POST` | `/api/v1/roadmaps/generate` | Generate roadmap | Yes |
| `GET` | `/api/v1/roadmaps/me` | User roadmaps | Yes |
| `GET` | `/api/v1/roadmaps/:id` | Get roadmap | Yes |
| `PATCH` | `/api/v1/roadmaps/:roadmapId/steps/:stepId/progress` | Update step progress | Yes |
| `POST` | `/api/v1/courses/import/preview` | Preview MaharaTech course import, fetch metadata, run `course_analysis`, and match skills | Yes, admin |
| `POST` | `/api/v1/courses/import/confirm` | Save an approved imported course and course-skill mappings | Yes, admin |
| `PATCH` | `/api/v1/courses/:id` | Update a course | Yes, admin |
| `DELETE` | `/api/v1/courses/:id` | Delete a course | Yes, admin |
| `GET` | `/api/v1/courses/recommended` | Return deterministic course recommendations for the authenticated user | Yes |
| `GET` | `/api/v1/interviews/career-paths` (also `/api/interviews/...`) | List active career paths | Yes |
| `POST` | `/api/v1/interviews/sessions` (also `/api/interviews/...`) | Generate an interview session | Yes |
| `POST` | `/api/chat/sessions` | Create chat session | No (no auth yet) |
| `GET` | `/api/chat/sessions` | List chat sessions | No (no auth yet) |
| `POST` | `/api/chat/:sessionId` | Send message to session | No (no auth yet) |
| `GET` | `/api/chat/:sessionId/messages` | List session messages | No (no auth yet) |

## Planned Route Prefix

`pathfinder_ai_backend_handoff.md` proposes:

```text
/api/v1
```

This is mounted for implemented product modules including auth, CVs, RAG, roadmaps, users, and courses.

## Route Naming

- Use module-owned REST-style route groups.
- Prefer feature-specific endpoints over broad generic AI routes.
- Keep route files limited to endpoint declarations, validation middleware, auth middleware, and controller mapping.
- Do not combine unrelated module routes in one file.

## HTTP Methods

| Method | Use |
| --- | --- |
| `GET` | Read/list resources |
| `POST` | Create resources, trigger generation, upload files, start sessions |
| `PUT` | Full replacement when needed |
| `PATCH` | Partial updates, status changes, completion actions |
| `DELETE` | Delete/archive/remove resources |

## Auth Requirements

- Public routes: health, login/register if implemented, read-only public catalogs only when product requirements allow.
- Protected routes: user profile, CVs, saved/applied jobs, roadmaps, interviews, cover letters, chat, notifications.
- Admin routes: user administration, content management, API sources/syncs, activity logs, system settings, AI logs.
- Use `authenticate` from `src/common/middlewares/auth.middleware.js`.
- Use `authorize(...)` for role-gated routes after confirming the service can map `role_id` to role names.

## Request Body Format

- JSON for normal API endpoints.
- Multipart form data for uploads when implemented.
- All request input must have Joi validation.
- Unknown input is stripped by validation middleware.

## Query Params

Common list/search params should be validated:

| Param | Purpose |
| --- | --- |
| `page` | Page number, default 1 |
| `limit` | Page size, default 10 |
| `keyword` or `q` | Search keyword |
| `status` | Filter by lifecycle status |
| `sort` | Sort field/direction when implemented |
| `location`, `remote`, `category`, `level` | Feature-specific filters |

## Pagination

Use `src/common/utils/pagination.js`.

Response metadata should be under:

```json
{
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 0,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false,
      "nextPage": null,
      "previousPage": null
    }
  }
}
```

## Success Response Shape

Use `sendSuccess` or `sendPaginated`:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Optional `meta` is allowed.

## Error Response Shape

Global error handler shape:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "details": {}
}
```

`sendError` has a similar shape and may include `errors` and `details`.

## Status Codes

| Status | Use |
| --- | --- |
| `200` | Successful read/update/action |
| `201` | Created resource |
| `204` | Successful deletion when no response body is needed |
| `400` | Validation or malformed request |
| `401` | Missing/invalid/expired auth token |
| `403` | Authenticated but forbidden |
| `404` | Resource not found |
| `409` | Duplicate/conflict state |
| `413` | File too large |
| `415` | Unsupported file type |
| `429` | Rate limit |
| `500` | Unexpected server failure |

## Validation Patterns

- Define Joi schemas in `*.schema.js`.
- Apply middleware in `*.routes.js`.
- Use `validateBody(schema)`, `validateParams(schema)`, and `validateQuery(schema)`.
- Use service-layer checks for ownership, uniqueness, status transitions, and cross-table constraints.

## Filtering And Sorting

- Validate allowed filter values against schema enum values where possible.
- Do not allow arbitrary database column sorting without an allowlist.
- Keep text search behavior explicit per module.

## Needs Confirmation

- Final API prefix.
- Whether admin endpoints will share module route groups or live under `/admin`.
- Whether some read-only catalogs are public.
- Final pagination response naming if frontend already expects a different shape.

## Source Files Inspected

- `src/server.js`
- `src/modules/test/test.routes.js`
- `src/common/utils/apiResponse.js`
- `src/common/utils/pagination.js`
- `src/common/middlewares/validate.middleware.js`
- `src/common/middlewares/auth.middleware.js`
- `pathfinder_ai_backend_handoff.md`
