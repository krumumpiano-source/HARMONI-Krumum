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
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com https://www.googleapis.com",
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

      // Block pending/rejected teachers
      if (session.role === 'teacher' && session.status !== 'active') {
        return addCors(error('บัญชีของคุณรอการอนุมัติจากแอดมิน', 403));
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

    // Role-based access: students can only access /api/student/* and /api/auth/*
    if (env.user.role === 'student') {
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
