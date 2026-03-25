import express from 'express';
import { NotificationService } from '../services/NotificationService';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(NotificationService.listForUser((req as any).user.uid));
});

router.post('/read-all', (req, res) => {
  NotificationService.markAllRead((req as any).user.uid);
  res.json({ success: true });
});

router.post('/:id/read', (req, res) => {
  NotificationService.markRead(Number(req.params.id), (req as any).user.uid);
  res.json({ success: true });
});

export default router;
