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
  const { academic_year, semester_sid, start_date, end_date, is_active } = req.body;
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
  const { iid, academic_year, semester_sid } = req.query;

  // If all params provided, return filtered registrations
  if (iid && academic_year && semester_sid) {
    const registrations = RegistrationRepository.getRegistrations(
      iid as string,
      academic_year as string,
      semester_sid as string
    );
    return res.json(registrations);
  }

  // Otherwise return recent registrations (for dashboard) using the view
  const recentRegistrations = db.prepare(`
    SELECT cr.*, s.surname, s.other_names, 
           (s.surname || ', ' || s.other_names) as full_name,
           c.title as course_title, c.credits
    FROM course_registrations cr
    JOIN students s ON cr.iid = s.iid
    JOIN courses c ON cr.cid = c.cid
    ORDER BY cr.registration_date DESC
    LIMIT 20
  `).all();
  res.json(recentRegistrations);
});

router.post('/', (req, res) => {
  const { iid, cid, academic_year, semester_sid, status } = req.body;

  // Check if window is open (students must have an open window)
  const activeWindow = RegistrationRepository.getActiveWindow(academic_year, semester_sid);
  if (!activeWindow && (req as any).user.role === 'Student') {
    return res.status(403).json({ error: 'Registration window is closed' });
  }

  try {
    RegistrationRepository.registerCourse({ iid, cid, academic_year, semester_sid, status: status || 'pending' });
    res.status(201).json({ iid, cid, academic_year, semester_sid, status: status || 'pending' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  const { iid, cid, academic_year, semester_sid } = req.query;
  if (!iid || !cid || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'iid, cid, academic_year, semester_sid are required' });
  }
  try {
    RegistrationRepository.unregisterCourse(iid as string, cid as string, academic_year as string, semester_sid as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
