const JOB_MATCHING_RESPONSE_SCHEMA = {
  match_percentage: 0,
  matched_skills: [],
  missing_skills: [],
  ai_reason: '',
};

const JOB_MATCHING_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    match_percentage: { type: 'integer', minimum: 0, maximum: 100 },
    matched_skills: { type: 'array', items: { type: 'string' } },
    missing_skills: { type: 'array', items: { type: 'string' } },
    ai_reason: { type: 'string' },
  },
  required: [
    'match_percentage',
    'matched_skills',
    'missing_skills',
    'ai_reason',
  ],
};

const truncate = (value, maxLength = 3000) => {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const buildProfileContext = ({ profile, skills }) => ({
  target_career: profile?.career_paths?.title || null,
  target_category: profile?.career_paths?.category || null,
  headline: profile?.headline || null,
  location: profile?.location || null,
  skills: (skills || []).map((skill) => ({
    name: skill.name,
    category: skill.category || null,
    level: skill.level || null,
  })),
});

const buildJobContext = (job) => ({
  id: job?.id,
  title: job?.title || null,
  company: job?.company || null,
  category: job?.category || null,
  level: job?.level || null,
  employment_type: job?.employment_type || null,
  location: job?.location || null,
  required_skills: job?.required_skills || [],
  description: truncate(job?.description),
});

const buildJobMatchingMessages = ({ profile, skills, job, ragContext }) => {
  const schemaText = JSON.stringify(JOB_MATCHING_RESPONSE_SCHEMA, null, 2);
  const profileText = JSON.stringify(buildProfileContext({ profile, skills }), null, 2);
  const jobText = JSON.stringify(buildJobContext(job), null, 2);

  return [
    {
      role: 'system',
      content:
        'You are PathFinder AI Job Matching. Return strict JSON only. Do not include markdown, comments, prose outside JSON, or extra top-level keys.',
    },
    {
      role: 'user',
      content: [
        'Evaluate how well this job matches the user profile and CV-derived skills.',
        '',
        'Return exactly this JSON shape:',
        schemaText,
        '',
        'Rules:',
        '- match_percentage must be an integer from 0 to 100.',
        '- Treat equivalent skills as matches, for example React.js = React, HTML5/CSS3 = HTML + CSS, REST API = REST APIs.',
        '- Prefer role relevance over loose keyword overlap. A DevOps, Data, UX, or Backend role should not be a strong match for a Frontend target unless the job is clearly full-stack/frontend-relevant.',
        '- A frontend job that mentions a backend integration can still be a frontend match.',
        '- matched_skills should list user skills that meaningfully satisfy job requirements or role responsibilities.',
        '- missing_skills should list the most important gaps only, max 8 items.',
        '- If the role is not relevant to the user target career, keep score below 50 unless there is strong transferable fit.',
        '- Use this scoring guide: 0-29 weak, 30-49 partial, 50-69 good, 70-89 strong, 90-100 excellent.',
        '- ai_reason should be one concise sentence suitable for a mobile UI.',
        '- Use the RAG context as product guidance when relevant, but do not copy it verbatim.',
        '',
        'User profile and skills:',
        profileText,
        '',
        'Job:',
        jobText,
        '',
        'RAG context for job_matching:',
        ragContext || 'No RAG context is currently indexed for job_matching.',
      ].join('\n'),
    },
  ];
};

module.exports = {
  JOB_MATCHING_RESPONSE_SCHEMA,
  JOB_MATCHING_GEMINI_SCHEMA,
  buildJobMatchingMessages,
};
