// HARMONI — SAR API
// GET    /api/sar              — list
// POST   /api/sar              — create
// PUT    /api/sar/:id          — update
// DELETE /api/sar/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/sar' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM sar_reports WHERE teacher_id = ? ORDER BY academic_year DESC, created_at DESC', [env.user.id]));
  }

  if (path === '/api/sar' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.semester_id || !body.academic_year) return error('กรุณาระบุภาคเรียนและปีการศึกษา');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO sar_reports (id, teacher_id, semester_id, academic_year,
       part1_context, part2_results, part3_analysis, part4_improvement, overall_status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id, body.academic_year,
       body.part1_context || null, body.part2_results || null,
       body.part3_analysis || null, body.part4_improvement || null,
       body.overall_status || 'draft', now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/sar/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['part1_context','part2_results','part3_analysis','part4_improvement','overall_status'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE sar_reports SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM sar_reports WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
