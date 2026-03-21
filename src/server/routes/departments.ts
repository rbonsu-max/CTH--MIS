import express from 'express';
import db from '../../../db';

const router = express.Router();

// GET all departments
router.get('/', (req, res) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
  res.json(departments);
});

// POST create department
router.post('/', (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'code and name are required' });
  }
  try {
    db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)').run(code, name);
    res.status(201).json({ code, name });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update department
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;
  try {
    db.prepare('UPDATE departments SET code = ?, name = ? WHERE id = ?').run(code, name, Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE department
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM departments WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
