// HARMONI — Classroom Materials (สื่อการสอน) API
// GET    /api/classroom-materials       — list (?subject_id=&material_type=)
// POST   /api/classroom-materials       — create
// DELETE /api/classroom-materials/:id   — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List
  if (path === '/api/classroom-materials' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const matType = url.searchParams.get('material_type');
    let sql = `SELECT cm.*, s.code as subject_code, s.name as subject_name
      FROM classroom_materials cm
      LEFT JOIN subjects s ON s.id = cm.subject_id
      WHERE cm.teacher_id = ?`;
    const params = [env.user.id];
    if (subjectId) { sql += ' AND cm.subject_id = ?'; params.push(subjectId); }
    if (matType) { sql += ' AND cm.material_type = ?'; params.push(matType); }
    sql += ' ORDER BY cm.created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // Create
  if (path === '/api/classroom-materials' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อสื่อ');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO classroom_materials (id, teacher_id, subject_id, title, material_type, file_url, description, tags, is_shared, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.subject_id || null, body.title, body.material_type || null,
       body.file_url || null, body.description || null, body.tags || null, body.is_shared ? 1 : 0, now()]
    );
    return success({ id });
  }

  // Delete
  const matId = extractParam(path, '/api/classroom-materials/');
  if (matId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM classroom_materials WHERE id=? AND teacher_id=?', [matId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
