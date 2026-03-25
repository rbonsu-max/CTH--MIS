import express from 'express';
import db from '../../../db';

const router = express.Router();

// GET all settings
router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM system_settings').all();
  const settingsObj = settings.reduce((acc: Record<string, string>, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  res.json(settingsObj);
});

// POST to update a setting (e.g., logo)
router.post('/', (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }
  
  try {
    const existing = db.prepare('SELECT 1 FROM system_settings WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)').run(key, value);
    }
    res.json({ success: true, key });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET grading points
router.get('/grading', (req, res) => {
  const points = db.prepare('SELECT * FROM grading_points ORDER BY min_score DESC').all();
  res.json(points);
});

// POST new grading point
router.post('/grading', (req, res) => {
  const { grade, min_score, max_score, gp, remarks } = req.body;
  if (!grade || min_score === undefined || max_score === undefined || gp === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    db.prepare('INSERT INTO grading_points (grade, min_score, max_score, gp, remarks) VALUES (?, ?, ?, ?, ?)').run(grade, min_score, max_score, gp, remarks);
    res.status(201).json({ success: true, grade });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update grading point
router.put('/grading/:id', (req, res) => {
  const { id } = req.params;
  const { grade, min_score, max_score, gp, remarks } = req.body;
  
  try {
    db.prepare('UPDATE grading_points SET grade = ?, min_score = ?, max_score = ?, gp = ?, remarks = ? WHERE id = ?').run(grade, min_score, max_score, gp, remarks, Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE grading point
router.delete('/grading/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM grading_points WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
