// HARMONI — Students API
// GET    /api/students         — list (?classroom_id=&semester_id=)
// POST   /api/students         — create
// GET    /api/students/:id     — detail
// PUT    /api/students/:id     — update
// DELETE /api/students/:id     — delete
// POST   /api/students/import  — CSV bulk import

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam, paginate
} from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/students') {
    if (method === 'GET') {
      const classroomId = url.searchParams.get('classroom_id');
      const semesterId = url.searchParams.get('semester_id');
      const { limit, offset } = paginate(url);

      let sql = 'SELECT * FROM students WHERE teacher_id = ?';
      const params = [env.user.id];

      if (classroomId) {
        sql += ' AND classroom_id = ?';
        params.push(classroomId);
      }
      if (semesterId) {
        sql += ' AND semester_id = ?';
        params.push(semesterId);
      }
      sql += ' ORDER BY student_number LIMIT ? OFFSET ?';
      params.push(limit, offset);

      return success(await dbAll(env.DB, sql, params));
    }

    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.student_code || !body.first_name || !body.last_name) {
        return error('กรุณากรอกรหัสนักเรียน ชื่อ และนามสกุล');
      }
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO students (id, teacher_id, classroom_id, semester_id, student_code, student_number,
         title, first_name, last_name, nickname, gender, birth_date, phone, email, photo_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, env.user.id, body.classroom_id || null, body.semester_id || null, body.student_code,
         body.student_number || null, body.title || null, body.first_name, body.last_name,
         body.nickname || null, body.gender || null, body.birth_date || null,
         body.phone || null, body.email || null, body.photo_url || null, now()]
      );
      return success({ id });
    }
  }

  // CSV import
  if (path === '/api/students/import' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !Array.isArray(body.students)) {
      return error('กรุณาส่งข้อมูลนักเรียนเป็น array');
    }

    let imported = 0;
    for (const s of body.students) {
      if (!s.student_code || !s.first_name || !s.last_name) continue;
      const id = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO students (id, teacher_id, classroom_id, semester_id, student_code, student_number,
         title, first_name, last_name, nickname, gender, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, env.user.id, body.classroom_id || null, body.semester_id || null,
         s.student_code, s.student_number || null, s.title || null,
         s.first_name, s.last_name, s.nickname || null, s.gender || null, now()]
      );
      imported++;
    }
    return success({ imported });
  }

  if (path.startsWith('/api/students/')) {
    const id = extractParam(path, '/api/students/');
    if (id === 'import') return error('Not Found', 404);

    if (method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM students WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      if (!row) return error('ไม่พบนักเรียน', 404);
      return success(row);
    }
    if (method === 'PUT') {
      const body = await parseBody(request);
      if (!body) return error('ข้อมูลไม่ถูกต้อง');
      await dbRun(env.DB,
        `UPDATE students SET classroom_id = COALESCE(?, classroom_id), semester_id = COALESCE(?, semester_id),
         student_code = COALESCE(?, student_code), student_number = COALESCE(?, student_number),
         title = COALESCE(?, title), first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
         nickname = COALESCE(?, nickname), gender = COALESCE(?, gender), birth_date = COALESCE(?, birth_date),
         phone = COALESCE(?, phone), email = COALESCE(?, email), photo_url = COALESCE(?, photo_url),
         updated_at = ? WHERE id = ? AND teacher_id = ?`,
        [body.classroom_id, body.semester_id, body.student_code, body.student_number,
         body.title, body.first_name, body.last_name, body.nickname, body.gender,
         body.birth_date, body.phone, body.email, body.photo_url, now(), id, env.user.id]
      );
      return success({ message: 'อัปเดตข้อมูลนักเรียนแล้ว' });
    }
    if (method === 'DELETE') {
      await dbRun(env.DB,
        'DELETE FROM students WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'ลบนักเรียนแล้ว' });
    }
  }

  return error('Not Found', 404);
}
