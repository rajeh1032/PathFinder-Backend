const dns = require('node:dns').promises;
const net = require('node:net');
const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const { buildPaginationMeta } = require('../../common/utils/pagination');
const { generateJsonCompletion } = require('../ai/ai.service');
const {
  COURSE_ANALYSIS_GEMINI_SCHEMA,
  buildCourseAnalysisMessages,
} = require('../ai/prompts/courseAnalysis.prompt');
const { getRagContextForFeature } = require('../rag/rag.service');
const coursesRepository = require('./courses.repository');
const {
  mapCourse,
  mapEnrollment,
  mapRecommendationCourse,
} = require('./course.mapper');

const METADATA_FETCH_TIMEOUT_MS = 10000;
const METADATA_MAX_BYTES = 1024 * 1024;
const METADATA_MAX_REDIRECTS = 3;
const COURSE_RECOMMENDATION_CONFIDENCE_THRESHOLD = 0.6;
const ALLOWED_COURSE_HOSTS = new Set(['maharatech.gov.eg', 'www.maharatech.gov.eg']);

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
};

const getEmbeddedRow = (row, key) => {
  const value = row?.[key];
  return Array.isArray(value) ? value[0] : value;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const clampNumber = (value, min, max, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, number));
};

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueStrings = (values) => {
  const seen = new Set();
  const output = [];

  safeArray(values).forEach((value) => {
    const text = String(value || '').trim();
    const key = normalizeName(text);
    if (!text || seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(text);
  });

  return output;
};

const detectCourseProvider = (rawUrl) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    throw new AppError('Invalid course URL', 400);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port
  ) {
    throw new AppError('Course URL must use HTTPS without credentials or a custom port', 400, null, 'VALIDATION_ERROR');
  }

  if (ALLOWED_COURSE_HOSTS.has(hostname)) {
    const externalId = parsedUrl.searchParams.get('id');
    if (!externalId) {
      throw new AppError('MaharaTech course URL must include an id query parameter', 400);
    }

    return {
      provider: 'MaharaTech',
      external_id: externalId,
      url: parsedUrl.toString(),
    };
  }

  throw new AppError('Only MaharaTech course imports are supported for this MVP', 400);
};

const isPrivateNetworkAddress = (address) => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }

  const normalized = String(address).toLowerCase();
  return normalized === '::1' || normalized === '::' ||
    normalized.startsWith('fc') || normalized.startsWith('fd') ||
    normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
    normalized.startsWith('fea') || normalized.startsWith('feb') ||
    normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.');
};

const assertPublicCourseUrl = async (rawUrl) => {
  const providerInfo = detectCourseProvider(rawUrl);
  const addresses = await dns.lookup(new URL(providerInfo.url).hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateNetworkAddress(address))) {
    throw new AppError('Course URL resolved to a blocked network address', 400, null, 'VALIDATION_ERROR');
  }
  return providerInfo;
};

const stripTags = (value) =>
  String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const findMetaContent = (html, propertyNames) => {
  for (const name of propertyNames) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedName}["'][^>]*>`,
        'i',
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return stripTags(match[1]);
      }
    }
  }

  return null;
};

const extractLearningOutcomes = (html) => {
  const text = stripTags(html);
  const markerMatch = text.match(
    /(learning outcomes|what you will learn|outcomes|objectives)[:\s]+(.{40,900})/i,
  );

  if (!markerMatch?.[2]) {
    return [];
  }

  return uniqueStrings(
    markerMatch[2]
      .split(/(?:\s*[•\-]\s*|\.\s+|\n+)/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 8)
      .slice(0, 8),
  );
};

