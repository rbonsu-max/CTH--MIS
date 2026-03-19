import Database from 'better-sqlite3';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const db = new Database(join(process.cwd(), 'sims.db'));

// Initialize database schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      indexNumber TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      programId TEXT,
      level TEXT,
      gender TEXT,
      dateOfBirth TEXT,
      phoneNumber TEXT,
      address TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      department TEXT,
      duration TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      creditHours INTEGER,
      programId TEXT,
      semester TEXT,
      level TEXT
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      studentId TEXT,
      courseId TEXT,
      academicYear TEXT,
      semester TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(studentId, courseId, academicYear, semester)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      studentId TEXT,
      courseId TEXT,
      academicYear TEXT,
      semester TEXT,
      midSemScore REAL,
      examScore REAL,
      totalScore REAL,
      grade TEXT,
      gradePoint REAL,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(studentId, courseId, academicYear, semester)
    );

    CREATE TABLE IF NOT EXISTS lecturers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT,
      phoneNumber TEXT
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      year TEXT UNIQUE NOT NULL,
      isCurrent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      isCurrent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      event TEXT NOT NULL,
      academicYear TEXT,
      semester TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed initial semesters if not exists
  const semesterExists = db.prepare('SELECT id FROM semesters').get();
  if (!semesterExists) {
    db.prepare('INSERT INTO semesters (id, name, isCurrent) VALUES (?, ?, ?)').run('1', 'First Semester', 1);
    db.prepare('INSERT INTO semesters (id, name, isCurrent) VALUES (?, ?, ?)').run('2', 'Second Semester', 0);
  }

  // Seed initial academic year if not exists
  const yearExists = db.prepare('SELECT id FROM academic_years').get();
  if (!yearExists) {
    db.prepare('INSERT INTO academic_years (id, year, isCurrent) VALUES (?, ?, ?)').run('1', '2024/2025', 1);
  }

  // Seed initial super admin if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('great@olacoe.edu.gh');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)')
      .run('1', 'Professor Great', 'great@olacoe.edu.gh', hashedPassword, 'super_admin', 'https://picsum.photos/seed/prof/200');
  }

  const userAdminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('rbonsu@olacoe.edu.gh');
  if (!userAdminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)')
      .run('2', 'Richard Bonsu', 'rbonsu@olacoe.edu.gh', hashedPassword, 'super_admin', 'https://ui-avatars.com/api/?name=Richard+Bonsu&background=random');
  }
}

export default db;
