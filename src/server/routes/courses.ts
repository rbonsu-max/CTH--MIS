import express from 'express';
import db from '../../../db';
import { ProgramRepository } from '../repositories/ProgramRepository';
import { checkRole } from '../middleware/auth';

const router = express.Router();

// ─── COURSES (standalone /api/courses) ──────────────────────────────────────

router.get('/', (req, res) => {
  const user = (req as any).user;
  if (user && user.role === 'Lecturer') {
    const courses = db.prepare(`
      SELECT c.* 
      FROM courses c
      JOIN lecturer_course_assignments lca ON c.code = lca.course_code
      JOIN lecturers l ON lca.lid = l.lid
      WHERE l.user_uid = ?
    `).all(user.uid);
    return res.json(courses);
  }
  const courses = ProgramRepository.getAllCourses();
  res.json(courses);
});

router.post('/', checkRole(['SuperAdmin', 'Administrator']), (req, res) => {
  const { code, name, credit_hours, department } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'code and name are required' });
  }
  try {
    ProgramRepository.createCourse({ code, name, credit_hours, department, created_by: (req as any).user.uid });
    res.status(201).json({ code, name, credit_hours, department });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:code', checkRole(['SuperAdmin', 'Administrator']), (req, res) => {
  const { code } = req.params;
  const { name, credit_hours, department } = req.body;
  try {
    ProgramRepository.updateCourse(code, { name, credit_hours, department });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:code', checkRole(['SuperAdmin', 'Administrator']), (req, res) => {
  const { code } = req.params;
  try {
    ProgramRepository.deleteCourse(code);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
