# PathFinder AI — Backend Handoff Document

> Use this Markdown file as full context for another chat, agent, backend team, or project planning session.

---

## 1. Role / Expected Perspective

Act as a **Senior Software Engineer + Backend Architect**. Review and design the project as a production-grade backend system, not only as an academic demo.

Main responsibilities expected from the assistant/agent:

- Review ERD and database design.
- Design backend architecture.
- Define modules and endpoints.
- Define sprint scope and team responsibilities.
- Prepare implementation-ready backend structure.
- Ensure AI features are designed safely and traceably.
- Avoid over-engineering where the MVP does not need it.

---

## 2. Project Overview

### Project Title

**PathFinder AI — Intelligent Career Mentor**

### Target Industry

**EdTech / HRTech**

### Core Problem

Students and fresh graduates struggle to identify suitable career paths, understand required skills, build strong CVs, and find relevant jobs. This leads to poor job opportunities and inefficient learning paths, especially for students without mentorship or real market guidance.

### Solution

PathFinder AI is an AI-powered career mentor that helps users:

- Choose suitable career paths.
- Analyze and improve CVs.
- Detect missing skills.
- Recommend personalized learning roadmaps.
- Match users with relevant jobs.
- Generate interview questions.
- Generate cover letters.
- Chat with an AI career mentor.

### Main Value Proposition

Personalized, data-driven career guidance instead of generic advice.

---

## 3. Final Technology Decisions

### Backend Stack

```txt
Node.js + Express.js + TypeScript
```

### Database

```txt
Supabase PostgreSQL
```

### Authentication

```txt
Supabase Auth + JWT verification in Node.js backend
```

### Storage

```txt
Supabase Storage
```

Used for:

- CV files.
- Profile images.
- Interview recordings later.

### AI Provider

Use:

```txt
OpenAI API
```

Instead of Gemini.

OpenAI will be used for:

- CV analysis.
- Career recommendation.
- Roadmap generation.
- Job match explanation.
- Interview questions.
- Interview feedback.
- Cover letter generation.
- Chatbot.

### RAG / Vector Search

Recommended MVP approach:

```txt
Supabase pgvector + OpenAI Embeddings
```

Instead of starting with Pinecone / Weaviate / FAISS.

### Background Jobs

Recommended options:

```txt
BullMQ + Redis
```

or later:

```txt
Supabase Edge Functions / Cron
```

### Validation

```txt
Zod
```

### ORM / DB Layer Options

Recommended:

```txt
Prisma
```

Alternative:

```txt
Supabase JS Client
```

### API Documentation

```txt
Swagger / OpenAPI
```

### Testing

```txt
Jest + Supertest
```

### Deployment

```txt
Backend: Railway / Render / Fly.io
Database/Auth/Storage: Supabase
Mobile: Flutter
Admin Dashboard: React
```

---

## 4. Product Platforms

### Mobile App

```txt
Flutter
```

### Admin Dashboard

```txt
React
```

### Backend

```txt
Node.js + Express.js + TypeScript
```

### Database/Auth/Storage

```txt
Supabase
```

---

## 5. Mobile Screens Mentioned

The mobile design already includes or expects these screens:

1. Upload CV screen.
2. CV upload loading / parsing screen.
3. CV analyses history.
4. Saved jobs.
5. Applied jobs history.
6. Cover letter result + edit screen.
7. Cover letter history.
8. Interview history.
9. Chat sessions history.
10. Skill details screen.
11. Career path details screen.
12. Notifications settings.
13. Empty / Loading / Error states.
14. No internet state.
15. Account deletion / logout confirmation.

Other screens visible from the design:

- Splash screen.
- Onboarding screens.
- Login.
- Register.
- Register profile steps.
- Forget password.
- Verify email.
- Change password.
- Home dashboard.
- Global search.
- Notification center.
- CV analyzer.
- PathFinder AI chat.
- Job matching.
- Job details.
- Cover letter generator.
- Course catalog.
- Learning categories.
- Course details.
- Learning roadmap.
- Interview simulation start.
- Interview active session.
- Interview result.
- Profile.
- Settings & privacy.

---

## 6. AI Trinity Strategy

### 6.1 LLM — Intelligence

