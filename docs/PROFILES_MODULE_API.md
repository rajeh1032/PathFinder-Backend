# Profiles Module — Full API Reference (Flutter Integration Guide)

This document fully describes the **Profiles** module of the PathFinder backend so it can be consumed by a Flutter client. It covers every endpoint, request/response shapes, validation rules, error formats, the data models, and ready-to-use Flutter (Dart) integration code.

> Source of truth: `src/modules/profiles/*` and `docs/DATABASE_SCHEMA.md`. If anything here disagrees with the code, the code wins.

---

## 1. Overview

The Profiles module manages, for the **authenticated user**:

- The **core profile** (one per user): headline, bio, location, university, major, avatar, and lookup references (education level, current status, experience years, target career).
- **Work/training experiences** (full CRUD).
- **Education history** (full CRUD).
- A read-only **career paths** lookup list.

Architecture (every endpoint flows through these layers):

```
route -> controller -> service -> repository -> Supabase (PostgreSQL)
```

---

## 2. Base URL & Mounting

| Item | Value |
| --- | --- |
| Base prefix | `/api/v1` (driven by `API_VERSION`, default `v1`) |
| Module mount | `/api/v1/profiles` |
| Example local base | `http://localhost:5000/api/v1/profiles` |

For Flutter, define one base constant, e.g.:

```dart
const String kApiBaseUrl = 'http://10.0.2.2:5000/api/v1'; // Android emulator -> host
// const String kApiBaseUrl = 'http://localhost:5000/api/v1'; // iOS sim / web
const String kProfilesBase = '$kApiBaseUrl/profiles';
```

> Note: On the Android emulator, `localhost` refers to the emulator itself. Use `10.0.2.2` to reach your host machine.

---

## 2.1 Supabase Storage (avatars)

Profile avatars uploaded via `PATCH /me` are stored in the Supabase Storage bucket **`profile-images`**.

- The bucket must exist. Create it in the Supabase dashboard (Storage → New bucket → name `profile-images`).
- For `avatar_url` to be directly usable by the Flutter `Image.network(...)` widget, the bucket should be **public** (the backend returns the public URL via `getPublicUrl`). If you keep it private, switch the backend to signed URLs.
- Files are stored under `profile-images/<userId>/<timestamp>-<uuid>.<ext>`.
- Replacing an avatar deletes the previous file automatically.

---

---

## 3. Authentication
- Auth is **backend-owned JWT** (not Supabase Auth).
- Get a token from `POST /api/v1/auth/login` or `POST /api/v1/auth/register` (returns an `accessToken`).
- Send it on every profiles request (all endpoints require auth **except** `GET /me/careerPahts`):

```
Authorization: Bearer <accessToken>
```

The token payload contains `userId`, `email`, and `role`. The backend resolves the current user from the token; **the client never sends a user id**.

Auth failures return `401` with `error.code = "UNAUTHORIZED"`.

---

## 4. Standard Response Envelopes

### Success

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": { },
  "meta": { }
}
```

- `data` shape varies per endpoint (see each endpoint below).
- `meta` is only present for paginated lists (none in this module currently).

### Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "message": "\"job_title\" is required", "path": "job_title" }
    ]
  },
  "details": [
    { "message": "\"job_title\" is required", "path": "job_title" }
  ]
}
```

Error `code` values you may receive:

| HTTP | `error.code` | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body/params failed Joi validation |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Authenticated but does not own the resource |
| 404 | `NOT_FOUND` | Profile / experience / education not found |
| 409 | `CONFLICT` | Duplicate/conflict (rare here) |
| 500 | `INTERNAL_ERROR` | Server/Supabase failure |

> In `production`, 5xx messages and details are scrubbed. In `development`, a `stack` field may also be present.

---

## 5. Data Models

All ids are UUID strings. Timestamps are ISO 8601 strings. Dates are `YYYY-MM-DD`.

