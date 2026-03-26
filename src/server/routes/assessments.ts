import express from 'express';
import { AssessmentRepository } from '../repositories/AssessmentRepository';
import { AssessmentService } from '../services/AssessmentService';
import { AssessmentControlRepository } from '../repositories/AssessmentControlRepository';
import { NotificationService } from '../services/NotificationService';
import db from '../../../db';

const router = express.Router();

const normalizeBroadsheetClass = (rawClass: string | null | undefined, cGPA: number | null | undefined): string | null => {
  if (typeof cGPA === 'number') {
    const computed = AssessmentService.getClassification(cGPA);
    if (computed === 'Second Class Upper') return '2nd Class (Upper Division)';
    if (computed === 'Second Class Lower') return '2nd Class (Lower Division)';
    if (computed === 'Third Class') return '3rd Class Division';
    return computed;
  }

  if (!rawClass) return null;

  const sanitized = rawClass
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/first class/i.test(sanitized)) return 'First Class';
  if (/second class upper|2nd class \(upper division\)|2nd class upper/i.test(sanitized)) return '2nd Class (Upper Division)';
  if (/second class lower|2nd class \(lower division\)|2nd class lower/i.test(sanitized)) return '2nd Class (Lower Division)';
  if (/third class|3rd class/i.test(sanitized)) return '3rd Class Division';
  return sanitized;
};

router.get('/', (req, res) => {
  const { index_no, course_code, academic_year, semester_id } = req.query;
  const user = (req as any).user;

  // Security for Lecturers
  if (user.role === 'Lecturer' && course_code) {
    const isAssigned = db.prepare('SELECT 1 FROM lecturer_course_assignments lca JOIN lecturers l ON lca.lid = l.lid WHERE l.user_uid = ? AND lca.course_code = ?').get(user.uid, course_code);
    if (!isAssigned) return res.status(403).json({ error: 'You are not assigned to this course' });
  }

  if (academic_year && semester_id && !course_code && !index_no) {
    const assessments = AssessmentRepository.getPeriodAssessments(academic_year as string, semester_id as string);
    return res.json(assessments);
  }
  if (index_no && academic_year && semester_id) {
    const assessments = AssessmentRepository.getAssessments(index_no as string, academic_year as string, semester_id as string);
    return res.json(assessments);
  }
  if (course_code && academic_year && semester_id) {
    const assessments = AssessmentRepository.getCourseAssessments(course_code as string, academic_year as string, semester_id as string);
    return res.json(assessments);
  }
  if (index_no) {
    const assessments = AssessmentRepository.getStudentFullHistory(index_no as string);
    return res.json(assessments);
  }
  res.json([]);
});

