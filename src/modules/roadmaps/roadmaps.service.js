const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const { generateJsonCompletion } = require('../ai/ai.service');
const {
  ROADMAP_GEMINI_SCHEMA,
  buildRoadmapMessages,
} = require('../ai/prompts/roadmap.prompt');
const { getRagContextForFeature } = require('../rag/rag.service');
const { mapCourseSummary } = require('../courses/course.mapper');
const roadmapsRepository = require('./roadmaps.repository');
const notificationsService = require('../notifications/notifications.service');

const METADATA_MARKER = '\n\n__pathfinder_roadmap_metadata__:';

const getAuthenticatedUserId = (user) => {
  const userId = user?.id || user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
};

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clampProgress = (value) => {
  const progress = Number.parseInt(value, 10);

  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(100, progress));
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getEmbeddedRow = (row, key) => {
  const value = row?.[key];
  return Array.isArray(value) ? value[0] : value;
};

const buildProfileContext = (userContext) => {
  const profile = getEmbeddedRow(userContext, 'profiles');
  const targetCareer = getEmbeddedRow(profile, 'target_career');

  return {
    user: {
      id: userContext.id,
      name: userContext.name,
      email: userContext.email,
    },
    profile: profile
      ? {
          id: profile.id,
          university: profile.university,
          major: profile.major,
          location: profile.location,
          headline: profile.headline,
          bio: profile.bio,
          education_level:
            getEmbeddedRow(profile, 'education_level_lookup')?.education_level ||
            null,
          current_status:
            getEmbeddedRow(profile, 'current_status_lookup')?.current_status ||
            null,
          experience_level:
            getEmbeddedRow(profile, 'experience_year_lookup')?.experience_level ||
            null,
          target_career_id: profile.target_career_id,
        }
      : null,
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
    priority:
      typeof row?.priority === 'number'
        ? row.priority
        : Number.parseInt(row?.priority, 10) || 999,
    source: row?.source || null,
  };
};

const skillFromDetectedValue = (value) => {
  if (typeof value === 'string') {
    const name = value.trim();
    return name ? { id: null, name, category: null, level: null } : null;
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
    priority:
      typeof value.priority === 'number'
        ? value.priority
        : Number.parseInt(value.priority, 10) || 999,
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
      level: existing?.level || skill.level || null,
      priority: Math.min(existing?.priority || 999, skill.priority || 999),
    });
  });

  return [...map.values()];
};

const extractAnalysisSkills = (analysis) => {
  const extracted = analysis?.extracted || {};
  const detectedSkills = [
    ...safeArray(analysis?.detected_skills),
    ...safeArray(extracted.detected_skills),
  ]
    .map(skillFromDetectedValue)
    .filter(Boolean);

  const missingSkills = [
    ...safeArray(analysis?.missing_skills),
    ...safeArray(extracted.missing_skills),
  ]
    .map(skillFromDetectedValue)
    .filter(Boolean);

  const roadmapFocus = [
    ...safeArray(analysis?.roadmap_focus),
    ...safeArray(extracted.roadmap_focus),
  ]
    .map(skillFromDetectedValue)
    .filter(Boolean);

  return {
    detectedSkills,
    missingSkills,
    roadmapFocus,
  };
};

const calculateSkillGaps = ({ userSkills, requiredSkills, analysisMissing }) => {
  const userSkillNames = new Set(userSkills.map((skill) => normalizeName(skill.name)));
  const deterministicGaps = requiredSkills.filter(
    (skill) => !userSkillNames.has(normalizeName(skill.name)),
  );

  return mergeSkillsByName([...deterministicGaps, ...analysisMissing]).sort(
    (a, b) => (a.priority || 999) - (b.priority || 999),
  );
};

