const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, verifyRole } = require('../middleware/auth');
const upload = require('../middleware/upload'); // Cloudinary-backed multer

const uploadFields = upload.fields([
  { name: 'certificate', maxCount: 5 },  // multiple certificates
  { name: 'merit',       maxCount: 1 },
  { name: 'photos',      maxCount: 10 }  // multiple photos
]);

// ── POST /api/achievements — student submits ─────────────
router.post('/', verifyToken, verifyRole('student','faculty'), uploadFields, async (req, res) => {
  const {
    title, event_name, event_type, level, place_held,
    result, position, start_date, end_date, description,
    organiser_name, status
  } = req.body;

  const isDraft = status === 'draft';

  if (!isDraft && (!title || !event_name || !event_type || !level || !start_date || !end_date))
    return res.status(400).json({ error: 'Required fields missing.' });

  // Cloudinary storage puts the full hosted URL in file.path (not file.filename)
  const certFiles = req.files?.certificate?.map(f => f.path) || [];
  const certificate_url = certFiles.length > 0 ? certFiles.join(',') : null;
  const merit_url       = req.files?.merit?.[0]?.path || null;
  const photo_urls      = req.files?.photos?.map(f => f.path) || [];

  const finalStatus = isDraft ? 'draft' : 'pending';

  try {
    const result_row = await pool.query(
      `INSERT INTO achievements
        (user_id, submitted_by, title, event_name, event_type, level, place_held, result,
         position, start_date, end_date, certificate_url, merit_url, photo_urls,
         description, organiser_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        req.user.id, req.user.id,
        title || null, event_name || null, event_type || null, level || null,
        place_held || null, result || null, position || null,
        start_date || null, end_date || null,
        certificate_url, merit_url, photo_urls,
        description || null, organiser_name || null, finalStatus
      ]
    );
    res.status(201).json(result_row.rows[0]);
  } catch (err) {
    console.error('Submit achievement error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/achievements/mine — student's own ───────────
router.get('/mine', verifyToken, verifyRole('student','faculty'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM achievements WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/achievements/students — faculty views (READ-ONLY) ──────────────
router.get('/students', verifyToken, verifyRole('faculty'), async (req, res) => {
  try {
    const assignedCheck = await pool.query(
      `SELECT COUNT(*) FROM users WHERE faculty_id = $1 AND role = 'student'`,
      [req.user.id]
    );
    const hasAssigned = parseInt(assignedCheck.rows[0].count) > 0;

    let facultyFilter, params;
    if (hasAssigned) {
      facultyFilter = `u.faculty_id = $1`;
      params = [req.user.id];
    } else {
      facultyFilter = `u.role = 'student'`;
      params = [];
    }

    let query = `
      SELECT a.*,
        u.name          AS student_name,
        u.roll_number,
        u.department,
        u.batch,
        u.year_of_study
      FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE ${facultyFilter}
        AND a.status != 'draft'
    `;

    let idx = params.length + 1;

    const { student_id, event_type, level, year, search, result: result_filter, department } = req.query;

    if (student_id)    { query += ` AND a.user_id    = $${idx++}`; params.push(student_id); }
    if (event_type)    { query += ` AND a.event_type = $${idx++}`; params.push(event_type); }
    if (level)         { query += ` AND a.level      = $${idx++}`; params.push(level); }
    if (result_filter) { query += ` AND a.result     = $${idx++}`; params.push(result_filter); }
    if (department)    { query += ` AND u.department = $${idx++}`; params.push(department); }
    if (year)          { query += ` AND EXTRACT(YEAR FROM a.start_date) = $${idx++}`; params.push(parseInt(year)); }
    if (search)        { query += ` AND (u.name ILIKE $${idx} OR u.roll_number ILIKE $${idx})`; idx++; params.push(`%${search}%`); }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Faculty achievements error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/achievements/all — admin sees everything ────
router.get('/all', verifyToken, verifyRole('admin'), async (req, res) => {
  const {
    event_type, level, department, batch,
    year_of_study, result: result_filter, start_date, end_date, year
  } = req.query;
  try {
    let query = `
      SELECT a.*,
        u.name          AS student_name,
        u.roll_number,
        u.department,
        u.batch,
        u.year_of_study,
        f.name          AS faculty_name
      FROM achievements a
      JOIN  users u  ON a.user_id     = u.id
      LEFT JOIN users f  ON u.faculty_id  = f.id
      WHERE a.status != 'draft'
    `;
    const params = [];
    let idx = 1;

    if (event_type)    { query += ` AND a.event_type    = $${idx++}`; params.push(event_type); }
    if (level)         { query += ` AND a.level         = $${idx++}`; params.push(level); }
    if (department)    { query += ` AND u.department    = $${idx++}`; params.push(department); }
    if (batch)         { query += ` AND u.batch         = $${idx++}`; params.push(batch); }
    if (year_of_study) { query += ` AND u.year_of_study = $${idx++}`; params.push(year_of_study); }
    if (result_filter) { query += ` AND a.result        = $${idx++}`; params.push(result_filter); }
    if (start_date)    { query += ` AND a.start_date   >= $${idx++}`; params.push(start_date); }
    if (end_date)      { query += ` AND a.end_date     <= $${idx++}`; params.push(end_date); }
    if (year)          { query += ` AND EXTRACT(YEAR FROM a.start_date) = $${idx++}`; params.push(parseInt(year)); }

    query += ' ORDER BY a.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin achievements error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/achievements/:id — student edits own achievement ───
router.put('/:id', verifyToken, verifyRole('student','faculty'), uploadFields, async (req, res) => {
  const {
    title, event_name, event_type, level, place_held,
    result, position, start_date, end_date, description,
    organiser_name, status
  } = req.body;
  try {
    const existing = await pool.query(
      'SELECT * FROM achievements WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Achievement not found.' });

    const certFiles = req.files?.certificate?.map(f => f.path) || [];
    const certificate_url = certFiles.length > 0
      ? certFiles.join(',')
      : existing.rows[0].certificate_url;

    const merit_url  = req.files?.merit?.[0]?.path || existing.rows[0].merit_url;
    const photo_urls = req.files?.photos?.map(f => f.path) || existing.rows[0].photo_urls;

    const finalStatus = status === 'pending' ? 'pending' : (status === 'draft' ? 'draft' : existing.rows[0].status);

    const updated = await pool.query(
      `UPDATE achievements
       SET title=$1, event_name=$2, event_type=$3, level=$4, place_held=$5,
           result=$6, position=$7, start_date=$8, end_date=$9, description=$10,
           certificate_url=$11, merit_url=$12, photo_urls=$13,
           organiser_name=$14, status=$15, updated_at=NOW()
       WHERE id=$16 AND user_id=$17 RETURNING *`,
      [
        title || null, event_name || null, event_type || null, level || null, place_held || null,
        result || null, position || null, start_date || null, end_date || null,
        description || null, certificate_url, merit_url, photo_urls,
        organiser_name || null, finalStatus,
        req.params.id, req.user.id
      ]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Edit achievement error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/achievements/:id — student deletes own ──
router.delete('/:id', verifyToken, verifyRole('student','faculty'), async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM achievements WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Achievement not found.' });
    await pool.query('DELETE FROM achievements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Achievement deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PATCH /api/achievements/:id/status — admin/faculty verify or reject ──
router.patch('/:id/status', verifyToken, verifyRole('admin', 'faculty'), async (req, res) => {
  const { status, remarks } = req.body;

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "verified" or "rejected".' });
  }

  try {
    const existing = await pool.query('SELECT * FROM achievements WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Achievement not found.' });

    const ach = existing.rows[0];
    if (ach.status === 'draft') {
      return res.status(400).json({ error: 'Cannot verify or reject a draft.' });
    }

    if (ach.user_id === req.user.id) {
      return res.status(403).json({ error: 'You cannot verify your own achievement.' });
    }

    const updated = await pool.query(
      `UPDATE achievements
       SET status = $1,
           remarks = $2,
           verified_by = $3,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, remarks || null, req.user.id, req.params.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Verify/reject error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/achievements/stats — dashboard analytics ──
router.get('/stats', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const typeResult = await pool.query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM achievements WHERE status != 'draft'
       GROUP BY event_type ORDER BY count DESC`
    );

    const monthResult = await pool.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM achievements WHERE status != 'draft'
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month`
    );

    const statusResult = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM achievements WHERE status != 'draft'
       GROUP BY status`
    );

    const levelResult = await pool.query(
      `SELECT level, COUNT(*)::int AS count
       FROM achievements WHERE status != 'draft'
       GROUP BY level ORDER BY count DESC`
    );

    res.json({
      byType:   typeResult.rows,
      byMonth:  monthResult.rows,
      byStatus: statusResult.rows,
      byLevel:  levelResult.rows
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;