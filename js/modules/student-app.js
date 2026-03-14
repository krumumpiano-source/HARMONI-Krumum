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
            <label class="form-label">ลิงก์ (ถ้ามี)</label>
            <input id="submit-url" type="url" class="form-control" placeholder="https://...">
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary" id="btn-do-submit"><i class="bi bi-send me-1"></i>ส่ง</button>
            <button class="btn btn-outline-secondary" id="btn-cancel-submit">ยกเลิก</button>
          </div>
        </div>
      </div>`;

    document.getElementById('btn-do-submit').addEventListener('click', () => this.submitAssignment(postId));
    document.getElementById('btn-cancel-submit').addEventListener('click', () => this.switchTab('assignments'));
  },

  async submitAssignment(postId) {
    const text = document.getElementById('submit-text').value.trim();
    const url = document.getElementById('submit-url').value.trim();
    if (!text && !url) { this.toast('กรุณากรอกคำตอบหรือแนบลิงก์', 'danger'); return; }

    const res = await API.post(`/api/student/submit/${encodeURIComponent(postId)}`, { text, url: url || null });
    if (res.success) {
      this.toast('ส่งงานเรียบร้อย');
      this.switchTab('assignments');
    } else {
      this.toast(res.error || 'ส่งงานไม่สำเร็จ', 'danger');
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