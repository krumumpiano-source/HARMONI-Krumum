// HARMONI — Innovation (นวัตกรรม) API
// GET    /api/innovation              — list
// POST   /api/innovation              — create
// PUT    /api/innovation/:id          — update
// DELETE /api/innovation/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/innovation' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM innovations WHERE teacher_id = ? ORDER BY created_at DESC', [env.user.id]));
  }

  if (path === '/api/innovation' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อนวัตกรรม');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO innovations (id, teacher_id, semester_id, title, innovation_type,
       problem_addressed, description, implementation, results, effectiveness_data,
       published_where, evidence_urls, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id || null, body.title, body.innovation_type || null,
       body.problem_addressed || null, body.description || null, body.implementation || null,
       body.results || null, body.effectiveness_data || null, body.published_where || null,
       body.evidence_urls || null, body.status || 'draft', now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/innovation/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['title','innovation_type','problem_addressed','description','implementation',
      'results','effectiveness_data','published_at','published_where','evidence_urls','status'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE innovations SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM innovations WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
