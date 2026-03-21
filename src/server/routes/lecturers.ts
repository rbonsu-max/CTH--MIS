import express from 'express';
import db from '../../../db';

const router = express.Router();

// GET all lecturers
router.get('/', (req, res) => {
  const lecturers = db.prepare('SELECT * FROM lecturers ORDER BY fullname ASC').all();
  res.json(lecturers);
});

// POST create lecturer
router.post('/', (req, res) => {
  const { lid, fullname, email, phone, department, designation } = req.body;
  if (!lid || !fullname) {
    return res.status(400).json({ error: 'lid and fullname are required' });
  }
  try {
    db.prepare(`
      INSERT INTO lecturers (lid, fullname, email, phone, department, designation, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(lid, fullname, email || null, phone || null, department || null, designation || null, (req as any).user.uid);
    res.status(201).json({ lid, fullname, email, phone, department, designation });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update lecturer
router.put('/:lid', (req, res) => {
  const { lid } = req.params;
  const { fullname, email, phone, department, designation } = req.body;
  try {
    db.prepare(`
      UPDATE lecturers
      SET fullname = ?, email = ?, phone = ?, department = ?, designation = ?
      WHERE lid = ?
    `).run(fullname, email || null, phone || null, department || null, designation || null, lid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE lecturer
router.delete('/:lid', (req, res) => {
  const { lid } = req.params;
  try {
    db.prepare('DELETE FROM lecturers WHERE lid = ?').run(lid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET course assignments
router.get('/assignments', (req, res) => {
  const { lid, academic_year, semester_sid } = req.query;
  let sql = `
    SELECT lca.*, l.fullname as lecturer_name, c.title as course_title, c.credits
    FROM lecturer_course_assignments lca
    JOIN lecturers l ON lca.lid = l.lid
    JOIN courses c ON lca.cid = c.cid
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
  const { lid, cid, academic_year, semester_sid } = req.body;
  if (!lid || !cid || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'lid, cid, academic_year, and semester_sid are required' });
  }
  try {
    db.prepare(`
      INSERT INTO lecturer_course_assignments (lid, cid, academic_year, semester_sid, assigned_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(lid, cid, academic_year, semester_sid) DO NOTHING
    `).run(lid, cid, academic_year, semester_sid, (req as any).user.uid);
    res.status(201).json({ lid, cid, academic_year, semester_sid });
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
