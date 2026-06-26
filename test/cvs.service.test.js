const test = require('node:test');
const assert = require('node:assert/strict');

const repository = require('../src/modules/cvs/cvs.repository');
const service = require('../src/modules/cvs/cvs.service');

const originals = { ...repository };
test.afterEach(() => Object.assign(repository, originals));

const cvRow = {
  id: '10000000-0000-4000-8000-000000000001',
  user_id: 'user-1',
  file_url: null,
  storage_path: 'user-1/cv.pdf',
  original_name: 'Ahmed Flutter CV.pdf',
  mime_type: 'application/pdf',
  size_bytes: 123456,
  status: 'completed',
  uploaded_at: '2026-06-26T10:00:00.000Z',
  created_at: '2026-06-26T10:00:00.000Z',
  updated_at: '2026-06-26T10:01:00.000Z',
  cv_analyses: [
    {
      id: '20000000-0000-4000-8000-000000000001',
      score: 86,
      status: 'completed',
      created_at: '2026-06-26T10:02:00.000Z',
    },
  ],
};

test('history is user-scoped, paginated, and hides storage paths', async () => {
  let args;
  repository.findCvHistoryForUser = async (input) => {
    args = input;
    return { items: [cvRow], totalItems: 3 };
  };

  const result = await service.getHistory(
    { id: 'user-1' },
    { page: 2, limit: 1, status: 'completed' },
  );

  assert.deepEqual(args, {
    userId: 'user-1',
    page: 2,
    limit: 1,
    status: 'completed',
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, cvRow.id);
  assert.equal(result.items[0].has_file, true);
  assert.equal(result.items[0].has_analysis, true);
  assert.equal(result.items[0].analysis.score, 86);
  assert.equal(result.items[0].storage_path, undefined);
  assert.equal(result.items[0].file_url, undefined);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 1,
    totalItems: 3,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
    nextPage: 3,
    previousPage: 1,
  });
});

test('file URL requires ownership lookup and returns a bounded signed URL', async () => {
  let lookupArgs;
  let signedArgs;
  repository.findCvForUserById = async (input) => {
    lookupArgs = input;
    return cvRow;
  };
  repository.createCvFileSignedUrl = async (input) => {
    signedArgs = input;
    return { signedUrl: 'https://example.supabase.co/signed-cv.pdf' };
  };

  const result = await service.getFileUrl(
    { id: 'user-1' },
    cvRow.id,
    { expiresIn: 120 },
  );

  assert.deepEqual(lookupArgs, { userId: 'user-1', cvId: cvRow.id });
  assert.deepEqual(signedArgs, { storagePath: cvRow.storage_path, expiresIn: 120 });
  assert.equal(result.source, 'signed_url');
  assert.equal(result.expiresIn, 120);
  assert.match(result.url, /^https:\/\/example\.supabase\.co/);
  assert.equal(result.cv.id, cvRow.id);
});

test('file URL falls back to stored file_url for older rows without storage path', async () => {
  repository.findCvForUserById = async () => ({
    ...cvRow,
    storage_path: null,
    file_url: 'https://cdn.example.com/legacy-cv.pdf',
  });
  repository.createCvFileSignedUrl = async () => {
    throw new Error('signed URL should not be requested');
  };

  const result = await service.getFileUrl({ id: 'user-1' }, cvRow.id);

  assert.equal(result.source, 'file_url');
  assert.equal(result.url, 'https://cdn.example.com/legacy-cv.pdf');
  assert.equal(result.expiresIn, null);
  assert.equal(result.expiresAt, null);
});

test('file URL returns stable errors for missing CVs and unavailable files', async () => {
  repository.findCvForUserById = async () => null;
  await assert.rejects(
    service.getFileUrl({ id: 'user-1' }, cvRow.id),
    (error) => error.statusCode === 404 && error.message === 'CV not found',
  );

  repository.findCvForUserById = async () => ({
    ...cvRow,
    storage_path: null,
    file_url: null,
  });
  await assert.rejects(
    service.getFileUrl({ id: 'user-1' }, cvRow.id),
    (error) =>
      error.statusCode === 404 && error.message === 'CV file is not available',
  );
});

test('history and file URL require authentication', async () => {
  await assert.rejects(
    service.getHistory(null),
    (error) => error.statusCode === 401 && error.message === 'Authentication required',
  );
  await assert.rejects(
    service.getFileUrl({}, cvRow.id),
    (error) => error.statusCode === 401 && error.message === 'Authentication required',
  );
});
