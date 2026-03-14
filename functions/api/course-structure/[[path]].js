// HARMONI — Course Structure (โครงสร้างรายวิชา) API
// GET    /api/course-structure         — list (?subject_id=&classroom_id=)
// POST   /api/course-structure         — create/update course structure
// GET    /api/course-structure/units/:csId — list units for a course structure
// POST   /api/course-structure/units   — add unit
// PUT    /api/course-structure/units/:id — update unit
// DELETE /api/course-structure/units/:id — delete unit

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

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

  // List course structures
  if (path === '/api/course-structure' && method === 'GET') {
    const subjectId = url.searchParams.get('subject_id');
    const classroomId = url.searchParams.get('classroom_id');

    let sql = `SELECT cs.*, s.code as subject_code, s.name as subject_name, c.name as classroom_name
      FROM course_structures cs
      JOIN subject_classrooms sc ON sc.id = cs.subject_classroom_id
      JOIN subjects s ON s.id = sc.subject_id
      JOIN classrooms c ON c.id = sc.classroom_id
      WHERE cs.teacher_id = ?`;
    const params = [env.user.id];
    if (subjectId) { sql += ' AND sc.subject_id = ?'; params.push(subjectId); }
    if (classroomId) { sql += ' AND sc.classroom_id = ?'; params.push(classroomId); }
    sql += ' ORDER BY cs.created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // Create/Update course structure
  if (path === '/api/course-structure' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.subject_id || !body.classroom_id || !body.semester_id) {
      return error('กรุณาเลือกวิชาและห้องเรียน');
    }
    const scId = await getOrCreateSC(env.DB, env.user.id, body.subject_id, body.classroom_id, body.semester_id);

    // Check if already exists
    const existing = await dbFirst(env.DB,
      'SELECT id FROM course_structures WHERE teacher_id=? AND subject_classroom_id=? AND semester_id=?',
      [env.user.id, scId, body.semester_id]
    );

    if (existing) {
      await dbRun(env.DB,
        `UPDATE course_structures SET total_hours=?, score_distribution=?, learning_objectives=?, updated_at=? WHERE id=?`,
        [body.total_hours || null, body.score_distribution || null, body.learning_objectives || null, now(), existing.id]
      );
      return success({ id: existing.id, updated: true });
    }

    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO course_structures (id, teacher_id, subject_classroom_id, semester_id, total_hours, score_distribution, learning_objectives, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, scId, body.semester_id, body.total_hours || null,
       body.score_distribution || null, body.learning_objectives || null, now(), now()]
    );
    return success({ id });
  }

  // List units for a course structure
  if (path.startsWith('/api/course-structure/units/') && method === 'GET') {
    const csId = extractParam(path, '/api/course-structure/units/');
    if (!csId) return error('Missing course structure id');
    const units = await dbAll(env.DB,
      'SELECT * FROM learning_units WHERE course_structure_id=? AND teacher_id=? ORDER BY unit_number',
      [csId, env.user.id]
    );
    return success(units);
  }

  // Add unit
  if (path === '/api/course-structure/units' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.course_structure_id || !body.title) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO learning_units (id, course_structure_id, teacher_id, unit_number, title, description, hours, indicators, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, body.course_structure_id, env.user.id, body.unit_number || 1, body.title,
       body.description || null, body.hours || null, body.indicators || null, now()]
    );
    return success({ id });
  }

  // Update unit
  if (path.startsWith('/api/course-structure/units/') && method === 'PUT') {
    const unitId = extractParam(path, '/api/course-structure/units/');
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE learning_units SET title=COALESCE(?,title), description=COALESCE(?,description),
       hours=COALESCE(?,hours), unit_number=COALESCE(?,unit_number), indicators=COALESCE(?,indicators)
       WHERE id=? AND teacher_id=?`,
      [body.title||null, body.description||null, body.hours||null, body.unit_number||null, body.indicators||null, unitId, env.user.id]
    );
    return success({ updated: true });
  }

  // Delete unit
  if (path.startsWith('/api/course-structure/units/') && method === 'DELETE') {
    const unitId = extractParam(path, '/api/course-structure/units/');
    await dbRun(env.DB, 'DELETE FROM learning_units WHERE id=? AND teacher_id=?', [unitId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
