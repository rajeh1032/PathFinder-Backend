const AppError = require('../../common/errors/AppError');
const logger = require('../../common/utils/logger');
const aiService = require('../ai/ai.service');
const {
  INTERVIEW_SESSION_EVALUATION_GEMINI_SCHEMA,
  INTERVIEW_QUESTIONS_GEMINI_SCHEMA,
  buildInterviewEvaluationMessages,
  buildInterviewGenerationMessages,
} = require('../ai/prompts/interview.prompt');
const ragService = require('../rag/rag.service');
const { paginateData } = require('../../common/utils/pagination');
const interviewsRepository = require('./interviews.repository');

const CACHE_SIMILARITY_THRESHOLD = 0.9;
const MIN_INTERVIEW_OUTPUT_TOKENS = 4096;

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

const makeFallbackGenerationEnvelope = ({
  totalQuestions,
  careerPath,
  interviewType,
  skills,
  latencyMs = 0,
  reason = null,
}) => {
  const fallbackQuestions = buildFallbackQuestions({
    totalQuestions,
    careerPath,
    interviewType,
    skills,
  });

  return {
    generated: {
      data: {
        questions: fallbackQuestions,
      },
      model: 'local-fallback',
      raw: null,
      usage: null,
      latency_ms: latencyMs,
      fallback: true,
      fallback_reason: reason,
    },
    latencyMs,
    normalizedQuestions: normalizeGeneratedQuestions({
      questions: fallbackQuestions,
      totalQuestions,
      fallbackContext: {
        careerPath,
        interviewType,
        skills,
      },
    }),
    fallbackUsed: true,
  };
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

const getAuthenticatedUserId = (user) => {
  const userId = user?.userId || user?.id || null;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  return userId;
};

const getInterviewSessionByUser = async ({ userId, sessionId }) => {
  const session = await interviewsRepository.findInterviewSessionById(sessionId, userId);

  if (!session) {
    throw new AppError('Interview session not found', 404);
  }

  return session;
};

const getQuestionsForSession = async (sessionId) => {
  const questions = await interviewsRepository.listQuestionsBySessionIds([sessionId]);

  return sortQuestionsByOrder(questions.filter(Boolean));
};

const stripCorrectOptionIndex = (question) => {
  if (!question) {
    return null;
  }

  const { correct_option_index, ...publicQuestion } = question;
  return publicQuestion;
};

const formatQuestionForResponse = (question) => ({
  id: question.id,
  question_order: question.question_order,
  question: question.question,
  options: question.options || [],
  question_format: question.question_format || 'mcq',
  user_answer: question.user_answer ?? null,
  is_skipped: Boolean(question.is_skipped),
  answer_type: question.answer_type ?? null,
  answered_at: question.answered_at ?? null,
  feedback: question.feedback ?? null,
  score: question.score ?? null,
  question_status: question.question_status ?? null,
  ai_suggestion: question.ai_suggestion ?? null,
  generated_by_type: question.generated_by_type || 'ai',
});

const formatActiveQuestionForResponse = (question) => ({
  id: question.id,
  question_order: question.question_order,
  question: question.question,
  options: question.options || [],
  user_answer: question.user_answer ?? null,
  answer_type: 'mcq',
  is_skipped: Boolean(question.is_skipped),
  answered_at: question.answered_at ?? null,
  feedback: question.feedback ?? null,
  score: question.score ?? null,
  question_status: question.question_status ?? null,
  ai_suggestion: question.ai_suggestion ?? null,
});

const formatPublicQuestion = (question) => ({
  ...formatQuestionForResponse(stripCorrectOptionIndex(question)),
});

const normalizeSingleRelation = (value) =>
  Array.isArray(value) ? value[0] || null : value || null;

const getQuestionSelectedOptionIndex = (question, selectedOption = null) => {
  if (!question?.options || !Array.isArray(question.options) || !selectedOption) {
    return null;
  }

  const index = question.options.findIndex(
    (option) => normalizeText(option).toLowerCase() === normalizeText(selectedOption).toLowerCase(),
  );

  return index >= 0 ? index : null;
};

const buildQuestionEvaluationContext = (question) => {
  const selectedOptionIndex = getQuestionSelectedOptionIndex(question, question.user_answer);
  const correctOptionIndex =
    Number.isInteger(Number(question.correct_option_index)) && Array.isArray(question.options)
      ? Number(question.correct_option_index)
      : null;

  return {
    question_id: question.id,
    question_order: question.question_order,
    question: question.question,
    options: question.options || [],
    selected_option_index: selectedOptionIndex,
    selected_option_text:
      selectedOptionIndex === null ? null : question.options?.[selectedOptionIndex] || null,
    correct_option_index: correctOptionIndex,
    correct_option_text:
      correctOptionIndex === null ? null : question.options?.[correctOptionIndex] || null,
    user_answer: question.user_answer ?? null,
    is_skipped: Boolean(question.is_skipped),
  };
};

const buildQuestionStatusCounts = (questions = []) =>
  questions.reduce(
    (acc, question) => {
      if (question.question_status === 'passed') {
        acc.passed += 1;
      } else if (question.question_status === 'needs_improvement') {
        acc.needs_improvement += 1;
      } else if (question.question_status === 'skipped') {
        acc.skipped += 1;
      } else if (question.is_skipped || question.answered_at || question.user_answer !== null) {
        acc.pending_evaluation += 1;
      } else {
        acc.unanswered += 1;
      }

      return acc;
    },
    {
      passed: 0,
      needs_improvement: 0,
      skipped: 0,
      pending_evaluation: 0,
      unanswered: 0,
    },
  );

const buildQuestionProgressPayload = (session, questions = []) => {
  const counts = buildQuestionStatusCounts(questions);
  const totalQuestions = Number(session?.total_questions) || questions.length || 0;
  const completedQuestions =
    counts.passed + counts.needs_improvement + counts.skipped + counts.pending_evaluation;
  const answeredQuestions = counts.passed + counts.needs_improvement + counts.pending_evaluation;

  return {
    session_id: session?.id || null,
    status: session?.status || null,
    total_questions: totalQuestions,
    answered_count: answeredQuestions,
    skipped_count: counts.skipped,
    progress: totalQuestions ? Math.round((completedQuestions / totalQuestions) * 100) : 0,
    questions: questions.map(formatActiveQuestionForResponse),
  };
};

const getQuestionSelectedOption = (question, selectedOptionIndex) => {
  if (!question?.options || !Array.isArray(question.options)) {
    return null;
  }

  const index = Number(selectedOptionIndex);

  if (!Number.isInteger(index) || index < 0 || index >= question.options.length) {
    return null;
  }

  return question.options[index] || null;
};

const calculateSessionDuration = (session) => {
  if (!session?.started_at || !session?.completed_at) {
    return {
      duration_seconds: null,
      duration_minutes: null,
      duration_label: null,
    };
  }

  const startedAt = new Date(session.started_at).getTime();
  const completedAt = new Date(session.completed_at).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    return {
      duration_seconds: null,
      duration_minutes: null,
      duration_label: null,
    };
  }

  const durationSeconds = Math.max(0, Math.round((completedAt - startedAt) / 1000));
  const durationMinutes = Math.max(0, Math.round(durationSeconds / 60));

  return {
    duration_seconds: durationSeconds,
    duration_minutes: durationMinutes,
    duration_label: durationMinutes ? `${durationMinutes} min` : `${durationSeconds} sec`,
  };
};

