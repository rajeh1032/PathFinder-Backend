const AppError = require('../../common/errors/AppError');
const { ensureSupabase, handleSupabaseError } = require('../../common/utils/supabaseRepository');
const aiService = require('../ai/ai.service');
const jobsRepository = require('../jobs/jobs.repository');
const ragService = require('../rag/rag.service');

const COVER_SELECT = 'id,user_id,job_id,content,status,version,language,generated_by_type,title,score,tone,target_role,company_name,word_count,last_edited_at,exported_at,created_at,updated_at,jobs(id,title,company,location,description,required_skills)';
const COVER_LETTER_GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['success', 'warning', 'info'] },
          message: { type: 'string' },
        },
        required: ['type', 'message'],
      },
    },
  },
  required: ['content', 'score', 'insights'],
};

const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const clampScore = (value, fallback = 0) => Math.max(0, Math.min(100, Math.round(Number(value) || fallback)));
const asArray = (value) => Array.isArray(value) ? value : [];
const truncate = (value, maxLength = 2500) => {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const buildFallbackContent = ({ job, profile, payload }) => {
  const role = job.title;
  const company = job.company;
  const interest = payload.companyInterest || `I am excited by ${company}'s work and the opportunity to contribute to a high-impact team.`;
  const achievement = payload.achievement || 'I have built user-focused interfaces, improved product flows, and collaborated across design and engineering teams.';
  const skills = (job.required_skills || []).slice(0, 4).join(', ');
  return `Dear Hiring Team at ${company},\n\nI am writing to express my interest in the ${role} position. My background in ${skills || 'modern software development'} aligns well with the requirements of this role, and I am confident I can contribute meaningful value from day one.\n\n${achievement}\n\n${interest}\n\nThank you for considering my application. I would welcome the opportunity to discuss how my experience can support ${company}'s goals.\n\nSincerely,\n${profile?.headline || 'PathFinder AI Candidate'}`;
};

const getUserSkills = async (userId) => {
  return jobsRepository.listUserSkills(userId);
};

const getLatestCvAnalysis = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cvs')
    .select('id,original_name,created_at,cv_analyses(score,summary,strengths,weaknesses,suggestions,detected_skills,extracted,status,created_at)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  handleSupabaseError(error, 'Failed to fetch latest CV analysis');

  const analysis = Array.isArray(data?.cv_analyses)
    ? data.cv_analyses[0]
    : data?.cv_analyses;

  if (!analysis) return null;

  return {
    cv_id: data.id,
    original_name: data.original_name,
    cv_score: analysis.score,
    summary: analysis.summary,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    suggestions: analysis.suggestions,
    detected_skills: analysis.detected_skills,
    extracted: analysis.extracted,
  };
};

const calculateFallbackScore = ({ job, profile, skills, cvAnalysis }) => {
  const required = asArray(job.required_skills).map((skill) => String(skill).toLowerCase());
  const userSkills = skills.map((skill) => String(skill.name || '').toLowerCase());
  const matchedCount = required.filter((skill) =>
    userSkills.some((userSkill) => userSkill === skill || userSkill.includes(skill) || skill.includes(userSkill)),
  ).length;
  const skillScore = required.length ? Math.round((matchedCount / required.length) * 55) : 20;
  const target = String(profile?.career_paths?.title || '').toLowerCase();
  const role = `${job.title || ''} ${job.category || ''}`.toLowerCase();
  const targetScore = target && role.includes(target.split(/\s+/)[0]) ? 20 : 5;
  const cvScore = cvAnalysis ? 15 : 0;
  return clampScore(skillScore + targetScore + cvScore, cvAnalysis ? 70 : 45);
};

const normalizeAiResult = (result, fallbackContent, fallbackScore) => {
  const content = String(result?.content || fallbackContent || '').trim();
  const score = clampScore(result?.score, fallbackScore);
  const insights = asArray(result?.insights)
    .map((item) => ({
      type: ['success', 'warning', 'info'].includes(item?.type) ? item.type : 'info',
      message: String(item?.message || '').trim(),
    }))
    .filter((item) => item.message)
    .slice(0, 4);

  return {
    content,
    score,
    insights,
  };
};

const callGemini = async ({ userId, job, profile, skills, cvAnalysis, payload, ragContext }) => {
  const skillText = skills.map((skill) => `${skill.name}${skill.level ? ` (${skill.level})` : ''}`).join(', ') || 'N/A';
  const fallbackContent = buildFallbackContent({ job, profile, payload });
  const fallbackScore = calculateFallbackScore({ job, profile, skills, cvAnalysis });
  const messages = [
    {
      role: 'system',
      content:
        'You are PathFinder AI Cover Letter Assistant. Return strict JSON only. Do not include markdown, comments, prose outside JSON, or extra top-level keys.',
    },
    {
      role: 'user',
      content: [
        'Write one concise, professional cover letter and evaluate its strength.',
        '',
        'Return exactly this JSON shape:',
        JSON.stringify({ content: '', score: 0, insights: [{ type: 'success', message: '' }] }, null, 2),
        '',
        `Role: ${job.title}`,
        `Company: ${job.company}`,
        `Location: ${job.location || 'N/A'}`,
        `Job description: ${truncate(job.description) || 'N/A'}`,
        `Required skills: ${(job.required_skills || []).join(', ') || 'N/A'}`,
        `Tone: ${payload.tone || 'professional'}`,
        `Language: ${payload.language || 'en'}`,
        `Focus keywords: ${(payload.keywords || []).join(', ') || 'N/A'}`,
        '',
        'Candidate profile:',
        `Headline: ${profile?.headline || 'N/A'}`,
        `Target career: ${profile?.career_paths?.title || 'N/A'}`,
        `Location: ${profile?.location || 'N/A'}`,
        `Major: ${profile?.major || 'N/A'}`,
        `Skills: ${skillText}`,
        `Company interest: ${payload.companyInterest || 'N/A'}`,
        `Achievement to mention: ${payload.achievement || 'N/A'}`,
        '',
        'Latest CV analysis:',
        cvAnalysis
          ? JSON.stringify({
            cv_score: cvAnalysis.cv_score,
            summary: cvAnalysis.summary,
            strengths: cvAnalysis.strengths,
            weaknesses: cvAnalysis.weaknesses,
            suggestions: cvAnalysis.suggestions,
            detected_skills: cvAnalysis.detected_skills,
            extracted: cvAnalysis.extracted,
          }, null, 2)
          : 'No completed CV analysis is available. Keep score conservative because evidence is limited.',
        '',
        'RAG context for cover_letter:',
        ragContext || 'No RAG context is currently indexed for cover_letter.',
        '',
        'Requirements:',
        '- Keep it between 140 and 220 words.',
        '- Make it tailored to the role and company.',
        '- Mention the candidate skills naturally.',
        '- Avoid inventing experience not provided.',
        '- score must be 0-100 and reflect the cover letter quality against job requirements, user skills, and CV evidence.',
        '- If no CV analysis exists, do not give an excellent score unless profile and skills are strongly aligned.',
        '- insights must be short mobile-friendly review notes: at least one success, one warning, and one info when possible.',
        '- Follow the RAG context as product guidance when relevant, but do not copy it verbatim.',
      ].join('\n'),
    },
  ];

  try {
    const result = await aiService.generateJsonCompletion({
      userId,
      feature: 'cover_letter',
      messages,
      responseSchemaHint: 'Cover letter content, score, and review insights',
      responseJsonSchema: COVER_LETTER_GEMINI_SCHEMA,
      temperature: 0.7,
      maxTokens: 1400,
    });
    return normalizeAiResult(result.data, fallbackContent, fallbackScore);
  } catch (error) {
    return {
      content: fallbackContent,
      score: fallbackScore,
      insights: [],
      fallbackUsed: true,
    };
  }
};

const getProfile = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('profiles').select('headline,bio,location,university,major,career_paths(title,category)').eq('user_id', userId).maybeSingle();
  handleSupabaseError(error, 'Failed to fetch profile');
  return data;
};

