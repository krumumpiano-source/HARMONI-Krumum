// HARMONI — Subjects API
// GET    /api/subjects       — list (?type=)
// POST   /api/subjects       — create
// GET    /api/subjects/:id   — detail
// PUT    /api/subjects/:id   — update
// DELETE /api/subjects/:id   — delete

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/subjects') {
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      let sql = 'SELECT * FROM subjects WHERE teacher_id = ?';
      const params = [env.user.id];
      if (type) {
        sql += ' AND subject_type = ?';
        params.push(type);
      }
      sql += ' ORDER BY code';
      return success(await dbAll(env.DB, sql, params));
    }
    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body || !body.code || !body.name) {
        return error('กรุณากรอกรหัสวิชาและชื่อวิชา');
      }
      const id = generateUUID();
      await dbRun(env.DB,
        'INSERT INTO subjects (id, teacher_id, code, name, subject_type, arts_area, credits, hours_per_week, grade_level, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, env.user.id, body.code, body.name, body.subject_type || 'regular', body.arts_area || null, body.credits || 1, body.hours_per_week || 1, body.grade_level || null, body.description || null, now()]
      );
      return success({ id });
    }
  }

  // Indicators lookup (ตัวชี้วัดหลักสูตร)
  if (path === '/api/subjects/indicators' && method === 'GET') {
    const grade = url.searchParams.get('grade');
    const arts = url.searchParams.get('arts_area');
    // Map arts_area to strand prefix
    const strandMap = { visual: ['ศ 1.1', 'ศ 1.2'], music: ['ศ 2.1', 'ศ 2.2'], dance: ['ศ 3.1', 'ศ 3.2'] };
    const strands = arts ? (strandMap[arts] || []) : ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'];
    const placeholders = strands.map(() => '?').join(',');
    let sql = `SELECT * FROM curriculum_indicators WHERE teacher_id = '__SYSTEM__' AND strand IN (${placeholders})`;
    const params = [...strands];
    if (grade) {
      const g = parseInt(grade);
      // ม.4-6 all map to grade_level=4
      const gl = g >= 4 ? 4 : g;
      sql += ' AND grade_level = ?';
      params.push(gl);
    }
    sql += ' ORDER BY sort_order';
    return success(await dbAll(env.DB, sql, params));
  }

  if (path.startsWith('/api/subjects/')) {
    const id = extractParam(path, '/api/subjects/');
    if (method === 'GET') {
      const row = await dbFirst(env.DB,
        'SELECT * FROM subjects WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      if (!row) return error('ไม่พบวิชา', 404);
      return success(row);
    }
    if (method === 'PUT') {
      const body = await parseBody(request);
      if (!body) return error('ข้อมูลไม่ถูกต้อง');
      await dbRun(env.DB,
        'UPDATE subjects SET code = COALESCE(?, code), name = COALESCE(?, name), subject_type = COALESCE(?, subject_type), arts_area = COALESCE(?, arts_area), credits = COALESCE(?, credits), hours_per_week = COALESCE(?, hours_per_week), grade_level = COALESCE(?, grade_level), description = COALESCE(?, description), updated_at = ? WHERE id = ? AND teacher_id = ?',
        [body.code, body.name, body.subject_type, body.arts_area, body.credits, body.hours_per_week, body.grade_level, body.description, now(), id, env.user.id]
      );
      return success({ message: 'อัปเดตวิชาแล้ว' });
    }
    if (method === 'DELETE') {
      await dbRun(env.DB,
        'DELETE FROM subjects WHERE id = ? AND teacher_id = ?',
        [id, env.user.id]
      );
      return success({ message: 'ลบวิชาแล้ว' });
    }
  }

  return error('Not Found', 404);
}
