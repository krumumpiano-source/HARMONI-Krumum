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

// ==================== Evidence Auto-Collect ====================

const EVIDENCE_MAP = {
  post_lesson_notes: {
    type: 'teaching',
    pa_category: 'teaching_hours',
    getTitle: (d) => `บันทึกหลังสอน: ${d.lesson_title || d.topic || ''} (${d.date || ''})`,
  },
  teaching_logs: {
    type: 'teaching',
    pa_category: 'teaching_hours',
    getTitle: (d) => `บันทึกหลังสอน: ${d.topic || ''} (${d.date || ''})`,
  },
  home_visits: {
    type: 'support',
    pa_category: 'support_hours',
    getTitle: (d) => `เยี่ยมบ้าน: ${d.student_name || ''} (${d.visit_date || ''})`,
  },
  plc_records: {
    type: 'other',
    pa_category: 'other_hours',
    getTitle: (d) => `PLC: ${d.topic || ''} (${d.session_date || ''})`,
  },
  researches: {
    type: 'research',
    pa_category: 'challenging_task',
    getTitle: (d) => `วิจัย: ${d.title || ''}`,
    triggerOn: 'status_change_to_completed',
  },
  innovations: {
    type: 'innovation',
    pa_category: 'challenging_task',
    getTitle: (d) => `นวัตกรรม: ${d.title || ''}`,
  },
  log_entries: {
    type: (d) => d.category || 'teaching',
    pa_category: (d) => `${d.category || 'teaching'}_hours`,
    getTitle: (d) => `Log Book: ${d.description || ''}`,
  },
  attendance_records: { skip: true },
};

export async function autoCollectEvidence(db, teacherId, semesterId, sourceModule, sourceId, data) {
  if (!semesterId || !teacherId) return;
  const config = EVIDENCE_MAP[sourceModule];
  if (!config || config.skip) return;

  const type   = typeof config.type === 'function' ? config.type(data) : config.type;
  const paCat  = typeof config.pa_category === 'function' ? config.pa_category(data) : config.pa_category;
  const title  = config.getTitle(data);

  try {
    await db.prepare(`
      INSERT OR IGNORE INTO evidence_pool
        (id, teacher_id, semester_id, evidence_type, pa_category, title, source_module, source_id, auto_collected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      crypto.randomUUID(), teacherId, semesterId,
      type, paCat, title, sourceModule, sourceId, new Date().toISOString()
    ).run();
  } catch (e) { /* ignore duplicate */ }
}

export async function createCrossLink(db, teacherId, sourceModule, sourceId, targetModule, targetId, linkType = 'evidence') {
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO cross_links
        (id, teacher_id, source_module, source_id, target_module, target_id, link_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), teacherId,
      sourceModule, sourceId, targetModule, targetId,
      linkType, new Date().toISOString()
    ).run();
  } catch (e) { /* ignore duplicate */ }
}
