// backend/routes/auth.js

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const crypto = require('crypto');
const { sendOtpEmail } = require('../utils/mailer');
// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, role, password } = req.body;

    if (!identifier || !role || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const id = identifier.trim();
    let user;

    if (role === 'student') {
      const result = await pool.query(
        `SELECT * FROM users WHERE LOWER(roll_number) = LOWER($1) AND role = 'student'`,
        [id]
      );
      user = result.rows[0];

    } else if (role === 'faculty') {
      const result = await pool.query(
        `SELECT * FROM users WHERE faculty_code = $1 AND role = 'faculty'`,
        [id]
      );
      user = result.rows[0];

    } else if (role === 'admin') {
      // Admin can log in with ID or email
      const isEmail = id.includes('@');
      const result  = await pool.query(
        isEmail
          ? `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND role = 'admin'`
          : `SELECT * FROM users WHERE faculty_code = $1 AND role = 'admin'`,
        [id]
      );
      user = result.rows[0];

    } else {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    if (!user) {
      return res.status(401).json({ message: 'No account found with those credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        department:   user.department,
        batch:        user.batch,
        roll_number:  user.roll_number,
        faculty_code: user.faculty_code
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, password, role, roll_number, email, faculty_code } = req.body;

    // Validate role
    const validRoles = ['student', 'faculty', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // ── Student ──────────────────────────────────────────────────────────────
    if (role === 'student') {
      if (!roll_number || !email) {
        return res.status(400).json({ message: 'Roll number and email are required for students.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanRoll  = roll_number.trim().toUpperCase();

      if (!cleanEmail.endsWith('@gitam.in')) {
        return res.status(400).json({ message: 'Student email must end with @gitam.in' });
      }

      // Check duplicates
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 OR UPPER(roll_number) = $2',
        [cleanEmail, cleanRoll]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'An account with this email or roll number already exists.' });
      }

      const result = await pool.query(
        `INSERT INTO users (name, roll_number, email, password, role)
         VALUES ($1, $2, $3, $4, 'student')
         RETURNING id, name, email, roll_number, role`,
        [name.trim(), cleanRoll, cleanEmail, hashed]
      );

      return res.status(201).json({ message: 'Account created successfully.', user: result.rows[0] });
    }

    // ── Faculty or Admin ──────────────────────────────────────────────────────
    if (role === 'faculty' || role === 'admin') {
      if (!faculty_code) {
        const label = role === 'faculty' ? 'Faculty ID' : 'Admin ID';
        return res.status(400).json({ message: `${label} is required.` });
      }

      const cleanCode = faculty_code.trim();

      // Check duplicate ID
      const existing = await pool.query(
        `SELECT id FROM users WHERE faculty_code = $1 AND role = $2`,
        [cleanCode, role]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'An account with this ID already exists.' });
      }

      const result = await pool.query(
        `INSERT INTO users (name, faculty_code, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, faculty_code, role`,
        [name.trim(), cleanCode, hashed, role]
      );

      return res.status(201).json({ message: 'Account created successfully.', user: result.rows[0] });
    }

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});
// Add this block into backend/routes/auth.js (before module.exports = router;)
// Also add near the top: const crypto = require('crypto');
// const { sendOtpEmail } = require('../utils/mailer');

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail]
    );
    const user = result.rows[0];

    // Always return the same message whether or not the email exists —
    // prevents attackers from using this endpoint to discover valid accounts.
    const genericMsg = { message: 'If an account exists with that email, a reset code has been sent.' };
    if (!user) return res.json(genericMsg);

    const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit
    const otpHash = await bcrypt.hash(otp, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query(
      `UPDATE users SET reset_otp_hash = $1, reset_otp_expires = $2, reset_otp_attempts = 0 WHERE id = $3`,
      [otpHash, expires, user.id]
    );

    await sendOtpEmail(user.email, otp, user.name);

    return res.json(genericMsg);
  } catch (err) {
    console.error('Forgot-password error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT id, reset_otp_hash, reset_otp_expires, reset_otp_attempts FROM users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail]
    );
    const user = result.rows[0];

    if (!user || !user.reset_otp_hash) {
      return res.status(400).json({ message: 'Invalid or expired code.' });
    }

    if (user.reset_otp_attempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    if (new Date() > new Date(user.reset_otp_expires)) {
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    }

    const match = await bcrypt.compare(otp, user.reset_otp_hash);
    if (!match) {
      await pool.query(`UPDATE users SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id = $1`, [user.id]);
      return res.status(400).json({ message: 'Incorrect code.' });
    }

    // Issue a short-lived token proving OTP was verified, used to authorize the actual reset.
    const resetToken = jwt.sign({ id: user.id, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    return res.json({ message: 'Code verified.', resetToken });
  } catch (err) {
    console.error('Verify-otp error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Reset session expired. Please start over.' });
    }
    if (payload.purpose !== 'password_reset') {
      return res.status(401).json({ message: 'Invalid reset session.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password = $1, reset_otp_hash = NULL, reset_otp_expires = NULL, reset_otp_attempts = 0 WHERE id = $2`,
      [hashed, payload.id]
    );

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;