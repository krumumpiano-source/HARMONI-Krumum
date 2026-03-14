// HARMONI — Documents (เอกสาร) API
// GET    /api/documents              — list documents
// POST   /api/documents              — create document
// PUT    /api/documents/:id          — update
// DELETE /api/documents/:id          — delete
// GET    /api/documents/types        — list document types
// POST   /api/documents/types        — create type

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Document types
  if (path === '/api/documents/types' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM document_types WHERE teacher_id = ? OR is_preset = 1 ORDER BY category, name', [env.user.id]));
  }
  if (path === '/api/documents/types' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name) return error('กรุณากรอกชื่อประเภทเอกสาร');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO document_types (id, teacher_id, name, category, template_structure, is_preset)
       VALUES (?,?,?,?,?,0)`,
      [id, env.user.id, body.name, body.category || null, body.template_structure || null]
    );
    return success({ id });
  }

  // List documents
  if (path === '/api/documents' && method === 'GET') {
    const typeId = url.searchParams.get('document_type_id');
    let sql = `SELECT d.*, dt.name as type_name, dt.category as type_category
               FROM documents d LEFT JOIN document_types dt ON dt.id = d.document_type_id
               WHERE d.teacher_id = ?`;
    const params = [env.user.id];
    if (typeId) { sql += ' AND d.document_type_id = ?'; params.push(typeId); }
    sql += ' ORDER BY d.updated_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/documents' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อเอกสาร');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO documents (id, teacher_id, document_type_id, title, content, file_url, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.document_type_id || null, body.title, body.content || null,
       body.file_url || null, body.status || 'draft', now(), now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/documents/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['document_type_id','title','content','file_url','status'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    fields.push('updated_at=?'); params.push(now());
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE documents SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM documents WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
