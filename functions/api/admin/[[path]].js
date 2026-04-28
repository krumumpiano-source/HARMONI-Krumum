// HARMONI — Admin API (teacher approval system)
// GET    /api/admin/pending-teachers   — list pending teachers
// POST   /api/admin/approve/:id        — approve teacher
// POST   /api/admin/reject/:id         — reject teacher
// GET    /api/admin/teachers           — list all teachers
// DELETE /api/admin/teachers/:id       — remove teacher
// POST   /api/admin/create-readonly-teacher — create a view-only teacher account

import {
  success, error, dbAll, dbFirst, dbRun, now, extractParam,
  generateUUID, hashPassword, parseBody
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Admin check
  if (!env.user || !env.user.isAdmin) {
    return error('เฉพาะแอดมินเท่านั้น', 403);
  }

  // POST /api/admin/create-readonly-teacher
  if (path === '/api/admin/create-readonly-teacher' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.username || !body.password) {
      return error('กรุณากรอก username และ password');
    }
    if (String(body.password).length < 6) {
      return error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    const existing = await dbFirst(env.DB, 'SELECT id FROM users WHERE username = ?', [body.username]);
    if (existing) {
      return error('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
    }

    const userId = generateUUID();
    const salt = generateUUID();
    const passwordHash = await hashPassword(String(body.password), salt);
    const displayName = body.display_name || body.displayName || body.username;

    await dbRun(
      env.DB,
      'INSERT INTO users (id, username, password_hash, salt, role, display_name, is_admin, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [userId, body.username, passwordHash, salt, 'teacher', displayName, 'readonly', now()]
    );

    return success({
      message: 'สร้างบัญชีดูอย่างเดียวสำเร็จ',
      userId,
      username: body.username,
      displayName,
      status: 'readonly'
    });
  }

  // GET /api/admin/pending-teachers
  if (path === '/api/admin/pending-teachers' && method === 'GET') {
    const rows = await dbAll(env.DB,
      "SELECT id, username, display_name, status, created_at FROM users WHERE role = 'teacher' AND status = 'pending' ORDER BY created_at DESC"
    );
    return success(rows);
  }

  // GET /api/admin/teachers — all teachers (except self)
  if (path === '/api/admin/teachers' && method === 'GET') {
    const rows = await dbAll(env.DB,
      "SELECT id, username, display_name, is_admin, status, created_at FROM users WHERE role = 'teacher' ORDER BY created_at",
    );
    return success(rows);
  }

  // POST /api/admin/approve/:id
  if (path.startsWith('/api/admin/approve/') && method === 'POST') {
    const id = extractParam(path, '/api/admin/approve/');
    const user = await dbFirst(env.DB,
      "SELECT id, status FROM users WHERE id = ? AND role = 'teacher'",
      [id]
    );
    if (!user) return error('ไม่พบครู', 404);

    await dbRun(env.DB,
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      ['active', now(), id]
    );
    return success({ message: 'อนุมัติครูแล้ว' });
  }

  // POST /api/admin/reject/:id
  if (path.startsWith('/api/admin/reject/') && method === 'POST') {
    const id = extractParam(path, '/api/admin/reject/');
    const user = await dbFirst(env.DB,
      "SELECT id, status FROM users WHERE id = ? AND role = 'teacher'",
      [id]
    );
    if (!user) return error('ไม่พบครู', 404);

    await dbRun(env.DB,
      'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
      ['rejected', now(), id]
    );
    return success({ message: 'ปฏิเสธครูแล้ว' });
  }

  // DELETE /api/admin/teachers/:id — remove teacher
  if (path.startsWith('/api/admin/teachers/') && method === 'DELETE') {
    const id = extractParam(path, '/api/admin/teachers/');
    if (id === env.user.id) {
      return error('ไม่สามารถลบตัวเองได้', 400);
    }
    // Delete sessions first, then user
    await dbRun(env.DB, 'DELETE FROM sessions WHERE user_id = ?', [id]);
    await dbRun(env.DB, 'DELETE FROM users WHERE id = ? AND role = ?', [id, 'teacher']);
    return success({ message: 'ลบครูแล้ว' });
  }

  return error('Not Found', 404);
}
