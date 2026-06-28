const mongoose = require('mongoose');

const dietSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mealName: { type: String, required: true, trim: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'dinner', 'snack']
    },
    calories: { type: Number, required: true, min: 0 },
    protein:  { type: Number, required: true, min: 0 },  // grams
    carbs:    { type: Number, required: true, min: 0 },  // grams
    fats:     { type: Number, required: true, min: 0 },  // grams
    date:     { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Diet', dietSchema);
