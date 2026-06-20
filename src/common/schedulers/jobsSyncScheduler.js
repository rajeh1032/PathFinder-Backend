const logger = require('../utils/logger');
const jobsService = require('../../modules/jobs/jobs.service');

const DEFAULT_INTERVAL_HOURS = 12;

const isEnabled = () =>
  String(process.env.JOBS_SYNC_SCHEDULER_ENABLED || '').toLowerCase() === 'true';

const toPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const buildSyncPayload = () => ({
  search: process.env.JOBS_SYNC_SEARCH || process.env.APIFY_DEFAULT_SEARCH,
  location: process.env.JOBS_SYNC_LOCATION || process.env.APIFY_DEFAULT_LOCATION,
  maxItems: toPositiveNumber(
    process.env.JOBS_SYNC_MAX_ITEMS,
    Number(process.env.APIFY_MAX_ITEMS) || undefined,
  ),
  allowFallback: false,
});

const runScheduledJobsSync = async () => {
  const payload = buildSyncPayload();
  logger.info('Scheduled jobs sync started', {
    search: payload.search,
    location: payload.location,
    maxItems: payload.maxItems,
  });

  const result = await jobsService.syncJobsFromApify(payload);

  logger.info('Scheduled jobs sync finished', {
    search: result.search,
    location: result.location,
    requestedMaxItems: result.requestedMaxItems,
    effectiveMaxItems: result.effectiveMaxItems,
    fetchedCount: result.fetchedCount,
    matchedInputCount: result.matchedInputCount,
    normalizedCount: result.normalizedCount,
    savedCount: result.savedCount,
    fallbackUsed: result.fallbackUsed,
  });
};

const startJobsSyncScheduler = () => {
  if (!isEnabled()) {
    logger.info('Scheduled jobs sync disabled');
    return null;
  }

  const intervalHours = toPositiveNumber(
    process.env.JOBS_SYNC_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const intervalMs = intervalHours * 60 * 60 * 1000;
  let isRunning = false;

  const tick = async () => {
    if (isRunning) {
      logger.warn('Scheduled jobs sync skipped because previous run is still active');
      return;
    }

    isRunning = true;
    try {
      await runScheduledJobsSync();
    } catch (error) {
      logger.error('Scheduled jobs sync failed', {
        message: error.message,
        details: error.details || null,
      });
    } finally {
      isRunning = false;
    }
  };

  const timer = setInterval(tick, intervalMs);

  logger.info('Scheduled jobs sync enabled', { intervalHours });

  if (String(process.env.JOBS_SYNC_RUN_ON_START || '').toLowerCase() === 'true') {
    setTimeout(tick, 5000);
  }

  return timer;
};

module.exports = {
  startJobsSyncScheduler,
  runScheduledJobsSync,
};
