import express from 'express';
import { StudentRepository } from '../repositories/StudentRepository';
import { AssessmentRepository } from '../repositories/AssessmentRepository';
import bcrypt from 'bcryptjs';
import db from '../../../db';

const router = express.Router();

// GET all students
router.get('/', (req, res) => {
  const students = StudentRepository.getAllStudents();
  res.json(students);
});

// GET one student
router.get('/:iid', (req, res) => {
  const { iid } = req.params;
  const student = StudentRepository.getStudentByIid(iid);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// GET transcript
router.get('/:iid/transcript', (req, res) => {
  const { iid } = req.params;
  const student = StudentRepository.getStudentByIid(iid);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const assessments = AssessmentRepository.getStudentFullHistory(iid);
  const caches = AssessmentRepository.getStudentAllCaches(iid);

  res.json({ student, assessments, caches });
});

// GET level history
router.get('/:iid/level-history', (req, res) => {
  const { iid } = req.params;
  const history = StudentRepository.getStudentLevelHistory(iid);
  res.json(history);
});

// GET student login info
router.get('/:iid/login', (req, res) => {
  const { iid } = req.params;
  const login = db.prepare('SELECT id, iid, username, last_login, created_at FROM student_logins WHERE iid = ?').get(iid);
  res.json(login || null);
});

// POST create student
router.post('/', (req, res) => {
  const { index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level, photo } = req.body;
  if (!index_number || !surname || !other_names) {
    return res.status(400).json({ error: 'index_number, surname, and other_names are required' });
  }
  // Generate IID: 7 uppercase alphanumeric chars
  const iid = Math.random().toString(36).substring(2, 9).toUpperCase();
  try {
    StudentRepository.createStudent({
      iid,
      index_number,
      surname,
      other_names,
      gender,
      dob,
      email,
      phone,
      progid,
      admission_year,
      current_level: current_level || 100,
      status: 'active',
      photo: photo || null,
      created_by: (req as any).user.uid,
    });
    res.status(201).json({ iid, index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update student
router.put('/:iid', (req, res) => {
  const { iid } = req.params;
  const { surname, other_names, gender, dob, email, phone, progid, current_level, status, photo } = req.body;
  try {
    StudentRepository.updateStudent(iid, { surname, other_names, gender, dob, email, phone, progid, current_level, status, photo });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE student
router.delete('/:iid', (req, res) => {
  const { iid } = req.params;
  // Prevent deletion if role is not admin
  const role = (req as any).user?.role;
  if (!['SuperAdmin', 'Administrator'].includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions to delete students' });
  }
  try {
    StudentRepository.deleteStudent(iid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST update student level
router.post('/:iid/level', (req, res) => {
  const { iid } = req.params;
  const { level, academic_year, semester_sid } = req.body;
  try {
    StudentRepository.updateStudentLevel(iid, level, academic_year, semester_sid, (req as any).user.uid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST create/update student portal login
router.post('/:iid/login', async (req, res) => {
  const { iid } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }
  try {
    const student = db.prepare('SELECT index_number FROM students WHERE iid = ?').get(iid) as any;
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const username = student.index_number;

    const password_hash = await bcrypt.hash(password, 10);
    
    const existing = db.prepare('SELECT id FROM student_logins WHERE iid = ?').get(iid);
    if (existing) {
      db.prepare(`
        UPDATE student_logins 
        SET username = ?, password_hash = ?, requires_reset = 1 
        WHERE iid = ?
      `).run(username, password_hash, iid);
    } else {
      db.prepare(`
        INSERT INTO student_logins (iid, username, password_hash, requires_reset)
        VALUES (?, ?, ?, 1)
      `).run(iid, username, password_hash);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST reset student portal password
router.post('/:iid/reset-password', async (req, res) => {
  const { iid } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare('UPDATE student_logins SET password_hash = ?, requires_reset = 1 WHERE iid = ?').run(password_hash, iid);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'No login found for this student' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
