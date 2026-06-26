const axios = require('axios');
const AppError = require('../../common/errors/AppError');
const jobsRepository = require('./jobs.repository');

const SYNCED_JOB_SOURCE = 'apify_linkedin';
const SYNCED_JOB_SOURCE_TYPE = 'linkedin';

const KNOWN_SKILLS = [
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Vue.js',
  'Nuxt',
  'Node.js',
  'Express',
  'Java',
  'Kotlin',
  'C#',
  '.NET',
  'ASP.NET Core',
  'Spring Boot',
  'PostgreSQL',
  'SQL',
  'NoSQL',
  'Oracle DB',
  'PostGIS',
  'REST APIs',
  'Web Services',
  'GraphQL',
  'Microservices',
  'OAuth2',
  'JWT',
  'Kafka',
  'RabbitMQ',
  'Redis',
  'Flutter',
  'Dart',
  'Android',
  'Figma',
  'System Design',
  'Testing',
  'Git',
  'React Native',
  'Python',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'Jenkins',
  'Helm',
  'OpenShift',
  'Maven',
  'Hibernate',
  'CI/CD',
  'DevOps',
  'Machine Learning',
  'Computer Vision',
  'OpenCV',
  'PyTorch',
  'TensorRT',
  'UI Design',
  'UX Research',
];
const SKILL_ALIASES = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  reactjs: 'React',
  'react.js': 'React',
  'react js': 'React',
  react: 'React',
  html5: 'HTML',
  html: 'HTML',
  css3: 'CSS',
  css: 'CSS',
  next: 'Next.js',
  'next.js': 'Next.js',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',
  nuxt: 'Nuxt',
  'nuxt.js': 'Nuxt',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  java: 'Java',
  kotlin: 'Kotlin',
  csharp: 'C#',
  'c#': 'C#',
  dotnet: '.NET',
  '.net': '.NET',
  net: '.NET',
  aspnet: 'ASP.NET Core',
  'asp.net': 'ASP.NET Core',
  'asp.net core': 'ASP.NET Core',
  spring: 'Spring Boot',
  'spring boot': 'Spring Boot',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  sql: 'SQL',
  nosql: 'NoSQL',
  oracle: 'Oracle DB',
  'oracle db': 'Oracle DB',
  postgis: 'PostGIS',
  rest: 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  api: 'REST APIs',
  apis: 'REST APIs',
  'web services': 'Web Services',
  graphql: 'GraphQL',
  microservices: 'Microservices',
  oauth2: 'OAuth2',
  jwt: 'JWT',
  kafka: 'Kafka',
  rabbitmq: 'RabbitMQ',
  redis: 'Redis',
  rn: 'React Native',
  'react native': 'React Native',
  flutter: 'Flutter',
  dart: 'Dart',
  android: 'Android',
  figma: 'Figma',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  aws: 'AWS',
  azure: 'Azure',
  jenkins: 'Jenkins',
  helm: 'Helm',
  openshift: 'OpenShift',
  maven: 'Maven',
  hibernate: 'Hibernate',
  devops: 'DevOps',
  cicd: 'CI/CD',
  'ci/cd': 'CI/CD',
  python: 'Python',
  pytorch: 'PyTorch',
  opencv: 'OpenCV',
  tensorrt: 'TensorRT',
};
const SKILL_CATEGORIES = {
  HTML: 'Frontend',
  CSS: 'Frontend',
  JavaScript: 'Frontend',
  TypeScript: 'Frontend',
  React: 'Frontend',
  'Next.js': 'Frontend',
  'Vue.js': 'Frontend',
  Nuxt: 'Frontend',
  Java: 'Backend',
  Kotlin: 'Backend',
  'C#': 'Backend',
  '.NET': 'Backend',
  'ASP.NET Core': 'Backend',
  'Spring Boot': 'Backend',
  Figma: 'Design',
  'UI Design': 'Design',
  'UX Research': 'Design',
  'React Native': 'Mobile',
  Flutter: 'Mobile',
  Dart: 'Mobile',
  'Node.js': 'Backend',
  Express: 'Backend',
  'REST APIs': 'Backend',
  'Web Services': 'Backend',
  GraphQL: 'Backend',
  Microservices: 'Backend',
  OAuth2: 'Security',
  JWT: 'Security',
  Kafka: 'Backend',
  RabbitMQ: 'Backend',
  Redis: 'Database',
  PostgreSQL: 'Database',
  SQL: 'Database',
  NoSQL: 'Database',
  'Oracle DB': 'Database',
  PostGIS: 'Database',
  Python: 'Backend',
  Android: 'Mobile',
  Docker: 'DevOps',
  Kubernetes: 'DevOps',
  AWS: 'DevOps',
  Azure: 'DevOps',
  Jenkins: 'DevOps',
  Helm: 'DevOps',
  OpenShift: 'DevOps',
  Maven: 'Tools',
  Hibernate: 'Backend',
  'CI/CD': 'DevOps',
  DevOps: 'DevOps',
  'Machine Learning': 'AI',
  'Computer Vision': 'AI',
  OpenCV: 'AI',
  PyTorch: 'AI',
  TensorRT: 'AI',
  'System Design': 'Architecture',
  Testing: 'Quality',
  Git: 'Tools',
};
const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const chars = (...codes) => String.fromCharCode(...codes);
const WINDOWS_1252_BYTES = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};
const repairWindows1252Mojibake = (value) => {
  const text = String(value || '');
  if (!/[ÂÃâð]/.test(text)) return text;

  let output = '';
  let buffer = [];

  const flushBuffer = () => {
    if (!buffer.length) return;
    const repaired = Buffer.from(buffer).toString('utf8');
    output += repaired.includes('\uFFFD')
      ? String.fromCharCode(...buffer)
      : repaired;
    buffer = [];
  };

  for (const char of text) {
    const code = char.charCodeAt(0);
    const byte = WINDOWS_1252_BYTES[code] || (code <= 0xff ? code : null);

    if (byte === null) {
      flushBuffer();
      output += char;
    } else if (
      code === 0x00c2 ||
      code === 0x00c3 ||
      code === 0x00e2 ||
      code === 0x00f0 ||
      buffer.length
    ) {
      buffer.push(byte);
    } else {
      output += char;
    }
  }

  flushBuffer();
  return output;
};
const MOJIBAKE_REPLACEMENTS = [
  [chars(0x00f0, 0x0178, 0x201c, 0x008d), 'Location:'],
  [chars(0x00f0, 0x0178, 0x00a7, 0x00be), 'Engagement Type:'],
  [chars(0x00f0, 0x0178, 0x2019, 0x00b7), 'Salary:'],
  [chars(0x00e2, 0x20ac, 0x2122), "'"],
  [chars(0x00e2, 0x20ac, 0x02dc), "'"],
  [chars(0x00e2, 0x20ac, 0x0153), '"'],
  [chars(0x00e2, 0x20ac, 0xfffd), '"'],
  [chars(0x00e2, 0x20ac, 0x201c), '-'],
  [chars(0x00e2, 0x20ac, 0x201d), '-'],
  [chars(0x00e2, 0x20ac, 0x00a6), '...'],
  [chars(0x00e2, 0x20ac, 0x00a2), '-'],
  [chars(0x00e2, 0x20ac, 0x2039), ''],
  [chars(0x00c2, 0x00ae), '(R)'],
  [chars(0x00c2, 0x00a9), '(C)'],
  [chars(0x00c2, 0x00a0), ' '],
  [chars(0x00c2), ''],
];
const fixMojibake = (value) => MOJIBAKE_REPLACEMENTS
  .reduce((text, [bad, good]) => text.split(bad).join(good), repairWindows1252Mojibake(value))
  .replace(/\s+/g, ' ');
