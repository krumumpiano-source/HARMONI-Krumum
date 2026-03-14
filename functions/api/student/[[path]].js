// HARMONI — Student API
import { success, error, parseBody, dbAll, dbFirst, dbRun, generateUUID, now, extractParam, extractAction, paginate } from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const user = env.user;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/student', '');
  const method = request.method;

  // Resolve student record from user_id
  const student = await dbFirst(db, 'SELECT * FROM students WHERE user_id = ?', [user.id]);
  if (!student && !path.startsWith('/profile')) {
    return error('ไม่พบข้อมูลนักเรียน กรุณาติดต่อครูผู้สอน', 404);
  }
  const studentId = student?.id;

  // ======================== FEED ========================
  if (path === '/feed' || path === '/feed/') {
    if (method !== 'GET') return error('Method not allowed', 405);

    const type = url.searchParams.get('type');
    const { limit, offset } = paginate(url);

    let sql = `
      SELECT cp.*, s.name AS subject_name, c.name AS classroom_name
      FROM classroom_posts cp
      JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
      JOIN subjects s ON s.id = sc.subject_id
      JOIN classrooms c ON c.id = sc.classroom_id
      JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
      WHERE cp.is_published = 1
    `;
    const params = [studentId];

    if (type) {
      sql += ' AND cp.post_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY cp.is_pinned DESC, cp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = await dbAll(db, sql, params);

    // For assignments, attach submission status
    if (type === 'assignment') {
      for (const post of posts) {
        const sub = await dbFirst(db,
          'SELECT id, status, score, submitted_at FROM assignment_submissions WHERE post_id = ? AND student_id = ?',
          [post.id, studentId]
        );
        post.submission = sub || null;
      }
    }

    return success(posts);
  }

  // ======================== SINGLE POST DETAIL ========================
  if (path.startsWith('/feed/') && method === 'GET') {
    const postId = extractParam(path, '/feed/');
    if (!postId) return error('Missing post ID');

    const post = await dbFirst(db, `
      SELECT cp.*, s.name AS subject_name, c.name AS classroom_name
      FROM classroom_posts cp
      JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
      JOIN subjects s ON s.id = sc.subject_id
      JOIN classrooms c ON c.id = sc.classroom_id
      JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
      WHERE cp.id = ? AND cp.is_published = 1
    `, [studentId, postId]);

    if (!post) return error('ไม่พบโพสต์', 404);
    return success(post);
  }

  // ======================== SUBMIT ASSIGNMENT ========================
  if (path.startsWith('/submit/') && method === 'POST') {
    const postId = extractParam(path, '/submit/');
    if (!postId) return error('Missing post ID');

    // Verify post belongs to student's classroom
    const post = await dbFirst(db, `
      SELECT cp.* FROM classroom_posts cp
      JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
      JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
      WHERE cp.id = ? AND cp.post_type = 'assignment' AND cp.is_published = 1
    `, [studentId, postId]);
    if (!post) return error('ไม่พบงาน', 404);

    const body = await parseBody(request);
    if (!body) return error('Invalid body');

    // Check if already submitted
    const existing = await dbFirst(db,
      'SELECT id, attempt_count FROM assignment_submissions WHERE post_id = ? AND student_id = ?',
      [postId, studentId]
    );

    // Check late
    let isLate = 0;
    let lateDays = 0;
    if (post.due_date) {
      const dueMs = new Date(post.due_date).getTime();
      const nowMs = Date.now();
      if (nowMs > dueMs) {
        if (!post.allow_late) return error('เลยกำหนดส่งแล้ว');
        isLate = 1;
        lateDays = Math.ceil((nowMs - dueMs) / 86400000);
      }
    }

    if (existing) {
      // Resubmit
      await dbRun(db, `
        UPDATE assignment_submissions
        SET submission_text = ?, submission_url = ?, file_urls = ?, status = 'resubmitted',
            resubmitted_at = ?, attempt_count = ?, is_late = ?, late_days = ?
        WHERE id = ?
      `, [body.text || null, body.url || null, body.files ? JSON.stringify(body.files) : null,
          now(), existing.attempt_count + 1, isLate, lateDays, existing.id]);
      return success({ id: existing.id, resubmitted: true });
    } else {
      const id = generateUUID();
      await dbRun(db, `
        INSERT INTO assignment_submissions (id, assignment_id, post_id, student_id, submission_text, submission_url, file_urls, status, submitted_at, is_late, late_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)
      `, [id, postId, postId, studentId, body.text || null, body.url || null,
          body.files ? JSON.stringify(body.files) : null, now(), isLate, lateDays]);
      return success({ id, submitted: true });
    }
  }

  // ======================== GRADES ========================
  if (path === '/grades' || path === '/grades/') {
    if (method !== 'GET') return error('Method not allowed', 405);

    // Get grade results per subject
    const grades = await dbAll(db, `
      SELECT gr.*, s.name AS subject_name, s.code AS subject_code
      FROM grade_results gr
      JOIN subject_classrooms sc ON sc.id = gr.subject_classroom_id
      JOIN subjects s ON s.id = sc.subject_id
      WHERE gr.student_id = ?
      ORDER BY s.code
    `, [studentId]);

    // Also get individual scores
    const scores = await dbAll(db, `
      SELECT sc2.*, s.name AS subject_name
      FROM scores sc2
      JOIN subject_classrooms scc ON scc.id = sc2.subject_classroom_id
      JOIN subjects s ON s.id = scc.subject_id
      WHERE sc2.student_id = ?
      ORDER BY sc2.created_at DESC
    `, [studentId]);

    return success({ grades, scores });
  }

  // ======================== QUIZZES (Published Tests) ========================
  if (path === '/quizzes' || path === '/quizzes/') {
    if (method !== 'GET') return error('Method not allowed', 405);

    // Get published tests linked to classroom_posts for student's classrooms
    const quizzes = await dbAll(db, `
      SELECT cp.id AS post_id, cp.title, cp.due_date, cp.created_at,
             t.id AS test_id, t.time_limit_minutes, t.max_attempts, t.total_score,
             s.name AS subject_name,
             qa.id AS attempt_id, qa.total_score AS my_score, qa.submitted_at AS attempt_date
      FROM classroom_posts cp
      JOIN tests t ON t.id = cp.test_id
      JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
      JOIN subjects s ON s.id = sc.subject_id
      JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
      LEFT JOIN quiz_attempts qa ON qa.test_id = t.id AND qa.student_id = ? AND qa.post_id = cp.id
      WHERE cp.post_type = 'quiz' AND cp.is_published = 1
      ORDER BY cp.created_at DESC
    `, [studentId, studentId]);

    return success(quizzes);
  }

  // ======================== START / SUBMIT QUIZ ========================
  if (path.startsWith('/quiz/')) {
    const testId = extractParam(path, '/quiz/');
    const action = extractAction(path, '/quiz/');

    // GET /quiz/:testId — Get quiz questions
    if (method === 'GET' && !action) {
      // Verify test is accessible
      const test = await dbFirst(db, `
        SELECT t.*, cp.id AS post_id FROM tests t
        JOIN classroom_posts cp ON cp.test_id = t.id AND cp.post_type = 'quiz' AND cp.is_published = 1
        JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
        JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
        WHERE t.id = ?
      `, [studentId, testId]);
      if (!test) return error('ไม่พบแบบทดสอบ', 404);

      // Check max attempts
      if (test.max_attempts) {
        const attemptCount = await dbFirst(db,
          'SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE test_id = ? AND student_id = ?',
          [testId, studentId]);
        if (attemptCount.cnt >= test.max_attempts) return error('ทำครบจำนวนครั้งแล้ว');
      }

      // Get questions (hide correct answers)
      const questions = await dbAll(db,
        'SELECT id, question_text, question_type, options, points, sort_order FROM test_questions WHERE test_id = ? ORDER BY sort_order',
        [testId]);

      return success({ test: { id: test.id, title: test.title, time_limit_minutes: test.time_limit_minutes, total_score: test.total_score, post_id: test.post_id }, questions });
    }

    // POST /quiz/:testId/submit — Submit quiz answers
    if (method === 'POST' && action === 'submit') {
      const body = await parseBody(request);
      if (!body || !body.answers) return error('Missing answers');

      const test = await dbFirst(db, `
        SELECT t.*, cp.id AS post_id FROM tests t
        JOIN classroom_posts cp ON cp.test_id = t.id AND cp.post_type = 'quiz' AND cp.is_published = 1
        JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
        JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
        WHERE t.id = ?
      `, [studentId, testId]);
      if (!test) return error('ไม่พบแบบทดสอบ', 404);

      // Auto-grade multiple choice
      const questions = await dbAll(db, 'SELECT * FROM test_questions WHERE test_id = ?', [testId]);
      let totalScore = 0;
      let autoGraded = 1;

      for (const q of questions) {
        const answer = body.answers[q.id];
        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
          if (answer === q.correct_answer) {
            totalScore += q.points || 0;
          }
        } else {
          autoGraded = 0; // needs manual grading for essay/short_answer
        }
      }

      const attemptCount = await dbFirst(db,
        'SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE test_id = ? AND student_id = ?',
        [testId, studentId]);

      const id = generateUUID();
      await dbRun(db, `
        INSERT INTO quiz_attempts (id, test_id, post_id, student_id, attempt_number, answers, total_score, max_score, started_at, submitted_at, time_spent_seconds, auto_graded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, testId, test.post_id, studentId, (attemptCount.cnt || 0) + 1,
          JSON.stringify(body.answers), totalScore, test.total_score,
          body.started_at || now(), now(), body.time_spent || 0, autoGraded]);

      return success({ id, total_score: totalScore, max_score: test.total_score, auto_graded: autoGraded });
    }
  }

  // ======================== NOTIFICATIONS ========================
  if (path === '/notifications' || path === '/notifications/') {
    if (method === 'GET') {
      const notifications = await dbAll(db, `
        SELECT * FROM student_notifications
        WHERE student_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `, [studentId]);
      return success(notifications);
    }
    return error('Method not allowed', 405);
  }

  // Mark notification as read
  if (path.startsWith('/notifications/') && method === 'PUT') {
    const notifId = extractParam(path, '/notifications/');
    await dbRun(db, 'UPDATE student_notifications SET is_read = 1 WHERE id = ? AND student_id = ?', [notifId, studentId]);
    return success({ updated: true });
  }

  // ======================== PROFILE ========================
  if (path === '/profile' || path === '/profile/') {
    if (method === 'GET') {
      const profile = student ? { ...student } : {};
      const userInfo = await dbFirst(db, 'SELECT display_name, username FROM users WHERE id = ?', [user.id]);
      if (userInfo) {
        profile.display_name = userInfo.display_name;
        profile.username = userInfo.username;
      }
      // Get classrooms
      const classrooms = student ? await dbAll(db, `
        SELECT c.name AS classroom_name, sem.academic_year, sem.semester
        FROM student_classrooms sc
        JOIN classrooms c ON c.id = sc.classroom_id
        JOIN semesters sem ON sem.id = sc.semester_id
        WHERE sc.student_id = ? AND sc.is_active = 1
      `, [studentId]) : [];
      profile.classrooms = classrooms;
      return success(profile);
    }
    return error('Method not allowed', 405);
  }

  // ======================== MY CLASSROOMS ========================
  if (path === '/classrooms' || path === '/classrooms/') {
    if (method !== 'GET') return error('Method not allowed', 405);
    const classrooms = await dbAll(db, `
      SELECT c.*, sem.academic_year, sem.semester, sc.student_number
      FROM student_classrooms sc
      JOIN classrooms c ON c.id = sc.classroom_id
      JOIN semesters sem ON sem.id = sc.semester_id
      WHERE sc.student_id = ? AND sc.is_active = 1
      ORDER BY c.name
    `, [studentId]);
    return success(classrooms);
  }

  return error('Not found', 404);
}
