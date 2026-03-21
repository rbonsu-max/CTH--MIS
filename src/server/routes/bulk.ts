import express from 'express';
import db from '../../../db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/students', (req, res) => {
  const students = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO students (iid, index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const s of data) {
      insert.run(s.iid || uuidv4(), s.index_number, s.surname, s.other_names, s.gender, s.dob, s.email, s.phone, s.progid, s.admission_year, s.current_level, s.status || 'active', (req as any).user.uid);
    }
  });
  try {
    insertMany(students);
    res.json({ success: true, count: students.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/programs', (req, res) => {
  const programs = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO programs (progid, name, department, duration_years, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const p of data) {
      insert.run(p.progid, p.name, p.department, p.duration_years, (req as any).user.uid);
    }
  });
  try {
    insertMany(programs);
    res.json({ success: true, count: programs.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/courses', (req, res) => {
  const courses = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO courses (cid, title, credits, department, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const c of data) {
      insert.run(c.cid, c.title, c.credits, c.department, (req as any).user.uid);
    }
  });
  try {
    insertMany(courses);
    res.json({ success: true, count: courses.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/lecturers', (req, res) => {
  const lecturers = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO lecturers (lid, fullname, email, phone, department, designation, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const l of data) {
      insert.run(l.lid, l.fullname, l.email, l.phone, l.department, l.designation, (req as any).user.uid);
    }
  });
  try {
    insertMany(lecturers);
    res.json({ success: true, count: lecturers.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/users', (req, res) => {
  const users = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO users (id, uid, fullname, username, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const u of data) {
      const password_hash = u.password ? bcrypt.hashSync(u.password, 10) : bcrypt.hashSync('password123', 10);
      insert.run(u.id || uuidv4(), u.uid || uuidv4(), u.fullname, u.username, password_hash, u.role, u.status || 'active');
    }
  });
  try {
    insertMany(users);
    res.json({ success: true, count: users.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/assessments', async (req, res) => {
  const assessments = req.body;
  const { AssessmentRepository } = await import('../repositories/AssessmentRepository');
  const { AssessmentService } = await import('../services/AssessmentService');
  
  const insert = db.prepare(`
    INSERT INTO student_assessments (iid, cid, academic_year, semester_sid, class_score, exam_score, grade, gp, entered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(iid, cid, academic_year, semester_sid) DO UPDATE SET
      class_score = excluded.class_score,
      exam_score = excluded.exam_score,
      grade = excluded.grade,
      gp = excluded.gp,
      entered_by = excluded.entered_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const uniqueIids = new Set<string>();
  const academicYear = assessments[0]?.academic_year;
  const semesterSid = assessments[0]?.semester_sid;

  const insertMany = db.transaction((data) => {
    for (const a of data) {
      const total_score = (Number(a.class_score) || 0) + (Number(a.exam_score) || 0);
      const { grade, gp } = AssessmentService.calculateGrade(total_score);
      insert.run(a.iid, a.cid, a.academic_year, a.semester_sid, a.class_score, a.exam_score, grade, gp, (req as any).user.uid);
      uniqueIids.add(a.iid);
    }
  });

  try {
    insertMany(assessments);
    
    // Compute GPA for all affected students
    if (academicYear && semesterSid) {
      for (const iid of Array.from(uniqueIids)) {
        await AssessmentService.computeGPA(iid, academicYear, semesterSid);
      }
    }

    res.json({ success: true, count: assessments.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
