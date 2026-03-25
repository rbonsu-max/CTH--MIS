import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./sims.db');
db.pragma('foreign_keys = OFF');

try {
  const columns = db.prepare("PRAGMA table_info(student_logins)").all() as { name: string }[];
  if (!columns.find(c => c.name === 'requires_reset')) {
    db.prepare('ALTER TABLE student_logins ADD COLUMN requires_reset INTEGER NOT NULL DEFAULT 1').run();
  }
} catch (e) {}

let student = db.prepare('SELECT * FROM students LIMIT 1').get() as any;

if (!student) {
  let prog = db.prepare('SELECT * FROM programs LIMIT 1').get() as any;
  if (!prog) {
    db.prepare(`INSERT INTO programs (progid, name, department, duration_years) VALUES ('TEST-PROG', 'Test Program', 'Test Dept', 4)`).run();
    prog = { progid: 'TEST-PROG' };
  }
  db.prepare(`INSERT INTO students (iid, surname, other_names, status, index_number, email, gender, dob, progid, admission_year, current_level) VALUES ('TEST-STU-1', 'Student', 'Test', 'active', 'TEST_IDX_001', 'test@example.com', 'Other', '2000-01-01', ?, '2020', 100)`).run(prog.progid);
  student = { iid: 'TEST-STU-1', index_number: 'TEST_IDX_001' };
}

console.log("Using student index:", student.index_number);

const hash = bcrypt.hashSync('studentpass', 10);
// Reset login logic
db.prepare('DELETE FROM student_logins WHERE iid = ?').run(student.iid);
db.prepare('INSERT INTO student_logins (iid, username, password_hash, requires_reset) VALUES (?, ?, ?, 1)').run(student.iid, student.index_number, hash);

async function testFlow() {
  console.log("--- Test 1 POST Login ---");
  const loginRes = await fetch('http://localhost:3012/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: student.index_number, password: 'studentpass' })
  });
  const loginData = await loginRes.json();
  console.log("Login Response Status:", loginRes.status);
  console.log("Login Response Data:", loginData);

  if (loginData.error === 'REQUIRES_RESET') {
    console.log("✅ Passed REQUIRES_RESET check");
  } else {
    console.log("❌ Failed REQUIRES_RESET check");
    process.exit(1);
  }

  console.log("\n--- Test 2 POST Setup Password ---");
  const setupRes = await fetch('http://localhost:3012/api/auth/setup-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: student.index_number, currentPassword: 'studentpass', newPassword: 'newsecurepass' })
  });
  const setupData = await setupRes.json();
  console.log("Setup Response Status:", setupRes.status);
  console.log("Setup Response Data:", setupData);

  if (setupData.role === 'Student') {
    console.log("✅ Passed Setup Password and got role!");
  } else {
    console.log("❌ Failed Setup Password");
    process.exit(1);
  }

  console.log("\n--- Test 3 POST Login again with new password ---");
  const loginRes2 = await fetch('http://localhost:3012/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: student.index_number, password: 'newsecurepass' })
  });
  const loginData2 = await loginRes2.json();
  console.log("Login 2 Response Status:", loginRes2.status);
  console.log("Login 2 Response Data:", loginData2);
  
  if (loginData2.role === 'Student') {
    console.log("✅ Passed second login!");
  } else {
    console.log("❌ Failed second login check");
  }
}

testFlow();