const createInsights = async (coverLetterId, content, aiInsights = []) => {
  const client = ensureSupabase();
  const rows = aiInsights.length ? aiInsights.map((insight) => ({
    cover_letter_id: coverLetterId,
    type: insight.type,
    message: insight.message,
  })) : [
    { cover_letter_id: coverLetterId, type: 'success', message: 'Strong alignment with job requirements' },
    { cover_letter_id: coverLetterId, type: 'success', message: 'Good use of relevant experience' },
    { cover_letter_id: coverLetterId, type: 'warning', message: countWords(content) < 160 ? 'Add measurable achievements' : 'Keep measurable achievements visible' },
    { cover_letter_id: coverLetterId, type: 'info', message: 'Mention role-specific expertise clearly' },
  ];
  const { data, error } = await client.from('cover_letter_insights').insert(rows).select('*');
  handleSupabaseError(error, 'Failed to create cover letter insights');
  return data || [];
};

const createVersion = async (coverLetterId, content, version, editedByUser = false) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('cover_letter_versions')
    .insert({ cover_letter_id: coverLetterId, content, version, edited_by_user: editedByUser })
    .select('*')
    .single();
  handleSupabaseError(error, 'Failed to create cover letter version');
  return data;
};

const generateCoverLetter = async (userId, payload) => {
  const [job, profile, skills, cvAnalysis, ragContext] = await Promise.all([
    jobsRepository.findJobById(payload.jobId),
    getProfile(userId),
    getUserSkills(userId),
    getLatestCvAnalysis(userId),
    ragService.getRagContextForFeature('cover_letter'),
  ]);
  if (!job) throw new AppError('Job not found', 404);

  const generation = await callGemini({ userId, job, profile, skills, cvAnalysis, payload, ragContext });
  const content = generation.content || buildFallbackContent({ job, profile, payload });
  const client = ensureSupabase();
  const row = {
    user_id: userId,
    job_id: job.id,
    content,
    status: 'generated',
    version: 1,
    language: payload.language || 'en',
    generated_by_type: generation.fallbackUsed ? 'system' : 'ai',
    title: `${job.title} at ${job.company}`,
    score: generation.score,
    tone: payload.tone,
    target_role: job.title,
    company_name: job.company,
    word_count: countWords(content),
  };
  const { data, error } = await client.from('cover_letters').insert(row).select(COVER_SELECT).single();
  handleSupabaseError(error, 'Failed to create cover letter');
  await createVersion(data.id, content, 1, false);
  const insights = await createInsights(data.id, content, generation.insights);
  return { ...data, insights };
};

