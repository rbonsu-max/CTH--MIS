import db from '../../../db';
import { AssessmentWindow, AssessmentRequest } from '../../types';

export class AssessmentControlRepository {
  // Windows
  static getWindows(): AssessmentWindow[] {
    return db.prepare('SELECT * FROM assessment_windows ORDER BY created_at DESC').all() as AssessmentWindow[];
  }

  static getActiveWindow(academicYear: string, semesterId: string): AssessmentWindow | undefined {
    const now = new Date().toISOString().split('T')[0];
    return db.prepare(`
      SELECT * FROM assessment_windows 
      WHERE academic_year = ? AND semester_id = ? 
      AND is_active = 1 
      AND start_date <= ? AND end_date >= ?
    `).get(academicYear, semesterId, now, now) as AssessmentWindow;
  }

  static upsertWindow(window: Partial<AssessmentWindow>) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO assessment_windows (id, academic_year, semester_id, start_date, end_date, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(window.id || null, window.academic_year, window.semester_id, window.start_date, window.end_date, window.is_active ? 1 : 0, window.created_by);
  }

  static deleteWindow(id: number) {
    return db.prepare('DELETE FROM assessment_windows WHERE id = ?').run(id);
  }

  // Requests
  static getRequests(status?: string): AssessmentRequest[] {
    let sql = `
      SELECT ar.*, l.name as lecturer_name, c.name as course_name, s.surname || ' ' || s.other_names as student_name
      FROM assessment_requests ar
      JOIN lecturers l ON ar.lid = l.lid
      JOIN courses c ON ar.course_code = c.code
      LEFT JOIN students s ON ar.index_no = s.iid
      ORDER BY ar.created_at DESC
    `;
    if (status) {
      sql = sql.replace('ORDER BY ar.created_at DESC', 'WHERE ar.status = ? ORDER BY ar.created_at DESC');
      return db.prepare(sql).all(status) as AssessmentRequest[];
    }
    return db.prepare(sql).all() as AssessmentRequest[];
  }

  static getLecturerRequests(lid: string): AssessmentRequest[] {
    return db.prepare(`
      SELECT ar.*, c.name as course_name, s.surname || ' ' || s.other_names as student_name
      FROM assessment_requests ar
      JOIN courses c ON ar.course_code = c.code
      LEFT JOIN students s ON ar.index_no = s.iid
      WHERE ar.lid = ?
      ORDER BY ar.created_at DESC
    `).all(lid) as AssessmentRequest[];
  }

  static createRequest(request: Partial<AssessmentRequest>) {
    const stmt = db.prepare(`
      INSERT INTO assessment_requests (lid, course_code, academic_year, semester_id, index_no, request_type, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    return stmt.run(
      request.lid,
      request.course_code,
      request.academic_year || null,
      request.semester_id || null,
      request.index_no || null,
      request.request_type,
      request.reason
    );
  }

  static updateRequestStatus(id: number, status: string, processedBy: string, processedAt: string, expiresAt?: string) {
    const stmt = db.prepare(`
      UPDATE assessment_requests 
      SET status = ?, processed_by = ?, granted_at = ?, expires_at = ?
      WHERE id = ?
    `);
    return stmt.run(status, processedBy, processedAt, expiresAt || null, id);
  }

  static hasGrantedAccess(lid: string, courseCode: string, indexNo?: string): boolean {
    const now = new Date().toISOString();
    let sql = `
      SELECT 1 FROM assessment_requests 
      WHERE lid = ? AND course_code = ? AND status = 'granted'
      AND (expires_at IS NULL OR expires_at > ?)
    `;
    const params = [lid, courseCode, now];
    
    if (indexNo) {
      sql += ' AND (index_no = ? OR index_no IS NULL)';
      params.push(indexNo);
    } else {
      sql += ' AND index_no IS NULL';
    }
    
    return !!db.prepare(sql).get(...params);
  }
}
