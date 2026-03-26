import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const SOURCE_SQL_PATH = '/Volumes/roger/cth-seminary (3).sql';
const TARGET_DB_PATH = path.join(process.cwd(), 'sims.db');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const REPORT_DIR = path.join(process.cwd(), 'migration-reports');
const STAGING_DIR = path.join(process.cwd(), '.tmp');

const SOURCE_TABLES = new Set([
  'students_biodata',
  'programs',
  'courses',
  'programs_populate_cache',
  'lecturers',
  'courses_assign',
  'students_course_registered',
  'students_assessments',
  'academic_year',
  'semesters',
  'boardsheet_cache',
]);

type Row = Record<string, unknown>;

interface ImportReport {
  sourceCounts: Record<string, number>;
  beforeCounts: Record<string, number>;
  afterCounts: Record<string, number>;
  importedCounts: Record<string, number>;
  skippedCounts: Record<string, number>;
  skippedReasons: Record<string, number>;
  preservedUsers: {
    before: number;
    after: number;
    superadminsBefore: number;
    superadminsAfter: number;
  };
  samples: {
    students: Array<{ iid: string; full_name: string; progid: string | null; admission_year: string | null }>;
    assessments: Array<{ index_no: string; course_code: string; academic_year: string; semester_id: string; grade: string | null }>;
    broadsheet: Array<{ index_no: string; academic_year: string; semester_id: string; cGPA: number | null }>;
  };
  backupPath: string;
  stagingPath: string;
  reportPath: string;
}

const nowStamp = new Date().toISOString().replace(/[:.]/g, '-');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseSqlLiteral(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed.length) return '';
  if (/^null$/i.test(trimmed)) return null;
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function findStatementEnd(content: string, start: number): number {
  let inString = false;
  for (let i = start; i < content.length; i += 1) {
    const char = content[i];
    if (char === "'") {
      if (inString && content[i + 1] === "'") {
        i += 1;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (!inString && char === ';') {
      return i;
    }
  }
  return content.length;
}

function parseValuesBlock(valuesBlock: string): unknown[][] {
  const rows: unknown[][] = [];
  let row: unknown[] = [];
  let token = '';
  let inString = false;
  let inRow = false;

  for (let i = 0; i < valuesBlock.length; i += 1) {
    const char = valuesBlock[i];

    if (char === "'") {
      token += char;
      if (inString && valuesBlock[i + 1] === "'") {
        token += "'";
        i += 1;
      } else {
        inString = !inString;
      }
      continue;
    }

    if (!inString && char === '(') {
      inRow = true;
      row = [];
      token = '';
      continue;
    }

    if (!inString && char === ')') {
      if (inRow) {
        row.push(parseSqlLiteral(token));
        rows.push(row);
      }
      inRow = false;
      token = '';
      continue;
    }

    if (!inString && char === ',' && inRow) {
      row.push(parseSqlLiteral(token));
      token = '';
      continue;
    }

    if (inRow) {
      token += char;
    }
  }

  return rows;
}

function extractSourceRows(sqlContent: string): Record<string, Row[]> {
  const result: Record<string, Row[]> = {};
  const insertRegex = /INSERT INTO `([^`]+)` \(([^)]+)\) VALUES\s*/g;
  let match: RegExpExecArray | null;

  while ((match = insertRegex.exec(sqlContent)) !== null) {
    const table = match[1];
    if (!SOURCE_TABLES.has(table)) {
      continue;
    }

    const columns = match[2].split(',').map(column => column.replace(/`/g, '').trim());
    const valuesStart = insertRegex.lastIndex;
    const statementEnd = findStatementEnd(sqlContent, valuesStart);
    const valuesBlock = sqlContent.slice(valuesStart, statementEnd);
    const tuples = parseValuesBlock(valuesBlock);

    if (!result[table]) {
      result[table] = [];
    }

    for (const tuple of tuples) {
      const row: Row = {};
      columns.forEach((column, index) => {
        row[column] = tuple[index] ?? null;
      });
      result[table].push(row);
    }

    insertRegex.lastIndex = statementEnd + 1;
  }

  return result;
}

function createStagingDb(stagingPath: string, sourceRows: Record<string, Row[]>) {
  if (fs.existsSync(stagingPath)) {
    fs.unlinkSync(stagingPath);
  }

  const db = new Database(stagingPath);
  db.pragma('journal_mode = DELETE');

  for (const [table, rows] of Object.entries(sourceRows)) {
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const createSql = `CREATE TABLE ${table} (${columns.map(column => `"${column}" TEXT`).join(', ')})`;
    db.exec(createSql);
    const insertSql = `INSERT INTO ${table} (${columns.map(column => `"${column}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    const insertStmt = db.prepare(insertSql);

    const insertMany = db.transaction((items: Row[]) => {
      for (const row of items) {
        insertStmt.run(...columns.map(column => row[column] == null ? null : String(row[column])));
      }
    });

    insertMany(rows);
  }

  db.close();
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeDelimitedToken(value: string): string {
  return normalizeSpaces(value).replace(/\s*\/\s*/g, '/').toUpperCase();
}

function normalizeCourseCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeSpaces(value).toUpperCase();
  return normalized || null;
}