Originally Gemini was planned, but final decision is:

```txt
OpenAI API
```

Used for:

- CV analysis and feedback.
- Career recommendations.
- Skill explanations.
- Interview question generation.
- AI chatbot.
- Cover letter generation.
- Roadmap generation.
- Job match explanations.

### 6.2 RAG — Knowledge

Recommended stack:

```txt
OpenAI Embeddings + Supabase pgvector + Internal DB
```

Data sources:

- Jobs data from job APIs.
- Courses database.
- Career roadmaps.
- Skills requirements.
- CV improvement rules.
- RAG documents uploaded by admin.

Purpose:

RAG allows AI to answer based on real project data instead of generic answers.

Example:

Instead of:

```txt
Learn programming.
```

The system should say:

```txt
Learn React, Node.js, and MongoDB because these skills are required in many current frontend/full-stack jobs.
```

### 6.3 Agents — Actions

AI agent tasks:

- Analyze uploaded CV.
- Generate CV improvement suggestions.
- Detect missing skills.
- Create personalized learning roadmap.
- Match suitable jobs.
- Generate interview questions.
- Generate interview feedback.
- Generate cover letter.
- Suggest next career step.

---

## 7. Core Features

### 7.1 Career Recommendation

Recommends the best career path based on:

- User skills.
- Interests.
- Education.
- Goals.
- Career roadmap data.
- Market data.

Output example:

```txt
Based on your skills in HTML, CSS, and JavaScript, Frontend Development is a suitable career path. Your next steps are React, Git, and API integration.
```

### 7.2 CV Builder & Analyzer

Allows users to upload CVs and get AI analysis.

AI tasks:

- Extract skills.
- Detect weak sections.
- Give CV score.
- Suggest improvements.
- Generate professional summary.
- Extract education, experience, projects, and keywords.

### 7.3 Skill Gap Detection

Compares user skills with career path/job requirements.

Example:

User has:

```txt
HTML, CSS, JavaScript
```

Target job requires:

```txt
React, TypeScript, Git, REST API
```

Output:

```txt
You are missing React, TypeScript, Git, and REST API basics.
```

### 7.4 Job Matching

Matches users with jobs based on:

- Skills.
- Career path.
- CV analysis.
- Location.
- Experience level.
- Job requirements.

Important backend recommendation:

- Do not let OpenAI calculate the whole match score.
- Use deterministic matching logic for score.
- Use OpenAI only for explanation and improvement suggestions.

### 7.5 AI Chat Assistant

Chatbot that answers career-related questions using OpenAI + RAG.

Example questions:

- What should I learn to become a backend developer?
- How can I improve my CV?
- What jobs match my current skills?
- Give me interview questions for React.

### 7.6 Learning Roadmaps

Generates step-by-step learning plans based on target career path and missing skills.

Example roadmap:

1. HTML / CSS.
2. JavaScript.
3. React.
4. APIs.
5. Git & GitHub.
6. Projects.
7. Interview preparation.

### 7.7 AI Interview Simulator

Generates interview questions based on:

- Selected career path.
- Selected job.
- Job description.
- User skill profile.

Outputs:

- Technical questions.
- HR questions.
- Suggested answers.
- Feedback on user answers.
- Scores.

### 7.8 Voice Career Coach

Flow:

```txt
User speaks → Speech-to-Text → OpenAI → Text-to-Speech → User hears response
```

This is not MVP priority unless time allows.

### 7.9 AI Cover Letter Generator

Generates a custom cover letter based on:

- User CV.
- User profile.
- Selected job.
- Job description.
- Tone and keywords selected by user.

---

## 8. Job APIs Mentioned

External job APIs planned:

### Adzuna API

Used for:

- Real and updated job listings.
- Job matching.
- Market skills analysis.
- Recommended jobs page.
- Detecting required skills from job descriptions.

### JSearch API via RapidAPI

Used for:

- Job title.
- Company name.
- Salary if available.
- Required skills.
- Job description.
- Employment type.

### Remotive API

Used for:

- Remote jobs section.
- Matching students with remote internships/jobs.
- Adding global job opportunities.

---

## 9. ERD Summary

Current ERD includes these main tables:

