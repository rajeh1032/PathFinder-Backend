const Joi = require('joi');

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const sessionQuestionParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
  questionId: Joi.string().uuid().required(),
});

const interviewHistoryQuerySchema = Joi.object({
  q: Joi.string().trim().max(255).empty(''),
  user_name: Joi.string().trim().max(255).empty(''),
  status: Joi.string()
    .valid('started', 'in_progress', 'completed', 'cancelled')
    .empty(''),
  interview_type: Joi.string()
    .valid('technical', 'behavioral', 'mock_hr')
    .empty(''),
  career_path_id: Joi.string().uuid().empty(''),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const finishInterviewSessionSchema = Joi.object({
  submit_partial: Joi.boolean().default(false),
});

const updateInterviewSessionSchema = Joi.object({
  status: Joi.string().valid('started', 'in_progress', 'completed', 'cancelled').optional(),
  submit_partial: Joi.boolean().default(false),
});

const createInterviewSessionSchema = Joi.object({
  career_path_id: Joi.string().uuid().required(),
  interview_type: Joi.string().valid('technical', 'behavioral', 'mock_hr').required(),
  total_questions: Joi.number().integer().min(1).max(20).required(),
});

const answerInterviewQuestionSchema = Joi.object({
  selected_option_index: Joi.number().integer().min(0).max(3).required(),
});

module.exports = {
  uuidParamSchema,
  sessionQuestionParamSchema,
  interviewHistoryQuerySchema,
  finishInterviewSessionSchema,
  updateInterviewSessionSchema,
  createInterviewSessionSchema,
  answerInterviewQuestionSchema,
};
