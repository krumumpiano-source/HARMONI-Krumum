// HARMONI — Schedule (Timetable Slots) API
// GET    /api/schedule         — list (?semester_id=)
// POST   /api/schedule         — add slot
// DELETE /api/schedule/:id     — remove slot

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List
  if (path === '/api/schedule' && method === 'GET') {
    const semesterId = url.searchParams.get('semester_id');
    let sql = `SELECT ss.*, s.code as subject_code, s.name as subject_name, c.name as classroom_name
      FROM schedule_slots ss
      JOIN subjects s ON s.id = ss.subject_id
      JOIN classrooms c ON c.id = ss.classroom_id
      WHERE ss.teacher_id = ?`;
    const params = [env.user.id];
    if (semesterId) { sql += ' AND ss.semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY ss.day_of_week, ss.period';
    return success(await dbAll(env.DB, sql, params));
  }

  // Create
  if (path === '/api/schedule' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.semester_id || !body.subject_id || !body.classroom_id || !body.day_of_week || !body.period) {
      return error('Missing required fields');
    }
    if (body.day_of_week < 1 || body.day_of_week > 5 || body.period < 1 || body.period > 10) {
      return error('Invalid day or period');
    }
    const id = 'sched-' + generateUUID().slice(0, 8);
    try {
      await dbRun(env.DB,
        `INSERT INTO schedule_slots (id, teacher_id, semester_id, subject_id, classroom_id, day_of_week, period, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, env.user.id, body.semester_id, body.subject_id, body.classroom_id, body.day_of_week, body.period, now()]
      );
      return success({ id });
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        return error('คาบนี้ถูกจัดไว้แล้ว');
      }
      return error(e.message);
    }
  }

  // Delete
  const slotId = extractParam(path, '/api/schedule/');
  if (slotId && method === 'PUT') {
    const body = await parseBody(request);
    if (!body) return error('ข้อมูลไม่ถูกต้อง');
    const fields = [];
    const params = [];
    if (body.subject_id) { fields.push('subject_id = ?'); params.push(body.subject_id); }
    if (body.classroom_id) { fields.push('classroom_id = ?'); params.push(body.classroom_id); }
    if (body.notes !== undefined) { fields.push('notes = ?'); params.push(body.notes); }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(slotId, env.user.id);
    await dbRun(env.DB, `UPDATE schedule_slots SET ${fields.join(', ')} WHERE id = ? AND teacher_id = ?`, params);
    return success({ updated: true });
  }
  if (slotId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM schedule_slots WHERE id = ? AND teacher_id = ?', [slotId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
