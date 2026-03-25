import express from 'express';
import { AcademicRepository } from '../repositories/AcademicRepository';

const router = express.Router();

// ─── ACADEMIC YEARS ────────────────────────────────────────────────────────

router.get('/years', (req, res) => {
  const years = AcademicRepository.getAllYears();
  res.json(years.map(y => ({ ...y, is_current: !!y.is_current })));
});

router.post('/years', (req, res) => {
  const { code, is_current, date_from, date_to } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }
  try {
    if (is_current) {
      AcademicRepository.setCurrentYear(code);
    }
    AcademicRepository.createYear({ code, is_current: is_current ? 1 : 0, date_from, date_to, created_by: (req as any).user.uid });
    res.status(201).json({ code, is_current: !!is_current });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/years/:code/set-current', (req, res) => {
  const { code } = req.params;
  try {
    AcademicRepository.setCurrentYear(code);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/years/:code', (req, res) => {
  const { code } = req.params;
  const { date_from, date_to, is_current } = req.body;
  try {
    AcademicRepository.updateYear(code, { date_from, date_to, is_current: is_current ? 1 : 0 });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/years/:code', (req, res) => {
  const { code } = req.params;
  try {
    AcademicRepository.deleteYear(code);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── SEMESTERS ─────────────────────────────────────────────────────────────

router.get('/semesters', (req, res) => {
  const semesters = AcademicRepository.getAllSemesters();
  res.json(semesters.map(s => ({ ...s, is_current: !!s.is_current })));
});

router.post('/semesters', (req, res) => {
  const { sid, name, sort_order, is_current } = req.body;
  if (!sid || !name) {
    return res.status(400).json({ error: 'sid and name are required' });
  }
  try {
    if (is_current) {
      AcademicRepository.setCurrentSemester(sid);
    }
    AcademicRepository.createSemester({ sid, name, sort_order, is_current: is_current ? 1 : 0, created_by: (req as any).user.uid });
    res.status(201).json({ sid, name, sort_order, is_current: !!is_current });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/semesters/:sid/set-current', (req, res) => {
  const { sid } = req.params;
  try {
    AcademicRepository.setCurrentSemester(sid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/semesters/:sid', (req, res) => {
  const { sid } = req.params;
  const { name, sort_order, is_current } = req.body;
  try {
    AcademicRepository.updateSemester(sid, { name, sort_order, is_current: is_current ? 1 : 0 });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/semesters/:sid', (req, res) => {
  const { sid } = req.params;
  try {
    AcademicRepository.deleteSemester(sid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