const buildScoreComparison = (currentScore, previousSession = null) => {
  const current = Number(currentScore);
  const previous = Number(previousSession?.overall_score);

  if (!Number.isFinite(previous) || previous < 0) {
    return {
      current_score: Number.isFinite(current) ? current : 0,
      previous_score: null,
      previous_session_id: null,
      previous_completed_at: null,
      score_change: null,
      improvement_percentage: null,
      trend: 'no_previous_data',
    };
  }

  const safeCurrent = Number.isFinite(current) ? current : 0;
  const scoreChange = safeCurrent - previous;
  const improvementPercentage = previous > 0 ? Math.round((scoreChange / previous) * 100) : null;

  return {
    current_score: safeCurrent,
    previous_score: previous,
    previous_session_id: previousSession?.id || null,
    previous_completed_at: previousSession?.completed_at || null,
    score_change: scoreChange,
    improvement_percentage: improvementPercentage,
    trend: scoreChange > 0 ? 'improved' : scoreChange < 0 ? 'declined' : 'unchanged',
  };
};

const normalizeSkillsBreakdown = (skillsBreakdown = []) =>
  (Array.isArray(skillsBreakdown) ? skillsBreakdown : [])
    .map((item) => ({
      skill_name: String(item?.skill_name || item?.skill || '').trim(),
      score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
      feedback: String(item?.feedback || '').trim(),
      status: String(item?.status || 'needs_improvement').trim(),
    }))
    .filter((item) => item.skill_name);

