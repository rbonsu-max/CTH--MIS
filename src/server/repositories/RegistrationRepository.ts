import db from '../../../db';

export interface RegistrationWindow {
  id: number;
  academic_year: string;
  semester_sid: string;
  start_date: string;
  end_date: string;
  is_active: number;
  created_by: string;
}

export interface CourseRegistration {
  id: number;
  index_no: string;
  course_code: string;
  academic_year: string;
  semester_sid: string;
  registration_date: string;
  status: string;
}

export class RegistrationRepository {
  static getWindows(): RegistrationWindow[] {
    return db.prepare('SELECT * FROM registration_windows ORDER BY academic_year DESC, semester_sid DESC').all() as RegistrationWindow[];
  }

  static getActiveWindow(academic_year: string, semester_sid: string): RegistrationWindow | undefined {
    return db.prepare(`
      SELECT * FROM registration_windows 
      WHERE academic_year = ? AND semester_sid = ? AND is_active = 1
      AND date('now') BETWEEN date(start_date) AND date(end_date)
    `).get(academic_year, semester_sid) as RegistrationWindow;
  }

  static openWindow(window: Partial<RegistrationWindow>): void {
    db.prepare(`
      INSERT INTO registration_windows (academic_year, semester_sid, start_date, end_date, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(window.academic_year, window.semester_sid, window.start_date, window.end_date, window.is_active, window.created_by);
  }

  static closeWindow(id: number): void {
    db.prepare('UPDATE registration_windows SET is_active = 0 WHERE id = ?').run(id);
  }

  static getRegistrations(index_no?: string, academic_year?: string, semester_sid?: string): any[] {
    let sql = `
      SELECT cr.*, 
             s.index_number,
             s.surname, s.other_names, (s.surname || ', ' || s.other_names) as full_name,
             c.name as course_name, c.credit_hours
      FROM course_registrations cr
      LEFT JOIN courses c ON cr.course_code = c.code
      LEFT JOIN students s ON cr.index_no = s.iid
      WHERE 1=1
    `;
    const params: any[] = [];
    if (index_no) {
      sql += ' AND (cr.index_no = ? OR s.index_number = ?)';
      params.push(index_no, index_no);
    }
    if (academic_year) { sql += ' AND cr.academic_year = ?'; params.push(academic_year); }
    if (semester_sid) { sql += ' AND cr.semester_sid = ?'; params.push(semester_sid); }
    
    sql += ' ORDER BY cr.registration_date DESC';
    
    return db.prepare(sql).all(...params) as any[];
  }

  static getLecturerRegistrations(userUid: string, index_no?: string, academic_year?: string, semester_sid?: string, course_code?: string): any[] {
    let sql = `
      SELECT cr.*, 
             s.index_number,
             s.surname, s.other_names, (s.surname || ', ' || s.other_names) as full_name,
             c.name as course_name, c.credit_hours
      FROM course_registrations cr
      JOIN students s ON cr.index_no = s.iid
      JOIN courses c ON cr.course_code = c.code
      JOIN lecturer_course_assignments lca ON cr.course_code = lca.course_code 
           AND cr.academic_year = lca.academic_year 
           AND cr.semester_sid = lca.semester_sid
      JOIN lecturers l ON lca.lid = l.lid
      WHERE l.user_uid = ?
    `;
    const params: any[] = [userUid];
    if (index_no) {
      sql += ' AND (cr.index_no = ? OR s.index_number = ?)';
      params.push(index_no, index_no);
    }
    if (academic_year) { sql += ' AND cr.academic_year = ?'; params.push(academic_year); }
    if (semester_sid) { sql += ' AND cr.semester_sid = ?'; params.push(semester_sid); }
    if (course_code) { sql += ' AND cr.course_code = ?'; params.push(course_code); }
    
    sql += ' ORDER BY cr.registration_date DESC';
    
    return db.prepare(sql).all(...params) as any[];
  }

  static registerCourse(registration: Partial<CourseRegistration>): void {
    db.prepare(`
      INSERT INTO course_registrations (index_no, course_code, academic_year, semester_sid, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(index_no, course_code, academic_year, semester_sid) DO UPDATE SET
        status = excluded.status,
        registration_date = CURRENT_TIMESTAMP
    `).run(registration.index_no, registration.course_code, registration.academic_year, registration.semester_sid, registration.status || 'pending');
  }

  static unregisterCourse(index_no: string, course_code: string, academic_year: string, semester_sid: string): void {
    db.transaction(() => {
      db.prepare(`
        DELETE FROM student_assessments 
        WHERE index_no = ? AND course_code = ? AND academic_year = ? AND semester_id = ?
      `).run(index_no, course_code, academic_year, semester_sid);

      db.prepare(`
        DELETE FROM course_registrations 
        WHERE index_no = ? AND course_code = ? AND academic_year = ? AND semester_sid = ?
      `).run(index_no, course_code, academic_year, semester_sid);
    })();
  }

  static updateRegistrationStatus(id: number, status: string): void {
    db.prepare('UPDATE course_registrations SET status = ? WHERE id = ?').run(status, id);
  }
}
