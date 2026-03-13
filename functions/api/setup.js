// HARMONI — Setup API (first-time account creation)
// POST /api/setup — create teacher account (only if no users exist)

import {
  generateUUID, now, hashPassword, generateToken,
  success, error, parseBody, dbFirst, dbRun
} from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return error('Method Not Allowed', 405);
  }

  // Check if any user exists already
  const existing = await dbFirst(env.DB, 'SELECT id FROM users LIMIT 1');
  if (existing) {
    return error('ระบบถูกตั้งค่าแล้ว กรุณาเข้าสู่ระบบ', 403);
  }

  const body = await parseBody(request);
  if (!body || !body.username || !body.password) {
    return error('กรุณากรอก username และ password');
  }

  if (body.password.length < 6) {
    return error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  }

  // Create teacher user
  const userId = generateUUID();
  const salt = generateUUID();
  const passwordHash = await hashPassword(body.password, salt);

  await dbRun(env.DB,
    'INSERT INTO users (id, username, password_hash, salt, role, display_name, is_admin, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
    [userId, body.username, passwordHash, salt, 'teacher', body.display_name || body.username, 'active', now()]
  );

  // Create session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await dbRun(env.DB,
    'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [generateUUID(), userId, token, expiresAt, now()]
  );

  return success({
    token,
    role: 'teacher',
    displayName: body.display_name || body.username,
    userId
  });
}
