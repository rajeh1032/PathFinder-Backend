const test = require('node:test');
const assert = require('node:assert/strict');

const schemas = require('../src/modules/courses/courses.schema');

test('course UUID and pagination/filter validation reject invalid input', () => {
  assert.ok(schemas.uuidParamSchema.validate({ id: 'not-a-uuid' }).error);
  assert.ok(schemas.coursesQuerySchema.validate({ page: 0 }).error);
  assert.ok(schemas.coursesQuerySchema.validate({ limit: 51 }).error);
  assert.ok(schemas.coursesQuerySchema.validate({ sort: 'random' }).error);
  assert.ok(schemas.coursesQuerySchema.validate({ q: 'react,or.hack' }).error);
});

test('enrollment schema rejects contradictory completion state', () => {
  assert.ok(schemas.updateEnrollmentSchema.validate({ status: 'completed', progress: 90 }).error);
  assert.ok(schemas.updateEnrollmentSchema.validate({ status: 'active', progress: 100 }).error);
  assert.equal(schemas.updateEnrollmentSchema.validate({ progress: 100 }).error, undefined);
});

test('import schema restricts confirmation provider and requires URL identity', () => {
  const base = {
    external_id: '42',
    url: 'https://maharatech.gov.eg/mod/page/view.php?id=42',
    metadata: { title: 'Course' },
    analysis: {},
  };
  assert.ok(schemas.confirmCourseImportSchema.validate({ ...base, provider: 'Other' }).error);
  assert.equal(schemas.confirmCourseImportSchema.validate({ ...base, provider: 'MaharaTech' }).error, undefined);
  assert.ok(schemas.previewCourseImportSchema.validate({ url: 'not-a-url' }).error);
});