```txt
ROLES
USERS
PROFILES
SKILLS
USER_SKILLS
CV_SKILLS
CAREER_PATHS
CAREER_PATH_SKILLS
COURSES
CVS
CV_ANALYSES
ROADMAPS
ROADMAP_STEPS
JOBS
JOB_MATCHES
CHAT_SESSIONS
CHAT_MESSAGES
INTERVIEW_SESSIONS
INTERVIEW_QUESTIONS
COVER_LETTERS
AI_LOGS
RAG_DOCUMENTS
RAG_CHUNKS
API_SOURCES
API_SYNC_RUNS
SYSTEM_SETTINGS
ACTIVITY_LOGS
```

---

## 10. Important ERD / Backend Decisions

### 10.1 Admin and Roles

If the project has only **one admin**, avoid over-engineering.

Recommended MVP approach:

```txt
Add role directly in USERS table:
role: user | admin
```

Then remove or ignore:

```txt
ROLES
PERMISSIONS
ROLE_PERMISSIONS
RBAC system
Admin management screens
Roles & permissions screens
```

Alternative acceptable academic approach:

Keep `ROLES` with only:

```txt
User
Admin
```

But do not add permissions unless needed.

### 10.2 CV_ANALYSES Ownership

`CV_ANALYSES` should be generated by AI, not manually created by admin.

Correct flow:

```txt
CV → AI Analysis
```

Admin role:

```txt
Review / approve / flag
```

Useful fields:

```txt
reviewed_by_admin_id
reviewed_at
```

### 10.3 Jobs Management

Use:

```txt
status: draft | published | archived
is_active: boolean
```

This is better than only `is_active`.

### 10.4 Missing Table: COURSE_SKILLS

This is a required missing table.

Reason:

- One course can teach many skills.
- One skill can be taught in many courses.

Add:

```txt
COURSE_SKILLS
- id
- course_id FK
- skill_id FK
- created_at
```

Relationship:

```txt
COURSES ||--o{ COURSE_SKILLS : teaches
SKILLS  ||--o{ COURSE_SKILLS : learned_in
```

### 10.5 Videos

For MVP:

```txt
COURSES.video_url
```

is enough if each course has one video.

For advanced full course structure later:

```txt
COURSE_SECTIONS
COURSE_VIDEOS
```

### 10.6 Analytics Tables

Do not create a permanent `DASHBOARD_ANALYTICS` table for MVP.

Use:

- Aggregate queries.
- Materialized views later.
- Caching later.

### 10.7 API Sync Runs Improvement

Add to `API_SYNC_RUNS`:

```txt
raw_response_count
jobs_added
jobs_updated
jobs_rejected
```

This helps track external job API sync quality.

---

## 11. Extra Tables Recommended Before Coding

Add these tables before backend implementation:

### 11.1 COURSE_SKILLS

```txt
COURSE_SKILLS
- id PK
- course_id FK
- skill_id FK
- created_at
```

### 11.2 SAVED_JOBS

```txt
SAVED_JOBS
- id PK
- user_id FK
- job_id FK
- created_at
```

### 11.3 APPLIED_JOBS

```txt
APPLIED_JOBS
- id PK
- user_id FK
- job_id FK
- status
- applied_at
- created_at
- updated_at
```

Statuses:

```txt
applied
viewed
interviewing
rejected
accepted
withdrawn
```

### 11.4 NOTIFICATION_SETTINGS

```txt
NOTIFICATION_SETTINGS
- id PK
- user_id FK
- push_enabled
- email_enabled
- job_alerts_enabled
- roadmap_reminders_enabled
- interview_reminders_enabled
- ai_tips_enabled
- created_at
- updated_at
```

### 11.5 Optional: COVER_LETTER_VERSIONS

For better editing/version history:

```txt
COVER_LETTER_VERSIONS
- id PK
- cover_letter_id FK
- content
- version
- edited_by_user
- created_at
```

For MVP, using `version` and `content` directly inside `COVER_LETTERS` is acceptable.

---

## 12. Required Status Enums

