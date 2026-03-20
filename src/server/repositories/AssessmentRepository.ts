import db from '../../../db';

export interface Assessment {
  id: number;
  iid: string;
  cid: string;
  academic_year: string;
  semester_sid: string;
  class_score: number;
  exam_score: number;
  total_score: number;
  grade: string;
  gp: number;
  credits: number;
  entered_by: string;
  updated_at: string;
}

export interface BoardsheetCache {
  id: number;
  iid: string;
  academic_year: string;
  semester_sid: string;
  tcr: number;
  tcp: number;
  gpa: number;
  ctcr: number;
  ctcp: number;
  cgpa: number;
  remarks: string;
  calculated_at: string;
}

export class AssessmentRepository {
  static getAssessments(iid: string, academic_year: string, semester_sid: string): Assessment[] {
    return db.prepare(`
      SELECT * FROM view_student_results 
      WHERE iid = ? AND academic_year = ? AND semester_sid = ?
    `).all(iid, academic_year, semester_sid) as Assessment[];
  }

  static getCourseAssessments(cid: string, academic_year: string, semester_sid: string): Assessment[] {
    return db.prepare(`
      SELECT * FROM view_student_results 
      WHERE cid = ? AND academic_year = ? AND semester_sid = ?
    `).all(cid, academic_year, semester_sid) as Assessment[];
  }

  static saveAssessment(assessment: Partial<Assessment>): void {
    db.prepare(`
      INSERT INTO student_assessments (iid, cid, academic_year, semester_sid, class_score, exam_score, grade, gp, entered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(iid, cid, academic_year, semester_sid) DO UPDATE SET
        class_score = excluded.class_score,
        exam_score = excluded.exam_score,
        grade = excluded.grade,
        gp = excluded.gp,
        entered_by = excluded.entered_by,
        updated_at = CURRENT_TIMESTAMP
    `).run(assessment.iid, assessment.cid, assessment.academic_year, assessment.semester_sid, assessment.class_score, assessment.exam_score, assessment.grade, assessment.gp, assessment.entered_by);
  }

  static getBoardsheetCache(iid: string, academic_year: string, semester_sid: string): BoardsheetCache | undefined {
    return db.prepare(`
      SELECT * FROM boardsheet_cache 
      WHERE iid = ? AND academic_year = ? AND semester_sid = ?
    `).get(iid, academic_year, semester_sid) as BoardsheetCache;
  }

  static saveBoardsheetCache(cache: Partial<BoardsheetCache>): void {
    db.prepare(`
      INSERT INTO boardsheet_cache (iid, academic_year, semester_sid, tcr, tcp, gpa, ctcr, ctcp, cgpa, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(iid, academic_year, semester_sid) DO UPDATE SET
        tcr = excluded.tcr,
        tcp = excluded.tcp,
        gpa = excluded.gpa,
        ctcr = excluded.ctcr,
        ctcp = excluded.ctcp,
        cgpa = excluded.cgpa,
        remarks = excluded.remarks,
        calculated_at = CURRENT_TIMESTAMP
    `).run(cache.iid, cache.academic_year, cache.semester_sid, cache.tcr, cache.tcp, cache.gpa, cache.ctcr, cache.ctcp, cache.cgpa, cache.remarks);
  }

  static getStudentFullHistory(iid: string): Assessment[] {
    return db.prepare(`
      SELECT * FROM view_student_results 
      WHERE iid = ?
      ORDER BY academic_year ASC, semester_sid ASC
    `).all(iid) as Assessment[];
  }

  static getStudentAllCaches(iid: string): BoardsheetCache[] {
    return db.prepare(`
      SELECT * FROM boardsheet_cache 
      WHERE iid = ?
      ORDER BY academic_year ASC, semester_sid ASC
    `).all(iid) as BoardsheetCache[];
  }
}
