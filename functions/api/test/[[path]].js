// HARMONI — Test (แบบทดสอบ) API
// GET    /api/test                   — list tests
// POST   /api/test                   — create test
// PUT    /api/test/:id               — update test
// DELETE /api/test/:id               — delete test
// GET    /api/test/:id/questions      — list questions
// POST   /api/test/:id/questions      — save questions (batch)
// GET    /api/test/:id/responses      — list responses

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List tests
  if (path === '/api/test' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    let sql = 'SELECT * FROM tests WHERE teacher_id = ?';
    const params = [env.user.id];
    if (subjectId) { sql += ' AND subject_id = ?'; params.push(subjectId); }
    sql += ' ORDER BY created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // Create test
  if (path === '/api/test' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('กรุณากรอกชื่อแบบทดสอบ');
    if (!body.subject_id) return error('กรุณาเลือกวิชา');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO tests (id, teacher_id, subject_id, semester_id, title, test_type, total_questions,
       total_score, time_limit_minutes, instructions, passing_score, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.subject_id, body.semester_id, body.title,
       body.test_type || 'quiz', body.total_questions || 0, body.total_score || 0,
       body.time_limit_minutes || null, body.instructions || null, body.passing_score || null, now()]
    );
    return success({ id });
  }

  // Questions endpoints
  const qMatch = path.match(/^\/api\/test\/([^/]+)\/questions$/);
  if (qMatch) {
    const testId = qMatch[1];
    // Verify test belongs to this teacher
    const testOwner = await dbFirst(env.DB, 'SELECT id FROM tests WHERE id = ? AND teacher_id = ?', [testId, env.user.id]);
    if (!testOwner) return error('ไม่พบแบบทดสอบ', 404);
    if (method === 'GET') {
      const rows = await dbAll(env.DB,
        'SELECT * FROM test_questions WHERE test_id = ? ORDER BY sort_order, question_number', [testId]);
      return success(rows);
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !Array.isArray(body.questions)) return error('กรุณาส่ง questions');
      await dbRun(env.DB, 'DELETE FROM test_questions WHERE test_id = ?', [testId]);
      for (const q of body.questions) {
        await dbRun(env.DB,
          `INSERT INTO test_questions (id, test_id, question_number, question_type, question_text,
           choices, correct_answer, matching_pairs, correct_order, media_url, score, bloom_level, difficulty, sort_order)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [generateUUID(), testId, q.question_number || 0, q.question_type || 'multiple_choice',
           q.question_text, q.choices || null, q.correct_answer || null,
           q.matching_pairs || null, q.correct_order || null, q.media_url || null,
           q.score || 1, q.bloom_level || null, q.difficulty || null, q.sort_order || 0]
        );
      }
      // Update test totals
      await dbRun(env.DB,
        `UPDATE tests SET total_questions = ?, total_score = (SELECT COALESCE(SUM(score),0) FROM test_questions WHERE test_id = ?) WHERE id = ?`,
        [body.questions.length, testId, testId]);
      return success({ saved: body.questions.length });
    }
  }

  // Responses — read from quiz_attempts (where students actually submit)
  const rMatch = path.match(/^\/api\/test\/([^/]+)\/responses$/);
  if (rMatch) {
    const testId = rMatch[1];
    if (method === 'GET') {
      const rows = await dbAll(env.DB,
        `SELECT qa.id, qa.test_id, qa.student_id, qa.attempt_number, qa.answers, 
                qa.total_score, qa.max_score, qa.submitted_at, qa.auto_graded, qa.time_spent_seconds,
                s.student_code, s.first_name, s.last_name
         FROM quiz_attempts qa JOIN students s ON s.id = qa.student_id
         WHERE qa.test_id = ? ORDER BY s.student_code, qa.attempt_number`,
        [testId]);
      return success(rows);
    }
  }

  // ======================== LIVE QUIZ ========================
  // POST /api/test/live/create — create a live session
  if (path === '/api/test/live/create' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.test_id) return error('กรุณาเลือกแบบทดสอบ');
    const test = await dbFirst(env.DB, 'SELECT id FROM tests WHERE id = ? AND teacher_id = ?', [body.test_id, env.user.id]);
    if (!test) return error('ไม่พบแบบทดสอบ', 404);
    // Generate unique 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO live_sessions (id, teacher_id, test_id, session_code, status, scoring_mode, team_mode, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.test_id, code, 'waiting', body.scoring_mode || 'speed_accuracy', body.team_mode ? 1 : 0, now()]
    );
    return success({ id, session_code: code });
  }

  // GET /api/test/live/:sessionId — get live session status + participants
  const liveMatch = path.match(/^\/api\/test\/live\/([^/]+)$/);
  if (liveMatch && method === 'GET') {
    const sessionId = liveMatch[1];
    const session = await dbFirst(env.DB, 'SELECT * FROM live_sessions WHERE id = ? AND teacher_id = ?', [sessionId, env.user.id]);
    if (!session) return error('ไม่พบ session', 404);
    const participants = await dbAll(env.DB,
      `SELECT lp.*, st.first_name, st.last_name, st.student_code
       FROM live_participants lp
       JOIN students st ON st.id = lp.student_id
       WHERE lp.session_id = ? ORDER BY lp.total_score DESC`,
      [sessionId]
    );
    const questions = await dbAll(env.DB,
      'SELECT id, question_number, question_type, question_text, choices, score, sort_order FROM test_questions WHERE test_id = ? ORDER BY sort_order',
      [session.test_id]
    );
    return success({ session, participants, questions });
  }

  // POST /api/test/live/:sessionId/next — advance to next question
  const liveNextMatch = path.match(/^\/api\/test\/live\/([^/]+)\/next$/);
  if (liveNextMatch && method === 'POST') {
    const sessionId = liveNextMatch[1];
    const session = await dbFirst(env.DB, 'SELECT * FROM live_sessions WHERE id = ? AND teacher_id = ?', [sessionId, env.user.id]);
    if (!session) return error('ไม่พบ session', 404);
    const nextQ = session.current_question + 1;
    const totalQ = await dbFirst(env.DB, 'SELECT COUNT(*) as cnt FROM test_questions WHERE test_id = ?', [session.test_id]);
    if (nextQ > totalQ.cnt) {
      // Finish
      await dbRun(env.DB, "UPDATE live_sessions SET status = 'finished', finished_at = ?, current_question = ? WHERE id = ?",
        [now(), nextQ, sessionId]);
      return success({ finished: true, current_question: nextQ });
    }
    await dbRun(env.DB, "UPDATE live_sessions SET status = 'question', current_question = ?, started_at = COALESCE(started_at, ?) WHERE id = ?",
      [nextQ, now(), sessionId]);
    return success({ current_question: nextQ });
  }

  // GET /api/test/live/:sessionId/responses — get all responses for current question
  const liveRespMatch = path.match(/^\/api\/test\/live\/([^/]+)\/responses$/);
  if (liveRespMatch && method === 'GET') {
    const sessionId = liveRespMatch[1];
    const session = await dbFirst(env.DB, 'SELECT current_question FROM live_sessions WHERE id = ? AND teacher_id = ?', [sessionId, env.user.id]);
    if (!session) return error('ไม่พบ session', 404);
    const responses = await dbAll(env.DB,
      `SELECT lr.*, st.first_name, st.last_name, st.student_code
       FROM live_responses lr
       JOIN students st ON st.id = lr.student_id
       WHERE lr.session_id = ? ORDER BY lr.time_ms ASC`,
      [sessionId]
    );
    // Leaderboard
    const leaderboard = await dbAll(env.DB,
      `SELECT lp.student_id, lp.total_score, lp.total_xp, st.first_name, st.last_name, st.student_code
       FROM live_participants lp
       JOIN students st ON st.id = lp.student_id
       WHERE lp.session_id = ? ORDER BY lp.total_score DESC LIMIT 10`,
      [sessionId]
    );
    return success({ responses, leaderboard });
  }

  // POST /api/test/live/:sessionId/end — end session
  const liveEndMatch = path.match(/^\/api\/test\/live\/([^/]+)\/end$/);
  if (liveEndMatch && method === 'POST') {
    const sessionId = liveEndMatch[1];
    await dbRun(env.DB, "UPDATE live_sessions SET status = 'finished', finished_at = ? WHERE id = ? AND teacher_id = ?",
      [now(), sessionId, env.user.id]);
    return success({ finished: true });
  }

  // Update / Delete / Publish
  const testId = extractParam(path, '/api/test/');
  if (testId && testId !== 'live' && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['title','test_type','time_limit_minutes','instructions','passing_score','is_published','allow_review','shuffle_questions','shuffle_choices','max_attempts'];
    for (const f of allowed) {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(testId, env.user.id);
    await dbRun(env.DB, `UPDATE tests SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }
  if (testId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM test_questions WHERE test_id = ?', [testId]);
    await dbRun(env.DB, 'DELETE FROM test_responses WHERE test_id = ?', [testId]);
    await dbRun(env.DB, 'DELETE FROM tests WHERE id = ? AND teacher_id = ?', [testId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
