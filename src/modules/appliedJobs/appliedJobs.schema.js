const Joi = require('joi');

const APPLIED_STATUSES = ['applied', 'viewed', 'interviewing', 'rejected', 'accepted', 'withdrawn'];
const appliedJobParamSchema = Joi.object({ id: Joi.string().uuid().required() });
const applyJobSchema = Joi.object({
  userId: Joi.string().uuid(),
  coverLetterId: Joi.string().uuid(),
  nextStep: Joi.string().trim().max(180),
  nextStepAt: Joi.date().iso(),
  notes: Joi.string().trim().max(1000),
});
const updateAppliedJobStatusSchema = Joi.object({
  userId: Joi.string().uuid(),
  status: Joi.string().valid(...APPLIED_STATUSES).required(),
  nextStep: Joi.string().trim().max(180),
  nextStepAt: Joi.date().iso().allow(null),
  notes: Joi.string().trim().max(1000).allow(''),
});

module.exports = { APPLIED_STATUSES, appliedJobParamSchema, applyJobSchema, updateAppliedJobStatusSchema };
