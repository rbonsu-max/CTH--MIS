import express from 'express';
import { RegistrationRepository } from '../repositories/RegistrationRepository';

const router = express.Router();

// Windows
router.get('/windows', (req, res) => {
  const windows = RegistrationRepository.getWindows();
  res.json(windows);
});

router.post('/windows', (req, res) => {
  const { academic_year, semester_sid, start_date, end_date, is_active } = req.body;
  try {
    RegistrationRepository.openWindow({ academic_year, semester_sid, start_date, end_date, is_active: is_active ? 1 : 0, created_by: (req as any).user.uid });
    res.status(201).json({ academic_year, semester_sid, ...req.body });
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

// Registrations
router.get('/', (req, res) => {
  const { iid, academic_year, semester_sid } = req.query;
  if (!iid || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }
  const registrations = RegistrationRepository.getRegistrations(iid as string, academic_year as string, semester_sid as string);
  res.json(registrations);
});

router.post('/', (req, res) => {
  const { iid, cid, academic_year, semester_sid, status } = req.body;
  
  // Check if window is open
  const activeWindow = RegistrationRepository.getActiveWindow(academic_year, semester_sid);
  if (!activeWindow && (req as any).user.role === 'Student') {
    return res.status(403).json({ error: 'Registration window is closed' });
  }

  try {
    RegistrationRepository.registerCourse({ iid, cid, academic_year, semester_sid, status: status || 'pending' });
    res.status(201).json({ iid, cid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  const { iid, cid, academic_year, semester_sid } = req.query;
  try {
    RegistrationRepository.unregisterCourse(iid as string, cid as string, academic_year as string, semester_sid as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