const normalizeCourseRows = (rows) => {
  const coursesById = new Map();

  rows.forEach((row) => {
    const course = getEmbeddedRow(row, 'courses');

    if (
      !course ||
      course.is_active === false ||
      course.analysis_status !== 'approved' ||
      (row.source !== 'admin_manual' &&
        Number(row.confidence || 0) < 0.6)
    ) {
      return;
    }

    const existing = coursesById.get(course.id);
    const skillIds = new Set(existing?.skillIds || []);
    if (row.skill_id) {
      skillIds.add(row.skill_id);
    }

    coursesById.set(course.id, {
      id: course.id,
      title: course.title,
      description: course.description,
      provider: course.provider,
      url: course.url,
      thumbnail_url: course.thumbnail_url,
      video_url: course.video_url,
      level: course.level,
      duration: course.duration,
      category: course.category,
      category_id: course.category_id,
      learning_outcomes: course.learning_outcomes,
      language: course.language,
      analysis_status: course.analysis_status,
      analysis_confidence: course.analysis_confidence,
      price: course.price,
      currency: course.currency,
      is_free: course.is_free,
      rating: course.rating,
      reviews_count: course.reviews_count,
      enrollment_count: course.enrollment_count,
      popularity_score: course.popularity_score,
      skillIds: [...skillIds],
    });
  });

  return [...coursesById.values()].sort(
    (a, b) =>
      (b.popularity_score || 0) - (a.popularity_score || 0) ||
      (b.rating || 0) - (a.rating || 0),
  );
};

const unpackDescription = (value) => {
  const description = String(value || '');
  const markerIndex = description.indexOf(METADATA_MARKER);

  if (markerIndex === -1) {
    return {
      description,
      metadata: {},
    };
  }

  const visibleDescription = description.slice(0, markerIndex).trim();
  const rawMetadata = description.slice(markerIndex + METADATA_MARKER.length);

  try {
    return {
      description: visibleDescription,
      metadata: JSON.parse(rawMetadata),
    };
  } catch (error) {
    return {
      description: visibleDescription,
      metadata: {},
    };
  }
};

const fallbackTitle = (targetCareer) =>
  targetCareer?.title ? `Roadmap to ${targetCareer.title}` : 'Personalized Learning Roadmap';

const buildFallbackSteps = ({ gaps, requiredSkills, detectedSkills, targetCareer }) => {
  const sourceSkills = gaps.length
    ? gaps
    : mergeSkillsByName([...requiredSkills, ...detectedSkills]).slice(0, 5);

  if (!sourceSkills.length) {
    return [
      {
        title: `Build a portfolio project${targetCareer?.title ? ` for ${targetCareer.title}` : ''}`,
        description:
          'Create one focused project that demonstrates your strongest current skills and documents your learning progress.',
        skill_name: targetCareer?.title || 'Portfolio Project',
        skill_id: null,
        priority: 1,
        status: 'in_progress',
        estimated_duration: '2 weeks',
        recommended_course_ids: [],
      },
    ];
  }

  return sourceSkills.slice(0, 8).map((skill, index) => ({
    title: `Learn ${skill.name}`,
    description: `Build practical confidence in ${skill.name} through focused learning and a small project task.`,
    skill_name: skill.name,
    skill_id: skill.id || null,
    priority: index + 1,
    status: index === 0 ? 'in_progress' : 'upcoming',
    estimated_duration: '2 weeks',
    recommended_course_ids: [],
  }));
};

