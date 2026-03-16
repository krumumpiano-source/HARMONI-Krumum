// HARMONI — PDPA Consent API
// GET  /api/pdpa-consent?student_id=   — get consent records
// POST /api/pdpa-consent               — create/update consent
// PUT  /api/pdpa-consent/:id           — update consent

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/pdpa-consent
  if (path === '/api/pdpa-consent' && method === 'GET') {
    const studentId = url.searchParams.get('student_id');
    let sql = `SELECT pc.*, s.student_code, s.first_name, s.last_name
               FROM pdpa_consents pc
               JOIN students s ON s.id = pc.student_id
               WHERE pc.teacher_id = ?`;
    const params = [env.user.id];
    if (studentId) { sql += ' AND pc.student_id = ?'; params.push(studentId); }
    sql += ' ORDER BY pc.created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // POST /api/pdpa-consent
  if (path === '/api/pdpa-consent' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.student_id) return error('กรุณาระบุ student_id');

    const id = generateUUID();
    try {
      await dbRun(env.DB,
        `INSERT INTO pdpa_consents (id, teacher_id, student_id, consent_type, is_consented,
         consent_date, guardian_name, guardian_relation, notes, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, env.user.id, body.student_id, body.consent_type || 'general',
         body.is_consented ? 1 : 0, body.consent_date || now().split('T')[0],
         body.guardian_name || null, body.guardian_relation || null,
         body.notes || null, now()]
      );
    } catch (e) {
      // Table might not exist
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pdpa_consents (
        id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, student_id TEXT NOT NULL,
        consent_type TEXT DEFAULT 'general', is_consented INTEGER DEFAULT 0,
        consent_date TEXT, guardian_name TEXT, guardian_relation TEXT,
        notes TEXT, created_at TEXT NOT NULL
      )`).run();
      await dbRun(env.DB,
        `INSERT INTO pdpa_consents (id, teacher_id, student_id, consent_type, is_consented,
         consent_date, guardian_name, guardian_relation, notes, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, env.user.id, body.student_id, body.consent_type || 'general',
         body.is_consented ? 1 : 0, body.consent_date || now().split('T')[0],
         body.guardian_name || null, body.guardian_relation || null,
         body.notes || null, now()]
      );
    }
    return success({ id });
  }

  // PUT /api/pdpa-consent/:id
  const itemId = extractParam(path, '/api/pdpa-consent/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    const allowed = ['consent_type', 'is_consented', 'consent_date', 'guardian_name', 'guardian_relation', 'notes'];
    for (const f of allowed) {
      if (body[f] !== undefined) {
        fields.push(`${f}=?`);
        params.push(f === 'is_consented' ? (body[f] ? 1 : 0) : body[f]);
      }
    }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE pdpa_consents SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }

  return error('Not found', 404);
}
