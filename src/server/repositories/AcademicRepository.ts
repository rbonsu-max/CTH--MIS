import db from '../../../db';

export interface AcademicYear {
  id: number;
  code: string;
  start_date: string;
  end_date: string;
  is_current: number;
  created_by: string;
  created_at: string;
}

export interface Semester {
  id: number;
  sid: string;
  name: string;
  sort_order: number;
  is_current: number;
  created_by: string;
  created_at: string;
}

export class AcademicRepository {
  static getAllYears(): AcademicYear[] {
    return db.prepare('SELECT * FROM academic_years ORDER BY code DESC').all() as AcademicYear[];
  }

  static getYearByCode(code: string): AcademicYear | undefined {
    return db.prepare('SELECT * FROM academic_years WHERE code = ?').get(code) as AcademicYear;
  }

  static getCurrentYear(): AcademicYear | undefined {
    return db.prepare('SELECT * FROM academic_years WHERE is_current = 1').get() as AcademicYear;
  }

  static createYear(year: Partial<AcademicYear>): void {
    db.prepare(`
      INSERT INTO academic_years (code, start_date, end_date, is_current, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(year.code, year.start_date, year.end_date, year.is_current, year.created_by);
  }

  static updateYear(code: string, year: Partial<AcademicYear>): void {
    db.prepare(`
      UPDATE academic_years 
      SET start_date = ?, end_date = ?, is_current = ?
      WHERE code = ?
    `).run(year.start_date, year.end_date, year.is_current, code);
  }

  static setCurrentYear(code: string): void {
    db.transaction(() => {
      db.prepare('UPDATE academic_years SET is_current = 0').run();
      db.prepare('UPDATE academic_years SET is_current = 1 WHERE code = ?').run(code);
    })();
  }

  static deleteYear(code: string): void {
    db.prepare('DELETE FROM academic_years WHERE code = ?').run(code);
  }

  static getAllSemesters(): Semester[] {
    return db.prepare('SELECT * FROM semesters ORDER BY sort_order ASC').all() as Semester[];
  }

  static getSemesterBySid(sid: string): Semester | undefined {
    return db.prepare('SELECT * FROM semesters WHERE sid = ?').get(sid) as Semester;
  }

  static getCurrentSemester(): Semester | undefined {
    return db.prepare('SELECT * FROM semesters WHERE is_current = 1').get() as Semester;
  }

  static createSemester(semester: Partial<Semester>): void {
    db.prepare(`
      INSERT INTO semesters (sid, name, sort_order, is_current, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(semester.sid, semester.name, semester.sort_order, semester.is_current, semester.created_by);
  }

  static updateSemester(sid: string, semester: Partial<Semester>): void {
    db.prepare(`
      UPDATE semesters 
      SET name = ?, sort_order = ?, is_current = ?
      WHERE sid = ?
    `).run(semester.name, semester.sort_order, semester.is_current, sid);
  }

  static setCurrentSemester(sid: string): void {
    db.transaction(() => {
      db.prepare('UPDATE semesters SET is_current = 0').run();
      db.prepare('UPDATE semesters SET is_current = 1 WHERE sid = ?').run(sid);
    })();
  }

  static deleteSemester(sid: string): void {
    db.prepare('DELETE FROM semesters WHERE sid = ?').run(sid);
  }
}
