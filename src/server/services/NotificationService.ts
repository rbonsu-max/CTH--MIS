import db from '../../../db';

interface CreateNotificationInput {
  recipient_uid: string;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
}

export class NotificationService {
  static listForUser(recipientUid: string) {
    return db.prepare(`
      SELECT id, recipient_uid, type, title, message, payload, is_read, created_at, read_at
      FROM notifications
      WHERE recipient_uid = ?
      ORDER BY is_read ASC, created_at DESC
      LIMIT 100
    `).all(recipientUid).map((notification: any) => ({
      ...notification,
      payload: notification.payload ? JSON.parse(notification.payload) : null,
      is_read: Boolean(notification.is_read),
    }));
  }

  static markRead(id: number, recipientUid: string) {
    return db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_uid = ?
    `).run(id, recipientUid);
  }

  static markAllRead(recipientUid: string) {
    return db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE recipient_uid = ? AND is_read = 0
    `).run(recipientUid);
  }

  static create(input: CreateNotificationInput) {
    return db.prepare(`
      INSERT INTO notifications (recipient_uid, type, title, message, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      input.recipient_uid,
      input.type,
      input.title,
      input.message,
      input.payload ? JSON.stringify(input.payload) : null
    );
  }

  static notifySuperAdmins(type: string, title: string, message: string, payload?: Record<string, unknown>) {
    const superAdmins = db.prepare(`SELECT uid FROM users WHERE role = 'SuperAdmin' AND status = 'active'`).all() as Array<{ uid: string }>;
    const insertMany = db.transaction((uids: Array<{ uid: string }>) => {
      for (const admin of uids) {
        this.create({
          recipient_uid: admin.uid,
          type,
          title,
          message,
          payload: payload || null,
        });
      }
    });
    insertMany(superAdmins);
  }
}

