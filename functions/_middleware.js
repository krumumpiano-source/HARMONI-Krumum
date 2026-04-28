// HARMONI — Middleware: Auth + CORS + CSP
// Cloudflare Pages Functions middleware

import { json, error, dbFirst } from './_helpers.js';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register-student',
  '/api/auth/register-teacher',
  '/api/setup'
];

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// CSP header
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://generativelanguage.googleapis.com https://api.groq.com https://www.googleapis.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:"
].join('; ');

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Static files — pass through
  if (!url.pathname.startsWith('/api/')) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', CSP);
    return new Response(response.body, { status: response.status, headers });
  }

  // API routes — check auth (unless public)
  const isPublic = PUBLIC_PATHS.some(p => url.pathname === p);

  if (!isPublic) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return addCors(error('กรุณาเข้าสู่ระบบ', 401));
    }

    const token = authHeader.slice(7);
    try {
      const session = await dbFirst(env.DB,
        'SELECT s.*, u.role, u.display_name, u.id as user_id, u.is_admin, u.status FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?',
        [token, new Date().toISOString()]
      );

      if (!session) {
        return addCors(error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401));
      }

      // Block pending/rejected teachers (but allow other statuses like 'readonly')
      if (session.role === 'teacher' && (session.status === 'pending' || session.status === 'rejected')) {
        const msg = session.status === 'rejected'
          ? 'บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อแอดมิน'
          : 'บัญชีของคุณรอการอนุมัติจากแอดมิน';
        return addCors(error(msg, 403));
      }

      // Attach user info to env for downstream use
      env.user = {
        id: session.user_id,
        role: session.role,
        displayName: session.display_name,
        sessionId: session.id,
        isAdmin: session.is_admin === 1,
        status: session.status
      };
    } catch (e) {
      return addCors(error('เกิดข้อผิดพลาดในการตรวจสอบ session', 500));
    }

    // Read-only teacher account: allow read-only API access only
    // (status = 'readonly' is used for simple view-only accounts)
    if (env.user.role === 'teacher' && env.user.status === 'readonly') {
      const allowedWritePaths = new Set([
        '/api/auth/logout',
        '/api/auth/change-password'
      ]);
      const isReadMethod = request.method === 'GET' || request.method === 'HEAD';
      if (!isReadMethod && !allowedWritePaths.has(url.pathname)) {
        return addCors(error('บัญชีนี้เป็นแบบดูอย่างเดียว ไม่สามารถแก้ไขข้อมูลได้', 403));
      }

      // Let the readonly user see the admin's data by swapping user.id
      const admin = await dbFirst(env.DB,
        "SELECT id FROM users WHERE role = 'teacher' AND is_admin = 1 LIMIT 1"
      );
      if (admin) {
        env.user.realId = env.user.id; // keep the actual readonly user id
        env.user.viewingAs = admin.id;
        env.user.id = admin.id;
      }
    }

    // Role-based access: students can only access /api/student/* and /api/auth/*
    // (readonly accounts bypass this restriction)
    if (env.user.role === 'student' && env.user.status !== 'readonly') {
      if (!url.pathname.startsWith('/api/student/') && !url.pathname.startsWith('/api/auth/')) {
        return addCors(error('นักเรียนไม่มีสิทธิ์เข้าถึง', 403));
      }
    }
  }

  // Continue to route handler
  try {
    const response = await next();
    return addCors(response);
  } catch (e) {
    return addCors(error('Internal Server Error', 500));
  }
}

function addCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
