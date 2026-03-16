// HARMONI — Student App (student.html)

// HTML attribute escape helper (prevents attribute injection)
function escAttr(s) {
  return String(s).replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'})[c] || c);
}

const StudentApp = {
  currentTab: 'feed',
  quizTimer: null,
  _submitting: false, // guard against double quiz submit

  async init() {
    if (API.token) {
      const res = await API.get('/api/auth/me');
      if (res.success && res.data.role === 'student') {
        this.showApp(res.data);
        return;
      }
    }
    this.showLogin();
  },

  showLogin() {
    document.getElementById('student-login-page').classList.remove('d-none');
    document.getElementById('student-app').classList.add('d-none');
    API.setToken(null);
  },

  showApp(user) {
    document.getElementById('student-login-page').classList.add('d-none');
    document.getElementById('student-app').classList.remove('d-none');
    this.switchTab('feed');
    this.loadNotificationBadge();
  },

  async loadNotificationBadge() {
    const res = await API.get('/api/student/notifications');
    if (res.success && res.data) {
      const unread = res.data.filter(n => !n.is_read).length;
      const badge = document.getElementById('student-notif-badge');
      if (badge) {
        badge.textContent = unread || '';
        badge.classList.toggle('d-none', !unread);
      }
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    if (this.quizTimer) { clearInterval(this.quizTimer); this.quizTimer = null; }
    this._submitting = false;
    document.querySelectorAll('.student-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    const content = document.getElementById('student-content');

    switch (tab) {
      case 'feed': this.renderFeed(content); break;
      case 'assignments': this.renderAssignments(content); break;
      case 'quizzes': this.renderQuizzes(content); break;
      case 'grades': this.renderGrades(content); break;
      case 'live': this.renderLive(content); break;
      case 'xp': this.renderXP(content); break;
      case 'notifications': this.renderNotifications(content); break;
      case 'profile': this.renderProfile(content); break;
      default: content.innerHTML = '<div class="empty-state"><i class="bi bi-tools d-block"></i><p>กำลังพัฒนา</p></div>';
    }
  },

  // ==================== FEED ====================
  async renderFeed(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/feed');

    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `
        <h5 class="fw-bold mb-3"><i class="bi bi-house-door me-2"></i>หน้าหลัก</h5>
        <div class="empty-state">
          <i class="bi bi-inbox d-block"></i>
          <p>ยังไม่มีโพสต์</p>
          <small class="text-muted">รอครูโพสต์เนื้อหาในห้องเรียน</small>
        </div>`;
      return;
    }

    const typeIcons = { announcement: 'megaphone', material: 'book', assignment: 'file-earmark-text', quiz: 'pencil-square', poll: 'bar-chart' };
    const typeLabels = { announcement: 'ประกาศ', material: 'สื่อการสอน', assignment: 'งาน', quiz: 'แบบทดสอบ', poll: 'โพล' };
    const typeColors = { announcement: 'info', material: 'primary', assignment: 'warning', quiz: 'danger', poll: 'secondary' };

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-house-door me-2"></i>หน้าหลัก</h5>
      ${res.data.map(post => `
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span class="badge bg-${typeColors[post.post_type] || 'secondary'} me-1">
                  <i class="bi bi-${typeIcons[post.post_type] || 'chat'} me-1"></i>${typeLabels[post.post_type] || escAttr(post.post_type)}
                </span>
                <span class="badge bg-light text-dark">${DOMPurify.sanitize(post.subject_name || '')}</span>
              </div>
              <small class="text-muted">${new Date(post.created_at).toLocaleDateString('th-TH')}</small>
            </div>
            ${post.is_pinned ? '<span class="badge bg-danger mb-1"><i class="bi bi-pin me-1"></i>ปักหมุด</span>' : ''}
            <h6 class="fw-bold">${DOMPurify.sanitize(post.title)}</h6>
            <p class="text-muted small mb-1">${DOMPurify.sanitize(post.content || '').substring(0, 200)}</p>
            ${post.due_date ? `<small class="text-danger"><i class="bi bi-clock me-1"></i>กำหนดส่ง: ${new Date(post.due_date).toLocaleDateString('th-TH')}</small>` : ''}
          </div>
        </div>`).join('')}`;
  },

  // ==================== ASSIGNMENTS ====================
  async renderAssignments(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/feed?type=assignment');

    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `
        <h5 class="fw-bold mb-3"><i class="bi bi-file-earmark-text me-2"></i>งานที่ได้รับ</h5>
        <div class="empty-state"><i class="bi bi-inbox d-block"></i><p>ยังไม่มีงาน</p></div>`;
      return;
    }

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-file-earmark-text me-2"></i>งานที่ได้รับ</h5>
      ${res.data.map((a, idx) => {
        const sub = a.submission;
        const statusBadge = sub
          ? (sub.status === 'graded' ? `<span class="badge bg-success">ตรวจแล้ว ${sub.score !== null ? sub.score + ' คะแนน' : ''}</span>`
            : `<span class="badge bg-info">ส่งแล้ว</span>`)
          : (a.due_date && new Date(a.due_date) < new Date() ? '<span class="badge bg-danger">เลยกำหนด</span>' : '<span class="badge bg-warning text-dark">ยังไม่ส่ง</span>');
        return `
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold mb-0">${DOMPurify.sanitize(a.title)}</h6>
                ${statusBadge}
              </div>
              <small class="text-muted d-block mb-1">${DOMPurify.sanitize(a.subject_name || '')}</small>
              <small class="text-muted">${a.due_date ? 'กำหนดส่ง: ' + new Date(a.due_date).toLocaleDateString('th-TH') : 'ไม่มีกำหนดส่ง'}</small>
              ${!sub || sub.status !== 'graded' ? `
                <div class="mt-2">
                  <button class="btn btn-sm btn-primary btn-submit-assignment" data-post-id="${escAttr(a.id)}" data-title="${escAttr(a.title)}">
                    <i class="bi bi-upload me-1"></i>${sub ? 'ส่งใหม่' : 'ส่งงาน'}
                  </button>
                </div>` : ''}
            </div>
          </div>`;
      }).join('')}`;

    // Bind submit buttons via addEventListener (no inline onclick)
    container.querySelectorAll('.btn-submit-assignment').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openSubmitForm(btn.dataset.postId, btn.dataset.title);
      });
    });
  },

  // ==================== IMAGE COMPRESSION ====================
  async compressImage(file, maxWidth = 1280, quality = 0.7) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          resolve({ name: file.name.replace(/\.[^.]+$/, '.jpg'), content: base64, mimeType: 'image/jpeg' });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  openSubmitForm(postId, title) {
    const content = document.getElementById('student-content');
    content.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-upload me-2"></i>ส่งงาน: ${DOMPurify.sanitize(title)}</h5>
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">คำตอบ / รายละเอียด</label>
            <textarea id="submit-text" class="form-control" rows="4" placeholder="พิมพ์คำตอบหรือรายละเอียด..."></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label">แนบรูปภาพ (สูงสุด 5 รูป)</label>
            <input id="submit-files" type="file" class="form-control" accept="image/*" multiple>
            <div class="form-text">รองรับ jpg, png, gif — รูปจะถูกบีบอัดอัตโนมัติก่อนส่ง</div>
            <div id="file-preview" class="d-flex flex-wrap gap-2 mt-2"></div>
          </div>
          <div class="mb-3">
            <label class="form-label">ลิงก์ (ถ้ามี)</label>
            <input id="submit-url" type="url" class="form-control" placeholder="https://...">
          </div>
          <div id="upload-progress" class="d-none mb-3">
            <div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" id="upload-bar" style="width:0%"></div></div>
            <small class="text-muted" id="upload-status">กำลังอัปโหลด...</small>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary" id="btn-do-submit"><i class="bi bi-send me-1"></i>ส่ง</button>
            <button class="btn btn-outline-secondary" id="btn-cancel-submit">ยกเลิก</button>
          </div>
        </div>
      </div>`;

    // File preview
    document.getElementById('submit-files').addEventListener('change', (e) => {
      const preview = document.getElementById('file-preview');
      preview.innerHTML = '';
      const files = [...e.target.files].slice(0, 5);
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const sizeMB = (file.size / 1048576).toFixed(1);
        preview.innerHTML += `<div class="text-center"><img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:8px"><div class="small text-muted">${sizeMB}MB</div></div>`;
      }
    });

    document.getElementById('btn-do-submit').addEventListener('click', () => this.submitAssignment(postId));
    document.getElementById('btn-cancel-submit').addEventListener('click', () => this.switchTab('assignments'));
  },

  async submitAssignment(postId) {
    const text = document.getElementById('submit-text').value.trim();
    const url = document.getElementById('submit-url').value.trim();
    const fileInput = document.getElementById('submit-files');
    const rawFiles = fileInput ? [...fileInput.files].slice(0, 5) : [];

    if (!text && !url && rawFiles.length === 0) {
      this.toast('กรุณากรอกคำตอบ แนบรูป หรือแนบลิงก์', 'danger');
      return;
    }

    const btn = document.getElementById('btn-do-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังส่ง...';

    // Compress images
    let files = [];
    if (rawFiles.length > 0) {
      const progressEl = document.getElementById('upload-progress');
      const barEl = document.getElementById('upload-bar');
      const statusEl = document.getElementById('upload-status');
      progressEl.classList.remove('d-none');

      for (let i = 0; i < rawFiles.length; i++) {
        statusEl.textContent = `บีบอัดรูปที่ ${i + 1}/${rawFiles.length}...`;
        barEl.style.width = `${Math.round((i / rawFiles.length) * 50)}%`;
        const compressed = await this.compressImage(rawFiles[i]);
        files.push(compressed);
      }
      statusEl.textContent = 'กำลังอัปโหลดไปยัง Google Drive...';
      barEl.style.width = '60%';
    }

    const res = await API.post(`/api/student/submit/${encodeURIComponent(postId)}`, {
      text, url: url || null, files: files.length > 0 ? files : undefined
    });

    if (res.success) {
      this.toast('ส่งงานเรียบร้อย');
      this.switchTab('assignments');
    } else {
      this.toast(res.error || 'ส่งงานไม่สำเร็จ', 'danger');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-1"></i>ส่ง';
    }
  },

  // ==================== QUIZZES ====================
  async renderQuizzes(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/quizzes');

    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `
        <h5 class="fw-bold mb-3"><i class="bi bi-pencil-square me-2"></i>แบบทดสอบ</h5>
        <div class="empty-state"><i class="bi bi-pencil-square d-block"></i><p>ยังไม่มีแบบทดสอบ</p></div>`;
      return;
    }

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-pencil-square me-2"></i>แบบทดสอบ</h5>
      ${res.data.map(q => `
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="fw-bold mb-0">${DOMPurify.sanitize(q.title)}</h6>
              ${q.attempt_id
                ? `<span class="badge bg-success">${q.my_score}/${q.total_score} คะแนน</span>`
                : '<span class="badge bg-warning text-dark">ยังไม่ทำ</span>'}
            </div>
            <small class="text-muted d-block">${DOMPurify.sanitize(q.subject_name || '')}</small>
            ${q.time_limit_minutes ? `<small class="text-muted"><i class="bi bi-clock me-1"></i>${q.time_limit_minutes} นาที</small>` : ''}
            ${q.max_attempts ? `<small class="text-muted ms-2"><i class="bi bi-arrow-repeat me-1"></i>ครั้งที่ ${q.attempt_count || 0}/${q.max_attempts}</small>` : ''}
            ${q.can_attempt ? `
              <div class="mt-2">
                <button class="btn btn-sm btn-danger btn-start-quiz" data-test-id="${escAttr(q.test_id)}">
                  <i class="bi bi-play-fill me-1"></i>${q.attempt_id ? 'ทำอีกครั้ง' : 'เริ่มทำ'}
                </button>
              </div>` : ''}
          </div>
        </div>`).join('')}`;

    // Bind quiz start buttons via addEventListener
    container.querySelectorAll('.btn-start-quiz').forEach(btn => {
      btn.addEventListener('click', () => this.startQuiz(btn.dataset.testId));
    });
  },

  async startQuiz(testId) {
    const container = document.getElementById('student-content');
    container.innerHTML = '<div class="loading"></div>';
    this._submitting = false;

    const res = await API.get(`/api/student/quiz/${encodeURIComponent(testId)}`);
    if (!res.success) {
      this.toast(res.error || 'ไม่สามารถโหลดแบบทดสอบ', 'danger');
      this.switchTab('quizzes');
      return;
    }

    const { test, questions } = res.data;
    const startedAt = new Date().toISOString();
    let timeLeft = test.time_limit_minutes ? test.time_limit_minutes * 60 : null;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="fw-bold mb-0"><i class="bi bi-pencil-square me-2"></i>${DOMPurify.sanitize(test.title)}</h5>
        ${timeLeft ? `<span id="quiz-timer" class="badge bg-danger fs-6"></span>` : ''}
      </div>
      <form id="quiz-form">
        ${questions.map((q, i) => {
          let opts = [];
          try { opts = JSON.parse(q.choices || '[]'); } catch(e) {}
          const qId = escAttr(q.id);
          let matchData = null;
          try { matchData = q.matching_pairs ? JSON.parse(q.matching_pairs) : null; } catch(e) {}
          let shuffledItems = [];
          try { shuffledItems = q.shuffled_items ? JSON.parse(q.shuffled_items) : []; } catch(e) {}
          return `
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-body">
                <p class="fw-bold mb-2">ข้อ ${i + 1}. ${DOMPurify.sanitize(q.question_text)} <small class="text-muted">(${q.score} คะแนน)</small></p>
                ${q.media_url ? `<img src="${escAttr(q.media_url)}" class="img-fluid mb-2 rounded" style="max-height:200px" alt="media">` : ''}
                ${q.question_type === 'multiple_choice' ? opts.map((o, oi) => {
                  const optVal = escAttr(String(o));
                  return `
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="q_${qId}" value="${optVal}" id="q_${qId}_${oi}">
                    <label class="form-check-label" for="q_${qId}_${oi}">${DOMPurify.sanitize(String(o))}</label>
                  </div>`;
                }).join('') : ''}
                ${q.question_type === 'multiple_select' ? opts.map((o, oi) => {
                  const optVal = escAttr(String(o));
                  return `
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="q_${qId}" value="${optVal}" id="q_${qId}_${oi}">
                    <label class="form-check-label" for="q_${qId}_${oi}">${DOMPurify.sanitize(String(o))}</label>
                  </div>`;
                }).join('') : ''}
                ${q.question_type === 'true_false' ? `
                  <div class="form-check"><input class="form-check-input" type="radio" name="q_${qId}" value="true" id="q_${qId}_t"><label class="form-check-label" for="q_${qId}_t">ถูก</label></div>
                  <div class="form-check"><input class="form-check-input" type="radio" name="q_${qId}" value="false" id="q_${qId}_f"><label class="form-check-label" for="q_${qId}_f">ผิด</label></div>` : ''}
                ${q.question_type === 'short_answer' ? `
                  <input class="form-control" name="q_${qId}" placeholder="พิมพ์คำตอบ...">` : ''}
                ${q.question_type === 'essay' ? `
                  <textarea class="form-control" name="q_${qId}" rows="4" placeholder="พิมพ์คำตอบ..."></textarea>` : ''}
                ${q.question_type === 'fill_blank' ? `
                  <div class="fill-blank-inputs" data-qid="${qId}">
                    ${(q.question_text.match(/___/g) || ['___']).map((_, bi) => `
                      <div class="input-group input-group-sm mb-1">
                        <span class="input-group-text">ช่องที่ ${bi + 1}</span>
                        <input class="form-control fill-blank-input" data-qid="${qId}" data-idx="${bi}" placeholder="เติมคำตอบ...">
                      </div>`).join('')}
                  </div>` : ''}
                ${q.question_type === 'matching' && matchData ? `
                  <div class="matching-area" data-qid="${qId}">
                    ${matchData.lefts.map((left, mi) => `
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="badge bg-primary">${DOMPurify.sanitize(left)}</span>
                        <i class="bi bi-arrow-right"></i>
                        <select class="form-select form-select-sm matching-select" data-qid="${qId}" data-left="${escAttr(left)}" style="max-width:200px">
                          <option value="">-- เลือก --</option>
                          ${matchData.rights.map(r => `<option value="${escAttr(r)}">${DOMPurify.sanitize(r)}</option>`).join('')}
                        </select>
                      </div>`).join('')}
                  </div>` : ''}
                ${q.question_type === 'ordering' && shuffledItems.length ? `
                  <div class="ordering-area" data-qid="${qId}">
                    <small class="text-muted mb-1 d-block">ลากเพื่อเรียงลำดับ หรือใช้ปุ่มขึ้น/ลง</small>
                    <ol class="list-group ordering-list" data-qid="${qId}">
                      ${shuffledItems.map((item, oi) => `
                        <li class="list-group-item d-flex justify-content-between align-items-center ordering-item" data-value="${escAttr(item)}">
                          <span>${DOMPurify.sanitize(item)}</span>
                          <span>
                            <button type="button" class="btn btn-sm btn-outline-secondary order-up" data-qid="${qId}" data-idx="${oi}"><i class="bi bi-chevron-up"></i></button>
                            <button type="button" class="btn btn-sm btn-outline-secondary order-down" data-qid="${qId}" data-idx="${oi}"><i class="bi bi-chevron-down"></i></button>
                          </span>
                        </li>`).join('')}
                    </ol>
                  </div>` : ''}
                ${q.question_type === 'audio_record' ? `
                  <div class="audio-record-area" data-qid="${qId}">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-audio-record" data-qid="${qId}">
                      <i class="bi bi-mic me-1"></i>เริ่มอัดเสียง
                    </button>
                    <span class="audio-status ms-2 text-muted small" data-qid="${qId}"></span>
                    <audio class="audio-preview d-none mt-2" data-qid="${qId}" controls></audio>
                  </div>` : ''}
              </div>
            </div>`;
        }).join('')}
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-primary" id="btn-submit-quiz"><i class="bi bi-check-lg me-1"></i>ส่งคำตอบ</button>
          <button type="button" class="btn btn-outline-secondary" id="btn-cancel-quiz">ยกเลิก</button>
        </div>
      </form>`;

    // Bind buttons via addEventListener
    document.getElementById('btn-submit-quiz').addEventListener('click', () => {
      this.submitQuiz(test.id, test.post_id, startedAt);
    });
    document.getElementById('btn-cancel-quiz').addEventListener('click', () => {
      this.switchTab('quizzes');
    });

    // Bind ordering up/down buttons
    document.querySelectorAll('.order-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = document.querySelector(`.ordering-list[data-qid="${btn.dataset.qid}"]`);
        const items = [...list.children];
        const idx = items.indexOf(btn.closest('.ordering-item'));
        if (idx > 0) list.insertBefore(items[idx], items[idx - 1]);
      });
    });
    document.querySelectorAll('.order-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = document.querySelector(`.ordering-list[data-qid="${btn.dataset.qid}"]`);
        const items = [...list.children];
        const idx = items.indexOf(btn.closest('.ordering-item'));
        if (idx < items.length - 1) list.insertBefore(items[idx + 1], items[idx]);
      });
    });

    // Bind audio record buttons
    this._audioBlobs = {};
    document.querySelectorAll('.btn-audio-record').forEach(btn => {
      btn.addEventListener('click', () => this._toggleAudioRecord(btn.dataset.qid));
    });

    // Timer
    if (timeLeft) {
      const timerEl = document.getElementById('quiz-timer');
      const updateTimer = () => {
        if (timeLeft <= 0) {
          clearInterval(this.quizTimer);
          this.quizTimer = null;
          this.submitQuiz(test.id, test.post_id, startedAt);
          return;
        }
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
        if (timeLeft <= 60) timerEl.classList.add('bg-danger', 'animate__animated', 'animate__pulse');
        timeLeft--;
      };
      updateTimer();
      this.quizTimer = setInterval(updateTimer, 1000);
    }
  },

  async submitQuiz(testId, postId, startedAt) {
    // Guard against double submission (timer + manual click race condition)
    if (this._submitting) return;
    this._submitting = true;

    if (this.quizTimer) { clearInterval(this.quizTimer); this.quizTimer = null; }

    const form = document.getElementById('quiz-form');
    if (!form) { this._submitting = false; return; }
    const formData = new FormData(form);
    const answers = {};

    // Standard radio/text answers
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('q_')) {
        const qId = key.substring(2);
        // For multiple_select (checkboxes), collect all checked values
        if (answers[qId]) {
          if (!Array.isArray(answers[qId])) answers[qId] = [answers[qId]];
          answers[qId].push(value);
        } else {
          answers[qId] = value;
        }
      }
    }

    // Matching answers (select dropdowns)
    document.querySelectorAll('.matching-select').forEach(sel => {
      const qId = sel.dataset.qid;
      if (!answers[qId]) answers[qId] = {};
      if (sel.value) answers[qId][sel.dataset.left] = sel.value;
    });

    // Ordering answers (list order)
    document.querySelectorAll('.ordering-list').forEach(list => {
      const qId = list.dataset.qid;
      answers[qId] = [...list.children].map(li => li.dataset.value);
    });

    // Fill-in-the-blank answers
    document.querySelectorAll('.fill-blank-inputs').forEach(container => {
      const qId = container.dataset.qid;
      const inputs = container.querySelectorAll('.fill-blank-input');
      if (inputs.length === 1) {
        answers[qId] = inputs[0].value;
      } else {
        answers[qId] = [...inputs].map(inp => inp.value);
      }
    });

    // Audio answers — store as "recorded" flag (actual audio handled separately)
    if (this._audioBlobs) {
      for (const [qId, blob] of Object.entries(this._audioBlobs)) {
        answers[qId] = '__audio_recorded__';
      }
    }

    const timeSpent = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
    const res = await API.post(`/api/student/quiz/${encodeURIComponent(testId)}/submit`, {
      answers, started_at: startedAt, time_spent: timeSpent
    });

    if (res.success) {
      const d = res.data;
      const container = document.getElementById('student-content');
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-check-circle text-success" style="font-size:4rem"></i>
          <h4 class="fw-bold mt-3">ส่งคำตอบเรียบร้อย!</h4>
          ${d.auto_graded ? `<p class="fs-5">คะแนน: <strong>${d.total_score}/${d.max_score}</strong></p>` : '<p class="text-muted">รอครูตรวจให้คะแนน</p>'}
          <button class="btn btn-primary mt-3" id="btn-back-quizzes"><i class="bi bi-arrow-left me-1"></i>กลับ</button>
        </div>`;
      document.getElementById('btn-back-quizzes').addEventListener('click', () => this.switchTab('quizzes'));
    } else {
      this.toast(res.error || 'ส่งคำตอบไม่สำเร็จ', 'danger');
      this._submitting = false;
    }
  },

  // ==================== GRADES ====================
  async renderGrades(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/grades');

    if (!res.success) {
      container.innerHTML = `<h5 class="fw-bold mb-3"><i class="bi bi-graph-up me-2"></i>คะแนนของฉัน</h5>
        <div class="empty-state"><i class="bi bi-graph-up d-block"></i><p>ยังไม่มีคะแนน</p></div>`;
      return;
    }

    const { grades, scores } = res.data;
    const hasGrades = grades && grades.length > 0;
    const hasScores = scores && scores.length > 0;

    if (!hasGrades && !hasScores) {
      container.innerHTML = `<h5 class="fw-bold mb-3"><i class="bi bi-graph-up me-2"></i>คะแนนของฉัน</h5>
        <div class="empty-state"><i class="bi bi-graph-up d-block"></i><p>ยังไม่มีคะแนน</p></div>`;
      return;
    }

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-graph-up me-2"></i>คะแนนของฉัน</h5>
      ${hasGrades ? `
        <h6 class="fw-bold mb-2">เกรด</h6>
        <div class="card border-0 shadow-sm mb-3"><div class="card-body p-0">
          <div class="table-responsive"><table class="table table-hover mb-0">
            <thead class="table-light"><tr><th>วิชา</th><th>คะแนนรวม</th><th>เกรด</th></tr></thead>
            <tbody>${grades.map(g => `
              <tr>
                <td>${DOMPurify.sanitize(g.subject_name || g.subject_code || '')}</td>
                <td>${g.total_score ?? '-'}</td>
                <td><span class="badge bg-primary fs-6">${escAttr(g.grade || '-')}</span></td>
              </tr>`).join('')}
            </tbody></table></div></div></div>` : ''}
      ${hasScores ? `
        <h6 class="fw-bold mb-2">คะแนนย่อย</h6>
        <div class="card border-0 shadow-sm"><div class="card-body p-0">
          <div class="table-responsive"><table class="table table-hover mb-0">
            <thead class="table-light"><tr><th>วิชา</th><th>รายการ</th><th>คะแนน</th></tr></thead>
            <tbody>${scores.map(s => `
              <tr>
                <td>${DOMPurify.sanitize(s.subject_name || '')}</td>
                <td>${DOMPurify.sanitize(s.score_label || '')}</td>
                <td>${s.score ?? '-'}${s.max_score ? '/' + s.max_score : ''}</td>
              </tr>`).join('')}
            </tbody></table></div></div></div>` : ''}`;
  },

  // ==================== NOTIFICATIONS ====================
  async renderNotifications(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/notifications');

    if (!res.success || !res.data || res.data.length === 0) {
      container.innerHTML = `<h5 class="fw-bold mb-3"><i class="bi bi-bell me-2"></i>แจ้งเตือน</h5>
        <div class="empty-state"><i class="bi bi-bell d-block"></i><p>ไม่มีแจ้งเตือน</p></div>`;
      return;
    }

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-bell me-2"></i>แจ้งเตือน</h5>
      ${res.data.map(n => `
        <div class="card border-0 shadow-sm mb-2 notif-card ${n.is_read ? '' : 'border-start border-primary border-3'}" data-notif-id="${escAttr(n.id)}">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between">
              <strong class="small">${DOMPurify.sanitize(n.title)}</strong>
              <small class="text-muted">${new Date(n.created_at).toLocaleDateString('th-TH')}</small>
            </div>
            <p class="text-muted small mb-0">${DOMPurify.sanitize(n.message || '')}</p>
          </div>
        </div>`).join('')}`;

    // Bind notification click via addEventListener
    container.querySelectorAll('.notif-card').forEach(card => {
      card.addEventListener('click', () => {
        this.markNotifRead(card.dataset.notifId, card);
      });
    });
  },

  async markNotifRead(notifId, el) {
    if (!notifId) return;
    await API.put(`/api/student/notifications/${encodeURIComponent(notifId)}`);
    el.classList.remove('border-start', 'border-primary', 'border-3');
    this.loadNotificationBadge();
  },

  // ==================== PROFILE ====================
  async renderProfile(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/profile');
    const p = res.success ? res.data : {};

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-person me-2"></i>โปรไฟล์</h5>
      ${!res.success ? '<div class="alert alert-danger">ไม่สามารถโหลดโปรไฟล์ได้</div>' : ''}
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body text-center">
          <i class="bi bi-person-circle fs-1 text-muted d-block mb-3"></i>
          <h5 class="fw-bold">${DOMPurify.sanitize((p.prefix || '') + (p.first_name || '') + ' ' + (p.last_name || ''))}</h5>
          <p class="text-muted mb-1">${DOMPurify.sanitize(p.nickname ? 'ชื่อเล่น: ' + p.nickname : '')}</p>
          <p class="text-muted mb-0">รหัสนักเรียน: ${DOMPurify.sanitize(p.student_code || p.username || '')}</p>
        </div>
      </div>
      ${p.classrooms && p.classrooms.length ? `
        <h6 class="fw-bold mb-2">ห้องเรียนของฉัน</h6>
        ${p.classrooms.map(c => `
          <div class="card border-0 shadow-sm mb-2">
            <div class="card-body py-2">
              <strong>${DOMPurify.sanitize(c.classroom_name)}</strong>
              <small class="text-muted d-block">ปีการศึกษา ${escAttr(c.academic_year)} ภาคเรียนที่ ${escAttr(c.semester)}</small>
            </div>
          </div>`).join('')}` : ''}
      <div class="mt-3">
        <button class="btn btn-outline-danger btn-sm" id="profile-logout-btn">
          <i class="bi bi-box-arrow-right me-1"></i>ออกจากระบบ
        </button>
      </div>`;

    document.getElementById('profile-logout-btn').addEventListener('click', () => {
      API.setToken(null);
      this.showLogin();
    });
  },

  async _toggleAudioRecord(qId) {
    const btn = document.querySelector(`.btn-audio-record[data-qid="${qId}"]`);
    const statusEl = document.querySelector(`.audio-status[data-qid="${qId}"]`);
    const previewEl = document.querySelector(`.audio-preview[data-qid="${qId}"]`);

    if (this._audioRecorder && this._audioRecorderQid === qId) {
      // Stop recording
      this._audioRecorder.stop();
      btn.innerHTML = '<i class="bi bi-mic me-1"></i>อัดใหม่';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-outline-danger');
      statusEl.textContent = 'อัดเสร็จแล้ว';
      this._audioRecorder = null;
      this._audioRecorderQid = null;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!this._audioBlobs) this._audioBlobs = {};
        this._audioBlobs[qId] = blob;
        previewEl.src = URL.createObjectURL(blob);
        previewEl.classList.remove('d-none');
      };
      recorder.start();
      this._audioRecorder = recorder;
      this._audioRecorderQid = qId;
      btn.innerHTML = '<i class="bi bi-stop-fill me-1"></i>หยุดอัด';
      btn.classList.remove('btn-outline-danger');
      btn.classList.add('btn-danger');
      statusEl.textContent = 'กำลังอัดเสียง...';
    } catch (e) {
      statusEl.textContent = 'ไม่สามารถเข้าถึงไมโครโฟน';
    }
  },

  // ==================== LIVE QUIZ ====================
  async renderLive(container) {
    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-broadcast me-2 text-danger"></i>Live Quiz</h5>
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body text-center py-4">
          <p class="text-muted mb-2">ใส่รหัสที่ครูแจ้ง</p>
          <div class="d-flex justify-content-center gap-2">
            <input class="form-control text-center fs-3 fw-bold" id="live-code" maxlength="6" style="max-width:200px;letter-spacing:8px" placeholder="______">
            <button class="btn btn-lg btn-danger" id="live-join"><i class="bi bi-play-fill me-1"></i>เข้าร่วม</button>
          </div>
        </div>
      </div>
      <div id="live-area"></div>`;
    document.getElementById('live-join').addEventListener('click', () => this.joinLive());
  },

  async joinLive() {
    const code = document.getElementById('live-code')?.value?.trim();
    if (!code || code.length < 4) { this.toast('กรุณาใส่รหัส', 'danger'); return; }
    const res = await API.post('/api/student/live/join', { session_code: code });
    if (!res.success) { this.toast(res.error || 'เข้าร่วมไม่สำเร็จ', 'danger'); return; }
    this._liveSessionId = res.data.session_id;
    this._liveLastQ = 0;
    this.pollLive();
  },

  async pollLive() {
    if (!this._liveSessionId) return;
    const res = await API.get(`/api/student/live/${encodeURIComponent(this._liveSessionId)}`);
    if (!res.success) { this.toast('โหลดไม่สำเร็จ', 'danger'); return; }
    const { status, current_question, question, total_questions, leaderboard } = res.data;
    const area = document.getElementById('live-area') || document.getElementById('student-content');

    if (status === 'waiting') {
      area.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary mb-3"></div>
        <h5>รอครูเริ่ม...</h5>
        <p class="text-muted">เข้าร่วมแล้ว กรุณารอ</p>
      </div>`;
      setTimeout(() => this.pollLive(), 2000);
      return;
    }

    if (status === 'finished') {
      area.innerHTML = `<div class="text-center py-4">
        <h3 class="fw-bold">🏆 จบแล้ว!</h3>
        ${leaderboard && leaderboard.length ? `
        <div class="table-responsive mt-3"><table class="table table-sm">
          <thead><tr><th>#</th><th>ชื่อ</th><th>คะแนน</th></tr></thead>
          <tbody>${leaderboard.map((p,i) => `<tr class="${i<3?'table-warning':''}">
            <td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
            <td>${DOMPurify.sanitize(p.first_name)} ${DOMPurify.sanitize(p.last_name)}</td>
            <td class="fw-bold">${p.total_score}</td>
          </tr>`).join('')}</tbody>
        </table></div>` : ''}
      </div>`;
      return;
    }

    // Active question
    if (question && current_question > this._liveLastQ) {
      this._liveLastQ = current_question;
      this._liveAnswered = false;
      this._liveQStartTime = Date.now();
    }

    if (!question) {
      area.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">รอข้อถัดไป...</p></div>`;
      setTimeout(() => this.pollLive(), 1500);
      return;
    }

    if (this._liveAnswered) {
      area.innerHTML = `<div class="text-center py-4">
        <i class="bi bi-check-circle text-success" style="font-size:3rem"></i>
        <h5 class="mt-2">ส่งแล้ว! รอข้อถัดไป...</h5>
        <p class="text-muted">ข้อ ${current_question}/${total_questions}</p>
      </div>`;
      setTimeout(() => this.pollLive(), 2000);
      return;
    }

    let opts = [];
    try { opts = JSON.parse(question.choices || '[]'); } catch(e){}
    const colors = ['primary','success','warning','danger','info','secondary'];

    area.innerHTML = `
      <div class="card border-0 shadow mb-3">
        <div class="card-body text-center">
          <div class="d-flex justify-content-between mb-2">
            <span class="badge bg-primary">ข้อ ${current_question}/${total_questions}</span>
            <span class="badge bg-secondary">${question.score} คะแนน</span>
          </div>
          <h5 class="mb-3">${DOMPurify.sanitize(question.question_text)}</h5>
          ${question.question_type === 'multiple_choice' || question.question_type === 'dropdown' ? `
          <div class="d-grid gap-2">
            ${opts.map((o,i) => `<button class="btn btn-lg btn-outline-${colors[i%colors.length]} live-ans-btn" data-answer="${escAttr(String(o))}">${DOMPurify.sanitize(String(o))}</button>`).join('')}
          </div>` : ''}
          ${question.question_type === 'true_false' ? `
          <div class="d-grid gap-2">
            <button class="btn btn-lg btn-outline-success live-ans-btn" data-answer="true"><i class="bi bi-check-lg me-2"></i>ถูก</button>
            <button class="btn btn-lg btn-outline-danger live-ans-btn" data-answer="false"><i class="bi bi-x-lg me-2"></i>ผิด</button>
          </div>` : ''}
          ${['short_answer','fill_blank'].includes(question.question_type) ? `
          <div class="d-flex gap-2 mt-2">
            <input class="form-control fs-5 text-center" id="live-text-ans" placeholder="พิมพ์คำตอบ">
            <button class="btn btn-primary" id="live-text-submit"><i class="bi bi-send"></i></button>
          </div>` : ''}
        </div>
      </div>`;

    area.querySelectorAll('.live-ans-btn').forEach(btn => {
      btn.addEventListener('click', () => this.submitLiveAnswer(question.id, btn.dataset.answer));
    });
    document.getElementById('live-text-submit')?.addEventListener('click', () => {
      const val = document.getElementById('live-text-ans')?.value;
      if (val) this.submitLiveAnswer(question.id, val);
    });
  },

  async submitLiveAnswer(questionId, answer) {
    if (this._liveAnswered) return;
    this._liveAnswered = true;
    const timeMs = Date.now() - (this._liveQStartTime || Date.now());
    const res = await API.post(`/api/student/live/${encodeURIComponent(this._liveSessionId)}/answer`, {
      question_id: questionId, answer, time_ms: timeMs
    });
    if (res.success) {
      const d = res.data;
      const area = document.getElementById('live-area') || document.getElementById('student-content');
      area.innerHTML = `<div class="text-center py-4">
        ${d.is_correct ? '<i class="bi bi-check-circle text-success" style="font-size:4rem"></i><h4 class="text-success mt-2">ถูกต้อง!</h4>'
          : '<i class="bi bi-x-circle text-danger" style="font-size:4rem"></i><h4 class="text-danger mt-2">ผิด</h4>'}
        <p class="fs-5">+${d.score_earned} คะแนน &nbsp; +${d.xp_earned} XP</p>
        ${d.streak > 1 ? `<p class="text-warning fw-bold">🔥 Streak x${d.streak}!</p>` : ''}
      </div>`;
      setTimeout(() => this.pollLive(), 2500);
    } else {
      this.toast(res.error || 'ส่งไม่สำเร็จ', 'danger');
      this._liveAnswered = false;
    }
  },

  // ==================== XP / GAMIFICATION ====================
  async renderXP(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/xp');
    if (!res.success) { container.innerHTML = '<div class="text-center text-muted py-4">ไม่สามารถโหลดข้อมูล XP</div>'; return; }
    const { total_xp, level, streak, badges, league } = res.data;
    const xpInLevel = total_xp % 100;
    const xpNeeded = 100;
    const progressPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

    const leagueColors = { bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700' };
    const leagueNames = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-trophy me-2 text-warning"></i>XP & ความสำเร็จ</h5>
      <!-- XP Card -->
      <div class="card border-0 shadow-sm mb-3" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff">
        <div class="card-body text-center py-4">
          <h1 class="display-3 fw-bold mb-0">${total_xp || 0}</h1>
          <p class="mb-2">XP</p>
          <div class="d-flex align-items-center justify-content-center gap-3 mb-2">
            <span class="badge bg-light text-dark fs-6">Lv.${level || 1}</span>
            ${league ? `<span class="badge fs-6" style="background:${leagueColors[league]||'#888'}">${leagueNames[league]||league} League</span>` : ''}
          </div>
          <div class="progress" style="height:12px;background:rgba(255,255,255,0.3)">
            <div class="progress-bar bg-warning" style="width:${progressPct}%"></div>
          </div>
          <small class="opacity-75">${xpInLevel}/${xpNeeded} XP ถึงเลเวลถัดไป</small>
        </div>
      </div>
      <!-- Streak -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <h6 class="fw-bold mb-0">🔥 Streak</h6>
            <small class="text-muted">เข้าใช้งานต่อเนื่อง</small>
          </div>
          <div class="text-center">
            <span class="display-6 fw-bold text-warning">${streak?.current_streak || 0}</span>
            <small class="d-block text-muted">วัน</small>
          </div>
        </div>
        ${streak?.current_streak >= 7 ? `<div class="card-footer bg-warning bg-opacity-10 text-center small text-warning">🏆 ต่อเนื่อง ${streak.current_streak} วัน!</div>` : ''}
      </div>
      <!-- Badges -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-award me-2"></i>เหรียญตรา (${badges?.length || 0})</div>
        <div class="card-body">
          ${badges && badges.length > 0 ? `
          <div class="d-flex flex-wrap gap-2">
            ${badges.map(b => `
            <div class="text-center" style="width:80px">
              <div class="badge-icon rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1" style="width:50px;height:50px;background:linear-gradient(135deg,#ffd700,#ff8c00);font-size:1.5rem">
                ${b.icon || '🏅'}
              </div>
              <small class="d-block text-truncate">${DOMPurify.sanitize(b.name || b.badge_type || '')}</small>
            </div>`).join('')}
          </div>` : '<p class="text-muted text-center mb-0">ยังไม่มีเหรียญตรา — ทำกิจกรรมเพื่อสะสม!</p>'}
        </div>
      </div>`;
  },

  toast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} shadow-sm py-2 px-3 mb-2`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  }
};

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
  // Student login form
  document.getElementById('student-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = document.getElementById('student-login-alert');
    alert.classList.add('d-none');

    const res = await API.post('/api/auth/login', {
      username: document.getElementById('sl-code').value.trim(),
      password: document.getElementById('sl-password').value
    });

    if (res.success) {
      API.setToken(res.data.token);
      StudentApp.showApp(res.data);
    } else {
      alert.textContent = res.error || 'เข้าสู่ระบบไม่สำเร็จ';
      alert.classList.remove('d-none');
    }
  });

  // Student register form
  document.getElementById('student-register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = document.getElementById('student-login-alert');
    alert.classList.add('d-none');

    const password = document.getElementById('sr-password').value;
    const confirm = document.getElementById('sr-confirm').value;
    if (password !== confirm) {
      alert.className = 'alert alert-danger';
      alert.textContent = 'รหัสผ่านไม่ตรงกัน';
      alert.classList.remove('d-none');
      return;
    }

    const res = await API.post('/api/auth/register-student', {
      student_code: document.getElementById('sr-code').value.trim(),
      prefix: document.getElementById('sr-prefix').value,
      first_name: document.getElementById('sr-fname').value.trim(),
      last_name: document.getElementById('sr-lname').value.trim(),
      nickname: document.getElementById('sr-nickname').value.trim(),
      gender: document.getElementById('sr-gender').value,
      birth_date: document.getElementById('sr-birthdate').value,
      phone: document.getElementById('sr-phone').value.trim(),
      password
    });

    if (res.success) {
      API.setToken(res.data.token);
      StudentApp.showApp(res.data);
    } else {
      alert.className = 'alert alert-danger';
      alert.textContent = res.error || 'สมัครสมาชิกไม่สำเร็จ';
      alert.classList.remove('d-none');
    }
  });

  // Tab navigation
  document.querySelectorAll('.student-tab').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      StudentApp.switchTab(el.dataset.tab);
    });
  });

  // Profile from dropdown
  document.querySelectorAll('[data-tab="profile"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      StudentApp.switchTab('profile');
    });
  });

  // Header logout
  document.getElementById('student-logout').addEventListener('click', (e) => {
    e.preventDefault();
    API.setToken(null);
    StudentApp.showLogin();
  });

  // Notification bell
  const notifBtn = document.getElementById('student-notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => StudentApp.switchTab('notifications'));
  }

  StudentApp.init();
});