```txt
cv_status:
uploaded | parsing | analyzing | completed | failed

analysis_status:
completed | failed | reviewed

job_status:
draft | published | archived

job_match_status:
generated | refreshed | outdated

applied_job_status:
applied | interviewing | rejected | accepted | withdrawn

interview_status:
started | in_progress | completed | cancelled

cover_letter_status:
draft | generated | edited | archived

roadmap_status:
active | completed | paused

rag_index_status:
pending | indexed | failed

api_sync_status:
running | success | failed
```

---

## 13. Sprint Planning

### Sprint 0 — Before Coding

Duration: 2–3 days.

Deliverables:

```txt
1. Final Backend ERD for Supabase
2. API Contract document
3. Folder structure
4. Environment variables list
5. OpenAI prompts specification
6. Supabase Storage buckets
7. Status enums
8. Error response format
9. Seed data plan
10. Sprint 1 task board
```

Do not start coding before these are ready.

### Sprint 1 — Backend Foundation + Core Mobile APIs

Duration: around 10 days.

Must-have scope:

```txt
Auth middleware
Profile APIs
CV upload
CV parsing status
CV analysis
CV analysis history
Jobs list
Job details
Saved jobs
Applied jobs
Cover letter generate
Cover letter history
Interview history
Skill details
Career path details
Notification settings
Account deletion
```

Nice-to-have scope:

```txt
Chat sessions
Full RAG
Voice coach
Advanced job API sync
Admin dashboard APIs
```

---

## 14. Team Split — 5 Backend Developers

### Developer 1 — Backend Core / Architecture Lead

Responsible for:

```txt
Project setup
Express + TypeScript structure
Environment config
Error handling
Response format
Auth middleware
Supabase client
API docs setup
Logging
Base controllers/services/repositories
```

Deliverables:

```txt
src/
  config/
  middlewares/
  utils/
  modules/
  app.ts
  server.ts

Global response shape
Global error handler
Auth middleware
Swagger setup
```

### Developer 2 — Auth, Profile, Settings

Responsible for:

```txt
Supabase Auth integration
User profile APIs
Notification settings
Account deletion
Logout
Profile completion
```

APIs:

```txt
/me
/me/profile
/me/notifications
/me/delete
/auth/logout
```

Tables:

```txt
users
profiles
notification_settings
activity_logs
```

### Developer 3 — CV + AI Analysis

Responsible for:

```txt
CV upload
Supabase Storage
PDF parsing
CV status lifecycle
OpenAI CV analysis
CV analysis history
CV skills extraction
AI logs
```

APIs:

```txt
/cvs
/cv-analyses
```

Tables:

```txt
cvs
cv_analyses
cv_skills
skills
ai_logs
```

### Developer 4 — Jobs + Matching + Saved/Applied Jobs

Responsible for:

```txt
Jobs listing
Job details
Saved jobs
Applied jobs
Job matching
Missing skills
Job match history
```

APIs:

```txt
/jobs
/jobs/saved
/jobs/applied
/job-matches
```

Tables:

```txt
jobs
job_matches
saved_jobs
applied_jobs
skills
user_skills
cv_analyses
```

### Developer 5 — Roadmaps + Interviews + Cover Letters + Chat

Responsible for:

```txt
Career path details
Skill details
Roadmap details
Interview history
Cover letter generate/edit/history
Chat sessions history
```

APIs:

```txt
/career-paths
/skills
/roadmaps
/interviews
/cover-letters
/chat
```

Tables:

```txt
career_paths
career_path_skills
course_skills
courses
roadmaps
roadmap_steps
interview_sessions
interview_questions
cover_letters
chat_sessions
chat_messages
ai_logs
```

If overloaded, postpone Chat to Sprint 2.

---

## 15. Backend Folder Structure

