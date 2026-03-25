import db from '../../../db';
import { v4 as uuidv4 } from 'uuid';

export interface Program {
  pid: string;
  progid: string;
  name: string;
  department: string;
  duration: number;
  required_ch: number;
  created_by: string;
  created_at: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  credit_hours: number;
  department: string;
  created_by: string;
  created_at: string;
}

export interface Curriculum {
  id: number;
  progid: string;
  course_code: string;
  level: number;
  semester_sid: string;
  is_elective: number;
  created_by: string;
}

export class ProgramRepository {
  static getAllPrograms(): Program[] {
    return db.prepare('SELECT * FROM programs ORDER BY name ASC').all() as Program[];
  }

  static getProgramByProgid(progid: string): Program | undefined {
    return db.prepare('SELECT * FROM programs WHERE progid = ?').get(progid) as Program;
  }

  static createProgram(program: Partial<Program>): void {
    const pid = uuidv4();
    db.prepare(`
      INSERT INTO programs (pid, progid, name, department, duration, required_ch, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pid, program.progid, program.name, program.department, program.duration, program.required_ch || 0, program.created_by);
  }

  static updateProgram(progid: string, program: Partial<Program>): void {
    db.prepare(`
      UPDATE programs 
      SET name = ?, department = ?, duration = ?, required_ch = ?
      WHERE progid = ?
    `).run(program.name, program.department, program.duration, program.required_ch || 0, progid);
  }

  static deleteProgram(progid: string): void {
    db.transaction(() => {
      db.prepare('DELETE FROM program_curriculum WHERE progid = ?').run(progid);
      db.prepare('UPDATE students SET progid = NULL WHERE progid = ?').run(progid);
      db.prepare('DELETE FROM programs WHERE progid = ?').run(progid);
    })();
  }

  static getAllCourses(): Course[] {
    return db.prepare('SELECT * FROM courses ORDER BY name ASC').all() as Course[];
  }

  static getCourseByCode(code: string): Course | undefined {
    return db.prepare('SELECT * FROM courses WHERE code = ?').get(code) as Course;
  }

  static createCourse(course: Partial<Course>): void {
    db.prepare(`
      INSERT INTO courses (code, name, credit_hours, department, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(course.code, course.name, course.credit_hours, course.department, course.created_by);
  }

  static updateCourse(code: string, course: Partial<Course>): void {
    db.prepare(`
      UPDATE courses 
      SET name = ?, credit_hours = ?, department = ?
      WHERE code = ?
    `).run(course.name, course.credit_hours, course.department, code);
  }

  static deleteCourse(code: string): void {
    db.transaction(() => {
      db.prepare('DELETE FROM student_assessments WHERE course_code = ?').run(code);
      db.prepare('DELETE FROM course_registrations WHERE course_code = ?').run(code);
      db.prepare('DELETE FROM lecturer_course_assignments WHERE course_code = ?').run(code);
      db.prepare('DELETE FROM program_curriculum WHERE course_code = ?').run(code);
      db.prepare('DELETE FROM courses WHERE code = ?').run(code);
    })();
  }

  static getCurriculum(progid: string, level?: number, semester_sid?: string): any[] {
    let sql = `
      SELECT pc.*, c.name as course_name, c.name, c.credit_hours 
      FROM program_curriculum pc
      LEFT JOIN courses c ON pc.course_code = c.code
      WHERE pc.progid = ?
    `;
    const params: any[] = [progid];
    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }
    if (semester_sid) {
      sql += ' AND semester_sid = ?';
      params.push(semester_sid);
    }
    return db.prepare(sql).all(...params) as any[];
  }

  static mountCurriculum(curriculum: Partial<Curriculum>): void {
    db.prepare(`
      INSERT INTO program_curriculum (progid, course_code, level, semester_sid, is_elective, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(progid, course_code, level, semester_sid) DO UPDATE SET
        is_elective = excluded.is_elective
    `).run(curriculum.progid, curriculum.course_code, curriculum.level, curriculum.semester_sid, curriculum.is_elective, curriculum.created_by);
  }

  static unmountCurriculum(progid: string, course_code: string, level: number, semester_sid: string): void {
    db.prepare(`
      DELETE FROM program_curriculum 
      WHERE progid = ? AND course_code = ? AND level = ? AND semester_sid = ?
    `).run(progid, course_code, level, semester_sid);
  }
}
