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
  iid: string;
  cid: string;
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

  static getRegistrations(iid: string, academic_year: string, semester_sid: string): CourseRegistration[] {
    return db.prepare(`
      SELECT * FROM course_registrations 
      WHERE iid = ? AND academic_year = ? AND semester_sid = ?
    `).all(iid, academic_year, semester_sid) as CourseRegistration[];
  }

  static registerCourse(registration: Partial<CourseRegistration>): void {
    db.prepare(`
      INSERT INTO course_registrations (iid, cid, academic_year, semester_sid, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(iid, cid, academic_year, semester_sid) DO UPDATE SET
        status = excluded.status,
        registration_date = CURRENT_TIMESTAMP
    `).run(registration.iid, registration.cid, registration.academic_year, registration.semester_sid, registration.status || 'pending');
  }

  static unregisterCourse(iid: string, cid: string, academic_year: string, semester_sid: string): void {
    db.prepare(`
      DELETE FROM course_registrations 
      WHERE iid = ? AND cid = ? AND academic_year = ? AND semester_sid = ?
    `).run(iid, cid, academic_year, semester_sid);
  }

  static updateRegistrationStatus(id: number, status: string): void {
    db.prepare('UPDATE course_registrations SET status = ? WHERE id = ?').run(status, id);
  }
}
