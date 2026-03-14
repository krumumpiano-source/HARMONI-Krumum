// HARMONI — Notifications API
// GET    /api/notifications              — list (filter by ?unread=1)
// POST   /api/notifications              — create notification
// PUT    /api/notifications/:id          — mark read/unread
// PUT    /api/notifications/read-all     — mark all read
// DELETE /api/notifications/:id          — delete notification
// === Student routes ===
// GET    /api/notifications/student      — student notifications
// PUT    /api/notifications/student/:id  — student mark read
// PUT    /api/notifications/student/read-all — student mark all read

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ============================================================
  // TEACHER NOTIFICATIONS
  // ============================================================

  // PUT /api/notifications/read-all — mark all read (must be before :id match)
  if (path === '/api/notifications/read-all' && method === 'PUT') {
    await dbRun(env.DB,
      'UPDATE notifications SET is_read = 1 WHERE teacher_id = ? AND is_read = 0',
      [env.user.id]);
    return success({ updated: true });
  }

  // GET /api/notifications — list
  if (path === '/api/notifications' && method === 'GET') {
    const unread = url.searchParams.get('unread');
    let sql = 'SELECT * FROM notifications WHERE teacher_id = ?';
    const params = [env.user.id];
    if (unread === '1') { sql += ' AND is_read = 0'; }
    sql += ' AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC';
    params.push(now());
    return success(await dbAll(env.DB, sql, params));
  }

  // POST /api/notifications — create
  if (path === '/api/notifications' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('ระบุหัวข้อ');

    const id = generateUUID();
    await dbRun(env.DB, `
      INSERT INTO notifications (id, teacher_id, title, message, notification_type, related_module, related_id, is_read, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [
      id, env.user.id,
      body.title,
      body.message || '',
      body.notification_type || 'system',
      body.related_module || null,
      body.related_id || null,
      now(),
      body.expires_at || null
    ]);

    return success({ id });
  }

  // PUT /api/notifications/:id — mark read/unread
  const idMatch = path.match(/^\/api\/notifications\/([^/]+)$/);
  if (idMatch && method === 'PUT' && idMatch[1] !== 'read-all' && idMatch[1] !== 'student') {
    const id = idMatch[1];
    const body = await parseBody(request);
    const existing = await dbFirst(env.DB,
      'SELECT id FROM notifications WHERE id = ? AND teacher_id = ?', [id, env.user.id]);
    if (!existing) return error('ไม่พบรายการ', 404);

    await dbRun(env.DB,
      'UPDATE notifications SET is_read = ? WHERE id = ?',
      [body?.is_read !== undefined ? (body.is_read ? 1 : 0) : 1, id]);

    return success({ updated: true });
  }

  // DELETE /api/notifications/:id
  if (idMatch && method === 'DELETE') {
    const id = idMatch[1];
    const existing = await dbFirst(env.DB,
      'SELECT id FROM notifications WHERE id = ? AND teacher_id = ?', [id, env.user.id]);
    if (!existing) return error('ไม่พบรายการ', 404);
    await dbRun(env.DB, 'DELETE FROM notifications WHERE id = ?', [id]);
    return success({ deleted: true });
  }

  // ============================================================
  // STUDENT NOTIFICATIONS
  // ============================================================

  // PUT /api/notifications/student/read-all
  if (path === '/api/notifications/student/read-all' && method === 'PUT') {
    if (!env.user?.student_id) return error('ไม่ได้เข้าสู่ระบบในฐานะนักเรียน', 403);
    await dbRun(env.DB,
      'UPDATE student_notifications SET is_read = 1 WHERE student_id = ? AND is_read = 0',
      [env.user.student_id]);
    return success({ updated: true });
  }

  // GET /api/notifications/student
  if (path === '/api/notifications/student' && method === 'GET') {
    if (!env.user?.student_id) return error('ไม่ได้เข้าสู่ระบบในฐานะนักเรียน', 403);
    const unread = url.searchParams.get('unread');
    let sql = 'SELECT * FROM student_notifications WHERE student_id = ?';
    const params = [env.user.student_id];
    if (unread === '1') { sql += ' AND is_read = 0'; }
    sql += ' AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC';
    params.push(now());
    return success(await dbAll(env.DB, sql, params));
  }

  // PUT /api/notifications/student/:id
  const studentIdMatch = path.match(/^\/api\/notifications\/student\/([^/]+)$/);
  if (studentIdMatch && method === 'PUT' && studentIdMatch[1] !== 'read-all') {
    if (!env.user?.student_id) return error('ไม่ได้เข้าสู่ระบบในฐานะนักเรียน', 403);
    const id = studentIdMatch[1];
    const existing = await dbFirst(env.DB,
      'SELECT id FROM student_notifications WHERE id = ? AND student_id = ?',
      [id, env.user.student_id]);
    if (!existing) return error('ไม่พบรายการ', 404);
    await dbRun(env.DB, 'UPDATE student_notifications SET is_read = 1 WHERE id = ?', [id]);
    return success({ updated: true });
  }

  return error('Not found', 404);
}
