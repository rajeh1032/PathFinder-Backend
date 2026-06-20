const test = require('node:test');
const assert = require('node:assert/strict');

const aiService = require('../src/modules/ai/ai.service');
const ragService = require('../src/modules/rag/rag.service');
aiService.generateJsonCompletion = async () => { throw new Error('AI disabled in tests'); };
ragService.getRagContextForFeature = async () => '';
delete require.cache[require.resolve('../src/modules/roadmaps/roadmaps.service')];

const repository = require('../src/modules/roadmaps/roadmaps.repository');
const service = require('../src/modules/roadmaps/roadmaps.service');
const originals = { ...repository };
test.afterEach(() => Object.assign(repository, originals));

const roadmapRow = {
  id: '30000000-0000-4000-8000-000000000001',
  title: 'Frontend Roadmap',
  description: 'Learn frontend',
  metadata: {},
  progress: 0,
  generated_by_type: 'system',
};

test('generate returns an explicit stable reused contract', async () => {
  repository.findLatestActiveRoadmapForUser = async () => roadmapRow;
  repository.findRoadmapSteps = async () => [];
  const result = await service.generateRoadmap({ user: { id: 'u1' } });
  assert.equal(result.hasRoadmap, true);
  assert.equal(result.requiredAction, null);
  assert.equal(result.reused, true);
  assert.equal(result.roadmap.id, roadmapRow.id);
});

test('generate returns upload_cv without invoking AI when analysis is missing', async () => {
  repository.findLatestActiveRoadmapForUser = async () => null;
  repository.findUserProfileContext = async () => ({ id: 'u1' });
  repository.findLatestCompletedCvAnalysis = async () => null;
  const result = await service.generateRoadmap({ user: { id: 'u1' } });
  assert.deepEqual(result, {
    hasRoadmap: false,
    requiredAction: 'upload_cv',
    reused: false,
    roadmap: null,
    message: 'Analyze your CV first to generate a personalized roadmap.',
  });
});

test('newly generated fallback roadmap has explicit fields and persisted course IDs only', async () => {
  const skillId = '20000000-0000-4000-8000-000000000001';
  repository.findLatestActiveRoadmapForUser = async () => null;
  repository.findUserProfileContext = async () => ({
    id: 'u1', name: 'User', email: 'user@example.com',
    profiles: [{ target_career_id: '40000000-0000-4000-8000-000000000001', target_career: [{ title: 'Frontend Developer' }] }],
  });
  repository.findLatestCompletedCvAnalysis = async () => ({ cv: { id: 'cv1' }, analysis: { score: 80 } });
  repository.findUserSkills = async () => [];
  repository.findCvSkills = async () => [];
  repository.findCareerPathSkills = async () => [{ skill_id: skillId, skills: [{ id: skillId, name: 'React' }] }];
  const courseId = '60000000-0000-4000-8000-000000000001';
  repository.findCoursesForSkillIds = async () => [{
    skill_id: skillId,
    confidence: 1,
    source: 'admin_manual',
    courses: [{
      id: courseId, title: 'React Course', provider: 'MaharaTech',
      is_active: true, analysis_status: 'approved', popularity_score: 10,
    }],
  }];
  let atomicArgs;
  repository.createRoadmapAtomic = async (args) => { atomicArgs = args; return roadmapRow.id; };
  repository.findRoadmapByIdForUser = async () => roadmapRow;
  repository.findRoadmapSteps = async () => [{
    id: '50000000-0000-4000-8000-000000000001', roadmap_id: roadmapRow.id,
    skill_id: skillId, title: 'Learn React', description: 'Practice React',
    step_order: 1, progress: 0, is_completed: false, completed_at: null,
    skills: [{ id: skillId, name: 'React' }], roadmap_step_courses: [],
  }];

  const result = await service.generateRoadmap({ user: { id: 'u1' } });
  assert.equal(result.hasRoadmap, true);
  assert.equal(result.requiredAction, null);
  assert.equal(result.reused, false);
  assert.equal(result.roadmap.id, roadmapRow.id);
  assert.deepEqual(atomicArgs.steps[0].recommended_course_ids, [courseId]);
});
