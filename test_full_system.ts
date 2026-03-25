import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./sims.db');
db.pragma('foreign_keys = OFF');

const BASE_URL = 'http://127.0.0.1:3012/api';

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
    if (parsed.error === 'REQUIRES_RESET') {
      return { requires_reset: true, cookie: newCookie };
    }
    throw new Error(`[${options.method || 'GET'} ${url}] Failed with status ${res.status}: ${JSON.stringify(parsed)}`);
  }
  return { data: parsed, cookie: newCookie };
}

// 1. SEED DB WITH KNOWN SUPERADMIN & LECTURER USER
console.log('Seeding Database...');
const adminHash = bcrypt.hashSync('superpass', 10);
db.prepare('DELETE FROM users WHERE uid = ?').run('TEST-ADMIN-01');
db.prepare('INSERT INTO users (id, uid, fullname, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run('id-admin', 'TEST-ADMIN-01', 'Test Admin', 'testadmin', adminHash, 'SuperAdmin', 'active');

const lecUserHash = bcrypt.hashSync('lecpass', 10);
db.prepare('DELETE FROM users WHERE uid = ?').run('TEST-LEC-USER-01');
db.prepare('INSERT INTO users (id, uid, fullname, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run('id-lec', 'TEST-LEC-USER-01', 'Test Lecturer', 'testlec', lecUserHash, 'Lecturer', 'active');

// Cleanup existing test data safely
db.prepare('DELETE FROM academic_years WHERE code = ?').run('2027/2028');
db.prepare('DELETE FROM semesters WHERE name = ?').run('TEST-SEM1');
db.prepare('DELETE FROM departments WHERE name = ?').run('TEST Department');
db.prepare('DELETE FROM programs WHERE progid = ?').run('TEST-PROG');
db.prepare('DELETE FROM courses WHERE code = ?').run('TEST-101');
db.prepare('DELETE FROM lecturers WHERE lid = ?').run('TEST-LEC-1');
db.prepare('DELETE FROM assessment_windows WHERE academic_year = ?').run('2027/2028');
db.prepare('DELETE FROM notifications WHERE recipient_uid = ?').run('TEST-ADMIN-01');
const uniqueSuffix = Date.now();
const testEmail = `stu${uniqueSuffix}@test.com`;
const testIndex = `TEST-IDX-${uniqueSuffix}`;

async function runTest() {
  try {
    console.log('\n=== E2E TEST: START ===');
    
    // --- ADMIN SESSION ---
    console.log('1. Login as SuperAdmin');
    let { cookie: adminCookie } = await fetchWithCookie(`${BASE_URL}/auth/login`, null, {
      method: 'POST', body: JSON.stringify({ username: 'testadmin', password: 'superpass' })
    });

    console.log('2. Create Academic Settings');
    await fetchWithCookie(`${BASE_URL}/academic/years`, adminCookie, {
      method: 'POST', body: JSON.stringify({ code: '2027/2028', start_date: '2027-01-01', end_date: '2027-12-31', is_current: 1 })
    });
    const semRes = await fetchWithCookie(`${BASE_URL}/academic/semesters`, adminCookie, {
      method: 'POST', body: JSON.stringify({ sid: 'TSEM1', name: 'TEST-SEM1', academic_year: '2027/2028', start_date: '2027-01-01', end_date: '2027-06-01', is_current: 1 })
    });
    const semester_sid = semRes.data.sid;

    console.log('3. Create Core Architecture (Dept, Prog, Course)');
    await fetchWithCookie(`${BASE_URL}/departments`, adminCookie, {
      method: 'POST', body: JSON.stringify({ code: 'TDEPT', name: 'TEST Department' })
    });
    await fetchWithCookie(`${BASE_URL}/programs`, adminCookie, {
      method: 'POST', body: JSON.stringify({ progid: 'TEST-PROG', name: 'Test Program', department: 'TEST Department', duration: 4 })
    });
    await fetchWithCookie(`${BASE_URL}/courses`, adminCookie, {
      method: 'POST', body: JSON.stringify({ code: 'TEST-101', name: 'Test Intro', credit_hours: 3, department: 'TEST Department' })
    });

    console.log('4. Setup Lecturer & Mount Curriculum');
    await fetchWithCookie(`${BASE_URL}/lecturers`, adminCookie, {
      method: 'POST', body: JSON.stringify({ lid: 'TEST-LEC-1', name: 'Dr. Test', email: 'lec@test.com', department: 'TEST Department', designation: 'Professor', user_uid: 'TEST-LEC-USER-01' })
    });
    await fetchWithCookie(`${BASE_URL}/lecturers/assignments`, adminCookie, {
      method: 'POST', body: JSON.stringify({ lid: 'TEST-LEC-1', course_code: 'TEST-101', academic_year: '2027/2028', semester_sid })
    });
    await fetchWithCookie(`${BASE_URL}/programs/TEST-PROG/curriculum`, adminCookie, {
      method: 'POST', body: JSON.stringify({ course_code: 'TEST-101', level: 100, semester_sid })
    });

    console.log('5. Create Student and Student Login');
    const stuRes = await fetchWithCookie(`${BASE_URL}/students`, adminCookie, {
      method: 'POST', body: JSON.stringify({ index_number: testIndex, surname: 'Student', other_names: 'Test', email: testEmail, progid: 'TEST-PROG', current_level: 100, gender: 'Other', dob: '2000-01-01', phone: '1234567890', admission_year: '2027/2028', status: 'active' })
    });
    const studentIID = stuRes.data.iid;
    await fetchWithCookie(`${BASE_URL}/students/${studentIID}/login`, adminCookie, {
      method: 'POST', body: JSON.stringify({ password: 'initialpass' })
    });

    console.log('6. Open Registration Window');
    await fetchWithCookie(`${BASE_URL}/registrations/windows`, adminCookie, {
      method: 'POST', body: JSON.stringify({ academic_year: '2027/2028', semester_sid, start_date: '2020-01-01', end_date: '2030-12-31', is_active: 1 })
    });
    await fetchWithCookie(`${BASE_URL}/assessment-control/windows`, adminCookie, {
      method: 'POST', body: JSON.stringify({ academic_year: '2027/2028', semester_id: semester_sid, start_date: '2020-01-01', end_date: '2030-12-31', is_active: true })
    });

    // --- STUDENT SESSION ---
    console.log('7. Student Portal Login (First Time Reset)');
    let { requires_reset } = await fetchWithCookie(`${BASE_URL}/auth/login`, null, {
      method: 'POST', body: JSON.stringify({ username: testIndex, password: 'initialpass' })
    });
    if (!requires_reset) throw new Error("Expected REQUIRES_RESET but was allowed in!");
    
    let { cookie: studentCookie, data: stuData } = await fetchWithCookie(`${BASE_URL}/auth/setup-password`, null, {
      method: 'POST', body: JSON.stringify({ username: testIndex, currentPassword: 'initialpass', newPassword: 'securepass' })
    });
    
    console.log('8. Student Registers for Course');
    await fetchWithCookie(`${BASE_URL}/registrations`, studentCookie, {
      method: 'POST', body: JSON.stringify({ index_no: studentIID, course_code: 'TEST-101', academic_year: '2027/2028', semester_sid })
    });

    // --- LECTURER SESSION ---
    console.log('9. Lecturer Login and Assessment Submission');
    let { cookie: lecCookie } = await fetchWithCookie(`${BASE_URL}/auth/login`, null, {
      method: 'POST', body: JSON.stringify({ username: 'testlec', password: 'lecpass' })
    });

    await fetchWithCookie(`${BASE_URL}/auth/change-password`, lecCookie, {
      method: 'POST', body: JSON.stringify({ currentPassword: 'lecpass', newPassword: 'lecpass2' })
    });
    ({ cookie: lecCookie } = await fetchWithCookie(`${BASE_URL}/auth/login`, null, {
      method: 'POST', body: JSON.stringify({ username: 'testlec', password: 'lecpass2' })
    }));
    
    await fetchWithCookie(`${BASE_URL}/assessments`, lecCookie, {
      method: 'POST', body: JSON.stringify({ index_no: studentIID, course_code: 'TEST-101', academic_year: '2027/2028', semester_id: semester_sid, a1: 10, a2: 8, a3: 7, a4: 5, exam_score: 60 })
    });

    // --- ADMIN SESSION ---
    console.log('10. Admin Verifies Notifications, GPA and Boardsheet');
    const notificationRes = await fetchWithCookie(`${BASE_URL}/notifications`, adminCookie);
    const notifications = notificationRes.data as Array<{ type: string; title: string }>;
    if (!notifications.some((item) => item.type === 'assessment_uploaded')) {
      throw new Error('Expected superadmin notification after lecturer result upload');
    }

    await fetchWithCookie(`${BASE_URL}/assessments/compute-gpa`, adminCookie, {
      method: 'POST', body: JSON.stringify({ academic_year: '2027/2028', semester_id: semester_sid })
    });
    
    const bsRes = await fetchWithCookie(`${BASE_URL}/assessments/broadsheet?academic_year=2027/2028&semester_id=${semester_sid}&index_no=${studentIID}`, adminCookie);
    if (!bsRes.data || bsRes.data.sGPA === undefined) {
      throw new Error('Boardsheet was not generated');
    }
    
    console.log('Boardsheet Status generated correctly!');
    
    console.log('\n✅✅✅ E2E TEST: ALL PASSED 100% ✅✅✅');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌❌❌ E2E TEST FAILED ❌❌❌');
    console.error(error);
    process.exit(1);
  }
}

runTest();
