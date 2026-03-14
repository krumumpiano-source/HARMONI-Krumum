// HARMONI — PA (วPA) API
// GET    /api/pa                     — list agreements
// POST   /api/pa                     — create agreement
// PUT    /api/pa/:id                 — update agreement
// DELETE /api/pa/:id                 — delete agreement
// GET    /api/pa/:id/result          — get result
// POST   /api/pa/:id/result          — save result

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/pa' && method === 'GET') {
    return success(await dbAll(env.DB,
      'SELECT * FROM pa_agreements WHERE teacher_id = ? ORDER BY academic_year DESC, created_at DESC', [env.user.id]));
  }

  if (path === '/api/pa' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.semester_id || !body.academic_year) return error('กรุณาระบุภาคเรียนและปีการศึกษา');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO pa_agreements (id, teacher_id, semester_id, academic_year,
       teaching_hours_target, support_hours_target, other_hours_target,
       teaching_duties, support_duties, other_duties, challenging_task,
       innovation_plan, research_plan, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id, body.academic_year,
       body.teaching_hours_target || null, body.support_hours_target || null, body.other_hours_target || null,
       body.teaching_duties || null, body.support_duties || null, body.other_duties || null,
       body.challenging_task || null, body.innovation_plan || null, body.research_plan || null, now()]
    );
    return success({ id });
  }

  // Result endpoints
  const resultMatch = path.match(/^\/api\/pa\/([^/]+)\/result$/);
  if (resultMatch) {
    const paId = resultMatch[1];
    if (method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM pa_results WHERE pa_agreement_id = ? AND teacher_id = ?', [paId, env.user.id]);
      return success(row);
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      // Upsert
      const existing = await dbFirst(env.DB,
        'SELECT id FROM pa_results WHERE pa_agreement_id = ? AND teacher_id = ?', [paId, env.user.id]);
      if (existing) {
        const fields = [];
        const params = [];
        const allowed = ['teaching_hours_actual','support_hours_actual','other_hours_actual',
          'teaching_results','support_results','other_results','student_quality_results',
          'research_results','innovation_results','evidence_summary','self_assessment_score','status'];
        for (const f of allowed) {
          if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
        }
        fields.push('updated_at=?'); params.push(now());
        params.push(existing.id);
        await dbRun(env.DB, `UPDATE pa_results SET ${fields.join(',')} WHERE id=?`, params);
        return success({ id: existing.id, updated: true });
      } else {
        const id = generateUUID();
        await dbRun(env.DB,
          `INSERT INTO pa_results (id, pa_agreement_id, teacher_id,
           teaching_hours_actual, support_hours_actual, other_hours_actual,
           teaching_results, support_results, other_results, student_quality_results,
           research_results, innovation_results, evidence_summary, self_assessment_score, status, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, paId, env.user.id,
           body.teaching_hours_actual || null, body.support_hours_actual || null, body.other_hours_actual || null,
           body.teaching_results || null, body.support_results || null, body.other_results || null,
           body.student_quality_results || null, body.research_results || null, body.innovation_results || null,
           body.evidence_summary || null, body.self_assessment_score || null, body.status || 'draft', now()]
        );
        return success({ id });
      }
    }
  }

  const itemId = extractParam(path, '/api/pa/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['teaching_hours_target','support_hours_target','other_hours_target',
      'teaching_duties','support_duties','other_duties','challenging_task','innovation_plan','research_plan'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE pa_agreements SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM pa_results WHERE pa_agreement_id = ?', [itemId]);
    await dbRun(env.DB, 'DELETE FROM pa_agreements WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