const buildFallbackSkillsBreakdown = (interviewType = null) => {
  const byType = {
    technical: [
      'Technical Depth',
      'Problem Solving',
      'Communication',
      'System Design',
    ],
    behavioral: [
      'Communication',
      'Teamwork',
      'Adaptability',
      'Ownership',
    ],
    mock_hr: [
      'Self Presentation',
      'Communication',
      'Confidence',
      'Professionalism',
    ],
  };

  return (byType[interviewType] || byType.technical).map((skillName) => ({
    skill_name: skillName,
    score: 0,
    feedback: 'Limited evidence available for a detailed skill assessment.',
    status: 'insufficient_evidence',
  }));
};

const buildInterviewSessionResponse = (session) => ({
  id: session.id,
  user_id: session.user_id,
  career_path_id: session.career_path_id,
  career_path: normalizeSingleRelation(session.career_path)
    ? {
        id: normalizeSingleRelation(session.career_path).id || session.career_path_id || null,
        title: normalizeSingleRelation(session.career_path).title || null,
        category: normalizeSingleRelation(session.career_path).category || null,
        difficulty_level: normalizeSingleRelation(session.career_path).difficulty_level || null,
      }
    : null,
  job_id: session.job_id ?? null,
  status: session.status,
  interview_type: session.interview_type,
  total_questions: session.total_questions,
  started_at: session.started_at,
  completed_at: session.completed_at,
  overall_score: session.overall_score ?? null,
  quick_ai_insight: session.quick_ai_insight ?? null,
});

const buildInterviewHistoryItem = (session) => ({
  id: session.id,
  career_path_title: session.career_path?.title || null,
  interview_type: session.interview_type,
  status: session.status,
  total_questions: session.total_questions,
  overall_score: session.overall_score ?? null,
  quick_ai_insight: session.quick_ai_insight ?? null,
  started_at: session.started_at,
  completed_at: session.completed_at,
});

const buildInterviewHistorySummary = (sessions = []) => {
  const completedSessions = sessions.filter(
    (session) => session.status === 'completed' && Number.isFinite(Number(session.overall_score)),
  );
  const totalInterviews = sessions.length;
  const averageScore = completedSessions.length
    ? Math.round(
        completedSessions.reduce((sum, session) => sum + Number(session.overall_score || 0), 0) /
          completedSessions.length,
      )
    : null;
  const bestScore = completedSessions.length
    ? Math.max(...completedSessions.map((session) => Number(session.overall_score || 0)))
    : null;
  const latestCompletedSession = [...completedSessions].sort(
    (left, right) => new Date(right.completed_at || 0).getTime() - new Date(left.completed_at || 0).getTime(),
  )[0] || null;

  return {
    total_interviews: totalInterviews,
    average_score: averageScore,
    best_score: bestScore,
    latest_score: latestCompletedSession?.overall_score ?? null,
    latest_completed_at: latestCompletedSession?.completed_at || null,
  };
};

const buildAdminInterviewHistoryItem = (session) => ({
  id: session.id,
  user_name: session.user?.name || null,
  career_path_title: session.career_path?.title || null,
  interview_type: session.interview_type,
  status: session.status,
  total_questions: session.total_questions,
  overall_score: session.overall_score ?? null,
  quick_ai_insight: session.quick_ai_insight ?? null,
  started_at: session.started_at,
  completed_at: session.completed_at,
});

const buildAdminInterviewSearchHaystack = (session) =>
  [
    session.id,
    session.user_id,
    session.user?.name,
    session.user?.email,
    session.career_path_id,
    session.career_path?.title,
    session.career_path?.category,
    session.career_path?.difficulty_level,
    session.job_id,
    session.status,
    session.interview_type,
    session.total_questions,
    session.overall_score,
    session.quick_ai_insight,
    session.started_at,
    session.completed_at,
    session.created_at,
    session.updated_at,
    JSON.stringify(session.score_breakdown || {}),
    JSON.stringify(session.feedback_text || {}),
    session.recording_url,
  ]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => normalizeText(value).toLowerCase())
    .join(' | ');

