# API Conventions

This document records current conventions and recommended conventions for future implementation. Current runtime API surface is minimal.

## Current Runtime Routes

Mounted by `src/server.js`:

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/` | Health/basic server status | No |
| `GET` | `/test/auth` | Auth middleware diagnostic | Yes |
| `POST` | `/test/validate` | Joi validation diagnostic | No |
| `GET` | `/test/error` | Error handler diagnostic | No |

## Planned Route Prefix

`pathfinder_ai_backend_handoff.md` proposes:

```text
/api/v1
```

This is not currently mounted in code. Confirm before implementing new product routes.

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
