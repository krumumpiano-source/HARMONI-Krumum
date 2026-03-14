// HARMONI — Home Visit (เยี่ยมบ้าน) API
// GET    /api/home-visit              — list
// POST   /api/home-visit              — create
// PUT    /api/home-visit/:id          — update
// DELETE /api/home-visit/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/home-visit' && method === 'GET') {
    const studentId = url.searchParams.get('student_id');
    let sql = `SELECT hv.*, s.student_code, s.first_name, s.last_name
               FROM home_visits hv JOIN students s ON s.id = hv.student_id
               WHERE hv.teacher_id = ?`;
    const params = [env.user.id];
    if (studentId) { sql += ' AND hv.student_id = ?'; params.push(studentId); }
    sql += ' ORDER BY hv.visit_date DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/home-visit' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.student_id) return error('กรุณาเลือกนักเรียน');
    if (!body.visit_date) return error('กรุณาระบุวันที่เยี่ยมบ้าน');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO home_visits (id, teacher_id, student_id, visit_date, visit_type,
       lat, lng, address_visited, photo_urls, family_present, raw_notes,
       official_notes, follow_up_needed, follow_up_notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.student_id, body.visit_date, body.visit_type || 'in_person',
       body.lat || null, body.lng || null, body.address_visited || null,
       body.photo_urls || null, body.family_present || null, body.raw_notes || null,
       body.official_notes || null, body.follow_up_needed ? 1 : 0, body.follow_up_notes || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/home-visit/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['visit_date','visit_type','lat','lng','address_visited','photo_urls',
      'family_present','raw_notes','official_notes','follow_up_needed','follow_up_notes'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(f === 'follow_up_needed' ? (body[f] ? 1 : 0) : body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE home_visits SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM home_visits WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
