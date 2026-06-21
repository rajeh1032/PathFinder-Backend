const logger = require('../../common/utils/logger');
const jobsRepository = require('./jobs.repository');

const toPositiveInt = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

const getPreparationConfig = () => ({
  maxItems: Math.min(
    20,
    toPositiveInt(
      process.env.USER_JOBS_SYNC_MAX_ITEMS,
      toPositiveInt(process.env.JOBS_SYNC_MAX_ITEMS, toPositiveInt(process.env.APIFY_MAX_ITEMS, 5)),
    ),
  ),
  matchLimit: Math.min(
    100,
    toPositiveInt(process.env.USER_JOB_MATCHES_LIMIT, 20),
  ),
  matchConcurrency: Math.min(
    5,
    toPositiveInt(process.env.USER_JOB_MATCHES_CONCURRENCY, 2),
  ),
});

const buildSearchFromProfile = (profile) => {
  const careerTitle = profile?.career_paths?.title || profile?.headline || null;

  return {
    search: careerTitle || process.env.APIFY_DEFAULT_SEARCH || 'frontend developer',
    location: profile?.location || process.env.APIFY_DEFAULT_LOCATION || 'Egypt',
  };
};

const hasPublishedJobsForSearch = async ({ search, location }) => {
  const result = await jobsRepository.listJobs({
    keyword: search,
    location,
    status: 'published',
    limit: 1,
  });

  if (result.jobs.length) return true;

  const fallbackResult = await jobsRepository.listJobs({
    keyword: search,
    status: 'published',
    limit: 1,
  });

  return fallbackResult.jobs.length > 0;
};

const prepareJobsForUser = async ({
  userId,
  reason = 'manual',
  syncIfEmpty = true,
  generateMatches = true,
  matchLimit,
} = {}) => {
  if (!userId) return { skipped: true, reason: 'missing_user_id' };

  const config = getPreparationConfig();
  const profile = await jobsRepository.getUserProfile(userId);
  const searchContext = buildSearchFromProfile(profile);
  const summary = {
    userId,
    reason,
    search: searchContext.search,
    location: searchContext.location,
    sync: null,
    matches: null,
  };

  if (syncIfEmpty) {
    const hasJobs = await hasPublishedJobsForSearch(searchContext);

    if (!hasJobs) {
      try {
        const jobsService = require('./jobs.service');
        summary.sync = await jobsService.syncJobsFromApify({
          userId,
          ...searchContext,
          maxItems: config.maxItems,
          allowFallback: false,
        });
      } catch (error) {
        summary.sync = {
          failed: true,
          message: error.message,
          details: error.details || null,
        };

        logger.warn('User jobs sync failed during preparation', summary.sync);
      }
    } else {
      summary.sync = { skipped: true, reason: 'matching_jobs_already_exist' };
    }
  }

  if (generateMatches) {
    try {
      const jobMatchesService = require('../jobMatches/jobMatches.service');
      summary.matches = await jobMatchesService.generateMatches(userId, {
        limit: Math.min(100, toPositiveInt(matchLimit, config.matchLimit)),
        concurrency: config.matchConcurrency,
        keyword: searchContext.search,
        location: searchContext.location,
      });
    } catch (error) {
      summary.matches = {
        failed: true,
        message: error.message,
        details: error.details || null,
      };

      logger.warn('User job match generation failed during preparation', summary.matches);
    }
  }

  logger.info('User jobs preparation finished', {
    userId,
    reason,
    search: summary.search,
    location: summary.location,
    syncedCount: summary.sync?.savedCount || 0,
    matchCount: Array.isArray(summary.matches) ? summary.matches.length : 0,
  });

  return summary;
};

const scheduleJobsPreparationForUser = (options = {}) => {
  const userId = options.userId;
  if (!userId) return { queued: false, reason: 'missing_user_id' };

  setTimeout(() => {
    prepareJobsForUser(options).catch((error) => {
      logger.warn('Queued user jobs preparation failed', {
        userId,
        reason: options.reason,
        message: error.message,
        details: error.details || null,
      });
    });
  }, 0);

  return { queued: true };
};

module.exports = {
  prepareJobsForUser,
  scheduleJobsPreparationForUser,
};
