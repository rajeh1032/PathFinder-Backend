const crypto = require('crypto');
const path = require('path');

const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const { buildCvAnalysisMessages } = require('../ai/prompts/cvAnalysis.prompt');
const { generateJsonCompletion } = require('../ai/openai.service');
const { getRagContextForFeature } = require('../rag/rag.service');
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

const assertAuthenticatedUser = (user) => {
  if (!user?.id) {
    throw new AppError('Authentication required', 401);
  }
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
  assertAuthenticatedUser(user);
  assertValidCvFile(file);

  const storagePath = buildCvStoragePath({
    userId: user.id,
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
      user_id: user.id,
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
      formatUserContext(user.id),
      getRagContextForFeature('cv_analysis'),
    ]);

    const messages = buildCvAnalysisMessages({
      profile: profileContext,
      cvText: parsedText,
      ragContext,
    });

    const aiResult = await generateJsonCompletion({
      userId: user.id,
      feature: 'cv_analysis',
      messages,
      responseSchemaHint: 'CV_ANALYSIS_RESPONSE_SCHEMA',
    });

    const normalizedAnalysis = normalizeAnalysis(aiResult.data);
    const detectedSkills = await upsertDetectedSkills({
      userId: user.id,
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
  assertAuthenticatedUser(user);

  const latest = await cvsRepository.findLatestCompletedAnalysisForUser(user.id);
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
  assertAuthenticatedUser(user);

  const latestCv = await cvsRepository.findLatestCvForUser(user.id);

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

module.exports = {
  CV_BUCKET_MAX_FILE_SIZE,
  analyzeCv,
  getLatestAnalysis,
  getStatus,
};
