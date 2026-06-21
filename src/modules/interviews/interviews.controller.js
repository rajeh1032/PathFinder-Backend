const asyncHandler = require('../../common/utils/asyncHandler');
const { sendSuccess } = require('../../common/utils/apiResponse');
const interviewsService = require('./interviews.service');

const listCareerPaths = asyncHandler(async (req, res) => {
  const careerPaths = await interviewsService.listCareerPaths();

  return sendSuccess(res, careerPaths, 'Career paths fetched successfully');
});

const createInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.createInterviewSession({
    userId: req.user?.userId || req.user?.id || null,
    payload: req.body,
  });

  return sendSuccess(res, result, 'Interview session created successfully', 201);
});

const listInterviewSessions = asyncHandler(async (req, res) => {
  const result = await interviewsService.listInterviewSessions({
    user: req.user || null,
    query: req.query || {},
  });

  return sendSuccess(
    res,
    {
      items: result.data,
      summary: result.summary,
    },
    'Interview sessions fetched successfully',
    200,
    { pagination: result.pagination },
  );
});

const listAdminInterviewSessions = asyncHandler(async (req, res) => {
  const result = await interviewsService.listAdminInterviewSessions({
    query: req.query || {},
  });

  return sendSuccess(
    res,
    {
      items: result.data,
      summary: result.summary || null,
    },
    'Interview sessions fetched successfully',
    200,
    { pagination: result.pagination },
  );
});

const getInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.getInterviewSession({
    user: req.user || null,
    sessionId: req.params.id,
  });

  return sendSuccess(res, result, 'Interview session fetched successfully');
});

const getAdminInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.getAdminInterviewSession({
    sessionId: req.params.id,
  });

  return sendSuccess(res, result, 'Interview session fetched successfully');
});

const getInterviewSessionQuestions = asyncHandler(async (req, res) => {
  const result = await interviewsService.getInterviewSessionQuestions({
    user: req.user || null,
    sessionId: req.params.id,
  });

  return sendSuccess(res, result, 'Interview questions fetched successfully');
});

const updateInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.updateInterviewSession({
    user: req.user || null,
    sessionId: req.params.id,
    payload: req.body,
  });

  return sendSuccess(res, result, 'Interview session updated successfully');
});

const answerInterviewQuestion = asyncHandler(async (req, res) => {
  const result = await interviewsService.answerInterviewQuestion({
    user: req.user || null,
    sessionId: req.params.id,
    questionId: req.params.questionId,
    payload: req.body,
  });

  return sendSuccess(res, result, 'Answer saved successfully');
});

const skipInterviewQuestion = asyncHandler(async (req, res) => {
  const result = await interviewsService.skipInterviewQuestion({
    user: req.user || null,
    sessionId: req.params.id,
    questionId: req.params.questionId,
  });

  return sendSuccess(res, result, 'Interview question skipped successfully');
});

const finishInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.finishInterviewSession({
    user: req.user || null,
    sessionId: req.params.id,
    payload: req.body,
  });

  return sendSuccess(res, result, 'Interview session completed successfully');
});

const getInterviewSessionResult = asyncHandler(async (req, res) => {
  const result = await interviewsService.getInterviewSessionResult({
    user: req.user || null,
    sessionId: req.params.id,
  });

  return sendSuccess(res, result, 'Interview result fetched successfully');
});

const cancelInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.cancelInterviewSession({
    user: req.user || null,
    sessionId: req.params.id,
  });

  return sendSuccess(res, result, 'Interview session cancelled successfully');
});

const deleteAdminInterviewSession = asyncHandler(async (req, res) => {
  const result = await interviewsService.deleteAdminInterviewSession({
    sessionId: req.params.id,
  });

  return sendSuccess(res, result, 'Interview session deleted successfully');
});

module.exports = {
  listCareerPaths,
  createInterviewSession,
  listInterviewSessions,
  listAdminInterviewSessions,
  getInterviewSession,
  getAdminInterviewSession,
  getInterviewSessionQuestions,
  updateInterviewSession,
  answerInterviewQuestion,
  skipInterviewQuestion,
  finishInterviewSession,
  getInterviewSessionResult,
  cancelInterviewSession,
  deleteAdminInterviewSession,
};
