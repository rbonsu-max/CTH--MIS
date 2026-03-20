import express from 'express';
import { AcademicRepository } from '../repositories/AcademicRepository';

const router = express.Router();

router.get('/years', (req, res) => {
  const years = AcademicRepository.getAllYears();
  res.json(years.map(y => ({ ...y, is_current: !!y.is_current })));
});

router.post('/years', (req, res) => {
  const { code, is_current, start_date, end_date } = req.body;
  try {
    if (is_current) {
      AcademicRepository.setCurrentYear(code);
    }
    AcademicRepository.createYear({ code, is_current: is_current ? 1 : 0, start_date, end_date, created_by: (req as any).user.uid });
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
  const { start_date, end_date, is_current } = req.body;
  try {
    AcademicRepository.updateYear(code, { start_date, end_date, is_current: is_current ? 1 : 0 });
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

router.get('/semesters', (req, res) => {
  const semesters = AcademicRepository.getAllSemesters();
  res.json(semesters.map(s => ({ ...s, is_current: !!s.is_current })));
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

export default router;
