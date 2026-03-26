import db from '../../../db';

export interface Assessment {
  id: number;
  index_no: string;
  course_code: string;
  academic_year: string;
  level: string;
  semester_id: string;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  total_ca: number;
  exam_score: number;
  total_score: number;
  grade: string;
  grade_point: number;
  weighted_gp: number;
  entered_by: string;
  updated_at: string;
  index_number?: string;
  surname?: string;
  other_names?: string;
  progid?: string;
  course_name?: string;
  credit_hours?: number;
}

export interface BoardsheetCache {
  id: number;
  index_no: string;
  academic_year: string;
  level: string;
  semester_id: string;
  progid: string;
  sCH: number;
  sGP: number;
  sGPA: number;
  cCH: number;
  cGP: number;
  cGPA: number;
  class: string;
  calculated_at: string;
}

export interface BroadsheetSummarySourceRow {
  index_no: string;
  academic_year: string;
  level: string;
  semester_id: string;
  progid: string;
  sCH: number | null;
  sGP: number | null;
  sGPA: number | null;
  cCH: number | null;
  cGP: number | null;
  cGPA: number | null;
  class: string | null;
  index_number: string;
  surname: string;
  other_names: string;
}

export class AssessmentRepository {
  static getAssessments(index_no: string, academic_year: string, semester_id: string): Assessment[] {
    return db.prepare(`
      SELECT * FROM view_student_results 
      WHERE index_no = ? AND academic_year = ? AND semester_id = ?
    `).all(index_no, academic_year, semester_id) as Assessment[];
  }

  static getCourseAssessments(course_code: string, academic_year: string, semester_id: string): Assessment[] {
    return db.prepare(`
      SELECT * FROM view_student_results 
      WHERE course_code = ? AND academic_year = ? AND semester_id = ?
    `).all(course_code, academic_year, semester_id) as Assessment[];
  }

  static getSpecificResult(index_no: string, course_code: string, academic_year: string, semester_id: string): Assessment | undefined {
    return db.prepare(`
      SELECT * FROM student_assessments 
      WHERE index_no = ? AND course_code = ? AND academic_year = ? AND semester_id = ?
    `).get(index_no, course_code, academic_year, semester_id) as Assessment;
  }

  static getPeriodAssessments(academic_year: string, semester_id: string): Assessment[] {
    return db.prepare(`
      SELECT * FROM view_student_results 
      WHERE academic_year = ? AND semester_id = ?
    `).all(academic_year, semester_id) as Assessment[];
  }

  static saveAssessment(assessment: Partial<Assessment>): void {
    db.prepare(`
      INSERT INTO student_assessments (index_no, course_code, academic_year, level, semester_id, a1, a2, a3, a4, total_ca, exam_score, total_score, grade, grade_point, weighted_gp, entered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(index_no, course_code, academic_year, semester_id) DO UPDATE SET
        a1 = excluded.a1,
        a2 = excluded.a2,
        a3 = excluded.a3,
        a4 = excluded.a4,
        total_ca = excluded.total_ca,
        exam_score = excluded.exam_score,
        total_score = excluded.total_score,
        grade = excluded.grade,
        grade_point = excluded.grade_point,
        weighted_gp = excluded.weighted_gp,
        entered_by = excluded.entered_by,
        updated_at = CURRENT_TIMESTAMP
    `).run(assessment.index_no, assessment.course_code, assessment.academic_year, assessment.level || '100', assessment.semester_id, assessment.a1 || 0, assessment.a2 || 0, assessment.a3 || 0, assessment.a4 || 0, assessment.total_ca, assessment.exam_score, assessment.total_score, assessment.grade, assessment.grade_point, assessment.weighted_gp, assessment.entered_by);
  }

  static getBoardsheetCache(index_no: string, academic_year: string, semester_id: string): BoardsheetCache | undefined {
    return db.prepare(`
      SELECT * FROM broadsheet_cache 
      WHERE index_no = ? AND academic_year = ? AND semester_id = ?
    `).get(index_no, academic_year, semester_id) as BoardsheetCache;
  }

  static saveBoardsheetCache(cache: Partial<BoardsheetCache>): void {
    db.prepare(`
      INSERT INTO broadsheet_cache (index_no, academic_year, level, semester_id, progid, sCH, sGP, sGPA, cCH, cGP, cGPA, class)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(index_no, academic_year, semester_id) DO UPDATE SET
        level = excluded.level,
        progid = excluded.progid,
        sCH = excluded.sCH,
        sGP = excluded.sGP,
        sGPA = excluded.sGPA,
        cCH = excluded.cCH,
        cGP = excluded.cGP,
        cGPA = excluded.cGPA,
        class = excluded.class,
        calculated_at = CURRENT_TIMESTAMP
    `).run(cache.index_no, cache.academic_year, cache.level || '100', cache.semester_id, cache.progid, cache.sCH, cache.sGP, cache.sGPA, cache.cCH, cache.cGP, cache.cGPA, cache.class);
  }

  static getStudentFullHistory(index_no: string): Assessment[] {
    return db.prepare(`
      SELECT vsr.*
      FROM view_student_results vsr
      LEFT JOIN semesters sem ON sem.sid = vsr.semester_id
      WHERE vsr.index_no = ?
      ORDER BY CAST(substr(vsr.academic_year, 1, 4) AS INTEGER) ASC, COALESCE(sem.sort_order, 999) ASC, vsr.course_code ASC
    `).all(index_no) as Assessment[];
  }

  static getStudentAllCaches(index_no: string): BoardsheetCache[] {
    return db.prepare(`
      SELECT bc.*
      FROM broadsheet_cache bc
      LEFT JOIN semesters sem ON sem.sid = bc.semester_id
      WHERE bc.index_no = ?
      ORDER BY CAST(substr(bc.academic_year, 1, 4) AS INTEGER) ASC, COALESCE(sem.sort_order, 999) ASC
    `).all(index_no) as BoardsheetCache[];
  }

  static getBroadsheetSummaryRows(academic_year: string, progid?: string, level?: string): BroadsheetSummarySourceRow[] {
    const filters: string[] = ['bc.academic_year = ?'];
    const params: Array<string> = [academic_year];

    if (progid) {
      filters.push('bc.progid = ?');
      params.push(progid);
    }

    if (level) {
      filters.push('bc.level = ?');
      params.push(level);
    }

    return db.prepare(`
      SELECT
        bc.index_no,
        bc.academic_year,
        bc.level,
        bc.semester_id,
        bc.progid,
        bc.sCH,
        bc.sGP,
        bc.sGPA,
        bc.cCH,
        bc.cGP,
        bc.cGPA,
        bc.class,
        s.index_number,
        s.surname,
        s.other_names
      FROM broadsheet_cache bc
      JOIN students s ON s.iid = bc.index_no
      WHERE ${filters.join(' AND ')}
      ORDER BY s.surname ASC, s.other_names ASC, bc.semester_id ASC
    `).all(...params) as BroadsheetSummarySourceRow[];
  }
}