```txt
src/
  app.ts
  server.ts

  config/
    env.ts
    supabase.ts
    openai.ts
    storage.ts

  common/
    errors/
      AppError.ts
      errorHandler.ts
    middlewares/
      auth.middleware.ts
      validate.middleware.ts
      rateLimit.middleware.ts
    utils/
      asyncHandler.ts
      apiResponse.ts
      pagination.ts
      logger.ts

  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts

    users/
      users.routes.ts
      users.controller.ts
      users.service.ts
      users.repository.ts
      users.schema.ts

    profiles/
      profiles.routes.ts
      profiles.controller.ts
      profiles.service.ts
      profiles.repository.ts
      profiles.schema.ts

    cvs/
      cvs.routes.ts
      cvs.controller.ts
      cvs.service.ts
      cvs.repository.ts
      cvs.schema.ts
      cvParser.service.ts

    ai/
      ai.service.ts
      openai.service.ts
      prompts/
        cvAnalysis.prompt.ts
        coverLetter.prompt.ts
        jobMatch.prompt.ts
        interview.prompt.ts
        chat.prompt.ts

    jobs/
      jobs.routes.ts
      jobs.controller.ts
      jobs.service.ts
      jobs.repository.ts
      jobs.schema.ts

    jobMatches/
      jobMatches.routes.ts
      jobMatches.controller.ts
      jobMatches.service.ts

    savedJobs/
      savedJobs.routes.ts
      savedJobs.controller.ts
      savedJobs.service.ts

    appliedJobs/
      appliedJobs.routes.ts
      appliedJobs.controller.ts
      appliedJobs.service.ts

    coverLetters/
      coverLetters.routes.ts
      coverLetters.controller.ts
      coverLetters.service.ts

    interviews/
      interviews.routes.ts
      interviews.controller.ts
      interviews.service.ts

    roadmaps/
      roadmaps.routes.ts
      roadmaps.controller.ts
      roadmaps.service.ts

    skills/
      skills.routes.ts
      skills.controller.ts
      skills.service.ts

    chat/
      chat.routes.ts
      chat.controller.ts
      chat.service.ts

    notifications/
      notifications.routes.ts
      notifications.controller.ts
      notifications.service.ts

  database/
    migrations/
    seed/
```

---

## 16. Standard API Response

### Success Response

```json
{
  "success": true,
  "message": "CV analyzed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "CV file is required",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

---

## 17. Environment Variables

```env
NODE_ENV=development
PORT=5000
API_VERSION=v1

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

CV_BUCKET_NAME=cvs
PROFILE_IMAGES_BUCKET_NAME=profile-images

REDIS_URL=

ADZUNA_APP_ID=
ADZUNA_APP_KEY=
RAPIDAPI_KEY=
REMOTIVE_BASE_URL=

JWT_AUDIENCE=authenticated
```

Important:

```txt
SUPABASE_SERVICE_ROLE_KEY must never be exposed to Flutter or React frontend.
```

---

## 18. OpenAI Services Needed

Create separated AI service wrappers:

```txt
CVAnalysisAIService
CareerRecommendationAIService
RoadmapAIService
JobMatchAIService
InterviewAIService
CoverLetterAIService
ChatAIService
```

Every AI call should be logged in:

```txt
AI_LOGS
```

Required AI log fields:

```txt
user_id
feature
model
prompt
response
tokens_used
latency_ms
cost
status
error_message
request_payload
response_payload
created_at
```

---

## 19. RAG Flow

Recommended MVP RAG flow:

```txt
Admin adds courses/jobs/roadmaps/rag documents
→ Backend chunks content
→ OpenAI Embeddings
→ Store vector in Supabase pgvector
→ Chat/CV/roadmap/job matching retrieves relevant chunks
→ Send context to OpenAI
```

Tables:

```txt
RAG_DOCUMENTS
RAG_CHUNKS
```

Recommended extra fields in `RAG_CHUNKS`:

```txt
embedding vector
metadata json
```

---

## 20. Feature Flows

### 20.1 CV Upload + AI Analysis Flow

```txt
User uploads CV
→ Backend uploads file to Supabase Storage
→ Save row in CVS with status = uploaded
→ Start parsing
→ Extract text
→ Call OpenAI
→ Save CV_ANALYSES
→ Extract skills into CV_SKILLS
→ Update CV status = completed
→ Return result to mobile
```

CV statuses:

```txt
uploaded
parsing
analyzing
completed
failed
```

Expected CV analysis JSON:

```json
{
  "score": 75,
  "summary": "Good frontend profile with missing backend depth.",
  "strengths": ["React", "UI design", "project experience"],
  "weaknesses": ["No measurable achievements", "Weak backend skills"],
  "missing_skills": ["TypeScript", "Node.js", "Testing"],
  "suggestions": [
    "Add measurable impact to experience",
    "Add 2 backend projects",
    "Improve technical keywords"
  ],
  "detected_skills": ["HTML", "CSS", "JavaScript", "React"]
}
```

### 20.2 Job Matching Flow

```txt
Get user profile
Get user skills
Get latest CV analysis
Get jobs
Calculate matching score deterministically
Use OpenAI for explanation only
Save result in JOB_MATCHES
```

### 20.3 Cover Letter Flow

```txt
User selects job
→ Backend gets user profile + CV analysis + job description
→ OpenAI generates cover letter
→ Save version 1
→ User edits
→ Save edited version
```

### 20.4 Interview Flow

```txt
User chooses career path/job
→ Backend creates interview session
→ OpenAI generates questions
→ User answers
→ OpenAI evaluates answer
→ Save score and feedback
→ Return result
```

### 20.5 Chat Flow

```txt
Create session
Send message
Retrieve RAG context from Supabase pgvector
Call OpenAI
Save user message
Save assistant message
Return response
```

---

# 21. Full Backend Endpoints By Module

Base API prefix:

```http
/api/v1
```

---

## 21.1 Auth Module

Base:

```http
/api/v1/auth
```

```http
POST   /register
POST   /login
POST   /logout
POST   /refresh-token

