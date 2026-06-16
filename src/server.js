require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { supabase, isConfigured } = require('./config/supabase');
const errorHandler = require('./common/errors/errorHandler');
const cvsRoutes = require('./modules/cvs/cvs.routes');
const ragRoutes = require('./modules/rag/rag.routes');
const authRoutes = require('./modules/auth/auth.routes');
const roadmapRoutes = require('./modules/roadmaps/roadmaps.routes');
const testRoutes = require('./modules/test/test.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (isConfigured && supabase) {
  console.log('Supabase connected successfully');
} else {
  console.warn('Supabase is not configured yet');
}

app.get('/', (req, res) => {
  res.json({
    message: 'PathFinder API is running',
    supabase: isConfigured ? 'connected' : 'not configured',
  });
});

app.use('/test', testRoutes);
app.use('/api/v1/rag', ragRoutes);
app.use('/api/v1/cvs', cvsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roadmaps', roadmapRoutes);

app.get('/openapi/rag.json', (req, res) => {
  res.sendFile(
    path.resolve(__dirname, '../docs/openapi/pathfinder-rag.openapi.json'),
  );
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
