const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const auth    = require('../middleware/auth');
const Workout = require('../models/Workout');

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

/* ── POST /api/workout-logs/log ──────────────────── */
router.post(
  '/log',
  auth,
  [
    body('exercise').notEmpty().trim().withMessage('Exercise name is required'),
    body('category')
      .isIn(['chest', 'back', 'legs', 'cardio', 'shoulders', 'arms', 'core', 'full-body'])
      .withMessage('Invalid category'),
    body('sets').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Sets must be a positive integer'),
    body('reps').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Reps must be a positive integer'),
    body('weight').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Weight must be ≥ 0'),
    body('duration').isInt({ min: 1 }).withMessage('Duration (minutes) is required and must be ≥ 1'),
    body('date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { exercise, category, sets, reps, weight, duration, date } = req.body;
      const workout = await new Workout({
        userId: req.userId,
        exercise,
        category,
        sets:     sets     ?? null,
        reps:     reps     ?? null,
        weight:   weight   ?? 0,
        duration,
        date: date ? new Date(date) : new Date()
      }).save();

      res.status(201).json({ success: true, message: 'Workout logged successfully', data: workout });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to log workout' });
    }
  }
);

/* ── GET /api/workout-logs/history ───────────────── */
router.get('/history', auth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [workouts, total] = await Promise.all([
      Workout.find({ userId: req.userId })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Workout.countDocuments({ userId: req.userId })
    ]);

    res.json({
      success: true,
      data: { workouts, total, page, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch workout history' });
  }
});

/* ── GET /api/workout-logs/weekly-summary ────────── */
router.get('/weekly-summary', auth, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const [dailySummary, categorySummary] = await Promise.all([
      /* Per-day totals for the bar chart */
      Workout.aggregate([
        { $match: { userId: req.userId, date: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            totalDuration: { $sum: '$duration' },
            totalSets:     { $sum: { $ifNull: ['$sets', 0] } },
            count:         { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      /* Per-category totals for the muscle-group breakdown */
      Workout.aggregate([
        { $match: { userId: req.userId, date: { $gte: since } } },
        {
          $group: {
            _id:           '$category',
            totalDuration: { $sum: '$duration' },
            totalSets:     { $sum: { $ifNull: ['$sets', 0] } },
            exercises:     { $addToSet: '$exercise' },
            count:         { $sum: 1 }
          }
        },
        { $sort: { totalDuration: -1 } }
      ])
    ]);

    res.json({ success: true, data: { dailySummary, categorySummary } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch weekly summary' });
  }
});

/* ── DELETE /api/workout-logs/:id ────────────────── */
router.delete('/:id', auth, async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });
    res.json({ success: true, message: 'Workout deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete workout' });
  }
});

module.exports = router;
