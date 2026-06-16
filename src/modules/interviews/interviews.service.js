const AppError = require('../../common/errors/AppError');
const geminiService = require('../ai/gemini.service');
const ragService = require('../rag/rag.service');
const interviewsRepository = require('./interviews.repository');

const CACHE_SIMILARITY_THRESHOLD = 0.9;
const MIN_INTERVIEW_OUTPUT_TOKENS = 4096;
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
          'options',
          'correct_option_index',
        ],
        propertyOrdering: [
          'question_order',
          'question',
          'type',
          'skill',
          'options',
          'correct_option_index',
        ],
      },
    },
  },
  required: ['questions'],
  propertyOrdering: ['questions'],
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

const uniqueSkillsByName = (skills = []) => {
  const seen = new Set();
  const merged = [];

  skills.forEach((skill) => {
    const name = normalizeText(skill?.name);
    const key = name.toLowerCase();

    if (!name || seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push({
      id: skill?.id || null,
      name,
      category: skill?.category || null,
      level: skill?.level || null,
      source: skill?.source || null,
    });
  });

  return merged;
};

const cosineSimilarity = (left = [], right = []) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftNormSq = 0;
  let rightNormSq = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = Number(left[index]) || 0;
    const rightValue = Number(right[index]) || 0;
    dotProduct += leftValue * rightValue;
    leftNormSq += leftValue * leftValue;
    rightNormSq += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftNormSq) * Math.sqrt(rightNormSq);
  if (!denominator) {
    return 0;
  }

  return dotProduct / denominator;
};

const sortQuestionsByOrder = (questions = []) =>
  [...questions].sort((left, right) => left.question_order - right.question_order);

const normalizeOptions = (options = []) => {
  const normalized = [];
  const seen = new Set();

  (Array.isArray(options) ? options : []).forEach((option) => {
    const text = normalizeText(option);
    const key = text.toLowerCase();

    if (!text || seen.has(key) || normalized.length >= 4) {
      return;
    }

    seen.add(key);
    normalized.push(text);
  });

  return normalized;
};

const buildMcqOptions = ({ question, skill, interviewType, careerPath, questionIndex }) => {
  const focus = normalizeText(skill) || normalizeText(careerPath?.title) || 'the topic';
  const type = normalizeText(interviewType);
  const base = normalizeText(question).replace(/\?+$/, '');
  const variants = {
    technical: [
      `Walk through how you would implement ${focus} in a real project.`,
      `Explain the trade-offs of your chosen approach for ${focus}.`,
      `Describe how you would debug a problem related to ${focus}.`,
      `Compare your preferred solution with another possible approach for ${focus}.`,
    ],
    behavioral: [
      `Tell me about a time you handled a challenge involving ${focus}.`,
      `How did you coordinate with others while working on ${focus}?`,
      `Describe a situation where you had to adapt your approach for ${focus}.`,
      `What did you learn from a difficult experience related to ${focus}?`,
    ],
    mock_hr: [
      `What motivates you to keep improving in ${focus}?`,
      `How do you balance speed and quality when working on ${focus}?`,
      `Why does ${focus} fit your career direction?`,
      `How do you handle feedback while learning ${focus}?`,
    ],
  };

  const fallback = [
    `${base} in a practical project setting.`,
    `A high-level definition of ${focus}.`,
    `A yes/no answer about ${focus}.`,
    `A summary that does not connect ${focus} to implementation.`,
  ];

  const source = variants[type] || fallback.map((text) => `${text} (${questionIndex})`);
  const options = normalizeOptions(source);

  while (options.length < 4) {
    options.push(`${base} - option ${options.length + 1}`);
  }

  return options.slice(0, 4);
};

const normalizeCorrectOptionIndex = (value, options = []) => {
  const index = Number(value);

  if (Number.isInteger(index) && index >= 0 && index < options.length) {
    return index;
  }

  return 0;
};

const buildRequestText = ({ careerPath, interviewType, skills }) => {
  const skillNames = skills.map((skill) => skill.name).join(', ') || 'None';

  return [
    `Career Path: ${normalizeText(careerPath.title)}`,
    `Interview Type: ${capitalizeLabel(interviewType)}`,
    `Skills: ${skillNames}`,
  ].join('\n');
};

