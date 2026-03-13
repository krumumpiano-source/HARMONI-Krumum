// HARMONI — Classrooms API
// GET    /api/classrooms       — list (?grade=)
// POST   /api/classrooms       — create
// GET    /api/classrooms/:id   — detail
// PUT    /api/classrooms/:id   — update
// DELETE /api/classrooms/:id   — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/classrooms') {
    if (method === 'GET') {
      const grade = url.searchParams.get('grade');
      let sql = 'SELECT * FROM classrooms WHERE teacher_id = ?';
      const params = [env.user.id];
      if (grade) {
        sql += ' AND grade_level = ?';
        params.push(parseInt(grade));
      }
      sql += ' ORDER BY grade_level, room_number';
      return success(await dbAll(env.DB, sql, params));
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.grade_level || !body.room_number) {
        return error('กรุณากรอกระดับชั้นและห้อง');
      }
      const id = generateUUID();
      await dbRun(env.DB,
        'INSERT INTO classrooms (id, teacher_id, grade_level, room_number, name, academic_year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, env.user.id, body.grade_level, body.room_number, body.name || `ม.${body.grade_level}/${body.room_number}`, body.academic_year || null, now()]
      );
      return success({ id });
    }
  }

  if (path.startsWith('/api/classrooms/')) {
    const id = extractParam(path, '/api/classrooms/');
    if (method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      if (!row) return error('ไม่พบห้องเรียน', 404);
      return success(row);
    }
    if (method === 'PUT') {
      const body = await parseBody(request);
      if (!body) return error('ข้อมูลไม่ถูกต้อง');
      await dbRun(env.DB,
        'UPDATE classrooms SET grade_level = COALESCE(?, grade_level), room_number = COALESCE(?, room_number), name = COALESCE(?, name), academic_year = COALESCE(?, academic_year), updated_at = ? WHERE id = ? AND teacher_id = ?',
        [body.grade_level, body.room_number, body.name, body.academic_year, now(), id, env.user.id]
      );
      return success({ message: 'อัปเดตห้องเรียนแล้ว' });
    }
    if (method === 'DELETE') {
      await dbRun(env.DB,
        'DELETE FROM classrooms WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'ลบห้องเรียนแล้ว' });
    }
  }

  return error('Not Found', 404);
}
