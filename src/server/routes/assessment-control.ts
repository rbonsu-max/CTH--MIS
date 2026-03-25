import express from 'express';
import { AssessmentControlRepository } from '../repositories/AssessmentControlRepository';
import db from '../../../db';

const router = express.Router();

// Middleware to check if user is SuperAdmin
const isSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    return next();
  }
  res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
};

// Windows management (SuperAdmin)
router.get('/windows', isSuperAdmin, (req, res) => {
  res.json(AssessmentControlRepository.getWindows());
});

router.post('/windows', isSuperAdmin, (req, res) => {
  const { academic_year, semester_id, start_date, end_date, is_active } = req.body;
  try {
    AssessmentControlRepository.upsertWindow({
      academic_year, semester_id, start_date, end_date, is_active,
      created_by: (req as any).user.uid
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/windows/:id', isSuperAdmin, (req, res) => {
  AssessmentControlRepository.deleteWindow(parseInt(req.params.id));
  res.json({ success: true });
});

// Requests management (SuperAdmin)
router.get('/requests', isSuperAdmin, (req, res) => {
  res.json(AssessmentControlRepository.getRequests(req.query.status as string));
});

router.post('/requests/process', isSuperAdmin, (req, res) => {
  const { id, status, expires_at } = req.body;
  const processedBy = (req as any).user.uid;
  const processedAt = new Date().toISOString();
  try {
    AssessmentControlRepository.updateRequestStatus(id, status, processedBy, processedAt, expires_at);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Lecturer requests
router.get('/my-requests', (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'Lecturer') return res.status(403).json({ error: 'Unauthorized' });
  
  // Find lecturer lid by user_uid
  const lecturer = db.prepare('SELECT lid FROM lecturers WHERE user_uid = ?').get(user.uid) as any;
  if (!lecturer) return res.status(404).json({ error: 'Lecturer record not found' });
  
  res.json(AssessmentControlRepository.getLecturerRequests(lecturer.lid));
});

router.post('/requests', (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'Lecturer') return res.status(403).json({ error: 'Unauthorized' });
  
  const lecturer = db.prepare('SELECT lid FROM lecturers WHERE user_uid = ?').get(user.uid) as any;
  if (!lecturer) return res.status(404).json({ error: 'Lecturer record not found' });
  
  const { course_code, academic_year, semester_id, index_no, request_type, reason } = req.body;
  try {
    AssessmentControlRepository.createRequest({
      lid: lecturer.lid, course_code, academic_year, semester_id, index_no, request_type, reason
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Check current window/access for a course
router.get('/check-access', (req, res) => {
  const { academic_year, semester_id, course_code, index_no } = req.query;
  const user = (req as any).user;
  
  const window = AssessmentControlRepository.getActiveWindow(academic_year as string, semester_id as string);
  
  let hasAccess = !!window;
  let accessSource = window ? 'window' : null;

  if (!hasAccess && user.role === 'Lecturer') {
    const lecturer = db.prepare('SELECT lid FROM lecturers WHERE user_uid = ?').get(user.uid) as any;
    if (lecturer) {
      if (AssessmentControlRepository.hasGrantedAccess(lecturer.lid, course_code as string, index_no as string)) {
        hasAccess = true;
        accessSource = 'request';
      }
    }
  }

  res.json({ hasAccess, accessSource, window });
});

export default router;
