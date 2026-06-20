const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mapCourse,
  mapCourseSummary,
  mapRecommendationCourse,
} = require('../src/modules/courses/course.mapper');

const row = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'React Fundamentals',
  description: null,
  provider: 'MaharaTech',
  url: null,
  thumbnail_url: null,
  video_url: null,
  level: null,
  duration: null,
  category: 'Frontend',
  learning_outcomes: null,
  language: null,
  price: '0.00',
  currency: null,
  is_free: true,
  rating: '4.50',
  reviews_count: 12,
  enrollment_count: 50,
  popularity_score: 80,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-20T10:00:00.000Z',
  course_skills: [{
    confidence: '0.9',
    source: 'admin_manual',
    skills: { id: '20000000-0000-4000-8000-000000000001', name: 'React' },
  }],
};

test('canonical mapper converts database fields, nulls, and user state', () => {
  const course = mapCourse(row, {
    isSaved: true,
    enrollment: { id: 'e1', status: 'active', progress: 25, completed_at: null },
  });
  assert.equal(course.thumbnailUrl, null);
  assert.equal(course.price, 0);
  assert.equal(course.rating, 4.5);
  assert.equal(course.isSaved, true);
  assert.equal(course.enrollment.progress, 25);
  assert.deepEqual(course.learningOutcomes, []);
  assert.equal(course.skills[0].confidence, 0.9);
  assert.equal(Object.hasOwn(course, 'created_by'), false);
});

test('recommendation and roadmap summary mappers keep compatible names', () => {
  const recommendation = mapRecommendationCourse(row, {
    score: 91,
    matchedSkills: ['React'],
    matchReasons: [{ code: 'covers_missing_skill', params: { skill: 'React' } }],
  });
  const summary = mapCourseSummary(row);
  assert.equal(recommendation.thumbnailUrl, summary.thumbnailUrl);
  assert.equal(recommendation.score, 91);
  assert.equal(recommendation.matchReasons[0].code, 'covers_missing_skill');
});
