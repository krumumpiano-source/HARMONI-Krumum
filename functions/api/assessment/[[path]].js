// HARMONI — Assessment Tools (เครื่องมือวัดผล) API
// GET    /api/assessment              — list tools
// POST   /api/assessment              — create tool
// PUT    /api/assessment/:id          — update tool
// DELETE /api/assessment/:id          — delete tool
// GET    /api/assessment/:id/rubric   — list rubric criteria
// POST   /api/assessment/:id/rubric   — save rubric criteria (batch)

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
  if (path === '/api/assessment' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    let sql = 'SELECT * FROM assessment_tools WHERE teacher_id = ?';
    const params = [env.user.id];
    if (subjectId) { sql += ' AND subject_id = ?'; params.push(subjectId); }
    sql += ' ORDER BY created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // Create
  if (path === '/api/assessment' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name) return error('กรุณากรอกชื่อเครื่องมือ');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO assessment_tools (id, teacher_id, name, tool_type, subject_id, description, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [id, env.user.id, body.name, body.tool_type || null, body.subject_id || null, body.description || null, now()]
    );
    return success({ id });
  }

  // Rubric endpoints
  const rubricMatch = path.match(/^\/api\/assessment\/([^/]+)\/rubric$/);
  if (rubricMatch) {
    const toolId = rubricMatch[1];
    // Verify tool belongs to this teacher
    const tool = await dbFirst(env.DB, 'SELECT id FROM assessment_tools WHERE id = ? AND teacher_id = ?', [toolId, env.user.id]);
    if (!tool) return error('ไม่พบเครื่องมือวัดผล', 404);
    if (method === 'GET') {
      const rows = await dbAll(env.DB,
        'SELECT * FROM rubric_criteria WHERE assessment_tool_id = ? ORDER BY sort_order',
        [toolId]);
      return success(rows);
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !Array.isArray(body.criteria)) return error('กรุณาส่ง criteria');
      await dbRun(env.DB, 'DELETE FROM rubric_criteria WHERE assessment_tool_id = ?', [toolId]);
      for (const c of body.criteria) {
        await dbRun(env.DB,
          `INSERT INTO rubric_criteria (id, assessment_tool_id, criterion, max_score, levels, sort_order)
           VALUES (?,?,?,?,?,?)`,
          [generateUUID(), toolId, c.criterion, c.max_score || 0, c.levels || null, c.sort_order || 0]
        );
      }
      return success({ saved: body.criteria.length });
    }
  }

  // Update / Delete by ID
  const itemId = extractParam(path, '/api/assessment/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE assessment_tools SET name=COALESCE(?,name), tool_type=COALESCE(?,tool_type),
       subject_id=COALESCE(?,subject_id), description=COALESCE(?,description) WHERE id=? AND teacher_id=?`,
      [body.name || null, body.tool_type || null, body.subject_id || null,
       body.description || null, itemId, env.user.id]
    );
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM rubric_criteria WHERE assessment_tool_id = ?', [itemId]);
    await dbRun(env.DB, 'DELETE FROM assessment_tools WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
