const INTERVIEW_QUESTIONS_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question_order: { type: 'integer' },
          question: { type: 'string' },
          type: { type: 'string' },
          skill: { type: 'string' },
          question_format: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
          correct_option_index: { type: 'integer' },
        },
        required: [
          'question_order',
          'question',
          'type',
          'skill',
          'question_format',
          'options',
          'correct_option_index',
        ],
        propertyOrdering: [
          'question_order',
          'question',
          'type',
          'skill',
          'question_format',
          'options',
          'correct_option_index',
        ],
      },
    },
  },
  required: ['questions'],
  propertyOrdering: ['questions'],
};

const INTERVIEW_SESSION_EVALUATION_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    quick_ai_insight: {
      type: 'string',
    },
    overall_score: {
      type: 'integer',
    },
    score_breakdown: {
      type: 'object',
      properties: {
        correct_answers: { type: 'integer' },
        wrong_answers: { type: 'integer' },
        skipped_answers: { type: 'integer' },
        total_questions: { type: 'integer' },
      },
      required: [
        'correct_answers',
        'wrong_answers',
        'skipped_answers',
        'total_questions',
      ],
      propertyOrdering: [
        'correct_answers',
        'wrong_answers',
        'skipped_answers',
        'total_questions',
      ],
    },
    feedback_text: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        strengths: {
          type: 'array',
          items: { type: 'string' },
        },
        areas_for_improvement: {
          type: 'array',
          items: { type: 'string' },
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
        skills_breakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill_name: { type: 'string' },
              score: { type: 'integer' },
              feedback: { type: 'string' },
              status: { type: 'string' },
            },
            required: ['skill_name', 'score', 'feedback', 'status'],
            propertyOrdering: ['skill_name', 'score', 'feedback', 'status'],
          },
        },
      },
      required: [
        'summary',
        'strengths',
        'areas_for_improvement',
        'recommendations',
      ],
      propertyOrdering: [
        'summary',
        'strengths',
        'areas_for_improvement',
        'recommendations',
        'skills_breakdown',
      ],
    },
    skills_breakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skill_name: { type: 'string' },
          score: { type: 'integer' },
          feedback: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['skill_name', 'score', 'feedback', 'status'],
        propertyOrdering: ['skill_name', 'score', 'feedback', 'status'],
      },
    },
    question_breakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question_id: { type: 'string' },
          question_order: { type: 'integer' },
          selected_option_index: { type: ['integer', 'null'] },
          is_correct: { type: 'boolean' },
          score: { type: 'integer' },
          question_status: { type: 'string' },
          feedback: { type: 'string' },
          ai_suggestion: { type: 'string' },
        },
        required: [
          'question_id',
          'question_order',
          'selected_option_index',
          'is_correct',
          'score',
          'question_status',
          'feedback',
          'ai_suggestion',
        ],
        propertyOrdering: [
          'question_id',
          'question_order',
          'selected_option_index',
          'is_correct',
          'score',
          'question_status',
          'feedback',
          'ai_suggestion',
        ],
      },
    },
  },
  required: [
    'quick_ai_insight',
    'overall_score',
    'score_breakdown',
    'feedback_text',
    'skills_breakdown',
    'question_breakdown',
  ],
  propertyOrdering: [
    'quick_ai_insight',
    'overall_score',
    'score_breakdown',
    'feedback_text',
    'skills_breakdown',
    'question_breakdown',
  ],
};

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const capitalizeLabel = (value) =>
  normalizeText(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildInterviewGenerationMessages = ({
  requestText,
  totalQuestions,
  interviewType,
  ragContext = '',
  excludedQuestions = [],
}) => {
  const exclusionBlock = excludedQuestions.length
    ? [
        'Do not repeat any of the following questions or closely paraphrase them:',
        ...excludedQuestions.slice(0, 30).map((question, index) => `${index + 1}. ${question}`),
      ].join('\n')
    : 'No prior questions were provided.';

  return [
    {
      role: 'system',
      content: [
        'You are an expert interview question generator for an AI career mentor backend.',
        'Generate interview questions that are specific, practical, and aligned with the provided context.',
        'Return valid JSON only.',
        'Each question should be concise, natural, and tailored to the career path, interview type, and skills.',
        ragContext ? `Rules and context:\n${ragContext}` : 'Rules and context: none provided.',
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        'Create a JSON object with this structure:',
        `{"questions":[{"question_order":1,"question":"text","type":"${normalizeText(interviewType) || 'technical'}","skill":"Flutter","question_format":"mcq","options":["option 1","option 2","option 3","option 4"],"correct_option_index":0}]}`,
        `Return exactly ${totalQuestions} questions.`,
        'Each question must be an MCQ with exactly 4 options and one correct option index.',
        'Make options plausible and avoid yes/no answers.',
        'Do not include markdown fences, comments, or any extra text.',
        `Request text:\n${requestText}`,
        exclusionBlock,
        'If needed, change the angle, wording, scenario, or skill focus so the set is meaningfully different from prior sessions.',
      ].join('\n\n'),
    },
  ];
};

const buildInterviewEvaluationMessages = ({
  session,
  careerPath,
  previousScore = null,
  questions = [],
  ragContext = '',
}) => {
  const summary = [
    `Career path: ${careerPath?.title || 'Unknown'}`,
    `Interview type: ${capitalizeLabel(session?.interview_type)}`,
    `Overall score: ${session?.overall_score ?? 0}/100`,
    `Previous score: ${previousScore === null ? 'none' : previousScore}`,
    `Stored status counts: ${JSON.stringify(session?.score_breakdown || {})}`,
    'Questions:',
    ...questions.map((question) => {
      const selected =
        question.selected_option_index === null
          ? 'selected_index=null'
          : `selected_index=${question.selected_option_index}`;
      const skipped = question.is_skipped ? 'skipped=true' : 'skipped=false';
      const correct =
        question.correct_option_index === null
          ? 'correct_index=null'
          : `correct_index=${question.correct_option_index}`;
      return [
        `- #${question.question_order}: ${question.question}`,
        `  question_id=${question.question_id}`,
        `  question_text=${JSON.stringify(question.question)}`,
        `  ${selected}`,
        `  selected_option_text=${JSON.stringify(question.selected_option_text)}`,
        `  ${correct}`,
        `  correct_option_text=${JSON.stringify(question.correct_option_text)}`,
        `  ${skipped}`,
        `  user_answer=${question.user_answer ? JSON.stringify(question.user_answer) : 'null'}`,
      ].join(' | ');
    }),
  ].join('\n');

  return [
    {
      role: 'system',
      content: [
        'You are an interview evaluator for PathFinder AI.',
        'Use the interview rules, generation rules, and feedback rules from the provided RAG context.',
        'Evaluate MCQ answers using the correct option index as the ground truth.',
        'Return JSON only.',
        'Do not invent data or add markdown fences.',
        'All insights, feedback, recommendations, and per-question evaluations must be generated by you.',
        'Only return JSON.',
        'Always include a non-empty skills_breakdown array with at least 4 items, even if the user skipped every question or provided no usable answers.',
        'Derive skills_breakdown from the user response patterns, question themes, and answer quality, not from the career path skill list.',
        'If evidence is limited, use interview-relevant competencies inferred from the answered questions, such as technical depth, problem solving, communication, clarity, and domain understanding.',
        ragContext ? `Rules and context:\n${ragContext}` : 'Rules and context: none provided.',
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        'Evaluate the interview session and return the final result payload.',
        'Return a JSON object with this structure:',
        '{"quick_ai_insight":"short text","overall_score":82,"score_breakdown":{"correct_answers":8,"wrong_answers":2,"skipped_answers":0,"total_questions":10},"feedback_text":{"summary":"text","strengths":["text"],"areas_for_improvement":["text"],"recommendations":["text"],"skills_breakdown":[{"skill_name":"React","score":90,"feedback":"text","status":"strong"}]},"skills_breakdown":[{"skill_name":"React","score":90,"feedback":"text","status":"strong"}],"question_breakdown":[{"question_id":"uuid","question_order":1,"selected_option_index":1,"is_correct":false,"score":0,"question_status":"needs_improvement","feedback":"text","ai_suggestion":"text"}]}',
        'Use the selected answer, selected option text, correct option, and skipped state to determine correctness.',
        'If a question was skipped, mark it as skipped and score it as 0.',
        'If an answer is correct, use passed and score 100.',
        'If an answer is wrong, use needs_improvement and score 0.',
        'The summary should be encouraging but honest and based on the actual answers.',
        'Strengths, areas for improvement, and recommendations must be specific and actionable.',
        'Skills breakdown must evaluate the major skills demonstrated in the answers and return clear scores and short feedback for each skill.',
        'If no answers were provided, still return skills breakdown based on the interview response patterns and explain that the evaluation is based on limited evidence.',
        'Keep the insight short, direct, and easy to display in a card.',
        `Session summary:\n${summary}`,
      ].join('\n\n'),
    },
  ];
};

module.exports = {
  INTERVIEW_QUESTIONS_GEMINI_SCHEMA,
  INTERVIEW_SESSION_EVALUATION_GEMINI_SCHEMA,
  buildInterviewGenerationMessages,
  buildInterviewEvaluationMessages,
};
