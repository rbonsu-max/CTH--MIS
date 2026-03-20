import express from 'express';
import { StudentRepository } from '../repositories/StudentRepository';
import { AssessmentRepository } from '../repositories/AssessmentRepository';
import bcrypt from 'bcryptjs';
import db from '../../../db';

const router = express.Router();

router.get('/', (req, res) => {
  const students = StudentRepository.getAllStudents();
  res.json(students);
});

router.get('/:iid/transcript', (req, res) => {
  const { iid } = req.params;
  const student = StudentRepository.getStudentByIid(iid);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  
  const assessments = AssessmentRepository.getStudentFullHistory(iid);
  const caches = AssessmentRepository.getStudentAllCaches(iid);
  
  res.json({
    student,
    assessments,
    caches
  });
});

router.post('/', (req, res) => {
  const { index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level } = req.body;
  const iid = Math.random().toString(36).substring(2, 9).toUpperCase(); // Simple IID generation
  try {
    StudentRepository.createStudent({ iid, index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level, created_by: (req as any).user.uid });
    res.status(201).json({ iid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:iid', (req, res) => {
  const { iid } = req.params;
  const student = StudentRepository.getStudentByIid(iid);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

router.get('/:iid/level-history', (req, res) => {
  const { iid } = req.params;
  const history = StudentRepository.getStudentLevelHistory(iid);
  res.json(history);
});

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

router.get('/:iid/login', (req, res) => {
  const { iid } = req.params;
  const login = db.prepare('SELECT id, iid, username, last_login, created_at FROM student_logins WHERE iid = ?').get(iid);
  res.json(login || null);
});

router.post('/:iid/login', async (req, res) => {
  const { iid } = req.params;
  const { username, password } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    db.prepare(`
      INSERT INTO student_logins (iid, username, password_hash)
      VALUES (?, ?, ?)
      ON CONFLICT(iid) DO UPDATE SET
        username = excluded.username,
        password_hash = excluded.password_hash
      ON CONFLICT(username) DO UPDATE SET
        password_hash = excluded.password_hash
    `).run(iid, username, password_hash);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
