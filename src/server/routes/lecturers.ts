import express from 'express';
import db from '../../../db';

const router = express.Router();

// GET all lecturers
router.get('/', (req, res) => {
  const lecturers = db.prepare('SELECT * FROM lecturers ORDER BY name ASC').all();
  res.json(lecturers);
});

// POST create lecturer
router.post('/', (req, res) => {
  const { lid, title, name, email, tel, department, designation, user_uid } = req.body;
  if (!lid || !name) {
    return res.status(400).json({ error: 'lid and name are required' });
  }
  try {
    db.prepare(`
      INSERT INTO lecturers (lid, user_uid, title, name, email, tel, department, designation, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(lid, user_uid || null, title || null, name, email || null, tel || null, department || null, designation || null, (req as any).user.uid);
    res.status(201).json({ lid, user_uid, title, name, email, tel, department, designation });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update lecturer
router.put('/:lid', (req, res) => {
  const { lid } = req.params;
  const { title, name, email, tel, department, designation, user_uid } = req.body;
  try {
    db.prepare(`
      UPDATE lecturers
      SET title = ?, name = ?, email = ?, tel = ?, department = ?, designation = ?, user_uid = ?
      WHERE lid = ?
    `).run(title || null, name, email || null, tel || null, department || null, designation || null, user_uid || null, lid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE lecturer
router.delete('/:lid', (req, res) => {
  const { lid } = req.params;
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM lecturer_course_assignments WHERE lid = ?').run(lid);
      db.prepare('DELETE FROM lecturers WHERE lid = ?').run(lid);
    })();
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET course assignments
router.get('/assignments', (req, res) => {
  const { lid, academic_year, semester_sid } = req.query;
  let sql = `
    SELECT lca.*, l.name as lecturer_name, c.name as course_name, c.credit_hours
    FROM lecturer_course_assignments lca
    JOIN lecturers l ON lca.lid = l.lid
    JOIN courses c ON lca.course_code = c.code
    WHERE 1=1
  `;
  const params: any[] = [];
  if (lid) { sql += ' AND lca.lid = ?'; params.push(lid); }
  if (academic_year) { sql += ' AND lca.academic_year = ?'; params.push(academic_year); }
  if (semester_sid) { sql += ' AND lca.semester_sid = ?'; params.push(semester_sid); }

  const assignments = db.prepare(sql).all(...params);
  res.json(assignments);
});

// POST assign lecturer to course
router.post('/assignments', (req, res) => {
  const { lid, course_code, academic_year, semester_sid } = req.body;
  if (!lid || !course_code || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'lid, course_code, academic_year, and semester_sid are required' });
  }
  try {
    const exists = db.prepare('SELECT 1 FROM lecturer_course_assignments WHERE lid = ? AND course_code = ? AND academic_year = ? AND semester_sid = ?').get(lid, course_code, academic_year, semester_sid);
    if (exists) {
      return res.status(409).json({ error: 'Lecturer is already assigned to this course for the selected academic year and semester' });
    }
    db.prepare(`
      INSERT INTO lecturer_course_assignments (lid, course_code, academic_year, semester_sid, assigned_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(lid, course_code, academic_year, semester_sid, (req as any).user.uid);
    res.status(201).json({ lid, course_code, academic_year, semester_sid });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE assignment
router.delete('/assignments/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM lecturer_course_assignments WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
