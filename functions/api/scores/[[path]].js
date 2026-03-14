// HARMONI — Scores (คะแนน) API
// GET    /api/scores              — list (?subject_id=&classroom_id=&score_type=)
// POST   /api/scores              — batch save scores
// GET    /api/scores/summary      — summary per student
// DELETE /api/scores/:id          — delete single score

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Summary: total scores per student for a subject+classroom
  if (path === '/api/scores/summary' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const classroomId = url.searchParams.get('classroom_id');
    const semesterId = url.searchParams.get('semester_id');
    if (!subjectId || !classroomId) return error('กรุณาเลือกวิชาและห้องเรียน');

    const rows = await dbAll(env.DB,
      `SELECT s.student_id, st.student_code, st.first_name, st.last_name,
       SUM(s.score) as total_score, SUM(s.max_score) as total_max,
       COUNT(*) as score_count
       FROM scores s
       JOIN students st ON st.id = s.student_id
       WHERE s.teacher_id = ? AND s.subject_id = ? AND s.classroom_id = ?
       ${semesterId ? 'AND s.semester_id = ?' : ''}
       GROUP BY s.student_id
       ORDER BY st.student_code`,
      semesterId ? [env.user.id, subjectId, classroomId, semesterId] : [env.user.id, subjectId, classroomId]
    );
    return success(rows);
  }

  // List scores
  if (path === '/api/scores' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const classroomId = url.searchParams.get('classroom_id');
    const scoreType = url.searchParams.get('score_type');

    let sql = `SELECT s.*, st.student_code, st.first_name, st.last_name
      FROM scores s JOIN students st ON st.id = s.student_id
      WHERE s.teacher_id = ?`;
    const params = [env.user.id];
    if (subjectId) { sql += ' AND s.subject_id = ?'; params.push(subjectId); }
    if (classroomId) { sql += ' AND s.classroom_id = ?'; params.push(classroomId); }
    if (scoreType) { sql += ' AND s.score_type = ?'; params.push(scoreType); }
    sql += ' ORDER BY st.student_code, s.score_type';
    return success(await dbAll(env.DB, sql, params));
  }

  // Batch save scores
  if (path === '/api/scores' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.records || !body.subject_id || !body.classroom_id || !body.semester_id || !body.score_type || !body.max_score) {
      return error('กรุณากรอกข้อมูลให้ครบ');
    }

    const description = body.description || body.score_type;
    let saved = 0;
    for (const rec of body.records) {
      if (rec.score === null || rec.score === undefined || rec.score === '') continue;
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO scores (id, teacher_id, student_id, subject_id, classroom_id, semester_id, score_type, score, max_score, description, scored_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, env.user.id, rec.student_id, body.subject_id, body.classroom_id, body.semester_id,
         body.score_type, parseFloat(rec.score), parseFloat(body.max_score), description, now(), now()]
      );
      saved++;
    }
    return success({ saved });
  }

  // Delete score
  const scoreId = extractParam(path, '/api/scores/');
  if (scoreId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM scores WHERE id=? AND teacher_id=?', [scoreId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
