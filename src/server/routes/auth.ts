import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../../db';
import { authenticate } from '../middleware/auth';
import { JWT_SECRET, IS_PROD } from '../config';

const router = express.Router();

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
  let user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active') as any;
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    // Try student logins
    const studentLogin = db.prepare(`
      SELECT sl.iid, sl.password_hash, s.full_name as fullname, s.status, sl.requires_reset
      FROM student_logins sl
      JOIN students s ON s.iid = sl.iid
      WHERE sl.username = ?
    `).get(username) as any;

    if (studentLogin && bcrypt.compareSync(password, studentLogin.password_hash)) {
      if (studentLogin.status !== 'active') {
        return res.status(403).json({ error: 'Student account is ' + studentLogin.status });
      }
      if (studentLogin.requires_reset === 1) {
        return res.status(403).json({ error: 'REQUIRES_RESET' });
      }
      user = {
        id: studentLogin.iid,
        uid: studentLogin.iid,
        fullname: studentLogin.fullname,
        username: username,
        role: 'Student',
        status: studentLogin.status
      };
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
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
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });

  res.json({
    id: user.id,
    uid: user.uid,
    name: user.fullname,
    fullname: user.fullname,
    username: user.username,
    email: user.email || null,
    role: user.role,
    status: user.status,
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    path: '/'
  });
  res.json({ success: true });
});

router.get('/me', authenticate, (req: any, res) => {
  res.json(req.user);
});

router.get('/public-settings', (req, res) => {
  const settings = db.prepare(`
    SELECT key, value
    FROM system_settings
    WHERE key IN ('institution_logo', 'institution_name')
  `).all() as Array<{ key: string; value: string }>;

  res.json(settings.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {}));
});

router.post('/change-password', authenticate, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const user = req.user;

  if (user.role === 'Student') {
    const studentLogin = db.prepare(`
      SELECT password_hash
      FROM student_logins
      WHERE iid = ?
    `).get(user.uid) as { password_hash: string } | undefined;

    if (!studentLogin || !bcrypt.compareSync(currentPassword, studentLogin.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare(`
      UPDATE student_logins
      SET password_hash = ?, requires_reset = 0
      WHERE iid = ?
    `).run(passwordHash, user.uid);

    return res.json({ success: true });
  }

  const existingUser = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE uid = ?
  `).get(user.uid) as { password_hash: string } | undefined;

  if (!existingUser || !bcrypt.compareSync(currentPassword, existingUser.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE uid = ?
  `).run(passwordHash, user.uid);

  res.json({ success: true });
});

router.post('/setup-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const studentLogin = db.prepare(`
    SELECT sl.iid, sl.password_hash, s.full_name as fullname, s.status, sl.requires_reset
    FROM student_logins sl
    JOIN students s ON s.iid = sl.iid
    WHERE sl.username = ?
  `).get(username) as any;

  if (!studentLogin || !bcrypt.compareSync(currentPassword, studentLogin.password_hash)) {
    return res.status(401).json({ error: 'Invalid current credentials' });
  }

  if (studentLogin.status !== 'active') {
    return res.status(403).json({ error: 'Student account is ' + studentLogin.status });
  }

  if (studentLogin.requires_reset !== 1) {
    return res.status(400).json({ error: 'Password reset is not required for this account' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE student_logins SET password_hash = ?, requires_reset = 0 WHERE iid = ?')
    .run(newHash, studentLogin.iid);

  const token = jwt.sign(
    { id: studentLogin.iid, uid: studentLogin.iid, role: 'Student', name: studentLogin.fullname, username: username },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });

  res.json({
    id: studentLogin.iid,
    uid: studentLogin.iid,
    name: studentLogin.fullname,
    fullname: studentLogin.fullname,
    username: username,
    role: 'Student',
    status: studentLogin.status,
  });
});

export default router;