const clean = (value) => fixMojibake(value).trim();
const cleanJobTextFields = (job) => ({
  ...job,
  title: clean(job.title),
  company: clean(job.company),
  location: job.location ? clean(job.location) : job.location,
  description: clean(job.description),
  category: job.category ? clean(job.category) : job.category,
  employment_type: job.employment_type ? clean(job.employment_type) : job.employment_type,
  salary_range: job.salary_range ? clean(job.salary_range) : job.salary_range,
  level: job.level ? clean(job.level) : job.level,
});
const canonicalSkill = (value) => {
  const text = clean(value);
  const key = text.toLowerCase().replace(/\s+/g, ' ');
  return SKILL_ALIASES[key] || text;
};
const unique = (items) => [...new Set(items.filter(Boolean))];
const uniqueSkills = (items) => unique(items.map(canonicalSkill));
const getSkillCategory = (skillName, fallback = 'General') => SKILL_CATEGORIES[canonicalSkill(skillName)] || fallback;
const skillNameOf = (skill) => (typeof skill === 'string' ? skill : skill?.name);
const expandSkillName = (name) => {
  const text = clean(name);
  const key = text.toLowerCase();
  if (key.includes('html5') && key.includes('css3')) return ['HTML', 'CSS'];
  if (key.includes('html') && key.includes('css')) return ['HTML', 'CSS'];
  return [canonicalSkill(text)];
};
const skillCategoryOf = (skill) => {
  if (skill && typeof skill === 'object' && skill.category) return skill.category;
  return getSkillCategory(skillNameOf(skill));
};
const textIncludesSkill = (text, skill) => {
  const haystack = String(text || '').toLowerCase();
  const variants = [skill, ...Object.entries(SKILL_ALIASES).filter(([, canonical]) => canonical === skill).map(([alias]) => alias)];
  return variants.some((variant) => {
    const escaped = String(variant).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
  });
};
const parseDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const actorIdForApi = (actorId) => String(actorId || '').replace('/', '~');