GET    /me
PATCH  /change-password
PATCH  /profile
DELETE /account
```

With Supabase Auth, some auth operations may be handled directly by Supabase from frontend, while backend still verifies JWT and provides `/me`, profile, and account APIs.

---

## 21.2 Users Module

Base:

```http
/api/v1/users
```

Admin:

```http
GET    /
GET    /:id
PATCH  /:id
DELETE /:id

PATCH  /:id/activate
PATCH  /:id/deactivate
```

User data:

```http
GET    /:id/profile
PATCH  /:id/profile

GET    /:id/skills
POST   /:id/skills
DELETE /:id/skills/:skillId

GET    /:id/activity
```

---

## 21.3 Profiles Module

Base:

```http
/api/v1/profiles
```

```http
GET    /me
PUT    /me
GET    /:userId
```

---

## 21.4 Skills Module

Base:

```http
/api/v1/skills
```

```http
GET    /
GET    /:id

POST   /
PATCH  /:id
DELETE /:id

GET    /categories

GET    /:id/courses
GET    /:id/jobs
GET    /:id/career-paths
```

---

## 21.5 User Skills Module

Base:

```http
/api/v1/user-skills
```

```http
POST   /
PATCH  /:id
DELETE /:id

GET    /me
```

---

## 21.6 Career Paths Module

Base:

```http
/api/v1/career-paths
```

```http
GET    /
GET    /:id

POST   /
PATCH  /:id
DELETE /:id

GET    /:id/skills
POST   /:id/skills
DELETE /:id/skills/:skillId

GET    /:id/courses
```

---

## 21.7 Courses Module

Base:

```http
/api/v1/courses
```

```http
GET    /
GET    /:id

POST   /
PATCH  /:id
DELETE /:id

GET    /career/:careerId
GET    /skill/:skillId
```

---

## 21.8 CV Module

Base:

```http
/api/v1/cvs
```

Upload:

```http
POST   /upload
```

Management:

```http
GET    /
GET    /:id
DELETE /:id
GET    /:id/download
```

CV skills:

```http
GET    /:id/skills
```

Recommended additional status endpoint:

```http
GET    /:id/status
```

---

## 21.9 CV Analysis Module

Base:

```http
/api/v1/cv-analysis
```

AI analysis:

```http
POST   /analyze/:cvId
```

Results:

```http
GET    /:cvId
GET    /:cvId/strengths
GET    /:cvId/weaknesses
GET    /:cvId/suggestions
GET    /:cvId/skills
```

Admin review:

```http
PATCH  /:id/review
```

Alternative cleaner history endpoints:

```http
GET    /api/v1/cv-analyses
GET    /api/v1/cv-analyses/:id
```

---

## 21.10 Career Recommendation Module

Base:

```http
/api/v1/career-recommendations
```

```http
POST   /generate
GET    /latest
GET    /history
```

---

## 21.11 Skill Gap Analysis Module

Base:

```http
/api/v1/skill-gap
```

```http
POST   /analyze
GET    /latest
```

Example input:

```json
{
  "careerPathId": ""
}
```

---

## 21.12 Roadmaps Module

Base:

```http
/api/v1/roadmaps
```

Generate:

```http
POST   /generate
```

CRUD:

```http
GET    /
GET    /:id
PATCH  /:id
DELETE /:id
```

Steps:

```http
GET    /:id/steps
PATCH  /steps/:stepId
PATCH  /steps/:stepId/complete
```

Alternative step endpoint:

```http
PATCH  /:id/steps/:stepId
```

---

## 21.13 Jobs Module

Base:

```http
/api/v1/jobs
```

```http
GET    /
GET    /:id

