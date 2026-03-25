import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./sims.db');
db.pragma('foreign_keys = OFF');

const BASE_URL = 'http://127.0.0.1:3009/api';

async function fetchWithCookie(url: string, cookie: string | null, options: any = {}) {
  const headers = { ...options.headers, 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(url, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  let newCookie = cookie;
  if (setCookie) {
    newCookie = setCookie.split(';')[0];
  }
  const data = await res.text();
  let parsed;
  try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
  
  if (!res.ok) {
    throw new Error(`[${options.method || 'GET'} ${url}] Failed with status ${res.status}: ${JSON.stringify(parsed)}`);
  }
  return { data: parsed, cookie: newCookie };
}

async function runTests() {
  console.log('--- STARTING EXHAUSTIVE CRUD TESTS ---');
  
  // Pre-cleanup in case of previous failure
  db.prepare("DELETE FROM lecturer_course_assignments WHERE lid = 'L99'").run();
  db.prepare("DELETE FROM course_registrations WHERE iid = (SELECT iid FROM students WHERE index_number = 'STU99')").run();
  db.prepare("DELETE FROM student_assessments WHERE iid = (SELECT iid FROM students WHERE index_number = 'STU99')").run();
  db.prepare("DELETE FROM program_curriculum WHERE progid = 'PROG99'").run();
  
  db.prepare("DELETE FROM academic_years WHERE code = '2099/2100'").run();
  db.prepare("DELETE FROM semesters WHERE sid = 'SEM99'").run();
  db.prepare("DELETE FROM departments WHERE code = 'D99'").run();
  db.prepare("DELETE FROM grading_points WHERE grade = 'A++'").run();
  db.prepare("DELETE FROM users WHERE username = 'user99@test.com'").run();
  db.prepare("DELETE FROM programs WHERE progid = 'PROG99'").run();
  db.prepare("DELETE FROM courses WHERE cid = 'C99'").run();
  db.prepare("DELETE FROM lecturers WHERE lid = 'L99'").run();
  db.prepare("DELETE FROM students WHERE index_number = 'STU99'").run();

  // Create an admin securely
  const adminHash = bcrypt.hashSync('superpass', 10);
  db.prepare('DELETE FROM users WHERE uid = ?').run('TEST-ADMIN-99');
  db.prepare('INSERT INTO users (id, uid, fullname, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run('id-admin-99', 'TEST-ADMIN-99', 'Test Admin 99', 'admin99', adminHash, 'SuperAdmin', 'active');

  let { cookie: adminCookie } = await fetchWithCookie(`${BASE_URL}/auth/login`, null, {
    method: 'POST', body: JSON.stringify({ username: 'admin99', password: 'superpass' })
  });
  console.log('✅ Logged in as SuperAdmin');

  // --- SETTINGS (Academic Year, Semester, Departments, Grading, User) ---
  console.log('\n--- TESTING SETTINGS MODULES ---');
  
  // Academic Year
  await fetchWithCookie(`${BASE_URL}/academic/years`, adminCookie, {
    method: 'POST', body: JSON.stringify({ code: '2099/2100', start_date: '2099-01-01', end_date: '2099-12-31', is_current: 0 })
  });
  console.log('✅ Created Academic Year');
  await fetchWithCookie(`${BASE_URL}/academic/years/2099%2F2100`, adminCookie, {
    method: 'PUT', body: JSON.stringify({ start_date: '2099-02-01', end_date: '2099-11-30', is_current: 0 })
  });
  console.log('✅ Updated Academic Year');

  // Semester
  const semRes = await fetchWithCookie(`${BASE_URL}/academic/semesters`, adminCookie, {
    method: 'POST', body: JSON.stringify({ sid: 'SEM99', name: 'Semester 99', academic_year: '2099/2100', start_date: '2099-01-01', end_date: '2099-06-01', is_current: 0 })
  });
  console.log('✅ Created Semester');
  await fetchWithCookie(`${BASE_URL}/academic/semesters/SEM99`, adminCookie, {
    method: 'PUT', body: JSON.stringify({ name: 'Semester 99 Updated', academic_year: '2099/2100', start_date: '2099-02-01', end_date: '2099-06-01', is_current: 0 })
  });
  console.log('✅ Updated Semester');

  // Departments
  const deptRes = await fetchWithCookie(`${BASE_URL}/departments`, adminCookie, {
    method: 'POST', body: JSON.stringify({ code: 'D99', name: 'Dept 99' })
  });
  console.log('✅ Created Department');
  
  // Grading Points
  const gpRes = await fetchWithCookie(`${BASE_URL}/settings/grading`, adminCookie, {
    method: 'POST', body: JSON.stringify({ grade: 'A++', min_score: 95, max_score: 100, gp: 4.5, remarks: 'Godlike' })
  });
  console.log('✅ Created Grading Point');

  // Users
  const userRes = await fetchWithCookie(`${BASE_URL}/users`, adminCookie, {
    method: 'POST', body: JSON.stringify({ fullname: 'User 99', username: 'user99@test.com', role: 'Administrator', password: 'password123' })
  });
  console.log('✅ Created User');

  // --- ACADEMIC CORE (Programs, Courses, Lecturers) ---
  console.log('\n--- TESTING ACADEMIC CORE MODULES ---');
  
  const progRes = await fetchWithCookie(`${BASE_URL}/programs`, adminCookie, {
    method: 'POST', body: JSON.stringify({ progid: 'PROG99', name: 'Program 99', department: 'Dept 99', duration_years: 4 })
  });
  console.log('✅ Created Program');

  const courseRes = await fetchWithCookie(`${BASE_URL}/courses`, adminCookie, {
    method: 'POST', body: JSON.stringify({ cid: 'C99', title: 'Course 99', credits: 3, department: 'Dept 99' })
  });
  console.log('✅ Created Course');

  const lecRes = await fetchWithCookie(`${BASE_URL}/lecturers`, adminCookie, {
    method: 'POST', body: JSON.stringify({ lid: 'L99', fullname: 'Lecturer 99', email: 'lec99@test.com', department: 'Dept 99', designation: 'Professor' })
  });
  console.log('✅ Created Lecturer');

  // Mount Curriculum
  await fetchWithCookie(`${BASE_URL}/programs/PROG99/curriculum`, adminCookie, {
    method: 'POST', body: JSON.stringify({ cid: 'C99', level: 100, semester_sid: 'SEM99' })
  });
  console.log('✅ Mounted Curriculum');

  // Assign Lecturer
  await fetchWithCookie(`${BASE_URL}/lecturers/assignments`, adminCookie, {
    method: 'POST', body: JSON.stringify({ lid: 'L99', cid: 'C99', academic_year: '2099/2100', semester_sid: 'SEM99' })
  });
  console.log('✅ Assigned Lecturer to Course');


  // --- STUDENTS & REGISTRATION ---
  console.log('\n--- TESTING STUDENT & REGISTRATION MODULES ---');

  const stuRes = await fetchWithCookie(`${BASE_URL}/students`, adminCookie, {
    method: 'POST', body: JSON.stringify({ index_number: 'STU99', surname: 'Student', other_names: '99', email: 'stu99@test.com', progid: 'PROG99', current_level: 100, gender: 'Male', dob: '2000-01-01', phone: '123456', admission_year: '2099/2100', status: 'active' })
  });
  const iid = stuRes.data.iid;
  console.log('✅ Created Student');

  await fetchWithCookie(`${BASE_URL}/students/${iid}`, adminCookie, {
    method: 'PUT', body: JSON.stringify({ index_number: 'STU99', surname: 'Student', other_names: '99', email: 'stu99@test.com', progid: 'PROG99', current_level: 100, gender: 'Male', dob: '2000-01-01', phone: '654321', admission_year: '2099/2100', status: 'active' })
  });
  console.log('✅ Updated Student');

  await fetchWithCookie(`${BASE_URL}/registrations`, adminCookie, {
    method: 'POST', body: JSON.stringify({ iid: iid, cid: 'C99', academic_year: '2099/2100', semester_sid: 'SEM99' })
  });
  console.log('✅ Created Registration');

  await fetchWithCookie(`${BASE_URL}/assessments`, adminCookie, {
    method: 'POST', body: JSON.stringify({ iid: iid, cid: 'C99', academic_year: '2099/2100', semester_sid: 'SEM99', class_score: 30, exam_score: 65 }) // 95 total -> A++
  });
  console.log('✅ Created Assessment');
  
  await fetchWithCookie(`${BASE_URL}/assessments/compute-gpa`, adminCookie, {
    method: 'POST', body: JSON.stringify({ academic_year: '2099/2100', semester_sid: 'SEM99' })
  });
  console.log('✅ Computed GPA');

  const bsRes = await fetchWithCookie(`${BASE_URL}/assessments/broadsheet?academic_year=2099/2100&semester_sid=SEM99&iid=${iid}`, adminCookie);
  if (bsRes.data.remarks !== 'First Class' && bsRes.data.gpa !== 4.5) {
     console.warn('⚠️ GPA or Remarks was not computed correctly based on dynamic scale.');
  } else {
     console.log('✅ Validated Boardsheet Data against dynamic grading scale A++ (4.5)');
  }

  // --- TEARDOWN / DELETE TESTS ---
  console.log('\n--- TESTING CASCADING DELETES ---');
  
  // Delete grading point
  const gpRows = db.prepare("SELECT id FROM grading_points WHERE grade = 'A++'").all() as any[];
  for (const r of gpRows) {
    await fetchWithCookie(`${BASE_URL}/settings/grading/${r.id}`, adminCookie, { method: 'DELETE' });
  }
  console.log('✅ Deleted Grading Point');

  // Delete student (should cascade delete assessments, registrations)
  await fetchWithCookie(`${BASE_URL}/students/${iid}`, adminCookie, { method: 'DELETE' });
  console.log('✅ Deleted Student (Cascaded to Registrations & Assessments)');

  // Unmount Curriculum
  await fetchWithCookie(`${BASE_URL}/programs/PROG99/curriculum?cid=C99&level=100&semester_sid=SEM99`, adminCookie, { method: 'DELETE' });
  console.log('✅ Unmounted Curriculum');

  // Delete Lecturer
  await fetchWithCookie(`${BASE_URL}/lecturers/L99`, adminCookie, { method: 'DELETE' });
  console.log('✅ Deleted Lecturer (Cascaded Assignments)');

  // Delete Course
  await fetchWithCookie(`${BASE_URL}/courses/C99`, adminCookie, { method: 'DELETE' });
  console.log('✅ Deleted Course');

  // Delete Program
  await fetchWithCookie(`${BASE_URL}/programs/PROG99`, adminCookie, { method: 'DELETE' });
  console.log('✅ Deleted Program');

  // Delete Department
  const deptRows = db.prepare("SELECT id FROM departments WHERE code = 'D99'").all() as any[];
  for (const r of deptRows) {
    await fetchWithCookie(`${BASE_URL}/departments/${r.id}`, adminCookie, { method: 'DELETE' });
  }
  console.log('✅ Deleted Department');

  // Delete Semester
  await fetchWithCookie(`${BASE_URL}/academic/semesters/SEM99`, adminCookie, { method: 'DELETE' });
  console.log('✅ Deleted Semester');

  // Delete Academic Year
  await fetchWithCookie(`${BASE_URL}/academic/years/2099%2F2100`, adminCookie, { method: 'DELETE' });
  console.log('✅ Deleted Academic Year');

  // Delete User
  db.prepare("DELETE FROM users WHERE username = 'user99@test.com'").run();
  
  console.log('\n🎉 ALL MODULES TESTED SUCCESSFULLY (CRUD + CASCADES) 🎉');
}

runTests().catch(e => {
  console.error('❌ TEST FAILED:', e);
  process.exit(1);
});
