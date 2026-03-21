import db from '../../../db';

export interface Student {
  id: number;
  iid: string;
  index_number: string;
  surname: string;
  other_names: string;
  full_name: string;
  gender: string;
  dob: string;
  email: string;
  phone: string;
  progid: string;
  admission_year: string;
  current_level: number;
  status: string;
  photo: string;
  user_uid: string;
  created_by: string;
  created_at: string;
}

export interface StudentLevel {
  id: number;
  iid: string;
  level: number;
  academic_year: string;
  semester_sid: string;
  is_current: number;
  updated_by: string;
  updated_at: string;
}

export class StudentRepository {
  static getAllStudents(): Student[] {
    return db.prepare('SELECT * FROM view_student_details ORDER BY surname ASC').all() as Student[];
  }

  static getStudentByIid(iid: string): Student | undefined {
    return db.prepare('SELECT * FROM view_student_details WHERE iid = ?').get(iid) as Student;
  }

  static getStudentByIndexNumber(index_number: string): Student | undefined {
    return db.prepare('SELECT * FROM view_student_details WHERE index_number = ?').get(index_number) as Student;
  }

  static createStudent(student: Partial<Student>): void {
    db.prepare(`
      INSERT INTO students (iid, index_number, surname, other_names, gender, dob, email, phone, progid, admission_year, current_level, status, photo, user_uid, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(student.iid, student.index_number, student.surname, student.other_names, student.gender, student.dob, student.email, student.phone, student.progid, student.admission_year, student.current_level, student.status, student.photo || null, student.user_uid, student.created_by);
  }

  static updateStudent(iid: string, student: Partial<Student>): void {
    db.prepare(`
      UPDATE students 
      SET surname = ?, other_names = ?, gender = ?, dob = ?, email = ?, phone = ?, progid = ?, current_level = ?, status = ?, photo = COALESCE(?, photo)
      WHERE iid = ?
    `).run(student.surname, student.other_names, student.gender, student.dob, student.email, student.phone, student.progid, student.current_level, student.status, student.photo || null, iid);
  }

  static deleteStudent(iid: string): void {
    db.prepare('DELETE FROM students WHERE iid = ?').run(iid);
  }

  static getStudentLevelHistory(iid: string): StudentLevel[] {
    return db.prepare('SELECT * FROM student_levels WHERE iid = ? ORDER BY academic_year DESC, semester_sid DESC').all(iid) as StudentLevel[];
  }

  static updateStudentLevel(iid: string, level: number, academic_year: string, semester_sid: string, updated_by: string): void {
    db.transaction(() => {
      db.prepare('UPDATE student_levels SET is_current = 0 WHERE iid = ?').run(iid);
      db.prepare(`
        INSERT INTO student_levels (iid, level, academic_year, semester_sid, is_current, updated_by)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(iid, academic_year, semester_sid) DO UPDATE SET
          level = excluded.level,
          is_current = 1,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `).run(iid, level, academic_year, semester_sid, updated_by);
      
      // Update the current_level in the students table
      db.prepare('UPDATE students SET current_level = ? WHERE iid = ?').run(level, iid);
    })();
  }
}
