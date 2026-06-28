const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/user');
const workoutRoutes     = require('./routes/workoutLogs');
const nutritionRoutes   = require('./routes/nutritionEntries');
const bmiRoutes         = require('./routes/bmi');

const app = express();

/* ── Middleware ─────────────────────────────────── */
const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

/* ── Routes ─────────────────────────────────────── */
app.use('/api/auth',              authRoutes);
app.use('/api/user',              userRoutes);
app.use('/api/workout-logs',      workoutRoutes);
app.use('/api/nutrition-entries', nutritionRoutes);
app.use('/api/bmi',               bmiRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'FitLife API is running 🏋️' })
);

/* ── 404 ─────────────────────────────────────────── */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

/* ── Global error handler ────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

/* ── Database + Server boot ──────────────────────── */
const User = require('./models/User');
const BMI = require('./models/BMI');
const Diet = require('./models/Diet');
const Workout = require('./models/Workout');
const { initMockDb } = require('./mockDb');

const PORT = process.env.PORT || 5055;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () =>
      console.log(`🚀  FitLife API listening on http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    
    // Initialize in-memory fallback
    initMockDb({ User, BMI, Diet, Workout });
    
    app.listen(PORT, () =>
      console.log(`🚀  FitLife API (MEMORY-DB) listening on http://localhost:${PORT}`)
    );
  });
