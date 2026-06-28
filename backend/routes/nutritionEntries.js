const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Diet = require('../models/Diet');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

/* ── POST /api/nutrition-entries/log ─────────────── */
router.post(
  '/log',
  auth,
  [
    body('mealName').notEmpty().trim().withMessage('Meal name is required'),
    body('mealType')
      .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
      .withMessage('mealType must be breakfast | lunch | dinner | snack'),
    body('calories').isFloat({ min: 0 }).withMessage('Calories must be ≥ 0'),
    body('protein').isFloat({ min: 0 }).withMessage('Protein (g) must be ≥ 0'),
    body('carbs').isFloat({ min: 0 }).withMessage('Carbs (g) must be ≥ 0'),
    body('fats').isFloat({ min: 0 }).withMessage('Fats (g) must be ≥ 0'),
    body('date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { mealName, mealType, calories, protein, carbs, fats, date } = req.body;
      const entry = await new Diet({
        userId: req.userId,
        mealName,
        mealType,
        calories,
        protein,
        carbs,
        fats,
        date: date ? new Date(date) : new Date()
      }).save();

      res.status(201).json({ success: true, message: 'Meal logged successfully', data: entry });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to log meal' });
    }
  }
);

/* ── GET /api/nutrition-entries/history ──────────── */
router.get('/history', auth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [entries, total] = await Promise.all([
      Diet.find({ userId: req.userId })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Diet.countDocuments({ userId: req.userId })
    ]);

    res.json({
      success: true,
      data: { entries, total, page, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch nutrition history' });
  }
});

/* ── GET /api/nutrition-entries/daily-stats?date= ── */
router.get('/daily-stats', auth, async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

    const entries = await Diet.find({
      userId: req.userId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const totals = entries.reduce(
      (acc, e) => ({
        calories: +(acc.calories + e.calories).toFixed(1),
        protein:  +(acc.protein  + e.protein).toFixed(1),
        carbs:    +(acc.carbs    + e.carbs).toFixed(1),
        fats:     +(acc.fats     + e.fats).toFixed(1)
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    res.json({ success: true, data: { entries, totals, date: targetDate.toISOString() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch daily stats' });
  }
});

/* ── DELETE /api/nutrition-entries/:id ───────────── */
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await Diet.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, message: 'Meal entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
});

module.exports = router;
