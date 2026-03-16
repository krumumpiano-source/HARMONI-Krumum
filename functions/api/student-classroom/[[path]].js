// HARMONI — Student-Classroom (สั่งงาน/ตรวจงาน) API
// GET    /api/student-classroom/posts   — list posts (?classroom_id=&subject_id=)
// POST   /api/student-classroom/posts   — create post
// DELETE /api/student-classroom/posts/:id — delete post
// GET    /api/student-classroom/submissions/:postId — list submissions
// POST   /api/student-classroom/grade   — grade a submission

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

// Get or create subject_classroom pair
async function getOrCreateSC(db, teacherId, subjectId, classroomId, semesterId) {
  let sc = await dbFirst(db,
    `SELECT id FROM subject_classrooms WHERE teacher_id=? AND subject_id=? AND classroom_id=? AND semester_id=?`,
    [teacherId, subjectId, classroomId, semesterId]
  );
  if (sc) return sc.id;
  const id = generateUUID();
  await dbRun(db,
    `INSERT INTO subject_classrooms (id, teacher_id, subject_id, classroom_id, semester_id, created_at) VALUES (?,?,?,?,?,?)`,
    [id, teacherId, subjectId, classroomId, semesterId, now()]
  );
  return id;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List posts
  if (path === '/api/student-classroom/posts' && method === 'GET') {
    const classroomId = url.searchParams.get('classroom_id');
    const subjectId = url.searchParams.get('subject_id');
    if (!classroomId || !subjectId) return error('กรุณาเลือกห้องเรียนและวิชา');

    const posts = await dbAll(env.DB,
      `SELECT cp.*, s.name as subject_name, s.code as subject_code, c.name as classroom_name,
       (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.post_id = cp.id) as submission_count,
       (SELECT COUNT(*) FROM students st WHERE st.classroom_id = ?) as total_students
       FROM classroom_posts cp
       JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
       JOIN subjects s ON s.id = sc.subject_id
       JOIN classrooms c ON c.id = sc.classroom_id
       WHERE sc.teacher_id = ? AND sc.classroom_id = ? AND sc.subject_id = ?
       ORDER BY cp.is_pinned DESC, cp.created_at DESC`,
      [classroomId, env.user.id, classroomId, subjectId]
    );
    return success(posts);
  }

  // Create post
  if (path === '/api/student-classroom/posts' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title || !body.classroom_id || !body.subject_id || !body.semester_id) {
      return error('กรุณากรอกข้อมูลให้ครบ');
    }

    const scId = await getOrCreateSC(env.DB, env.user.id, body.subject_id, body.classroom_id, body.semester_id);
    const postId = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO classroom_posts (id, teacher_id, subject_classroom_id, post_type, title, content, due_date, max_score,
       test_id, attachments, assignment_type, allow_late, lesson_plan_id, poll_options, topic_id, is_published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [postId, env.user.id, scId, body.post_type || 'announcement', body.title, body.content || null,
       body.due_date || null, body.max_score || null,
       body.test_id || null, body.attachments ? JSON.stringify(body.attachments) : null,
       body.assignment_type || 'file', body.allow_late ? 1 : 0,
       body.lesson_plan_id || null, body.poll_options ? JSON.stringify(body.poll_options) : null,
       body.topic_id || null, body.is_published !== false ? 1 : 0, now(), now()]
    );
    return success({ id: postId });
  }

  // Clone post to another classroom
  if (path === '/api/student-classroom/clone' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.post_id || !body?.classroom_id || !body?.subject_id || !body?.semester_id) {
      return error('กรุณาระบุ post_id และห้องเรียนปลายทาง');
    }
    const original = await dbFirst(env.DB, 'SELECT * FROM classroom_posts WHERE id = ? AND teacher_id = ?', [body.post_id, env.user.id]);
    if (!original) return error('ไม่พบโพสต์ต้นทาง', 404);
    const scId = await getOrCreateSC(env.DB, env.user.id, body.subject_id, body.classroom_id, body.semester_id);
    const newId = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO classroom_posts (id, teacher_id, subject_classroom_id, post_type, title, content, due_date, max_score,
       test_id, attachments, assignment_type, allow_late, lesson_plan_id, poll_options, topic_id, is_published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newId, env.user.id, scId, original.post_type, original.title, original.content,
       original.due_date, original.max_score, original.test_id, original.attachments,
       original.assignment_type, original.allow_late, original.lesson_plan_id, original.poll_options,
       original.topic_id, 1, now(), now()]
    );
    return success({ id: newId, cloned: true });
  }

  // Delete post
  if (path.startsWith('/api/student-classroom/posts/') && method === 'DELETE') {
    const postId = extractParam(path, '/api/student-classroom/posts/');
    if (!postId) return error('Missing post id');
    await dbRun(env.DB, 'DELETE FROM classroom_posts WHERE id=? AND teacher_id=?', [postId, env.user.id]);
    return success({ deleted: true });
  }

  // List submissions for a post
  if (path.startsWith('/api/student-classroom/submissions/') && method === 'GET') {
    const postId = extractParam(path, '/api/student-classroom/submissions/');
    if (!postId) return error('Missing post id');
    // Verify post belongs to this teacher
    const post = await dbFirst(env.DB, 'SELECT id FROM classroom_posts WHERE id = ? AND teacher_id = ?', [postId, env.user.id]);
    if (!post) return error('ไม่พบโพสต์', 404);

    const subs = await dbAll(env.DB,
      `SELECT asub.*, st.student_code, st.first_name, st.last_name
       FROM assignment_submissions asub
       JOIN students st ON st.id = asub.student_id
       WHERE asub.post_id = ?
       ORDER BY st.student_code`,
      [postId]
    );
    return success(subs);
  }

  // Grade a submission
  if (path === '/api/student-classroom/grade' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.submission_id) return error('Missing submission_id');
    // Verify submission belongs to a post owned by this teacher
    const sub = await dbFirst(env.DB,
      `SELECT asub.id FROM assignment_submissions asub
       JOIN classroom_posts cp ON cp.id = asub.post_id
       WHERE asub.id = ? AND cp.teacher_id = ?`,
      [body.submission_id, env.user.id]);
    if (!sub) return error('ไม่พบผลงาน', 404);

    await dbRun(env.DB,
      `UPDATE assignment_submissions SET score=?, feedback=?, status='graded', graded_at=? WHERE id=?`,
      [body.score ?? null, body.feedback || null, now(), body.submission_id]
    );
    return success({ graded: true });
  }

  // ======================== BOARD MODE ========================
  // GET board posts for a classroom post
  if (path.startsWith('/api/student-classroom/board/') && method === 'GET') {
    const postId = extractParam(path, '/api/student-classroom/board/');
    if (!postId) return error('Missing post id');
    const posts = await dbAll(env.DB,
      `SELECT bp.*, st.first_name, st.last_name, st.student_code
       FROM board_posts bp
       JOIN students st ON st.id = bp.student_id
       WHERE bp.post_id = ?
       ORDER BY bp.likes DESC, bp.created_at DESC`,
      [postId]
    );
    return success(posts);
  }

  // ======================== POLL ========================
  // GET poll results for a post
  if (path.startsWith('/api/student-classroom/poll/') && method === 'GET') {
    const postId = extractParam(path, '/api/student-classroom/poll/');
    if (!postId) return error('Missing post id');
    const results = await dbAll(env.DB,
      `SELECT option_index, option_text, COUNT(*) as votes
       FROM poll_responses WHERE post_id = ?
       GROUP BY option_index ORDER BY option_index`,
      [postId]
    );
    const total = results.reduce((s, r) => s + r.votes, 0);
    return success({ results, total });
  }

  return error('Not found', 404);
}
