// HARMONI — Student API
import { success, error, parseBody, dbAll, dbFirst, dbRun, generateUUID, now, extractParam, extractAction, paginate } from '../../_helpers.js';

// Helper: upload file to teacher's Google Drive with folder chain
async function uploadToDrive(env, teacherId, fileName, base64Content, mimeType, folderPath) {
  const row = await dbFirst(env.DB,
    "SELECT value FROM app_settings WHERE teacher_id = ? AND key = 'drive_tokens'",
    [teacherId]
  );
  if (!row) return null;
  const tokens = JSON.parse(row.value);
  const clientId = env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !tokens.refresh_token) return null;

  // Refresh access token
  const refreshResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  });
  const refreshed = await refreshResp.json();
  if (!refreshed.access_token) return null;
  const accessToken = refreshed.access_token;

  // Get root folder
  const rootRow = await dbFirst(env.DB,
    "SELECT value FROM app_settings WHERE teacher_id = ? AND key = 'drive_root_folder'",
    [teacherId]
  );
  const rootId = rootRow?.value || '1NE_KC6zWdyaURFMmLVRw1aXXD-dWede0';

  // Build folder chain: root → HARMONI-Submissions → [folderPath...]
  const chain = ['HARMONI-Submissions', ...(folderPath || [])];
  let parentId = rootId;
  for (const name of chain) {
    // Find or create each folder in chain
    const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchResp.json();
    if (searchData.files && searchData.files.length > 0) {
      parentId = searchData.files[0].id;
    } else {
      const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
      });
      const folder = await createResp.json();
      parentId = folder.id;
    }
  }

  // Upload file
  const metadata = { name: fileName, mimeType: mimeType || 'image/jpeg', parents: [parentId] };
  const boundary = '-------harmoni_stu_upload';
  const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Content}\r\n--${boundary}--`;

  const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  const result = await uploadResp.json();
  if (result.error) return null;

  // Make file publicly viewable (anyone with link)
  await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });

  return {
    id: result.id,
    name: result.name,
    url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    thumbnail: `https://drive.google.com/thumbnail?id=${result.id}&sz=w400`
  };
}

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

    // For assignments, attach submission status (batch query to avoid N+1)
    if (type === 'assignment' && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      const placeholders = postIds.map(() => '?').join(',');
      const subs = await dbAll(db,
        `SELECT id, post_id, status, score, submitted_at FROM assignment_submissions WHERE post_id IN (${placeholders}) AND student_id = ?`,
        [...postIds, studentId]
      );
      const subMap = {};
      for (const s of subs) subMap[s.post_id] = s;
      for (const post of posts) post.submission = subMap[post.id] || null;
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

    // Handle file uploads via Google Drive
    let fileUrls = null;
    if (body.files && Array.isArray(body.files) && body.files.length > 0) {
      const teacherId = post.teacher_id;
      // Build folder path: ภาคเรียน → วิชา → ห้อง → ชื่องาน
      const scInfo = await dbFirst(db, `
        SELECT s.name AS subject_name, s.code AS subject_code, c.name AS classroom_name,
               sem.year, sem.term
        FROM subject_classrooms sc
        JOIN subjects s ON s.id = sc.subject_id
        JOIN classrooms c ON c.id = sc.classroom_id
        JOIN semesters sem ON sem.id = sc.semester_id
        WHERE sc.id = ?
      `, [post.subject_classroom_id]);
      const folderPath = scInfo ? [
        `${scInfo.year}-${scInfo.term}`,
        scInfo.subject_code || scInfo.subject_name,
        scInfo.classroom_name,
        post.title || 'งาน'
      ] : [];
      const studentPrefix = student.student_code ? `${student.student_code}_` : '';
      const uploadResults = [];
      for (const file of body.files.slice(0, 5)) { // max 5 files
        if (!file.content || !file.name) continue;
        // Validate base64 content size (max ~5MB decoded)
        if (file.content.length > 7_000_000) continue;
        const prefixedName = `${studentPrefix}${file.name}`;
        const result = await uploadToDrive(env, teacherId, prefixedName, file.content, file.mimeType || 'image/jpeg', folderPath);
        if (result) uploadResults.push(result);
      }
      if (uploadResults.length > 0) fileUrls = JSON.stringify(uploadResults);
    }

    // Check if already submitted
    const existing = await dbFirst(db,
      'SELECT id, attempt_count, file_urls FROM assignment_submissions WHERE post_id = ? AND student_id = ?',
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
      // Resubmit (use 'submitted' status to match CHECK constraint)
      await dbRun(db, `
        UPDATE assignment_submissions
        SET submission_text = ?, submission_url = ?, file_urls = ?, status = 'submitted',
            resubmitted_at = ?, attempt_count = ?, is_late = ?, late_days = ?
        WHERE id = ?
      `, [body.text || null, body.url || null, fileUrls || (body.files ? null : existing.file_urls),
          now(), existing.attempt_count + 1, isLate, lateDays, existing.id]);
      return success({ id: existing.id, resubmitted: true });
    } else {
      const id = generateUUID();
      await dbRun(db, `
        INSERT INTO assignment_submissions (id, assignment_id, post_id, student_id, submission_text, submission_url, file_urls, status, submitted_at, is_late, late_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)
      `, [id, postId, postId, studentId, body.text || null, body.url || null,
          fileUrls, now(), isLate, lateDays]);
      return success({ id, submitted: true });
    }
  }

  // ======================== LIVE QUIZ (Student) ========================
  // POST /live/join — join session by code
  if (path === '/live/join' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.code) return error('กรุณากรอกรหัสเข้าร่วม');
    const session = await dbFirst(db, "SELECT * FROM live_sessions WHERE session_code = ? AND status != 'finished'", [body.code]);
    if (!session) return error('ไม่พบ session หรือปิดแล้ว', 404);
    // Join or re-join
    const existing = await dbFirst(db, 'SELECT id FROM live_participants WHERE session_id = ? AND student_id = ?', [session.id, studentId]);
    if (!existing) {
      await dbRun(db,
        'INSERT INTO live_participants (id, session_id, student_id, nickname, joined_at) VALUES (?,?,?,?,?)',
        [generateUUID(), session.id, studentId, body.nickname || null, now()]
      );
    }
    return success({ session_id: session.id, status: session.status, current_question: session.current_question });
  }

  // GET /live/:sessionId — poll current state
  if (path.startsWith('/live/') && method === 'GET') {
    const sessionId = extractParam(path, '/live/');
    const action = extractAction(path, '/live/');
    if (!action) {
      const session = await dbFirst(db, 'SELECT id, status, current_question, scoring_mode, test_id FROM live_sessions WHERE id = ?', [sessionId]);
      if (!session) return error('ไม่พบ session', 404);
      let question = null;
      if (session.status === 'question' && session.current_question > 0) {
        const questions = await dbAll(db,
          'SELECT id, question_type, question_text, choices, score, sort_order FROM test_questions WHERE test_id = ? ORDER BY sort_order',
          [session.test_id]
        );
        const q = questions[session.current_question - 1];
        if (q && q.choices) {
          try { q.choices = JSON.stringify(JSON.parse(q.choices).map(o => typeof o === 'object' ? (o.text || String(o)) : o)); } catch(e) {}
        }
        question = q || null;
      }
      // Get participant rank
      const me = await dbFirst(db, 'SELECT total_score, total_xp FROM live_participants WHERE session_id = ? AND student_id = ?', [sessionId, studentId]);
      const leaderboard = await dbAll(db,
        `SELECT lp.student_id, lp.total_score, st.first_name FROM live_participants lp
         JOIN students st ON st.id = lp.student_id WHERE lp.session_id = ? ORDER BY lp.total_score DESC LIMIT 5`,
        [sessionId]
      );
      return success({ status: session.status, current_question: session.current_question, question, me, leaderboard });
    }
  }

  // POST /live/:sessionId/answer — submit answer for current question
  if (path.match(/\/live\/[^/]+\/answer/) && method === 'POST') {
    const parts = path.split('/');
    const sessionId = parts[2]; // /live/{id}/answer
    const body = await parseBody(request);
    if (!body || body.answer === undefined) return error('กรุณาตอบคำถาม');

    const session = await dbFirst(db, 'SELECT * FROM live_sessions WHERE id = ?', [sessionId]);
    if (!session || session.status !== 'question') return error('ไม่อยู่ในช่วงตอบคำถาม');

    // Get current question
    const questions = await dbAll(db, 'SELECT * FROM test_questions WHERE test_id = ? ORDER BY sort_order', [session.test_id]);
    const q = questions[session.current_question - 1];
    if (!q) return error('ไม่พบคำถาม');

    // Check if already answered
    const alreadyAnswered = await dbFirst(db,
      'SELECT id FROM live_responses WHERE session_id = ? AND student_id = ? AND question_id = ?',
      [sessionId, studentId, q.id]
    );
    if (alreadyAnswered) return error('ตอบแล้ว');

    // Auto-grade
    let isCorrect = 0;
    const answer = String(body.answer).trim().toLowerCase();
    if (q.correct_answer) {
      const correct = String(q.correct_answer).trim().toLowerCase();
      isCorrect = answer === correct ? 1 : 0;
    }

    // XP calculation
    const timeMs = body.time_ms || 10000;
    let xpEarned = 0;
    if (isCorrect) {
      xpEarned = 10;
      if (session.scoring_mode === 'speed_accuracy') {
        const speedBonus = Math.max(0, Math.floor((30000 - timeMs) / 1000));
        xpEarned += speedBonus;
      }
    }

    // Count streak
    const prevResponses = await dbAll(db,
      'SELECT is_correct FROM live_responses WHERE session_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 5',
      [sessionId, studentId]
    );
    let streakCount = 0;
    if (isCorrect) {
      streakCount = 1;
      for (const r of prevResponses) {
        if (r.is_correct) streakCount++;
        else break;
      }
      if (streakCount >= 3) xpEarned += streakCount * 2; // streak bonus
    }

    await dbRun(db,
      'INSERT INTO live_responses (id, session_id, student_id, question_id, answer, is_correct, time_ms, xp_earned, streak_count, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [generateUUID(), sessionId, studentId, q.id, body.answer, isCorrect, timeMs, xpEarned, streakCount, now()]
    );

    // Update participant score
    const score = isCorrect ? (q.score || 1) : 0;
    await dbRun(db,
      'UPDATE live_participants SET total_score = total_score + ?, total_xp = total_xp + ? WHERE session_id = ? AND student_id = ?',
      [score, xpEarned, sessionId, studentId]
    );

    // Award XP
    if (xpEarned > 0) {
      await dbRun(db,
        'INSERT INTO student_xp (id, student_id, xp_amount, source, source_id, created_at) VALUES (?,?,?,?,?,?)',
        [generateUUID(), studentId, xpEarned, 'live_quiz', sessionId, now()]
      );
    }

    return success({ is_correct: isCorrect, xp_earned: xpEarned, streak: streakCount, score });
  }

  // ======================== GRADES ========================
  if (path === '/grades' || path === '/grades/') {
    if (method !== 'GET') return error('Method not allowed', 405);

    // Get grade results per subject (grade_results has subject_id + classroom_id, not subject_classroom_id)
    const grades = await dbAll(db, `
      SELECT gr.*, s.name AS subject_name, s.code AS subject_code
      FROM grade_results gr
      JOIN subjects s ON s.id = gr.subject_id
      WHERE gr.student_id = ?
      ORDER BY s.code
    `, [studentId]);

    // Also get individual scores (scores has subject_id + classroom_id)
    const scores = await dbAll(db, `
      SELECT sc2.*, s.name AS subject_name
      FROM scores sc2
      JOIN subjects s ON s.id = sc2.subject_id
      WHERE sc2.student_id = ?
      ORDER BY sc2.created_at DESC
    `, [studentId]);

    return success({ grades, scores });
  }

  // ======================== QUIZZES (Published Tests) ========================
  if (path === '/quizzes' || path === '/quizzes/') {
    if (method !== 'GET') return error('Method not allowed', 405);

    // Get published tests with latest attempt only (no duplicate rows)
    const quizzes = await dbAll(db, `
      SELECT cp.id AS post_id, cp.title, cp.due_date, cp.created_at,
             t.id AS test_id, t.time_limit_minutes, t.max_attempts, t.total_score,
             s.name AS subject_name
      FROM classroom_posts cp
      JOIN tests t ON t.id = cp.test_id
      JOIN subject_classrooms sc ON sc.id = cp.subject_classroom_id
      JOIN subjects s ON s.id = sc.subject_id
      JOIN student_classrooms stc ON stc.classroom_id = sc.classroom_id AND stc.student_id = ? AND stc.is_active = 1
      WHERE cp.post_type = 'quiz' AND cp.is_published = 1
      ORDER BY cp.created_at DESC
    `, [studentId]);

    // Attach latest attempt + attempt count per quiz
    for (const q of quizzes) {
      const latest = await dbFirst(db,
        'SELECT id AS attempt_id, total_score AS my_score, submitted_at AS attempt_date FROM quiz_attempts WHERE test_id = ? AND student_id = ? ORDER BY submitted_at DESC LIMIT 1',
        [q.test_id, studentId]);
      const countRow = await dbFirst(db,
        'SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE test_id = ? AND student_id = ?',
        [q.test_id, studentId]);
      q.attempt_id = latest?.attempt_id || null;
      q.my_score = latest?.my_score ?? null;
      q.attempt_count = countRow?.cnt || 0;
      q.can_attempt = !q.max_attempts || q.attempt_count < q.max_attempts;
    }

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
        'SELECT id, question_text, question_type, choices, score, matching_pairs, correct_order, media_url, sort_order FROM test_questions WHERE test_id = ? ORDER BY sort_order',
        [testId]);

      // Strip correct answer info to prevent answer leaking
      for (const q of questions) {
        if (q.choices) {
          try {
            const opts = JSON.parse(q.choices);
            q.choices = JSON.stringify(opts.map(o => typeof o === 'object' ? (o.text || o.label || String(o)) : o));
          } catch (e) { /* keep as-is */ }
        }
        // For matching, only send left+right labels (shuffled right side)
        if (q.matching_pairs) {
          try {
            const pairs = JSON.parse(q.matching_pairs);
            const lefts = pairs.map(p => p.left);
            const rights = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
            q.matching_pairs = JSON.stringify({ lefts, rights });
          } catch (e) { /* keep as-is */ }
        }
        // For ordering, shuffle the items
        if (q.correct_order) {
          try {
            const items = JSON.parse(q.correct_order);
            q.shuffled_items = JSON.stringify(items.sort(() => Math.random() - 0.5));
            delete q.correct_order;
          } catch (e) { delete q.correct_order; }
        }
        // For fill_blank, keep question_text with ___ placeholders
      }

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

      // Server-side max_attempts check (prevent bypass)
      const attemptCount = await dbFirst(db,
        'SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE test_id = ? AND student_id = ?',
        [testId, studentId]);
      if (test.max_attempts && attemptCount.cnt >= test.max_attempts) {
        return error('ทำครบจำนวนครั้งแล้ว');
      }

      // Server-side time limit validation
      if (test.time_limit_minutes && body.started_at) {
        const elapsedMin = (Date.now() - new Date(body.started_at).getTime()) / 60000;
        if (elapsedMin > test.time_limit_minutes + 1) {
          return error('หมดเวลาทำแบบทดสอบ');
        }
      }

      // Auto-grade all auto-gradable question types
      const questions = await dbAll(db, 'SELECT * FROM test_questions WHERE test_id = ?', [testId]);
      let totalScore = 0;
      let autoGraded = 1;

      for (const q of questions) {
        const answer = body.answers[q.id];
        const pts = q.score || 0;

        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
          if (answer && q.correct_answer && String(answer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
            totalScore += pts;
          }
        } else if (q.question_type === 'short_answer') {
          if (answer && q.correct_answer && String(answer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
            totalScore += pts;
          }
        } else if (q.question_type === 'fill_blank') {
          // correct_answer can be a single string or JSON array for multi-blank
          if (answer && q.correct_answer) {
            try {
              const correctArr = JSON.parse(q.correct_answer);
              const ansArr = Array.isArray(answer) ? answer : [answer];
              let correct = 0;
              for (let i = 0; i < correctArr.length; i++) {
                if (ansArr[i] && String(ansArr[i]).trim().toLowerCase() === String(correctArr[i]).trim().toLowerCase()) correct++;
              }
              totalScore += pts * (correct / correctArr.length);
            } catch (e) {
              if (String(answer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
                totalScore += pts;
              }
            }
          }
        } else if (q.question_type === 'multiple_select') {
          // Partial credit: each correct = +1, each wrong = -1, min 0
          if (answer && q.correct_answer) {
            try {
              const correctSet = new Set(JSON.parse(q.correct_answer));
              const ansSet = new Set(Array.isArray(answer) ? answer : JSON.parse(answer));
              let score = 0;
              for (const a of ansSet) { score += correctSet.has(a) ? 1 : -1; }
              score = Math.max(0, score);
              totalScore += pts * (score / correctSet.size);
            } catch (e) { /* skip */ }
          }
        } else if (q.question_type === 'matching') {
          // answer = {left: right} mapping, matching_pairs = [{left, right}]
          if (answer && q.matching_pairs) {
            try {
              const pairs = JSON.parse(q.matching_pairs);
              const ansMap = typeof answer === 'string' ? JSON.parse(answer) : answer;
              let correct = 0;
              for (const p of pairs) {
                if (ansMap[p.left] === p.right) correct++;
              }
              totalScore += pts * (correct / pairs.length);
            } catch (e) { /* skip */ }
          }
        } else if (q.question_type === 'ordering') {
          // answer = ordered array, correct_order = JSON array
          if (answer && q.correct_order) {
            try {
              const correctOrder = JSON.parse(q.correct_order);
              const ansOrder = Array.isArray(answer) ? answer : JSON.parse(answer);
              let correct = 0;
              for (let i = 0; i < correctOrder.length; i++) {
                if (ansOrder[i] === correctOrder[i]) correct++;
              }
              totalScore += pts * (correct / correctOrder.length);
            } catch (e) { /* skip */ }
          }
        } else {
          // essay, audio_record — needs manual grading
          autoGraded = 0;
        }
      }

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
    if (!notifId) return error('Missing notification ID');
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

  // ======================== BOARD MODE (Student posting) ========================
  if (path.startsWith('/board/')) {
    const postId = extractParam(path, '/board/');
    const action = extractAction(path, '/board/');

    // POST /board/:postId — create board post
    if (method === 'POST' && !action) {
      const body = await parseBody(request);
      if (!body?.content) return error('กรุณากรอกเนื้อหา');
      const id = generateUUID();
      await dbRun(db,
        `INSERT INTO board_posts (id, post_id, student_id, content, media_url, media_type, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [id, postId, studentId, body.content, body.media_url || null, body.media_type || null, now()]
      );
      return success({ id });
    }

    // POST /board/:postId/like/:boardPostId — toggle like
    if (method === 'POST' && action === 'like') {
      const boardPostId = path.split('/').pop();
      const existing = await dbFirst(db,
        'SELECT id FROM board_likes WHERE board_post_id = ? AND student_id = ?',
        [boardPostId, studentId]
      );
      if (existing) {
        await dbRun(db, 'DELETE FROM board_likes WHERE id = ?', [existing.id]);
        await dbRun(db, 'UPDATE board_posts SET likes = likes - 1 WHERE id = ?', [boardPostId]);
        return success({ liked: false });
      } else {
        await dbRun(db,
          'INSERT INTO board_likes (id, board_post_id, student_id, created_at) VALUES (?,?,?,?)',
          [generateUUID(), boardPostId, studentId, now()]
        );
        await dbRun(db, 'UPDATE board_posts SET likes = likes + 1 WHERE id = ?', [boardPostId]);
        return success({ liked: true });
      }
    }

    // GET /board/:postId — list board posts
    if (method === 'GET') {
      const posts = await dbAll(db,
        `SELECT bp.*, st.first_name, st.last_name, st.student_code,
         (SELECT COUNT(*) FROM board_likes bl WHERE bl.board_post_id = bp.id AND bl.student_id = ?) as my_like
         FROM board_posts bp
         JOIN students st ON st.id = bp.student_id
         WHERE bp.post_id = ?
         ORDER BY bp.likes DESC, bp.created_at DESC`,
        [studentId, postId]
      );
      return success(posts);
    }
  }

  // ======================== POLL VOTE ========================
  if (path.startsWith('/poll/') && method === 'POST') {
    const postId = extractParam(path, '/poll/');
    const body = await parseBody(request);
    if (body?.option_index === undefined) return error('กรุณาเลือกตัวเลือก');
    // Upsert poll response
    const existing = await dbFirst(db, 'SELECT id FROM poll_responses WHERE post_id = ? AND student_id = ?', [postId, studentId]);
    if (existing) {
      await dbRun(db, 'UPDATE poll_responses SET option_index = ?, option_text = ? WHERE id = ?',
        [body.option_index, body.option_text || null, existing.id]);
    } else {
      await dbRun(db,
        'INSERT INTO poll_responses (id, post_id, student_id, option_index, option_text, created_at) VALUES (?,?,?,?,?,?)',
        [generateUUID(), postId, studentId, body.option_index, body.option_text || null, now()]
      );
    }
    return success({ voted: true });
  }

  // ======================== XP & GAMIFICATION ========================
  if (path === '/xp' || path === '/xp/') {
    if (method !== 'GET') return error('Method not allowed', 405);
    const totalXp = await dbFirst(db, 'SELECT COALESCE(SUM(xp_amount), 0) as total FROM student_xp WHERE student_id = ?', [studentId]);
    const streak = await dbFirst(db, 'SELECT * FROM student_streaks WHERE student_id = ?', [studentId]);
    const badges = await dbAll(db, 'SELECT badge_key, unlocked_at FROM student_badges WHERE student_id = ?', [studentId]);
    const league = await dbFirst(db,
      `SELECT * FROM weekly_leagues WHERE student_id = ? ORDER BY week_start DESC LIMIT 1`,
      [studentId]
    );
    const level = Math.floor((totalXp?.total || 0) / 100) + 1;
    return success({
      total_xp: totalXp?.total || 0,
      level: Math.min(level, 10),
      streak: streak || { current_streak: 0, longest_streak: 0, freeze_count: 2 },
      badges,
      league: league || { league: 'bronze', weekly_xp: 0 }
    });
  }

  // ======================== PORTFOLIO (Student-managed) ========================
  if (path === '/portfolio' || path === '/portfolio/') {
    if (method === 'GET') {
      const items = await dbAll(db,
        `SELECT spi.*, s.name as subject_name FROM student_portfolio_items spi
         LEFT JOIN subjects s ON s.id = spi.subject_id
         WHERE spi.student_id = ? ORDER BY spi.created_at DESC`,
        [studentId]
      );
      return success(items);
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body?.title) return error('กรุณากรอกชื่อผลงาน');
      const id = generateUUID();
      await dbRun(db,
        `INSERT INTO student_portfolio_items (id, student_id, title, description, category, subject_id, file_urls, reflection, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, studentId, body.title, body.description || null, body.category || 'general',
         body.subject_id || null, body.file_urls ? JSON.stringify(body.file_urls) : null,
         body.reflection || null, now(), now()]
      );
      return success({ id });
    }
  }

  if (path.startsWith('/portfolio/') && method === 'DELETE') {
    const itemId = extractParam(path, '/portfolio/');
    await dbRun(db, 'DELETE FROM student_portfolio_items WHERE id = ? AND student_id = ?', [itemId, studentId]);
    return success({ deleted: true });
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

  // ======================== STUDENT SELF CHECK-IN (GPS) ========================

  // GET /api/student/sessions — get open attendance sessions for student's classrooms
  if ((path === '/sessions' || path === '/sessions/') && method === 'GET') {
    // Get all classrooms this student is in
    const myClassrooms = await dbAll(db,
      `SELECT classroom_id FROM student_classrooms WHERE student_id = ? AND is_active = 1`,
      [studentId]
    );
    if (!myClassrooms.length) return success([]);
    const ids = myClassrooms.map(r => `'${r.classroom_id.replace(/'/g,"''")}'`).join(',');
    const sessions = await dbAll(db,
      `SELECT s.*, c.name as classroom_name
       FROM attendance_sessions s
       JOIN classrooms c ON c.id = s.classroom_id
       WHERE s.classroom_id IN (${ids}) AND s.is_open = 1
       ORDER BY s.opened_at DESC`,
      []
    );
    return success(sessions);
  }

  // POST /api/student/checkin — GPS self check-in
  if ((path === '/checkin' || path === '/checkin/') && method === 'POST') {
    const body = await parseBody(request);
    const { session_id, lat, lng } = body || {};
    if (!session_id) return error('session_id จำเป็น');
    if (lat == null || lng == null) return error('lat และ lng จำเป็น');

    // Get the session
    const sess = await dbFirst(db,
      `SELECT * FROM attendance_sessions WHERE id = ? AND is_open = 1`,
      [session_id]
    );
    if (!sess) return error('ไม่พบเซสชันหรือปิดไปแล้ว', 404);

    // Verify student is in this classroom
    const inClass = await dbFirst(db,
      `SELECT 1 FROM student_classrooms WHERE student_id = ? AND classroom_id = ? AND is_active = 1`,
      [studentId, sess.classroom_id]
    );
    if (!inClass) return error('คุณไม่ได้อยู่ในห้องเรียนนี้', 403);

    // Check for existing check-in record
    const existing = await dbFirst(db,
      `SELECT id, check_in_method FROM attendance_records
       WHERE student_id = ? AND classroom_id = ? AND date = ?
       ${sess.period ? 'AND period = ?' : 'AND (period IS NULL OR period = ?)'}`,
      sess.period
        ? [studentId, sess.classroom_id, sess.date, sess.period]
        : [studentId, sess.classroom_id, sess.date, sess.period]
    );
    if (existing && existing.check_in_method === 'student_app') {
      return success({ already_checked: true, message: 'คุณเช็คชื่อแล้ว' });
    }

    // Get attendance zones for this classroom
    const zones = await dbAll(db,
      `SELECT * FROM attendance_zones WHERE classroom_id = ? AND is_active = 1`,
      [sess.classroom_id]
    );
    if (!zones.length) return error('ครูยังไม่ได้ตั้งค่าโซน GPS ของห้องนี้ กรุณาแจ้งครู');

    // Check GPS distance
    let matched = false;
    let nearestDist = Infinity;
    for (const z of zones) {
      const dist = haversineDistance(lat, lng, z.lat, z.lng);
      if (dist < nearestDist) nearestDist = dist;
      if (dist <= (z.radius_meters || 100)) { matched = true; break; }
    }

    if (!matched) {
      return error(`อยู่นอกโซนเช็คชื่อ (ห่าง ${Math.round(nearestDist)} เมตร) กรุณาเข้าห้องเรียนก่อนเช็คชื่อ`);
    }

    // Record the check-in
    const checkTime = now();
    if (existing) {
      await dbRun(db,
        `UPDATE attendance_records SET status='present', check_in_method='student_app', check_in_time=?, check_in_lat=?, check_in_lng=? WHERE id=?`,
        [checkTime, lat, lng, existing.id]
      );
    } else {
      await dbRun(db,
        `INSERT INTO attendance_records
         (id, teacher_id, student_id, classroom_id, semester_id, subject_id, date, period, status, check_in_method, check_in_time, check_in_lat, check_in_lng, created_at)
         VALUES (?,?,?,?,?,?,?,?,  'present','student_app',?,?,?,?)`,
        [generateUUID(), sess.teacher_id, studentId, sess.classroom_id,
         sess.semester_id, sess.subject_id, sess.date, sess.period || null,
         checkTime, lat, lng, checkTime]
      );
    }

    // Award XP for attendance
    await dbRun(db,
      `INSERT INTO student_xp (id, student_id, source_type, source_id, xp_amount, created_at) VALUES (?,?,'attendance',?,5,?)`,
      [generateUUID(), studentId, session_id, checkTime]
    );

    return success({ checked_in: true, distance_m: Math.round(nearestDist), message: 'เช็คชื่อสำเร็จ!' });
  }

  return error('Not found', 404);
}

// Haversine distance formula (meters)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}