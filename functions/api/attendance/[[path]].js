// HARMONI — Attendance API
// GET  /api/attendance?classroom_id=&date=&subject_id=  — get records for a date
// POST /api/attendance                                   — save batch records
// GET  /api/attendance/summary?classroom_id=&semester_id= — summary per student
// POST /api/attendance/session                           — open check-in session
// GET  /api/attendance/sessions?classroom_id=&date=     — list sessions
// PUT  /api/attendance/sessions/:id/close               — close session
// POST /api/attendance/gps                              — validate GPS zone
// CRUD /api/attendance/zones                            — manage GPS zones

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun
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
      `SELECT s.id, s.student_code, s.prefix, s.first_name, s.last_name, s.nickname, s.gender
       FROM students s
       JOIN student_classrooms sc ON sc.student_id = s.id AND sc.is_active = 1
       WHERE s.teacher_id = ? AND sc.classroom_id = ?
       ORDER BY sc.student_number`,
      [env.user.id, classroomId]
    );

    // Get existing records for this date
    let recordSql = `SELECT student_id, status, notes, check_in_method, check_in_time, check_in_lat, check_in_lng
                     FROM attendance_records
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
      notes: recordMap[s.id]?.notes || '',
      check_in_method: recordMap[s.id]?.check_in_method || null,
      check_in_time: recordMap[s.id]?.check_in_time || null,
      check_in_lat: recordMap[s.id]?.check_in_lat || null,
      check_in_lng: recordMap[s.id]?.check_in_lng || null,
    }));

    return success(result);
  }

  // POST /api/attendance — save batch (UPSERT: preserve student_app check-ins)
  if (path === '/api/attendance' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.classroom_id || !body.date || !Array.isArray(body.records)) {
      return error('กรุณาส่ง classroom_id, date และ records[]');
    }

    const semesterId = body.semester_id || null;
    const subjectId = body.subject_id || null;
    const period = body.period || null;

    let saved = 0;
    for (const r of body.records) {
      if (!r.student_id || !r.status) continue;

      // Check if existing record (especially student_app check-ins)
      const existing = await dbFirst(env.DB,
        `SELECT id, check_in_method, check_in_lat, check_in_lng, check_in_time
         FROM attendance_records
         WHERE teacher_id = ? AND student_id = ? AND classroom_id = ? AND date = ?
         ${period ? 'AND period = ?' : 'AND period IS NULL'}`,
        period
          ? [env.user.id, r.student_id, body.classroom_id, body.date, period]
          : [env.user.id, r.student_id, body.classroom_id, body.date]
      );

      if (existing) {
        // UPDATE: preserve GPS check-in data
        await dbRun(env.DB,
          `UPDATE attendance_records SET status = ?, notes = ?, semester_id = ?, subject_id = ?
           WHERE id = ?`,
          [r.status, r.notes || null, semesterId, subjectId, existing.id]
        );
      } else {
        // INSERT new record (teacher manual)
        await dbRun(env.DB,
          `INSERT INTO attendance_records
           (id, teacher_id, student_id, classroom_id, semester_id, subject_id, date, period, status, notes, check_in_method, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)`,
          [generateUUID(), env.user.id, r.student_id, body.classroom_id,
           semesterId, subjectId, body.date, period, r.status, r.notes || null, now()]
        );
      }
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
       JOIN student_classrooms sc ON sc.student_id = s.id AND sc.is_active = 1
       LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.teacher_id = ?
       ${semesterId ? 'AND ar.semester_id = ?' : ''}
       WHERE s.teacher_id = ? AND sc.classroom_id = ?
       GROUP BY s.id ORDER BY sc.student_number`,
      semesterId
        ? [env.user.id, semesterId, env.user.id, classroomId]
        : [env.user.id, env.user.id, classroomId]
    );

    return success(summary);
  }

  // POST /api/attendance/gps — GPS check-in for a classroom
  if (path === '/api/attendance/gps' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.lat || !body.lng || !body.classroom_id) {
      return error('กรุณาส่ง lat, lng, classroom_id');
    }

    // Find matching attendance zone
    const zones = await dbAll(env.DB,
      'SELECT * FROM attendance_zones WHERE classroom_id = ? AND teacher_id = ?',
      [body.classroom_id, env.user.id]
    );

    let matched = false;
    for (const z of zones) {
      const dist = haversineDistance(body.lat, body.lng, z.lat, z.lng);
      if (dist <= (z.radius_meters || 100)) {
        matched = true;
        break;
      }
    }

    return success({ matched, lat: body.lat, lng: body.lng, zones_checked: zones.length });
  }

  // GET /api/attendance/zones — list zones for classroom
  if (path === '/api/attendance/zones' && method === 'GET') {
    const classroomId = url.searchParams.get('classroom_id');
    if (!classroomId) return error('กรุณาระบุ classroom_id');
    return success(await dbAll(env.DB,
      'SELECT * FROM attendance_zones WHERE classroom_id = ? AND teacher_id = ?',
      [classroomId, env.user.id]));
  }

  // POST /api/attendance/zones — create zone
  if (path === '/api/attendance/zones' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.classroom_id || !body.lat || !body.lng) return error('กรุณาส่ง classroom_id, lat, lng');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO attendance_zones (id, teacher_id, classroom_id, zone_name, lat, lng, radius_meters, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.classroom_id, body.zone_name || 'Zone', body.lat, body.lng, body.radius_meters || 100, now()]
    );
    return success({ id });
  }

  // DELETE /api/attendance/zones/:id
  if (path.startsWith('/api/attendance/zones/') && method === 'DELETE') {
    const zoneId = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM attendance_zones WHERE id = ? AND teacher_id = ?', [zoneId, env.user.id]);
    return success({ deleted: true });
  }

  // ===== ATTENDANCE SESSIONS (GPS self check-in sessions) =====

  // POST /api/attendance/session — open a new check-in session
  if (path === '/api/attendance/session' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.classroom_id || !body?.date) return error('classroom_id และ date จำเป็น');
    // Close any existing open sessions for this classroom+date+period
    await dbRun(env.DB,
      `UPDATE attendance_sessions SET is_open=0, closed_at=? WHERE teacher_id=? AND classroom_id=? AND date=? AND ${body.period ? 'period=?' : 'period IS NULL'} AND is_open=1`,
      body.period
        ? [now(), env.user.id, body.classroom_id, body.date, body.period]
        : [now(), env.user.id, body.classroom_id, body.date]
    );
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO attendance_sessions (id, teacher_id, classroom_id, date, period, subject_id, semester_id, is_open, opened_at)
       VALUES (?,?,?,?,?,?,?,1,?)`,
      [id, env.user.id, body.classroom_id, body.date, body.period || null,
       body.subject_id || null, body.semester_id || null, now()]
    );
    return success({ id });
  }

  // GET /api/attendance/sessions?classroom_id=&date= — list sessions
  if (path === '/api/attendance/sessions' && method === 'GET') {
    const classroomId = url.searchParams.get('classroom_id');
    const date = url.searchParams.get('date');
    if (!classroomId) return error('classroom_id จำเป็น');
    let sql = 'SELECT * FROM attendance_sessions WHERE teacher_id=? AND classroom_id=?';
    const params = [env.user.id, classroomId];
    if (date) { sql += ' AND date=?'; params.push(date); }
    sql += ' ORDER BY opened_at DESC LIMIT 10';
    return success(await dbAll(env.DB, sql, params));
  }

  // PUT /api/attendance/sessions/:id/close — close session
  if (path.match(/\/api\/attendance\/sessions\/[^/]+\/close/) && method === 'PUT') {
    const parts = path.split('/');
    const sessionId = parts[4]; // /api/attendance/sessions/:id/close
    await dbRun(env.DB,
      'UPDATE attendance_sessions SET is_open=0, closed_at=? WHERE id=? AND teacher_id=?',
      [now(), sessionId, env.user.id]
    );
    return success({ closed: true });
  }

  return error('Not Found', 404);
}

// Haversine formula to calculate distance between two GPS coordinates
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
