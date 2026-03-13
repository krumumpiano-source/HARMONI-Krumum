// HARMONI — Admin API (teacher approval system)
// GET    /api/admin/pending-teachers   — list pending teachers
// POST   /api/admin/approve/:id        — approve teacher
// POST   /api/admin/reject/:id         — reject teacher
// GET    /api/admin/teachers           — list all teachers
// DELETE /api/admin/teachers/:id       — remove teacher

import {
  success, error, dbAll, dbFirst, dbRun, now, extractParam
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
