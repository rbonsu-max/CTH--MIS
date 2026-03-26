import { AssessmentRepository, Assessment, BoardsheetCache } from '../repositories/AssessmentRepository';
import db from '../../../db';

export class AssessmentService {
  private static getSemesterSortMap(): Map<string, number> {
    const rows = db.prepare('SELECT sid, sort_order FROM semesters').all() as Array<{ sid: string; sort_order: number | null }>;
    return new Map(rows.map((row) => [row.sid, row.sort_order ?? Number.MAX_SAFE_INTEGER]));
  }

  private static extractAcademicYearStart(code: string): number {
    const match = code.match(/(\d{4})/);
    return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  }

  private static comparePeriods(
    left: Pick<Assessment, 'academic_year' | 'semester_id'>,
    right: Pick<Assessment, 'academic_year' | 'semester_id'>,
    semesterSortMap: Map<string, number>
  ): number {
    const yearDiff = this.extractAcademicYearStart(left.academic_year) - this.extractAcademicYearStart(right.academic_year);
    if (yearDiff !== 0) return yearDiff;

    const leftSemesterOrder = semesterSortMap.get(left.semester_id) ?? Number.MAX_SAFE_INTEGER;
    const rightSemesterOrder = semesterSortMap.get(right.semester_id) ?? Number.MAX_SAFE_INTEGER;
    if (leftSemesterOrder !== rightSemesterOrder) return leftSemesterOrder - rightSemesterOrder;

    return left.semester_id.localeCompare(right.semester_id);
  }

  static getClassification(cGPA: number): string {
    if (cGPA >= 3.6) return 'First Class';
    if (cGPA >= 3.0) return 'Second Class Upper';
    if (cGPA >= 2.5) return 'Second Class Lower';
    if (cGPA >= 2.0) return 'Third Class';
    if (cGPA >= 1.0) return 'Pass';
    return 'Fail';
  }

  static getAssessmentQualityPoints(assessment: Assessment): number {
    const credits = Number(assessment.credit_hours) || 0;
    const gradePoint = Number(assessment.grade_point) || 0;
    const weightedGp = Number(assessment.weighted_gp) || 0;
    const plausibleWeightedMax = credits * 4;

    // Newer records store weighted_gp as credit_hours * raw grade point.
    if (credits > 0 && weightedGp > 0 && weightedGp <= plausibleWeightedMax + 0.0001) {
      return weightedGp;
    }

    // Imported records may already store the weighted quality points in grade_point.
    if (gradePoint > 4.0001) {
      return gradePoint;
    }

    // Standard raw grade point fallback.
    if (credits > 0 && gradePoint > 0) {
      return credits * gradePoint;
    }

    return 0;
  }

