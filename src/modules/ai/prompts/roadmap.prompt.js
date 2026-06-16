const ROADMAP_RESPONSE_SCHEMA = {
  title: 'Roadmap to Senior Frontend Dev',
  description:
    "Personalized roadmap based on the user's CV analysis and target career.",
  estimatedDuration: '4 months',
  label: 'Professional Path',
  steps: [
    {
      title: 'Learn TypeScript Fundamentals',
      description:
        'Start with types, interfaces, functions, and React component typing.',
      skill_name: 'TypeScript',
      priority: 1,
      status: 'in_progress',
      estimated_duration: '2 weeks',
      recommended_course_ids: ['uuid'],
    },
  ],
  insights: {
    projectedSalaryIncrease: 24,
    matchingSeniorRoles: 8200,
  },
};

const ROADMAP_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    estimatedDuration: { type: 'string' },
    label: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          skill_name: { type: 'string' },
          priority: { type: 'integer' },
          status: { type: 'string' },
          estimated_duration: { type: 'string' },
          recommended_course_ids: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'title',
          'description',
          'skill_name',
          'priority',
          'status',
          'estimated_duration',
          'recommended_course_ids',
        ],
      },
    },
    insights: {
      type: 'object',
      properties: {
        projectedSalaryIncrease: { type: 'integer' },
        matchingSeniorRoles: { type: 'integer' },
      },
      required: ['projectedSalaryIncrease', 'matchingSeniorRoles'],
    },
  },
  required: [
    'title',
    'description',
    'estimatedDuration',
    'label',
    'steps',
    'insights',
  ],
};

const buildRoadmapMessages = ({
  profile,
  targetCareer,
  cvScore,
  detectedSkills,
  missingSkills,
  availableCourses,
  ragContext,
}) => {
  const schemaText = JSON.stringify(ROADMAP_RESPONSE_SCHEMA, null, 2);
  const inputText = JSON.stringify(
    {
      profile,
      targetCareer,
      cvScore,
      detectedSkills,
      missingSkills,
      availableCourses,
    },
    null,
    2,
  );

  return [
    {
      role: 'system',
      content:
        'You are PathFinder AI Roadmap Planner. Return strict JSON only. Do not include markdown, comments, prose outside JSON, or extra top-level keys.',
    },
    {
      role: 'user',
      content: [
        'Create a personalized learning roadmap after CV analysis.',
        '',
        'Return exactly this JSON shape:',
        schemaText,
        '',
        'Rules:',
        '- Use AI only to organize, sequence, pace, and personalize the roadmap.',
        '- Do not invent course IDs. recommended_course_ids must come only from availableCourses[].id.',
        '- Prefer existing missingSkills[].name values for skill_name. Do not invent a skill name when an existing skill gap matches the step.',
        '- Use the RAG context as roadmap guidance when relevant, especially ordering, pacing, beginner/fresh-grad/career-shifter handling, project-based steps, and course recommendation rules.',
        '- Keep steps focused and mobile-friendly. Prefer 3 to 8 steps.',
        '- If no course matches a step, use an empty recommended_course_ids array.',
        '- priority starts at 1 and lower numbers come earlier.',
        '- status should be in_progress only for the first step and upcoming for later steps.',
        '',
        'Roadmap input:',
        inputText,
        '',
        'RAG context for roadmap:',
        ragContext || 'No RAG context is currently indexed for roadmap.',
      ].join('\n'),
    },
  ];
};

module.exports = {
  ROADMAP_RESPONSE_SCHEMA,
  ROADMAP_GEMINI_SCHEMA,
  buildRoadmapMessages,
};