POST   /
PATCH  /:id
DELETE /:id
```

Search:

```http
GET /search
```

Query params:

```http
?keyword=
?location=
?remote=
?page=
```

Saved jobs:

```http
POST   /:id/save
DELETE /:id/save
GET    /saved
```

Applied jobs:

```http
POST   /:id/apply
GET    /applied
PATCH  /applied/:id/status
```

---

## 21.14 Job Matching Module

Base:

```http
/api/v1/job-matches
```

```http
POST   /generate
GET    /
GET    /:id
PATCH  /:id/status
```

---

## 21.15 Chatbot Module

Base:

```http
/api/v1/chat
```

Sessions:

```http
GET    /sessions
POST   /sessions
GET    /sessions/:id
DELETE /sessions/:id
```

Messages:

```http
POST   /sessions/:id/message
GET    /sessions/:id/messages
```

---

## 21.16 Interview Simulator Module

Base:

```http
/api/v1/interviews
```

Start:

```http
POST   /start
```

Example body:

```json
{
  "careerPathId": "",
  "jobId": ""
}
```

Session:

```http
GET    /:id
POST   /:id/answer
PATCH  /:id/finish
```

Questions:

```http
GET    /:id/questions
```

Recommended additional endpoints:

```http
GET    /
POST   /:id/questions
```

---

## 21.17 Voice Coach Module

Base:

```http
/api/v1/voice
```

```http
POST /speech-to-text
POST /text-to-speech
POST /chat
```

This can be postponed after MVP.

---

## 21.18 Cover Letters Module

Base:

```http
/api/v1/cover-letters
```

Generate:

```http
POST   /generate
```

CRUD:

```http
GET    /
GET    /:id
PATCH  /:id
DELETE /:id
```

---

## 21.19 RAG Module

Base:

```http
/api/v1/rag
```

Documents:

```http
POST   /documents
GET    /documents
GET    /documents/:id
DELETE /documents/:id
```

Reindex:

```http
POST /documents/:id/reindex
```

Search:

```http
POST /search
```

Example body:

```json
{
  "query": ""
}
```

---

## 21.20 AI Module

Base:

```http
/api/v1/ai
```

Generic AI gateway:

```http
POST /chat
POST /career-advice
POST /skill-explanation
POST /career-roadmap
POST /cv-summary
```

Important note:

For production clarity, avoid exposing too many generic AI endpoints to the frontend. Prefer feature-specific endpoints where possible.

---

## 21.21 AI Logs Module

Base:

```http
/api/v1/ai-logs
```

Admin only:

```http
GET /
GET /:id
```

---

## 21.22 API Sources Module

Base:

```http
/api/v1/api-sources
```

```http
GET /
GET /:id

