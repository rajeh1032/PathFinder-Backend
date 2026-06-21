const AppError = require("../../common/errors/AppError");
const { supabase, isConfigured } = require("../../config/supabase");

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError("Supabase is not configured", 500);
  }

  return supabase;
};

const handleSupabaseError = (error, message, statusCode = 500) => {
  if (error) {
    throw new AppError(message, statusCode, {
      code: error.code,
      hint: error.hint,
    });
  }
};

const SKILL_FIELDS = `
  id,
  name,
  category,
  level,
  aliases,
  is_active,
  created_by,
  updated_by,
  created_at,
  updated_at
`;

const applySkillSort = (query, sort) => {
  if (sort === "newest") {
    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
  }

  return query
    .order("name", { ascending: true })
    .order("id", { ascending: true });
};

const findSkillsPage = async ({ page, limit, filters }) => {
  const client = ensureSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = client.from("skills").select(SKILL_FIELDS, { count: "exact" });

  if (filters.q) {
    query = query.or(`name.ilike.%${filters.q}%,category.ilike.%${filters.q}%`);
  }
  if (filters.category) query = query.ilike("category", filters.category);
  if (filters.level) query = query.ilike("level", filters.level);
  if (typeof filters.isActive === "boolean") {
    query = query.eq("is_active", filters.isActive);
  }

  const { data, error, count } = await applySkillSort(
    query,
    filters.sort,
  ).range(from, to);
  handleSupabaseError(error, "Failed to fetch skills");
  return { rows: data || [], totalItems: count || 0 };
};

const findSkillById = async (skillId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("skills")
    .select(SKILL_FIELDS)
    .eq("id", skillId)
    .maybeSingle();

  handleSupabaseError(error, "Failed to fetch skill");
  return data;
};

const countSkillUsage = async (skillId) => {
  const client = ensureSupabase();
  const [users, careerPaths, cvSkills] = await Promise.all([
    client
      .from("user_skills")
      .select("id", { count: "exact", head: true })
      .eq("skill_id", skillId),
    client
      .from("career_path_skills")
      .select("id", { count: "exact", head: true })
      .eq("skill_id", skillId),
    client
      .from("cv_skills")
      .select("id", { count: "exact", head: true })
      .eq("skill_id", skillId),
  ]);

  handleSupabaseError(users.error, "Failed to count user skills");
  handleSupabaseError(careerPaths.error, "Failed to count career path skills");
  handleSupabaseError(cvSkills.error, "Failed to count CV skills");

  return {
    users_count: users.count || 0,
    career_paths_count: careerPaths.count || 0,
    cv_skills_count: cvSkills.count || 0,
  };
};

const createSkill = async (payload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("skills")
    .insert(payload)
    .select(SKILL_FIELDS)
    .single();

  if (error?.code === "23505") {
    throw new AppError("A skill with this name already exists", 409, {
      code: error.code,
      hint: error.hint,
    });
  }

  handleSupabaseError(error, "Failed to create skill");
  return data;
};

const updateSkill = async ({ skillId, changes }) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("skills")
    .update(changes)
    .eq("id", skillId)
    .select(SKILL_FIELDS)
    .maybeSingle();

  if (error?.code === "23505") {
    throw new AppError("A skill with this name already exists", 409, {
      code: error.code,
      hint: error.hint,
    });
  }

  handleSupabaseError(error, "Failed to update skill");
  return data;
};

const deleteSkill = async (skillId) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("skills")
    .delete()
    .eq("id", skillId)
    .select("id")
    .maybeSingle();

  // Foreign key violation: the skill is still referenced by user_skills,
  // career_path_skills, cv_skills, course_skills, or roadmap_steps.
  if (error?.code === "23503") {
    throw new AppError(
      "This skill is referenced by other records and cannot be deleted. Deactivate it instead.",
      409,
      { code: error.code, hint: error.hint },
    );
  }

  handleSupabaseError(error, "Failed to delete skill");
  return data;
};

module.exports = {
  findSkillsPage,
  findSkillById,
  countSkillUsage,
  createSkill,
  updateSkill,
  deleteSkill,
};
