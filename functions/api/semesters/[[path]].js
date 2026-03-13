// HARMONI — Semesters API
// GET    /api/semesters         — list
// POST   /api/semesters         — create
// GET    /api/semesters/:id     — detail
// PUT    /api/semesters/:id     — update
// DELETE /api/semesters/:id     — delete
// POST   /api/semesters/:id/activate — set as active

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam, extractAction
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const prefix = '/api/semesters/';

  // List & Create
  if (path === '/api/semesters') {
    if (method === 'GET') {
      const rows = await dbAll(env.DB,
        'SELECT * FROM semesters WHERE teacher_id = ? ORDER BY academic_year DESC, semester DESC',
        [env.user.id]
      );
      return success(rows);
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.academic_year || !body.semester) {
        return error('กรุณากรอก academic_year และ semester');
      }
      const id = generateUUID();
      await dbRun(env.DB,
        'INSERT INTO semesters (id, teacher_id, academic_year, semester, start_date, end_date, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
        [id, env.user.id, body.academic_year, body.semester, body.start_date || null, body.end_date || null, now()]
      );
      return success({ id });
    }
  }

  // Routes with :id
  if (path.startsWith(prefix)) {
    const id = extractParam(path, prefix);
    const action = extractAction(path, prefix);

    // POST /api/semesters/:id/activate
    if (action === 'activate' && method === 'POST') {
      await dbRun(env.DB,
        'UPDATE semesters SET is_active = 0 WHERE teacher_id = ?',
        [env.user.id]
      );
      await dbRun(env.DB,
        'UPDATE semesters SET is_active = 1 WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'เปิดใช้ภาคเรียนแล้ว' });
    }

    // GET detail
    if (!action && method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM semesters WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      if (!row) return error('ไม่พบภาคเรียน', 404);
      return success(row);
    }

    // PUT update
    if (!action && method === 'PUT') {
      const body = await parseBody(request);
      if (!body) return error('ข้อมูลไม่ถูกต้อง');
      await dbRun(env.DB,
        'UPDATE semesters SET academic_year = COALESCE(?, academic_year), semester = COALESCE(?, semester), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), updated_at = ? WHERE id = ? AND teacher_id = ?',
        [body.academic_year, body.semester, body.start_date, body.end_date, now(), id, env.user.id]
      );
      return success({ message: 'อัปเดตภาคเรียนแล้ว' });
    }

    // DELETE
    if (!action && method === 'DELETE') {
      await dbRun(env.DB,
        'DELETE FROM semesters WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'ลบภาคเรียนแล้ว' });
    }
  }

  return error('Not Found', 404);
}