function normalizeProgramId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeDelimitedToken(value);
  return normalized || null;
}

function normalizeIid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeDelimitedToken(value);
  return normalized || null;
}

function normalizeNamePart(value: unknown): string {
  if (typeof value !== 'string') return '';
  return normalizeSpaces(value);
}

function combineOtherNames(firstName: unknown, otherName: unknown): string {
  return [normalizeNamePart(firstName), normalizeNamePart(otherName)].filter(Boolean).join(' ').trim();
}

function normalizeGender(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeSpaces(value).toLowerCase();
  if (!normalized || normalized === 'null') return null;
  if (normalized === 'm' || normalized === 'male') return 'Male';
  if (normalized === 'f' || normalized === 'female') return 'Female';
  return 'Other';
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeSpaces(value);
  if (!normalized || normalized.toLowerCase() === 'null') return null;
  return normalized;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  if (!compact.includes('@') || compact.endsWith('@') || compact.startsWith('@')) {
    return null;
  }
  return compact;
}

function normalizeAcademicYear(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = normalizeSpaces(String(value));
  if (!normalized || normalized.toLowerCase() === 'null') return null;
  return normalized.toUpperCase();
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeSpaces(value);
  if (!normalized || normalized === '0000-00-00' || normalized.toLowerCase() === 'null') {
    return null;
  }
  return normalized;
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = normalizeSpaces(value);
  if (!normalized.length || normalized.toLowerCase() === 'null') return null;
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function extractYearStart(code: string): number {
  const match = code.match(/(\d{4})/);
  if (match) return Number(match[1]);
  const plain = code.match(/^\d{4}$/);
  if (plain) return Number(plain[0]);
  return -Infinity;
}

function scoreAcademicYearCode(code: string): number {
  let score = extractYearStart(code) * 100;
  if (code.includes('/')) score += 10;
  const trailingYear = code.match(/(\d{4})\s*$/);
  if (trailingYear) {
    score += Number(trailingYear[1]) % 100;
  }
  return score;
}

function countTable(db: Database.Database, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
}

function getBeforeCounts(db: Database.Database): Record<string, number> {
  const tables = [
    'users',
    'students',
    'programs',
    'courses',
    'lecturers',
    'lecturer_course_assignments',
    'course_registrations',
    'student_assessments',
    'broadsheet_cache',
    'academic_years',
    'semesters',
    'program_curriculum',
    'student_levels',
    'student_logins',
  ];
  return Object.fromEntries(tables.map(table => [table, countTable(db, table)]));
}

async function main() {
  ensureDir(BACKUP_DIR);
  ensureDir(REPORT_DIR);
  ensureDir(STAGING_DIR);

  if (!fs.existsSync(SOURCE_SQL_PATH)) {
    throw new Error(`Legacy SQL file not found: ${SOURCE_SQL_PATH}`);
  }
  if (!fs.existsSync(TARGET_DB_PATH)) {
    throw new Error(`Target database not found: ${TARGET_DB_PATH}`);
  }

  const sourceSql = fs.readFileSync(SOURCE_SQL_PATH, 'utf8');
  const sourceRows = extractSourceRows(sourceSql);
  const sourceCounts = Object.fromEntries(
    Array.from(SOURCE_TABLES).map(table => [table, sourceRows[table]?.length ?? 0]),
  );

  const stagingPath = path.join(STAGING_DIR, `legacy-import-staging-${nowStamp}.db`);
  createStagingDb(stagingPath, sourceRows);

  const targetDb = new Database(TARGET_DB_PATH);
  targetDb.pragma('foreign_keys = ON');
  targetDb.pragma('busy_timeout = 5000');

  const beforeCounts = getBeforeCounts(targetDb);
  const usersBefore = countTable(targetDb, 'users');
  const superadminsBefore = (targetDb.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'SuperAdmin'").get() as { count: number }).count;
  const currentYearBefore = targetDb.prepare('SELECT code FROM academic_years WHERE is_current = 1 LIMIT 1').get() as { code?: string } | undefined;
  const currentSemesterBefore = targetDb.prepare('SELECT sid, name FROM semesters WHERE is_current = 1 LIMIT 1').get() as { sid?: string; name?: string } | undefined;

  const backupPath = path.join(BACKUP_DIR, `sims-pre-legacy-import-${nowStamp}.db`);
  await targetDb.backup(backupPath);

  const importedCounts: Record<string, number> = {};
  const skippedCounts: Record<string, number> = {};
  const skippedReasons: Record<string, number> = {};

  const increment = (bag: Record<string, number>, key: string) => {
    bag[key] = (bag[key] ?? 0) + 1;
  };

  const yearRows = sourceRows.academic_year ?? [];
  const semesterRows = sourceRows.semesters ?? [];
  const programRows = sourceRows.programs ?? [];
  const courseRows = sourceRows.courses ?? [];
  const curriculumRows = sourceRows.programs_populate_cache ?? [];
  const lecturerRows = sourceRows.lecturers ?? [];
  const assignmentRows = sourceRows.courses_assign ?? [];
  const studentRows = sourceRows.students_biodata ?? [];
  const registrationRows = sourceRows.students_course_registered ?? [];
  const assessmentRows = sourceRows.students_assessments ?? [];
  const broadsheetRows = sourceRows.boardsheet_cache ?? [];

  const allAcademicYearCodes = new Map<string, { date_from: string | null; date_to: string | null }>();
  for (const row of yearRows) {
    const code = normalizeAcademicYear(row.academic_year);
    if (!code) continue;
    allAcademicYearCodes.set(code, {
      date_from: normalizeDate(row.from),
      date_to: normalizeDate(row.to),
    });
  }

  const collectAcademicYear = (value: unknown) => {
    const code = normalizeAcademicYear(value);
    if (code && !allAcademicYearCodes.has(code)) {
      allAcademicYearCodes.set(code, { date_from: null, date_to: null });
    }
  };

  studentRows.forEach(row => collectAcademicYear(row.yearOfAdmission));
  registrationRows.forEach(row => collectAcademicYear(row.academic_year));
  assessmentRows.forEach(row => collectAcademicYear(row.academic_year));
  broadsheetRows.forEach(row => collectAcademicYear(row.academic_year));

  const semesters = (semesterRows.map(row => ({
    sid: normalizeNullableText(row.sid),
    name: normalizeNullableText(row.semester),
  })).filter(row => row.sid && row.name) as Array<{ sid: string; name: string }>);

  const semesterSort = (name: string) => {
    const lowered = name.toLowerCase();
    if (lowered.includes('first')) return 1;
    if (lowered.includes('second')) return 2;
    return 99;
  };

  const programMap = new Map<string, { pid: string; progid: string; name: string; duration: number | null; required_ch: number | null }>();
  for (const row of programRows) {
    const progid = normalizeProgramId(row.progid);
    const pid = normalizeNullableText(row.pid) || progid;
    const name = normalizeNullableText(row.name);
    if (!progid || !name) {
      increment(skippedCounts, 'programs');
      increment(skippedReasons, 'program_missing_key_fields');
      continue;
    }
    if (programMap.has(progid)) {
      increment(skippedCounts, 'programs');
      increment(skippedReasons, 'program_duplicate_progid');
      continue;
    }
    programMap.set(progid, {
      pid,
      progid,
      name,
      duration: parseNumeric(row.duration),
      required_ch: parseNumeric(row.CH),
    });
  }

  const courseMap = new Map<string, { code: string; name: string; credit_hours: number }>();
  for (const row of courseRows) {
    const code = normalizeCourseCode(row.code);
    const name = normalizeNullableText(row.name);
    const creditHours = parseNumeric(row.creditHours) ?? 0;
    if (!code || !name) {
      increment(skippedCounts, 'courses');
      increment(skippedReasons, 'course_missing_key_fields');
      continue;
    }
    if (courseMap.has(code)) {
      increment(skippedCounts, 'courses');
      increment(skippedReasons, 'course_duplicate_code');
      continue;
    }
    courseMap.set(code, {
      code,
      name,
      credit_hours: creditHours,
    });
  }

  const uniqueStudentEmailOwners = new Set<string>();
  const uniqueLecturerEmailOwners = new Set<string>();
  const studentMap = new Map<string, {
    iid: string;
    index_number: string;
    surname: string;
    other_names: string;
    gender: string | null;
    dob: string | null;
    email: string | null;
    phone: string | null;
    progid: string;
    admission_year: string | null;
    current_level: number;
    photo: string | null;
  }>();

  const studentLevelHints = new Map<string, number>();

  for (const row of studentRows) {
    const iid = normalizeIid(row.iid);
    const progid = normalizeProgramId(row.programme);
    const surname = normalizeNamePart(row.lname);
    const otherNames = combineOtherNames(row.fname, row.oname);
    const levelOfAdmission = parseNumeric(row.levelOfAdmission) ?? 100;

    if (!iid) {
      increment(skippedCounts, 'students');
      increment(skippedReasons, 'student_invalid_iid');
      continue;
    }
    if (!progid || !programMap.has(progid)) {
      increment(skippedCounts, 'students');
      increment(skippedReasons, 'student_unknown_program');
      continue;
    }
    if (!surname || !otherNames) {
      increment(skippedCounts, 'students');
      increment(skippedReasons, 'student_missing_name');
      continue;
    }
    if (studentMap.has(iid)) {
      increment(skippedCounts, 'students');
      increment(skippedReasons, 'student_duplicate_iid');
      continue;
    }

    let email = normalizeEmail(row.email);
    if (email && uniqueStudentEmailOwners.has(email)) {
      email = null;
      increment(skippedReasons, 'student_duplicate_email_nullified');
    }
    if (email) uniqueStudentEmailOwners.add(email);

    studentLevelHints.set(iid, levelOfAdmission);
    studentMap.set(iid, {
      iid,
      index_number: iid,
      surname,
      other_names: otherNames,
      gender: normalizeGender(row.gender),
      dob: normalizeNullableText(row.dob),
      email,
      phone: normalizeNullableText(row.tel),
      progid,
      admission_year: normalizeAcademicYear(row.yearOfAdmission),
      current_level: levelOfAdmission || 100,
      photo: normalizeNullableText(row.photo),
    });
  }

  const lecturerMap = new Map<string, {
    lid: string;
    title: string | null;
    name: string;
    email: string | null;
    tel: string | null;
  }>();

  for (const row of lecturerRows) {
    const lid = normalizeNullableText(row.lid);
    const name = normalizeNullableText(row.name);
    if (!lid || !name) {
      increment(skippedCounts, 'lecturers');
      increment(skippedReasons, 'lecturer_missing_key_fields');
      continue;
    }
    if (lecturerMap.has(lid)) {
      increment(skippedCounts, 'lecturers');
      increment(skippedReasons, 'lecturer_duplicate_lid');
      continue;
    }
    let email = normalizeEmail(row.email);
    if (email && uniqueLecturerEmailOwners.has(email)) {
      email = null;
      increment(skippedReasons, 'lecturer_duplicate_email_nullified');
    }
    if (email) uniqueLecturerEmailOwners.add(email);

    lecturerMap.set(lid, {
      lid,
      title: normalizeNullableText(row.title),
      name,
      email,
      tel: normalizeNullableText(row.tel),
    });
  }

  const registrationRecords: Array<{
    index_no: string;
    course_code: string;
    academic_year: string;
    semester_sid: string;
    level: number;
  }> = [];
  const registrationSeen = new Set<string>();

  for (const row of registrationRows) {
    const iid = normalizeIid(row.iid);
    const courseCode = normalizeCourseCode(row.code);
    const academicYear = normalizeAcademicYear(row.academic_year);
    const semesterSid = normalizeNullableText(row.semester);
    const level = parseNumeric(row.level) ?? 100;
    if (!iid || !studentMap.has(iid)) {
      increment(skippedCounts, 'course_registrations');
      increment(skippedReasons, 'registration_unknown_student');
      continue;
    }
    if (!courseCode || !courseMap.has(courseCode)) {
      increment(skippedCounts, 'course_registrations');
      increment(skippedReasons, 'registration_unknown_course');
      continue;
    }
    if (!academicYear || !allAcademicYearCodes.has(academicYear)) {
      increment(skippedCounts, 'course_registrations');
      increment(skippedReasons, 'registration_unknown_academic_year');
      continue;
    }
    if (!semesterSid || !semesters.some(semester => semester.sid === semesterSid)) {
      increment(skippedCounts, 'course_registrations');
      increment(skippedReasons, 'registration_unknown_semester');
      continue;
    }
    const key = `${iid}|${courseCode}|${academicYear}|${semesterSid}`;
    if (registrationSeen.has(key)) {
      increment(skippedCounts, 'course_registrations');
      increment(skippedReasons, 'registration_duplicate');
      continue;
    }
    registrationSeen.add(key);
    registrationRecords.push({
      index_no: iid,
      course_code: courseCode,
      academic_year: academicYear,
      semester_sid: semesterSid,
      level,
    });
  }

  const assessmentRecords: Array<{
    index_no: string;
    academic_year: string;
    level: string;
    semester_id: string;
    course_code: string;
    a1: number;
    a2: number;
    a3: number;
    a4: number;
    total_ca: number;
    exam_score: number;
    total_score: number;
    grade: string | null;
    grade_point: number | null;
    weighted_gp: number | null;
  }> = [];
  const assessmentSeen = new Set<string>();

  for (const row of assessmentRows) {
    const iid = normalizeIid(row.iid);
    const academicYear = normalizeAcademicYear(row.academic_year);
    const semesterId = normalizeNullableText(row.semester);
    const courseCode = normalizeCourseCode(row.code);
    const level = String(parseNumeric(row.level) ?? 100);
    if (!iid || !studentMap.has(iid)) {
      increment(skippedCounts, 'student_assessments');
      increment(skippedReasons, 'assessment_unknown_student');
      continue;
    }
    if (!courseCode || !courseMap.has(courseCode)) {
      increment(skippedCounts, 'student_assessments');
      increment(skippedReasons, 'assessment_unknown_course');
      continue;
    }
    if (!academicYear || !allAcademicYearCodes.has(academicYear)) {
      increment(skippedCounts, 'student_assessments');
      increment(skippedReasons, 'assessment_unknown_academic_year');
      continue;
    }
    if (!semesterId || !semesters.some(semester => semester.sid === semesterId)) {
      increment(skippedCounts, 'student_assessments');
      increment(skippedReasons, 'assessment_unknown_semester');
      continue;
    }
    const key = `${iid}|${courseCode}|${academicYear}|${semesterId}`;
    if (assessmentSeen.has(key)) {
      increment(skippedCounts, 'student_assessments');
      increment(skippedReasons, 'assessment_duplicate');
      continue;
    }
    assessmentSeen.add(key);

    const a1 = parseNumeric(row.A1) ?? 0;
    const a2 = parseNumeric(row.A2) ?? 0;
    const a3 = parseNumeric(row.A3) ?? 0;
    const a4 = parseNumeric(row.A4) ?? 0;
    const totalCa = parseNumeric(row.AT) ?? (a1 + a2 + a3 + a4);
    const examScore = parseNumeric(row.Ex) ?? 0;
    const totalScore = parseNumeric(row.T) ?? (totalCa + examScore);
    const gradePoint = parseNumeric(row.GP);
    const creditHours = courseMap.get(courseCode)?.credit_hours ?? 0;

    assessmentRecords.push({
      index_no: iid,
      academic_year: academicYear,
      level,
      semester_id: semesterId,
      course_code: courseCode,
      a1,
      a2,
      a3,
      a4,
      total_ca: totalCa,
      exam_score: examScore,
      total_score: totalScore,
      grade: normalizeNullableText(row.G),
      grade_point: gradePoint,
      weighted_gp: gradePoint == null ? null : gradePoint * creditHours,
    });
  }

  const curriculumRecords: Array<{
    progid: string;
    course_code: string;
    level: number;
    semester_sid: string;
  }> = [];
  const curriculumSeen = new Set<string>();
  for (const row of curriculumRows) {
    const progid = normalizeProgramId(row.progid);
    const courseCode = normalizeCourseCode(row.courseCode);
    const level = parseNumeric(row.year) ?? 0;
    const semesterSid = normalizeNullableText(row.semester);
    if (!progid || !programMap.has(progid)) {
      increment(skippedCounts, 'program_curriculum');
      increment(skippedReasons, 'curriculum_unknown_program');
      continue;
    }
    if (!courseCode || !courseMap.has(courseCode)) {
      increment(skippedCounts, 'program_curriculum');
      increment(skippedReasons, 'curriculum_unknown_course');
      continue;
    }
    if (!semesterSid || !semesters.some(semester => semester.sid === semesterSid)) {
      increment(skippedCounts, 'program_curriculum');
      increment(skippedReasons, 'curriculum_unknown_semester');
      continue;
    }
    const key = `${progid}|${courseCode}|${level}|${semesterSid}`;
    if (curriculumSeen.has(key)) {
      increment(skippedCounts, 'program_curriculum');
      increment(skippedReasons, 'curriculum_duplicate');
      continue;
    }
    curriculumSeen.add(key);
    curriculumRecords.push({
      progid,
      course_code: courseCode,
      level,
      semester_sid: semesterSid,
    });
  }

  const broadsheetRecords: Array<{
    index_no: string;
    academic_year: string;
    level: string;
    semester_id: string;
    progid: string;
    sCH: number | null;
    sGP: number | null;
    sGPA: number | null;
    cCH: number | null;
    cGP: number | null;
    cGPA: number | null;
    class: string | null;
  }> = [];
  const broadsheetSeen = new Set<string>();
  for (const row of broadsheetRows) {
    const iid = normalizeIid(row.iid);
    const academicYear = normalizeAcademicYear(row.academic_year);
    const semesterId = normalizeNullableText(row.semester);
    const progid = normalizeProgramId(row.progid);
    const level = String(parseNumeric(row.level) ?? 100);
    if (!iid || !studentMap.has(iid)) {
      increment(skippedCounts, 'broadsheet_cache');
      increment(skippedReasons, 'broadsheet_unknown_student');
      continue;
    }
    if (!academicYear || !allAcademicYearCodes.has(academicYear)) {
      increment(skippedCounts, 'broadsheet_cache');
      increment(skippedReasons, 'broadsheet_unknown_academic_year');
      continue;
    }
    if (!semesterId || !semesters.some(semester => semester.sid === semesterId)) {
      increment(skippedCounts, 'broadsheet_cache');
      increment(skippedReasons, 'broadsheet_unknown_semester');
      continue;
    }
    if (!progid || !programMap.has(progid)) {
      increment(skippedCounts, 'broadsheet_cache');
      increment(skippedReasons, 'broadsheet_unknown_program');
      continue;
    }
    const key = `${iid}|${academicYear}|${semesterId}`;
    if (broadsheetSeen.has(key)) {
      increment(skippedCounts, 'broadsheet_cache');
      increment(skippedReasons, 'broadsheet_duplicate');
      continue;
    }
    broadsheetSeen.add(key);
    broadsheetRecords.push({
      index_no: iid,
      academic_year: academicYear,
      level,
      semester_id: semesterId,
      progid,
      sCH: parseNumeric(row.sCH),
      sGP: parseNumeric(row.sGP),
      sGPA: parseNumeric(row.sGPA),
      cCH: parseNumeric(row.cCH),
      cGP: parseNumeric(row.cGP),
      cGPA: parseNumeric(row.cGPA),
      class: normalizeNullableText(row.class),
    });
  }

  const studentLevelRecords = new Map<string, {
    iid: string;
    academic_year: string;
    semester_sid: string;
    level: number;
    is_current: number;
  }>();

  const upsertStudentLevel = (iid: string, academicYear: string, semesterSid: string, level: number) => {
    const key = `${iid}|${academicYear}|${semesterSid}`;
    const existing = studentLevelRecords.get(key);
    if (!existing || level > existing.level) {
      studentLevelRecords.set(key, {
        iid,
        academic_year: academicYear,
        semester_sid: semesterSid,
        level,
        is_current: 0,
      });
    }
  };

  registrationRecords.forEach(record => upsertStudentLevel(record.index_no, record.academic_year, record.semester_sid, record.level));
  assessmentRecords.forEach(record => upsertStudentLevel(record.index_no, record.academic_year, record.semester_id, parseNumeric(record.level) ?? 100));

  const defaultSemesterSid = semesters.sort((a, b) => semesterSort(a.name) - semesterSort(b.name))[0]?.sid ?? null;
  for (const student of studentMap.values()) {
    if (!studentLevelRecords.has(`${student.iid}|${student.admission_year ?? ''}|${defaultSemesterSid ?? ''}`) && student.admission_year && defaultSemesterSid) {
      upsertStudentLevel(student.iid, student.admission_year, defaultSemesterSid, student.current_level);
    }
  }

  const studentLevelByStudent = new Map<string, Array<{ key: string; academicYear: string; semesterSid: string }>>();
  for (const [key, record] of studentLevelRecords.entries()) {
    if (!studentLevelByStudent.has(record.iid)) {
      studentLevelByStudent.set(record.iid, []);
    }
    studentLevelByStudent.get(record.iid)!.push({
      key,
      academicYear: record.academic_year,
      semesterSid: record.semester_sid,
    });
  }
  for (const records of studentLevelByStudent.values()) {
    records.sort((a, b) => {
      const yearDiff = extractYearStart(a.academicYear) - extractYearStart(b.academicYear);
      if (yearDiff !== 0) return yearDiff;
      const aOrder = semesterSort(semesters.find(semester => semester.sid === a.semesterSid)?.name ?? a.semesterSid);
      const bOrder = semesterSort(semesters.find(semester => semester.sid === b.semesterSid)?.name ?? b.semesterSid);
      return aOrder - bOrder;
    });
    const current = records[records.length - 1];
    if (current) {
      const item = studentLevelRecords.get(current.key);
      if (item) item.is_current = 1;
    }
  }

  for (const student of studentMap.values()) {
    const currentLevel = Array.from(studentLevelRecords.values())
      .filter(level => level.iid === student.iid && level.is_current === 1)
      .map(level => level.level)[0];
    if (currentLevel) {
      student.current_level = currentLevel;
    } else {
      student.current_level = studentLevelHints.get(student.iid) ?? student.current_level;
    }
  }

  const assignmentPeriodsByCourse = new Map<string, Set<string>>();
  const pushAssignmentPeriod = (courseCode: string, academicYear: string, semesterSid: string) => {
    if (!assignmentPeriodsByCourse.has(courseCode)) {
      assignmentPeriodsByCourse.set(courseCode, new Set());
    }
    assignmentPeriodsByCourse.get(courseCode)!.add(`${academicYear}|${semesterSid}`);
  };

  registrationRecords.forEach(record => pushAssignmentPeriod(record.course_code, record.academic_year, record.semester_sid));
  assessmentRecords.forEach(record => pushAssignmentPeriod(record.course_code, record.academic_year, record.semester_id));

  const lecturerAssignments: Array<{
    lid: string;
    course_code: string;
    academic_year: string;
    semester_sid: string;
  }> = [];
  const lecturerAssignmentSeen = new Set<string>();
  for (const row of assignmentRows) {
    const lid = normalizeNullableText(row.lid);
    const courseCode = normalizeCourseCode(row.code);
    if (!lid || !lecturerMap.has(lid)) {
      increment(skippedCounts, 'lecturer_course_assignments');
      increment(skippedReasons, 'assignment_unknown_lecturer');
      continue;
    }
    if (!courseCode || !courseMap.has(courseCode)) {
      increment(skippedCounts, 'lecturer_course_assignments');
      increment(skippedReasons, 'assignment_unknown_course');
      continue;
    }

    const periods = assignmentPeriodsByCourse.get(courseCode);
    if (!periods || periods.size === 0) {
      increment(skippedCounts, 'lecturer_course_assignments');
      increment(skippedReasons, 'assignment_no_period_context');
      continue;
    }

    for (const period of periods) {
      const [academicYear, semesterSid] = period.split('|');
      const key = `${lid}|${courseCode}|${academicYear}|${semesterSid}`;
      if (lecturerAssignmentSeen.has(key)) continue;
      lecturerAssignmentSeen.add(key);
      lecturerAssignments.push({
        lid,
        course_code: courseCode,
        academic_year: academicYear,
        semester_sid: semesterSid,
      });
    }
  }

  const allYearRecords = Array.from(allAcademicYearCodes.entries()).map(([code, meta]) => ({
    code,
    date_from: meta.date_from,
    date_to: meta.date_to,
  }));
  allYearRecords.sort((a, b) => scoreAcademicYearCode(a.code) - scoreAcademicYearCode(b.code));
  const activityYearSet = new Set<string>([
    ...registrationRecords.map(record => record.academic_year),
    ...assessmentRecords.map(record => record.academic_year),
    ...broadsheetRecords.map(record => record.academic_year),
  ]);
  const activeAcademicYears = [...allYearRecords]
        .filter(year => activityYearSet.has(year.code))
        .sort((a, b) => scoreAcademicYearCode(a.code) - scoreAcademicYearCode(b.code))
        .map(year => year.code);
  const preferredPreservedYear = currentYearBefore?.code && activeAcademicYears.includes(currentYearBefore.code)
    ? currentYearBefore.code
    : null;
  const currentAcademicYear = preferredPreservedYear
    ?? activeAcademicYears.slice(-1)[0]
    ?? allYearRecords[allYearRecords.length - 1]?.code
    ?? null;

  const currentSemesterSid = (() => {
    if (currentSemesterBefore?.sid && semesters.some(semester => semester.sid === currentSemesterBefore.sid)) {
      return currentSemesterBefore.sid;
    }
    if (currentAcademicYear) {
      const periodsForCurrentYear = new Set(
        registrationRecords
          .filter(record => record.academic_year === currentAcademicYear)
          .map(record => record.semester_sid)
          .concat(assessmentRecords.filter(record => record.academic_year === currentAcademicYear).map(record => record.semester_id)),
      );
      if (periodsForCurrentYear.size > 0) {
        return Array.from(periodsForCurrentYear).sort((a, b) => {
          const aOrder = semesterSort(semesters.find(semester => semester.sid === a)?.name ?? a);
          const bOrder = semesterSort(semesters.find(semester => semester.sid === b)?.name ?? b);
          return aOrder - bOrder;
        }).slice(-1)[0];
      }
    }
    return semesters.sort((a, b) => semesterSort(a.name) - semesterSort(b.name))[0]?.sid ?? null;
  })();

  const deleteStatements = [
    'DELETE FROM notifications',
    'DELETE FROM assessment_requests',
    'DELETE FROM assessment_windows',
    'DELETE FROM registration_windows',
    'DELETE FROM calendar_events',
    'DELETE FROM broadsheet_cache',
    'DELETE FROM lecturer_assessments',
    'DELETE FROM student_assessments',
    'DELETE FROM course_registrations',
    'DELETE FROM lecturer_course_assignments',
    'DELETE FROM program_curriculum',
    'DELETE FROM student_levels',
    'DELETE FROM student_logins',
    'DELETE FROM students',
    'DELETE FROM lecturers',
    'DELETE FROM courses',
    'DELETE FROM programs',
    'DELETE FROM academic_years',
    'DELETE FROM semesters',
  ];

  const insertAcademicYear = targetDb.prepare(`
    INSERT INTO academic_years (code, date_from, date_to, is_current, created_by)
    VALUES (?, ?, ?, ?, NULL)
  `);
  const insertSemester = targetDb.prepare(`
    INSERT INTO semesters (sid, name, sort_order, is_current, created_by)
    VALUES (?, ?, ?, ?, NULL)
  `);
  const insertProgram = targetDb.prepare(`
    INSERT INTO programs (pid, progid, name, department, duration, required_ch, created_by)
    VALUES (?, ?, ?, NULL, ?, ?, NULL)
  `);
  const insertCourse = targetDb.prepare(`
    INSERT INTO courses (code, name, credit_hours, department, created_by)
    VALUES (?, ?, ?, NULL, NULL)
  `);
  const insertLecturer = targetDb.prepare(`
    INSERT INTO lecturers (lid, title, name, email, tel, department, designation, user_uid, created_by)
    VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
  `);
  const insertStudent = targetDb.prepare(`
    INSERT INTO students (iid, index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level, status, photo, user_uid, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, NULL)
  `);
  const insertCurriculum = targetDb.prepare(`
    INSERT INTO program_curriculum (progid, course_code, level, semester_sid, is_elective, created_by)
    VALUES (?, ?, ?, ?, 0, NULL)
  `);
  const insertAssignment = targetDb.prepare(`
    INSERT INTO lecturer_course_assignments (lid, course_code, academic_year, semester_sid, assigned_by)
    VALUES (?, ?, ?, ?, NULL)
  `);
  const insertRegistration = targetDb.prepare(`
    INSERT INTO course_registrations (index_no, course_code, academic_year, semester_sid, status)
    VALUES (?, ?, ?, ?, 'approved')
  `);
  const insertAssessment = targetDb.prepare(`
    INSERT INTO student_assessments (
      index_no, academic_year, level, semester_id, course_code,
      a1, a2, a3, a4, total_ca, exam_score, total_score,
      grade, grade_point, weighted_gp, entered_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `);
  const insertBroadsheet = targetDb.prepare(`
    INSERT INTO broadsheet_cache (
      index_no, academic_year, level, semester_id, progid,
      sCH, sGP, sGPA, cCH, cGP, cGPA, class
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStudentLevel = targetDb.prepare(`
    INSERT INTO student_levels (iid, level, academic_year, semester_sid, is_current, updated_by)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);

  const importTransaction = targetDb.transaction(() => {
    for (const statement of deleteStatements) {
      targetDb.prepare(statement).run();
    }

    for (const year of allYearRecords) {
      insertAcademicYear.run(year.code, year.date_from, year.date_to, year.code === currentAcademicYear ? 1 : 0);
      increment(importedCounts, 'academic_years');
    }

    const orderedSemesters = [...semesters].sort((a, b) => semesterSort(a.name) - semesterSort(b.name));
    orderedSemesters.forEach((semester, index) => {
      insertSemester.run(semester.sid, semester.name, index + 1, semester.sid === currentSemesterSid ? 1 : 0);
      increment(importedCounts, 'semesters');
    });

    for (const program of programMap.values()) {
      insertProgram.run(program.pid, program.progid, program.name, program.duration, program.required_ch);
      increment(importedCounts, 'programs');
    }

    for (const course of courseMap.values()) {
      insertCourse.run(course.code, course.name, course.credit_hours);
      increment(importedCounts, 'courses');
    }

    for (const lecturer of lecturerMap.values()) {
      insertLecturer.run(lecturer.lid, lecturer.title, lecturer.name, lecturer.email, lecturer.tel);
      increment(importedCounts, 'lecturers');
    }

    for (const student of studentMap.values()) {
      insertStudent.run(
        student.iid,
        student.index_number,
        student.surname,
        student.other_names,
        student.gender,
        student.dob,
        student.email,
        student.phone,
        student.progid,
        student.admission_year,
        student.current_level,
        student.photo,
      );
      increment(importedCounts, 'students');
    }

    for (const curriculum of curriculumRecords) {
      insertCurriculum.run(curriculum.progid, curriculum.course_code, curriculum.level, curriculum.semester_sid);
      increment(importedCounts, 'program_curriculum');
    }

    for (const assignment of lecturerAssignments) {
      insertAssignment.run(assignment.lid, assignment.course_code, assignment.academic_year, assignment.semester_sid);
      increment(importedCounts, 'lecturer_course_assignments');
    }

    for (const registration of registrationRecords) {
      insertRegistration.run(registration.index_no, registration.course_code, registration.academic_year, registration.semester_sid);
      increment(importedCounts, 'course_registrations');
    }

    for (const assessment of assessmentRecords) {
      insertAssessment.run(
        assessment.index_no,
        assessment.academic_year,
        assessment.level,
        assessment.semester_id,
        assessment.course_code,
        assessment.a1,
        assessment.a2,
        assessment.a3,
        assessment.a4,
        assessment.total_ca,
        assessment.exam_score,
        assessment.total_score,
        assessment.grade,
        assessment.grade_point,
        assessment.weighted_gp,
      );
      increment(importedCounts, 'student_assessments');
    }

    for (const cache of broadsheetRecords) {
      insertBroadsheet.run(
        cache.index_no,
        cache.academic_year,
        cache.level,
        cache.semester_id,
        cache.progid,
        cache.sCH,
        cache.sGP,
        cache.sGPA,
        cache.cCH,
        cache.cGP,
        cache.cGPA,
        cache.class,
      );
      increment(importedCounts, 'broadsheet_cache');
    }

    for (const level of studentLevelRecords.values()) {
      insertStudentLevel.run(level.iid, level.level, level.academic_year, level.semester_sid, level.is_current);
      increment(importedCounts, 'student_levels');
    }
  });

  importTransaction();

  targetDb.pragma('foreign_key_check');

  const afterCounts = getBeforeCounts(targetDb);
  const usersAfter = countTable(targetDb, 'users');
  const superadminsAfter = (targetDb.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'SuperAdmin'").get() as { count: number }).count;

  const samples = {
    students: targetDb.prepare(`
      SELECT iid, full_name, progid, admission_year
      FROM view_student_details
      ORDER BY iid
      LIMIT 5
    `).all() as Array<{ iid: string; full_name: string; progid: string | null; admission_year: string | null }>,
    assessments: targetDb.prepare(`
      SELECT index_no, course_code, academic_year, semester_id, grade
      FROM student_assessments
      ORDER BY academic_year DESC, semester_id DESC, index_no
      LIMIT 5
    `).all() as Array<{ index_no: string; course_code: string; academic_year: string; semester_id: string; grade: string | null }>,
    broadsheet: targetDb.prepare(`
      SELECT index_no, academic_year, semester_id, cGPA
      FROM broadsheet_cache
      ORDER BY academic_year DESC, semester_id DESC, index_no
      LIMIT 5
    `).all() as Array<{ index_no: string; academic_year: string; semester_id: string; cGPA: number | null }>,
  };

  const reportPath = path.join(REPORT_DIR, `legacy-import-report-${nowStamp}.json`);
  const report: ImportReport = {
    sourceCounts,
    beforeCounts,
    afterCounts,
    importedCounts,
    skippedCounts,
    skippedReasons,
    preservedUsers: {
      before: usersBefore,
      after: usersAfter,
      superadminsBefore,
      superadminsAfter,
    },
    samples,
    backupPath,
    stagingPath,
    reportPath,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  targetDb.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
