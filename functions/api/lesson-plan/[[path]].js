// HARMONI — Lesson Plan (แผนการจัดการเรียนรู้) API
// GET    /api/lesson-plan         — list (?unit_id=)
// POST   /api/lesson-plan         — create
// PUT    /api/lesson-plan/:id     — update
// DELETE /api/lesson-plan/:id     — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

async function getDefaultModelId(db, teacherId) {
  const model = await dbFirst(db, `SELECT id FROM lesson_models WHERE teacher_id = ? LIMIT 1`, [teacherId]);
  if (model) return model.id;
  const preset = await dbFirst(db, `SELECT id FROM lesson_models WHERE is_preset = 1 LIMIT 1`, []);
  if (preset) return preset.id;
  const id = generateUUID();
  await dbRun(db, `INSERT INTO lesson_models (id, teacher_id, name, category, is_preset, created_at) VALUES (?,?,'แผนการสอนทั่วไป','traditional',0,?)`, [id, teacherId, now()]);
  return id;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/lesson-plan' && method === 'GET') {
    const unitId = url.searchParams.get('unit_id');
    let sql = `SELECT lp.*, lu.title as unit_title, lu.unit_number FROM lesson_plans lp LEFT JOIN learning_units lu ON lu.id = lp.learning_unit_id WHERE lp.teacher_id = ?`;
    const params = [env.user.id];
    if (unitId) { sql += ' AND lp.learning_unit_id = ?'; params.push(unitId); }
    sql += ' ORDER BY lp.plan_number, lp.date';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/lesson-plan' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title || !body.learning_unit_id || !body.semester_id) return error('กรุณากรอกข้อมูลให้ครบ');
    const modelId = body.lesson_model_id || await getDefaultModelId(env.DB, env.user.id);
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO lesson_plans (id, teacher_id, learning_unit_id, semester_id, plan_number, title, lesson_model_id, date, period, duration_minutes, objectives, content, steps, materials, assessment_notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.learning_unit_id, body.semester_id, body.plan_number || 1, body.title, modelId, body.date || null, body.period || null, body.duration_minutes || 50, body.objectives || null, body.content || null, body.steps || null, body.materials || null, body.assessment_notes || null, now(), now()]
    );
    return success({ id });
  }

  const planId = extractParam(path, '/api/lesson-plan/');
  if (planId && method === 'PUT') {
    const body = await parseBody(request);
    if (!body) return error('ข้อมูลไม่ถูกต้อง');
    await dbRun(env.DB,
      `UPDATE lesson_plans SET title=COALESCE(?,title), objectives=COALESCE(?,objectives), content=COALESCE(?,content), steps=COALESCE(?,steps), materials=COALESCE(?,materials), assessment_notes=COALESCE(?,assessment_notes), date=COALESCE(?,date), period=COALESCE(?,period), plan_number=COALESCE(?,plan_number), duration_minutes=COALESCE(?,duration_minutes), updated_at=? WHERE id=? AND teacher_id=?`,
      [body.title||null, body.objectives||null, body.content||null, body.steps||null, body.materials||null, body.assessment_notes||null, body.date||null, body.period||null, body.plan_number||null, body.duration_minutes||null, now(), planId, env.user.id]
    );
    return success({ updated: true });
  }

  if (planId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM lesson_plans WHERE id=? AND teacher_id=?', [planId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}