import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'sims.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

const normalizeCalendarDate = (raw: unknown): string => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultAcademicYearCode = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = now.getMonth() >= 6 ? currentYear : currentYear - 1;
  return `${startYear}/${startYear + 1}`;
};

export function initDb() {
  db.exec(`
    -- 0. USER DOMAIN
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      fullname TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Administrator','User','Lecturer','Student','Finance','Registry','SuperAdmin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','locked')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 1. CORE REFERENCE TABLES
    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      date_from TEXT,
      date_to TEXT,
      is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS semesters (
      sid TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER,
      is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS programs (
      pid TEXT PRIMARY KEY,
      progid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT,
      duration INTEGER DEFAULT 4,
      required_ch INTEGER,
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      credit_hours INTEGER NOT NULL DEFAULT 3,
      department TEXT,
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lecturers (
      lid TEXT PRIMARY KEY,
      title TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      tel TEXT,
      department TEXT,
      designation TEXT,
      user_uid TEXT REFERENCES users(uid),
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. STUDENT DOMAIN
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      iid TEXT NOT NULL UNIQUE,
      index_number TEXT NOT NULL UNIQUE,
      surname TEXT NOT NULL,
      other_names TEXT NOT NULL,
      full_name TEXT GENERATED ALWAYS AS (surname || ', ' || other_names) VIRTUAL,
      gender TEXT CHECK (gender IN ('Male','Female','Other')),
      dob TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      progid TEXT REFERENCES programs(progid),
      admission_year TEXT REFERENCES academic_years(code),
      current_level INTEGER DEFAULT 100,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','withdrawn','graduated','suspended','deferred')),
      photo TEXT,
      user_uid TEXT REFERENCES users(uid),
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      iid TEXT NOT NULL REFERENCES students(iid),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      requires_reset INTEGER NOT NULL DEFAULT 1 CHECK (requires_reset IN (0,1)),
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      iid TEXT NOT NULL REFERENCES students(iid),
      level INTEGER NOT NULL,
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      semester_sid TEXT NOT NULL REFERENCES semesters(sid),
      is_current INTEGER DEFAULT 1,
      updated_by TEXT REFERENCES users(uid),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(iid, academic_year, semester_sid)
    );

    -- 3. CURRICULUM & DELIVERY
    CREATE TABLE IF NOT EXISTS program_curriculum (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      progid TEXT NOT NULL REFERENCES programs(progid),
      course_code TEXT NOT NULL REFERENCES courses(code),
      level INTEGER NOT NULL,
      semester_sid TEXT NOT NULL REFERENCES semesters(sid),
      is_elective INTEGER DEFAULT 0,
      created_by TEXT REFERENCES users(uid),
      UNIQUE(progid, course_code, level, semester_sid)
    );

    CREATE TABLE IF NOT EXISTS lecturer_course_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lid TEXT NOT NULL REFERENCES lecturers(lid),
      course_code TEXT NOT NULL REFERENCES courses(code),
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      semester_sid TEXT NOT NULL REFERENCES semesters(sid),
      assigned_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lid, course_code, academic_year, semester_sid)
    );

    -- 4. REGISTRATION
    CREATE TABLE IF NOT EXISTS registration_windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      semester_sid TEXT NOT NULL REFERENCES semesters(sid),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(uid)
    );

    CREATE TABLE IF NOT EXISTS course_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_no TEXT NOT NULL REFERENCES students(iid),
      course_code TEXT NOT NULL REFERENCES courses(code),
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      semester_sid TEXT NOT NULL REFERENCES semesters(sid),
      registration_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      UNIQUE(index_no, course_code, academic_year, semester_sid)
    );

    -- 5. ASSESSMENT & RESULTS
    CREATE TABLE IF NOT EXISTS student_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_no TEXT NOT NULL REFERENCES students(iid),
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      level TEXT NOT NULL,
      semester_id TEXT NOT NULL REFERENCES semesters(sid),
      course_code TEXT NOT NULL REFERENCES courses(code),
      a1 REAL DEFAULT 0,
      a2 REAL DEFAULT 0,
      a3 REAL DEFAULT 0,
      a4 REAL DEFAULT 0,
      total_ca REAL,
      exam_score REAL DEFAULT 0,
      total_score REAL,
      grade TEXT,
      grade_point REAL,
      weighted_gp REAL,
      entered_by TEXT REFERENCES users(uid),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(index_no, course_code, academic_year, semester_id)
    );

    CREATE TABLE IF NOT EXISTS lecturer_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_no TEXT NOT NULL REFERENCES students(iid),
      course_code TEXT NOT NULL REFERENCES courses(code),
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      semester_id TEXT NOT NULL REFERENCES semesters(sid),
      a1 REAL DEFAULT 0,
      a2 REAL DEFAULT 0,
      a3 REAL DEFAULT 0,
      a4 REAL DEFAULT 0,
      total_ca REAL,
      exam_score REAL DEFAULT 0,
      total_score REAL,
      grade TEXT,
      grade_point REAL,
      weighted_gp REAL,
      entered_by TEXT REFERENCES users(uid),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(index_no, course_code, academic_year, semester_id)
    );

    CREATE TABLE IF NOT EXISTS assessment_windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      semester_id TEXT NOT NULL REFERENCES semesters(sid),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assessment_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lid TEXT NOT NULL REFERENCES lecturers(lid),
      course_code TEXT NOT NULL REFERENCES courses(code),
      academic_year TEXT REFERENCES academic_years(code),
      semester_id TEXT REFERENCES semesters(sid),
      index_no TEXT REFERENCES students(iid), -- NULL if for whole course
      request_type TEXT CHECK (request_type IN ('upload','edit')),
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','granted','denied')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      granted_at TEXT,
      expires_at TEXT,
      processed_by TEXT REFERENCES users(uid)
    );

    CREATE TABLE IF NOT EXISTS broadsheet_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      index_no TEXT NOT NULL REFERENCES students(iid),
      academic_year TEXT NOT NULL REFERENCES academic_years(code),
      level TEXT NOT NULL,
      semester_id TEXT NOT NULL REFERENCES semesters(sid),
      progid TEXT NOT NULL REFERENCES programs(progid),
      sCH REAL,
      sGP REAL,
      sGPA REAL,
      cCH REAL,
      cGP REAL,
      cGPA REAL,
      class TEXT,
      calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(index_no, academic_year, semester_id)
    );

    -- 6. AUXILIARY TABLES
    CREATE TABLE IF NOT EXISTS sms_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT REFERENCES users(uid)
    );

    CREATE TABLE IF NOT EXISTS test_sms_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      description TEXT,
      added_by TEXT REFERENCES users(uid)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_uid TEXT REFERENCES users(uid),
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_by TEXT REFERENCES users(uid),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grading_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade TEXT NOT NULL UNIQUE,
      min_score REAL NOT NULL,
      max_score REAL NOT NULL,
      gp REAL NOT NULL,
      remarks TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_uid TEXT NOT NULL REFERENCES users(uid),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      payload TEXT,
      is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TEXT
    );

    -- 7. CALENDAR EVENTS
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      event TEXT NOT NULL,
      academic_year TEXT REFERENCES academic_years(code),
      semester TEXT REFERENCES semesters(sid),
      created_by TEXT REFERENCES users(uid),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- PERFORMANCE INDEXES
    CREATE INDEX IF NOT EXISTS idx_students_prog ON students(progid);
    CREATE INDEX IF NOT EXISTS idx_students_iid ON students(iid);
    CREATE INDEX IF NOT EXISTS idx_assessments_idxno ON student_assessments(index_no);
    CREATE INDEX IF NOT EXISTS idx_assessments_cid ON student_assessments(course_code);
    CREATE INDEX IF NOT EXISTS idx_assessments_period ON student_assessments(academic_year, semester_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_iid ON course_registrations(index_no);
    CREATE INDEX IF NOT EXISTS idx_curriculum_prog ON program_curriculum(progid);

    -- COMPATIBILITY VIEWS
    CREATE VIEW IF NOT EXISTS view_student_details AS
    SELECT s.*, p.name as program_name, ay.code as admission_year_code
    FROM students s
    LEFT JOIN programs p ON s.progid = p.progid
    LEFT JOIN academic_years ay ON s.admission_year = ay.code;

    CREATE VIEW IF NOT EXISTS view_course_registrations AS
    SELECT cr.*, s.surname, s.other_names, c.name as course_name, c.credit_hours
    FROM course_registrations cr
    JOIN students s ON cr.index_no = s.iid
    JOIN courses c ON cr.course_code = c.code;

    CREATE VIEW IF NOT EXISTS view_student_results AS
    SELECT sa.*, s.index_number, s.surname, s.other_names, s.progid, c.name as course_name, c.credit_hours
    FROM student_assessments sa
    JOIN students s ON sa.index_no = s.iid
    JOIN courses c ON sa.course_code = c.code;
  `);

  const ensureColumn = (table: string, column: string, definition: string) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((item) => item.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  };

  ensureColumn('assessment_requests', 'academic_year', 'TEXT REFERENCES academic_years(code)');
  ensureColumn('assessment_requests', 'semester_id', 'TEXT REFERENCES semesters(sid)');
  ensureColumn('users', 'email', 'TEXT');
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL').run();
  db.prepare(`
    UPDATE users
    SET email = username
    WHERE email IS NULL
      AND username LIKE '%@%'
  `).run();

  // Seed default academic year and semester if empty
  const yearCount = db.prepare('SELECT COUNT(*) as count FROM academic_years').get() as { count: number };
  if (yearCount.count === 0) {
    db.prepare('INSERT INTO academic_years (code, is_current) VALUES (?, ?)').run(getDefaultAcademicYearCode(), 1);
  }

  const semCount = db.prepare('SELECT COUNT(*) as count FROM semesters').get() as { count: number };
  if (semCount.count === 0) {
    db.prepare('INSERT INTO semesters (sid, name, sort_order, is_current) VALUES (?, ?, ?, ?)').run('SEM1', 'Semester 1', 1, 1);
    db.prepare('INSERT INTO semesters (sid, name, sort_order, is_current) VALUES (?, ?, ?, ?)').run('SEM2', 'Semester 2', 2, 0);
  }

  const defaultSystemSettings = [
    ['institution_name', 'St. Nicholas Anglican Seminary'],
    ['institution_short_name', 'SNS'],
    ['institution_address', 'P.O.Box AD162, Cape Coast, Ghana'],
    ['institution_phone', '+233-3321-33174'],
    ['institution_email', 'registrar@snsanglican.org'],
    ['portal_title', 'SIMS Portal'],
    ['portal_subtitle', 'Student Information Management System']
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSystemSettings) {
    insertSetting.run(key, value);
  }

  const legacyCalendarEvents = db.prepare('SELECT id, date FROM calendar_events').all() as Array<{ id: string; date: string }>;
  const updateCalendarDate = db.prepare('UPDATE calendar_events SET date = ? WHERE id = ?');
  for (const item of legacyCalendarEvents) {
    const normalizedDate = normalizeCalendarDate(item.date);
    if (normalizedDate && normalizedDate !== item.date) {
      updateCalendarDate.run(normalizedDate, item.id);
    }
  }

  const duplicateWindows = db.prepare(`
    SELECT academic_year, semester_sid
    FROM registration_windows
    GROUP BY academic_year, semester_sid
    HAVING COUNT(*) > 1
  `).all() as Array<{ academic_year: string; semester_sid: string }>;
  for (const period of duplicateWindows) {
    const rows = db.prepare(`
      SELECT id, start_date, end_date, is_active
      FROM registration_windows
      WHERE academic_year = ? AND semester_sid = ?
      ORDER BY
        CASE WHEN start_date <= end_date THEN 0 ELSE 1 END,
        is_active DESC,
        id DESC
    `).all(period.academic_year, period.semester_sid) as Array<{ id: number; start_date: string; end_date: string; is_active: number }>;
    const keeper = rows[0];
    if (!keeper) continue;
    db.prepare(`
      DELETE FROM registration_windows
      WHERE academic_year = ? AND semester_sid = ? AND id <> ?
    `).run(period.academic_year, period.semester_sid, keeper.id);
  }
  db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_windows_period_unique
    ON registration_windows(academic_year, semester_sid)
  `).run();

  // Seed default grading points if empty
  const gradingCount = db.prepare('SELECT COUNT(*) as count FROM grading_points').get() as { count: number };
  if (gradingCount.count === 0) {
    const scales = [
      ['A', 80, 100, 4.0, 'Excellent'],
      ['B+', 75, 79.99, 3.5, 'Very Good'],
      ['B', 70, 74.99, 3.0, 'Good'],
      ['C+', 65, 69.99, 2.5, 'Fairly Good'],
      ['C', 60, 64.99, 2.0, 'Average'],
      ['D+', 55, 59.99, 1.5, 'Below Average'],
      ['D', 50, 54.99, 1.0, 'Marginal Pass'],
      ['E', 0, 49.99, 0.0, 'Fail']
    ];
    const insertGp = db.prepare('INSERT INTO grading_points (grade, min_score, max_score, gp, remarks) VALUES (?, ?, ?, ?, ?)');
    for (const [grade, min, max, gp, rem] of scales) {
      insertGp.run(grade, min, max, gp, rem);
    }
  }

  // Seed initial SuperAdmin if not exists
  const superAdmin = db.prepare('SELECT * FROM users WHERE role = ?').get('SuperAdmin');
  if (!superAdmin) {
    const uid = uuidv4();
    const passwordHash = bcrypt.hashSync('$$Ecg$$', 10);
    db.prepare(`
      INSERT INTO users (id, uid, fullname, username, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), uid, 'Isaac Roger Kweku Bonsu', 'youroger1@gmail.com', passwordHash, 'SuperAdmin', 'active');
  }

  // Seed departments if empty
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
  if (deptCount.count === 0) {
    const depts = [
      ['THEO', 'Theology'],
      ['BIBL', 'Biblical Studies'],
      ['PAST', 'Pastoral Studies'],
      ['MISS', 'Mission Studies'],
      ['HIST', 'Church History'],
      ['PHIL', 'Philosophy & Ethics'],
      ['EDUC', 'Religious Education'],
      ['LANG', 'Languages'],
      ['GEN', 'General Studies']
    ];
    const insertDept = db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)');
    for (const [code, name] of depts) {
      insertDept.run(code, name);
    }
  }
}

export default db;
