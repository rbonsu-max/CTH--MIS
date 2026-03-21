import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sims-secret-key';
const isProd = process.env.NODE_ENV === 'production';

router.post('/login', (req, res) => {
  const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  });

  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid username or password format' });
  }

  const { username, password } = validation.data;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active') as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.status === 'locked') {
    return res.status(403).json({ error: 'Account is locked. Contact administrator.' });
  }

  const token = jwt.sign(
    { id: user.id, uid: user.uid, role: user.role, name: user.fullname, username: user.username },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,           // only require HTTPS in production
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  res.json({
    id: user.id,
    uid: user.uid,
    name: user.fullname,
    fullname: user.fullname,
    username: user.username,
    role: user.role,
    status: user.status,
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.json({ success: true });
});

router.get('/me', (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

export default router;
