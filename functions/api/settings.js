// HARMONI — Settings API
// GET  /api/settings — get all settings
// PUT  /api/settings — bulk upsert {key:value,...}

import { generateUUID, now, success, error, parseBody, dbAll, dbRun } from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'GET') {
    const rows = await dbAll(env.DB,
      'SELECT key, value FROM settings WHERE teacher_id = ?',
      [env.user.id]
    );
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    return success(settings);
  }

  if (method === 'PUT') {
    const body = await parseBody(request);
    if (!body || typeof body !== 'object') return error('ข้อมูลไม่ถูกต้อง');

    for (const [key, value] of Object.entries(body)) {
      await dbRun(env.DB,
        `INSERT INTO settings (id, teacher_id, key, value, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(teacher_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [generateUUID(), env.user.id, key, String(value), now()]
      );
    }
    return success({ message: 'บันทึกการตั้งค่าแล้ว' });
  }

  return error('Method Not Allowed', 405);
}
