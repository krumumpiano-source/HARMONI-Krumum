// HARMONI — PLC API
// GET    /api/plc              — list
// POST   /api/plc              — create
// PUT    /api/plc/:id          — update
// DELETE /api/plc/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/plc' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM plc_records WHERE teacher_id = ? ORDER BY session_date DESC', [env.user.id]));
  }

  if (path === '/api/plc' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.topic) return error('กรุณากรอกหัวข้อ PLC');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO plc_records (id, teacher_id, semester_id, session_date, topic,
       participants, objectives, activities, outcomes, next_steps, evidence_urls, hours, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id || null, body.session_date || now().split('T')[0],
       body.topic, body.participants || null, body.objectives || null, body.activities || null,
       body.outcomes || null, body.next_steps || null, body.evidence_urls || null,
       body.hours || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/plc/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['session_date','topic','participants','objectives','activities','outcomes','next_steps','evidence_urls','hours'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE plc_records SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM plc_records WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
