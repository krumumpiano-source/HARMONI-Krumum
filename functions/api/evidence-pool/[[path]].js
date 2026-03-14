// HARMONI — Evidence Pool API
// GET    /api/evidence-pool               — list evidence (filter by pa_category, evidence_type, semester_id)
// POST   /api/evidence-pool               — create evidence
// POST   /api/evidence-pool/auto-collect   — auto-collect evidence from source modules
// PUT    /api/evidence-pool/:id           — update evidence
// DELETE /api/evidence-pool/:id           — delete evidence

import {
  generateUUID, now, success, error, parseBody,
  dbAll, dbFirst, dbRun, paginate
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/evidence-pool — list
  if (path === '/api/evidence-pool' && method === 'GET') {
    const semesterId = url.searchParams.get('semester_id');
    const paCategory = url.searchParams.get('pa_category');
    const evidenceType = url.searchParams.get('evidence_type');
    let sql = 'SELECT * FROM evidence_pool WHERE teacher_id = ?';
    const params = [env.user.id];
    if (semesterId) { sql += ' AND semester_id = ?'; params.push(semesterId); }
    if (paCategory) { sql += ' AND pa_category = ?'; params.push(paCategory); }
    if (evidenceType) { sql += ' AND evidence_type = ?'; params.push(evidenceType); }
    sql += ' ORDER BY created_at DESC';
    return success(await dbAll(env.DB, sql, params));
  }

  // POST /api/evidence-pool/auto-collect — auto-collect from modules
  if (path === '/api/evidence-pool/auto-collect' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.semester_id) return error('ระบุ semester_id');

    const semesterId = body.semester_id;
    let collected = 0;

    // Source modules and their mapping to evidence_type + pa_category
    const sources = [
      {
        module: 'post_lesson_notes',
        sql: `SELECT id, topic as title, reflection as description, lesson_date as created_at
              FROM post_lesson_notes WHERE teacher_id = ? AND semester_id = ?`,
        type: 'teaching', pa: 'pa1'
      },
      {
        module: 'lesson_plans',
        sql: `SELECT id, title, objectives as description, created_at
              FROM lesson_plans WHERE teacher_id = ? AND semester_id = ?`,
        type: 'teaching', pa: 'pa1'
      },
      {
        module: 'home_visits',
        sql: `SELECT id, visit_purpose as title, findings as description, visit_date as created_at
              FROM home_visits WHERE teacher_id = ?`,
        type: 'support', pa: 'pa2'
      },
      {
        module: 'sdq_screenings',
        sql: `SELECT id, 'SDQ ' || screen_date as title, interpretation as description, screen_date as created_at
              FROM sdq_screenings WHERE teacher_id = ?`,
        type: 'support', pa: 'pa2'
      },
      {
        module: 'care_records',
        sql: `SELECT id, issue_type as title, details as description, record_date as created_at
              FROM care_records WHERE teacher_id = ?`,
        type: 'support', pa: 'pa2'
      },
      {
        module: 'research_records',
        sql: `SELECT id, title, abstract as description, created_at
              FROM research_records WHERE teacher_id = ?`,
        type: 'research', pa: 'pa3'
      },
      {
        module: 'innovation_records',
        sql: `SELECT id, title, description, created_at
              FROM innovation_records WHERE teacher_id = ?`,
        type: 'innovation', pa: 'pa3'
      },
      {
        module: 'plc_records',
        sql: `SELECT id, topic as title, discussion_summary as description, meeting_date as created_at
              FROM plc_records WHERE teacher_id = ?`,
        type: 'other', pa: 'pa4'
      }
    ];

    for (const src of sources) {
      const hasSemester = src.sql.includes('semester_id');
      const params = hasSemester ? [env.user.id, semesterId] : [env.user.id];
      const items = await dbAll(env.DB, src.sql, params);

      for (const item of items) {
        // Check if already collected
        const exists = await dbFirst(env.DB,
          'SELECT id FROM evidence_pool WHERE teacher_id = ? AND source_module = ? AND source_id = ?',
          [env.user.id, src.module, item.id]);
        if (exists) continue;

        await dbRun(env.DB, `
          INSERT INTO evidence_pool (id, teacher_id, semester_id, evidence_type, pa_category, title, description, source_module, source_id, auto_collected, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `, [
          generateUUID(), env.user.id, semesterId,
          src.type, src.pa,
          (item.title || '').substring(0, 200),
          (item.description || '').substring(0, 1000),
          src.module, item.id,
          item.created_at || now()
        ]);
        collected++;
      }
    }

    return success({ collected });
  }

  // POST /api/evidence-pool — create manual
  if (path === '/api/evidence-pool' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || !body.title) return error('ระบุชื่อหลักฐาน');

    const id = generateUUID();
    await dbRun(env.DB, `
      INSERT INTO evidence_pool (id, teacher_id, semester_id, evidence_type, pa_category, title, description, source_module, file_urls, auto_collected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      id, env.user.id,
      body.semester_id || null,
      body.evidence_type || 'other',
      body.pa_category || null,
      body.title,
      body.description || null,
      body.source_module || 'manual',
      body.file_urls ? JSON.stringify(body.file_urls) : null,
      now()
    ]);

    return success({ id });
  }

  // PUT /api/evidence-pool/:id
  const idMatch = path.match(/^\/api\/evidence-pool\/([^/]+)$/);
  if (idMatch && method === 'PUT') {
    const id = idMatch[1];
    const body = await parseBody(request);
    const existing = await dbFirst(env.DB,
      'SELECT id FROM evidence_pool WHERE id = ? AND teacher_id = ?', [id, env.user.id]);
    if (!existing) return error('ไม่พบรายการ', 404);

    const fields = [];
    const params = [];
    for (const col of ['title', 'description', 'evidence_type', 'pa_category', 'semester_id']) {
      if (body[col] !== undefined) { fields.push(`${col} = ?`); params.push(body[col]); }
    }
    if (body.file_urls !== undefined) { fields.push('file_urls = ?'); params.push(JSON.stringify(body.file_urls)); }
    if (fields.length === 0) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE evidence_pool SET ${fields.join(', ')} WHERE id = ?`, params);

    return success({ updated: true });
  }

  // DELETE /api/evidence-pool/:id
  if (idMatch && method === 'DELETE') {
    const id = idMatch[1];
    const existing = await dbFirst(env.DB,
      'SELECT id FROM evidence_pool WHERE id = ? AND teacher_id = ?', [id, env.user.id]);
    if (!existing) return error('ไม่พบรายการ', 404);
    await dbRun(env.DB, 'DELETE FROM evidence_pool WHERE id = ?', [id]);
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
