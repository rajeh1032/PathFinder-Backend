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
  buildCvAnalysisMessages,
};
