import express from 'express';
import db from '../../../db';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  const { academic_year, semester } = req.query;
  let sql = 'SELECT * FROM calendar_events WHERE 1=1';
  const params: any[] = [];
  if (academic_year) { sql += ' AND academic_year = ?'; params.push(academic_year); }
  if (semester) { sql += ' AND semester = ?'; params.push(semester); }
  sql += ' ORDER BY date ASC';
  const events = db.prepare(sql).all(...params);
  res.json(events);
});

router.post('/', (req, res) => {
  const { date, event, academic_year, semester } = req.body;
  if (!date || !event) {
    return res.status(400).json({ error: 'date and event are required' });
  }
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO calendar_events (id, date, event, academic_year, semester, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, date, event, academic_year || null, semester || null, (req as any).user?.uid || null);
    res.status(201).json({ id, date, event, academic_year, semester });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
