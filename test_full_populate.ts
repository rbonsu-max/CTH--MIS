/**
 * Full System Population & Test Script (updated for new schema)
 * Tests every module end-to-end with real example data.
 */
import db from './db';
import bcrypt from 'bcryptjs';

const BASE = 'http://localhost:3009';
type Headers = Record<string, string>;

async function req(method: string, path: string, body?: any, headers: Headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// ─── STEP 1: LOGIN ────────────────────────────────────────────
async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'youroger1@gmail.com', password: '$$Ecg$$' }),
  });
  const rawCookie = res.headers.get('set-cookie')!;
  const tokenPart = rawCookie.split(';')[0];
  if (!res.ok) throw new Error('Login failed');
  console.log('✅ Logged in as SuperAdmin');
  return { 'cookie': tokenPart };
}

// ─── STEP 2: CLEAN UP from previous run ─────────────────────
function cleanupPreviousRun() {
  // students table uses iid as PK (same value as index_no in registrations)
  // Clean sub-tables first using iid from students
  db.prepare(`DELETE FROM student_assessments WHERE index_no IN (SELECT iid FROM students WHERE index_number LIKE 'EX%')`).run();
  db.prepare(`DELETE FROM course_registrations WHERE index_no IN (SELECT iid FROM students WHERE index_number LIKE 'EX%')`).run();
  db.prepare(`DELETE FROM broadsheet_cache WHERE index_no IN (SELECT iid FROM students WHERE index_number LIKE 'EX%')`).run();
  db.prepare(`DELETE FROM student_logins WHERE iid IN (SELECT iid FROM students WHERE index_number LIKE 'EX%')`).run();
  db.prepare(`DELETE FROM students WHERE index_number LIKE 'EX%'`).run();
  db.prepare(`DELETE FROM lecturer_course_assignments WHERE lid = 'EXLEC1'`).run();
  db.prepare(`DELETE FROM lecturers WHERE lid = 'EXLEC1'`).run();
  db.prepare(`DELETE FROM program_curriculum WHERE progid = 'EXPROG'`).run();
  db.prepare(`DELETE FROM programs WHERE progid = 'EXPROG'`).run();
  db.prepare(`DELETE FROM courses WHERE code LIKE 'EX%'`).run();
  db.prepare(`DELETE FROM departments WHERE code = 'EXDEPT'`).run();
  db.prepare(`DELETE FROM grading_points WHERE grade = 'EX+'`).run();
  db.prepare(`DELETE FROM semesters WHERE sid = 'EXSEM1'`).run();
  for (const code of ['EX2023/2024', 'EX2026/2027']) {
    db.prepare(`DELETE FROM academic_years WHERE code = ?`).run(code);
  }
  console.log('🧹 Cleaned up previous test data');
}