### 5.1 Profile (table `profiles`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (uuid) | Profile primary key |
| `user_id` | string (uuid) | Owner user id |
| `name` | string\|null | User's name from the related `users` table. Returned only by `GET /me`; read-only on the profile |
| `education_level_id` | string (uuid)\|null | FK to `education_level` |
| `university` | string\|null | |
| `major` | string\|null | |
| `current_status_id` | string (uuid)\|null | FK to `current_status` |
| `experience_year_id` | string (uuid)\|null | FK to `experience_year` |
| `target_career_id` | string (uuid)\|null | FK to `career_paths` |
| `location` | string\|null | |
| `headline` | string\|null | Short professional headline |
| `bio` | string\|null | About text |
| `avatar_url` | string\|null | Public/signed avatar URL |
| `avatar_storage_path` | string\|null | Supabase Storage path (managed server-side) |
| `created_at` | string (ISO) | |
| `updated_at` | string (ISO) | |

### 5.2 Experience (table `profile_experiences`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (uuid) | |
| `profile_id` | string (uuid) | |
| `job_title` | string | Required on create |
| `company_name` | string | Required on create |
| `employment_type` | string\|null | e.g. Internship, Full-time, Training |
| `location` | string\|null | |
| `start_date` | string (date)\|null | `YYYY-MM-DD` |
| `end_date` | string (date)\|null | `YYYY-MM-DD`; forced `null` when `is_current = true` |
| `is_current` | boolean | Default `false` |
| `description` | string\|null | |
| `skills` | string[] | JSON array of skill names |
| `display_order` | integer | Sort order, default `0` |
| `created_at` | string (ISO) | |
| `updated_at` | string (ISO) | |

### 5.3 Education (table `profile_education`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (uuid) | |
| `profile_id` | string (uuid) | |
| `institution` | string | Required on create |
| `degree` | string | Required on create (schema enforces) |
| `field_of_study` | string | Required on create (schema enforces) |
| `education_level_id` | string (uuid)\|null | FK to `education_level` |
| `start_date` | string (date) | Required on create |
| `end_date` | string (date)\|null | |
| `is_current` | boolean | Default `false` |
| `grade` | string\|null | |
| `description` | string\|null | |
| `display_order` | integer | Sort order |
| `created_at` | string (ISO) | |
| `updated_at` | string (ISO) | |

### 5.4 CareerPath (table `career_paths`, read-only subset)

| Field | Type |
| --- | --- |
| `id` | string (uuid) |
| `title` | string |

---

## 6. Endpoint Summary

| # | Method | Path | Auth | Purpose | `data` shape |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/me` | Yes | Get my profile | `{ profile }` |
| 2 | PATCH | `/me` | Yes | Update my profile | `{ profile }` |
| 3 | GET | `/me/experiences` | Yes | List my experiences | `{ experiences: [] }` |
| 4 | POST | `/me/experiences` | Yes | Create experience | `{ experience }` |
| 5 | GET | `/me/experiences/:id` | Yes | Get one experience | `{ experience }` |
| 6 | PATCH | `/me/experiences/:id` | Yes | Update experience | `{ experience }` |
| 7 | DELETE | `/me/experiences/:id` | Yes | Delete experience | `{ id }` |
| 8 | GET | `/me/education` | Yes | List my education | `[]` (array) |
| 9 | POST | `/me/education` | Yes | Create education | education object |
| 10 | GET | `/me/education/:id` | Yes | Get one education | education object (+`profile`) |
| 11 | PATCH | `/me/education/:id` | Yes | Update education | education object |
| 12 | DELETE | `/me/education/:id` | Yes | Delete education | `{ id, deleted: true }` |
| 13 | GET | `/me/careerPahts` | **No** | List career paths (lookup) | `[ {id, title} ]` |

> ⚠️ **Response-shape inconsistencies to handle in Flutter** (these reflect the actual backend):
> - Experiences are wrapped (`data.experience` / `data.experiences`), but education is returned **raw** (`data` is the object or array directly).
> - `DELETE /me/experiences/:id` returns `{ id }`; `DELETE /me/education/:id` returns `{ id, deleted: true }`.
> - The career-paths route path is literally **`/me/careerPahts`** (misspelled) and is **not authenticated**.

