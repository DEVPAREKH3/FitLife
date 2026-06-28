const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

/* ── GET /api/user/profile ───────────────────────── */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

/* ── PUT /api/user/profile ───────────────────────── */
router.put(
  '/profile',
  auth,
  [
    body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
    body('age').optional({ nullable: true }).isInt({ min: 1, max: 120 }).withMessage('Age must be 1–120'),
    body('gender').optional({ nullable: true }).isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('height').optional({ nullable: true }).isFloat({ min: 50, max: 300 }).withMessage('Height must be 50–300 cm'),
    body('weight').optional({ nullable: true }).isFloat({ min: 10, max: 500 }).withMessage('Weight must be 10–500 kg'),
    body('fitnessGoal').optional({ nullable: true })
      .isIn(['lose_weight', 'maintain', 'build_muscle'])
      .withMessage('Invalid fitness goal')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const allowed = ['name', 'age', 'gender', 'height', 'weight', 'fitnessGoal'];
      const updates = {};
      allowed.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, message: 'Profile updated successfully', data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }
);

module.exports = router;