const buildAdminInterviewQuestion = (question) => ({
  id: question.id,
  question_order: question.question_order,
  question: question.question,
  options: question.options || [],
  user_answer: question.user_answer ?? null,
  is_skipped: Boolean(question.is_skipped),
  answered_at: question.answered_at ?? null,
  feedback: question.feedback ?? null,
  score: question.score ?? null,
  question_status: question.question_status ?? null,
  ai_suggestion: question.ai_suggestion ?? null,
});

const buildAdminInterviewSessionResponse = (session, questions = []) => ({
  id: session.id,
  user_id: session.user_id,
  user_name: session.user?.name || null,
  user_email: session.user?.email || null,
  career_path_id: session.career_path_id,
  career_path_title: session.career_path?.title || null,
  career_path_category: session.career_path?.category || null,
  job_id: session.job_id ?? null,
  status: session.status,
  interview_type: session.interview_type,
  total_questions: session.total_questions,
  started_at: session.started_at,
  completed_at: session.completed_at,
  overall_score: session.overall_score ?? null,
  quick_ai_insight: session.quick_ai_insight ?? null,
  questions: questions.map(buildAdminInterviewQuestion),
});

const buildInterviewResultPayload = (session, questions = [], previousSession = null) => {
  const questionBreakdown = questions.map((question) => {
    const evaluation = buildQuestionEvaluationContext(question);

    return {
      id: question.id,
      question_order: question.question_order,
      question: question.question,
      options: question.options || [],
      selected_option_index: evaluation.selected_option_index,
      correct_option_index: question.correct_option_index ?? null,
      is_correct: question.question_status === 'passed',
      score: question.score ?? 0,
      question_status: question.question_status || 'unanswered',
      feedback: question.feedback || null,
      ai_suggestion: question.ai_suggestion || null,
    };
  });

  const duration = calculateSessionDuration(session);
  const sessionSkillsBreakdown = normalizeSkillsBreakdown(
    session.feedback_text?.skills_breakdown || [],
  );
  const comparison = buildScoreComparison(session.overall_score ?? 0, previousSession);

  return {
    session: {
      id: session.id,
      career_path_id: session.career_path_id,
      career_path: normalizeSingleRelation(session.career_path)
        ? {
            id: normalizeSingleRelation(session.career_path).id || session.career_path_id || null,
            title: normalizeSingleRelation(session.career_path).title || null,
            category: normalizeSingleRelation(session.career_path).category || null,
            difficulty_level: normalizeSingleRelation(session.career_path).difficulty_level || null,
          }
        : null,
      job_id: session.job_id,
      interview_type: session.interview_type,
      status: session.status,
      total_questions: session.total_questions,
      overall_score: session.overall_score ?? null,
      quick_ai_insight: session.quick_ai_insight || null,
      started_at: session.started_at || null,
      completed_at: session.completed_at || null,
      ...duration,
      score_breakdown: session.score_breakdown || null,
      feedback_text: session.feedback_text || null,
    },
    comparison,
    skills_breakdown: sessionSkillsBreakdown,
    question_breakdown: questionBreakdown,
    summary: {
      answered_questions: session.score_breakdown
        ? (session.score_breakdown.correct_answers || 0) +
          (session.score_breakdown.wrong_answers || 0)
        : Array.isArray(questionBreakdown)
          ? questionBreakdown.filter(
              (question) =>
                question.question_status === 'passed' ||
                question.question_status === 'needs_improvement',
            ).length
          : 0,
      skipped_questions: session.score_breakdown?.skipped_answers ?? (
        Array.isArray(questionBreakdown)
          ? questionBreakdown.filter(
              (question) => question.question_status === 'skipped',
            ).length
          : 0
      ),
      average_question_score: session.overall_score ?? 0,
    },
  };
};

