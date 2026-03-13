// HARMONI — Shared Helpers
// UUID, D1 helpers, PBKDF2 auth, AI Router

export function generateUUID() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

// PBKDF2 password hashing
export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function verifyPassword(password, salt, hash) {
  const computed = await hashPassword(password, salt);
  // Constant-time comparison
  if (computed.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

// Generate session token
export function generateToken() {
  return generateUUID();
}

// JSON response helpers
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function success(data) {
  return json({ success: true, data });
}

export function error(message, status = 400) {
  return json({ success: false, error: message }, status);
}

// Parse request body safely
export async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// D1 query helper — always uses parameterized queries
export async function dbAll(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all();
  return result.results || [];
}

export async function dbFirst(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.first();
}

export async function dbRun(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.run();
}

// Pagination helper
export function paginate(url) {
  const u = new URL(url);
  const page = Math.max(1, parseInt(u.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Extract route param from URL path
// e.g. extractParam('/api/semesters/abc123', '/api/semesters/') → 'abc123'
export function extractParam(pathname, prefix) {
  const rest = pathname.slice(prefix.length);
  const slash = rest.indexOf('/');
  return slash === -1 ? rest : rest.slice(0, slash);
}

// Extract sub-action from URL path
// e.g. extractAction('/api/semesters/abc123/activate', '/api/semesters/') → 'activate'
export function extractAction(pathname, prefix) {
  const rest = pathname.slice(prefix.length);
  const slash = rest.indexOf('/');
  return slash === -1 ? null : rest.slice(slash + 1);
}