const extractSkills = (item) => {
  const explicit = [
    ...asArray(item.skills),
    ...asArray(item.requiredSkills),
    ...asArray(item.required_skills),
    ...asArray(item.jobSkills),
  ].map(clean);
  const haystack = `${item.title || ''} ${item.job_title || ''} ${item.description || ''} ${item.jobDescription || ''} ${item.job_description || ''} ${item.category || ''} ${item.industry || ''}`;
  const detected = KNOWN_SKILLS.filter((skill) => textIncludesSkill(haystack, skill));
  const fallback = [];
  const lowerHaystack = clean(haystack).toLowerCase();

  if (lowerHaystack.includes('backend') || lowerHaystack.includes('back-end')) {
    fallback.push('System Design', 'Testing');
    if (lowerHaystack.includes('api') || lowerHaystack.includes('endpoint')) fallback.push('REST APIs');
    if (lowerHaystack.includes('database')) fallback.push('SQL');
    if (lowerHaystack.includes('service architecture') || lowerHaystack.includes('clean architecture')) fallback.push('System Design');
    if (lowerHaystack.includes('infrastructure')) fallback.push('DevOps');
    if (lowerHaystack.includes('security') || lowerHaystack.includes('compliance')) fallback.push('JWT');
    if (lowerHaystack.includes('reliability')) fallback.push('Testing');
  }

  if (lowerHaystack.includes('fullstack') || lowerHaystack.includes('full-stack')) {
    fallback.push('JavaScript', 'REST APIs');
  }

  return uniqueSkills([...explicit, ...detected, ...fallback]);
};

