import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./sims.db');
db.pragma('foreign_keys = OFF');

let student = db.prepare('SELECT * FROM students LIMIT 1').get() as any;

if (!student) {
  let prog = db.prepare('SELECT * FROM programs LIMIT 1').get() as any;
  if (!prog) {
    db.prepare(`INSERT INTO programs (progid, name, department, duration_years) VALUES ('TEST-PROG', 'Test Program', 'Test Dept', 4)`).run();
    prog = { progid: 'TEST-PROG' };
  }
  db.prepare(`INSERT INTO students (iid, surname, other_names, status, index_number, email, gender, dob, progid, admission_year, current_level) VALUES ('TEST-STU-1', 'Student', 'Test', 'active', 'IDX001', 'test@example.com', 'Other', '2000-01-01', ?, '2020', 100)`).run(prog.progid);
  student = { iid: 'TEST-STU-1' };
}
const studentIID = student.iid;

const hash = bcrypt.hashSync('studentpass', 10);
db.prepare('DELETE FROM student_logins WHERE iid = ?').run(studentIID);
db.prepare('INSERT INTO student_logins (iid, username, password_hash) VALUES (?, ?, ?)').run(studentIID, 'student1', hash);

fetch('http://localhost:3010/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'student1', password: 'studentpass' })
}).then(r => r.json()).then(res => {
  if (res.role === 'Student') {
    console.log('SUCCESS: Student Auth works end-to-end');
  } else {
    console.error('FAILED: Role is not Student or error occurred', res);
  }
}).catch(console.error);
