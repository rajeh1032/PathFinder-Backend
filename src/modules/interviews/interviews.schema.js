const Joi = require('joi');

const createInterviewSessionSchema = Joi.object({
  user_id: Joi.string().uuid(),
  career_path_id: Joi.string().uuid().required(),
  interview_type: Joi.string().valid('technical', 'behavioral', 'mock_hr').required(),
  total_questions: Joi.number().integer().min(1).max(20).required(),
});

module.exports = {
  createInterviewSessionSchema,
};
