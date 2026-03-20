import express from 'express';
import db from '../../../db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, uid, fullname, username, role, status FROM users').all();
  res.json(users);
});

router.post('/', async (req, res) => {
  const { fullname, username, password, role } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const uid = uuidv4();
    db.prepare('INSERT INTO users (id, uid, fullname, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, uid, fullname, username, password_hash, role);
    res.status(201).json({ id, uid, fullname, username, role });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:uid/password', async (req, res) => {
  const { uid } = req.params;
  const { password } = req.body;
  
  // Only SuperAdmin or the user themselves can change their password
  if ((req as any).user.role !== 'SuperAdmin' && (req as any).user.uid !== uid) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE uid = ?').run(password_hash, uid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:uid', (req, res) => {
  const { uid } = req.params;
  if ((req as any).user.uid === uid) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  try {
    db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