const matchesSearch = (item, search) => {
  const tokens = String(search || '')
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  if (!tokens.length) return true;

  const genericTokens = new Set(['developer', 'engineer', 'software', 'mobile']);
  const techTokens = new Set([
    'software',
    'developer',
    'frontend',
    'front-end',
    'backend',
    'back-end',
    'fullstack',
    'full-stack',
    'mobile',
    'flutter',
    'dart',
    'react',
    'native',
    'node',
    'javascript',
    'typescript',
    'python',
    'ai',
    'machine',
    'data',
    'devops',
    'cloud',
    'web',
    'computer',
  ]);
  const nonSoftwareEngineeringTokens = [
    'procurement',
    'architectural',
    'civil',
    'mechanical',
    'electrical',
    'construction',
    'supply chain',
    'logistics',
    'bim',
    'real estate',
  ];
  const title = `${item.job_title || item.title || ''}`.toLowerCase();
  const description = `${item.job_description || item.description || ''}`.toLowerCase();
  const category = `${item.category || item.industry || item.industries || item.job_function || ''}`.toLowerCase();
  const haystack = `${title} ${description} ${category}`;
  const titleAndCategory = `${title} ${category}`;
  const specificTokens = tokens.filter((token) => !genericTokens.has(token));
  const expectsTechRole = tokens.some((token) => techTokens.has(token));
  const expectsFrontend = tokens.some((token) => ['frontend', 'front-end', 'react', 'web'].includes(token));
  const expectsBackend = tokens.some((token) => ['backend', 'back-end', 'node'].includes(token));
  const frontendSignal = ['frontend', 'front-end', 'front end', 'react', 'vue', 'angular', 'web'].some((token) => titleAndCategory.includes(token));
  const backendSignal = ['backend', 'back-end', 'back end', 'server-side', 'node.js', 'nodejs', 'rails', 'django'].some((token) => titleAndCategory.includes(token));
  const looksLikeNonSoftwareEngineering = nonSoftwareEngineeringTokens.some((token) => haystack.includes(token));
  const hasTechSignal = [...techTokens].some((token) => titleAndCategory.includes(token));
  const hasRoleSignal = expectsFrontend
    ? frontendSignal
    : expectsBackend
      ? backendSignal
      : false;

  if (expectsTechRole && looksLikeNonSoftwareEngineering && !hasTechSignal) {
    return false;
  }

  if (expectsFrontend && backendSignal && !frontendSignal) {
    return false;
  }

  if (expectsBackend && frontendSignal && !backendSignal) {
    return false;
  }

  const genericMatchesTitle = tokens
    .filter((token) => genericTokens.has(token))
    .some((token) => title.includes(token));

  if (specificTokens.length) {
    const titleSpecificMatch = specificTokens.some((token) => titleAndCategory.includes(token));
    const descriptionSpecificMatch = specificTokens.some((token) => description.includes(token));
    const roleSpecificMatch = expectsFrontend || expectsBackend
      ? hasRoleSignal || titleSpecificMatch
      : descriptionSpecificMatch;
    return titleSpecificMatch || roleSpecificMatch || (genericMatchesTitle && (!expectsTechRole || hasTechSignal));
  }

  return genericMatchesTitle && (!expectsTechRole || hasTechSignal);
};
const normalizeApifyJob = (item) => {
  const title = clean(item.title || item.jobTitle || item.job_title || item.position || item.positionName || item.jobPosition || item.name);
  const company = clean(item.company || item.companyName || item.company_name || item.organization || item.employer);
  const url = clean(item.url || item.jobUrl || item.job_url || item.applyUrl || item.apply_url || item.link || item.linkedinUrl);
  const description = clean(item.description || item.jobDescription || item.job_description || item.descriptionText || item.summary);
  const location = clean(item.location || item.jobLocation || item.locationName || item.country || item.city);
  const externalId = clean(item.id || item.jobId || item.job_id || url) || jobsRepository.createExternalId(`${title}-${company}-${url}`);

  if (!title || !company) return null;

  return {
    title,
    company,
    location: location || null,
    description: description || `${title} role at ${company}.`,
    source: 'apify_linkedin',
    source_type: 'linkedin',
    external_id: externalId,
    apply_url: url || null,
    required_skills: extractSkills(item),
    employment_type: clean(item.employmentType || item.employment_type || item.jobType || item.workplaceType) || null,
    salary_range: clean(item.salary || item.salaryRange || item.salary_range || item.compensation) || null,
    level: clean(item.level || item.experienceLevel || item.seniorityLevel || item.seniority_level) || null,
    category: clean(item.category || item.industry || item.industries || item.job_function || 'Technology') || 'Technology',
    thumbnail_url: clean(item.image || item.thumbnailUrl || item.companyLogo || item.company_logo_url) || null,
    company_logo_url: clean(item.companyLogo || item.company_logo_url || item.logo || item.logoUrl) || null,
    certificate_provider: null,
    duration: null,
    is_active: true,
    status: 'published',
    posted_at: parseDateOrNull(item.postedAt || item.datePosted || item.createdAt || item.posted_at),
  };
};

