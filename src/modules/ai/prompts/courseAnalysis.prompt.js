const COURSE_ANALYSIS_RESPONSE_SCHEMA = {
  category: 'Frontend',
  level: 'Beginner',
  duration: null,
  language: 'Arabic',
  skills_taught: [
    {
      name: 'HTML',
      confidence: 0.95,
    },
  ],
  prerequisites: [],
  learning_outcomes: ['Build basic web pages'],
  summary: 'Short normalized course summary',
  confidence: 0.9,
};

const COURSE_ANALYSIS_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    level: { type: 'string' },
    duration: { type: 'string', nullable: true },
    language: { type: 'string' },
    skills_taught: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['name', 'confidence'],
      },
    },
    prerequisites: { type: 'array', items: { type: 'string' } },
    learning_outcomes: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: [
    'category',
    'level',
    'duration',
    'language',
    'skills_taught',
    'prerequisites',
    'learning_outcomes',
    'summary',
    'confidence',
  ],
};

const buildCourseAnalysisMessages = ({ metadata, skillsCatalog, ragContext }) => {
  const schemaText = JSON.stringify(COURSE_ANALYSIS_RESPONSE_SCHEMA, null, 2);
  const metadataText = JSON.stringify(metadata, null, 2);
  const skillsText = JSON.stringify(skillsCatalog, null, 2);

  return [
    {
      role: 'system',
      content:
        'You are PathFinder AI Course Metadata Analyst. Return strict JSON only. Do not include markdown, comments, prose outside JSON, or extra top-level keys.',
    },
    {
      role: 'user',
      content: [
        'Analyze this course metadata for a career mentoring product.',
        '',
        'Return exactly this JSON shape:',
        schemaText,
        '',
        'Rules:',
        '- Extract structured course metadata only; do not decide which users should see the course.',
        '- skills_taught must contain skills that are clearly taught by the course metadata.',
        '- Prefer canonical skills from the skills catalog when the meaning matches a name or alias.',
        '- confidence must be a number from 0 to 1.',
        '- If duration is not visible, use null.',
        '- If language is unknown, infer only from visible text and otherwise use "Unknown".',
        '- Use RAG context as analysis guidance when relevant; still work when no context is available.',
        '- Keep arrays concise: skills_taught max 12, prerequisites max 8, learning_outcomes max 8.',
        '',
        'Course metadata:',
        metadataText,
        '',
        'Existing skills catalog:',
        skillsText,
        '',
        'RAG context for course_analysis:',
        ragContext || 'No RAG context is currently indexed for course_analysis.',
      ].join('\n'),
    },
  ];
};

module.exports = {
  COURSE_ANALYSIS_RESPONSE_SCHEMA,
  COURSE_ANALYSIS_GEMINI_SCHEMA,
  buildCourseAnalysisMessages,
};