router.post('/', async (req, res) => {
  const { index_no, course_code, academic_year, semester_id, a1, a2, a3, a4, exam_score } = req.body;
  const user = (req as any).user;

  // Security for Lecturers
  if (user.role === 'Lecturer') {
    const isAssigned = db.prepare('SELECT 1 FROM lecturer_course_assignments lca JOIN lecturers l ON lca.lid = l.lid WHERE l.user_uid = ? AND lca.course_code = ?').get(user.uid, course_code);
    if (!isAssigned) return res.status(403).json({ error: 'You are not authorized to enter assessments for this course' });
  }

  // --- Assessment Window & Request Validation ---
  const isSuperAdmin = user.role === 'SuperAdmin';
  if (!isSuperAdmin) {
    const activeWindow = AssessmentControlRepository.getActiveWindow(academic_year, semester_id);
    const existingResult = AssessmentRepository.getSpecificResult(index_no, course_code, academic_year, semester_id);
    
    let lecturerLid = null;
    if (user.role === 'Lecturer') {
      const lecturer = db.prepare('SELECT lid FROM lecturers WHERE user_uid = ?').get(user.uid) as any;
      lecturerLid = lecturer?.lid;
    }

    const hasAccess = activeWindow || (lecturerLid && AssessmentControlRepository.hasGrantedAccess(lecturerLid, course_code, index_no));

    if (existingResult) {
      // It's an EDIT - always requires specific request if not SuperAdmin
      if (!lecturerLid || !AssessmentControlRepository.hasGrantedAccess(lecturerLid, course_code, index_no)) {
        return res.status(403).json({ error: 'Editing existing results requires SuperAdmin approval. Please request access.' });
      }
    } else {
      // It's a NEW upload - requires window OR request
      if (!hasAccess) {
        return res.status(403).json({ error: 'Assessment upload window is closed. Please request access from SuperAdmin.' });
      }
    }
  }
  // ----------------------------------------------

  const total_ca = (a1 || 0) + (a2 || 0) + (a3 || 0) + (a4 || 0);
  const total_score = total_ca + (exam_score || 0);
  const { grade, grade_point } = AssessmentService.calculateGrade(total_score);

  try {
    const course = db.prepare('SELECT credit_hours FROM courses WHERE code = ?').get(course_code) as any;
    const credit_hours = course ? course.credit_hours : 0;
    const weighted_gp = grade_point * credit_hours;

    AssessmentRepository.saveAssessment({ 
      index_no, course_code, academic_year, semester_id, 
      a1, a2, a3, a4, total_ca, exam_score, total_score, grade, grade_point, weighted_gp, 
      entered_by: user.uid 
    });
    
    // Auto-compute GPA for this student
    await AssessmentService.computeGPA(index_no, academic_year, semester_id);

    NotificationService.notifySuperAdmins(
      'assessment_uploaded',
      'Assessment uploaded',
      `${user.name} uploaded or updated results for ${course_code} (${academic_year} ${semester_id}) for student ${index_no}.`,
      { index_no, course_code, academic_year, semester_id, actor_uid: user.uid }
    );
    
    res.status(201).json({ index_no, course_code, ...req.body, total_ca, total_score, grade, grade_point, weighted_gp });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/broadsheet', (req, res) => {
  const { index_no, academic_year, semester_id } = req.query;
  if (!index_no || !academic_year || !semester_id) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }
  const cache = AssessmentRepository.getBoardsheetCache(index_no as string, academic_year as string, semester_id as string);
  res.json(cache);
});