const listCoverLetters = async (userId, query = {}) => {
  const client = ensureSupabase();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  let request = client.from('cover_letters').select(COVER_SELECT, { count: 'exact' }).eq('user_id', userId);
  if (query.status) request = request.eq('status', query.status);
  const { data, error, count } = await request.order('updated_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
  handleSupabaseError(error, 'Failed to list cover letters');
  return { coverLetters: data || [], pagination: { page, limit, totalItems: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / limit)) } };
};

const getCoverLetter = async (userId, id) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('cover_letters').select(COVER_SELECT).eq('id', id).eq('user_id', userId).maybeSingle();
  handleSupabaseError(error, 'Failed to fetch cover letter');
  if (!data) throw new AppError('Cover letter not found', 404);
  const { data: insights, error: insightsError } = await client.from('cover_letter_insights').select('*').eq('cover_letter_id', id).order('created_at');
  handleSupabaseError(insightsError, 'Failed to fetch cover letter insights');
  return { ...data, insights: insights || [] };
};

const updateCoverLetter = async (userId, id, payload) => {
  const existing = await getCoverLetter(userId, id);
  const nextVersion = (existing.version || 1) + 1;
  const client = ensureSupabase();
  const update = { content: payload.content, status: payload.status || 'edited', version: nextVersion, word_count: countWords(payload.content), last_edited_at: new Date().toISOString() };
  const { data, error } = await client.from('cover_letters').update(update).eq('id', id).select(COVER_SELECT).single();
  handleSupabaseError(error, 'Failed to update cover letter');
  await createVersion(id, payload.content, nextVersion, true);
  return data;
};

const deleteCoverLetter = async (userId, id) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('cover_letters').update({ status: 'archived' }).eq('id', id).eq('user_id', userId).select(COVER_SELECT).single();
  handleSupabaseError(error, 'Failed to archive cover letter');
  return data;
};

const listVersions = async (userId, id) => {
  await getCoverLetter(userId, id);
  const client = ensureSupabase();
  const { data, error } = await client.from('cover_letter_versions').select('*').eq('cover_letter_id', id).order('version', { ascending: false });
  handleSupabaseError(error, 'Failed to fetch cover letter versions');
  return data || [];
};

const exportCoverLetter = async (userId, id) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('cover_letters').update({ exported_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).select(COVER_SELECT).single();
  handleSupabaseError(error, 'Failed to mark cover letter as exported');
  return data;
};

module.exports = { generateCoverLetter, listCoverLetters, getCoverLetter, updateCoverLetter, deleteCoverLetter, listVersions, exportCoverLetter };
