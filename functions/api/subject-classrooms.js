// HARMONI — Subject-Classrooms API (links subjects to classrooms per semester)
// GET    /api/subject-classrooms       — list (?semester_id=)
// POST   /api/subject-classrooms       — create
// DELETE /api/subject-classrooms       — delete (?id=)

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun
} from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'GET') {
    const semesterId = url.searchParams.get('semester_id');
    let sql = `SELECT sc.*, s.code as subject_code, s.name as subject_name,
               c.grade_level, c.room_number, c.name as classroom_name,
               (SELECT COUNT(*) FROM student_classrooms stc WHERE stc.classroom_id = sc.classroom_id AND stc.is_active = 1) as student_count
               FROM subject_classrooms sc
               JOIN subjects s ON sc.subject_id = s.id
               JOIN classrooms c ON sc.classroom_id = c.id
               WHERE sc.teacher_id = ?`;
    const params = [env.user.id];
    if (semesterId) {
      sql += ' AND sc.semester_id = ?';
      params.push(semesterId);
    }
    sql += ' ORDER BY s.code, c.grade_level, c.room_number';
    return success(await dbAll(env.DB, sql, params));
  }

  if (method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.subject_id || !body.classroom_id || !body.semester_id) {
      return error('กรุณาเลือกวิชา ห้องเรียน และภาคเรียน');
    }
    const id = generateUUID();
    await dbRun(env.DB,
      'INSERT INTO subject_classrooms (id, teacher_id, subject_id, classroom_id, semester_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, env.user.id, body.subject_id, body.classroom_id, body.semester_id, now()]
    );
    return success({ id });
  }

  if (method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) return error('กรุณาระบุ id');
    await dbRun(env.DB,
      'DELETE FROM subject_classrooms WHERE id = ? AND teacher_id = ?',
      [id, env.user.id]
    );
    return success({ message: 'ลบแล้ว' });
  }

  return error('Method Not Allowed', 405);
}
