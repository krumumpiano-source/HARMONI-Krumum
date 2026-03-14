// HARMONI — Portfolio (เก็บผลงาน) API
// GET    /api/portfolio         — list (?category=)
// POST   /api/portfolio         — create
// PUT    /api/portfolio/:id     — update
// DELETE /api/portfolio/:id     — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List
  if (path === '/api/portfolio' && method === 'GET') {
    const category = url.searchParams.get('category');
    let sql = 'SELECT * FROM portfolio_items WHERE teacher_id = ?';
    const params = [env.user.id];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY is_featured DESC, date DESC, created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // Create
  if (path === '/api/portfolio' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อผลงาน');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO portfolio_items (id, teacher_id, title, category, description, file_urls, date, tags, is_featured, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.title, body.category || null, body.description || null,
       body.file_urls || null, body.date || null, body.tags || null, body.is_featured ? 1 : 0, now()]
    );
    return success({ id });
  }

  // Update (toggle featured)
  const itemId = extractParam(path, '/api/portfolio/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE portfolio_items SET title=COALESCE(?,title), category=COALESCE(?,category),
       description=COALESCE(?,description), is_featured=COALESCE(?,is_featured) WHERE id=? AND teacher_id=?`,
      [body.title || null, body.category || null, body.description || null,
       body.is_featured !== undefined ? (body.is_featured ? 1 : 0) : null, itemId, env.user.id]
    );
    return success({ updated: true });
  }

  // Delete
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM portfolio_items WHERE id=? AND teacher_id=?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
