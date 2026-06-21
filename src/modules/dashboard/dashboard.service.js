const dashboardRepository = require('./dashboard.repository');

const TOP_LIST_SIZE = 5;

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Aggregate [{ id, name }] rows into ranked [{ name, count }] entries.
const rankByCount = (rows, size = TOP_LIST_SIZE) => {
  const counts = new Map();

  rows.forEach((row) => {
    const key = row.id || row.name;
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { name: row.name, count: 1 });
    }
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, size);
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

// Build N consecutive buckets and tally rows into them via keyFn/valueFn.
const bucketize = (rows, buckets, keyFn, valueFn) => {
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  rows.forEach((row) => {
    const bucket = index.get(keyFn(new Date(row.created_at)));

    if (bucket) {
      bucket.value += valueFn(row);
    }
  });

  return buckets;
};

// Last `months` calendar months, bucketed by month.
const monthlyTrend = (rows, months, valueKey) => {
  const now = new Date();
  const buckets = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: MONTH_LABELS[date.getMonth()],
      value: 0,
    });
  }

  bucketize(
    rows,
    buckets,
    (date) => `${date.getFullYear()}-${date.getMonth()}`,
    () => 1,
  );

  return buckets.map((bucket) => ({ name: bucket.name, [valueKey]: bucket.value }));
};

// Last `days` days, bucketed by day (Mon, Tue, ...).
const dailyTrend = (rows, days, valueKey) => {
  const today = startOfDay(new Date());
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    buckets.push({
      key: date.toISOString().slice(0, 10),
      name: dayLabels[date.getDay()],
      value: 0,
    });
  }

  bucketize(
    rows,
    buckets,
    (date) => startOfDay(date).toISOString().slice(0, 10),
    () => 1,
  );

  return buckets.map((bucket) => ({ name: bucket.name, [valueKey]: bucket.value }));
};

// Last `weeks` weeks, bucketed by week (W1..Wn), optional numeric value column.
const weeklyTrend = (rows, weeks, valueKey, sumColumn) => {
  const today = startOfDay(new Date());
  const buckets = [];

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - offset * 7);
    buckets.push({
      key: `W${weeks - offset}`,
      name: `W${weeks - offset}`,
      start: weekStart,
      value: 0,
    });
  }

  const earliest = buckets[0].start;
  const weekIndexFor = (date) => {
    if (date < earliest) return null;
    const diffDays = Math.floor((date - earliest) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return weekNumber <= weeks ? `W${weekNumber}` : null;
  };

  bucketize(
    rows,
    buckets,
    (date) => weekIndexFor(date),
    (row) => (sumColumn ? Number(row[sumColumn]) || 0 : 1),
  );

  return buckets.map((bucket) => ({ name: bucket.name, [valueKey]: bucket.value }));
};

const monthsAgoIso = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
};

const daysAgoIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const getOverview = async () => {
  const [
    totalUsers,
    totalCvs,
    totalCvAnalyses,
    totalCareerPaths,
    totalSkills,
    totalCourses,
    totalJobs,
    totalJobMatches,
    totalInterviews,
    totalRagDocuments,
    aiTotals,
    careerPathRows,
    skillRows,
  ] = await Promise.all([
    dashboardRepository.countTable('users'),
    dashboardRepository.countTable('cvs'),
    dashboardRepository.countTable('cv_analyses'),
    dashboardRepository.countTable('career_paths'),
    dashboardRepository.countTable('skills'),
    dashboardRepository.countTable('courses'),
    dashboardRepository.countTable('jobs'),
    dashboardRepository.countTable('job_matches'),
    dashboardRepository.countTable('interview_sessions'),
    dashboardRepository.countTable('rag_documents'),
    dashboardRepository.getAiTotals(),
    dashboardRepository.getTopCareerPaths(),
    dashboardRepository.getTopSkills(),
  ]);

  const [userRows, cvAnalysisRows, jobMatchRows, aiUsageRows] = await Promise.all([
    dashboardRepository.getCreatedAtSeries('users', monthsAgoIso(6)),
    dashboardRepository.getCreatedAtSeries('cv_analyses', daysAgoIso(7)),
    dashboardRepository.getCreatedAtSeries('job_matches', daysAgoIso(7 * 6)),
    dashboardRepository.getCreatedAtSeries('ai_logs', daysAgoIso(7 * 6), 'tokens_used'),
  ]);

  return {
    kpis: {
      totalUsers,
      totalCvs,
      totalCvAnalyses,
      totalCareerPaths,
      totalSkills,
      totalCourses,
      totalJobs,
      totalJobMatches,
      totalInterviews,
      totalRagDocuments,
      aiTokensUsed: aiTotals.tokensUsed,
      aiEstimatedCost: Number(aiTotals.cost.toFixed(2)),
    },
    topCareerPaths: rankByCount(careerPathRows),
    topSkills: rankByCount(skillRows),
    trends: {
      userGrowth: monthlyTrend(userRows, 6, 'users'),
      cvAnalyses: dailyTrend(cvAnalysisRows, 7, 'count'),
      jobMatches: weeklyTrend(jobMatchRows, 6, 'count'),
      aiUsage: weeklyTrend(aiUsageRows, 6, 'tokens', 'tokens_used'),
    },
  };
};

module.exports = {
  getOverview,
};
