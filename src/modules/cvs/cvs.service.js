const crypto = require('crypto');
const path = require('path');

const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const { buildPaginationMeta } = require('../../common/utils/pagination');
const {
  CV_ANALYSIS_GEMINI_SCHEMA,
  buildCvAnalysisMessages,
} = require('../ai/prompts/cvAnalysis.prompt');
const { generateJsonCompletion } = require('../ai/ai.service');
const { getRagContextForFeature } = require('../rag/rag.service');
const {
  scheduleJobsPreparationForUser,
} = require('../jobs/jobsPreparation.service');
const cvParserService = require('./cvParser.service');
const cvsRepository = require('./cvs.repository');

const CV_BUCKET_MAX_FILE_SIZE = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

const sanitizeName = (filename) =>
  path
    .basename(filename || 'cv.pdf', '.pdf')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const buildCvStoragePath = ({ userId, originalname }) => {
  const safeName = sanitizeName(originalname);
  return `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName || 'cv'}.pdf`;
};

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
};

const assertValidCvFile = (file) => {
  if (!file) {
    throw new AppError('CV PDF file is required', 400);
  }

  const extension = path.extname(file.originalname || '').toLowerCase();

  if (file.mimetype !== PDF_MIME_TYPE || extension !== '.pdf') {
    throw new AppError('Only PDF CV files are allowed', 415);
  }

  if (file.size > CV_BUCKET_MAX_FILE_SIZE) {
    throw new AppError('CV file must be 10MB or smaller', 413);
  }
};

const serializeCv = (cv) => {
  if (!cv) {
    return cv;
  }

  const safeCv = { ...cv };
  delete safeCv.parsed_text;
  return safeCv;
};

const pickCvAnalysis = (cv) =>
  Array.isArray(cv?.cv_analyses) ? cv.cv_analyses[0] : cv?.cv_analyses;

const serializeCvHistoryItem = (cv) => {
  const analysis = pickCvAnalysis(cv);

  return {
    id: cv.id,
    original_name: cv.original_name || null,
    mime_type: cv.mime_type || null,
    size_bytes: cv.size_bytes || null,
    status: cv.status,
    uploaded_at: cv.uploaded_at,
    created_at: cv.created_at,
    updated_at: cv.updated_at,
    has_file: Boolean(cv.storage_path || cv.file_url),
    has_analysis: Boolean(analysis),
    analysis: analysis
      ? {
          id: analysis.id,
          score: analysis.score,
          status: analysis.status,
          created_at: analysis.created_at,
        }
      : null,
  };
};

const normalizeAnalysis = (analysis) => {
  const score = Number.parseInt(analysis.score, 10);

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    summary: String(analysis.summary || ''),
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
    detected_skills: Array.isArray(analysis.detected_skills)
      ? analysis.detected_skills
      : [],
    missing_skills: Array.isArray(analysis.missing_skills)
      ? analysis.missing_skills
      : [],
    recommended_roles: Array.isArray(analysis.recommended_roles)
      ? analysis.recommended_roles
      : [],
    interview_focus: Array.isArray(analysis.interview_focus)
      ? analysis.interview_focus
      : [],
    job_keywords: Array.isArray(analysis.job_keywords)
      ? analysis.job_keywords
      : [],
    extracted:
      analysis.extracted && typeof analysis.extracted === 'object'
        ? analysis.extracted
        : {},
  };
};

const normalizeDetectedSkill = (skill) => {
  const name = String(skill?.name || '').trim();

  if (!name) {
    return null;
  }

  return {
    name,
    category: skill.category ? String(skill.category).trim() : null,
    level: skill.level ? String(skill.level).trim() : null,
    confidence:
      typeof skill.confidence === 'number'
        ? Math.max(0, Math.min(1, skill.confidence))
        : null,
    evidence: skill.evidence ? String(skill.evidence).trim() : null,
  };
};

const formatUserContext = async (userId) => {
  const user = await cvsRepository.findUserContextById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const profileRow = Array.isArray(user.profiles)
    ? user.profiles[0]
    : user.profiles;
  const details = await cvsRepository.findProfileDetails(profileRow?.id, userId);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    profile: profileRow
      ? {
          id: profileRow.id,
          location: profileRow.location,
          university: profileRow.university,
          major: profileRow.major,
          headline: profileRow.headline,
          bio: profileRow.bio,
          education_level:
            profileRow.education_level_lookup?.education_level || null,
          current_status:
            profileRow.current_status_lookup?.current_status || null,
          experience_level:
            profileRow.experience_year_lookup?.experience_level || null,
          target_career: profileRow.target_career?.title || null,
        }
      : null,
    ...details,
  };
};

