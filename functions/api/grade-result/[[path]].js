// HARMONI — Grade Results (ผลการเรียน/เกรด) API
// GET    /api/grade-result              — list (?subject_id=&classroom_id=)
// POST   /api/grade-result              — save/compute grades
// GET    /api/grade-result/configs      — list grade configs
// POST   /api/grade-result/configs      — create grade config

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List grade configs
  if (path === '/api/grade-result/configs' && method === 'GET') {
    const configs = await dbAll(env.DB,
      'SELECT * FROM grade_configs WHERE teacher_id = ? ORDER BY is_default DESC, name',
      [env.user.id]
    );
    return success(configs);
  }

  // Create grade config
  if (path === '/api/grade-result/configs' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.name || !body.config_data) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO grade_configs (id, teacher_id, name, config_type, config_data, is_default, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [id, env.user.id, body.name, body.config_type || 'custom',
       typeof body.config_data === 'string' ? body.config_data : JSON.stringify(body.config_data),
       body.is_default ? 1 : 0, now()]
    );
    return success({ id });
  }

  // List grade results
  if (path === '/api/grade-result' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const classroomId = url.searchParams.get('classroom_id');
    if (!subjectId || !classroomId) return error('กรุณาเลือกวิชาและห้องเรียน');

    const results = await dbAll(env.DB,
      `SELECT gr.*, st.student_code, st.first_name, st.last_name
       FROM grade_results gr
       JOIN students st ON st.id = gr.student_id
       WHERE gr.teacher_id = ? AND gr.subject_id = ? AND gr.classroom_id = ?
       ORDER BY st.student_code`,
      [env.user.id, subjectId, classroomId]
    );
    return success(results);
  }

  // Save/compute grades (batch)
  if (path === '/api/grade-result' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.subject_id || !body.classroom_id || !body.semester_id || !body.grade_config_id || !body.records) {
      return error('กรุณากรอกข้อมูลให้ครบ');
    }

    let saved = 0;
    for (const rec of body.records) {
      // Upsert: delete existing then insert
      await dbRun(env.DB,
        'DELETE FROM grade_results WHERE teacher_id=? AND student_id=? AND subject_id=? AND classroom_id=? AND semester_id=?',
        [env.user.id, rec.student_id, body.subject_id, body.classroom_id, body.semester_id]
      );
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO grade_results (id, teacher_id, student_id, subject_id, classroom_id, semester_id, raw_score, grade, grade_config_id, is_final, computed_at, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, env.user.id, rec.student_id, body.subject_id, body.classroom_id, body.semester_id,
         rec.raw_score ?? null, rec.grade || null, body.grade_config_id, body.is_final ? 1 : 0, now(), rec.notes || null]
      );
      saved++;
    }
    return success({ saved });
  }

  return error('Not found', 404);
}