const buildSystemPrompt = (ragContext) =>
  [
    'You are an expert interview question generator for an AI career mentor backend.',
    'Generate interview questions that are specific, practical, and aligned with the provided context.',
    'Return valid JSON only.',
    'Each question should be concise, natural, and tailored to the career path, interview type, and skills.',
    ragContext ? `Rules and context:\n${ragContext}` : 'Rules and context: none provided.',
  ].join('\n\n');

const buildUserPrompt = ({ requestText, totalQuestions, interviewType }) =>
  [
    'Create a JSON object with this structure:',
    `{"questions":[{"question_order":1,"question":"text","type":"${normalizeText(interviewType) || 'technical'}","skill":"Flutter","options":["option 1","option 2","option 3","option 4"],"correct_option_index":0}]}`,
    `Return exactly ${totalQuestions} questions.`,
    'Each question must be an MCQ with exactly 4 options and one correct option index.',
    'Make options plausible and avoid yes/no answers.',
    'Do not include markdown fences, comments, or any extra text.',
    `Request text:\n${requestText}`,
  ].join('\n\n');

const buildUserPromptWithExclusions = ({
  requestText,
  totalQuestions,
  interviewType,
  excludedQuestions = [],
}) => {
  const exclusionBlock = excludedQuestions.length
    ? [
        'Do not repeat any of the following questions or closely paraphrase them:',
        ...excludedQuestions.slice(0, 30).map((question, index) => `${index + 1}. ${question}`),
      ].join('\n')
    : 'No prior questions were provided.';

  return [
    buildUserPrompt({ requestText, totalQuestions, interviewType }),
    exclusionBlock,
    'If needed, change the angle, wording, scenario, or skill focus so the set is meaningfully different from prior sessions.',
  ].join('\n\n');
};

const buildFallbackQuestions = ({
  totalQuestions,
  careerPath,
  interviewType,
  skills,
  excludedQuestions = [],
}) => {
  const skillNames = skills.length ? skills.map((skill) => skill.name) : [careerPath.title];
  const templatesByType = {
    technical: [
      (skill) => `How have you used ${skill} in a real project?`,
      (skill) => `What is the biggest challenge you have faced while working with ${skill}?`,
      (skill) => `How would you apply ${skill} to solve a production issue?`,
      (skill) => `Can you explain best practices you follow when using ${skill}?`,
      (skill) => `How would you improve the performance of a feature built with ${skill}?`,
      (skill) => `Tell me about a time you learned ${skill} quickly for a project.`,
    ],
    behavioral: [
      (skill) => `Tell me about a time you used ${skill} to help your team succeed.`,
      (skill) => `Describe a situation where you had to learn ${skill} quickly under pressure.`,
      (skill) => `How do you stay organized when working on projects that involve ${skill}?`,
      (skill) => `What is an example of a problem you solved using ${skill}?`,
      (skill) => `How do you communicate progress when working with ${skill} on a team?`,
      (skill) => `Tell me about a time you made a mistake while using ${skill} and how you handled it.`,
    ],
    mock_hr: [
      (skill) => `Why are you interested in roles that require ${skill}?`,
      (skill) => `What motivates you to keep improving your ${skill} skills?`,
      (skill) => `How do you handle feedback when improving your ${skill} work?`,
      (skill) => `What kind of team environment helps you do your best work with ${skill}?`,
      (skill) => `Where do you see your ${skill} experience helping you in the next role?`,
      (skill) => `How do you balance quality and speed when working with ${skill}?`,
    ],
  };
  const templates = templatesByType[interviewType] || templatesByType.technical;
  const excludedSet = new Set(
    (excludedQuestions || []).map((question) => normalizeText(question).toLowerCase()),
  );

  const questions = [];
  for (let index = 0; index < totalQuestions; index += 1) {
    const skill = skillNames[index % skillNames.length];
    const template = templates[index % templates.length];
    let questionText = template(skill);
    let variantIndex = 1;

    while (
      excludedSet.has(normalizeText(questionText).toLowerCase()) &&
      variantIndex <= 3
    ) {
      questionText = `${template(skill)} (variant ${variantIndex})`;
      variantIndex += 1;
    }

    questions.push({
      question_order: index + 1,
      question: questionText,
      type: interviewType,
      skill,
      options: buildMcqOptions({
        question: questionText,
        skill,
        interviewType,
        careerPath,
        questionIndex: index + 1,
      }),
      correct_option_index: 0,
    });
  }

  return questions;
};