const normalizeDetectedSkills = (detectedSkills) => {
  const seen = new Set();
  const normalized = [];

  detectedSkills.forEach((skill) => {
    const normalizedSkill = normalizeDetectedSkill(skill);
    if (!normalizedSkill) {
      return;
    }

    const key = normalizedSkill.name.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(normalizedSkill);
  });

  return normalized;
};

const upsertDetectedSkills = async ({ userId, cvId, detectedSkills }) => {
  const normalizedSkills = normalizeDetectedSkills(detectedSkills);
  const savedSkills = [];

  for (const detectedSkill of normalizedSkills) {
    let skill = await cvsRepository.findSkillByNameCaseInsensitive(
      detectedSkill.name,
    );

    if (!skill) {
      skill = await cvsRepository.createSkill(detectedSkill);
    }

    await cvsRepository.upsertCvSkill({ cvId, skillId: skill.id });
    await cvsRepository.upsertUserSkill({
      userId,
      skillId: skill.id,
      level: detectedSkill.level,
    });

    savedSkills.push({
      ...detectedSkill,
      skill_id: skill.id,
    });
  }

  return savedSkills;
};

const analyzeCv = async ({ file, user }) => {
  const userId = getAuthenticatedUserId(user);
  assertValidCvFile(file);

  const storagePath = buildCvStoragePath({
    userId,
    originalname: file.originalname,
  });

  await cvsRepository.uploadCvFile({
    storagePath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  let cv = null;

  try {
    cv = await cvsRepository.createCv({
      user_id: userId,
      storage_path: storagePath,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      parsed_text: null,
      status: 'parsing',
    });

    const parsedText = await cvParserService.parsePdfBuffer(file.buffer);
    cv = await cvsRepository.updateCv(cv.id, {
      parsed_text: parsedText,
      status: 'analyzing',
    });

    const [profileContext, ragContext] = await Promise.all([
      formatUserContext(userId),
      getRagContextForFeature('cv_analysis'),
    ]);

    const messages = buildCvAnalysisMessages({
      profile: profileContext,
      cvText: parsedText,
      ragContext,
    });

    const aiResult = await generateJsonCompletion({
      userId,
      feature: 'cv_analysis',
      messages,
      responseSchemaHint: 'CV_ANALYSIS_RESPONSE_SCHEMA',
      responseJsonSchema: CV_ANALYSIS_GEMINI_SCHEMA,
    });

    const normalizedAnalysis = normalizeAnalysis(aiResult.data);
    const detectedSkills = await upsertDetectedSkills({
      userId,
      cvId: cv.id,
      detectedSkills: normalizedAnalysis.detected_skills,
    });

    const analysis = await cvsRepository.createCvAnalysis({
      cv_id: cv.id,
      score: normalizedAnalysis.score,
      model: aiResult.model,
      summary: normalizedAnalysis.summary,
      strengths: normalizedAnalysis.strengths,
      weaknesses: normalizedAnalysis.weaknesses,
      suggestions: normalizedAnalysis.suggestions,
      detected_skills: detectedSkills,
      extracted: {
        ...normalizedAnalysis.extracted,
        missing_skills: normalizedAnalysis.missing_skills,
        recommended_roles: normalizedAnalysis.recommended_roles,
        interview_focus: normalizedAnalysis.interview_focus,
        job_keywords: normalizedAnalysis.job_keywords,
      },
      generated_by_type: 'ai',
      status: 'completed',
    });

    cv = await cvsRepository.updateCv(cv.id, { status: 'completed' });

    scheduleJobsPreparationForUser({
      userId,
      reason: 'cv_analysis_completed',
      syncIfEmpty: true,
      generateMatches: true,
    });

    return {
      cv: serializeCv(cv),
      analysis,
    };
  } catch (error) {
    if (cv?.id) {
      try {
        await cvsRepository.updateCv(cv.id, { status: 'failed' });
      } catch (updateError) {
        logger.warn('Failed to mark CV analysis as failed', {
          cvId: cv.id,
          reason: updateError.message,
        });
      }
    } else {
      try {
        await cvsRepository.deleteCvFile(storagePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded CV file', {
          storagePath,
          reason: cleanupError.message,
        });
      }
    }

    throw error;
  }
};

const getLatestAnalysis = async (user) => {
  const userId = getAuthenticatedUserId(user);

  const latest = await cvsRepository.findLatestCompletedAnalysisForUser(userId);
  const analysis = Array.isArray(latest?.cv_analyses)
    ? latest.cv_analyses[0]
    : latest?.cv_analyses;

  if (!latest || !analysis) {
    return {
      hasAnalysis: false,
      requiredAction: 'upload_cv',
    };
  }

  delete latest.cv_analyses;

  return {
    hasAnalysis: true,
    requiredAction: null,
    cv: serializeCv(latest),
    analysis,
  };
};

const getStatus = async (user) => {
  const userId = getAuthenticatedUserId(user);

  const latestCv = await cvsRepository.findLatestCvForUser(userId);

  if (!latestCv) {
    return {
      hasCv: false,
      hasCompletedAnalysis: false,
      latestCvStatus: null,
      requiredAction: 'upload_cv',
    };
  }

  const hasCompletedAnalysis = latestCv.status === 'completed';

  return {
    hasCv: true,
    hasCompletedAnalysis,
    latestCvStatus: latestCv.status,
    requiredAction: hasCompletedAnalysis ? null : 'wait_for_analysis',
  };
};

const getHistory = async (user, query = {}) => {
  const userId = getAuthenticatedUserId(user);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const status = typeof query.status === 'string' ? query.status.trim() : '';

  const { items, totalItems } = await cvsRepository.findCvHistoryForUser({
    userId,
    page,
    limit,
    status,
  });

  return {
    items: items.map(serializeCvHistoryItem),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
};

const getFileUrl = async (user, cvId, query = {}) => {
  const userId = getAuthenticatedUserId(user);
  const expiresIn = Math.min(
    3600,
    Math.max(60, Number(query.expiresIn) || 300),
  );
  const cv = await cvsRepository.findCvForUserById({ userId, cvId });

  if (!cv) {
    throw new AppError('CV not found', 404);
  }

  if (!cv.storage_path) {
    if (cv.file_url) {
      return {
        cv: serializeCvHistoryItem(cv),
        url: cv.file_url,
        expiresIn: null,
        expiresAt: null,
        source: 'file_url',
      };
    }

    throw new AppError('CV file is not available', 404);
  }

  const signedUrl = await cvsRepository.createCvFileSignedUrl({
    storagePath: cv.storage_path,
    expiresIn,
  });

  if (!signedUrl?.signedUrl) {
    throw new AppError('CV file URL could not be created', 500);
  }

  return {
    cv: serializeCvHistoryItem(cv),
    url: signedUrl.signedUrl,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    source: 'signed_url',
  };
};

module.exports = {
  CV_BUCKET_MAX_FILE_SIZE,
  analyzeCv,
  getLatestAnalysis,
  getStatus,
  getHistory,
  getFileUrl,
};

// ===== Admin CV analyses (read-only) =====
const ADMIN_CV_ANALYSIS_STATUSES = ['completed', 'failed', 'reviewed'];

const normalizeCvAnalysesQuery = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const status =
    typeof query.status === 'string' ? query.status.trim() : '';

  if (status && !ADMIN_CV_ANALYSIS_STATUSES.includes(status)) {
    throw new AppError(
      'Status must be one of completed, failed, or reviewed',
      400,
    );
  }

  return { page, limit, status };
};

const serializeAdminCvAnalysis = (row) => {
  if (!row) {
    return row;
  }

  const cv = row.cvs || {};
  const user = cv.users || {};
  const extracted = row.extracted && typeof row.extracted === 'object' ? row.extracted : {};

  return {
    id: row.id,
    cv_id: row.cv_id,
    score: row.score,
    model: row.model,
    summary: row.summary,
    strengths: Array.isArray(row.strengths) ? row.strengths : [],
    weaknesses: Array.isArray(row.weaknesses) ? row.weaknesses : [],
    suggestions: Array.isArray(row.suggestions) ? row.suggestions : [],
    detected_skills: Array.isArray(row.detected_skills) ? row.detected_skills : [],
    extracted,
    generated_by_type: row.generated_by_type,
    status: row.status,
    reviewed_by_admin_id: row.reviewed_by_admin_id || null,
    reviewed_at: row.reviewed_at || null,
    created_at: row.created_at,
    cv: {
      id: cv.id || null,
      original_name: cv.original_name || null,
      mime_type: cv.mime_type || null,
      size_bytes: cv.size_bytes || null,
      status: cv.status || null,
      created_at: cv.created_at || null,
    },
    user: {
      id: user.id || null,
      name: user.name || null,
      email: user.email || null,
    },
  };
};

const listCvAnalyses = async (query) => {
  const filters = normalizeCvAnalysesQuery(query);
  const { items, totalItems } = await cvsRepository.findAllCvAnalyses(filters);

  return {
    items: items.map(serializeAdminCvAnalysis),
    pagination: buildPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      totalItems,
    }),
  };
};

const getCvAnalysisById = async (analysisId) => {
  if (!analysisId) {
    throw new AppError('CV analysis id is required', 400);
  }

  const row = await cvsRepository.findCvAnalysisById(analysisId);

  if (!row) {
    throw new AppError('CV analysis not found', 404);
  }

  return serializeAdminCvAnalysis(row);
};

Object.assign(module.exports, {
  listCvAnalyses,
  getCvAnalysisById,
});
