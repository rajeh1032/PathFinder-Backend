require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { supabase, isConfigured } = require('./config/supabase');
const errorHandler = require('./common/errors/errorHandler');
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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
