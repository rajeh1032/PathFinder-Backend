const AppError = require('../../common/errors/AppError');
const { ensureSupabase, handleSupabaseError } = require('../../common/utils/supabaseRepository');
const { generateText } = require('../ai/ai.service');
const jobsRepository = require('../jobs/jobs.repository');
const ragService = require('../rag/rag.service');

const COVER_SELECT = 'id,user_id,job_id,content,status,version,language,generated_by_type,title,score,tone,target_role,company_name,word_count,last_edited_at,exported_at,created_at,updated_at,jobs(id,title,company,location,description,required_skills)';

const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

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

const callGemini = async ({ job, profile, skills, payload, ragContext }) => {
  const skillText = skills.map((skill) => `${skill.name}${skill.level ? ` (${skill.level})` : ''}`).join(', ') || 'N/A';
  const prompt = [
    'Write one concise, professional cover letter.',
    'Return only the cover letter text. Do not use markdown.',
    '',
    `Role: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location || 'N/A'}`,
    `Job description: ${job.description || 'N/A'}`,
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
    'RAG context for cover_letter:',
    ragContext || 'No RAG context is currently indexed for cover_letter.',
    '',
    'Requirements:',
    '- Keep it between 140 and 220 words.',
    '- Make it tailored to the role and company.',
    '- Mention the candidate skills naturally.',
    '- Avoid inventing experience not provided.',
    '- Follow the RAG context as product guidance when relevant, but do not copy it verbatim.',
  ].join('\n');

  try {
    const result = await generateText({
      contents: prompt,
      systemInstruction: 'You are a career writing assistant for students and fresh graduates.',
      temperature: 0.7,
      maxOutputTokens: 1200,
    });
    return result.text?.trim() || null;
  } catch (error) {
    return null;
  }
};

const getProfile = async (userId) => {
  const client = ensureSupabase();
  const { data, error } = await client.from('profiles').select('headline,bio,location,university,major,career_paths(title,category)').eq('user_id', userId).maybeSingle();
  handleSupabaseError(error, 'Failed to fetch profile');
  return data;
};

const createInsights = async (coverLetterId, content) => {
  const client = ensureSupabase();
  const rows = [
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
  const [job, profile, skills, ragContext] = await Promise.all([
    jobsRepository.findJobById(payload.jobId),
    getProfile(userId),
    getUserSkills(userId),
    ragService.getRagContextForFeature('cover_letter'),
  ]);
  if (!job) throw new AppError('Job not found', 404);

  const aiContent = await callGemini({ job, profile, skills, payload, ragContext });
  const content = aiContent || buildFallbackContent({ job, profile, payload });
  const client = ensureSupabase();
  const row = {
    user_id: userId,
    job_id: job.id,
    content,
    status: 'generated',
    version: 1,
    language: payload.language || 'en',
    generated_by_type: aiContent ? 'ai' : 'system',
    title: `${job.title} at ${job.company}`,
    score: 87,
    tone: payload.tone,
    target_role: job.title,
    company_name: job.company,
    word_count: countWords(content),
  };
  const { data, error } = await client.from('cover_letters').insert(row).select(COVER_SELECT).single();
  handleSupabaseError(error, 'Failed to create cover letter');
  await createVersion(data.id, content, 1, false);
  const insights = await createInsights(data.id, content);
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
