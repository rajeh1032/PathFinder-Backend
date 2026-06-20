const test = require('node:test');
const assert = require('node:assert/strict');

const repository = require('../src/modules/courses/courses.repository');
const service = require('../src/modules/courses/courses.service');

const originals = { ...repository };
test.afterEach(() => Object.assign(repository, originals));

test('recommendations require a completed CV analysis', async () => {
  repository.findUserProfileContext = async () => null;
  repository.findLatestCompletedCvAnalysis = async () => null;
  repository.findUserSkills = async () => [];
  const result = await service.getRecommendedCourses({ user: { id: 'u1' }, limit: 10 });
  assert.deepEqual(result, { hasRecommendations: false, requiredAction: 'upload_cv', courses: [] });
});

test('recommendations rank deterministically and exclude unavailable or low-confidence links', async () => {
  const skillId = '20000000-0000-4000-8000-000000000001';
  repository.findUserProfileContext = async () => ({ profiles: [{ target_career_id: 'c1', target_career: [{ title: 'Frontend Developer' }] }] });
  repository.findLatestCompletedCvAnalysis = async () => ({ cv: { id: 'cv1' }, analysis: { missing_skills: [{ name: 'React' }] } });
  repository.findUserSkills = async () => [];
  repository.findCvSkills = async () => [];
  repository.findCareerPathSkills = async () => [{ skill_id: skillId, skills: [{ id: skillId, name: 'React' }] }];
  repository.findLatestActiveRoadmapSteps = async () => [];
  repository.findActiveSkillsByNames = async () => [{ id: skillId, name: 'React' }];
  repository.findUserCourseStates = async () => ({ savedRows: [], enrollmentRows: [] });
  const course = (id, popularity, extra = {}) => ({
    id, title: id, provider: 'MaharaTech', is_active: true, analysis_status: 'approved',
    is_free: true, popularity_score: popularity, rating: 4, reviews_count: 10,
    enrollment_count: 100, learning_outcomes: [], ...extra,
  });
  repository.findApprovedCourseSkillRows = async () => [
    { skill_id: skillId, confidence: 0.9, source: 'ai_analysis', skills: [{ id: skillId, name: 'React' }], courses: [course('best', 90)] },
    { skill_id: skillId, confidence: 0.9, source: 'admin_manual', skills: [{ id: skillId, name: 'React' }], courses: [course('second', 10)] },
    { skill_id: skillId, confidence: 0.2, source: 'ai_analysis', skills: [{ id: skillId, name: 'React' }], courses: [course('low', 100)] },
    { skill_id: skillId, confidence: 1, source: 'admin_manual', skills: [{ id: skillId, name: 'React' }], courses: [course('inactive', 100, { is_active: false })] },
    { skill_id: skillId, confidence: 1, source: 'admin_manual', skills: [{ id: skillId, name: 'React' }], courses: [course('pending', 100, { analysis_status: 'pending_review' })] },
  ];

  const result = await service.getRecommendedCourses({ user: { id: 'u1' }, limit: 10 });
  assert.deepEqual(result.courses.map((item) => item.id), ['best', 'second']);
  assert.equal(result.courses[0].matchReasons[0].code, 'covers_missing_skill');
  assert.ok(result.courses[0].score > result.courses[1].score);
});

test('save and enroll operations are idempotent and user-scoped', async () => {
  repository.findAvailableCourseById = async () => ({ id: 'c1' });
  repository.findSavedCourse = async ({ userId }) => ({ id: 's1', user_id: userId });
  repository.findCourseEnrollment = async ({ userId }) => ({ id: 'e1', user_id: userId, status: 'active', progress: 0 });
  const saved = await service.saveCourse({ user: { id: 'owner' }, courseId: 'c1' });
  const enrolled = await service.enrollCourse({ user: { id: 'owner' }, courseId: 'c1' });
  assert.equal(saved.alreadySaved, true);
  assert.equal(enrolled.alreadyEnrolled, true);

  let deleteArgs;
  repository.deleteSavedCourse = async (args) => { deleteArgs = args; return false; };
  const unsaved = await service.unsaveCourse({ user: { id: 'owner' }, courseId: 'c1' });
  assert.deepEqual(deleteArgs, { userId: 'owner', courseId: 'c1' });
  assert.equal(unsaved.isSaved, false);
});

test('enrollment progress maintains completion invariants and reopens safely', async () => {
  repository.findCourseEnrollment = async () => ({ id: 'e1', status: 'completed', progress: 100, completed_at: '2026-01-01T00:00:00Z' });
  let changes;
  repository.updateCourseEnrollment = async (args) => { changes = args.changes; return { id: 'e1', ...changes }; };
  await service.updateEnrollment({ user: { id: 'u1' }, courseId: 'c1', payload: { progress: 40 } });
  assert.deepEqual(changes, { progress: 40, status: 'active', completed_at: null });
  await assert.rejects(
    service.updateEnrollment({ user: { id: 'u1' }, courseId: 'c1', payload: { status: 'paused' } }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});

test('missing courses and import identity bypasses return stable validation errors', async () => {
  repository.findAvailableCourseById = async () => null;
  await assert.rejects(
    service.getCourseById({ user: { id: 'u1' }, courseId: 'missing' }),
    (error) => error.code === 'COURSE_NOT_FOUND',
  );
  await assert.rejects(
    service.confirmCourseImport({
      user: { id: 'admin' },
      payload: {
        provider: 'MaharaTech', external_id: 'wrong',
        url: 'https://maharatech.gov.eg/mod/page/view.php?id=42',
        metadata: { title: 'Course' }, analysis: {}, matched_skills: [],
      },
    }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});
