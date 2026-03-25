import express from 'express';
import db from '../../../db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();
const usersTableInfo = () => db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
const hasUserEmailColumn = () => usersTableInfo().some((column) => column.name === 'email');

router.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '10'), 10) || 10));
  const offset = (page - 1) * pageSize;
  const emailColumnExists = hasUserEmailColumn();
  const where = q
    ? `WHERE fullname LIKE ? OR username LIKE ?${emailColumnExists ? " OR COALESCE(email, '') LIKE ?" : ''}`
    : '';
  const params = q
    ? emailColumnExists
      ? [`%${q}%`, `%${q}%`, `%${q}%`]
      : [`%${q}%`, `%${q}%`]
    : [];

  const count = db.prepare(`
    SELECT COUNT(*) as total
    FROM users
    ${where}
  `).get(...params) as { total: number };

  const users = db.prepare(`
    SELECT id, uid, fullname, username, ${emailColumnExists ? 'email' : 'NULL as email'}, role, status
    FROM users
    ${where}
    ORDER BY
      CASE role
        WHEN 'SuperAdmin' THEN 1
        WHEN 'Administrator' THEN 2
        WHEN 'Registry' THEN 3
        WHEN 'Finance' THEN 4
        WHEN 'Lecturer' THEN 5
        WHEN 'Student' THEN 6
        ELSE 7
      END,
      fullname ASC,
      username ASC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  const total = count?.total || 0;
  res.json({
    data: users,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.post('/', async (req, res) => {
  const { fullname, username, email, password, role } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const uid = uuidv4();

    if (hasUserEmailColumn()) {
      db.prepare('INSERT INTO users (id, uid, fullname, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, uid, fullname, username, email || null, password_hash, role);
    } else {
      db.prepare('INSERT INTO users (id, uid, fullname, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, uid, fullname, username, password_hash, role);
    }

    res.status(201).json({ id, uid, fullname, username, email: email || null, role });
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