const evaluateInterviewSession = async ({
  userId,
  session,
  questions,
  questionsForPrompt,
  previousScore = null,
}) => {
  let ragContext = '';
  try {
    ragContext = await ragService.getRagContextForFeature('interview');
  } catch (error) {
    logger.warn('Interview RAG context fetch failed during evaluation', {
      reason: error.message,
    });
  }
  const messages = buildInterviewEvaluationMessages({
    session: {
      ...session,
      total_questions: questionsForPrompt.length,
    },
    careerPath: normalizeSingleRelation(session.career_path),
    previousScore,
    questions: questionsForPrompt,
    ragContext,
  });

  const result = await aiService.generateJsonCompletion({
    userId,
    feature: 'interview_feedback',
    messages,
    responseSchemaHint: 'INTERVIEW_SESSION_EVALUATION_GEMINI_SCHEMA',
    responseJsonSchema: INTERVIEW_SESSION_EVALUATION_GEMINI_SCHEMA,
    maxTokens: Math.max(2048, questionsForPrompt.length * 300),
  });

  if (!result?.data?.question_breakdown || !Array.isArray(result.data.question_breakdown)) {
    throw new AppError('Interview evaluation response is invalid', 502);
  }

  return result.data;
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

  let embedding = [];
  let embeddingModel = 'local-fallback';
  let embeddingFailed = false;

  try {
    const embeddingResult = await aiService.embedText({
      input: requestText,
    });
    embedding = embeddingResult.embeddings?.[0] || [];
    embeddingModel = embeddingResult.model;
  } catch (error) {
    embeddingFailed = true;
    logger.warn('Interview embedding generation failed, falling back to local generation', {
      reason: error.message,
    });
  }

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
        answer_type: null,
        question_status: null,
        generated_by_type: 'ai',
      }));

      const createdQuestions = await interviewsRepository.createInterviewQuestions(
        questionRows,
      );

      const orderedQuestions = sortQuestionsByOrder(createdQuestions);

      return {
        session_id: insertedSession.id,
        status: insertedSession.status,
        career_path_id: insertedSession.career_path_id,
        interview_type: insertedSession.interview_type,
        total_questions: insertedSession.total_questions,
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

  let ragContext = '';
  try {
    ragContext = await ragService.getRagContextForFeature('interview');
  } catch (error) {
    logger.warn('Interview RAG context fetch failed, proceeding without it', {
      reason: error.message,
    });
  }
  const generationMaxTokens = Math.max(
    MIN_INTERVIEW_OUTPUT_TOKENS,
    payload.total_questions * 220,
  );

  const attemptGeneration = async ({ excludedQuestions = [] }) => {
    const messages = buildInterviewGenerationMessages({
      requestText,
      totalQuestions: payload.total_questions,
      interviewType: payload.interview_type,
      ragContext,
      excludedQuestions,
    });

    const startedAt = Date.now();

    try {
      const generated = await aiService.generateJsonCompletion({
        userId,
        feature: 'interview_session_generation',
        messages,
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
        fallbackUsed: false,
      };
    } catch (error) {
      logger.warn('Interview AI generation failed, falling back to local questions', {
        reason: error.message,
      });

      const latencyMs = Date.now() - startedAt;
      return makeFallbackGenerationEnvelope({
        totalQuestions: payload.total_questions,
        careerPath: context.careerPath,
        interviewType: payload.interview_type,
        skills: context.skills,
        latencyMs,
        reason: error.message,
      });
    }
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
    answer_type: null,
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
      source: generationResult.fallbackUsed ? 'local_fallback' : 'gemini',
      embedding_fallback: embeddingFailed,
      request_signature: computeSignature(normalizedQuestions),
      embedding_model: embeddingModel,
    },
  };

  try {
    await interviewsRepository.createQuestionSetCache(cachePayload);
  } catch (error) {
    logger.warn('Interview question cache store failed', {
      reason: error.message,
    });
  }

  return {
    session_id: session.id,
    status: session.status,
    career_path_id: session.career_path_id,
    interview_type: session.interview_type,
    total_questions: session.total_questions,
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

const listInterviewSessions = async ({ user, query = {} }) => {
  const userId = getAuthenticatedUserId(user);
  const sessions = await interviewsRepository.listInterviewSessionHistory(userId);
  const searchText = normalizeText(query.q).toLowerCase();
  const normalizedStatus = normalizeText(query.status);
  const normalizedInterviewType = normalizeText(query.interview_type);
  const normalizedCareerPathId = normalizeText(query.career_path_id);

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      !searchText ||
      [
        session.id,
        session.interview_type,
        session.status,
        session.career_path?.title,
        session.career_path?.category,
        session.quick_ai_insight,
      ]
        .filter(Boolean)
        .some((field) => normalizeText(field).toLowerCase().includes(searchText));

    const matchesStatus =
      !normalizedStatus || normalizeText(session.status) === normalizedStatus;
    const matchesInterviewType =
      !normalizedInterviewType ||
      normalizeText(session.interview_type) === normalizedInterviewType;
    const matchesCareerPath =
      !normalizedCareerPathId ||
      normalizeText(session.career_path_id) === normalizedCareerPathId;

    return matchesSearch && matchesStatus && matchesInterviewType && matchesCareerPath;
  });

  const sortedSessions = [...filteredSessions].sort((left, right) => {
    const rightDate = new Date(right.created_at || 0).getTime();
    const leftDate = new Date(left.created_at || 0).getTime();
    return rightDate - leftDate;
  });

  const { data, pagination } = paginateData(sortedSessions, query, sortedSessions.length);

  return {
    data: data.map(buildInterviewHistoryItem),
    pagination,
    summary: buildInterviewHistorySummary(filteredSessions),
  };
};

