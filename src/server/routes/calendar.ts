import express from 'express';
import db from '../../../db';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const normalizeCalendarDate = (raw: unknown): string => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calendarDateValue = (value: string): number => {
  const parsed = new Date(normalizeCalendarDate(value));
  return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
};

router.get('/', (req, res) => {
  const { academic_year, semester } = req.query;
  let sql = 'SELECT * FROM calendar_events WHERE 1=1';
  const params: any[] = [];
  if (academic_year) {
    sql += ' AND (academic_year = ? OR academic_year IS NULL)';
    params.push(academic_year);
  }
  if (semester) {
    sql += ' AND (semester = ? OR semester IS NULL)';
    params.push(semester);
  }
  const events = db.prepare(sql).all(...params) as Array<Record<string, any>>;
  events.sort((left, right) => calendarDateValue(String(left.date || '')) - calendarDateValue(String(right.date || '')));
  res.json(events);
});

router.post('/', (req, res) => {
  const { event, academic_year, semester } = req.body;
  const date = normalizeCalendarDate(req.body.date);
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