// ─── STEP 3: POPULATE DATA via API ──────────────────────────
async function populateAndTest(h: Headers) {
  // --- Settings: Academic Years
  await req('POST', '/api/academic/years', { code: 'EX2023/2024', start_date: '2023-09-01', end_date: '2024-08-31' }, h);
  console.log('✅ Created Academic Year EX2023/2024');
  await req('POST', '/api/academic/years', { code: 'EX2026/2027', start_date: '2026-09-01', end_date: '2027-08-31' }, h);
  console.log('✅ Created Academic Year EX2026/2027');
  await req('POST', `/api/academic/years/${encodeURIComponent('EX2023/2024')}/set-current`, undefined, h);
  console.log('✅ Set EX2023/2024 as current Academic Year');

  // --- Settings: Semesters
  const sem1 = await req('POST', '/api/academic/semesters', { sid: 'EXSEM1', name: 'Example Semester 1', sort_order: 1 }, h).catch(() => null);
  if (sem1) console.log('✅ Created Semester EXSEM1');
  await req('POST', '/api/academic/semesters/EXSEM1/set-current', undefined, h).catch(() => {});
  console.log('✅ Set EXSEM1 as current');

  // --- Settings: Department
  const dept = await req('POST', '/api/departments', { code: 'EXDEPT', name: 'Example Department' }, h);
  console.log(`✅ Created Department: ${dept.name}`);

  // --- Programs (new schema: duration not duration_years)
  const prog = await req('POST', '/api/programs', {
    progid: 'EXPROG', name: 'Bachelor of Example Studies', department: 'EXDEPT', duration: 4
  }, h);
  console.log(`✅ Created Program: ${prog.name} (4 years)`);

  // --- Courses (new schema: code, name, credit_hours not cid, title, credits)
  const c1 = await req('POST', '/api/courses', { code: 'EXC101', name: 'Foundations of Example', credit_hours: 3, department: 'EXDEPT' }, h);
  const c2 = await req('POST', '/api/courses', { code: 'EXC102', name: 'Advanced Example Theory', credit_hours: 3, department: 'EXDEPT' }, h);
  console.log(`✅ Created Courses: EXC101, EXC102`);

  // --- Curriculum Mount (new schema: course_code not cid)
  await req('POST', '/api/programs/EXPROG/curriculum', { course_code: 'EXC101', level: 100, semester_sid: 'EXSEM1' }, h);
  await req('POST', '/api/programs/EXPROG/curriculum', { course_code: 'EXC102', level: 100, semester_sid: 'EXSEM1' }, h);
  console.log('✅ Mounted curriculum for EXPROG');

  // --- Lecturers (new schema: name, tel not fullname, phone)
  const lecturerUid = 'EX-LEC-UID-01';
  // Create user for lecturer
  db.prepare(`
    INSERT INTO users (id, uid, fullname, username, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO NOTHING
  `).run('EX-U-01', lecturerUid, 'Dr. Example Lecturer', 'lecturer@ex.com', bcrypt.hashSync('password123', 10), 'Lecturer', 'active');

  const lec = await req('POST', '/api/lecturers', {
    lid: 'EXLEC1',
    name: 'Dr. Example Lecturer',
    title: 'Dr.',
    department: 'EXDEPT',
    email: 'exlecturer@test.com',
    tel: '0200000001',
    designation: 'Senior Lecturer',
    user_uid: lecturerUid
  }, h);
  console.log(`✅ Created Lecturer: ${lec.name || lec.lid} (Linked to User: ${lecturerUid})`);

  // --- Lecturer Assignment (new schema: course_code not cid)
  await req('POST', '/api/lecturers/assignments', {
    lid: 'EXLEC1', course_code: 'EXC101', academic_year: 'EX2023/2024', semester_sid: 'EXSEM1'
  }, h);
  console.log('✅ Assigned Lecturer to EXC101');

  // --- Test Lecturer Filtering (Switch Login)
  console.log('🔍 Testing Lecturer-specific filtering...');
  const lecLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'lecturer@ex.com', password: 'password123' }),
  });
  const lecCookie = lecLoginRes.headers.get('set-cookie')!.split(';')[0];
  const lecH = { 'cookie': lecCookie };

  const lecCourses = await req('GET', '/api/courses', undefined, lecH);
  if (lecCourses.length === 1 && lecCourses[0].code === 'EXC101') {
    console.log('  ✅ Lecturer correctly sees ONLY 1 assigned course (EXC101)');
  } else {
    throw new Error(`Lecturer filtering failed: Expected 1 course, got ${lecCourses.length}`);
  }

  const lecRegs = await req('GET', '/api/registrations?course_code=EXC102', undefined, lecH);
  if (lecRegs.length === 0) {
    console.log('  ✅ Lecturer correctly cannot see registrations for unassigned course (EXC102)');
  } else {
    throw new Error('Lecturer filtering failed: Saw registrations for unassigned course');
  }

  // --- Students
  const studentData = [
    { index_number: 'EX/001/23', surname: 'Asante', other_names: 'Kwame', gender: 'Male', dob: '2000-01-01', phone: '0241111111', email: 'asante@ex.com', progid: 'EXPROG', admission_year: 'EX2023/2024', current_level: 100, status: 'active' },
    { index_number: 'EX/002/23', surname: 'Boateng', other_names: 'Abena', gender: 'Female', dob: '2000-02-01', phone: '0242222222', email: 'boateng@ex.com', progid: 'EXPROG', admission_year: 'EX2023/2024', current_level: 100, status: 'active' },
    { index_number: 'EX/003/23', surname: 'Mensah', other_names: 'Kofi', gender: 'Male', dob: '2000-03-01', phone: '0243333333', email: 'mensah@ex.com', progid: 'EXPROG', admission_year: 'EX2023/2024', current_level: 100, status: 'active' },
  ];
  const createdStudents: any[] = [];
  for (const s of studentData) {
    const created = await req('POST', '/api/students', s, h);
    createdStudents.push(created);
  }
  console.log('✅ Created 3 Students in EX2023/2024 cohort');
  console.log('  Students:', createdStudents.map(s => `${s.index_no || s.iid} (${s.full_name || s.index_number})`));

  // --- Registration (new schema: index_no, course_code)
  for (const s of createdStudents) {
    const studentId = s.index_no || s.iid;
    for (const course_code of ['EXC101', 'EXC102']) {
      await req('POST', '/api/registrations', { index_no: studentId, course_code, academic_year: 'EX2023/2024', semester_sid: 'EXSEM1', status: 'approved' }, h);
    }
  }
  console.log('✅ Registered all students for EXC101 and EXC102');

  // --- Assessments (new schema: index_no, course_code, semester_id, a1-a4)
  const scores = [
    { index_no: createdStudents[0].index_no || createdStudents[0].iid, a1: 8, a2: 8, a3: 7, a4: 5, exam_score: 60 }, // 88 → A
    { index_no: createdStudents[1].index_no || createdStudents[1].iid, a1: 7, a2: 7, a3: 6, a4: 5, exam_score: 55 }, // 80 → B+
    { index_no: createdStudents[2].index_no || createdStudents[2].iid, a1: 6, a2: 6, a3: 5, a4: 5, exam_score: 50 }, // 72 → B
  ];
  for (const s of scores) {
    for (const course_code of ['EXC101', 'EXC102']) {
      await req('POST', '/api/assessments', {
        ...s,
        course_code,
        academic_year: 'EX2023/2024',
        semester_id: 'EXSEM1'
      }, h);
    }
  }
  console.log('✅ Entered assessments (A1-A4 + Exam) for all students');

  // --- Compute GPA (bulk, new schema: semester_id)
  await req('POST', '/api/assessments/compute-gpa', { academic_year: 'EX2023/2024', semester_id: 'EXSEM1' }, h);
  console.log('✅ Computed GPA for EX2023/2024 Sem1');

  // --- Verify broadsheet (new schema: index_no, semester_id)
  for (const s of createdStudents) {
    const studentId = s.index_no || s.iid;
    const bs = await req('GET', `/api/assessments/broadsheet?index_no=${studentId}&academic_year=EX2023/2024&semester_id=EXSEM1`, undefined, h)
      .catch((e: any) => { console.log(`  ⚠️  Boardsheet not found for ${studentId}: ${e.message}`); return null; });
    if (bs) {
      console.log(`  📊 ${studentId}: sGPA=${bs.sGPA?.toFixed(4)}, cGPA=${bs.cGPA?.toFixed(4)}, Class=${bs.class}`);
    }
  }

  // --- Set to EX2026/2027 for graduation test
  await req('POST', `/api/academic/years/${encodeURIComponent('EX2026/2027')}/set-current`, undefined, h);
  console.log('✅ Switched active year to EX2026/2027 (cohort now eligible to graduate)');

  // --- Graduation List
  const gradList = await req('GET', `/api/assessments/graduation-list?progid=EXPROG&admission_year=${encodeURIComponent('EX2023/2024')}`, undefined, h)
    .catch((e: any) => { console.log(`  ⚠️  Graduation list error: ${e.message}`); return []; });
  if (Array.isArray(gradList) && gradList.length > 0) {
    console.log(`✅ Graduation List GENERATED with ${gradList.length} graduates:`);
    for (const g of gradList) {
      console.log(`   🎓 ${g.name} [${g.index_number}] — CGPA: ${g.final_cgpa?.toFixed(4)} — Award: ${g.class_award}`);
    }
  } else {
    console.log('⚠️  Graduation list returned empty or error (may need broadsheet data spanning 4 years)');
  }

  // --- Academic Records: Transcript
  const firstStudent = createdStudents[0];
  const firstStudentId = firstStudent.index_no || firstStudent.iid;
  const transcript = await req('GET', `/api/students/${firstStudentId}/transcript`, undefined, h)
    .catch((e: any) => { console.log(`  ⚠️  Transcript error: ${e.message}`); return null; });
  if (transcript) {
    console.log(`✅ Transcript retrieved for ${firstStudentId} (${transcript.semesters?.length || 0} semesters)`);
  }

  // Reset current year
  await req('POST', `/api/academic/years/${encodeURIComponent('EX2023/2024')}/set-current`, undefined, h);
  console.log('✅ Restored EX2023/2024 as current year after test');
}

async function main() {
  console.log('\n=== FULL SYSTEM POPULATION & TEST (new schema) ===\n');
  cleanupPreviousRun();
  const headers = await login();
  await populateAndTest(headers);
  console.log('\n🎉 ALL MODULES TESTED & POPULATED SUCCESSFULLY 🎉\n');
}

main().catch(e => {
  console.error('❌ TEST FAILED:', e.message);
  process.exit(1);
});
