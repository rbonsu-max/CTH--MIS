import db from './db';
import { StudentRepository } from './src/server/repositories/StudentRepository';
import { ProgramRepository } from './src/server/repositories/ProgramRepository';
import { RegistrationRepository } from './src/server/repositories/RegistrationRepository';

async function runTests() {
  console.log('--- STARTING E2E DATABASE VERIFICATION ---');
  
  try {
    // 0. Cleanup any stale data from previous failed runs (topological order)
    db.prepare(`DELETE FROM course_registrations WHERE index_no IN ('TESTSTUDENT-001', 'TESTSTUDENT-002')`).run();
    db.prepare(`DELETE FROM students WHERE iid IN ('TESTSTUDENT-001', 'TESTSTUDENT-002')`).run();
    db.prepare(`DELETE FROM courses WHERE code IN ('TC101', 'TC102')`).run();
    db.prepare('DELETE FROM programs WHERE progid = ?').run('TEST-PROG-1');

    // 1. Create a Test Program
    const progId = 'TEST-PROG-1';
    ProgramRepository.createProgram({
      progid: progId,
      name: 'Test Program 1',
      department: 'Test Dept'
    });
    console.log('[+] Created Test Program:', progId);

    // 2. Create 2 Test Courses
    const course1 = 'TC101';
    const course2 = 'TC102';
    ProgramRepository.createCourse({ code: course1, name: 'Test Course 1', credit_hours: 3, department: 'Test Dept' });
    ProgramRepository.createCourse({ code: course2, name: 'Test Course 2', credit_hours: 4, department: 'Test Dept' });
    console.log('[+] Created Test Courses:', course1, course2);

    // 3. Create 2 Test Students
    const student1 = 'TESTSTUDENT-001';
    const student2 = 'TESTSTUDENT-002';
    
    StudentRepository.createStudent({
      iid: student1,
      index_number: student1,
      surname: 'Doe',
      other_names: 'John',
      email: 'john@test.com',
      phone: '123456',
      gender: 'Male',
      dob: '2000-01-01',
      progid: progId,
      current_level: 100,
      admission_year: '2023/2024'
    });
    
    StudentRepository.createStudent({
      iid: student2,
      index_number: student2,
      surname: 'Smith',
      other_names: 'Jane',
      email: 'jane@test.com',
      phone: '654321',
      gender: 'Female',
      dob: '2001-01-01',
      progid: progId,
      current_level: 100,
      admission_year: '2023/2024'
    });
    console.log('[+] Created Test Students:', student1, student2);

    // 4. Test Edits
    StudentRepository.updateStudent(student1, { 
      surname: 'Doe-Edited',
      other_names: 'John',
      email: 'john@test.com',
      phone: '123456',
      gender: 'Male',
      dob: '2000-01-01',
      progid: progId,
      current_level: 100,
      status: 'active'
    });
    const s1 = db.prepare('SELECT surname FROM students WHERE iid = ?').get(student1) as any;
    if (s1.surname === 'Doe-Edited') console.log('[+] Student Edit Verified');
    else throw new Error('Student Edit Failed');

    // 5. Register Students for Courses (Test Registration)
    RegistrationRepository.registerCourse({
      index_no: student1, course_code: course1, academic_year: '2023/2024', semester_sid: 'SEM1', status: 'approved'
    });
    RegistrationRepository.registerCourse({
      index_no: student2, course_code: course2, academic_year: '2023/2024', semester_sid: 'SEM1', status: 'approved'
    });
    console.log('[+] Created Course Registrations');

    // 6. Test Cascading Delete: Delete Course 1 (Should wipe registration for student1)
    console.log('[*] Testing Course Deletion & Cascade (Course -> Registrations)');
    ProgramRepository.deleteCourse(course1);
    const c1Check = db.prepare('SELECT * FROM course_registrations WHERE course_code = ?').all(course1);
    if (c1Check.length === 0) console.log('[+] Course Cascade Delete Verified (Registrations clean)');
    else throw new Error('Course Cascade Delete Failed: Registrations still exist!');

    // 7. Test Cascading Delete: Delete Student 2 (Should wipe registration for course2)
    console.log('[*] Testing Student Deletion & Cascade (Student -> Registrations)');
    StudentRepository.deleteStudent(student2);
    const s2Check = db.prepare('SELECT * FROM course_registrations WHERE index_no = ?').all(student2);
    if (s2Check.length === 0) console.log('[+] Student Cascade Delete Verified (Registrations clean)');
    else throw new Error('Student Cascade Delete Failed: Registrations still exist!');

    // 8. Cleanup remaining entities
    StudentRepository.deleteStudent(student1);
    ProgramRepository.deleteCourse(course2);
    ProgramRepository.deleteProgram(progId);
    console.log('[+] Cleanup Successful');

    console.log('--- ALL E2E VERIFICATIONS PASSED ---');
  } catch (error) {
    console.error('--- E2E VERIFICATION FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

runTests();
