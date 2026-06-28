const mongoose = require('mongoose');

const bmiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    weight:   { type: Number, required: true, min: 1 },   // kg
    height:   { type: Number, required: true, min: 1 },   // cm
    bmi:      { type: Number, required: true },
    category: {
      type: String,
      required: true,
      enum: ['Underweight', 'Normal', 'Overweight', 'Obese']
    },
    date: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BMI', bmiSchema);
