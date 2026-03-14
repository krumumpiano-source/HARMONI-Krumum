// HARMONI — Student Alerts / Early Warning API
// GET    /api/student-alerts              — list alerts (filter by risk_level, semester_id)
// POST   /api/student-alerts/generate     — generate alerts for a semester using score/attendance/SDQ data
// PUT    /api/student-alerts/:id          — resolve alert

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/student-alerts — list
  if (path === '/api/student-alerts' && method === 'GET') {
    const riskLevel = url.searchParams.get('risk_level');
    const semesterId = url.searchParams.get('semester_id');
    let sql = `SELECT sa.*, s.student_code, s.first_name, s.last_name
               FROM student_alerts sa JOIN students s ON s.id = sa.student_id
               WHERE sa.teacher_id = ?`;
    const params = [env.user.id];
    if (riskLevel) { sql += ' AND sa.risk_level = ?'; params.push(riskLevel); }
    if (semesterId) { sql += ' AND sa.semester_id = ?'; params.push(semesterId); }
    sql += ' ORDER BY sa.risk_score DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // POST /api/student-alerts/generate — AI risk scoring
  if (path === '/api/student-alerts/generate' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.semester_id) return error('ระบุ semester_id');

    const semesterId = body.semester_id;

    // Get all students this teacher teaches
    const students = await dbAll(env.DB, `
      SELECT DISTINCT s.id, s.student_code, s.first_name, s.last_name
      FROM students s
      JOIN student_classrooms sc ON sc.student_id = s.id
      JOIN subject_classrooms sjc ON sjc.classroom_id = sc.classroom_id AND sjc.semester_id = ?
      WHERE sjc.teacher_id = ?
    `, [semesterId, env.user.id]);

    if (students.length === 0) return error('ไม่พบนักเรียนในภาคเรียนนี้');

    // Clear old alerts for this semester
    await dbRun(env.DB,
      'DELETE FROM student_alerts WHERE teacher_id = ? AND semester_id = ?',
      [env.user.id, semesterId]
    );

    let generated = 0;

    for (const student of students) {
      // 1. Attendance rate
      const attData = await dbFirst(env.DB, `
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance_records
        WHERE student_id = ? AND semester_id = ?
      `, [student.id, semesterId]);
      const attendanceRate = attData && attData.total > 0
        ? Math.round((attData.present / attData.total) * 100)
        : null;

      // 2. Average score percentage
      const scoreData = await dbFirst(env.DB, `
        SELECT SUM(score) as total_score, SUM(max_score) as total_max
        FROM scores WHERE student_id = ? AND semester_id = ?
      `, [student.id, semesterId]);
      const avgScore = scoreData && scoreData.total_max > 0
        ? Math.round((scoreData.total_score / scoreData.total_max) * 100)
        : null;

      // 3. Latest SDQ total difficulty
      const sdqData = await dbFirst(env.DB, `
        SELECT total_difficulty, risk_level as sdq_risk
        FROM sdq_screenings
        WHERE student_id = ? AND teacher_id = ?
        ORDER BY screen_date DESC LIMIT 1
      `, [student.id, env.user.id]);
      const sdqScore = sdqData?.total_difficulty ?? null;

      // Calculate risk score (0-100, higher = more at risk)
      let riskScore = 0;
      let factors = 0;

      if (attendanceRate !== null) {
        // Invert: low attendance = high risk
        riskScore += (100 - attendanceRate) * 0.35;
        factors++;
      }
      if (avgScore !== null) {
        // Invert: low score = high risk
        riskScore += (100 - avgScore) * 0.40;
        factors++;
      }
      if (sdqScore !== null) {
        // SDQ difficulty 0-40, normalize to 0-100
        riskScore += (sdqScore / 40) * 100 * 0.25;
        factors++;
      }

      // If we have data, normalize
      if (factors === 0) continue;
      const weights = factors === 3 ? 1 : (factors === 2 ? 0.75 : 0.5);
      riskScore = Math.round(riskScore / weights);
      riskScore = Math.min(100, Math.max(0, riskScore));

      // Determine risk level
      let riskLevel = 'normal';
      let alertType = 'combined';
      if (riskScore >= 60) riskLevel = 'critical';
      else if (riskScore >= 35) riskLevel = 'watch';

      // Determine primary alert type
      if (attendanceRate !== null && attendanceRate < 70) alertType = 'attendance';
      else if (avgScore !== null && avgScore < 40) alertType = 'academic';
      else if (sdqData?.sdq_risk === 'abnormal') alertType = 'behavior';

      const factorsJson = JSON.stringify({
        attendance_rate: attendanceRate,
        avg_score: avgScore,
        sdq_score: sdqScore,
        sdq_risk: sdqData?.sdq_risk || null
      });

      await dbRun(env.DB, `
        INSERT INTO student_alerts (id, teacher_id, student_id, semester_id, alert_type, risk_level, risk_score, factors, is_resolved, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `, [generateUUID(), env.user.id, student.id, semesterId, alertType, riskLevel, riskScore, factorsJson, now()]);

      generated++;
    }

    return success({ generated, total_students: students.length });
  }

  // PUT /api/student-alerts/:id — resolve
  const idMatch = path.match(/^\/api\/student-alerts\/([^/]+)$/);
  if (idMatch && method === 'PUT') {
    const id = idMatch[1];
    const body = await parseBody(request);
    const existing = await dbFirst(env.DB,
      'SELECT id FROM student_alerts WHERE id = ? AND teacher_id = ?', [id, env.user.id]);
    if (!existing) return error('ไม่พบรายการ', 404);

    await dbRun(env.DB,
      'UPDATE student_alerts SET is_resolved = ?, ai_recommendation = ? WHERE id = ?',
      [body?.is_resolved ? 1 : 0, body?.ai_recommendation || null, id]);

    return success({ updated: true });
  }

  return error('Not found', 404);
}
