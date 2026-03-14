// HARMONI — Cover Designer (ออกแบบปก) API
// GET    /api/cover-designer              — list templates
// POST   /api/cover-designer              — create template
// PUT    /api/cover-designer/:id          — update
// DELETE /api/cover-designer/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/cover-designer' && method === 'GET') {
    const templateType = url.searchParams.get('template_type');
    let sql = 'SELECT * FROM cover_templates WHERE teacher_id = ?';
    const params = [env.user.id];
    if (templateType) { sql += ' AND template_type = ?'; params.push(templateType); }
    sql += ' ORDER BY created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/cover-designer' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name) return error('กรุณากรอกชื่อเทมเพลต');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO cover_templates (id, teacher_id, name, template_type, design_data, preview_url, is_default, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.name, body.template_type || null, body.design_data || null,
       body.preview_url || null, body.is_default ? 1 : 0, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/cover-designer/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['name','template_type','design_data','preview_url','is_default'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(f === 'is_default' ? (body[f] ? 1 : 0) : body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE cover_templates SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM cover_templates WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
