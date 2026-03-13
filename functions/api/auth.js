// HARMONI — Auth API
// POST /api/auth/login
// POST /api/auth/register-student
// POST /api/auth/logout
// GET  /api/auth/me
// POST /api/auth/change-password

import {
  generateUUID, now, hashPassword, verifyPassword, generateToken,
  success, error, parseBody, dbFirst, dbRun, dbAll
} from '../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, env);
  }

  // POST /api/auth/register-student
  if (path === '/api/auth/register-student' && method === 'POST') {
    return handleRegisterStudent(request, env);
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    return handleLogout(env);
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    return handleMe(env);
  }

  // POST /api/auth/change-password
  if (path === '/api/auth/change-password' && method === 'POST') {
    return handleChangePassword(request, env);
  }

  return error('Not Found', 404);
}

async function handleLogin(request, env) {
  const body = await parseBody(request);
  if (!body || !body.username || !body.password) {
    return error('กรุณากรอก username และ password');
  }

  const user = await dbFirst(env.DB,
    'SELECT * FROM users WHERE username = ?',
    [body.username]
  );

  if (!user) {
    return error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
  }

  const valid = await verifyPassword(body.password, user.salt, user.password_hash);
  if (!valid) {
    return error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
  }

  // Create session (expire in 7 days)
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await dbRun(env.DB,
    'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [generateUUID(), user.id, token, expiresAt, now()]
  );

  return success({
    token,
    role: user.role,
    displayName: user.display_name,
    userId: user.id
  });
}

async function handleRegisterStudent(request, env) {
  const body = await parseBody(request);
  if (!body || !body.student_code || !body.password || !body.first_name || !body.last_name) {
    return error('กรุณากรอกข้อมูลให้ครบถ้วน');
  }

  // Find matching student record
  const student = await dbFirst(env.DB,
    'SELECT * FROM students WHERE student_code = ?',
    [body.student_code]
  );

  if (!student) {
    return error('ไม่พบข้อมูลนักเรียน กรุณาติดต่อครูประจำวิชา', 404);
  }

  // Check if student already has a user account
  if (student.user_id) {
    return error('นักเรียนคนนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ');
  }

  // Create user account
  const userId = generateUUID();
  const salt = generateUUID();
  const passwordHash = await hashPassword(body.password, salt);
  const displayName = `${body.first_name} ${body.last_name}`;

  await dbRun(env.DB,
    'INSERT INTO users (id, username, password_hash, salt, role, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, body.student_code, passwordHash, salt, 'student', displayName, now()]
  );

  // Link student record to user
  await dbRun(env.DB,
    'UPDATE students SET user_id = ?, updated_at = ? WHERE id = ?',
    [userId, now(), student.id]
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
    role: 'student',
    displayName,
    userId
  });
}

async function handleLogout(env) {
  if (!env.user) return error('ไม่ได้เข้าสู่ระบบ', 401);

  await dbRun(env.DB,
    'DELETE FROM sessions WHERE id = ?',
    [env.user.sessionId]
  );

  return success({ message: 'ออกจากระบบแล้ว' });
}

async function handleMe(env) {
  if (!env.user) return error('ไม่ได้เข้าสู่ระบบ', 401);

  const user = await dbFirst(env.DB,
    'SELECT id, username, role, display_name, created_at FROM users WHERE id = ?',
    [env.user.id]
  );

  if (!user) return error('ไม่พบข้อมูลผู้ใช้', 404);

  return success(user);
}

async function handleChangePassword(request, env) {
  if (!env.user) return error('ไม่ได้เข้าสู่ระบบ', 401);

  const body = await parseBody(request);
  if (!body || !body.old_password || !body.new_password) {
    return error('กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่');
  }

  if (body.new_password.length < 6) {
    return error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
  }

  const user = await dbFirst(env.DB,
    'SELECT * FROM users WHERE id = ?',
    [env.user.id]
  );

  const valid = await verifyPassword(body.old_password, user.salt, user.password_hash);
  if (!valid) {
    return error('รหัสผ่านเดิมไม่ถูกต้อง', 401);
  }

  const newSalt = generateUUID();
  const newHash = await hashPassword(body.new_password, newSalt);

  await dbRun(env.DB,
    'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
    [newHash, newSalt, env.user.id]
  );

  // Invalidate all other sessions
  await dbRun(env.DB,
    'DELETE FROM sessions WHERE user_id = ? AND id != ?',
    [env.user.id, env.user.sessionId]
  );

  return success({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
}
