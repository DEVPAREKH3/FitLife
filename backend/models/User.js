const mongoose = require('mongoose');
const bcrypt    = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true },
    age:         { type: Number, min: 1, max: 120 },
    gender:      { type: String, enum: ['male', 'female', 'other'] },
    height:      { type: Number, min: 50, max: 300 },   // cm
    weight:      { type: Number, min: 10, max: 500 },   // kg
    fitnessGoal: {
      type: String,
      enum: ['lose_weight', 'maintain', 'build_muscle'],
      default: 'maintain'
    },
    otp:        { type: String },
    otpExpires: { type: Date }
  },
  { timestamps: true }
);

/* Hash password before saving */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* Instance method: compare plain password against hash */
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
