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
      `SELECT s.id, s.student_code, s.prefix, s.first_name, s.last_name, s.nickname, s.gender
       FROM students s
       JOIN student_classrooms sc ON sc.student_id = s.id AND sc.is_active = 1
       WHERE s.teacher_id = ? AND sc.classroom_id = ?
       ORDER BY sc.student_number`,
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
