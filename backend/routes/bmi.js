const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const BMI  = require('../models/BMI');

/* ── Helpers ─────────────────────────────────────── */
const calcBMI = (weight, height) => {
  const h = height / 100;
  return parseFloat((weight / (h * h)).toFixed(1));
};

const getCategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 30.0) return 'Overweight';
  return 'Obese';
};

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

/* ── POST /api/bmi/calculate ─────────────────────── */
router.post(
  '/calculate',
  auth,
  [
    body('weight').isFloat({ min: 10, max: 500 }).withMessage('Weight must be 10–500 kg'),
    body('height').isFloat({ min: 50, max: 300 }).withMessage('Height must be 50–300 cm'),
    body('date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { weight, height, date } = req.body;
      const bmiValue = calcBMI(weight, height);
      const category = getCategory(bmiValue);

      const record = await new BMI({
        userId: req.userId,
        weight,
        height,
        bmi: bmiValue,
        category,
        date: date ? new Date(date) : new Date()
      }).save();

      res.status(201).json({
        success: true,
        message: 'BMI calculated and saved',
        data: record
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to calculate BMI' });
    }
  }
);

/* ── GET /api/bmi/history ────────────────────────── */
router.get('/history', auth, async (req, res) => {
  try {
    const history = await BMI.find({ userId: req.userId })
      .sort({ date: 1 })
      .limit(50);

    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch BMI history' });
  }
});

module.exports = router;