const listAdminInterviewSessions = async ({ query = {} }) => {
  const sessions = await interviewsRepository.listAllInterviewSessionHistory();
  const rawSearchTerms = [query.q, query.user_name]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean);
  const numericSearchTerm =
    rawSearchTerms.length === 1 && /^-?\d+(\.\d+)?$/.test(rawSearchTerms[0])
      ? Number(rawSearchTerms[0])
      : null;
  const normalizedStatus = normalizeText(query.status);
  const normalizedInterviewType = normalizeText(query.interview_type);
  const normalizedCareerPathId = normalizeText(query.career_path_id);

  const filteredSessions = sessions.filter((session) => {
    const haystack = buildAdminInterviewSearchHaystack(session);
    const matchesNumericScore =
      numericSearchTerm !== null
        ? Number(session.overall_score) === numericSearchTerm
        : false;
    const matchesSearch =
      !rawSearchTerms.length ||
      (numericSearchTerm !== null
        ? matchesNumericScore
        : rawSearchTerms.some((term) => haystack.includes(term)));

    const matchesStatus =
      !normalizedStatus || normalizeText(session.status) === normalizedStatus;
    const matchesInterviewType =
      !normalizedInterviewType ||
      normalizeText(session.interview_type) === normalizedInterviewType;
    const matchesCareerPath =
      !normalizedCareerPathId ||
      normalizeText(session.career_path_id) === normalizedCareerPathId;

    return matchesSearch && matchesStatus && matchesInterviewType && matchesCareerPath;
  });

  const sortedSessions = [...filteredSessions].sort((left, right) => {
    const rightDate = new Date(right.created_at || 0).getTime();
    const leftDate = new Date(left.created_at || 0).getTime();
    return rightDate - leftDate;
  });

  const { data, pagination } = paginateData(sortedSessions, query, sortedSessions.length);

  return {
    data: data.map(buildAdminInterviewHistoryItem),
    pagination,
    summary: buildInterviewHistorySummary(filteredSessions),
  };
};

const getInterviewSession = async ({ user, sessionId }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });

  return buildInterviewSessionResponse(session);
};

const getAdminInterviewSession = async ({ sessionId }) => {
  const session = await interviewsRepository.findAdminInterviewSessionById(sessionId);

  if (!session) {
    throw new AppError('Interview session not found', 404);
  }

  const questions = await getQuestionsForSession(session.id);
  return buildAdminInterviewSessionResponse(session, questions);
};

const getInterviewSessionQuestions = async ({ user, sessionId }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });
  const questions = await getQuestionsForSession(session.id);

  return buildQuestionProgressPayload(session, questions);
};

const updateInterviewSession = async ({ user, sessionId, payload = {} }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });
  const nextStatus = payload.status || null;

  if (!nextStatus && !payload.submit_partial) {
    return buildInterviewSessionResponse(session);
  }

  if (session.status === 'completed') {
    throw new AppError('Completed interview sessions cannot be updated', 400);
  }

  if (session.status === 'cancelled' && nextStatus !== 'cancelled') {
    throw new AppError('Cancelled interview sessions cannot be updated', 400);
  }

  if (nextStatus === 'completed' || payload.submit_partial) {
    return finishInterviewSession({ user, sessionId });
  }

  if (nextStatus === 'cancelled') {
    return cancelInterviewSession({ user, sessionId });
  }

  if (nextStatus && !['started', 'in_progress'].includes(nextStatus)) {
    throw new AppError('Invalid session status', 400);
  }

  const updatedSession = await interviewsRepository.updateInterviewSession(session.id, {
    status: nextStatus || session.status,
  });

  return buildInterviewSessionResponse(updatedSession);
};

