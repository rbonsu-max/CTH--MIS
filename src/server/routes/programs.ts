import express from 'express';
import { ProgramRepository } from '../repositories/ProgramRepository';

const router = express.Router();

// Programs
router.get('/', (req, res) => {
  const programs = ProgramRepository.getAllPrograms();
  res.json(programs);
});

router.post('/', (req, res) => {
  const { progid, name, department, duration_years } = req.body;
  try {
    ProgramRepository.createProgram({ progid, name, department, duration_years, created_by: (req as any).user.uid });
    res.status(201).json({ progid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Courses
router.get('/courses', (req, res) => {
  const courses = ProgramRepository.getAllCourses();
  res.json(courses);
});

router.post('/courses', (req, res) => {
  const { cid, title, credits, department } = req.body;
  try {
    ProgramRepository.createCourse({ cid, title, credits, department, created_by: (req as any).user.uid });
    res.status(201).json({ cid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Curriculum
router.get('/:progid/curriculum', (req, res) => {
  const { progid } = req.params;
  const { level, semester_sid } = req.query;
  const curriculum = ProgramRepository.getCurriculum(progid, level ? Number(level) : undefined, semester_sid as string);
  res.json(curriculum);
});

router.post('/:progid/curriculum', (req, res) => {
  const { progid } = req.params;
  const { cid, level, semester_sid, is_elective } = req.body;
  try {
    ProgramRepository.mountCurriculum({ progid, cid, level, semester_sid, is_elective, created_by: (req as any).user.uid });
    res.status(201).json({ progid, cid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