const sanitizeAiRoadmap = ({
  aiRoadmap,
  gaps,
  skillOptions,
  availableCourses,
  targetCareer,
}) => {
  if (!aiRoadmap || typeof aiRoadmap !== 'object') {
    return null;
  }

  const gapByName = new Map(gaps.map((gap) => [normalizeName(gap.name), gap]));
  const skillByName = new Map(
    skillOptions.map((skill) => [normalizeName(skill.name), skill]),
  );
  const allowedCourseIds = new Set(availableCourses.map((course) => course.id));
  const steps = safeArray(aiRoadmap.steps)
    .map((step, index) => {
      const skillName = String(step?.skill_name || '').trim();
      const matchedSkill = gapByName.get(normalizeName(skillName));
      const existingSkill = matchedSkill || skillByName.get(normalizeName(skillName));

      if (!matchedSkill && gaps.length) {
        return null;
      }

      const title = String(step?.title || '').trim();
      const description = String(step?.description || '').trim();

      if (!title || !description) {
        return null;
      }

      return {
        title,
        description,
        skill_name: existingSkill?.name || skillName,
        skill_id: existingSkill?.id || null,
        priority:
          Number.isFinite(Number(step.priority)) && Number(step.priority) > 0
            ? Number(step.priority)
            : index + 1,
        status: index === 0 ? 'in_progress' : 'upcoming',
        estimated_duration: String(step.estimated_duration || '2 weeks').trim(),
        recommended_course_ids: safeArray(step.recommended_course_ids).filter((id) =>
          allowedCourseIds.has(id),
        ),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);

  if (!steps.length) {
    return null;
  }

  const insights =
    aiRoadmap.insights && typeof aiRoadmap.insights === 'object'
      ? {
          projectedSalaryIncrease: clampProgress(
            aiRoadmap.insights.projectedSalaryIncrease,
          ),
          matchingSeniorRoles:
            Number.parseInt(aiRoadmap.insights.matchingSeniorRoles, 10) || 0,
        }
      : {};

  return {
    title: String(aiRoadmap.title || fallbackTitle(targetCareer)).trim(),
    description: String(
      aiRoadmap.description ||
        "Personalized roadmap based on the user's CV analysis and target career.",
    ).trim(),
    estimatedDuration: String(aiRoadmap.estimatedDuration || '').trim(),
    label: String(aiRoadmap.label || 'Professional Path').trim(),
    steps,
    insights,
  };
};

const buildCourseMaps = (courses) => {
  const byId = new Map(courses.map((course) => [course.id, course]));
  const bySkillId = new Map();

  courses.forEach((course) => {
    safeArray(course.skillIds).forEach((skillId) => {
      if (!bySkillId.has(skillId)) {
        bySkillId.set(skillId, []);
      }

      bySkillId.get(skillId).push(course);
    });
  });

  return { byId, bySkillId };
};

const calculateEstimatedDuration = (steps, metadata = {}) => {
  if (metadata.estimatedDuration) {
    return metadata.estimatedDuration;
  }

  const stepCount = steps.length || 1;
  const weeks = Math.max(2, stepCount * 2);

  if (weeks >= 8) {
    return `${Math.ceil(weeks / 4)} months`;
  }

  return `${weeks} weeks`;
};

const getStepStatus = (step, index, firstIncompleteIndex) => {
  const progress = clampProgress(step.progress);

  if (progress === 100) {
    return 'completed';
  }

  return progress > 0 || index === firstIncompleteIndex
    ? 'in_progress'
    : 'upcoming';
};

const getSectionStatus = (items) => {
  if (items.every((item) => item.status === 'completed')) {
    return 'completed';
  }

  if (items.some((item) => item.status === 'in_progress')) {
    return 'in_progress';
  }

  return 'upcoming';
};

const getSectionSubtitle = (status) => {
  if (status === 'completed') {
    return 'Completed - Nice work';
  }

  if (status === 'in_progress') {
    return 'In Progress - Currently Learning';
  }

  return 'Upcoming - Next Skills';
};

const formatRoadmapResponse = async ({
  roadmap,
  steps,
  courses = null,
}) => {
  const skillIds = mergeSkillsByName(
    steps
      .map((step) => skillFromRow(step))
      .filter((skill) => skill?.id),
  ).map((skill) => skill.id);

  const courseList =
    courses ||
    normalizeCourseRows(await roadmapsRepository.findCoursesForSkillIds(skillIds));
  const courseMaps = buildCourseMaps(courseList);
  const firstIncompleteIndex = steps.findIndex(
    (step) => clampProgress(step.progress) < 100,
  );
  const legacy = unpackDescription(roadmap.description);
  const metadata =
    roadmap.metadata &&
    typeof roadmap.metadata === 'object' &&
    Object.keys(roadmap.metadata).length
      ? roadmap.metadata
      : legacy.metadata;

  const items = steps.map((step, index) => {
    const skill = skillFromRow(step);
    const status = getStepStatus(step, index, firstIncompleteIndex);
    const persistedCourses = safeArray(step.roadmap_step_courses)
      .sort((a, b) => a.recommendation_order - b.recommendation_order)
      .map((recommendation) => getEmbeddedRow(recommendation, 'courses'))
      .filter((course) => course?.is_active !== false && course?.analysis_status === 'approved');
    const recommendedCourses = persistedCourses.length
      ? persistedCourses
      : (courseMaps.bySkillId.get(step.skill_id) || []).slice(0, 3);
    const progress = clampProgress(step.progress);

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      status,
      progress,
      isCompleted: progress === 100,
      completedAt: progress === 100 ? step.completed_at || null : null,
      duration: metadata.stepDurations?.[step.step_order] || '2 weeks',
      level: skill?.level || 'beginner',
      isAiRecommended: roadmap.generated_by_type === 'ai',
      recommendedCourses: recommendedCourses.map(mapCourseSummary),
      category: skill?.category || 'Learning',
      stepOrder: step.step_order,
    };
  });

  const sectionGroups = [];
  items.forEach((item) => {
    const lastGroup = sectionGroups[sectionGroups.length - 1];
    const shouldStartGroup =
      !lastGroup ||
      (item.category !== lastGroup.category && lastGroup.items.length >= 2) ||
      lastGroup.items.length >= 3;

    if (shouldStartGroup) {
      sectionGroups.push({
        category: item.category,
        items: [],
      });
    }

    sectionGroups[sectionGroups.length - 1].items.push(item);
  });

  const sections = sectionGroups.map((group, index) => {
    const status = getSectionStatus(group.items);
    return {
      title:
        group.category && group.category !== 'Learning'
          ? `${group.category} Foundations`
          : `Learning Block ${index + 1}`,
      status,
      subtitle: getSectionSubtitle(status),
      items: group.items.map(({ category, stepOrder, ...item }) => item),
    };
  });

  const nextStep = items.find((item) => item.status !== 'completed');

  return {
    id: roadmap.id,
    title: roadmap.title,
    description: legacy.description,
    label: metadata.label || 'Professional Path',
    estimatedDuration: calculateEstimatedDuration(steps, metadata),
    progress: clampProgress(roadmap.progress),
    nextStep: nextStep?.title || null,
    sections,
    insights: metadata.insights || {
      projectedSalaryIncrease: 0,
      matchingSeniorRoles: 0,
    },
  };
};

const fetchRoadmapWithSteps = async ({ roadmapId, userId }) => {
  const roadmap = await roadmapsRepository.findRoadmapByIdForUser(
    roadmapId,
    userId,
  );

  if (!roadmap) {
    throw new AppError('Roadmap not found', 404);
  }

  const steps = await roadmapsRepository.findRoadmapSteps(roadmap.id);
  return { roadmap, steps };
};

const buildExistingRoadmapResponse = async (roadmap) => {
  const steps = await roadmapsRepository.findRoadmapSteps(roadmap.id);
  return formatRoadmapResponse({ roadmap, steps });
};

const generateAiRoadmap = async ({
  userId,
  profile,
  targetCareer,
  cvScore,
  detectedSkills,
  gaps,
  availableCourses,
  ragContext,
}) => {
  const messages = buildRoadmapMessages({
    profile,
    targetCareer,
    cvScore,
    detectedSkills,
    missingSkills: gaps,
    availableCourses,
    ragContext,
  });

  const result = await generateJsonCompletion({
    userId,
    feature: 'roadmap',
    messages,
    responseSchemaHint: 'ROADMAP_RESPONSE_SCHEMA',
    responseJsonSchema: ROADMAP_GEMINI_SCHEMA,
  });

  return result.data;
};

const hasCompletedCvAnalysis = async (userId) =>
  Boolean(await roadmapsRepository.findLatestCompletedCvAnalysis(userId));

const generateRoadmap = async ({ user, forceRegenerate = false }) => {
  const userId = getAuthenticatedUserId(user);
  const existingRoadmap =
    await roadmapsRepository.findLatestActiveRoadmapForUser(userId);

  if (existingRoadmap && !forceRegenerate) {
    return {
      hasRoadmap: true,
      requiredAction: null,
      reused: true,
      roadmap: await buildExistingRoadmapResponse(existingRoadmap),
    };
  }

  const [userContext, latestCvAnalysis] = await Promise.all([
    roadmapsRepository.findUserProfileContext(userId),
    roadmapsRepository.findLatestCompletedCvAnalysis(userId),
  ]);

  if (!latestCvAnalysis) {
    return {
      hasRoadmap: false,
      requiredAction: 'upload_cv',
      reused: false,
      roadmap: null,
      message: 'Analyze your CV first to generate a personalized roadmap.',
    };
  }

  if (!userContext) {
    throw new AppError('User not found', 404);
  }

  const profile = buildProfileContext(userContext);
  const profileRow = getEmbeddedRow(userContext, 'profiles');
  const targetCareer = getEmbeddedRow(profileRow, 'target_career') || null;
  const { cv, analysis } = latestCvAnalysis;
  const analysisSkills = extractAnalysisSkills(analysis);

  const [userSkillRows, cvSkillRows, requiredSkillRows] = await Promise.all([
    roadmapsRepository.findUserSkills(userId),
    roadmapsRepository.findCvSkills(cv.id),
    roadmapsRepository.findCareerPathSkills(profileRow?.target_career_id),
  ]);

  const userSkills = mergeSkillsByName([
    ...userSkillRows.map(skillFromRow).filter(Boolean),
    ...cvSkillRows.map(skillFromRow).filter(Boolean),
    ...analysisSkills.detectedSkills,
  ]);
  const requiredSkills = mergeSkillsByName(
    requiredSkillRows.map(skillFromRow).filter(Boolean),
  );
  const gaps = calculateSkillGaps({
    userSkills,
    requiredSkills,
    analysisMissing: [
      ...analysisSkills.missingSkills,
      ...analysisSkills.roadmapFocus,
    ],
  });
  const skillIdsForCourses = [...new Set(gaps.map((gap) => gap.id).filter(Boolean))];
  const [courseRows, ragContext] = await Promise.all([
    roadmapsRepository.findCoursesForSkillIds(skillIdsForCourses),
    getRagContextForFeature('roadmap'),
  ]);
  const availableCourses = normalizeCourseRows(courseRows);

  let generatedByType = 'system';
  let roadmapPlan = null;

  try {
    const aiRoadmap = await generateAiRoadmap({
      userId,
      profile,
      targetCareer,
      cvScore: analysis.score,
      detectedSkills: userSkills,
      gaps,
      availableCourses,
      ragContext,
    });
    roadmapPlan = sanitizeAiRoadmap({
      aiRoadmap,
      gaps,
      skillOptions: mergeSkillsByName([...gaps, ...requiredSkills, ...userSkills]),
      availableCourses,
      targetCareer,
    });
    generatedByType = roadmapPlan ? 'ai' : 'system';
  } catch (error) {
    logger.warn('Roadmap AI generation failed, using deterministic fallback', {
      userId,
      reason: error.message,
    });
  }

  if (!roadmapPlan) {
    roadmapPlan = {
      title: fallbackTitle(targetCareer),
      description:
        "Personalized roadmap based on the user's CV analysis and target career.",
      estimatedDuration: '',
      label: 'Professional Path',
      steps: buildFallbackSteps({
        gaps,
        requiredSkills,
        detectedSkills: userSkills,
        targetCareer,
      }),
      insights: {
        projectedSalaryIncrease: 0,
        matchingSeniorRoles: 0,
      },
    };
  }

  const availableCourseMaps = buildCourseMaps(availableCourses);
  roadmapPlan.steps = roadmapPlan.steps.map((step) => {
    const recommendedIds = safeArray(step.recommended_course_ids)
      .filter((courseId) => availableCourseMaps.byId.has(courseId));
    const deterministicIds = safeArray(
      availableCourseMaps.bySkillId.get(step.skill_id),
    ).map((course) => course.id);

    return {
      ...step,
      recommended_course_ids: [...new Set([
        ...recommendedIds,
        ...deterministicIds,
      ])].slice(0, 3),
    };
  });

  const stepDurations = roadmapPlan.steps.reduce((acc, step, index) => {
    acc[index + 1] = step.estimated_duration || '2 weeks';
    return acc;
  }, {});
  const metadata = {
    estimatedDuration: roadmapPlan.estimatedDuration,
    label: roadmapPlan.label || 'Professional Path',
    insights: roadmapPlan.insights || {},
    stepDurations,
  };
  const stepRows = roadmapPlan.steps.map((step, index) => ({
    skill_id: step.skill_id || null,
    title: step.title,
    description: step.description,
    step_order: index + 1,
    recommended_course_ids: step.recommended_course_ids || [],
  }));
  const roadmapId = await roadmapsRepository.createRoadmapAtomic({
    userId,
    careerPathId: profileRow?.target_career_id || null,
    title: roadmapPlan.title || fallbackTitle(targetCareer),
    description: String(roadmapPlan.description || '').trim(),
    metadata,
    generatedByType,
    steps: stepRows,
    forceRegenerate,
  });
  const { roadmap, steps } = await fetchRoadmapWithSteps({ roadmapId, userId });

  // Best-effort: notify the user that their learning roadmap is ready.
  try {
    await notificationsService.createUserNotification({
      userId,
      type: 'roadmap_ready',
      category: 'learning',
      title: 'Your learning roadmap is ready',
      body: `${roadmap.title || 'Your personalized roadmap'} is ready with ${
        steps?.length || 0
      } steps. Start learning now.`,
      actionLabel: 'View roadmap',
      actionUrl: `/roadmaps/${roadmapId}`,
      metadata: { roadmap_id: roadmapId, steps_count: steps?.length || 0 },
      dedupeKey: `roadmap_ready:${roadmapId}`,
    });
  } catch (notifyError) {
    logger.warn('Failed to create roadmap notification', {
      roadmapId,
      reason: notifyError.message,
    });
  }

  return {
    hasRoadmap: true,
    requiredAction: null,
    reused: false,
    roadmap: await formatRoadmapResponse({ roadmap, steps }),
  };
};

const getMyRoadmap = async (user) => {
  const userId = getAuthenticatedUserId(user);
  const roadmap = await roadmapsRepository.findLatestActiveRoadmapForUser(userId);

  if (!roadmap) {
    return {
      hasRoadmap: false,
      requiredAction: (await hasCompletedCvAnalysis(userId))
        ? 'generate_roadmap'
        : 'upload_cv',
    };
  }

  return {
    hasRoadmap: true,
    requiredAction: null,
    roadmap: await buildExistingRoadmapResponse(roadmap),
  };
};

const getRoadmapById = async ({ user, roadmapId }) => {
  const userId = getAuthenticatedUserId(user);
  const { roadmap, steps } = await fetchRoadmapWithSteps({ roadmapId, userId });

  return {
    roadmap: await formatRoadmapResponse({ roadmap, steps }),
  };
};

const updateStepProgress = async ({ user, roadmapId, stepId, progress, isCompleted }) => {
  const userId = getAuthenticatedUserId(user);
  const normalizedProgress = clampProgress(progress);
  const derivedIsCompleted = normalizedProgress === 100;

  if (
    typeof isCompleted === 'boolean' &&
    isCompleted !== derivedIsCompleted
  ) {
    throw new AppError(
      'isCompleted must be true only when progress is 100',
      400,
    );
  }

  await fetchRoadmapWithSteps({ roadmapId, userId });
  await roadmapsRepository.updateRoadmapStepProgressAtomic({
    userId,
    roadmapId,
    stepId,
    progress: normalizedProgress,
    isCompleted: derivedIsCompleted,
  });
  const { roadmap, steps } = await fetchRoadmapWithSteps({
    roadmapId,
    userId,
  });

  return {
    roadmap: await formatRoadmapResponse({ roadmap, steps }),
  };
};

module.exports = {
  generateRoadmap,
  getMyRoadmap,
  getRoadmapById,
  updateStepProgress,
};
