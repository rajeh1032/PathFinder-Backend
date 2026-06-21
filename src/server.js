require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const { supabase, isConfigured } = require("./config/supabase");
const errorHandler = require("./common/errors/errorHandler");
const coursesRoutes = require("./modules/courses/courses.routes");
const cvsRoutes = require("./modules/cvs/cvs.routes");
const interviewsRoutes = require("./modules/interviews/interviews.routes");
const ragRoutes = require("./modules/rag/rag.routes");
const authRoutes = require("./modules/auth/auth.routes");
const roadmapRoutes = require("./modules/roadmaps/roadmaps.routes");
const profileRoutes = require("./modules/profiles/profiles.routes");
const testRoutes = require("./modules/test/test.routes");
const chatRouter = require("./modules/chat/chat.routes");
const userRoutes = require("./modules/users/users.routes");
const jobsRoutes = require("./modules/jobs/jobs.routes");
const jobMatchesRoutes = require("./modules/jobMatches/jobMatches.routes");
const coverLettersRoutes = require("./modules/coverLetters/coverLetters.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const skillsRoutes = require("./modules/skills/skills.routes");
const aiLogsRoutes = require("./modules/aiLogs/aiLogs.routes");
const {
  startJobsSyncScheduler,
} = require("./common/schedulers/jobsSyncScheduler");

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || "v1";
const apiPrefix = `/api/${API_VERSION}`;

app.use(cors());
app.use(express.json());

if (isConfigured && supabase) {
  console.log("Supabase connected successfully");
} else {
  console.warn("Supabase is not configured yet");
}

app.get("/", (req, res) => {
  res.json({
    message: "PathFinder API is running",
    supabase: isConfigured ? "connected" : "not configured",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "pathfinder-backend",
  });
});

app.use('/api/chat', chatRouter);
app.use('/test', testRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/v1/interviews', interviewsRoutes);
app.use(`${apiPrefix}/chat`,chatRouter)
app.use("/api/chat", chatRouter);
app.use("/test", testRoutes);
app.use("/api/interviews", interviewsRoutes);
app.use("/api/v1/interviews", interviewsRoutes);
app.use(`${apiPrefix}/rag`, ragRoutes);
app.use(`${apiPrefix}/cvs`, cvsRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/roadmaps`, roadmapRoutes);
app.use(`${apiPrefix}/courses`, coursesRoutes);
app.use(`${apiPrefix}/jobs`, jobsRoutes);
app.use(`${apiPrefix}/job-matches`, jobMatchesRoutes);
app.use(`${apiPrefix}/cover-letters`, coverLettersRoutes);
app.use(`${apiPrefix}/profiles`, profileRoutes);
app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
app.use(`${apiPrefix}/skills`, skillsRoutes);
app.use(`${apiPrefix}/ai-logs`, aiLogsRoutes);

app.get("/openapi/rag.json", (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "../docs/openapi/pathfinder-rag.openapi.json"),
  );
});

app.get("/openapi/roadmaps.json", (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "../docs/openapi/pathfinder-roadmaps.openapi.json"),
  );
});

app.get("/openapi/courses.json", (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "../docs/openapi/pathfinder-courses.openapi.json"),
  );
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startJobsSyncScheduler();
  });
}

module.exports = app;