const buildSearchContext = async ({ userId, search, location }) => {
  if (search || location || !userId) {
    return {
      search: search || process.env.APIFY_DEFAULT_SEARCH || 'frontend developer',
      location: location || process.env.APIFY_DEFAULT_LOCATION || 'Egypt',
    };
  }

  const [skills, profile] = await Promise.all([
    jobsRepository.listUserSkills(userId),
    jobsRepository.getUserProfile(userId),
  ]);
  const careerTitle = profile?.career_paths?.title || profile?.headline;
  return {
    search: [careerTitle || 'frontend developer', ...skills.slice(0, 3).map((skill) => skill.name)].filter(Boolean).join(' '),
    location: profile?.location || process.env.APIFY_DEFAULT_LOCATION || 'Egypt',
  };
};

const buildApifyInput = ({ search, location, maxItems, input }) => {
  if (input && typeof input === 'object') return input;
  if (process.env.APIFY_DEFAULT_INPUT_JSON) {
    try { return JSON.parse(process.env.APIFY_DEFAULT_INPUT_JSON); }
    catch (error) { throw new AppError('Invalid APIFY_DEFAULT_INPUT_JSON', 500, { reason: error.message }); }
  }
  const actorMinEntries = Math.max(10, Number(process.env.APIFY_ACTOR_MIN_ENTRIES) || 10);
  return {
    job_title: search,
    location,
    jobs_entries: Math.max(actorMinEntries, Number(maxItems) || actorMinEntries),
    start_jobs: 0,
    posted_within: process.env.APIFY_POSTED_WITHIN || 'Past Week',
    proxyConfiguration: { useApifyProxy: true },
  };
};

const syncJobsFromApify = async ({ userId, search, location, maxItems, input, allowFallback = false }) => {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_ACTOR_ID;
  if (!token || !actorId) throw new AppError('Apify token and actor id are required', 500);

  const context = await buildSearchContext({ userId, search, location });
  const hardMaxItems = Math.min(30, Math.max(1, Number(process.env.APIFY_HARD_MAX_ITEMS) || 30));
  const safeMaxItems = Math.min(hardMaxItems, Math.max(1, Number(maxItems || process.env.APIFY_MAX_ITEMS) || hardMaxItems));
  const maxRunCostUsd = Math.max(0.01, Number(process.env.APIFY_MAX_RUN_COST_USD) || 0.05);
  const actorInput = buildApifyInput({ ...context, maxItems: safeMaxItems, input });
  const url = `https://api.apify.com/v2/acts/${actorIdForApi(actorId)}/run-sync-get-dataset-items`;

  let response;
  try {
    response = await axios.post(url, actorInput, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      params: {
        timeout: 90,
        memory: 512,
        maxItems: safeMaxItems,
        maxTotalChargeUsd: maxRunCostUsd,
      },
      timeout: 130000,
    });
  } catch (error) {
    throw new AppError('Apify jobs sync failed', error.response?.status || 502, {
      providerStatus: error.response?.status,
      providerMessage: error.response?.data?.error?.message || error.response?.data?.message || error.message,
      providerData: error.response?.data,
      search: context.search,
      location: context.location,
      maxItems: safeMaxItems,
      maxRunCostUsd,
    });
  }

  const items = Array.isArray(response.data) ? response.data : response.data?.items || [];
  const normalizedItems = items.map(normalizeApifyJob).filter(Boolean);
  const relevantItems = normalizedItems.filter((item) => matchesSearch(item, context.search)).slice(0, safeMaxItems);
  const fallbackJobs = allowFallback && !relevantItems.length ? normalizedItems.slice(0, safeMaxItems) : [];
  const normalizedJobs = (relevantItems.length ? relevantItems : fallbackJobs).map(cleanJobTextFields);
  const savedJobs = (await jobsRepository.upsertJobs(normalizedJobs)).map(cleanJobTextFields);
  return {
    ...context,
    requestedMaxItems: Number(maxItems || process.env.APIFY_MAX_ITEMS) || hardMaxItems,
    effectiveMaxItems: safeMaxItems,
    maxRunCostUsd,
    fetchedCount: items.length,
    matchedInputCount: relevantItems.length,
    fallbackUsed: Boolean(fallbackJobs.length),
    normalizedCount: normalizedJobs.length,
    savedCount: savedJobs.length,
    jobs: savedJobs,
  };
};

