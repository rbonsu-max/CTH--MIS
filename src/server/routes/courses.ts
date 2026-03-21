import express from 'express';
import { ProgramRepository } from '../repositories/ProgramRepository';

const router = express.Router();

// ─── COURSES (standalone /api/courses) ──────────────────────────────────────

router.get('/', (req, res) => {
  const courses = ProgramRepository.getAllCourses();
  res.json(courses);
});

router.post('/', (req, res) => {
  const { cid, title, credits, department } = req.body;
  if (!cid || !title) {
    return res.status(400).json({ error: 'cid and title are required' });
  }
  try {
    ProgramRepository.createCourse({ cid, title, credits, department, created_by: (req as any).user.uid });
    res.status(201).json({ cid, title, credits, department });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:cid', (req, res) => {
  const { cid } = req.params;
  const { title, credits, department } = req.body;
  try {
    ProgramRepository.updateCourse(cid, { title, credits, department });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:cid', (req, res) => {
  const { cid } = req.params;
  try {
    ProgramRepository.deleteCourse(cid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