router.get('/broadsheet-summary', async (req, res) => {
  const academic_year = typeof req.query.academic_year === 'string' ? req.query.academic_year : '';
  const progid = typeof req.query.progid === 'string' ? req.query.progid : undefined;
  const level = typeof req.query.level === 'string' ? req.query.level : undefined;

  if (!academic_year) {
    return res.status(400).json({ error: 'academic_year is required' });
  }

  try {
    const expectedPeriodCount = AssessmentService.getAcademicYearAssessmentPeriodCount(academic_year);
    const cachedPeriodCount = AssessmentService.getAcademicYearCachePeriodCount(academic_year);

    if (expectedPeriodCount > 0 && cachedPeriodCount < expectedPeriodCount) {
      await AssessmentService.syncBroadsheetCacheForAcademicYear(academic_year);
    }

    const semesterRows = db.prepare(`
      SELECT sid, name, sort_order
      FROM semesters
      ORDER BY COALESCE(sort_order, 999), name ASC
    `).all() as Array<{ sid: string; name: string; sort_order: number | null }>;
    const semesterOrderMap = new Map(semesterRows.map((semester) => [semester.sid, semester.sort_order ?? Number.MAX_SAFE_INTEGER]));

    const rows = AssessmentRepository.getBroadsheetSummaryRows(academic_year, progid, level);
    const grouped = new Map<string, any>();
    const yearStart = (value: string) => {
      const match = value.match(/(\d{4})/);
      return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const comparePeriods = (
      left: { academic_year: string; semester_id: string },
      right: { academic_year: string; semester_id: string }
    ) => {
      const yearDiff = yearStart(left.academic_year) - yearStart(right.academic_year);
      if (yearDiff !== 0) return yearDiff;
      const leftOrder = semesterOrderMap.get(left.semester_id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = semesterOrderMap.get(right.semester_id) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.semester_id.localeCompare(right.semester_id);
    };

    for (const row of rows) {
      const normalizedClass = normalizeBroadsheetClass(row.class, row.cGPA);
      if (!grouped.has(row.index_no)) {
        const firstName = (row.other_names || '').trim().split(/\s+/).filter(Boolean)[0] || row.other_names || '';
        grouped.set(row.index_no, {
          index_no: row.index_no,
          index_number: row.index_number,
          surname: row.surname || '',
          first_name: firstName,
          other_names: row.other_names || '',
          progid: row.progid,
          level: row.level,
          class: normalizedClass,
          latest_period: { academic_year: row.academic_year, semester_id: row.semester_id },
          semesters: {},
        });
      }

      const entry = grouped.get(row.index_no);
      entry.level = row.level || entry.level;
      entry.progid = row.progid || entry.progid;

      const currentPeriod = { academic_year: row.academic_year, semester_id: row.semester_id };
      if (!entry.latest_period || comparePeriods(currentPeriod, entry.latest_period) >= 0) {
        entry.latest_period = currentPeriod;
        entry.class = normalizedClass || entry.class;
      }

      entry.semesters[row.semester_id] = {
        semester_id: row.semester_id,
        semester_name: semesterRows.find((semester) => semester.sid === row.semester_id)?.name || row.semester_id,
        sCH: row.sCH,
        sGP: row.sGP,
        sGPA: row.sGPA,
        cCH: row.cCH,
        cGP: row.cGP,
        cGPA: row.cGPA,
        class: normalizedClass,
      };
    }

    res.json({
      semesters: semesterRows,
      data: Array.from(grouped.values()).map(({ latest_period, ...entry }) => entry),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/compute-gpa', async (req, res) => {
  const { academic_year, semester_id } = req.body;
  try {
    await AssessmentService.bulkComputeGPA(academic_year, semester_id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/graduation-list', (req, res) => {
  const { progid, admission_year } = req.query;
  if (!progid || !admission_year) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const program = db.prepare('SELECT duration, name FROM programs WHERE progid = ?').get(progid as string) as any;
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const currentYearRow = db.prepare('SELECT code FROM academic_years WHERE is_current = 1').get() as any;
    if (!currentYearRow) {
      return res.status(400).json({ error: 'No active academic year set in system' });
    }

    const extractYear = (code: string) => {
      const match = code.match(/(\d{4})/);
      return match ? parseInt(match[1]) : NaN;
    };
    const admYearStart = extractYear(admission_year as string);
    const curYearStart = extractYear(currentYearRow.code);
    const yearsSpent = (curYearStart - admYearStart) + 1;

    if (yearsSpent < program.duration) {
      return res.status(400).json({ 
        error: `Duration error: ${program.name} requires ${program.duration} years. This cohort is in year ${yearsSpent}.` 
      });
    }

    const students = db.prepare(`
      SELECT 
        s.iid as index_no, 
        s.index_number, 
        (s.surname || ', ' || s.other_names) as name, 
        s.gender,
        s.current_level,
        s.progid
      FROM students s
      WHERE s.progid = ? AND s.admission_year = ?
      ORDER BY surname ASC, other_names ASC
    `).all(progid, admission_year) as Array<{
      index_no: string;
      index_number: string;
      name: string;
      gender: string;
      current_level: number | null;
      progid: string;
    }>;

    const list = students.map((student) => {
      const assessments = AssessmentRepository.getStudentFullHistory(student.index_no);
      const caches = AssessmentService.buildStudentCaches(student.index_no, assessments, {
        level: student.current_level?.toString() || undefined,
        progid: student.progid,
        existingCaches: AssessmentRepository.getStudentAllCaches(student.index_no),
      });
      const finalCache = caches[caches.length - 1];

      return {
        index_no: student.index_no,
        index_number: student.index_number,
        name: student.name,
        gender: student.gender,
        final_cgpa: finalCache?.cGPA ?? null,
        class_award: finalCache?.class ?? null,
      };
    });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