POST /
PATCH /:id
DELETE /:id
```

Sync:

```http
POST /:id/sync
```

---

## 21.23 API Sync Runs Module

Base:

```http
/api/v1/api-sync-runs
```

```http
GET /
GET /:id
```

---

## 21.24 Dashboard Analytics Module

Base:

```http
/api/v1/dashboard
```

KPIs:

```http
GET /overview
```

Example return:

```json
{
  "users": 1200,
  "jobs": 4500,
  "roadmaps": 850,
  "interviews": 320
}
```

Charts:

```http
GET /analytics
GET /usage
GET /ai-costs
```

---

## 21.25 System Settings Module

Base:

```http
/api/v1/settings
```

```http
GET /
PATCH /:key
```

---

## 21.26 Activity Logs Module

Base:

```http
/api/v1/activity-logs
```

```http
GET /
GET /:id
```

---

## 21.27 Admin Module

Base:

```http
/api/v1/admin
```

Dashboard:

```http
GET /stats
```

Users:

```http
GET /users
```

AI monitoring:

```http
GET /ai-usage
GET /ai-costs
GET /ai-errors
```

---

## 22. Endpoint Count Approximation

```txt
Auth: 8
Users/Profile: 12
Skills: 8+
Career Paths: 8+
Courses: 6
CV: 6+
CV Analysis: 6
Career Recommendation: 3
Skill Gap: 2
Roadmaps: 8
Jobs: 6+
Job Matches: 4
Chat: 6
Interviews: 5+
Voice: 3
Cover Letters: 5
RAG: 7
AI: 5
AI Logs: 2
API Sources: 5
Sync Runs: 2
Dashboard: 4
Settings: 2
Activity Logs: 2
Admin: 4
```

Total: around **120+ REST endpoints**.

---

## 23. Recommended Implementation Priority

Implement in this order:

```txt
1. Supabase schema
2. Auth middleware
3. Profile APIs
4. CV upload
5. CV analysis
6. Jobs APIs
7. Saved/applied jobs
8. Cover letter
9. Interview history
10. Skill details
11. Career path details
12. Chat/RAG
```

Do not start with Chat first because it depends on RAG and can delay the MVP.

---

## 24. Documentation Files To Create In Repo

Create these files inside `/docs`:

```txt
/docs/BACKEND_ARCHITECTURE.md
/docs/API_CONTRACT.md
/docs/DATABASE_SCHEMA.md
/docs/OPENAI_PROMPTS_SPEC.md
/docs/ERROR_HANDLING_GUIDE.md
/docs/SUPABASE_SETUP.md
/docs/SPRINT_1_TASKS.md
```

---

## 25. Risks And Solutions

### RAG Accuracy

Risk:

```txt
AI may answer with wrong or generic data.
```

Solution:

```txt
Use trusted datasets, strong prompts, and retrieved context from database.
```

### API Cost

Risk:

```txt
OpenAI and job APIs may become expensive.
```

Solution:

```txt
Rate limiting, caching, token tracking, and AI_LOGS cost monitoring.
```

### CV Parsing

Risk:

```txt
Extracting data from CVs can be inaccurate.
```

Solution:

```txt
Use PDF parser + AI cleanup + structured JSON validation.
```

### Job Data Quality

Risk:

```txt
Some job APIs may return incomplete data.
```

Solution:

```txt
Use multiple APIs, normalize job data, and track sync runs.
```

### Latency

Risk:

```txt
AI responses and file parsing may be slow.
```

Solution:

```txt
Use async processing, status endpoints, background jobs, and caching.
```

---

## 26. Final Backend Goal

The backend goal for the next sprint is:

```txt
Build the backend foundation and implement the core mobile APIs needed by the current Figma screens.
```

Most important features:

```txt
CV Upload + AI Analysis
Jobs + Saved/Applied + Matching
Cover Letter + Interview/Career Details
```

Most important technical decisions:

```txt
Supabase Auth instead of custom auth
Supabase Storage for CV files
Supabase pgvector + OpenAI embeddings for RAG
OpenAI API instead of Gemini
```

Most important ERD additions:

```txt
COURSE_SKILLS
SAVED_JOBS
APPLIED_JOBS
NOTIFICATION_SETTINGS
```

---

## 27. Prompt To Continue In Another Chat

Use this prompt in the next chat:

```txt
Act as a Senior Software Engineer and Backend Architect.

We are building PathFinder AI, an intelligent career mentor for students, fresh graduates, ITI students, and career shifters.

Tech stack:
- Backend: Node.js + Express.js + TypeScript
- Database/Auth/Storage: Supabase PostgreSQL + Supabase Auth + Supabase Storage
- AI: OpenAI API instead of Gemini
- RAG: OpenAI Embeddings + Supabase pgvector
- Mobile: Flutter
- Admin Dashboard: React

Use the attached Markdown file as the full project context.

I need you to help us continue backend planning and implementation. Follow production-grade backend practices. Avoid over-engineering. Assume MVP has one admin only. Prioritize CV upload/analysis, jobs, matching, cover letters, interviews, skills, career paths, and roadmaps.
```

