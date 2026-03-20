import { AssessmentRepository, Assessment, BoardsheetCache } from '../repositories/AssessmentRepository';
import db from '../../../db';

export class AssessmentService {
  static calculateGrade(totalScore: number): { grade: string; gp: number } {
    if (totalScore >= 80) return { grade: 'A', gp: 4.0 };
    if (totalScore >= 75) return { grade: 'B+', gp: 3.5 };
    if (totalScore >= 70) return { grade: 'B', gp: 3.0 };
    if (totalScore >= 65) return { grade: 'C+', gp: 2.5 };
    if (totalScore >= 60) return { grade: 'C', gp: 2.0 };
    if (totalScore >= 55) return { grade: 'D+', gp: 1.5 };
    if (totalScore >= 50) return { grade: 'D', gp: 1.0 };
    return { grade: 'F', gp: 0.0 };
  }

  static async computeGPA(iid: string, academicYear: string, semesterSid: string): Promise<BoardsheetCache> {
    // 1. Get all assessments for this student in this period
    const assessments = AssessmentRepository.getAssessments(iid, academicYear, semesterSid);
    
    let tcr = 0; // Total Credit Registered
    let tcp = 0; // Total Credit Points (credits * gp)
    
    for (const ass of assessments) {
      tcr += ass.credits;
      tcp += (ass.credits * ass.gp);
    }
    
    const gpa = tcr > 0 ? parseFloat((tcp / tcr).toFixed(2)) : 0;
    
    // 2. Get cumulative data (previous semesters)
    const previousCaches = db.prepare(`
      SELECT * FROM boardsheet_cache 
      WHERE iid = ? 
      AND (academic_year < ? OR (academic_year = ? AND semester_sid < ?))
      ORDER BY academic_year DESC, semester_sid DESC
      LIMIT 1
    `).get(iid, academicYear, academicYear, semesterSid) as BoardsheetCache;
    
    const ctcr = (previousCaches?.ctcr || 0) + tcr;
    const ctcp = (previousCaches?.ctcp || 0) + tcp;
    const cgpa = ctcr > 0 ? parseFloat((ctcp / ctcr).toFixed(2)) : 0;
    
    // 3. Determine class award if it's the final semester (this logic can be more complex)
    let remarks = '';
    if (cgpa >= 3.6) remarks = 'First Class';
    else if (cgpa >= 3.0) remarks = 'Second Class Upper';
    else if (cgpa >= 2.5) remarks = 'Second Class Lower';
    else if (cgpa >= 2.0) remarks = 'Third Class';
    else if (cgpa >= 1.0) remarks = 'Pass';
    else remarks = 'Fail';

    const cache: Partial<BoardsheetCache> = {
      iid,
      academic_year: academicYear,
      semester_sid: semesterSid,
      tcr,
      tcp,
      gpa,
      ctcr,
      ctcp,
      cgpa,
      remarks
    };
    
    AssessmentRepository.saveBoardsheetCache(cache);
    return cache as BoardsheetCache;
  }

  static async bulkComputeGPA(academicYear: string, semesterSid: string): Promise<void> {
    const students = db.prepare(`
      SELECT DISTINCT iid FROM student_assessments 
      WHERE academic_year = ? AND semester_sid = ?
    `).all(academicYear, semesterSid) as { iid: string }[];
    
    for (const student of students) {
      await this.computeGPA(student.iid, academicYear, semesterSid);
    }
  }
}
