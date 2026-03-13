// HARMONI — Subjects API
// GET    /api/subjects       — list (?type=)
// POST   /api/subjects       — create
// GET    /api/subjects/:id   — detail
// PUT    /api/subjects/:id   — update
// DELETE /api/subjects/:id   — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/subjects') {
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      let sql = 'SELECT * FROM subjects WHERE teacher_id = ?';
      const params = [env.user.id];
      if (type) {
        sql += ' AND subject_type = ?';
        params.push(type);
      }
      sql += ' ORDER BY code';
      return success(await dbAll(env.DB, sql, params));
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.code || !body.name_th) {
        return error('กรุณากรอกรหัสวิชาและชื่อวิชา');
      }
      const id = generateUUID();
      await dbRun(env.DB,
        'INSERT INTO subjects (id, teacher_id, code, name_th, name_en, subject_type, credits, hours_per_week, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, env.user.id, body.code, body.name_th, body.name_en || null, body.subject_type || 'required', body.credits || 1, body.hours_per_week || 1, body.description || null, now()]
      );
      return success({ id });
    }
  }

  if (path.startsWith('/api/subjects/')) {
    const id = extractParam(path, '/api/subjects/');
    if (method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM subjects WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      if (!row) return error('ไม่พบวิชา', 404);
      return success(row);
    }
    if (method === 'PUT') {
      const body = await parseBody(request);
      if (!body) return error('ข้อมูลไม่ถูกต้อง');
      await dbRun(env.DB,
        'UPDATE subjects SET code = COALESCE(?, code), name_th = COALESCE(?, name_th), name_en = COALESCE(?, name_en), subject_type = COALESCE(?, subject_type), credits = COALESCE(?, credits), hours_per_week = COALESCE(?, hours_per_week), description = COALESCE(?, description), updated_at = ? WHERE id = ? AND teacher_id = ?',
        [body.code, body.name_th, body.name_en, body.subject_type, body.credits, body.hours_per_week, body.description, now(), id, env.user.id]
      );
      return success({ message: 'อัปเดตวิชาแล้ว' });
    }
    if (method === 'DELETE') {
      await dbRun(env.DB,
        'DELETE FROM subjects WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'ลบวิชาแล้ว' });
    }
  }

  return error('Not Found', 404);
}
