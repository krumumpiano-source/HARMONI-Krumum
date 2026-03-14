// HARMONI — Quick Drop API
// GET    /api/quick-drop              — list drops
// POST   /api/quick-drop              — create drop
// PUT    /api/quick-drop/:id          — update (link to module)
// DELETE /api/quick-drop/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/quick-drop' && method === 'GET') {
    const status = url.searchParams.get('status');
    let sql = 'SELECT * FROM quick_drops WHERE teacher_id = ?';
    const params = [env.user.id];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY dropped_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/quick-drop' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || (!body.content && !body.file_url)) return error('กรุณากรอกเนื้อหาหรือไฟล์');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO quick_drops (id, teacher_id, content, file_url, file_type, status, dropped_at)
       VALUES (?,?,?,?,?,?,?)`,
      [id, env.user.id, body.content || null, body.file_url || null,
       body.file_type || null, 'pending', now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/quick-drop/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['content','file_url','file_type','ai_category','ai_module_links',
      'status','linked_to_module','linked_to_id'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (body.status === 'categorized' || body.linked_to_module) {
      fields.push('categorized_at=?'); params.push(now());
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE quick_drops SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM quick_drops WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
