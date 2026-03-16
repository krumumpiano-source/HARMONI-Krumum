// HARMONI — Backup API
// GET  /api/backup         — list backup history
// POST /api/backup         — trigger manual backup (export DB as JSON)

import { generateUUID, now, success, error, dbAll, dbRun } from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/backup — list backup records
  if (path === '/api/backup' && method === 'GET') {
    const backups = await dbAll(env.DB,
      'SELECT id, backup_type, status, file_url, created_at FROM backup_logs WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 20',
      [env.user.id]
    );
    return success(backups);
  }

  // POST /api/backup — trigger manual backup
  if (path === '/api/backup' && method === 'POST') {
    const backupId = generateUUID();
    const timestamp = now();

    // Collect all teacher data
    const tables = [
      'teaching_logs', 'researches', 'innovations', 'plc_records',
      'log_entries', 'portfolio_items', 'attendance_records', 'home_visits',
      'sdq_screenings', 'care_records', 'calendar_events', 'awards'
    ];

    const backup = { teacher_id: env.user.id, created_at: timestamp, tables: {} };
    for (const table of tables) {
      try {
        const rows = await dbAll(env.DB, `SELECT * FROM ${table} WHERE teacher_id = ?`, [env.user.id]);
        backup.tables[table] = rows;
      } catch (e) {
        // Table might not exist, skip
      }
    }

    // Also backup settings
    backup.tables.app_settings = await dbAll(env.DB,
      'SELECT key, value FROM app_settings WHERE teacher_id = ?', [env.user.id]);

    // Store backup log
    try {
      await dbRun(env.DB,
        `INSERT INTO backup_logs (id, teacher_id, backup_type, status, created_at)
         VALUES (?, ?, 'manual', 'completed', ?)`,
        [backupId, env.user.id, timestamp]
      );
    } catch (e) {
      // backup_logs table might not exist, create it
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS backup_logs (
        id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, backup_type TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'completed', file_url TEXT, created_at TEXT NOT NULL
      )`).run();
      await dbRun(env.DB,
        `INSERT INTO backup_logs (id, teacher_id, backup_type, status, created_at) VALUES (?, ?, 'manual', 'completed', ?)`,
        [backupId, env.user.id, timestamp]
      );
    }

    return success({
      id: backupId,
      data: backup,
      message: 'สำรองข้อมูลสำเร็จ — ดาวน์โหลดไฟล์ JSON ได้เลย'
    });
  }

  return error('Not found', 404);
}
