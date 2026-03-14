// HARMONI — Attendance API
// GET  /api/attendance?classroom_id=&date=&subject_id=  — get records for a date
// POST /api/attendance                                   — save batch records
// GET  /api/attendance/summary?classroom_id=&semester_id= — summary per student

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/attendance — list for a date + classroom
  if (path === '/api/attendance' && method === 'GET') {
    const classroomId = url.searchParams.get('classroom_id');
    const date = url.searchParams.get('date');
    const subjectId = url.searchParams.get('subject_id');
    const period = url.searchParams.get('period');

    if (!classroomId || !date) {
      return error('กรุณาระบุ classroom_id และ date');
    }

    // Get students in this classroom
    const students = await dbAll(env.DB,
      `SELECT id, student_code, prefix, first_name, last_name, nickname, gender
       FROM students WHERE teacher_id = ? AND classroom_id = ?
       ORDER BY student_code`,
      [env.user.id, classroomId]
    );

    // Get existing records for this date
    let recordSql = `SELECT student_id, status, notes FROM attendance_records
                     WHERE teacher_id = ? AND classroom_id = ? AND date = ?`;
    const params = [env.user.id, classroomId, date];

    if (subjectId) { recordSql += ' AND subject_id = ?'; params.push(subjectId); }
    if (period) { recordSql += ' AND period = ?'; params.push(parseInt(period)); }

    const records = await dbAll(env.DB, recordSql, params);
    const recordMap = {};
    for (const r of records) { recordMap[r.student_id] = r; }

    // Merge
    const result = students.map(s => ({
      ...s,
      status: recordMap[s.id]?.status || null,
      notes: recordMap[s.id]?.notes || ''
    }));

    return success(result);
  }

  // POST /api/attendance — save batch
  if (path === '/api/attendance' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.classroom_id || !body.date || !Array.isArray(body.records)) {
      return error('กรุณาส่ง classroom_id, date และ records[]');
    }

    const semesterId = body.semester_id || null;
    const subjectId = body.subject_id || null;
    const period = body.period || null;

    // Delete existing records for this date+classroom+subject+period
    let delSql = 'DELETE FROM attendance_records WHERE teacher_id = ? AND classroom_id = ? AND date = ?';
    const delParams = [env.user.id, body.classroom_id, body.date];
    if (subjectId) { delSql += ' AND subject_id = ?'; delParams.push(subjectId); }
    if (period) { delSql += ' AND period = ?'; delParams.push(period); }

    await dbRun(env.DB, delSql, delParams);

    // Insert new records
    let saved = 0;
    for (const r of body.records) {
      if (!r.student_id || !r.status) continue;
      await dbRun(env.DB,
        `INSERT INTO attendance_records (id, teacher_id, student_id, classroom_id, semester_id, subject_id, date, period, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateUUID(), env.user.id, r.student_id, body.classroom_id, semesterId, subjectId, body.date, period, r.status, r.notes || null, now()]
      );
      saved++;
    }

    return success({ saved, message: `บันทึกเช็คชื่อ ${saved} คน` });
  }

  // GET /api/attendance/summary — summary per student for a classroom+semester
  if (path === '/api/attendance/summary' && method === 'GET') {
    const classroomId = url.searchParams.get('classroom_id');
    const semesterId = url.searchParams.get('semester_id');

    if (!classroomId) return error('กรุณาระบุ classroom_id');

    const summary = await dbAll(env.DB,
      `SELECT s.id, s.student_code, s.first_name, s.last_name, s.nickname,
              COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
              COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
              COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
              COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
              COUNT(ar.id) as total_count
       FROM students s
       LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.teacher_id = ?
       ${semesterId ? 'AND ar.semester_id = ?' : ''}
       WHERE s.teacher_id = ? AND s.classroom_id = ?
       GROUP BY s.id ORDER BY s.student_code`,
      semesterId
        ? [env.user.id, semesterId, env.user.id, classroomId]
        : [env.user.id, env.user.id, classroomId]
    );

    return success(summary);
  }

  return error('Not Found', 404);
}
