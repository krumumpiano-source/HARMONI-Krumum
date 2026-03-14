// HARMONI — Post-Lesson (Teaching Logs) API
// GET    /api/post-lesson           — list (?classroom_id=&date=)
// POST   /api/post-lesson           — create
// GET    /api/post-lesson/:id       — detail
// PUT    /api/post-lesson/:id       — update
// DELETE /api/post-lesson/:id       — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // List & Create
  if (path === '/api/post-lesson') {
    if (method === 'GET') {
      const classroomId = url.searchParams.get('classroom_id');
      const subjectId = url.searchParams.get('subject_id');

      let sql = `SELECT tl.*, s.name as subject_name, s.code as subject_code,
                 c.name as classroom_name
                 FROM teaching_logs tl
                 LEFT JOIN subjects s ON tl.subject_id = s.id
                 LEFT JOIN classrooms c ON tl.classroom_id = c.id
                 WHERE tl.teacher_id = ?`;
      const params = [env.user.id];

      if (classroomId) { sql += ' AND tl.classroom_id = ?'; params.push(classroomId); }
      if (subjectId) { sql += ' AND tl.subject_id = ?'; params.push(subjectId); }

      sql += ' ORDER BY tl.date DESC, tl.period ASC LIMIT 50';
      return success(await dbAll(env.DB, sql, params));
    }

    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.date) {
        return error('กรุณาระบุวันที่');
      }
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO teaching_logs (id, teacher_id, classroom_id, subject_id, semester_id, date, period, topic, activities, observations, issues, next_plan, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, env.user.id, body.classroom_id || null, body.subject_id || null, body.semester_id || null,
         body.date, body.period || null, body.topic || null, body.activities || null,
         body.observations || null, body.issues || null, body.next_plan || null, now()]
      );
      return success({ id, message: 'บันทึกหลังสอนสำเร็จ' });
    }
  }

  // Detail / Update / Delete
  if (path.startsWith('/api/post-lesson/')) {
    const id = extractParam(path, '/api/post-lesson/');

    if (method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM teaching_logs WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      if (!row) return error('ไม่พบบันทึก', 404);
      return success(row);
    }

    if (method === 'PUT') {
      const body = await parseBody(request);
      if (!body) return error('ข้อมูลไม่ถูกต้อง');
      await dbRun(env.DB,
        `UPDATE teaching_logs SET classroom_id = COALESCE(?, classroom_id), subject_id = COALESCE(?, subject_id),
         date = COALESCE(?, date), period = COALESCE(?, period), topic = COALESCE(?, topic),
         activities = COALESCE(?, activities), observations = COALESCE(?, observations),
         issues = COALESCE(?, issues), next_plan = COALESCE(?, next_plan), updated_at = ?
         WHERE id = ? AND teacher_id = ?`,
        [body.classroom_id, body.subject_id, body.date, body.period, body.topic,
         body.activities, body.observations, body.issues, body.next_plan, now(), id, env.user.id]
      );
      return success({ message: 'อัปเดตบันทึกหลังสอนแล้ว' });
    }

    if (method === 'DELETE') {
      await dbRun(env.DB,
        'DELETE FROM teaching_logs WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'ลบบันทึกหลังสอนแล้ว' });
    }
  }

  return error('Not Found', 404);
}
