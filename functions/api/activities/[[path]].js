// HARMONI — Activities (clubs) API
// GET  /api/activities             — list all activities
// POST /api/activities             — create activity
// PUT  /api/activities/:id         — update
// DELETE /api/activities/:id       — delete
// POST /api/activities/:id/members — add member
// DELETE /api/activities/:id/members/:studentId — remove member

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbRun, extractParam
} from '../../_helpers.js';

async function ensureTables(DB) {
  await DB.prepare(`CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, semester_id TEXT,
    name TEXT NOT NULL, activity_type TEXT DEFAULT 'club',
    description TEXT, day_of_week INTEGER, period TEXT,
    location TEXT, max_members INTEGER DEFAULT 30,
    created_at TEXT NOT NULL, updated_at TEXT
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS activity_members (
    id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, student_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', joined_at TEXT NOT NULL,
    UNIQUE(activity_id, student_id)
  )`).run();
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  await ensureTables(env.DB);

  // GET /api/activities
  if (path === '/api/activities' && method === 'GET') {
    const semId = url.searchParams.get('semester_id');
    let sql = `SELECT a.*, (SELECT COUNT(*) FROM activity_members am WHERE am.activity_id = a.id) as member_count
               FROM activities a WHERE a.teacher_id = ?`;
    const params = [env.user.id];
    if (semId) { sql += ' AND a.semester_id = ?'; params.push(semId); }
    sql += ' ORDER BY a.created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // POST /api/activities
  if (path === '/api/activities' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.name) return error('กรุณาระบุชื่อกิจกรรม');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO activities (id, teacher_id, semester_id, name, activity_type, description,
       day_of_week, period, location, max_members, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, env.user.id, body.semester_id || null, body.name,
       body.activity_type || 'club', body.description || null,
       body.day_of_week ?? null, body.period || null,
       body.location || null, body.max_members || 30, now()]
    );
    return success({ id });
  }

  // Members endpoints
  const membersMatch = path.match(/^\/api\/activities\/([^/]+)\/members(?:\/([^/]+))?$/);
  if (membersMatch) {
    const actId = membersMatch[1];
    const studentId = membersMatch[2];

    if (method === 'GET') {
      const rows = await dbAll(env.DB,
        `SELECT am.*, s.student_code, s.first_name, s.last_name
         FROM activity_members am JOIN students s ON s.id = am.student_id
         WHERE am.activity_id = ? ORDER BY s.student_code`, [actId]);
      return success(rows);
    }

    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body?.student_id) return error('กรุณาระบุนักเรียน');
      const id = generateUUID();
      try {
        await dbRun(env.DB,
          `INSERT INTO activity_members (id, activity_id, student_id, role, joined_at)
           VALUES (?,?,?,?,?)`,
          [id, actId, body.student_id, body.role || 'member', now()]);
      } catch (e) {
        return error('นักเรียนอยู่ในกิจกรรมนี้แล้ว');
      }
      return success({ id });
    }

    if (method === 'DELETE' && studentId) {
      await dbRun(env.DB, 'DELETE FROM activity_members WHERE activity_id=? AND student_id=?', [actId, studentId]);
      return success({ deleted: true });
    }
  }

  // PUT /api/activities/:id
  const itemId = extractParam(path, '/api/activities/');
  if (itemId && method === 'PUT') {
    const body = await parseBody(request);
    const fields = [];
    const params = [];
    ['name', 'activity_type', 'description', 'day_of_week', 'period', 'location', 'max_members', 'semester_id'].forEach(f => {
      if (body[f] !== undefined) { fields.push(`${f}=?`); params.push(body[f]); }
    });
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    fields.push('updated_at=?'); params.push(now());
    params.push(itemId, env.user.id);
    await dbRun(env.DB, `UPDATE activities SET ${fields.join(',')} WHERE id=? AND teacher_id=?`, params);
    return success({ updated: true });
  }

  // DELETE /api/activities/:id
  if (itemId && method === 'DELETE') {
    await dbRun(env.DB, 'DELETE FROM activity_members WHERE activity_id=?', [itemId]);
    await dbRun(env.DB, 'DELETE FROM activities WHERE id=? AND teacher_id=?', [itemId, env.user.id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
