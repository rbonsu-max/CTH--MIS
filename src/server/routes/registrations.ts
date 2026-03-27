import express from 'express';
import { RegistrationRepository } from '../repositories/RegistrationRepository';
import { StudentRepository } from '../repositories/StudentRepository';
import { ProgramRepository } from '../repositories/ProgramRepository';
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
  if (!academic_year || !semester_sid || !start_date || !end_date) {
    return res.status(400).json({ error: 'academic_year, semester_sid, start_date, and end_date are required' });
  }
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

  if (user && user.role === 'Student') {
    const student = StudentRepository.getStudentByIid(user.uid);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const registrations = RegistrationRepository.getRegistrations(
      student.iid,
      academic_year as string | undefined,
      semester_sid as string | undefined
    );
    return res.json(registrations);
  }

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
  const user = (req as any).user;
  if (!index_no || !course_code || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'index_no, course_code, academic_year, and semester_sid are required' });
  }

  const student = StudentRepository.getStudentByIid(index_no);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  const course = db.prepare('SELECT code FROM courses WHERE code = ?').get(course_code);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Check if window is open (students must have an open window)
  const activeWindow = RegistrationRepository.getActiveWindow(academic_year, semester_sid);
  if (!activeWindow && user.role === 'Student') {
    return res.status(403).json({ error: 'Registration window is closed' });
  }

  if (user.role === 'Student') {
    const loggedInStudent = StudentRepository.getStudentByIid(user.uid);
    if (!loggedInStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    if (index_no !== loggedInStudent.iid) {
      return res.status(403).json({ error: 'Students can only register courses for their own profile' });
    }

    const curriculum = ProgramRepository.getCurriculum(loggedInStudent.progid, loggedInStudent.current_level, semester_sid);
    const isAllowedCourse = curriculum.some((item) => item.course_code === course_code);
    if (!isAllowedCourse) {
      return res.status(403).json({ error: 'Selected course is not available for your current level and semester' });
    }
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
  const user = (req as any).user;
  if (!index_no || !course_code || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'index_no, course_code, academic_year, semester_sid are required' });
  }

  if (user?.role === 'Student') {
    return res.status(403).json({ error: 'Students are not allowed to delete registrations directly' });
  }
  try {
    RegistrationRepository.unregisterCourse(index_no as string, course_code as string, academic_year as string, semester_sid as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