const getJobSkills = (job) => {
  const explicit = asArray(job.required_skills).map(clean);
  if (explicit.length) return uniqueSkills(explicit);
  return extractSkills(job);
};

const DEFAULT_MIN_MATCH_SCORE = 50;
const MATCHED_JOBS_CACHE_TTL_HOURS = Math.max(
  1,
  Number(process.env.USER_MATCHED_JOBS_CACHE_TTL_HOURS || process.env.JOBS_SYNC_INTERVAL_HOURS) || 12,
);

const includeManualJobs = (value) => value === true || value === 'true';
const isSyncedJob = (job) =>
  job?.source === SYNCED_JOB_SOURCE || job?.source_type === SYNCED_JOB_SOURCE_TYPE;
const isTruthy = (value) => value === true || value === 'true';
const isFalsey = (value) => value === false || value === 'false';
const hasAny = (text, tokens) => tokens.some((token) => text.includes(token));
const isCareerAlignedJob = (job, profileOrSearch) => {
  const target = typeof profileOrSearch === 'string'
    ? profileOrSearch
    : `${profileOrSearch?.career_paths?.title || ''} ${profileOrSearch?.career_paths?.category || ''} ${profileOrSearch?.headline || ''}`;
  const targetText = String(target || '').toLowerCase();
  const jobRoleText = `${job?.title || ''} ${job?.category || ''}`.toLowerCase();
  const jobSkillsText = asArray(job?.required_skills).join(' ').toLowerCase();
  const jobText = `${jobRoleText} ${jobSkillsText}`;

  const frontendSignals = ['frontend', 'front-end', 'front end', 'react', 'angular', 'vue', 'ui developer'];
  const backendSignals = ['backend', 'back-end', 'back end', 'node', 'express', 'java', '.net', 'spring', 'api', 'server'];
  const dataSignals = ['data analyst', 'data analysis', 'data engineer', 'analytics', 'business intelligence'];
  const mobileSignals = ['mobile', 'flutter', 'android', 'ios', 'react native'];

  const targetBackend = hasAny(targetText, ['backend', 'back-end', 'back end', 'node']);
  const targetFrontend = hasAny(targetText, ['frontend', 'front-end', 'front end', 'react']);
  const targetData = hasAny(targetText, ['data']);
  const targetMobile = hasAny(targetText, ['mobile', 'flutter', 'android', 'ios']);
  const roleBackend = hasAny(jobRoleText, backendSignals);
  const roleFrontend = hasAny(jobRoleText, frontendSignals);
  const skillBackend = hasAny(jobSkillsText, backendSignals);
  const skillFrontend = hasAny(jobSkillsText, frontendSignals);
  const jobData = hasAny(jobText, dataSignals);
  const jobMobile = hasAny(jobText, mobileSignals);

  if (targetBackend) return roleBackend || (skillBackend && !roleFrontend);
  if (targetFrontend) return roleFrontend || (skillFrontend && !roleBackend);
  if (targetData) return jobData;
  if (targetMobile) return jobMobile;
  return true;
};