  static buildStudentCaches(
    index_no: string,
    assessments: Assessment[],
    options?: { level?: string; progid?: string; existingCaches?: BoardsheetCache[] }
  ): BoardsheetCache[] {
    if (assessments.length === 0) {
      return [...(options?.existingCaches ?? [])];
    }

    const semesterSortMap = this.getSemesterSortMap();
    const grouped = new Map<string, Assessment[]>();

    for (const assessment of assessments) {
      const key = `${assessment.academic_year}__${assessment.semester_id}`;
      const currentGroup = grouped.get(key) ?? [];
      currentGroup.push(assessment);
      grouped.set(key, currentGroup);
    }

    const orderedPeriods = Array.from(grouped.entries())
      .map(([key, periodAssessments]) => {
        const [academic_year, semester_id] = key.split('__');
        return { academic_year, semester_id, assessments: periodAssessments };
      })
      .sort((left, right) => this.comparePeriods(left, right, semesterSortMap));

    let cumulativeCH = 0;
    let cumulativeGP = 0;
    const existingCacheMap = new Map(
      (options?.existingCaches ?? []).map((cache) => [`${cache.academic_year}__${cache.semester_id}`, cache])
    );

    return orderedPeriods.map((period) => {
      const sCH = period.assessments.reduce((sum, item) => sum + (Number(item.credit_hours) || 0), 0);
      const sGP = Number(
        period.assessments.reduce((sum, item) => sum + this.getAssessmentQualityPoints(item), 0).toFixed(4)
      );
      const sGPA = Number((sCH > 0 ? sGP / sCH : 0).toFixed(4));

      cumulativeCH += sCH;
      cumulativeGP += sGP;
      const cCH = Number(cumulativeCH.toFixed(4));
      const cGP = Number(cumulativeGP.toFixed(4));
      const cGPA = Number((cCH > 0 ? cGP / cCH : 0).toFixed(4));

      const periodLevel = period.assessments
        .map((item) => item.level)
        .find((value) => Boolean(value)) || options?.level || '100';

      const periodProgid = period.assessments
        .map((item) => item.progid)
        .find((value) => Boolean(value)) || options?.progid || '';

      const existingCache = existingCacheMap.get(`${period.academic_year}__${period.semester_id}`);

      return {
        id: existingCache?.id ?? 0,
        index_no,
        academic_year: period.academic_year,
        level: periodLevel,
        semester_id: period.semester_id,
        progid: periodProgid,
        sCH,
        sGP,
        sGPA,
        cCH,
        cGP,
        cGPA,
        class: this.getClassification(cGPA),
        calculated_at: existingCache?.calculated_at ?? new Date().toISOString(),
      };
    });
  }

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
    const student = db.prepare('SELECT current_level, progid FROM students WHERE iid = ?').get(index_no) as any;
    const existingCaches = AssessmentRepository.getStudentAllCaches(index_no);
    const fullHistory = AssessmentRepository.getStudentFullHistory(index_no);
    const caches = this.buildStudentCaches(index_no, fullHistory, {
      level: student?.current_level?.toString() || '100',
      progid: student?.progid || '',
      existingCaches,
    });
    const cache = caches.find((item) => item.academic_year === academicYear && item.semester_id === semesterId);

    if (!cache && assessments.length === 0) {
      throw new Error('No assessments found for the selected student and semester');
    }

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

  static getAcademicYearAssessmentPeriodCount(academicYear: string): number {
    const row = db.prepare(`
      SELECT COUNT(*) AS total
      FROM (
        SELECT index_no, semester_id
        FROM student_assessments
        WHERE academic_year = ?
        GROUP BY index_no, semester_id
      )
    `).get(academicYear) as { total: number };

    return row?.total || 0;
  }

  static getAcademicYearCachePeriodCount(academicYear: string): number {
    const row = db.prepare(`
      SELECT COUNT(*) AS total
      FROM broadsheet_cache
      WHERE academic_year = ?
    `).get(academicYear) as { total: number };

    return row?.total || 0;
  }

  static async syncBroadsheetCacheForAcademicYear(academicYear: string): Promise<number> {
    const students = db.prepare(`
      SELECT DISTINCT index_no
      FROM student_assessments
      WHERE academic_year = ?
    `).all(academicYear) as Array<{ index_no: string }>;

    let savedCount = 0;

    for (const student of students) {
      const studentMeta = db.prepare(`
        SELECT current_level, progid
        FROM students
        WHERE iid = ?
      `).get(student.index_no) as { current_level?: number; progid?: string } | undefined;

      const existingCaches = AssessmentRepository.getStudentAllCaches(student.index_no);
      const fullHistory = AssessmentRepository.getStudentFullHistory(student.index_no);
      const caches = this.buildStudentCaches(student.index_no, fullHistory, {
        level: studentMeta?.current_level?.toString() || '100',
        progid: studentMeta?.progid || '',
        existingCaches,
      });

      for (const cache of caches) {
        if (cache.academic_year !== academicYear) continue;
        AssessmentRepository.saveBoardsheetCache(cache);
        savedCount += 1;
      }
    }

    return savedCount;
  }
}
