// HARMONI — SDQ Screening API
// GET    /api/sdq              — list
// POST   /api/sdq              — create
// PUT    /api/sdq/:id          — update
// DELETE /api/sdq/:id          — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/sdq' && method === 'GET') {
    const studentId = url.searchParams.get('student_id');
    const semesterId = url.searchParams.get('semester_id');
    let sql = `SELECT sd.*, s.student_code, s.first_name, s.last_name
               FROM sdq_screenings sd JOIN students s ON s.id = sd.student_id
               WHERE sd.teacher_id = ?`;
    const params = [env.user.id];
    if (studentId) { sql += ' AND sd.student_id = ?'; params.push(studentId); }
    if (semesterId) { sql += ' AND sd.semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY sd.screen_date DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path === '/api/sdq' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.student_id) return error('กรุณาเลือกนักเรียน');
    // Compute total difficulty
    const emotional = parseInt(body.emotional_score) || 0;
    const conduct = parseInt(body.conduct_score) || 0;
    const hyperactivity = parseInt(body.hyperactivity_score) || 0;
    const peer = parseInt(body.peer_score) || 0;
    const prosocial = parseInt(body.prosocial_score) || 0;
    const totalDifficulty = emotional + conduct + hyperactivity + peer;
    // Risk level
    let riskLevel = 'ปกติ';
    if (totalDifficulty >= 20) riskLevel = 'มีปัญหา';
    else if (totalDifficulty >= 14) riskLevel = 'เสี่ยง';
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO sdq_screenings (id, teacher_id, student_id, semester_id, screen_date,
       respondent_type, emotional_score, conduct_score, hyperactivity_score, peer_score,
       prosocial_score, total_difficulty, risk_level, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.student_id, body.semester_id || null,
       body.screen_date || now().split('T')[0], body.respondent_type || 'teacher',
       emotional, conduct, hyperactivity, peer, prosocial, totalDifficulty, riskLevel, now()]
    );
    return success({ id, total_difficulty: totalDifficulty, risk_level: riskLevel });
  }

  const itemId = extractParam(path, '/api/sdq/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['screen_date','respondent_type','emotional_score','conduct_score',
      'hyperactivity_score','peer_score','prosocial_score','risk_level'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    // Recalculate if scores changed
    if (body.emotional_score !== undefined || body.conduct_score !== undefined ||
        body.hyperactivity_score !== undefined || body.peer_score !== undefined) {
      const total = (parseInt(body.emotional_score) || 0) + (parseInt(body.conduct_score) || 0) +
                    (parseInt(body.hyperactivity_score) || 0) + (parseInt(body.peer_score) || 0);
      fields.push('total_difficulty=?'); params.push(total);
      let risk = 'ปกติ';
      if (total >= 20) risk = 'มีปัญหา';
      else if (total >= 14) risk = 'เสี่ยง';
      fields.push('risk_level=?'); params.push(risk);
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE sdq_screenings SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM sdq_screenings WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
