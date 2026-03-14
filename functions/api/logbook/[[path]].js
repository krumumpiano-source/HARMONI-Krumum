// HARMONI — Logbook (สมุดบันทึก) API
// GET    /api/logbook              — list
// POST   /api/logbook              — create
// PUT    /api/logbook/:id          — update
// DELETE /api/logbook/:id          — delete
// GET    /api/logbook/summary      — hours summary by category

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Summary
  if (path === '/api/logbook/summary' && method === 'GET') {
    const semesterId = url.searchParams.get('semester_id');
    let sql = `SELECT category, SUM(hours) as total_hours, COUNT(*) as count
               FROM log_entries WHERE teacher_id = ?`;
    const params = [env.user.id];
    if (semesterId) { sql += ' AND semester_id = ?'; params.push(semesterId); }
    sql += ' GROUP BY category ORDER BY total_hours DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/logbook' && method === 'GET') {
    const category = url.searchParams.get('category');
    const semesterId = url.searchParams.get('semester_id');
    let sql = 'SELECT * FROM log_entries WHERE teacher_id = ?';
    const params = [env.user.id];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (semesterId) { sql += ' AND semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY entry_date DESC, created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/logbook' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.category) return error('กรุณาเลือกหมวดหมู่');
    if (!body.hours) return error('กรุณาระบุจำนวนชั่วโมง');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO log_entries (id, teacher_id, semester_id, entry_date, category, hours,
       description, related_module, related_id, evidence_urls, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id || null, body.entry_date || now().split('T')[0],
       body.category, body.hours, body.description || null, body.related_module || null,
       body.related_id || null, body.evidence_urls || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/logbook/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['entry_date','category','hours','description','related_module','related_id','evidence_urls'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE log_entries SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM log_entries WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
