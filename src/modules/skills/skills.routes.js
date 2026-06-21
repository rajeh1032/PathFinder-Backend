const express = require("express");

const {
  authenticate,
  authorize,
} = require("../../common/middlewares/auth.middleware");
const {
  validateBody,
  validateParams,
  validateQuery,
} = require("../../common/middlewares/validate.middleware");
const skillsController = require("./skills.controller");
const {
  uuidParamSchema,
  skillsQuerySchema,
  createSkillSchema,
  updateSkillSchema,
} = require("./skills.schema");

const router = express.Router();

router.get(
  "/",
  authenticate,
  validateQuery(skillsQuerySchema),
  skillsController.getSkills,
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateBody(createSkillSchema),
  skillsController.createSkill,
);

router.get(
  "/:id",
  authenticate,
  validateParams(uuidParamSchema),
  skillsController.getSkillById,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateParams(uuidParamSchema),
  validateBody(updateSkillSchema),
  skillsController.updateSkill,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateParams(uuidParamSchema),
  skillsController.deleteSkill,
);

module.exports = router;
