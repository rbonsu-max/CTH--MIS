import db from '../../../db';

export interface AcademicYear {
  id: number;
  code: string;
  date_from: string;
  date_to: string;
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
    const years = db.prepare('SELECT * FROM academic_years').all() as AcademicYear[];
    const extractStartYear = (code: string) => {
      const match = String(code || '').match(/(\d{4})/);
      return match ? Number.parseInt(match[1], 10) : Number.MIN_SAFE_INTEGER;
    };
    const getYearShapeRank = (code: string) => {
      if (/^\d{4}\/\d{4}$/.test(code)) return 3;
      if (/^\d{4}$/.test(code)) return 2;
      if (/\d{4}/.test(code)) return 1;
      return 0;
    };

    return years.sort((left, right) => {
      if (left.is_current !== right.is_current) return right.is_current - left.is_current;

      const shapeDiff = getYearShapeRank(right.code) - getYearShapeRank(left.code);
      if (shapeDiff !== 0) return shapeDiff;

      const startDiff = extractStartYear(right.code) - extractStartYear(left.code);
      if (startDiff !== 0) return startDiff;

      return right.code.localeCompare(left.code);
    });
  }

  static getYearByCode(code: string): AcademicYear | undefined {
    return db.prepare('SELECT * FROM academic_years WHERE code = ?').get(code) as AcademicYear;
  }

  static getCurrentYear(): AcademicYear | undefined {
    return db.prepare('SELECT * FROM academic_years WHERE is_current = 1').get() as AcademicYear;
  }

  static createYear(year: Partial<AcademicYear>): void {
    db.prepare(`
      INSERT INTO academic_years (code, date_from, date_to, is_current, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(year.code, year.date_from, year.date_to, year.is_current, year.created_by);
  }

  static updateYear(code: string, year: Partial<AcademicYear>): void {
    const nextCode = year.code?.trim();

    db.transaction(() => {
      if (nextCode && nextCode !== code) {
        db.pragma('defer_foreign_keys = ON');

        db.prepare(`
          UPDATE academic_years
          SET code = ?
          WHERE code = ?
        `).run(nextCode, code);

        const dependentTables = [
          ['students', 'admission_year'],
          ['student_levels', 'academic_year'],
          ['lecturer_course_assignments', 'academic_year'],
          ['registration_windows', 'academic_year'],
          ['course_registrations', 'academic_year'],
          ['student_assessments', 'academic_year'],
          ['assessment_windows', 'academic_year'],
          ['assessment_requests', 'academic_year'],
          ['broadsheet_cache', 'academic_year'],
          ['calendar_events', 'academic_year'],
        ] as const;

        for (const [table, column] of dependentTables) {
          db.prepare(`
            UPDATE ${table}
            SET ${column} = ?
            WHERE ${column} = ?
          `).run(nextCode, code);
        }
      }

      db.prepare(`
        UPDATE academic_years 
        SET date_from = ?, date_to = ?, is_current = ?
        WHERE code = ?
      `).run(year.date_from, year.date_to, year.is_current, nextCode || code);
    })();
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