const normalizeGeneratedQuestions = ({ questions, totalQuestions, fallbackContext }) => {
  const normalized = [];
  const seen = new Set();

  (Array.isArray(questions) ? questions : []).forEach((question, index) => {
    const text = normalizeText(question?.question);
    if (!text) {
      return;
    }

    const key = text.toLowerCase();
    if (seen.has(key) || normalized.length >= totalQuestions) {
      return;
    }

    seen.add(key);
    normalized.push({
      question_order: Number(question?.question_order) || index + 1,
      question: text,
      type: normalizeText(question?.type) || fallbackContext.interviewType,
      skill: normalizeText(question?.skill) || null,
      options: normalizeOptions(question?.options),
      correct_option_index: normalizeCorrectOptionIndex(
        question?.correct_option_index,
        normalizeOptions(question?.options),
      ),
    });
  });

  if (normalized.length < totalQuestions) {
    const fallbackQuestions = buildFallbackQuestions({
      totalQuestions,
      careerPath: fallbackContext.careerPath,
      interviewType: fallbackContext.interviewType,
      skills: fallbackContext.skills,
    });

    fallbackQuestions.forEach((question) => {
      if (normalized.length >= totalQuestions) {
        return;
      }

      const key = normalizeText(question.question).toLowerCase();
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      normalized.push(question);
    });
  }

  return normalized.slice(0, totalQuestions).map((question, index) => ({
    ...question,
    question_order: index + 1,
    options:
      question.options?.length === 4
        ? question.options
        : buildMcqOptions({
            question: question.question,
            skill: question.skill,
            interviewType: question.type || fallbackContext.interviewType,
            careerPath: fallbackContext.careerPath,
            questionIndex: index + 1,
          }),
    correct_option_index: normalizeCorrectOptionIndex(
      question.correct_option_index,
      question.options?.length === 4
        ? question.options
        : buildMcqOptions({
            question: question.question,
            skill: question.skill,
            interviewType: question.type || fallbackContext.interviewType,
            careerPath: fallbackContext.careerPath,
            questionIndex: index + 1,
          }),
    ),
  }));
};

const computeSignature = (questions = []) =>
  questions
    .map((question) => normalizeText(question.question).toLowerCase())
    .filter(Boolean)
    .join('||');

const getUserQuestionHistory = async (userId) => {
  const previousSessions = await interviewsRepository.listUserInterviewSessions(userId);
  if (!previousSessions.length) {
    return {
      signatures: new Set(),
      questions: [],
    };
  }

  const sessionIds = previousSessions.map((session) => session.id);
  const previousQuestions = await interviewsRepository.listQuestionsBySessionIds(sessionIds);

  const questionsBySession = previousQuestions.reduce((acc, question) => {
    if (!acc[question.interview_session_id]) {
      acc[question.interview_session_id] = [];
    }

    acc[question.interview_session_id].push(question);
    return acc;
  }, {});

  const signatures = new Set();
  const questions = [];

  Object.values(questionsBySession).forEach((sessionQuestions) => {
    const ordered = sessionQuestions.sort((left, right) => left.question_order - right.question_order);
    const signature = computeSignature(
      ordered.map((question) => ({ question: question.question })),
    );

    if (signature) {
      signatures.add(signature);
    }

    ordered.forEach((question) => {
      const text = normalizeText(question.question);
      if (text) {
        questions.push(text);
      }
    });
  });

  return {
    signatures,
    questions,
  };
};

