import express from 'express';
import { AssessmentRepository } from '../repositories/AssessmentRepository';
import { AssessmentService } from '../services/AssessmentService';

const router = express.Router();

router.get('/', (req, res) => {
  const { iid, cid, academic_year, semester_sid } = req.query;
  if (iid && academic_year && semester_sid) {
    const assessments = AssessmentRepository.getAssessments(iid as string, academic_year as string, semester_sid as string);
    return res.json(assessments);
  }
  if (cid && academic_year && semester_sid) {
    const assessments = AssessmentRepository.getCourseAssessments(cid as string, academic_year as string, semester_sid as string);
    return res.json(assessments);
  }
  res.status(400).json({ error: 'Missing required query parameters' });
});

router.post('/', async (req, res) => {
  const { iid, cid, academic_year, semester_sid, class_score, exam_score } = req.body;
  const total_score = (class_score || 0) + (exam_score || 0);
  const { grade, gp } = AssessmentService.calculateGrade(total_score);

  try {
    AssessmentRepository.saveAssessment({ iid, cid, academic_year, semester_sid, class_score, exam_score, grade, gp, entered_by: (req as any).user.uid });
    
    // Auto-compute GPA for this student
    await AssessmentService.computeGPA(iid, academic_year, semester_sid);
    
    res.status(201).json({ iid, cid, ...req.body, total_score, grade, gp });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/boardsheet', (req, res) => {
  const { iid, academic_year, semester_sid } = req.query;
  if (!iid || !academic_year || !semester_sid) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }
  const cache = AssessmentRepository.getBoardsheetCache(iid as string, academic_year as string, semester_sid as string);
  res.json(cache);
});

router.post('/compute-gpa', async (req, res) => {
  const { academic_year, semester_sid } = req.body;
  try {
    await AssessmentService.bulkComputeGPA(academic_year, semester_sid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
