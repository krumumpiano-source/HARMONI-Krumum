// HARMONI — Classroom Materials (สื่อการสอน) API
// GET    /api/classroom-materials                   — list (?subject_id=&material_type=)
// POST   /api/classroom-materials                   — create
// PUT    /api/classroom-materials/:id               — update
// DELETE /api/classroom-materials/:id               — delete
// GET    /api/classroom-materials/:id/vq            — list video questions
// POST   /api/classroom-materials/:id/vq            — create video question
// PUT    /api/classroom-materials/:id/vq/:qid       — update video question
// DELETE /api/classroom-materials/:id/vq/:qid       — delete video question
// POST   /api/classroom-materials/:id/vq/:qid/answer — student answer (no auth check — any student)

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ===== VIDEO QUESTIONS =====
  // GET /api/classroom-materials/:id/vq
  const vqListMatch = path.match(/^\/api\/classroom-materials\/([^/]+)\/vq$/);
  if (vqListMatch) {
    const matId = vqListMatch[1];
    if (method === 'GET') {
      const rows = await dbAll(env.DB,
        'SELECT * FROM video_questions WHERE post_id = ? ORDER BY timestamp_seconds, sort_order',
        [matId]
      );
      return success(rows);
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.question_text) return error('กรุณากรอกคำถาม');
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO video_questions (id, post_id, timestamp_seconds, question_type, question_text, choices, correct_answer, sort_order)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, matId, body.timestamp_seconds || 0, body.question_type || 'multiple_choice',
         body.question_text, body.choices || null, body.correct_answer || null, body.sort_order || 0]
      );
      return success({ id });
    }
  }

  // PUT/DELETE /api/classroom-materials/:id/vq/:qid
  const vqItemMatch = path.match(/^\/api\/classroom-materials\/([^/]+)\/vq\/([^/]+)$/);
  if (vqItemMatch) {
    const [, matId, qid] = vqItemMatch;
    if (method === 'PUT') {
      const body = await parseBody(request);
      const fields = [];
      const params = [];
      for (const f of ['question_text','question_type','choices','correct_answer','timestamp_seconds','sort_order']) {
        if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
      }
      if (!fields.length) return error('ไม่มีข้อมูล');
      params.push(qid);
      await dbRun(env.DB, `UPDATE video_questions SET ${fields.join(',')} WHERE id=?`, params);
      return success({ updated: true });
    }
    if (method === 'DELETE') {
      await dbRun(env.DB, 'DELETE FROM video_questions WHERE id=? AND post_id=?', [qid, matId]);
      return success({ deleted: true });
    }
  }

  // POST /api/classroom-materials/:id/vq/:qid/answer — student submit answer
  const vqAnswerMatch = path.match(/^\/api\/classroom-materials\/([^/]+)\/vq\/([^/]+)\/answer$/);
  if (vqAnswerMatch && method === 'POST') {
    const [, matId, qid] = vqAnswerMatch;
    const body = await parseBody(request);
    const question = await dbFirst(env.DB, 'SELECT * FROM video_questions WHERE id=?', [qid]);
    if (!question) return error('ไม่พบคำถาม');

    let is_correct = null;
    if (question.correct_answer && body.answer !== undefined) {
      is_correct = String(body.answer).toLowerCase().trim() === String(question.correct_answer).toLowerCase().trim() ? 1 : 0;
    }

    const studentId = env.user?.id || body.student_id;
    if (studentId) {
      await dbRun(env.DB,
        `INSERT INTO video_responses (id, video_question_id, student_id, answer, is_correct, answered_at)
         VALUES (?,?,?,?,?,?)`,
        [generateUUID(), qid, studentId, body.answer || '', is_correct, now()]
      );
    }
    return success({ is_correct, correct_answer: question.correct_answer });
  }

  // ===== MATERIALS CRUD =====
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

  const matId = extractParam(path, '/api/classroom-materials/');
  if (matId) {
    // Update
    if (method === 'PUT') {
      const body = await parseBody(request);
      const fields = [], params = [];
      for (const f of ['title','material_type','file_url','description','tags','is_shared']) {
        if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
      }
      if (!fields.length) return error('ไม่มีข้อมูล');
      params.push(matId, env.user.id);
      await dbRun(env.DB, `UPDATE classroom_materials SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
      return success({ updated: true });
    }
    // Delete
    if (method === 'DELETE') {
      await dbRun(env.DB, 'DELETE FROM video_questions WHERE post_id=?', [matId]);
      await dbRun(env.DB, 'DELETE FROM classroom_materials WHERE id=? AND teacher_id=?', [matId, env.user.id]);
      return success({ deleted: true });
    }
  }

  return error('Not found', 404);
}