const buildInterviewContext = async ({ userId, careerPathId }) => {
  const [careerPath, userSkills, cvs] = await Promise.all([
    interviewsRepository.findCareerPathById(careerPathId),
    interviewsRepository.listUserSkills(userId),
    interviewsRepository.listUserCvs(userId),
  ]);

  if (!careerPath) {
    throw new AppError('Career path not found', 404);
  }

  const latestRelevantCv =
    cvs.find((cv) => ['completed', 'analyzing'].includes(cv.status)) || cvs[0] || null;

  const cvSkills = latestRelevantCv
    ? await interviewsRepository.listCvSkills(latestRelevantCv.id)
    : [];

  const mergedSkills = uniqueSkillsByName([
    ...userSkills.map((skill) => ({ ...skill, source: 'user_skill' })),
    ...cvSkills.map((skill) => ({ ...skill, source: 'cv_skill' })),
  ]);

  return {
    careerPath,
    latestRelevantCv,
    skills: mergedSkills,
  };
};

const listCareerPaths = async () => {
  const careerPaths = await interviewsRepository.listActiveCareerPaths();

  return careerPaths.map((careerPath) => ({
    id: careerPath.id,
    title: careerPath.title,
    category: careerPath.category,
    difficulty_level: careerPath.difficulty_level,
  }));
};

