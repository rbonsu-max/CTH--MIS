import express from 'express';
import db from '../../../db';

const router = express.Router();

router.get('/', (req, res) => {
  const lecturers = db.prepare('SELECT * FROM lecturers').all();
  res.json(lecturers);
});

router.post('/', (req, res) => {
  const { lid, fullname, email, phone, department, designation } = req.body;
  try {
    db.prepare(`
      INSERT INTO lecturers (lid, fullname, email, phone, department, designation, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(lid, fullname, email, phone, department, designation, (req as any).user.uid);
    res.status(201).json({ lid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/assignments', (req, res) => {
  const { lid, academic_year, semester_sid } = req.query;
  let sql = 'SELECT * FROM lecturer_course_assignments WHERE 1=1';
  const params: any[] = [];
  if (lid) { sql += ' AND lid = ?'; params.push(lid); }
  if (academic_year) { sql += ' AND academic_year = ?'; params.push(academic_year); }
  if (semester_sid) { sql += ' AND semester_sid = ?'; params.push(semester_sid); }
  
  const assignments = db.prepare(sql).all(...params);
  res.json(assignments);
});

router.post('/assignments', (req, res) => {
  const { lid, cid, academic_year, semester_sid } = req.body;
  try {
    db.prepare(`
      INSERT INTO lecturer_course_assignments (lid, cid, academic_year, semester_sid, assigned_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(lid, cid, academic_year, semester_sid, (req as any).user.uid);
    res.status(201).json({ lid, cid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
