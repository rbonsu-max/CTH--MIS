import db from '../../../db';

export interface Program {
  id: number;
  progid: string;
  name: string;
  department: string;
  duration_years: number;
  created_by: string;
  created_at: string;
}

export interface Course {
  id: number;
  cid: string;
  title: string;
  credits: number;
  department: string;
  created_by: string;
  created_at: string;
}

export interface Curriculum {
  id: number;
  progid: string;
  cid: string;
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
    db.prepare(`
      INSERT INTO programs (progid, name, department, duration_years, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(program.progid, program.name, program.department, program.duration_years, program.created_by);
  }

  static updateProgram(progid: string, program: Partial<Program>): void {
    db.prepare(`
      UPDATE programs 
      SET name = ?, department = ?, duration_years = ?
      WHERE progid = ?
    `).run(program.name, program.department, program.duration_years, progid);
  }

  static deleteProgram(progid: string): void {
    db.prepare('DELETE FROM programs WHERE progid = ?').run(progid);
  }

  static getAllCourses(): Course[] {
    return db.prepare('SELECT * FROM courses ORDER BY title ASC').all() as Course[];
  }

  static getCourseByCid(cid: string): Course | undefined {
    return db.prepare('SELECT * FROM courses WHERE cid = ?').get(cid) as Course;
  }

  static createCourse(course: Partial<Course>): void {
    db.prepare(`
      INSERT INTO courses (cid, title, credits, department, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(course.cid, course.title, course.credits, course.department, course.created_by);
  }

  static updateCourse(cid: string, course: Partial<Course>): void {
    db.prepare(`
      UPDATE courses 
      SET title = ?, credits = ?, department = ?
      WHERE cid = ?
    `).run(course.title, course.credits, course.department, cid);
  }

  static deleteCourse(cid: string): void {
    db.prepare('DELETE FROM courses WHERE cid = ?').run(cid);
  }

  static getCurriculum(progid: string, level?: number, semester_sid?: string): Curriculum[] {
    let sql = 'SELECT * FROM program_curriculum WHERE progid = ?';
    const params: any[] = [progid];
    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }
    if (semester_sid) {
      sql += ' AND semester_sid = ?';
      params.push(semester_sid);
    }
    return db.prepare(sql).all(...params) as Curriculum[];
  }

  static mountCurriculum(curriculum: Partial<Curriculum>): void {
    db.prepare(`
      INSERT INTO program_curriculum (progid, cid, level, semester_sid, is_elective, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(progid, cid, level, semester_sid) DO UPDATE SET
        is_elective = excluded.is_elective
    `).run(curriculum.progid, curriculum.cid, curriculum.level, curriculum.semester_sid, curriculum.is_elective, curriculum.created_by);
  }

  static unmountCurriculum(progid: string, cid: string, level: number, semester_sid: string): void {
    db.prepare(`
      DELETE FROM program_curriculum 
      WHERE progid = ? AND cid = ? AND level = ? AND semester_sid = ?
    `).run(progid, cid, level, semester_sid);
  }
}
