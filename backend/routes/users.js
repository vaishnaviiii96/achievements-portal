const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, verifyRole } = require('../middleware/auth');
const crypto = require('crypto');
// GET /api/users/me — own profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, roll_number, department, year_of_study, batch, faculty_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/students — faculty sees own students, admin sees all
router.get('/students', verifyToken, verifyRole('faculty', 'admin'), async (req, res) => {
  try {
    let result;
    if (req.user.role === 'faculty') {
      result = await pool.query(
        `SELECT id, name, email, roll_number, department, year_of_study, batch, created_at
         FROM users WHERE role = 'student' AND faculty_id = $1 ORDER BY name`,
        [req.user.id]
      );
    } else {
      result = await pool.query(
        `SELECT u.id, u.name, u.email, u.roll_number, u.department, u.year_of_study, u.batch, u.created_at,
                f.name as faculty_name
         FROM users u
         LEFT JOIN users f ON u.faculty_id = f.id
         WHERE u.role = 'student' ORDER BY u.name`
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/faculty — admin only
router.get('/faculty', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, department, faculty_id, faculty_code, created_at FROM users WHERE role = 'faculty' ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/users/:id — update profile
router.put('/:id', verifyToken, async (req, res) => {
  const { name, department, year_of_study, batch, faculty_id, password } = req.body;

  // Students can only edit themselves; admin can edit anyone
  if (req.user.role !== 'admin' && req.user.id !== req.params.id)
    return res.status(403).json({ error: 'Not allowed.' });

  try {
    let hashed = null;
    if (password) hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        department = COALESCE($2, department),
        year_of_study = COALESCE($3, year_of_study),
        batch = COALESCE($4, batch),
        faculty_id = COALESCE($5, faculty_id),
        password = COALESCE($6, password)
       WHERE id = $7
       RETURNING id, name, email, role, department, year_of_study, batch, faculty_id`,
      [name || null, department || null, year_of_study || null, batch || null, faculty_id || null, hashed, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Replace the existing POST /api/users/bulk-import route in backend/routes/users.js
// with this version. Also add near the top: const crypto = require('crypto');

// POST /api/users/bulk-import — admin only, array of users
router.post('/bulk-import', verifyToken, verifyRole('admin'), async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users) || users.length === 0)
    return res.status(400).json({ error: 'Provide an array of users.' });

  const results = { created: [], failed: [] };

  for (const u of users) {
    try {
      // Unique random password per user — never a shared/predictable default.
      const tempPassword = crypto.randomBytes(6).toString('base64url'); // ~8 char, URL-safe
      const hashed = await bcrypt.hash(tempPassword, 10);

      const insertResult = await pool.query(
        `INSERT INTO users (name, email, password, role, roll_number, department, year_of_study, batch)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, name, email`,
        [u.name, u.email, hashed, u.role, u.roll_number || null, u.department || null, u.year_of_study || null, u.batch || null]
      );

      if (insertResult.rows.length > 0) {
        // tempPassword is only ever returned here, in this one response — never stored in plaintext,
        // never logged. Admin must distribute it to the user directly (email, in person, etc).
        results.created.push({
          name: u.name,
          email: u.email,
          tempPassword,
        });
      } else {
        results.failed.push({ email: u.email, reason: 'Email already exists.' });
      }
    } catch (err) {
      results.failed.push({ email: u.email, reason: err.message });
    }
  }
  res.json(results);
});

module.exports = router;