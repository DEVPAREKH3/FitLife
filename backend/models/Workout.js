const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    exercise: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['chest', 'back', 'legs', 'cardio', 'shoulders', 'arms', 'core', 'full-body']
    },
    sets:     { type: Number, min: 1, default: null },
    reps:     { type: Number, min: 1, default: null },
    weight:   { type: Number, min: 0, default: 0 },   // kg (0 = bodyweight)
    duration: { type: Number, required: true, min: 1 }, // minutes
    date:     { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workout', workoutSchema);