const jobFromStoredMatch = (match) => {
  const { jobs: job } = match;
  if (!job) return null;

  return {
    ...job,
    match_id: match.id,
    match: {
      match_percentage: match.match_percentage,
      matched_skills: match.matched_skills || [],
      missing_skills: match.missing_skills || [],
      ai_reason: match.ai_reason,
      generated_by_type: match.generated_by_type,
      status: match.status,
      created_at: match.created_at,
    },
  };
};

const careerTokens = (profile) => {
  const career = `${profile?.career_paths?.title || ''} ${profile?.career_paths?.category || ''} ${profile?.headline || ''}`;
  return career
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !['and', 'the', 'for', 'with'].includes(token));
};

const calculateJobMatch = (job, userSkills = [], profile = null) => {
  const required = getJobSkills(job);
  const userSkillDetails = userSkills
    .flatMap((skill) => expandSkillName(skillNameOf(skill)).map((name) => ({
      name,
      category: getSkillCategory(name, skillCategoryOf(skill)),
      level: typeof skill === 'object' ? skill.level || null : null,
    })))
    .filter((skill) => skill.name);
  const userSkillSet = new Set(userSkillDetails.map((skill) => skill.name.toLowerCase()));
  const matched = required.filter((skill) => userSkillSet.has(canonicalSkill(skill).toLowerCase()));
  const missing = required.filter((skill) => !userSkillSet.has(canonicalSkill(skill).toLowerCase()));
  const matchedDetails = matched.map((name) => ({
    name,
    category: userSkillDetails.find((skill) => skill.name.toLowerCase() === canonicalSkill(name).toLowerCase())?.category || getSkillCategory(name),
  }));
  const missingDetails = missing.map((name) => ({ name, category: getSkillCategory(name) }));
  const categoryCounts = matchedDetails.reduce((acc, skill) => {
    acc[skill.category] = (acc[skill.category] || 0) + 1;
    return acc;
  }, {});
  const topSkillCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
  const skillScore = required.length ? Math.round((matched.length / required.length) * 80) : 25;

  const jobText = `${job.title || ''} ${job.category || ''} ${job.description || ''}`.toLowerCase();
  const tokens = careerTokens(profile);
  const careerHitCount = tokens.filter((token) => jobText.includes(token)).length;
  const careerScore = tokens.length ? Math.min(20, Math.round((careerHitCount / Math.min(tokens.length, 4)) * 20)) : 0;
  const score = Math.max(required.length ? 20 : 10, Math.min(100, skillScore + careerScore));

  const reasonParts = [];
  if (matched.length) {
    reasonParts.push(`Matches your skills in ${matched.slice(0, 3).join(', ')}`);
  }
  if (careerScore >= 10 && profile?.career_paths?.title) {
    reasonParts.push(`Aligned with your ${profile.career_paths.title} target`);
  }
  if (missing.length) {
    reasonParts.push(`Improve ${missing.slice(0, 3).join(', ')} to raise your score`);
  }

  return {
    match_percentage: Math.max(0, Math.min(100, score)),
    matched_skills: matched,
    missing_skills: missing,
    matched_skill_details: matchedDetails,
    missing_skill_details: missingDetails,
    top_skill_categories: topSkillCategories,
    ai_reason: reasonParts.length
      ? `${reasonParts.join('. ')}.`
      : 'Possible fit based on the job title and profile context. Add more skills to improve matching accuracy.',
  };
};

const listJobs = (filters) => jobsRepository.listJobs(filters);

const getJobById = async (id) => {
  const job = await jobsRepository.findJobById(id);
  if (!job) throw new AppError('Job not found', 404);
  return job;
};

