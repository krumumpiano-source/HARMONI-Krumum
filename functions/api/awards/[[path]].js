// HARMONI — Awards (เกียรติบัตร/รางวัล) API
// GET    /api/awards              — list awards
// POST   /api/awards              — create award
// PUT    /api/awards/:id          — update
// DELETE /api/awards/:id          — delete
// GET    /api/awards/types        — list award types
// POST   /api/awards/types        — create award type

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Award types
  if (path === '/api/awards/types' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM award_types WHERE teacher_id = ? OR is_preset = 1 ORDER BY tier, name', [env.user.id]));
  }
  if (path === '/api/awards/types' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name) return error('กรุณากรอกชื่อประเภทรางวัล');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO award_types (id, teacher_id, name, name_short, tier, level, organizing_body,
       typical_deadline_month, evidence_requirements, is_preset)
       VALUES (?,?,?,?,?,?,?,?,?,0)`,
      [id, env.user.id, body.name, body.name_short || null, body.tier || null, body.level || null,
       body.organizing_body || null, body.typical_deadline_month || null, body.evidence_requirements || null]
    );
    return success({ id });
  }

  // List awards
  if (path === '/api/awards' && method === 'GET') {
    const rows = await dbAll(env.DB,
      `SELECT a.*, at.name as type_name, at.level as type_level
       FROM awards a LEFT JOIN award_types at ON at.id = a.award_type_id
       WHERE a.teacher_id = ? ORDER BY a.academic_year DESC, a.created_at DESC`, [env.user.id]);
    return success(rows);
  }

  if (path === '/api/awards' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.award_type_id) return error('กรุณาเลือกประเภทรางวัล');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO awards (id, teacher_id, award_type_id, academic_year, status,
       application_date, result_date, result, level_achieved, evidence_ids, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.award_type_id, body.academic_year || new Date().getFullYear() + 543,
       body.status || 'planning', body.application_date || null, body.result_date || null,
       body.result || null, body.level_achieved || null, body.evidence_ids || null,
       body.notes || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/awards/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['award_type_id','academic_year','status','application_date','result_date',
      'result','level_achieved','evidence_ids','notes'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE awards SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM awards WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
