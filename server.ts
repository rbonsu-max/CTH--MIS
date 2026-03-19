import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import { initDb } from './db';
import db from './db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const JWT_SECRET = process.env.JWT_SECRET || 'sims-secret-key';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  initDb();

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  const api = express.Router();

  // Auth Routes
  api.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email, avatar: user.avatar }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar });
  });

  api.post('/auth/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ success: true });
  });

  api.get('/auth/me', authenticate, (req: any, res) => {
    res.json(req.user);
  });

  // Students
  api.get('/students', authenticate, (req, res) => {
    const students = db.prepare('SELECT * FROM students').all();
    res.json(students);
  });

  api.post('/students', (req, res) => {
    const { indexNumber, name, email, programId, level, gender, dateOfBirth, phoneNumber, address } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO students (id, indexNumber, name, email, programId, level, gender, dateOfBirth, phoneNumber, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, indexNumber, name, email, programId, level, gender, dateOfBirth, phoneNumber, address);
      res.status(201).json({ id, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Programs
  api.get('/programs', authenticate, (req, res) => {
    const programs = db.prepare('SELECT * FROM programs').all();
    res.json(programs);
  });

  api.post('/programs', (req, res) => {
    const { name, code, department, duration, description } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO programs (id, name, code, department, duration, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, code, department, duration, description);
      res.status(201).json({ id, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Courses
  api.get('/courses', authenticate, (req, res) => {
    const courses = db.prepare('SELECT * FROM courses').all();
    res.json(courses);
  });

  api.post('/courses', (req, res) => {
    const { name, code, creditHours, programId, semester, level } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO courses (id, name, code, creditHours, programId, semester, level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, code, creditHours, programId, semester, level);
      res.status(201).json({ id, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Registrations
  api.get('/registrations', authenticate, (req, res) => {
    const registrations = db.prepare(`
      SELECT r.*, s.name as studentName, c.name as courseName, c.code as courseCode
      FROM registrations r
      JOIN students s ON r.studentId = s.id
      JOIN courses c ON r.courseId = c.id
    `).all();
    res.json(registrations);
  });

  api.post('/registrations', (req, res) => {
    const { studentId, courseId, academicYear, semester } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO registrations (id, studentId, courseId, academicYear, semester)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, studentId, courseId, academicYear, semester);
      res.status(201).json({ id, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Assessments
  api.get('/assessments', authenticate, (req, res) => {
    const assessments = db.prepare(`
      SELECT a.*, s.name as studentName, c.name as courseName, c.code as courseCode
      FROM assessments a
      JOIN students s ON a.studentId = s.id
      JOIN courses c ON a.courseId = c.id
    `).all();
    res.json(assessments);
  });

  api.post('/assessments', (req, res) => {
    const { studentId, courseId, academicYear, semester, midSemScore, examScore } = req.body;
    const totalScore = (midSemScore || 0) + (examScore || 0);
    
    // Simple grading logic
    let grade = 'F';
    let gradePoint = 0;
    if (totalScore >= 80) { grade = 'A'; gradePoint = 4.0; }
    else if (totalScore >= 75) { grade = 'B+'; gradePoint = 3.5; }
    else if (totalScore >= 70) { grade = 'B'; gradePoint = 3.0; }
    else if (totalScore >= 65) { grade = 'C+'; gradePoint = 2.5; }
    else if (totalScore >= 60) { grade = 'C'; gradePoint = 2.0; }
    else if (totalScore >= 55) { grade = 'D+'; gradePoint = 1.5; }
    else if (totalScore >= 50) { grade = 'D'; gradePoint = 1.0; }

    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO assessments (id, studentId, courseId, academicYear, semester, midSemScore, examScore, totalScore, grade, gradePoint)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(studentId, courseId, academicYear, semester) DO UPDATE SET
          midSemScore = excluded.midSemScore,
          examScore = excluded.examScore,
          totalScore = excluded.totalScore,
          grade = excluded.grade,
          gradePoint = excluded.gradePoint,
          updatedAt = CURRENT_TIMESTAMP
      `).run(id, studentId, courseId, academicYear, semester, midSemScore, examScore, totalScore, grade, gradePoint);
      res.status(201).json({ id, ...req.body, totalScore, grade, gradePoint });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Lecturers
  api.get('/lecturers', authenticate, (req, res) => {
    const lecturers = db.prepare('SELECT * FROM lecturers').all();
    res.json(lecturers);
  });

  api.post('/lecturers', (req, res) => {
    const { name, email, department, phoneNumber } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO lecturers (id, name, email, department, phoneNumber)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, email, department, phoneNumber);
      res.status(201).json({ id, ...req.body });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk Uploads
  api.post('/bulk/students', authenticate, (req, res) => {
    const students = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO students (id, indexNumber, name, email, programId, level, gender, dateOfBirth, phoneNumber, address, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((data) => {
      for (const s of data) {
        insert.run(s.id || uuidv4(), s.indexNumber, s.name, s.email, s.programId, s.level, s.gender, s.dateOfBirth, s.phoneNumber, s.address, s.status || 'active');
      }
    });
    try {
      insertMany(students);
      res.json({ success: true, count: students.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  api.post('/bulk/programs', authenticate, (req, res) => {
    const programs = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO programs (id, name, code, department, duration, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((data) => {
      for (const p of data) {
        insert.run(p.id || uuidv4(), p.name, p.code, p.department, p.duration, p.description);
      }
    });
    try {
      insertMany(programs);
      res.json({ success: true, count: programs.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  api.post('/bulk/courses', authenticate, (req, res) => {
    const courses = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO courses (id, name, code, creditHours, programId, semester, level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((data) => {
      for (const c of data) {
        insert.run(c.id || uuidv4(), c.name, c.code, c.creditHours, c.programId, c.semester, c.level);
      }
    });
    try {
      insertMany(courses);
      res.json({ success: true, count: courses.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  api.post('/bulk/lecturers', authenticate, (req, res) => {
    const lecturers = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO lecturers (id, name, email, department, phoneNumber)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((data) => {
      for (const l of data) {
        insert.run(l.id || uuidv4(), l.name, l.email, l.department, l.phoneNumber);
      }
    });
    try {
      insertMany(lecturers);
      res.json({ success: true, count: lecturers.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  api.post('/bulk/users', authenticate, (req, res) => {
    const users = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, password, role, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((data) => {
      for (const u of data) {
        const password = u.password ? bcrypt.hashSync(u.password, 10) : bcrypt.hashSync('password123', 10);
        insert.run(u.id || uuidv4(), u.name, u.email, password, u.role, u.avatar);
      }
    });
    try {
      insertMany(users);
      res.json({ success: true, count: users.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Academic Years
  api.get('/academic-years', authenticate, (req, res) => {
    const years = db.prepare('SELECT * FROM academic_years').all();
    res.json(years.map((y: any) => ({ ...y, isCurrent: !!y.isCurrent })));
  });

  api.post('/academic-years', (req, res) => {
    const { year, isCurrent } = req.body;
    const id = uuidv4();
    try {
      if (isCurrent) {
        db.prepare('UPDATE academic_years SET isCurrent = 0').run();
      }
      db.prepare(`
        INSERT INTO academic_years (id, year, isCurrent)
        VALUES (?, ?, ?)
      `).run(id, year, isCurrent ? 1 : 0);
      res.status(201).json({ id, year, isCurrent: !!isCurrent });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  api.post('/academic-years/:id/set-current', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('UPDATE academic_years SET isCurrent = 0').run();
      db.prepare('UPDATE academic_years SET isCurrent = 1 WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Semesters
  api.get('/semesters', authenticate, (req, res) => {
    const semesters = db.prepare('SELECT * FROM semesters').all();
    res.json(semesters.map((s: any) => ({ ...s, isCurrent: !!s.isCurrent })));
  });

  api.post('/semesters/:id/set-current', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('UPDATE semesters SET isCurrent = 0').run();
      db.prepare('UPDATE semesters SET isCurrent = 1 WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.use('/api', api);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
