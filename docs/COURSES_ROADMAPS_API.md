# Courses and Roadmaps API contract

All endpoints are mounted under `/api/v1` and require a backend JWT bearer token. Course import endpoints additionally require the `admin` role.

## Stable envelopes

Success responses use `success`, `message`, `data`, and optional `meta.pagination`. Errors use:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [{ "message": "...", "path": "..." }]
  }
}
```

The legacy top-level `statusCode` and validation-only `details` fields remain for compatibility. Database hints, SQL details, JWT verification reasons, and third-party response details are never returned.

## Course behavior

- Discovery and details expose only active courses with `analysis_status = approved`.
- `GET /courses` paginates in PostgreSQL; `limit` is capped at 50.
- `newest`, `rating`, and `popular` are the only accepted sort values.
- Saving and enrolling are idempotent: creation returns 201; an existing row returns 200.
- Unsave is safely repeatable and always scopes deletion to the authenticated user.
- A completed enrollment always has progress 100 and `completedAt`; reopening clears `completedAt`.
- `courses.enrollment_count` is provider/catalog metadata. Local PathFinder enrollment totals come from `course_enrollments` and are not incremented during enrollment.
- Recommendation scores are deterministic. AI may extract course-skill candidates, but links below confidence 0.6 are ignored unless their source is `admin_manual`.
- Recommendation reasons are machine-readable `{ code, params }` objects.

## Roadmap behavior

`POST /roadmaps/generate` always returns all four state fields:

```json
{
  "hasRoadmap": true,
  "requiredAction": null,
  "reused": false,
  "roadmap": {}
}
```

Reused roadmaps return 200, newly generated roadmaps return 201, and a missing completed CV analysis returns 200 with `requiredAction: "upload_cv"`. Recommended course IDs are selected from real active, approved database rows and persisted with `roadmap_step_courses.recommendation_order`.

Machine-readable definitions and all request/response schemas are served from `/openapi/courses.json` and `/openapi/roadmaps.json`.
