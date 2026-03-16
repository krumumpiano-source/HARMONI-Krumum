// HARMONI — Gamification API (Teacher side)
import { success, error, parseBody, dbAll, dbFirst, dbRun, generateUUID, now, extractParam, extractAction } from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const db = env.DB;
  const method = request.method;
  const pathParts = (params.path || []);
  const path = '/' + pathParts.join('/');

  // Auth: teacher JWT
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return error('Unauthorized', 401);
  const teacher = await dbFirst(db, 'SELECT id FROM teachers WHERE session_token = ?', [token]);
  if (!teacher) return error('Unauthorized', 401);
  const teacherId = teacher.id;

  // ===== GET /api/gamification/overview?classroom_id=X =====
  // Returns per-student XP, behavior summary, streak, league in a classroom
  if ((path === '/' || path === '' || path === '/overview') && method === 'GET') {
    const url = new URL(request.url);
    const classroomId = url.searchParams.get('classroom_id');
    if (!classroomId) return error('classroom_id required');
    // Get students in classroom
    const students = await dbAll(db,
      `SELECT s.id, s.name, s.student_code FROM students s
       JOIN classroom_students cs ON cs.student_id = s.id
       WHERE cs.classroom_id = ?
       ORDER BY s.name`,
      [classroomId]
    );
    // Enrich with XP, behavior points, streak, league
    const enriched = await Promise.all(students.map(async (s) => {
      const xpRow = await dbFirst(db, 'SELECT COALESCE(SUM(xp_amount),0) as total FROM student_xp WHERE student_id = ?', [s.id]);
      const bpRow = await dbFirst(db, 'SELECT COALESCE(SUM(points),0) as total FROM behavior_points WHERE student_id = ? AND classroom_id = ? AND teacher_id = ?', [s.id, classroomId, teacherId]);
      const streak = await dbFirst(db, 'SELECT current_streak, longest_streak FROM student_streaks WHERE student_id = ?', [s.id]);
      const league = await dbFirst(db, 'SELECT league, weekly_xp FROM weekly_leagues WHERE student_id = ? ORDER BY week_start DESC LIMIT 1', [s.id]);
      const badgeCount = await dbFirst(db, 'SELECT COUNT(*) as cnt FROM student_badges WHERE student_id = ?', [s.id]);
      return {
        ...s,
        total_xp: xpRow?.total || 0,
        level: Math.min(Math.floor((xpRow?.total || 0) / 100) + 1, 10),
        behavior_points: bpRow?.total || 0,
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        league: league?.league || 'bronze',
        weekly_xp: league?.weekly_xp || 0,
        badge_count: badgeCount?.cnt || 0,
      };
    }));
    return success(enriched);
  }

  // ===== POST /api/gamification/behavior — give behavior points =====
  if (path === '/behavior' && method === 'POST') {
    const body = await parseBody(request);
    const { student_id, classroom_id, points, reason, category } = body || {};
    if (!student_id || !classroom_id || !points || !reason) return error('student_id, classroom_id, points, reason required');
    const id = generateUUID();
    await dbRun(db,
      `INSERT INTO behavior_points (id, teacher_id, student_id, classroom_id, points, reason, category, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, teacherId, student_id, classroom_id, points, reason, category || 'general', now()]
    );
    // Also grant XP if positive
    if (points > 0) {
      const xpId = generateUUID();
      await dbRun(db,
        `INSERT INTO student_xp (id, student_id, source_type, source_id, xp_amount, created_at) VALUES (?,?,?,?,?,?)`,
        [xpId, student_id, 'behavior', id, Math.min(points * 2, 20), now()]
      );
    }
    return success({ id });
  }

  // ===== GET /api/gamification/behavior?student_id=X&classroom_id=Y =====
  if (path === '/behavior' && method === 'GET') {
    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const classroomId = url.searchParams.get('classroom_id');
    if (!studentId || !classroomId) return error('student_id and classroom_id required');
    const rows = await dbAll(db,
      `SELECT * FROM behavior_points WHERE student_id = ? AND classroom_id = ? AND teacher_id = ? ORDER BY created_at DESC`,
      [studentId, classroomId, teacherId]
    );
    return success(rows);
  }

  // ===== GET /api/gamification/leaderboard?classroom_id=X =====
  if (path === '/leaderboard' && method === 'GET') {
    const url = new URL(request.url);
    const classroomId = url.searchParams.get('classroom_id');
    if (!classroomId) return error('classroom_id required');
    const students = await dbAll(db,
      `SELECT s.id, s.name
       FROM students s JOIN classroom_students cs ON cs.student_id = s.id
       WHERE cs.classroom_id = ?`,
      [classroomId]
    );
    const board = await Promise.all(students.map(async (s) => {
      const xp = await dbFirst(db, 'SELECT COALESCE(SUM(xp_amount),0) as total FROM student_xp WHERE student_id = ?', [s.id]);
      const bp = await dbFirst(db, 'SELECT COALESCE(SUM(points),0) as total FROM behavior_points WHERE student_id = ? AND classroom_id = ? AND teacher_id = ?', [s.id, classroomId, teacherId]);
      return { ...s, total_xp: xp?.total || 0, behavior_total: bp?.total || 0 };
    }));
    board.sort((a, b) => (b.total_xp + b.behavior_total) - (a.total_xp + a.behavior_total));
    return success(board.map((s, i) => ({ ...s, rank: i + 1 })));
  }

  // ===== POST /api/gamification/award-xp — manually award XP =====
  if (path === '/award-xp' && method === 'POST') {
    const body = await parseBody(request);
    const { student_id, xp_amount, reason } = body || {};
    if (!student_id || !xp_amount) return error('student_id and xp_amount required');
    const id = generateUUID();
    await dbRun(db,
      `INSERT INTO student_xp (id, student_id, source_type, source_id, xp_amount, created_at) VALUES (?,?,?,?,?,?)`,
      [id, student_id, 'manual', id, Number(xp_amount), now()]
    );
    return success({ id });
  }

  return error('Not found', 404);
}
