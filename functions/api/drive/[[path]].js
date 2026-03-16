// HARMONI — Google Drive API Integration
// GET  /api/drive/auth         — get OAuth2 authorization URL
// POST /api/drive/auth         — exchange auth code for tokens
// GET  /api/drive              — list files in HARMONI folder
// POST /api/drive              — upload file (base64 or URL)
// DELETE /api/drive/:fileId    — delete file from Drive

import { generateUUID, now, success, error, parseBody, dbFirst, dbRun } from '../../_helpers.js';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const REDIRECT_URI_PATH = '/api/drive/auth/callback';

function getRedirectUri(request) {
  const url = new URL(request.url);
  return `${url.origin}${REDIRECT_URI_PATH}`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const clientId = env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = env.GOOGLE_DRIVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return error('Google Drive ยังไม่ได้ตั้งค่า — ใส่ GOOGLE_DRIVE_CLIENT_ID/SECRET ใน wrangler.toml');
  }

  // GET /api/drive/auth — return auth URL for user to visit
  if (path === '/api/drive/auth' && method === 'GET') {
    const redirectUri = getRedirectUri(request);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;
    return success({ auth_url: authUrl });
  }

  // POST /api/drive/auth — exchange code for tokens
  if (path === '/api/drive/auth' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.code) return error('กรุณาส่ง code');

    const redirectUri = getRedirectUri(request);
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: body.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenResp.json();
    if (tokens.error) return error(`Google OAuth error: ${tokens.error_description || tokens.error}`);

    // Store tokens in teacher profile (app_settings)
    await dbRun(env.DB,
      `INSERT INTO app_settings (id, teacher_id, key, value, updated_at)
       VALUES (?, ?, 'drive_tokens', ?, ?)
       ON CONFLICT(teacher_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [generateUUID(), env.user.id, JSON.stringify(tokens), now()]
    );

    return success({ message: 'เชื่อมต่อ Google Drive สำเร็จ', has_token: true });
  }

  // GET /api/drive/auth/callback — OAuth callback redirect
  if (path === REDIRECT_URI_PATH && method === 'GET') {
    const code = url.searchParams.get('code');
    if (!code) return new Response('Authorization failed', { status: 400 });
    // Return a page that sends code back to the app
    return new Response(`<!DOCTYPE html><html><body><script>
      window.opener?.postMessage({type:'drive_auth',code:'${code}'},'*');
      window.close();
    </script><p>กำลังเชื่อมต่อ Google Drive... ปิดหน้านี้ได้</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Helper: get access token (refresh if needed)
  async function getAccessToken() {
    const row = await dbFirst(env.DB,
      "SELECT value FROM app_settings WHERE teacher_id = ? AND key = 'drive_tokens'",
      [env.user.id]
    );
    if (!row) return null;
    const tokens = JSON.parse(row.value);

    // Check if token expired (tokens have expires_in in seconds)
    if (tokens.refresh_token) {
      // Always try refresh to be safe
      const refreshResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokens.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      });
      const refreshed = await refreshResp.json();
      if (refreshed.access_token) {
        tokens.access_token = refreshed.access_token;
        await dbRun(env.DB,
          "UPDATE app_settings SET value = ?, updated_at = ? WHERE teacher_id = ? AND key = 'drive_tokens'",
          [JSON.stringify(tokens), now(), env.user.id]
        );
      }
    }
    return tokens.access_token;
  }

  // GET /api/drive — list files
  if (path === '/api/drive' && method === 'GET') {
    const accessToken = await getAccessToken();
    if (!accessToken) return error('ยังไม่ได้เชื่อมต่อ Google Drive — ไปที่ตั้งค่า > เชื่อมต่อ Drive');

    const folderId = url.searchParams.get('folder_id') || 'root';
    const q = url.searchParams.get('q') || '';
    let query = `'${folderId}' in parents and trashed = false`;
    if (q) query += ` and name contains '${q.replace(/'/g, "\\'")}'`;

    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,webViewLink,thumbnailLink)&orderBy=createdTime desc&pageSize=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await resp.json();
    if (data.error) return error(data.error.message);
    return success(data.files || []);
  }

  // POST /api/drive — upload file
  if (path === '/api/drive' && method === 'POST') {
    const accessToken = await getAccessToken();
    if (!accessToken) return error('ยังไม่ได้เชื่อมต่อ Google Drive');

    const body = await parseBody(request);
    if (!body?.name || !body?.content) return error('กรุณาส่ง name และ content (base64)');

    const metadata = {
      name: body.name,
      mimeType: body.mimeType || 'application/octet-stream',
      parents: body.folder_id ? [body.folder_id] : []
    };

    // Simple upload using multipart
    const boundary = '-------harmoni_upload';
    const fileContent = Uint8Array.from(atob(body.content), c => c.charCodeAt(0));

    const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${body.content}\r\n--${boundary}--`;

    const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    const data = await resp.json();
    if (data.error) return error(data.error.message);
    return success(data);
  }

  // DELETE /api/drive/:fileId
  if (path.startsWith('/api/drive/') && !path.includes('/auth') && method === 'DELETE') {
    const fileId = path.split('/').pop();
    const accessToken = await getAccessToken();
    if (!accessToken) return error('ยังไม่ได้เชื่อมต่อ Google Drive');

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return success({ deleted: true });
  }

  return error('Not found', 404);
}