---

## 7. Endpoint Details

### 7.1 GET `/me` — Get my profile

- **Auth:** required
- **Body:** none
- **Success 200:**

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "profile": {
      "id": "b1f2...",
      "user_id": "a9c8...",
      "name": "Ahmed Hassan",
      "education_level_id": null,
      "university": "Cairo University",
      "major": "Computer Science",
      "current_status_id": null,
      "experience_year_id": null,
      "target_career_id": "c3d4...",
      "location": "Cairo, Egypt",
      "headline": "Junior Backend Developer",
      "bio": "Fresh grad passionate about Node.js",
      "avatar_url": null,
      "avatar_storage_path": null,
      "created_at": "2026-01-10T08:00:00.000Z",
      "updated_at": "2026-06-22T10:30:00.000Z"
    }
  }
}
```

- **Errors:** `401` no/invalid token, `404` if the user has no profile row.

> `name` is read from the related `users` table (via `profiles.user_id`) and flattened onto the profile. It is **read-only here** and only returned by `GET /me` (not by `PATCH /me`). To change the name, use the users/auth module.

---

### 7.2 PATCH `/me` — Update my profile

- **Auth:** required
- **Content types:** accepts **either** `application/json` (fields only) **or** `multipart/form-data` (fields + optional image).
- **Avatar upload:** send the image in a multipart field named **`avatar`**. Allowed types: JPG, PNG, WEBP, GIF. Max size: **5MB**. The backend uploads it to the Supabase Storage bucket **`profile-images`** and sets `avatar_url` (public URL) and `avatar_storage_path` automatically. Any previous avatar is replaced and the old file is deleted.
- **Body:** all fields optional, but the request must contain **at least one field OR an `avatar` file**. Unknown fields are stripped.

| Field | Type | Rules |
| --- | --- | --- |
| `avatar` | file (multipart) | optional image; JPG/PNG/WEBP/GIF, ≤ 5MB. Sets `avatar_url` + `avatar_storage_path` |
| `headline` | string | max 200; `null`/`""` allowed |
| `bio` | string | max 3000; `null`/`""` allowed |
| `location` | string | max 160; `null`/`""` allowed |
| `university` | string | max 200; `null`/`""` allowed |
| `major` | string | max 200; `null`/`""` allowed |
| `avatar_url` | string | valid URI, max 500; `null`/`""` allowed. **Ignored/overridden when an `avatar` file is uploaded** |
| `education_level_id` | string (uuid) | `null` allowed |
| `current_status_id` | string (uuid) | `null` allowed |
| `experience_year_id` | string (uuid) | `null` allowed |
| `target_career_id` | string (uuid) | `null` allowed |

- **JSON request example (no image):**

```json
{
  "headline": "Backend Developer",
  "bio": "Building APIs with Node + Supabase",
  "location": "Giza, Egypt",
  "target_career_id": "c3d4e5f6-1234-5678-9abc-def012345678"
}
```

- **Multipart request example (image + fields):**

```
PATCH /api/v1/profiles/me
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=...

--...
Content-Disposition: form-data; name="avatar"; filename="me.jpg"
Content-Type: image/jpeg
<binary image bytes>
--...
Content-Disposition: form-data; name="headline"

