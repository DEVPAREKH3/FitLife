const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const nodemailer = require('nodemailer');

/* ── Helpers ─────────────────────────────────────── */
const generateTokens = (userId) => ({
  token: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })
});

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

/* ── POST /api/auth/register ─────────────────────── */
router.post(
  '/register',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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
      const { name, email, password, age, gender, height, weight, fitnessGoal } = req.body;

      if (await User.findOne({ email })) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await new User({ name, email, password, age, gender, height, weight, fitnessGoal }).save();
      const { token, refreshToken } = generateTokens(user._id);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          token,
          refreshToken,
          user: { id: user._id, name: user.name, email: user.email }
        }
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  }
);

/* ── POST /api/auth/login ────────────────────────── */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const { token, refreshToken } = generateTokens(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          refreshToken,
          user: { id: user._id, name: user.name, email: user.email }
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
);

/* ── POST /api/auth/send-otp ─────────────────────── */
router.post(
  '/send-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { email } = req.body;
      let user = await User.findOne({ email });

      if (!user) {
        // Create user on the fly
        const name = email.split('@')[0];
        const randomPassword = Math.random().toString(36).slice(-8) + '1aA!';
        user = new User({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email,
          password: randomPassword
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

      await user.save();

      // ── Nodemailer Email Sending (Enforced Real Delivery) ──
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({
          success: false,
          message: 'Server SMTP is not configured. Please add SMTP_USER and SMTP_PASS to backend/.env to send real emails.'
        });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      let emailSent = false;
      try {
        const mailOptions = {
          from: `"${process.env.EMAIL_FROM_NAME || 'FitLife Team'}" <${process.env.SMTP_USER}>`,
          to: email,
          subject: '🔑 Your FitLife Login OTP Code',
          text: `Welcome to FitLife!\n\nYour One-Time Password (OTP) for secure login is: ${otp}\n\nThis OTP is valid for 10 minutes. Please do not share it with anyone.`,
          html: `
            <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#1e293b">
              <div style="text-align:center;margin-bottom:20px">
                <span style="font-size:32px">🏋️</span>
                <h2 style="font-family:'Syne',sans-serif;margin:4px 0 0;font-size:24px;font-weight:800;color:#3182ce">FitLife</h2>
              </div>
              <p>Hello,</p>
              <p>Use the secure One-Time Password (OTP) below to access your FitLife account:</p>
              <div style="background:#f1f4f8;padding:16px 24px;border-radius:12px;text-align:center;margin:24px 0">
                <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#3182ce">${otp}</span>
              </div>
              <p style="font-size:12px;color:#64748b">This OTP is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
              <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0" />
              <p style="font-size:11px;color:#94a3b8;text-align:center">FitLife — Your Personal Fitness & Nutrition Partner</p>
            </div>
          `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 [EMAIL SENT] Message ID: ${info.messageId}`);
        emailSent = true;
      } catch (mailErr) {
        console.error('Mail delivery failed:', mailErr);
      }

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send email. Please check your SMTP configuration in backend/.env'
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully to your email!'
      });
    } catch (err) {
      console.error('Send OTP error:', err);
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  }
);

/* ── POST /api/auth/login-otp ────────────────────── */
router.post(
  '/login-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ email });

      if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      // Clear OTP
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const { token, refreshToken } = generateTokens(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          refreshToken,
          user: { id: user._id, name: user.name, email: user.email }
        }
      });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ success: false, message: 'OTP verification failed' });
    }
  }
);

module.exports = router;
