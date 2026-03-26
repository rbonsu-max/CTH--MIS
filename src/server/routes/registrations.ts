import express from 'express';
import { RegistrationRepository } from '../repositories/RegistrationRepository';
import db from '../../../db';

const router = express.Router();

// ─── WINDOWS ───────────────────────────────────────────────────────────────

router.get('/windows', (req, res) => {
  const windows = RegistrationRepository.getWindows();
  res.json(windows);
});

router.post('/windows', (req, res) => {
  const { academic_year, semester_sid, is_active } = req.body;
  const start_date = req.body.start_date ?? req.body.opening_date;
  const end_date = req.body.end_date ?? req.body.closing_date;
  try {
    RegistrationRepository.openWindow({ academic_year, semester_sid, start_date, end_date, is_active: is_active ? 1 : 0, created_by: (req as any).user.uid });
    res.status(201).json({ academic_year, semester_sid, start_date, end_date });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/windows/:id/close', (req, res) => {
  const { id } = req.params;
  try {
    RegistrationRepository.closeWindow(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── REGISTRATIONS ─────────────────────────────────────────────────────────

// GET registrations — supports both param-based and summary (no-params) calls
router.get('/', (req, res) => {
  const { index_no, academic_year, semester_sid, course_code } = req.query;
  const user = (req as any).user;

  if (user && user.role === 'Lecturer') {
    const registrations = RegistrationRepository.getLecturerRegistrations(
      user.uid,
      index_no as string | undefined,
      academic_year as string | undefined,
      semester_sid as string | undefined,
      course_code as string | undefined
    );
    return res.json(registrations);
  }

  const registrations = RegistrationRepository.getRegistrations(
    index_no as string | undefined,
    academic_year as string | undefined,
    semester_sid as string | undefined
  );
  
  // If no params, limit to 20 for dashboard
  if (!index_no && !academic_year && !semester_sid) {
    return res.json(registrations.slice(0, 20));
  }
  
  res.json(registrations);
});

router.post('/', (req, res) => {
  const { index_no, course_code, academic_year, semester_sid, status } = req.body;

  // Check if window is open (students must have an open window)
  const activeWindow = RegistrationRepository.getActiveWindow(academic_year, semester_sid);
  if (!activeWindow && (req as any).user.role === 'Student') {
    return res.status(403).json({ error: 'Registration window is closed' });
  }

  try {
    RegistrationRepository.registerCourse({ index_no, course_code, academic_year, semester_sid, status: status || 'pending' });
    res.status(201).json({ index_no, course_code, academic_year, semester_sid, status: status || 'pending' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  const { index_no, course_code, academic_year, semester_sid } = req.query;
  if (!index_no || !course_code || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'index_no, course_code, academic_year, semester_sid are required' });
  }
  try {
    RegistrationRepository.unregisterCourse(index_no as string, course_code as string, academic_year as string, semester_sid as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