Backend Developer
--...--
```

- **Success 200:** `{ "data": { "profile": { ...updated profile, with new avatar_url... } } }`
- **Errors:** `400` validation / empty update, `401`, `404` profile not found, `413` image too large, `415` unsupported image type.

---

### 7.3 GET `/me/experiences` — List my experiences

- **Auth:** required. **Body:** none.
- **Ordering:** by `display_order` asc, then `start_date` desc.
- **Success 200:**

```json
{
  "success": true,
  "message": "Profile experiences fetched successfully",
  "data": {
    "experiences": [
      {
        "id": "e1...",
        "profile_id": "b1...",
        "job_title": "Backend Intern",
        "company_name": "ITI",
        "employment_type": "Internship",
        "location": "Remote",
        "start_date": "2025-07-01",
        "end_date": null,
        "is_current": true,
        "description": "Built REST APIs",
        "skills": ["Node.js", "Express", "Supabase"],
        "display_order": 0,
        "created_at": "2026-01-10T08:00:00.000Z",
        "updated_at": "2026-01-10T08:00:00.000Z"
      }
    ]
  }
}
```

---

### 7.4 POST `/me/experiences` — Create experience

- **Auth:** required.
- **Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `job_title` | string | **required**, 2–160 chars |
| `company_name` | string | **required**, 2–160 chars |
| `employment_type` | string | optional, max 80, `null`/`""` allowed |
| `location` | string | optional, max 160, `null`/`""` allowed |
| `start_date` | date (ISO) | optional, `null`/`""` allowed |
| `end_date` | date (ISO) | optional, `null`/`""` allowed |
| `is_current` | boolean | optional, default `false` |
| `description` | string | optional, max 3000 |
| `skills` | string[] | optional, each 1–120 chars, max 50 items, default `[]` |
| `display_order` | integer | optional, 0–1000, default `0` |

- **Cross-field rules:**
  - If `is_current = true`, `end_date` must be empty (server also nulls it).
  - `end_date` must be `>=` `start_date`.

- **Request example:**

```json
{
  "job_title": "Backend Intern",
  "company_name": "ITI",
  "employment_type": "Internship",
  "start_date": "2025-07-01",
  "is_current": true,
  "skills": ["Node.js", "Express"]
}
```

- **Success 201:** `{ "data": { "experience": { ...created... } } }`
- **Errors:** `400` validation, `401`, `404` profile not found.

---

### 7.5 GET `/me/experiences/:id` — Get one experience

- **Auth:** required. **Param:** `id` must be a UUID.
- Only returns the experience if it belongs to the caller's profile.
- **Success 200:** `{ "data": { "experience": { ... } } }`
- **Errors:** `400` bad uuid, `401`, `404` not found / not owned.

---

### 7.6 PATCH `/me/experiences/:id` — Update experience

- **Auth:** required. **Param:** `id` UUID.
- **Body:** any subset of the create fields (at least **one**). Same cross-field rules apply.
- **Success 200:** `{ "data": { "experience": { ...updated... } } }`
- **Errors:** `400` validation, `401`, `404` not found / not owned.

---

### 7.7 DELETE `/me/experiences/:id` — Delete experience

- **Auth:** required. **Param:** `id` UUID.
- **Success 200:**

```json
{ "success": true, "message": "Profile experience deleted successfully", "data": { "id": "e1..." } }
```

- **Errors:** `400` bad uuid, `401`, `404` not found / not owned.

---

### 7.8 GET `/me/education` — List my education

- **Auth:** required. **Body:** none. **Ordering:** `start_date` desc.
- **Success 200 (note: `data` is a raw array):**

```json
{
  "success": true,
  "message": "Profile education fetched successfully",
  "data": [
    {
      "id": "ed1...",
      "profile_id": "b1...",
      "institution": "Cairo University",
      "degree": "BSc",
      "field_of_study": "Computer Science",
      "education_level_id": null,
      "start_date": "2021-09-01",
      "end_date": "2025-06-01",
      "is_current": false,
      "grade": "Very Good",
      "description": null,
      "display_order": 0,
      "created_at": "2026-01-10T08:00:00.000Z",
      "updated_at": "2026-01-10T08:00:00.000Z"
    }
  ]
}
```

---

### 7.9 POST `/me/education` — Create education

- **Auth:** required.
- **Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `degree` | string | **required**, min 2 |
| `field_of_study` | string | **required**, min 2 |
| `institution` | string | **required**, min 2 |
| `start_date` | date (ISO) | **required** |
| `end_date` | date (ISO) | optional, `null`/`""` allowed |
| `grade` | string | optional, `null`/`""` allowed |
| `description` | string | optional, `null`/`""` allowed |

- **Request example:**

```json
{
  "institution": "Cairo University",
  "degree": "BSc",
  "field_of_study": "Computer Science",
  "start_date": "2021-09-01",
  "end_date": "2025-06-01",
  "grade": "Very Good"
}
```

- **Success 201 (note: `data` is the raw education object):**

```json
{ "success": true, "message": "Profile education created successfully", "data": { "id": "ed1...", "profile_id": "b1...", "institution": "Cairo University", "...": "..." } }
```

- **Errors:** `400` validation, `401`, `404` profile not found.

---

### 7.10 GET `/me/education/:id` — Get one education

- **Auth:** required. **Param:** `id` UUID (v4).
- Ownership enforced in the service: returns `403` if the record belongs to another user.
- **Success 200:** `data` is the education object, which also includes a nested `profile` with `user_id`:

```json
{
  "success": true,
  "message": "Profile education fetched successfully",
  "data": {
    "id": "ed1...",
    "profile_id": "b1...",
    "institution": "Cairo University",
    "degree": "BSc",
    "field_of_study": "Computer Science",
    "start_date": "2021-09-01",
    "end_date": "2025-06-01",
    "grade": "Very Good",
    "description": null,
    "profile": { "user_id": "a9c8..." }
  }
}
```

- **Errors:** `400` bad uuid, `401`, `403` not owned, `404` not found.

---

### 7.11 PATCH `/me/education/:id` — Update education

- **Auth:** required. **Param:** `id` UUID (v4).
- **Body:** any subset of: `degree`, `field_of_study`, `institution` (each min 2), `start_date`, `end_date`, `grade`, `description`. At least **one** field required.
- Ownership enforced (`403` if not owner).
- **Success 200:** `data` is the updated education object.
- **Errors:** `400` validation, `401`, `403` not owned, `404` not found.

---

### 7.12 DELETE `/me/education/:id` — Delete education

- **Auth:** required. **Param:** `id` UUID (v4). Ownership enforced.
- **Success 200:**

```json
{ "success": true, "message": "Profile education deleted successfully", "data": { "id": "ed1...", "deleted": true } }
```

- **Errors:** `400` bad uuid, `401`, `403` not owned, `404` not found.

---

### 7.13 GET `/me/careerPahts` — List career paths (lookup)

- **Auth:** **not required** (public). Path is spelled `careerPahts`.
- Used to populate a dropdown for `target_career_id` on the profile.
- **Success 200:**

```json
{
  "success": true,
  "message": "successfully retreive careerPaths",
  "data": [
    { "id": "c3d4...", "title": "Backend Developer" },
    { "id": "c5e6...", "title": "Data Engineer" }
  ]
}
```

---

## 8. Flutter Integration

Below is a minimal, dependency-light integration using the `http` package. Swap in `dio`/Riverpod/Bloc as your app requires. The key things to get right are: the **Bearer token**, the **success envelope unwrapping**, and the **per-endpoint `data` shape** noted above.

### 8.1 Dart models

```dart
class Profile {
  final String id;
  final String userId;
  final String? name;
  final String? educationLevelId;
  final String? university;
  final String? major;
  final String? currentStatusId;
  final String? experienceYearId;
  final String? targetCareerId;
  final String? location;
  final String? headline;
  final String? bio;
  final String? avatarUrl;
  final String? avatarStoragePath;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Profile({
    required this.id,
    required this.userId,
    this.name,
    this.educationLevelId,
    this.university,
    this.major,
    this.currentStatusId,
    this.experienceYearId,
    this.targetCareerId,
    this.location,
    this.headline,
    this.bio,
    this.avatarUrl,
    this.avatarStoragePath,
    this.createdAt,
    this.updatedAt,
  });

