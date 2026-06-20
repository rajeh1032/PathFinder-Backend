const asArray = (value) => (Array.isArray(value) ? value : []);

const embedded = (row, key) => {
  const value = row?.[key];
  return Array.isArray(value) ? value[0] : value;
};

const nullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const mapEnrollment = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    progress: Number(row.progress || 0),
    enrolledAt: row.enrolled_at || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
};

const mapSkill = (row) => {
  const skill = embedded(row, 'skills') || row?.skill || row;

  if (!skill?.id || !skill?.name) {
    return null;
  }

  return {
    id: skill.id,
    name: skill.name,
    category: skill.category || null,
    level: skill.level || null,
    confidence: nullableNumber(row?.confidence),
    source: row?.source || null,
  };
};

const mapCourse = (row, options = {}) => {
  const savedRows = asArray(row?.saved_courses);
  const enrollmentRows = asArray(row?.course_enrollments);
  const skillRows = options.skills || row?.course_skills || [];
  const enrollment = options.enrollment === undefined
    ? enrollmentRows[0] || null
    : options.enrollment;
  const isSaved = options.isSaved === undefined
    ? savedRows.length > 0
    : Boolean(options.isSaved);

  return {
    id: row.id,
    title: row.title,
    description: row.description || null,
    provider: row.provider,
    url: row.url || null,
    thumbnailUrl: row.thumbnail_url || null,
    videoUrl: row.video_url || null,
    level: row.level || null,
    duration: row.duration || null,
    category: row.category || null,
    learningOutcomes: asArray(row.learning_outcomes),
    language: row.language || null,
    price: nullableNumber(row.price),
    currency: row.currency || null,
    isFree: Boolean(row.is_free),
    rating: nullableNumber(row.rating),
    reviewsCount: Number(row.reviews_count || 0),
    enrollmentCount: Number(row.enrollment_count || 0),
    popularityScore: Number(row.popularity_score || 0),
    skills: asArray(skillRows).map(mapSkill).filter(Boolean),
    isSaved,
    enrollment: mapEnrollment(enrollment),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
};

const mapCourseSummary = (row) => ({
  id: row.id,
  title: row.title,
  provider: row.provider,
  url: row.url || null,
  thumbnailUrl: row.thumbnail_url || null,
  videoUrl: row.video_url || null,
  duration: row.duration || null,
  level: row.level || null,
});

const mapRecommendationCourse = (row, extensions = {}, options = {}) => ({
  ...mapCourse(row, options),
  matchedSkills: asArray(extensions.matchedSkills),
  missingSkillsCovered: asArray(extensions.missingSkillsCovered),
  coveragePercentage: Number(extensions.coveragePercentage || 0),
  score: Number(extensions.score || 0),
  scoreBreakdown: extensions.scoreBreakdown || {},
  matchReasons: asArray(extensions.matchReasons),
});

module.exports = {
  mapCourse,
  mapCourseSummary,
  mapEnrollment,
  mapRecommendationCourse,
};