const listMatchedJobs = async ({ userId, ...filters }) => {
  const profile = await jobsRepository.getUserProfile(userId);
  const requestedLimit = Math.min(30, Math.max(1, Number(filters.limit) || 20));
  const repositoryFilters = {
    ...filters,
    limit: Math.min(100, Math.max(requestedLimit * 3, requestedLimit)),
  };
  const buildJobs = (matches) => {
    const seenJobs = new Set();
    return matches
      .map(jobFromStoredMatch)
      .filter((job) => {
        if (!job || seenJobs.has(job.id)) return false;
        if (!includeManualJobs(filters.includeManual) && !isSyncedJob(job)) {
          return false;
        }
        if (!isCareerAlignedJob(job, profile)) return false;
        seenJobs.add(job.id);
        return true;
      })
      .slice(0, requestedLimit);
  };
  const cachedResult = await jobsRepository.listStoredMatchedJobs(userId, repositoryFilters);
  const cachedJobs = buildJobs(cachedResult.matches);
  const latestCachedAt = cachedResult.matches
    .map((match) => new Date(match.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0] || 0;
  const cacheAgeMs = latestCachedAt ? Date.now() - latestCachedAt : Infinity;
  const cacheTtlMs = MATCHED_JOBS_CACHE_TTL_HOURS * 60 * 60 * 1000;
  const cacheFresh = cachedJobs.length > 0 && cacheAgeMs < cacheTtlMs;
  const shouldUseCache = !isTruthy(filters.forceSync) && (cacheFresh || isFalsey(filters.autoSync));

  if (shouldUseCache) {
    return {
      jobs: cachedJobs,
      pagination: { ...cachedResult.pagination, totalItems: cachedJobs.length },
      sync: {
        skipped: true,
        reason: cacheFresh ? 'cached_matches_are_fresh' : 'auto_sync_disabled',
        cacheAgeHours: Number.isFinite(cacheAgeMs) ? Number((cacheAgeMs / 60 / 60 / 1000).toFixed(2)) : null,
        cacheTtlHours: MATCHED_JOBS_CACHE_TTL_HOURS,
      },
    };
  }

  let syncResult;
  try {
    syncResult = await syncJobsFromApify({
      userId,
      maxItems: requestedLimit,
      allowFallback: filters.includeFallback === true || filters.includeFallback === 'true',
    });
  } catch (error) {
    if (cachedJobs.length) {
      return {
        jobs: cachedJobs,
        pagination: { ...cachedResult.pagination, totalItems: cachedJobs.length },
        sync: {
          failed: true,
          fallbackToCache: true,
          message: error.message,
          cacheAgeHours: Number.isFinite(cacheAgeMs) ? Number((cacheAgeMs / 60 / 60 / 1000).toFixed(2)) : null,
          cacheTtlHours: MATCHED_JOBS_CACHE_TTL_HOURS,
        },
      };
    }
    throw error;
  }
  const syncedJobs = (syncResult.jobs || [])
    .filter((job) => isCareerAlignedJob(job, profile))
    .slice(0, requestedLimit);
  const jobMatchesService = require('../jobMatches/jobMatches.service');
  const matches = syncedJobs.length
    ? await jobMatchesService.generateMatches(userId, {
      jobIds: syncedJobs.map((job) => job.id),
      limit: requestedLimit,
      concurrency: Math.min(5, Math.max(1, Number(filters.concurrency) || 2)),
    })
    : [];
  const jobs = buildJobs(matches);

  return {
    jobs,
    pagination: {
      page: 1,
      limit: requestedLimit,
      totalItems: jobs.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    sync: {
      search: syncResult.search,
      location: syncResult.location,
      requestedMaxItems: syncResult.requestedMaxItems,
      effectiveMaxItems: syncResult.effectiveMaxItems,
      fetchedCount: syncResult.fetchedCount,
      matchedInputCount: syncResult.matchedInputCount,
      savedCount: syncResult.savedCount,
    },
  };
};

module.exports = {
  listJobs,
  getJobById,
  listMatchedJobs,
  syncJobsFromApify,
  calculateJobMatch,
  isCareerAlignedJob,
};
