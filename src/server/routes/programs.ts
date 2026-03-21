import express from 'express';
import { ProgramRepository } from '../repositories/ProgramRepository';

const router = express.Router();

// ─── PROGRAMS ──────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const programs = ProgramRepository.getAllPrograms();
  res.json(programs);
});

router.post('/', (req, res) => {
  const { progid, name, department, duration_years } = req.body;
  if (!progid || !name) {
    return res.status(400).json({ error: 'progid and name are required' });
  }
  try {
    ProgramRepository.createProgram({ progid, name, department, duration_years, created_by: (req as any).user.uid });
    res.status(201).json({ progid, name, department, duration_years });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:progid', (req, res) => {
  const { progid } = req.params;
  const { name, department, duration_years } = req.body;
  try {
    ProgramRepository.updateProgram(progid, { name, department, duration_years });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:progid', (req, res) => {
  const { progid } = req.params;
  try {
    ProgramRepository.deleteProgram(progid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── CURRICULUM ────────────────────────────────────────────────────────────

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
    res.status(201).json({ progid, cid, level, semester_sid, is_elective });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:progid/curriculum', (req, res) => {
  const { progid } = req.params;
  const { cid, level, semester_sid } = req.query;
  try {
    ProgramRepository.unmountCurriculum(progid, cid as string, Number(level), semester_sid as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