const createInterviewSession = async ({ userId, payload }) => {
  if (!userId) {
    throw new AppError(
      'user_id is required when authentication is disabled',
      400,
    );
  }

  const context = await buildInterviewContext({
    userId,
    careerPathId: payload.career_path_id,
  });

  const requestText = buildRequestText({
    careerPath: context.careerPath,
    interviewType: payload.interview_type,
    skills: context.skills,
  });

  const previousHistory = await getUserQuestionHistory(userId);

  const embeddingResult = await geminiService.embedText({
    input: requestText,
  });
  const embedding = embeddingResult.embeddings?.[0] || [];
  const embeddingModel = embeddingResult.model;

  const cachedSets = await interviewsRepository.listQuestionSetCacheCandidates({
    interviewType: payload.interview_type,
    careerPathId: payload.career_path_id,
    embedding,
    matchThreshold: CACHE_SIMILARITY_THRESHOLD,
  });

  let bestCache = null;

  cachedSets.forEach((cacheSet) => {
    const similarity =
      typeof cacheSet.similarity === 'number'
        ? cacheSet.similarity
        : cosineSimilarity(
            embedding,
            interviewsRepository.normalizeEmbeddingValue(cacheSet.embedding || []),
          );
    if (
      similarity >= CACHE_SIMILARITY_THRESHOLD &&
      (!bestCache || similarity > bestCache.similarity)
    ) {
      bestCache = {
        ...cacheSet,
        similarity,
      };
    }
  });

  if (bestCache) {
    const cacheQuestionSignature = computeSignature(bestCache.questions || []);
    const alreadyUsed = previousHistory.signatures.has(cacheQuestionSignature);

    if (!alreadyUsed) {
      const insertedSession = await interviewsRepository.createInterviewSession({
        user_id: userId,
        career_path_id: payload.career_path_id,
        interview_type: payload.interview_type,
        total_questions: payload.total_questions,
        status: 'started',
        started_at: new Date().toISOString(),
      });

      const normalizedQuestions = normalizeGeneratedQuestions({
        questions: bestCache.questions,
        totalQuestions: payload.total_questions,
        fallbackContext: {
          careerPath: context.careerPath,
          interviewType: payload.interview_type,
          skills: context.skills,
        },
      });

      const questionRows = normalizedQuestions.map((question) => ({
        interview_session_id: insertedSession.id,
        question: question.question,
        question_order: question.question_order,
        options: question.options,
        correct_option_index: question.correct_option_index,
        question_format: 'mcq',
        is_skipped: false,
        answer_type: 'text',
        question_status: null,
        generated_by_type: 'ai',
      }));

      const createdQuestions = await interviewsRepository.createInterviewQuestions(
        questionRows,
      );

      const orderedQuestions = sortQuestionsByOrder(createdQuestions);

      return {
        session_id: insertedSession.id,
        questions: orderedQuestions.map((question) => ({
          id: question.id,
          question_order: question.question_order,
          question: question.question,
          options: question.options,
        })),
        cache: {
          hit: true,
          similarity: Number(bestCache.similarity.toFixed(4)),
        },
      };
    }
  }

  const ragContext = await ragService.getRagContextForFeature('interview_rules');
  const generationMaxTokens = Math.max(
    MIN_INTERVIEW_OUTPUT_TOKENS,
    payload.total_questions * 220,
  );

  const attemptGeneration = async ({ excludedQuestions = [] }) => {
    const systemPrompt = buildSystemPrompt(ragContext);
    const userPrompt = buildUserPromptWithExclusions({
      requestText,
      totalQuestions: payload.total_questions,
      interviewType: payload.interview_type,
      excludedQuestions,
    });

    const startedAt = Date.now();
    const generated = await geminiService.generateJsonCompletion({
      userId,
      feature: 'interview_session_generation',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      responseSchemaHint: 'INTERVIEW_QUESTIONS_GEMINI_SCHEMA',
      responseJsonSchema: INTERVIEW_QUESTIONS_GEMINI_SCHEMA,
      maxTokens: generationMaxTokens,
    });
    const latencyMs = Date.now() - startedAt;

    const normalizedQuestions = normalizeGeneratedQuestions({
      questions: generated.data?.questions,
      totalQuestions: payload.total_questions,
      fallbackContext: {
        careerPath: context.careerPath,
        interviewType: payload.interview_type,
        skills: context.skills,
      },
    });

    return {
      generated,
      latencyMs,
      normalizedQuestions,
      userPrompt,
    };
  };

  let generationResult = await attemptGeneration({
    excludedQuestions: previousHistory.questions,
  });

  let normalizedQuestions = generationResult.normalizedQuestions;
  let generatedSignature = computeSignature(normalizedQuestions);
  let retryCount = 0;

  while (
    previousHistory.signatures.has(generatedSignature) &&
    retryCount < 2
  ) {
    retryCount += 1;
    const excludedQuestions = [
      ...previousHistory.questions,
      ...normalizedQuestions.map((question) => question.question),
    ];

    generationResult = await attemptGeneration({
      excludedQuestions,
    });
    normalizedQuestions = generationResult.normalizedQuestions;
    generatedSignature = computeSignature(normalizedQuestions);
  }

  const latencyMs = generationResult.latencyMs;

  const session = await interviewsRepository.createInterviewSession({
    user_id: userId,
    career_path_id: payload.career_path_id,
    interview_type: payload.interview_type,
    total_questions: payload.total_questions,
    status: 'started',
    started_at: new Date().toISOString(),
  });

  const questionRows = normalizedQuestions.map((question) => ({
    interview_session_id: session.id,
    question: question.question,
    question_order: question.question_order,
    options: question.options,
    correct_option_index: question.correct_option_index,
    question_format: 'mcq',
    is_skipped: false,
    answer_type: 'text',
    question_status: null,
    generated_by_type: 'ai',
  }));

  const createdQuestions = await interviewsRepository.createInterviewQuestions(
    questionRows,
  );

  const orderedQuestions = sortQuestionsByOrder(createdQuestions);

  const cachePayload = {
    career_path_id: payload.career_path_id,
    interview_type: payload.interview_type,
    request_text: requestText,
    embedding,
    questions: normalizedQuestions,
    metadata: {
      career_path_id: payload.career_path_id,
      interview_type: payload.interview_type,
      skills: context.skills.map((skill) => skill.name),
      source: 'gemini',
      request_signature: computeSignature(normalizedQuestions),
      embedding_model: embeddingModel,
    },
  };

  await interviewsRepository.createQuestionSetCache(cachePayload);

  return {
    session_id: session.id,
    questions: orderedQuestions.map((question) => ({
      id: question.id,
      question_order: question.question_order,
      question: question.question,
      options: question.options,
    })),
    cache: {
      hit: false,
      similarity: null,
    },
  };
};

module.exports = {
  listCareerPaths,
  createInterviewSession,
  buildInterviewContext,
};