  factory Profile.fromJson(Map<String, dynamic> j) => Profile(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        name: j['name'] as String?,
        educationLevelId: j['education_level_id'] as String?,
        university: j['university'] as String?,
        major: j['major'] as String?,
        currentStatusId: j['current_status_id'] as String?,
        experienceYearId: j['experience_year_id'] as String?,
        targetCareerId: j['target_career_id'] as String?,
        location: j['location'] as String?,
        headline: j['headline'] as String?,
        bio: j['bio'] as String?,
        avatarUrl: j['avatar_url'] as String?,
        avatarStoragePath: j['avatar_storage_path'] as String?,
        createdAt: j['created_at'] != null ? DateTime.parse(j['created_at']) : null,
        updatedAt: j['updated_at'] != null ? DateTime.parse(j['updated_at']) : null,
      );
}

class Experience {
  final String id;
  final String profileId;
  final String jobTitle;
  final String companyName;
  final String? employmentType;
  final String? location;
  final String? startDate; // 'YYYY-MM-DD'
  final String? endDate;
  final bool isCurrent;
  final String? description;
  final List<String> skills;
  final int displayOrder;

  Experience({
    required this.id,
    required this.profileId,
    required this.jobTitle,
    required this.companyName,
    this.employmentType,
    this.location,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.description,
    this.skills = const [],
    this.displayOrder = 0,
  });

