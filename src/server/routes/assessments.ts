import express from 'express';
import { AssessmentRepository } from '../repositories/AssessmentRepository';
import { AssessmentService } from '../services/AssessmentService';
import { AssessmentControlRepository } from '../repositories/AssessmentControlRepository';
import db from '../../../db';

const router = express.Router();

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

    const list = db.prepare(`
      SELECT 
        s.iid as index_no, 
        s.index_number, 
        (s.surname || ', ' || s.other_names) as name, 
        s.gender,
        (SELECT cGPA FROM broadsheet_cache bc WHERE bc.index_no = s.iid ORDER BY academic_year DESC, semester_id DESC LIMIT 1) as final_cgpa,
        (SELECT class FROM broadsheet_cache bc WHERE bc.index_no = s.iid ORDER BY academic_year DESC, semester_id DESC LIMIT 1) as class_award
      FROM students s
      WHERE s.progid = ? AND s.admission_year = ?
      ORDER BY surname ASC, other_names ASC
    `).all(progid, admission_year);

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
