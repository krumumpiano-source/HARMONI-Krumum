// HARMONI — Instruments (เครื่องดนตรี) API
// GET    /api/instruments              — list
// POST   /api/instruments              — create
// PUT    /api/instruments/:id          — update
// DELETE /api/instruments/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/instruments' && method === 'GET') {
    const category = url.searchParams.get('category');
    const condition = url.searchParams.get('condition');
    let sql = 'SELECT * FROM instruments WHERE teacher_id = ?';
    const params = [env.user.id];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (condition) { sql += ' AND condition = ?'; params.push(condition); }
    sql += ' ORDER BY category, name';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/instruments' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name) return error('กรุณากรอกชื่อเครื่องดนตรี');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO instruments (id, teacher_id, name, category, condition, quantity,
       serial_number, purchase_date, purchase_price, storage_location, notes, photo_url, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.name, body.category || null, body.condition || 'good',
       body.quantity || 1, body.serial_number || null, body.purchase_date || null,
       body.purchase_price || null, body.storage_location || null, body.notes || null,
       body.photo_url || null, now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/instruments/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['name','category','condition','quantity','serial_number','purchase_date',
      'purchase_price','storage_location','notes','photo_url'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE instruments SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM instruments WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
