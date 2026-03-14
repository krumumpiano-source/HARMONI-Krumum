// HARMONI — Homeroom (ครูที่ปรึกษา) API
// GET    /api/homeroom                  — get my homeroom assignments
// POST   /api/homeroom                  — assign homeroom
// DELETE /api/homeroom/:id              — remove assignment
// GET    /api/homeroom/students         — list students in my homeroom

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Students in homeroom
  if (path === '/api/homeroom/students' && method === 'GET') {
    const semesterId = url.searchParams.get('semester_id');
    const classroomId = url.searchParams.get('classroom_id');
    if (!classroomId) return error('กรุณาระบุห้องเรียน');
    // Verify teacher is homeroom teacher for this classroom
    let checkSql = 'SELECT id FROM homeroom_assignments WHERE teacher_id = ? AND classroom_id = ?';
    const checkParams = [env.user.id, classroomId];
    if (semesterId) { checkSql += ' AND semester_id = ?'; checkParams.push(semesterId); }
    const assignment = await dbFirst(env.DB, checkSql, checkParams);
    if (!assignment) return error('คุณไม่ใช่ครูที่ปรึกษาของห้องนี้');
    const students = await dbAll(env.DB,
      `SELECT s.* FROM students s
       JOIN student_classrooms sc ON sc.student_id = s.id
       WHERE sc.classroom_id = ? AND s.is_active = 1 ORDER BY s.student_code`,
      [classroomId]);
    return success(students);
  }

  if (path === '/api/homeroom' && method === 'GET') {
    const rows = await dbAll(env.DB,
      `SELECT ha.*, c.name as classroom_name
       FROM homeroom_assignments ha JOIN classrooms c ON c.id = ha.classroom_id
       WHERE ha.teacher_id = ? ORDER BY ha.assigned_at DESC`, [env.user.id]);
    return success(rows);
  }

  if (path === '/api/homeroom' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.classroom_id || !body.semester_id) return error('กรุณาเลือกห้องเรียนและภาคเรียน');
    // Check duplicate
    const existing = await dbFirst(env.DB,
      'SELECT id FROM homeroom_assignments WHERE teacher_id=? AND classroom_id=? AND semester_id=?',
      [env.user.id, body.classroom_id, body.semester_id]);
    if (existing) return error('คุณเป็นครูที่ปรึกษาห้องนี้อยู่แล้ว');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO homeroom_assignments (id, teacher_id, classroom_id, semester_id, role, assigned_at)
       VALUES (?,?,?,?,?,?)`,
      [id, env.user.id, body.classroom_id, body.semester_id, body.role || 'homeroom_teacher', now()]
    );
    return success({ id });
  }

  const itemId = extractParam(path, '/api/homeroom/');
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM homeroom_assignments WHERE id = ? AND teacher_id = ?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