const deleteAdminInterviewSession = async ({ sessionId }) => {
  const session = await interviewsRepository.findAdminInterviewSessionById(sessionId);

  if (!session) {
    throw new AppError('Interview session not found', 404);
  }

  await interviewsRepository.deleteInterviewSession(sessionId);

  return {
    session_id: sessionId,
    deleted: true,
  };
};

const answerInterviewQuestion = async ({ user, sessionId, questionId, payload }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });

  if (session.status === 'cancelled') {
    throw new AppError('Cancelled interview sessions cannot be updated', 400);
  }

  if (session.status === 'completed') {
    throw new AppError('Completed interview sessions cannot be updated', 400);
  }

  const question = await interviewsRepository.findInterviewQuestionById({
    sessionId,
    questionId,
  });

  if (!question) {
    throw new AppError('Interview question not found', 404);
  }

  const selectedOption = getQuestionSelectedOption(question, payload.selected_option_index);

  if (!selectedOption) {
    throw new AppError('Selected option is invalid', 400);
  }

  const updatedQuestion = await interviewsRepository.updateInterviewQuestion(question.id, {
    user_answer: selectedOption,
    is_skipped: false,
    answered_at: new Date().toISOString(),
    feedback: null,
    score: null,
    question_status: null,
    ai_suggestion: null,
  });

  const nextSessionStatus = session.status === 'started' ? 'in_progress' : session.status;
  const updatedSession = await interviewsRepository.updateInterviewSession(session.id, {
    status: nextSessionStatus,
  });

  return {
    session_id: updatedSession.id,
    question_id: updatedQuestion.id,
    selected_option_index: payload.selected_option_index,
    user_answer: selectedOption,
    answered_at: updatedQuestion.answered_at,
    session_status: updatedSession.status,
  };
};

const skipInterviewQuestion = async ({ user, sessionId, questionId }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });

  if (session.status === 'cancelled') {
    throw new AppError('Cancelled interview sessions cannot be updated', 400);
  }

  if (session.status === 'completed') {
    throw new AppError('Completed interview sessions cannot be updated', 400);
  }

  const question = await interviewsRepository.findInterviewQuestionById({
    sessionId,
    questionId,
  });

  if (!question) {
    throw new AppError('Interview question not found', 404);
  }

  const updatedQuestion = await interviewsRepository.updateInterviewQuestion(question.id, {
    user_answer: null,
    is_skipped: true,
    answered_at: new Date().toISOString(),
    feedback: null,
    score: null,
    question_status: null,
    ai_suggestion: null,
  });

  const nextSessionStatus = session.status === 'started' ? 'in_progress' : session.status;
  const updatedSession = await interviewsRepository.updateInterviewSession(session.id, {
    status: nextSessionStatus,
  });

  return {
    session_id: updatedSession.id,
    question_id: updatedQuestion.id,
    is_skipped: true,
    answered_at: updatedQuestion.answered_at,
    session_status: updatedSession.status,
  };
};

