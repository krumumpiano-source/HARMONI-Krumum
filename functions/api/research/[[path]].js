// HARMONI — Research (วิจัยในชั้นเรียน) API
// GET    /api/research              — list
// POST   /api/research              — create
// PUT    /api/research/:id          — update
// DELETE /api/research/:id          — delete
// GET    /api/research/:id/cycles   — list cycles
// POST   /api/research/:id/cycles   — add cycle

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/research' && method === 'GET') {
    const rows = await dbAll(env.DB,
      'SELECT * FROM researches WHERE teacher_id = ? ORDER BY created_at DESC', [env.user.id]);
    return success(rows);
  }

  if (path === '/api/research' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อเรื่องวิจัย');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO researches (id, teacher_id, semester_id, title, problem_statement, objectives,
       hypothesis, methodology, population, sample, instruments, data_collection, data_analysis,
       results, conclusion, recommendations, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id, body.title, body.problem_statement || null,
       body.objectives || null, body.hypothesis || null, body.methodology || null,
       body.population || null, body.sample || null, body.instruments || null,
       body.data_collection || null, body.data_analysis || null, body.results || null,
       body.conclusion || null, body.recommendations || null, body.status || 'draft', now(), now()]
    );
    return success({ id });
  }

  // Cycles
  const cycleMatch = path.match(/^\/api\/research\/([^/]+)\/cycles$/);
  if (cycleMatch) {
    const researchId = cycleMatch[1];
    if (method === 'GET') {
      return success(await dbAll(env.DB,
        'SELECT * FROM research_cycles WHERE research_id = ? ORDER BY cycle_number', [researchId]));
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO research_cycles (id, research_id, cycle_number, plan, action, check_results, adjustment, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, researchId, body.cycle_number || 1, body.plan || null, body.action || null,
         body.check_results || null, body.adjustment || null, now()]
      );
      return success({ id });
    }
  }

  const itemId = extractParam(path, '/api/research/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['title','problem_statement','objectives','hypothesis','methodology','population',
      'sample','instruments','data_collection','data_analysis','results','conclusion','recommendations','status'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    fields.push('updated_at=?'); params.push(now());
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE researches SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM research_cycles WHERE research_id = ?', [itemId]);
    await dbRun(env.DB, 'DELETE FROM researches WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
