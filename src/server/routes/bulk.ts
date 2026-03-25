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
    INSERT OR REPLACE INTO programs (progid, name, department, duration, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const p of data) {
      insert.run(p.progid, p.name, p.department, p.duration, (req as any).user.uid);
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
    INSERT OR REPLACE INTO courses (code, name, credit_hours, department, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((data) => {
    for (const c of data) {
      insert.run(c.code, c.name, c.credit_hours, c.department, (req as any).user.uid);
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
  const { AssessmentControlRepository } = await import('../repositories/AssessmentControlRepository');
  
  const user = (req as any).user;
  const isSuperAdmin = user.role === 'SuperAdmin';
  const academicYear = assessments[0]?.academic_year;
  const semesterId = assessments[0]?.semester_id;

  if (!isSuperAdmin) {
    if (!academicYear || !semesterId) {
      return res.status(400).json({ error: 'Academic year and semester are required for validation.' });
    }

    const activeWindow = AssessmentControlRepository.getActiveWindow(academicYear, semesterId);
    
    let lecturerLid = null;
    if (user.role === 'Lecturer') {
      const lecturer = db.prepare('SELECT lid FROM lecturers WHERE user_uid = ?').get(user.uid) as any;
      lecturerLid = lecturer?.lid;
    }

    // Check if window is open OR lecturer has granted access for the course
    // Note: Bulk upload check is simplified to course-level access since it's multiple students
    const courseCode = assessments[0]?.course_code;
    const hasAccess = activeWindow || (lecturerLid && AssessmentControlRepository.hasGrantedAccess(lecturerLid, courseCode));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Assessment upload window is closed. Please request access from SuperAdmin.' });
    }

    // Check for edits in the bulk data
    for (const a of assessments) {
      const existing = AssessmentRepository.getSpecificResult(a.index_no, a.course_code, a.academic_year, a.semester_id);
      if (existing) {
        if (!lecturerLid || !AssessmentControlRepository.hasGrantedAccess(lecturerLid, a.course_code, a.index_no)) {
          return res.status(403).json({ error: `Editing existing result for ${a.index_no} requires specific SuperAdmin approval.` });
        }
      }
    }
  }

  const insert = db.prepare(`
    INSERT INTO student_assessments (index_no, course_code, academic_year, level, semester_id, total_ca, exam_score, total_score, grade, grade_point, entered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(index_no, course_code, academic_year, semester_id) DO UPDATE SET
      level = excluded.level,
      total_ca = excluded.total_ca,
      exam_score = excluded.exam_score,
      total_score = excluded.total_score,
      grade = excluded.grade,
      grade_point = excluded.grade_point,
      entered_by = excluded.entered_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const uniqueIids = new Set<string>();
  const semesterSid = assessments[0]?.semester_sid;

  const insertMany = db.transaction((data) => {
    for (const a of data) {
      const total_score = (Number(a.total_ca) || 0) + (Number(a.exam_score) || 0);
      const { grade, grade_point } = AssessmentService.calculateGrade(total_score);
      insert.run(a.index_no, a.course_code, a.academic_year, a.level || '100', a.semester_id, a.total_ca, a.exam_score, total_score, grade, grade_point, (req as any).user.uid);
      uniqueIids.add(a.index_no);
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