  factory Experience.fromJson(Map<String, dynamic> j) => Experience(
        id: j['id'] as String,
        profileId: j['profile_id'] as String,
        jobTitle: j['job_title'] as String,
        companyName: j['company_name'] as String,
        employmentType: j['employment_type'] as String?,
        location: j['location'] as String?,
        startDate: j['start_date'] as String?,
        endDate: j['end_date'] as String?,
        isCurrent: (j['is_current'] as bool?) ?? false,
        description: j['description'] as String?,
        skills: (j['skills'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        displayOrder: (j['display_order'] as int?) ?? 0,
      );
}

class Education {
  final String id;
  final String profileId;
  final String institution;
  final String? degree;
  final String? fieldOfStudy;
  final String? startDate;
  final String? endDate;
  final bool isCurrent;
  final String? grade;
  final String? description;

  Education({
    required this.id,
    required this.profileId,
    required this.institution,
    this.degree,
    this.fieldOfStudy,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.grade,
    this.description,
  });

  factory Education.fromJson(Map<String, dynamic> j) => Education(
        id: j['id'] as String,
        profileId: j['profile_id'] as String,
        institution: j['institution'] as String,
        degree: j['degree'] as String?,
        fieldOfStudy: j['field_of_study'] as String?,
        startDate: j['start_date'] as String?,
        endDate: j['end_date'] as String?,
        isCurrent: (j['is_current'] as bool?) ?? false,
        grade: j['grade'] as String?,
        description: j['description'] as String?,
      );
}

class CareerPath {
  final String id;
  final String title;
  CareerPath({required this.id, required this.title});
  factory CareerPath.fromJson(Map<String, dynamic> j) =>
      CareerPath(id: j['id'] as String, title: j['title'] as String);
}
```

### 8.2 API exception + envelope helper

```dart
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;
  final List<dynamic> details;
  ApiException(this.statusCode, this.message, {this.code, this.details = const []});
  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}

/// Returns the decoded body if success, otherwise throws ApiException.
Map<String, dynamic> _unwrap(http.Response res) {
  final Map<String, dynamic> body =
      res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : {};
  final ok = body['success'] == true && res.statusCode >= 200 && res.statusCode < 300;
  if (!ok) {
    final err = body['error'] as Map<String, dynamic>?;
    throw ApiException(
      body['statusCode'] as int? ?? res.statusCode,
      body['message'] as String? ?? 'Request failed',
      code: err?['code'] as String?,
      details: (body['details'] as List?) ?? (err?['details'] as List?) ?? const [],
    );
  }
  return body;
}
```

### 8.3 ProfilesApi service

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
// For multipart avatar uploads:
import 'package:http_parser/http_parser.dart'; // MediaType

class ProfilesApi {
  ProfilesApi({required this.baseUrl, required this.tokenProvider});

  /// e.g. 'http://10.0.2.2:5000/api/v1/profiles'
  final String baseUrl;

  /// Returns the current JWT access token (or null if logged out).
  final String? Function() tokenProvider;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (tokenProvider() != null) 'Authorization': 'Bearer ${tokenProvider()}',
      };

  // ---- Profile ----
  Future<Profile> getMyProfile() async {
    final res = await http.get(Uri.parse('$baseUrl/me'), headers: _headers);
    final body = _unwrap(res);
    return Profile.fromJson(body['data']['profile']);
  }

  Future<Profile> updateMyProfile(Map<String, dynamic> changes) async {
    final res = await http.patch(Uri.parse('$baseUrl/me'),
        headers: _headers, body: jsonEncode(changes));
    final body = _unwrap(res);
    return Profile.fromJson(body['data']['profile']);
  }

  /// Update the profile and/or upload an avatar image (multipart).
  /// [imagePath] is a local file path (e.g. from image_picker). Text [changes]
  /// are sent as multipart fields. Pass only an image, only fields, or both.
  Future<Profile> updateMyProfileWithImage({
    Map<String, String> changes = const {},
    String? imagePath,
  }) async {
    final req = http.MultipartRequest('PATCH', Uri.parse('$baseUrl/me'));
    if (tokenProvider() != null) {
      req.headers['Authorization'] = 'Bearer ${tokenProvider()}';
    }
    changes.forEach((k, v) => req.fields[k] = v);
    if (imagePath != null) {
      // Field name MUST be 'avatar'. Set contentType explicitly so the server's
      // MIME filter accepts it (http defaults to application/octet-stream).
      final ext = imagePath.split('.').last.toLowerCase();
      const mimeByExt = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
      };
      req.files.add(await http.MultipartFile.fromPath(
        'avatar',
        imagePath,
        contentType: MediaType.parse(mimeByExt[ext] ?? 'image/jpeg'),
      ));
    }
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    final body = _unwrap(res);
    return Profile.fromJson(body['data']['profile']);
  }

  // ---- Experiences ----
  Future<List<Experience>> getExperiences() async {
    final res = await http.get(Uri.parse('$baseUrl/me/experiences'), headers: _headers);
    final body = _unwrap(res);
    final list = (body['data']['experiences'] as List);
    return list.map((e) => Experience.fromJson(e)).toList();
  }

  Future<Experience> getExperience(String id) async {
    final res = await http.get(Uri.parse('$baseUrl/me/experiences/$id'), headers: _headers);
    final body = _unwrap(res);
    return Experience.fromJson(body['data']['experience']);
  }

  Future<Experience> createExperience(Map<String, dynamic> data) async {
    final res = await http.post(Uri.parse('$baseUrl/me/experiences'),
        headers: _headers, body: jsonEncode(data));
    final body = _unwrap(res);
    return Experience.fromJson(body['data']['experience']);
  }

  Future<Experience> updateExperience(String id, Map<String, dynamic> changes) async {
    final res = await http.patch(Uri.parse('$baseUrl/me/experiences/$id'),
        headers: _headers, body: jsonEncode(changes));
    final body = _unwrap(res);
    return Experience.fromJson(body['data']['experience']);
  }

  Future<String> deleteExperience(String id) async {
    final res = await http.delete(Uri.parse('$baseUrl/me/experiences/$id'), headers: _headers);
    final body = _unwrap(res);
    return body['data']['id'] as String;
  }

  // ---- Education (note: data is raw, not wrapped) ----
  Future<List<Education>> getEducation() async {
    final res = await http.get(Uri.parse('$baseUrl/me/education'), headers: _headers);
    final body = _unwrap(res);
    final list = (body['data'] as List);
    return list.map((e) => Education.fromJson(e)).toList();
  }

  Future<Education> getEducationById(String id) async {
    final res = await http.get(Uri.parse('$baseUrl/me/education/$id'), headers: _headers);
    final body = _unwrap(res);
    return Education.fromJson(body['data']);
  }

  Future<Education> createEducation(Map<String, dynamic> data) async {
    final res = await http.post(Uri.parse('$baseUrl/me/education'),
        headers: _headers, body: jsonEncode(data));
    final body = _unwrap(res);
    return Education.fromJson(body['data']);
  }

  Future<Education> updateEducation(String id, Map<String, dynamic> changes) async {
    final res = await http.patch(Uri.parse('$baseUrl/me/education/$id'),
        headers: _headers, body: jsonEncode(changes));
    final body = _unwrap(res);
    return Education.fromJson(body['data']);
  }

  Future<bool> deleteEducation(String id) async {
    final res = await http.delete(Uri.parse('$baseUrl/me/education/$id'), headers: _headers);
    final body = _unwrap(res);
    return body['data']['deleted'] == true;
  }

  // ---- Career paths (public lookup; misspelled path is intentional) ----
  Future<List<CareerPath>> getCareerPaths() async {
    final res = await http.get(Uri.parse('$baseUrl/me/careerPahts'), headers: _headers);
    final body = _unwrap(res);
    return (body['data'] as List).map((e) => CareerPath.fromJson(e)).toList();
  }
}
```

### 8.4 Usage example

```dart
final api = ProfilesApi(
  baseUrl: kProfilesBase,
  tokenProvider: () => authStore.accessToken, // your token storage
);

// Read profile
final profile = await api.getMyProfile();

// Update profile
final updated = await api.updateMyProfile({
  'headline': 'Backend Developer',
  'target_career_id': selectedCareerPathId,
});

// Update profile WITH an avatar image (e.g. from image_picker)
// final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
final withAvatar = await api.updateMyProfileWithImage(
  changes: {'headline': 'Backend Developer'}, // optional text fields (strings)
  imagePath: picked.path,                      // local image path
);
// withAvatar.avatarUrl now points to the public Supabase Storage URL

// Add an experience (omit end_date when is_current is true)
final exp = await api.createExperience({
  'job_title': 'Backend Intern',
  'company_name': 'ITI',
  'employment_type': 'Internship',
  'start_date': '2025-07-01',
  'is_current': true,
  'skills': ['Node.js', 'Express'],
});

// Handle validation errors
try {
  await api.createEducation({'institution': 'X'}); // missing required fields
} on ApiException catch (e) {
  if (e.statusCode == 400) {
    for (final d in e.details) {
      debugPrint('${d['path']}: ${d['message']}');
    }
  }
}
```

---

## 9. Flutter Integration Checklist

- [ ] Store the JWT from login/register and inject it as `Authorization: Bearer <token>` on every profiles call (except `getCareerPaths`).
- [ ] On `401` with `code = UNAUTHORIZED`, redirect to login / refresh the token.
- [ ] Remember the **shape differences**: experiences are wrapped (`data.experience(s)`), education is raw (`data`).
- [ ] Send dates as `YYYY-MM-DD` strings.
- [ ] For experiences, do not send `end_date` when `is_current = true`.
- [ ] Use `getCareerPaths()` to populate the target-career dropdown bound to `target_career_id`.
- [ ] PATCH endpoints require **at least one** field; sending `{}` returns `400`.
- [ ] To upload an avatar, send `multipart/form-data` with the image in the **`avatar`** field (JPG/PNG/WEBP/GIF, ≤ 5MB); the server fills `avatar_url`. Add `http_parser` to `pubspec.yaml` for `MediaType`.
- [ ] Ensure the Supabase **`profile-images`** bucket exists and is public so `avatar_url` renders in `Image.network`.
- [ ] Surface `error.details[].message` in forms for inline validation feedback.

---

## 10. Known Backend Quirks (for awareness, not client-side fixes)

- `GET /me/careerPahts` is misspelled and unauthenticated. If the backend later renames/secures it, update `getCareerPaths()`.
- Education and experience delete responses differ (`{ id, deleted: true }` vs `{ id }`).
- Education responses are not wrapped in a named key, unlike experiences. This is intentional to document, but the team may standardize later.