const finishInterviewSession = async ({ user, sessionId }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });
  const questions = await getQuestionsForSession(session.id);
  const questionsForPrompt = questions.map(buildQuestionEvaluationContext);
  const previousSession = await interviewsRepository.findPreviousCompletedInterviewSession({
    userId,
    careerPathId: session.career_path_id,
    interviewType: session.interview_type,
    beforeCompletedAt: session.completed_at || new Date().toISOString(),
    excludeSessionId: session.id,
  });

  if (session.status === 'cancelled') {
    throw new AppError('Cancelled interview sessions cannot be completed', 400);
  }

  if (session.status === 'completed' && session.score_breakdown && session.feedback_text) {
    return buildInterviewResultPayload(session, questions, previousSession);
  }

  const evaluation = await evaluateInterviewSession({
    userId,
    session,
    questions,
    questionsForPrompt,
    previousScore: previousSession?.overall_score ?? null,
  });

  const normalizedBreakdown = Array.isArray(evaluation.question_breakdown)
    ? evaluation.question_breakdown.map((item) => ({
        question_id: item.question_id,
        question_order: item.question_order,
        selected_option_index:
          item.selected_option_index === undefined ? null : item.selected_option_index,
        is_correct: Boolean(item.is_correct),
        score: Number(item.score) || 0,
        question_status: item.question_status || 'needs_improvement',
        feedback: String(item.feedback || '').trim(),
        ai_suggestion: String(item.ai_suggestion || '').trim(),
      }))
    : [];

  if (normalizedBreakdown.length !== questions.length) {
    throw new AppError('Interview evaluation did not return all question breakdown items', 502);
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const questionUpdates = normalizedBreakdown.map((item) => {
    const storedQuestion = questionById.get(item.question_id);

    if (!storedQuestion) {
      throw new AppError('Interview evaluation returned an unknown question id', 502);
    }

    return interviewsRepository.updateInterviewQuestion(storedQuestion.id, {
      feedback: item.feedback,
      score: item.score,
      question_status: item.question_status,
      ai_suggestion: item.ai_suggestion,
      is_skipped: item.question_status === 'skipped',
      answered_at: storedQuestion.answered_at || new Date().toISOString(),
    });
  });

  const updatedQuestions = await Promise.all(questionUpdates);
  const sessionScoreBreakdown = {
    correct_answers:
      evaluation.score_breakdown?.correct_answers ??
      normalizedBreakdown.filter((item) => item.question_status === 'passed').length,
    wrong_answers:
      evaluation.score_breakdown?.wrong_answers ??
      normalizedBreakdown.filter((item) => item.question_status === 'needs_improvement').length,
    skipped_answers:
      evaluation.score_breakdown?.skipped_answers ??
      normalizedBreakdown.filter((item) => item.question_status === 'skipped').length,
    total_questions:
      evaluation.score_breakdown?.total_questions ?? normalizedBreakdown.length,
  };

  const updatedSession = await interviewsRepository.updateInterviewSession(session.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    overall_score: Number(evaluation.overall_score) || 0,
    score_breakdown: sessionScoreBreakdown,
    quick_ai_insight: String(evaluation.quick_ai_insight || '').trim(),
    feedback_text: {
      ...evaluation.feedback_text,
      skills_breakdown:
        normalizeSkillsBreakdown(evaluation.skills_breakdown || []).length > 0
          ? normalizeSkillsBreakdown(evaluation.skills_breakdown || [])
          : buildFallbackSkillsBreakdown(session.interview_type),
    },
  });

  return buildInterviewResultPayload(
    {
      ...updatedSession,
      career_path: session.career_path,
      started_at: session.started_at,
    },
    updatedQuestions,
    previousSession,
  );
};

const getInterviewSessionResult = async ({ user, sessionId }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });
  if (session.status !== 'completed') {
    throw new AppError('Interview session is not completed yet', 409);
  }

  const questions = await getQuestionsForSession(session.id);
  const previousSession = await interviewsRepository.findPreviousCompletedInterviewSession({
    userId,
    careerPathId: session.career_path_id,
    interviewType: session.interview_type,
    beforeCompletedAt: session.completed_at,
    excludeSessionId: session.id,
  });

  const result = buildInterviewResultPayload(session, questions, previousSession);
  if (!result.skills_breakdown.length) {
    result.skills_breakdown = buildFallbackSkillsBreakdown(session.interview_type);
  }

  return result;
};

const cancelInterviewSession = async ({ user, sessionId }) => {
  const userId = getAuthenticatedUserId(user);
  const session = await getInterviewSessionByUser({ userId, sessionId });

  if (session.status === 'completed') {
    throw new AppError('Completed interview sessions cannot be cancelled', 400);
  }

  if (session.status === 'cancelled') {
    return {
      session,
    };
  }

  const updatedSession = await interviewsRepository.updateInterviewSession(session.id, {
    status: 'cancelled',
  });

  return {
    session: {
      ...updatedSession,
      career_path: session.career_path,
    },
  };
};

module.exports = {
  listCareerPaths,
  createInterviewSession,
  listInterviewSessions,
  listAdminInterviewSessions,
  getInterviewSession,
  getAdminInterviewSession,
  getInterviewSessionQuestions,
  updateInterviewSession,
  answerInterviewQuestion,
  skipInterviewQuestion,
  finishInterviewSession,
  getInterviewSessionResult,
  cancelInterviewSession,
  deleteAdminInterviewSession,
  buildInterviewContext,
};
