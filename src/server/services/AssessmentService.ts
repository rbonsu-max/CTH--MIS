import { AssessmentRepository, Assessment, BoardsheetCache } from '../repositories/AssessmentRepository';
import db from '../../../db';

export class AssessmentService {
  static calculateGrade(totalScore: number): { grade: string; grade_point: number } {
    const points = db.prepare('SELECT * FROM grading_points ORDER BY min_score DESC').all() as any[];
    
    for (const p of points) {
      if (totalScore >= p.min_score) {
        return { grade: p.grade, grade_point: p.gp }; // 'gp' in grading_points table
      }
    }
    return { grade: 'F', grade_point: 0.0 };
  }

  static async computeGPA(index_no: string, academicYear: string, semesterId: string): Promise<BoardsheetCache> {
    const assessments = AssessmentRepository.getAssessments(index_no, academicYear, semesterId);
    
    let sCH = 0; // Semester Credit Hours
    let sGP = 0; // Semester Grade Points
    
    for (const ass of assessments) {
      // credit_hours comes from the view_student_results join
      const credits = (ass as any).credit_hours || 0;
      sCH += credits;
      sGP += (credits * ass.grade_point);
    }
    
    const sGPA = sCH > 0 ? parseFloat((sGP / sCH).toFixed(2)) : 0;
    
    // Get cumulative data (previous semesters)
    const previousCaches = db.prepare(`
      SELECT * FROM broadsheet_cache 
      WHERE index_no = ? 
      AND (academic_year < ? OR (academic_year = ? AND semester_id < ?))
      ORDER BY academic_year DESC, semester_id DESC
      LIMIT 1
    `).get(index_no, academicYear, academicYear, semesterId) as BoardsheetCache;
    
    const cCH = (previousCaches?.cCH || 0) + sCH;
    const cGP = (previousCaches?.cGP || 0) + sGP;
    const cGPA = cCH > 0 ? parseFloat((cGP / cCH).toFixed(2)) : 0;
    
    let classification = '';
    if (cGPA >= 3.6) classification = 'First Class';
    else if (cGPA >= 3.0) classification = 'Second Class Upper';
    else if (cGPA >= 2.5) classification = 'Second Class Lower';
    else if (cGPA >= 2.0) classification = 'Third Class';
    else if (cGPA >= 1.0) classification = 'Pass';
    else classification = 'Fail';

    // Retrieve student info for level and progid
    const student = db.prepare('SELECT current_level, progid FROM students WHERE iid = ?').get(index_no) as any;

    const cache: Partial<BoardsheetCache> = {
      index_no,
      academic_year: academicYear,
      level: student?.current_level?.toString() || '100',
      semester_id: semesterId,
      progid: student?.progid || '',
      sCH,
      sGP,
      sGPA,
      cCH,
      cGP,
      cGPA,
      class: classification
    };
    
    AssessmentRepository.saveBoardsheetCache(cache);
    return cache as BoardsheetCache;
  }

  static async bulkComputeGPA(academicYear: string, semesterId: string): Promise<void> {
    const students = db.prepare(`
      SELECT DISTINCT index_no FROM student_assessments 
      WHERE academic_year = ? AND semester_id = ?
    `).all(academicYear, semesterId) as { index_no: string }[];
    
    for (const student of students) {
      await this.computeGPA(student.index_no, academicYear, semesterId);
    }
  }
}
