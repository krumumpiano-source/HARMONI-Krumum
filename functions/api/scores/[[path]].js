// HARMONI — Scores (คะแนน) API
// GET    /api/scores              — list (?subject_id=&classroom_id=&score_type=)
// POST   /api/scores              — batch save scores
// GET    /api/scores/summary      — summary per student
// GET    /api/scores/grid         — spreadsheet grid data (all scores pivoted)
// GET    /api/scores/labels       — distinct score labels (column headers)
// POST   /api/scores/import-quizzes — auto-import from quiz_attempts
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

  // Grid: All scores for a subject+classroom as spreadsheet data
  if (path === '/api/scores/grid' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const classroomId = url.searchParams.get('classroom_id');
    const semesterId = url.searchParams.get('semester_id');
    if (!subjectId || !classroomId) return error('กรุณาเลือกวิชาและห้องเรียน');

    // Get all students
    const students = await dbAll(env.DB,
      `SELECT s.id, s.student_code, s.first_name, s.last_name
       FROM students s
       JOIN student_classrooms sc ON sc.student_id = s.id
       WHERE sc.classroom_id = ?
       ORDER BY s.student_code`,
      [classroomId]
    );

    // Get all scores
    let sql = `SELECT id, student_id, score_type, description, score, max_score
       FROM scores WHERE teacher_id = ? AND subject_id = ? AND classroom_id = ?`;
    const params = [env.user.id, subjectId, classroomId];
    if (semesterId) { sql += ' AND semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY created_at';
    const scores = await dbAll(env.DB, sql, params);

    // Get distinct columns (description as label)
    const colMap = new Map();
    for (const s of scores) {
      const key = s.description || s.score_type;
      if (!colMap.has(key)) colMap.set(key, { label: key, type: s.score_type, max_score: s.max_score });
    }
    const columns = [...colMap.entries()].map(([key, val]) => ({ key, ...val }));

    // Build grid: student rows × score columns
    const grid = students.map(st => {
      const row = { student_id: st.id, student_code: st.student_code, name: `${st.first_name} ${st.last_name}` };
      let total = 0, totalMax = 0;
      for (const col of columns) {
        const sc = scores.find(s => s.student_id === st.id && (s.description || s.score_type) === col.key);
        row[col.key] = sc ? sc.score : null;
        row[`_id_${col.key}`] = sc ? sc.id : null;
        if (sc) { total += sc.score; totalMax += sc.max_score; }
      }
      row._total = total;
      row._totalMax = totalMax;
      row._pct = totalMax > 0 ? ((total / totalMax) * 100).toFixed(1) : '0.0';
      return row;
    });

    return success({ columns, grid, students });
  }

  // Labels: distinct score descriptions
  if (path === '/api/scores/labels' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const classroomId = url.searchParams.get('classroom_id');
    const rows = await dbAll(env.DB,
      `SELECT DISTINCT description, score_type, max_score FROM scores
       WHERE teacher_id = ? AND subject_id = ? AND classroom_id = ? ORDER BY created_at`,
      [env.user.id, subjectId, classroomId]
    );
    return success(rows);
  }

  // Import quizzes: auto-import from quiz_attempts for a subject
  if (path === '/api/scores/import-quizzes' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.subject_id || !body?.classroom_id || !body?.semester_id) return error('ข้อมูลไม่ครบ');

    // Get quiz attempts that haven't been imported yet
    const attempts = await dbAll(env.DB,
      `SELECT qa.student_id, qa.total_score, qa.max_score, t.title as test_title, t.test_type
       FROM quiz_attempts qa
       JOIN tests t ON t.id = qa.test_id
       WHERE t.teacher_id = ? AND t.subject_id = ? AND qa.auto_graded = 1
       AND qa.student_id IN (SELECT student_id FROM student_classrooms WHERE classroom_id = ?)
       AND qa.id NOT IN (SELECT id FROM scores WHERE description LIKE 'quiz:%')
       ORDER BY qa.submitted_at`,
      [env.user.id, body.subject_id, body.classroom_id]
    );

    let imported = 0;
    for (const a of attempts) {
      await dbRun(env.DB,
        `INSERT INTO scores (id, teacher_id, student_id, subject_id, classroom_id, semester_id, score_type, score, max_score, description, scored_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [generateUUID(), env.user.id, a.student_id, body.subject_id, body.classroom_id, body.semester_id,
         a.test_type || 'quiz', a.total_score, a.max_score, `quiz:${a.test_title}`, now(), now()]
      );
      imported++;
    }
    return success({ imported });
  }

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

    const description = body.description || body.score_label || body.score_type;
    let saved = 0;
    for (const rec of body.records) {
      if (rec.score === null || rec.score === undefined || rec.score === '') continue;
      // Upsert: if existing score for same student+description, update
      if (rec.id) {
        await dbRun(env.DB, 'UPDATE scores SET score = ? WHERE id = ? AND teacher_id = ?',
          [parseFloat(rec.score), rec.id, env.user.id]);
      } else {
        const id = generateUUID();
        await dbRun(env.DB,
          `INSERT INTO scores (id, teacher_id, student_id, subject_id, classroom_id, semester_id, score_type, score, max_score, description, scored_at, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, env.user.id, rec.student_id, body.subject_id, body.classroom_id, body.semester_id,
           body.score_type, parseFloat(rec.score), parseFloat(body.max_score), description, now(), now()]
        );
      }
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
