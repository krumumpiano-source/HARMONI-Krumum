// HARMONI — Care Record (บันทึกการดูแล) API
// GET    /api/care-record              — list
// POST   /api/care-record              — create
// PUT    /api/care-record/:id          — update
// DELETE /api/care-record/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/care-record' && method === 'GET') {
    const studentId = url.searchParams.get('student_id');
    const semesterId = url.searchParams.get('semester_id');
    let sql = `SELECT cr.*, s.student_code, s.first_name, s.last_name
               FROM care_records cr JOIN students s ON s.id = cr.student_id
               WHERE cr.teacher_id = ?`;
    const params = [env.user.id];
    if (studentId) { sql += ' AND cr.student_id = ?'; params.push(studentId); }
    if (semesterId) { sql += ' AND cr.semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY cr.record_date DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/care-record' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.student_id) return error('กรุณาเลือกนักเรียน');
    if (!body.description) return error('กรุณากรอกรายละเอียด');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO care_records (id, teacher_id, student_id, semester_id, care_step,
       record_date, description, action_taken, outcome, referral_to, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.student_id, body.semester_id || null,
       body.care_step || 1, body.record_date || now().split('T')[0],
       body.description, body.action_taken || null, body.outcome || null,
       body.referral_to || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/care-record/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['care_step','record_date','description','action_taken','outcome','referral_to'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE care_records SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM care_records WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
