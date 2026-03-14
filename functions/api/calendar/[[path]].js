// HARMONI — Calendar (ปฏิทิน) API
// GET    /api/calendar              — list events
// POST   /api/calendar              — create event
// PUT    /api/calendar/:id          — update event
// DELETE /api/calendar/:id          — delete event

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/calendar' && method === 'GET') {
    const month = url.searchParams.get('month'); // YYYY-MM
    const semesterId = url.searchParams.get('semester_id');
    let sql = 'SELECT * FROM calendar_events WHERE teacher_id = ?';
    const params = [env.user.id];
    if (month) { sql += ' AND date LIKE ?'; params.push(month + '%'); }
    if (semesterId) { sql += ' AND semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY date ASC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/calendar' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อกิจกรรม');
    if (!body.date) return error('กรุณาระบุวันที่');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO calendar_events (id, teacher_id, semester_id, title, event_type,
       date, end_date, all_day, color, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id || null, body.title, body.event_type || null,
       body.date, body.end_date || null, body.all_day !== undefined ? (body.all_day ? 1 : 0) : 1,
       body.color || null, body.notes || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/calendar/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['title','event_type','date','end_date','all_day','color','notes'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(f === 'all_day' ? (body[f] ? 1 : 0) : body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE calendar_events SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM calendar_events WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