const fetchPublicCourseMetadata = async (url) => {
  if (typeof fetch !== 'function') {
    return {
      metadata: {},
      blocked: true,
      reason: 'Runtime fetch API is not available',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), METADATA_FETCH_TIMEOUT_MS);

  try {
    let currentUrl = (await assertPublicCourseUrl(url)).url;
    let response;

    for (let redirectCount = 0; redirectCount <= METADATA_MAX_REDIRECTS; redirectCount += 1) {
      response = await fetch(currentUrl, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; PathFinderCourseImporter/1.0; +https://pathfinder.local)',
          accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location || redirectCount === METADATA_MAX_REDIRECTS) {
        throw new Error('Course page exceeded the redirect limit');
      }
      currentUrl = (await assertPublicCourseUrl(new URL(location, currentUrl).toString())).url;
    }

    if (!response.ok) {
      return {
        metadata: {},
        blocked: true,
        reason: `Course page returned HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(contentType)) {
      return { metadata: {}, blocked: true, reason: 'Course page did not return HTML' };
    }
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > METADATA_MAX_BYTES) {
      return { metadata: {}, blocked: true, reason: 'Course page response is too large' };
    }
    const reader = response.body?.getReader();
    const chunks = [];
    let receivedBytes = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > METADATA_MAX_BYTES) {
          await reader.cancel();
          return { metadata: {}, blocked: true, reason: 'Course page response is too large' };
        }
        chunks.push(Buffer.from(value));
      }
    }
    const html = reader ? Buffer.concat(chunks).toString('utf8') : await response.text();
    const title =
      findMetaContent(html, ['og:title', 'twitter:title']) ||
      stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') ||
      stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
    const description =
      findMetaContent(html, ['description', 'og:description', 'twitter:description']) ||
      stripTags(html.match(/<section[^>]*(?:summary|overview|description)[^>]*>([\s\S]*?)<\/section>/i)?.[1] || '');
    const thumbnail_url = findMetaContent(html, ['og:image', 'twitter:image']);
    const category = findMetaContent(html, ['article:section', 'category']);

    return {
      metadata: {
        title: title || undefined,
        description: description || undefined,
        category: category || undefined,
        thumbnail_url: thumbnail_url || undefined,
        learning_outcomes: extractLearningOutcomes(html),
      },
      blocked: false,
      reason: null,
    };
  } catch (error) {
    return {
      metadata: {},
      blocked: true,
      reason: error.name === 'AbortError'
        ? 'Course page request timed out'
        : 'Course page could not be fetched safely',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const mergeMetadata = ({ providerInfo, fetchedMetadata, manualMetadata }) => {
  const learningOutcomes = uniqueStrings([
    ...safeArray(fetchedMetadata.learning_outcomes),
    ...safeArray(manualMetadata.learning_outcomes),
  ]);

  return {
    provider: providerInfo.provider,
    external_id: providerInfo.external_id,
    url: providerInfo.url,
    title: manualMetadata.title || fetchedMetadata.title || null,
    description: manualMetadata.description || fetchedMetadata.description || null,
    category: manualMetadata.category || fetchedMetadata.category || null,
    thumbnail_url: manualMetadata.thumbnail_url || fetchedMetadata.thumbnail_url || null,
    learning_outcomes: learningOutcomes,
    language: manualMetadata.language || null,
    duration: manualMetadata.duration || null,
    level: manualMetadata.level || null,
    is_free: manualMetadata.is_free,
  };
};

const hasEnoughMetadataForAnalysis = (metadata) =>
  Boolean(
    metadata.title &&
    (metadata.description || safeArray(metadata.learning_outcomes).length > 0),
  );

const toSkillCatalogForPrompt = (skills) =>
  skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    aliases: safeArray(skill.aliases),
  }));

const normalizeCourseAnalysis = (analysis, metadata) => ({
  category: String(analysis?.category || metadata.category || 'General').trim(),
  level: String(analysis?.level || metadata.level || 'Beginner').trim(),
  duration:
    analysis?.duration === null || analysis?.duration === undefined
      ? metadata.duration || null
      : String(analysis.duration).trim() || null,
  language: String(analysis?.language || metadata.language || 'Unknown').trim(),
  skills_taught: safeArray(analysis?.skills_taught)
    .map((skill) => ({
      name: String(skill?.name || '').trim(),
      confidence: clampNumber(skill?.confidence, 0, 1, 0),
    }))
    .filter((skill) => skill.name)
    .slice(0, 12),
  prerequisites: uniqueStrings(analysis?.prerequisites).slice(0, 8),
  learning_outcomes: uniqueStrings(
    safeArray(analysis?.learning_outcomes).length
      ? analysis.learning_outcomes
      : metadata.learning_outcomes,
  ).slice(0, 8),
  summary: String(analysis?.summary || metadata.description || '').trim(),
  confidence: clampNumber(analysis?.confidence, 0, 1, 0),
});

const buildSkillLookup = (skills) => {
  const lookup = new Map();

  skills.forEach((skill) => {
    [skill.name, ...safeArray(skill.aliases)].forEach((name) => {
      const key = normalizeName(name);
      if (key && !lookup.has(key)) {
        lookup.set(key, skill);
      }
    });
  });

  return lookup;
};

const matchAnalyzedSkills = ({ analysis, skills }) => {
  const lookup = buildSkillLookup(skills);
  const matchedMap = new Map();
  const unmatched = [];

  analysis.skills_taught.forEach((skill) => {
    const key = normalizeName(skill.name);
    const matchedSkill = lookup.get(key);

    if (matchedSkill) {
      const existing = matchedMap.get(matchedSkill.id);
      matchedMap.set(matchedSkill.id, {
        skill_id: matchedSkill.id,
        name: matchedSkill.name,
        category: matchedSkill.category,
        confidence: Math.max(existing?.confidence || 0, skill.confidence),
        source: 'ai_analysis',
      });
      return;
    }

    unmatched.push({
      name: skill.name,
      confidence: skill.confidence,
      source: 'ai_analysis',
    });
  });

  return {
    matched_skills: [...matchedMap.values()],
    unmatched_skills: unmatched,
  };
};

const analyzeCourseMetadata = async ({ userId, metadata, skills }) => {
  const [ragContext] = await Promise.all([getRagContextForFeature('course_analysis')]);
  const messages = buildCourseAnalysisMessages({
    metadata,
    skillsCatalog: toSkillCatalogForPrompt(skills),
    ragContext,
  });

  const aiResult = await generateJsonCompletion({
    userId,
    feature: 'course_analysis',
    messages,
    responseSchemaHint: 'COURSE_ANALYSIS_RESPONSE_SCHEMA',
    responseJsonSchema: COURSE_ANALYSIS_GEMINI_SCHEMA,
  });

  return normalizeCourseAnalysis(aiResult.data, metadata);
};

const previewCourseImport = async ({ user, payload }) => {
  const userId = getAuthenticatedUserId(user);
  const providerInfo = detectCourseProvider(payload.url);
  const duplicate = await coursesRepository.findCourseByProviderExternalId({
    provider: providerInfo.provider,
    externalId: providerInfo.external_id,
  });

  if (duplicate) {
    return {
      alreadyImported: true,
      courseId: duplicate.id,
      message: 'This MaharaTech course is already imported.',
    };
  }

  const fetched = await fetchPublicCourseMetadata(providerInfo.url);
  const metadata = mergeMetadata({
    providerInfo,
    fetchedMetadata: fetched.metadata,
    manualMetadata: payload.metadata || {},
  });

  if (!hasEnoughMetadataForAnalysis(metadata)) {
    return {
      status: 'needs_manual_metadata',
      provider: providerInfo.provider,
      external_id: providerInfo.external_id,
      url: providerInfo.url,
      message:
        'Course metadata could not be fetched completely. Please submit title, description, and learning outcomes manually.',
      metadata,
      metadataFetch: {
        blocked: fetched.blocked,
        reason: fetched.reason,
      },
    };
  }

  const skills = await coursesRepository.findAllActiveSkills();
  const analysis = await analyzeCourseMetadata({ userId, metadata, skills });
  const { matched_skills, unmatched_skills } = matchAnalyzedSkills({
    analysis,
    skills,
  });

  return {
    status: 'pending_review',
    provider: providerInfo.provider,
    external_id: providerInfo.external_id,
    metadata,
    analysis,
    matched_skills,
    unmatched_skills,
  };
};

const normalizeMatchedSkillsForSave = async (matchedSkills) => {
  const skills = await coursesRepository.findAllActiveSkills();
  const lookup = buildSkillLookup(skills);
  const rowsBySkillId = new Map();

  matchedSkills.forEach((skill) => {
    const skillId = skill.skill_id || skill.id || lookup.get(normalizeName(skill.name))?.id;
    if (!skillId) {
      return;
    }

    const existing = rowsBySkillId.get(skillId);
    rowsBySkillId.set(skillId, {
      skill_id: skillId,
      name: existing?.name || skill.name,
      category: existing?.category || skill.category || null,
      confidence: Math.max(
        existing?.confidence || 0,
        clampNumber(skill.confidence, 0, 1, 1),
      ),
      source: skill.source || 'ai_analysis',
    });
  });

  return [...rowsBySkillId.values()];
};

const confirmCourseImport = async ({ user, payload }) => {
  const userId = getAuthenticatedUserId(user);
  const providerInfo = detectCourseProvider(payload.url);
  if (
    payload.provider !== providerInfo.provider ||
    payload.external_id !== providerInfo.external_id
  ) {
    throw new AppError(
      'Provider and external ID must match the validated course URL',
      400,
      null,
      'VALIDATION_ERROR',
    );
  }
  const duplicate = await coursesRepository.findCourseByProviderExternalId({
    provider: providerInfo.provider,
    externalId: providerInfo.external_id,
  });

  if (duplicate) {
    return {
      alreadyImported: true,
      courseId: duplicate.id,
      message: 'This MaharaTech course is already imported.',
    };
  }

  if (!payload.metadata.title) {
    throw new AppError('Course title is required before confirm', 400);
  }

  const analysis = normalizeCourseAnalysis(payload.analysis, payload.metadata);
  const learningOutcomes = safeArray(analysis.learning_outcomes).length
    ? analysis.learning_outcomes
    : safeArray(payload.metadata.learning_outcomes);

  const course = await coursesRepository.createCourse({
    title: payload.metadata.title,
    description: payload.metadata.description || analysis.summary || null,
    provider: providerInfo.provider,
    external_id: providerInfo.external_id,
    url: providerInfo.url,
    thumbnail_url: payload.metadata.thumbnail_url || null,
    level: analysis.level || payload.metadata.level || null,
    duration: analysis.duration || payload.metadata.duration || null,
    category: analysis.category || payload.metadata.category || null,
    learning_outcomes: learningOutcomes,
    language: analysis.language || payload.metadata.language || null,
    is_free:
      typeof payload.is_free === 'boolean'
        ? payload.is_free
        : typeof payload.metadata.is_free === 'boolean'
          ? payload.metadata.is_free
          : providerInfo.provider === 'MaharaTech',
    is_active: true,
    analysis_status: 'approved',
    analysis_confidence: analysis.confidence,
    created_by: userId,
    updated_by: userId,
  });

  const matchedSkills = await normalizeMatchedSkillsForSave(payload.matched_skills || []);
  const courseSkillRows = matchedSkills.map((skill) => ({
    course_id: course.id,
    skill_id: skill.skill_id,
    confidence: clampNumber(skill.confidence, 0, 1, 1),
    source: skill.source || 'ai_analysis',
  }));
  const savedCourseSkills = await coursesRepository.upsertCourseSkills(courseSkillRows);

  return {
    course: {
      id: course.id,
      ...course,
    },
    matched_skills: savedCourseSkills.map((row) => {
      const skill = getEmbeddedRow(row, 'skills');
      return {
        id: row.id,
        skill_id: row.skill_id,
        name: skill?.name || null,
        category: skill?.category || null,
        confidence: row.confidence,
        source: row.source,
      };
    }),
    unmatched_skills: payload.unmatched_skills || [],
  };
};

const skillFromRow = (row) => {
  const skill = getEmbeddedRow(row, 'skills') || row?.skill || row;
  const name = String(skill?.name || row?.name || '').trim();

  if (!name) {
    return null;
  }

  return {
    id: skill?.id || row?.skill_id || row?.id || null,
    name,
    category: skill?.category || row?.category || null,
    level: row?.required_level || row?.level || skill?.level || null,
    aliases: safeArray(skill?.aliases || row?.aliases),
    priority: Number.parseInt(row?.priority, 10) || 999,
    source: row?.source || null,
    title: row?.title || null,
  };
};

const skillFromValue = (value) => {
  if (typeof value === 'string') {
    const name = value.trim();
    return name ? { id: null, name } : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const name = String(value.name || value.skill || value.skill_name || '').trim();
  if (!name) {
    return null;
  }

  return {
    id: value.skill_id || value.id || null,
    name,
    category: value.category || null,
    level: value.level || null,
    priority: Number.parseInt(value.priority, 10) || 999,
  };
};

const mergeSkillsByName = (skills) => {
  const map = new Map();

  skills.forEach((skill) => {
    if (!skill?.name) {
      return;
    }

    const key = normalizeName(skill.name);
    if (!key) {
      return;
    }

    const existing = map.get(key);
    map.set(key, {
      ...existing,
      ...skill,
      id: existing?.id || skill.id || null,
      category: existing?.category || skill.category || null,
      priority: Math.min(existing?.priority || 999, skill.priority || 999),
    });
  });

  return [...map.values()];
};

const extractAnalysisMissingSkills = (analysis) => {
  const extracted = analysis?.extracted || {};
  return mergeSkillsByName(
    [
      ...safeArray(analysis?.missing_skills),
      ...safeArray(extracted.missing_skills),
      ...safeArray(extracted.roadmap_focus),
    ]
      .map(skillFromValue)
      .filter(Boolean),
  );
};

const buildCourseRecommendationRows = (rows) => {
  const coursesById = new Map();

  rows.forEach((row) => {
    if (
      row.source !== 'admin_manual' &&
      clampNumber(row.confidence, 0, 1, 0) < COURSE_RECOMMENDATION_CONFIDENCE_THRESHOLD
    ) {
      return;
    }

    const course = getEmbeddedRow(row, 'courses');
    const skill = skillFromRow(row);

    if (!course || course.is_active === false || course.analysis_status !== 'approved' || !skill) {
      return;
    }

    const existing = coursesById.get(course.id) || {
      ...course,
      skills: [],
    };

    existing.skills.push({
      ...skill,
      confidence: row.confidence,
      source: row.source,
    });
    coursesById.set(course.id, existing);
  });

  return [...coursesById.values()];
};

const scoreLevelFit = (courseLevel, userExperienceLevel) => {
  const level = normalizeName(courseLevel);
  const experience = normalizeName(userExperienceLevel);

  if (!level) {
    return 5;
  }

  if (level.includes('beginner') && (!experience || experience.includes('0') || experience.includes('student'))) {
    return 10;
  }

  if (level.includes('intermediate') && (experience.includes('1') || experience.includes('2') || experience.includes('4'))) {
    return 9;
  }

  if (level.includes('advanced') && (experience.includes('4') || experience.includes('7'))) {
    return 8;
  }

  return level.includes('beginner') ? 8 : 6;
};

const scoreQuality = (course) => {
  const ratingScore = Math.round((clampNumber(course.rating, 0, 5, 0) / 5) * 6);
  const popularity = Math.max(
    clampNumber(course.popularity_score, 0, 100, 0),
    Math.min(100, clampNumber(course.enrollment_count, 0, 10000, 0) / 100),
    Math.min(100, clampNumber(course.reviews_count, 0, 1000, 0) / 10),
  );

  return Math.min(10, ratingScore + Math.round((popularity / 100) * 4));
};

const scoreAvailability = (course, preferredLanguage = null) => {
  let score = 0;

  if (course.is_free) {
    score += 3;
  }

  if (course.provider === 'MaharaTech') {
    score += 1;
  }

  if (
    preferredLanguage &&
    normalizeName(course.language) === normalizeName(preferredLanguage)
  ) {
    score += 1;
  } else if (normalizeName(course.language).includes('arabic')) {
    score += 1;
  }

  return Math.min(5, score);
};

const buildReasons = ({
  course,
  missingSkillsCovered,
  roadmapSkillNames,
  targetCareerSkillNames,
  levelFit,
}) => {
  const reasons = [];

  missingSkillsCovered.slice(0, 3).forEach((skill) => {
    reasons.push({ code: 'covers_missing_skill', params: { skill } });
  });

  course.skills
    .filter((skill) => roadmapSkillNames.has(normalizeName(skill.name)))
    .slice(0, 2)
    .forEach((skill) => reasons.push({ code: 'supports_roadmap_skill', params: { skill: skill.name } }));

  course.skills
    .filter((skill) => targetCareerSkillNames.has(normalizeName(skill.name)))
    .slice(0, 2)
    .forEach((skill) => reasons.push({ code: 'matches_target_career', params: { skill: skill.name } }));

  if (levelFit >= 8 && course.level) {
    reasons.push({ code: 'level_suitable', params: { level: String(course.level).toLowerCase() } });
  }

  if (course.is_free && course.provider) {
    reasons.push({ code: 'free_course', params: { provider: course.provider } });
  }

  const seen = new Set();
  return reasons.filter((reason) => {
    const key = JSON.stringify(reason);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
};

const getRecommendedCourses = async ({ user, limit = 10 }) => {
  const userId = getAuthenticatedUserId(user);
  const [profileContext, latestAnalysis, userSkillRows] =
    await Promise.all([
      coursesRepository.findUserProfileContext(userId),
      coursesRepository.findLatestCompletedCvAnalysis(userId),
      coursesRepository.findUserSkills(userId),
    ]);

  if (!latestAnalysis) {
    return {
      hasRecommendations: false,
      requiredAction: 'upload_cv',
      courses: [],
    };
  }

  const profile = getEmbeddedRow(profileContext, 'profiles');
  const targetCareer = getEmbeddedRow(profile, 'target_career');
  const cvId = latestAnalysis.cv?.id;
  const [cvSkillRows, careerSkillRows, roadmapStepRows] = await Promise.all([
    coursesRepository.findCvSkills(cvId),
    coursesRepository.findCareerPathSkills(profile?.target_career_id),
    coursesRepository.findLatestActiveRoadmapSteps(userId),
  ]);

  const userSkills = mergeSkillsByName(
    [...userSkillRows, ...cvSkillRows].map(skillFromRow).filter(Boolean),
  );
  const userSkillNames = new Set(userSkills.map((skill) => normalizeName(skill.name)));
  const analysisMissing = extractAnalysisMissingSkills(latestAnalysis.analysis);
  const resolvedAnalysisSkills = await coursesRepository.findActiveSkillsByNames(
    analysisMissing.filter((skill) => !skill.id).map((skill) => skill.name),
  );
  const resolvedByName = new Map(
    resolvedAnalysisSkills.map((skill) => [normalizeName(skill.name), skill]),
  );
  const resolvedAnalysisMissing = analysisMissing.map((skill) => ({
    ...skill,
    id: skill.id || resolvedByName.get(normalizeName(skill.name))?.id || null,
  }));
  const targetCareerSkills = mergeSkillsByName(
    careerSkillRows.map(skillFromRow).filter(Boolean),
  );
  const roadmapSkills = mergeSkillsByName(
    roadmapStepRows.map(skillFromRow).filter(Boolean),
  );
  const missingSkills = mergeSkillsByName([
    ...resolvedAnalysisMissing,
    ...targetCareerSkills.filter(
      (skill) => !userSkillNames.has(normalizeName(skill.name)),
    ),
    ...roadmapSkills.filter((skill) => !userSkillNames.has(normalizeName(skill.name))),
  ]);
  const missingSkillNames = new Set(missingSkills.map((skill) => normalizeName(skill.name)));
  const targetCareerSkillNames = new Set(
    targetCareerSkills.map((skill) => normalizeName(skill.name)),
  );
  const roadmapSkillNames = new Set(
    roadmapSkills.map((skill) => normalizeName(skill.name)),
  );
  const relevantSkillIds = [...new Set([
    ...missingSkills,
    ...targetCareerSkills,
    ...roadmapSkills,
  ].map((skill) => skill.id).filter(Boolean))];
  const courseSkillRows = await coursesRepository.findApprovedCourseSkillRows(relevantSkillIds);
  const candidateCourses = buildCourseRecommendationRows(courseSkillRows);

  const scoredRecommendations = candidateCourses
    .map((course) => {
      const courseSkillNames = new Set(
        course.skills.map((skill) => normalizeName(skill.name)),
      );
      const matchedSkills = course.skills
        .filter(
          (skill) =>
            missingSkillNames.has(normalizeName(skill.name)) ||
            targetCareerSkillNames.has(normalizeName(skill.name)) ||
            roadmapSkillNames.has(normalizeName(skill.name)),
        )
        .map((skill) => skill.name);
      const missingSkillsCovered = missingSkills
        .filter((skill) => courseSkillNames.has(normalizeName(skill.name)))
        .map((skill) => skill.name);
      const coverageRatio = missingSkills.length
        ? missingSkillsCovered.length / missingSkills.length
        : matchedSkills.length
          ? 1
          : 0;
      const careerRatio = targetCareerSkills.length
        ? course.skills.filter((skill) =>
          targetCareerSkillNames.has(normalizeName(skill.name)),
        ).length / targetCareerSkills.length
        : 0;
      const levelFit = scoreLevelFit(
        course.level,
        getEmbeddedRow(profile, 'experience_year_lookup')?.experience_level,
      );
      const scoreBreakdown = {
        skillGapCoverage: Math.round(55 * Math.min(1, coverageRatio)),
        careerRelevance: Math.round(20 * Math.min(1, careerRatio)),
        levelFit,
        quality: scoreQuality(course),
        availability: scoreAvailability(course, analysisLanguage(latestAnalysis.analysis)),
      };
      const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);

      return {
        course,
        matchedSkills: uniqueStrings(matchedSkills),
        missingSkillsCovered: uniqueStrings(missingSkillsCovered),
        coveragePercentage: Math.round(Math.min(1, coverageRatio) * 100),
        score,
        scoreBreakdown,
        matchReasons: buildReasons({
          course,
          missingSkillsCovered: uniqueStrings(missingSkillsCovered),
          roadmapSkillNames,
          targetCareerSkillNames,
          levelFit,
        }),
      };
    })
    .filter((item) => item.score > 0 && item.matchedSkills.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const states = await coursesRepository.findUserCourseStates({
    userId,
    courseIds: scoredRecommendations.map((item) => item.course.id),
  });
  const savedIds = new Set(states.savedRows.map((row) => row.course_id));
  const enrollmentByCourseId = new Map(
    states.enrollmentRows.map((row) => [row.course_id, row]),
  );
  const recommendations = scoredRecommendations.map(({ course, ...extensions }) =>
    mapRecommendationCourse(course, extensions, {
      skills: course.skills,
      isSaved: savedIds.has(course.id),
      enrollment: enrollmentByCourseId.get(course.id) || null,
    }),
  );

  return {
    hasRecommendations: recommendations.length > 0,
    targetCareer: targetCareer?.title || null,
    missingSkills: missingSkills.map((skill) => skill.name),
    courses: recommendations,
  };
};

const analysisLanguage = (analysis) => {
  const extracted = analysis?.extracted || {};
  const languages = safeArray(extracted.languages);
  return languages.find((language) => /arabic|english/i.test(String(language))) || null;
};

const requireAvailableCourse = async (courseId) => {
  const course = await coursesRepository.findAvailableCourseById(courseId);
  if (!course) {
    throw new AppError('Course not found or unavailable', 404, null, 'COURSE_NOT_FOUND');
  }
  return course;
};

const mapRowsWithUserState = async ({ userId, rows }) => {
  const states = await coursesRepository.findUserCourseStates({
    userId,
    courseIds: rows.map((row) => row.id),
  });
  const savedIds = new Set(states.savedRows.map((row) => row.course_id));
  const enrollmentByCourseId = new Map(states.enrollmentRows.map((row) => [row.course_id, row]));
  return rows.map((row) => mapCourse(row, {
    isSaved: savedIds.has(row.id),
    enrollment: enrollmentByCourseId.get(row.id) || null,
  }));
};

const getCourses = async ({ user, query }) => {
  const userId = getAuthenticatedUserId(user);
  const { page, limit, ...filters } = query;
  const result = await coursesRepository.findCoursesPage({ page, limit, filters });
  return {
    courses: await mapRowsWithUserState({ userId, rows: result.rows }),
    pagination: buildPaginationMeta({ page, limit, totalItems: result.totalItems }),
  };
};

const getCourseById = async ({ user, courseId }) => {
  const userId = getAuthenticatedUserId(user);
  const course = await requireAvailableCourse(courseId);
  return (await mapRowsWithUserState({ userId, rows: [course] }))[0];
};

const getSavedCourses = async ({ user, query }) => {
  const userId = getAuthenticatedUserId(user);
  const { page, limit } = query;
  const result = await coursesRepository.findSavedCoursesPage({ userId, page, limit });
  const courses = result.rows.map((row) => getEmbeddedRow(row, 'courses')).filter(Boolean);
  const states = await coursesRepository.findUserCourseStates({
    userId,
    courseIds: courses.map((course) => course.id),
  });
  const enrollmentByCourseId = new Map(states.enrollmentRows.map((row) => [row.course_id, row]));
  return {
    courses: courses.map((course) => mapCourse(course, {
      isSaved: true,
      enrollment: enrollmentByCourseId.get(course.id) || null,
    })),
    pagination: buildPaginationMeta({ page, limit, totalItems: result.totalItems }),
  };
};

const saveCourse = async ({ user, courseId }) => {
  const userId = getAuthenticatedUserId(user);
  await requireAvailableCourse(courseId);
  const existing = await coursesRepository.findSavedCourse({ userId, courseId });
  if (existing) return { courseId, isSaved: true, alreadySaved: true };
  await coursesRepository.createSavedCourse({ userId, courseId });
  return { courseId, isSaved: true, alreadySaved: false };
};

const unsaveCourse = async ({ user, courseId }) => {
  const userId = getAuthenticatedUserId(user);
  const removed = await coursesRepository.deleteSavedCourse({ userId, courseId });
  return { courseId, isSaved: false, wasSaved: removed };
};

const getEnrollments = async ({ user, query }) => {
  const userId = getAuthenticatedUserId(user);
  const { page, limit } = query;
  const result = await coursesRepository.findEnrollmentCoursesPage({ userId, page, limit });
  const courseIds = result.rows
    .map((row) => getEmbeddedRow(row, 'courses')?.id)
    .filter(Boolean);
  const states = await coursesRepository.findUserCourseStates({ userId, courseIds });
  const savedIds = new Set(states.savedRows.map((row) => row.course_id));
  return {
    courses: result.rows.map((row) => {
      const course = getEmbeddedRow(row, 'courses');
      return mapCourse(course, {
        isSaved: savedIds.has(course.id),
        enrollment: row,
      });
    }),
    pagination: buildPaginationMeta({ page, limit, totalItems: result.totalItems }),
  };
};

const enrollCourse = async ({ user, courseId }) => {
  const userId = getAuthenticatedUserId(user);
  await requireAvailableCourse(courseId);
  const existing = await coursesRepository.findCourseEnrollment({ userId, courseId });
  const enrollment = existing || await coursesRepository.createCourseEnrollment({ userId, courseId });
  return {
    courseId,
    alreadyEnrolled: Boolean(existing),
    enrollment: mapEnrollment(enrollment),
  };
};

const updateEnrollment = async ({ user, courseId, payload }) => {
  const userId = getAuthenticatedUserId(user);
  const existing = await coursesRepository.findCourseEnrollment({ userId, courseId });
  if (!existing) {
    throw new AppError('Course enrollment not found', 404, null, 'COURSE_NOT_FOUND');
  }

  let progress = payload.progress ?? Number(existing.progress);
  let status = payload.status ?? existing.status;

  if (payload.status === 'completed' && payload.progress === undefined) progress = 100;
  if (payload.progress === 100 && payload.status === undefined) status = 'completed';
  if (payload.progress !== undefined && payload.progress < 100 && payload.status === undefined && existing.status === 'completed') {
    status = 'active';
  }
  if (status === 'completed' && progress !== 100) {
    throw new AppError('Completed enrollment requires progress 100', 400, null, 'VALIDATION_ERROR');
  }
  if (status !== 'completed' && progress === 100) {
    throw new AppError('Progress 100 requires completed status', 400, null, 'VALIDATION_ERROR');
  }

  const completedAt = status === 'completed'
    ? existing.completed_at || new Date().toISOString()
    : null;
  const enrollment = await coursesRepository.updateCourseEnrollment({
    userId,
    courseId,
    changes: { progress, status, completed_at: completedAt },
  });
  return { courseId, enrollment: mapEnrollment(enrollment) };
};

module.exports = {
  getCourses,
  getCourseById,
  getSavedCourses,
  saveCourse,
  unsaveCourse,
  getEnrollments,
  enrollCourse,
  updateEnrollment,
  previewCourseImport,
  confirmCourseImport,
  getRecommendedCourses,
  detectCourseProvider,
  matchAnalyzedSkills,
};
