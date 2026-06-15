const CV_ANALYSIS_RESPONSE_SCHEMA = {
  score: 0,
  summary: '',
  strengths: [],
  weaknesses: [],
  suggestions: [],
  detected_skills: [
    {
      name: '',
      category: '',
      level: '',
      confidence: 0,
      evidence: '',
    },
  ],
  missing_skills: [],
  recommended_roles: [],
  interview_focus: [],
  job_keywords: [],
  extracted: {
    experience_summary: {},
    education_summary: {},
    projects: [],
    certifications: [],
    languages: [],
    contact: {},
  },
};

const CV_ANALYSIS_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    detected_skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          level: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'string' },
        },
        required: ['name', 'category', 'level', 'confidence', 'evidence'],
      },
    },
    missing_skills: { type: 'array', items: { type: 'string' } },
    recommended_roles: { type: 'array', items: { type: 'string' } },
    interview_focus: { type: 'array', items: { type: 'string' } },
    job_keywords: { type: 'array', items: { type: 'string' } },
    extracted: {
      type: 'object',
      properties: {
        experience_summary: { type: 'object' },
        education_summary: { type: 'object' },
        projects: { type: 'array', items: { type: 'string' } },
        certifications: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        contact: { type: 'object' },
      },
      required: [
        'experience_summary',
        'education_summary',
        'projects',
        'certifications',
        'languages',
        'contact',
      ],
    },
  },
  required: [
    'score',
    'summary',
    'strengths',
    'weaknesses',
    'suggestions',
    'detected_skills',
    'missing_skills',
    'recommended_roles',
    'interview_focus',
    'job_keywords',
    'extracted',
  ],
};

const safeValue = (value) => value || null;

const buildProfileContext = (profile) => ({
  name: safeValue(profile?.user?.name),
  email: safeValue(profile?.user?.email),
  location: safeValue(profile?.profile?.location),
  education_level: safeValue(profile?.profile?.education_level),
  university: safeValue(profile?.profile?.university),
  major: safeValue(profile?.profile?.major),
  current_status: safeValue(profile?.profile?.current_status),
  experience_level: safeValue(profile?.profile?.experience_level),
  target_career_or_job_title: safeValue(profile?.profile?.target_career),
  headline: safeValue(profile?.profile?.headline),
  bio: safeValue(profile?.profile?.bio),
  experiences: profile?.experiences || [],
  education_history: profile?.education || [],
  preferences: profile?.preferences || null,
  achievements: profile?.achievements || [],
});

const buildCvAnalysisMessages = ({ profile, cvText, ragContext }) => {
  const schemaText = JSON.stringify(CV_ANALYSIS_RESPONSE_SCHEMA, null, 2);
  const profileText = JSON.stringify(buildProfileContext(profile), null, 2);

  return [
    {
      role: 'system',
      content:
        'You are PathFinder AI CV Analysis. Return strict JSON only. Do not include markdown, comments, prose outside JSON, or extra top-level keys.',
    },
    {
      role: 'user',
      content: [
        'Analyze this CV for a career mentoring product.',
        '',
        'Return exactly this JSON shape:',
        schemaText,
        '',
        'Rules:',
        '- score must be an integer from 0 to 100.',
        '- detected_skills[].confidence must be a number from 0 to 1.',
        '- detected_skills should contain skills with direct CV evidence only.',
        '- missing_skills, recommended_roles, interview_focus, and job_keywords must be arrays of strings.',
        '- extracted must summarize facts found in the CV, not guesses.',
        '- Use the RAG context as evaluation guidance when it is relevant.',
        '- Keep arrays concise: detected_skills max 12, suggestions max 8, projects max 8, certifications max 8.',
        '',
        'User register/profile data:',
        profileText,
        '',
        'RAG context for cv_analysis:',
        ragContext || 'No RAG context is currently indexed for cv_analysis.',
        '',
        'CV text:',
        cvText,
      ].join('\n'),
    },
  ];
};

module.exports = {
  CV_ANALYSIS_RESPONSE_SCHEMA,
  CV_ANALYSIS_GEMINI_SCHEMA,
  buildCvAnalysisMessages,
};
