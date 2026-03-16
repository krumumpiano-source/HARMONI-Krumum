// HARMONI — Main Teacher App (Router + Auth + Module Loader)

const App = {
  currentModule: null,
  modules: {},

  async init() {
    // Check if already logged in
    if (API.token) {
      const res = await API.get('/api/auth/me');
      if (res.success) {
        this.showApp(res.data);
        return;
      }
    }
    this.showLogin();

    // Check if first time (no users) — show setup prompt
    this.checkFirstTime();
  },

  async checkFirstTime() {
    // Try a dummy setup POST with empty body to see if system has users
    // If it returns 403 "ระบบถูกตั้งค่าแล้ว" then users exist — normal login
    // Otherwise show first-time setup CTA
    const res = await API.post('/api/setup', {});
    if (res.error && res.error.includes('ระบบถูกตั้งค่าแล้ว')) {
      // Normal — users exist, just login
      return;
    }
    // No users yet — show first-time setup guidance
    const alert = document.getElementById('login-alert');
    alert.className = 'alert alert-info';
    alert.innerHTML = '<i class="bi bi-info-circle me-2"></i>ยินดีต้อนรับ! กรอกชื่อผู้ใช้และรหัสผ่านเพื่อสร้างบัญชีครูคนแรก';
    alert.classList.remove('d-none');

    // Override login form to call setup instead
    this._isFirstTime = true;
  },

  showLogin() {
    document.getElementById('login-page').classList.remove('d-none');
    document.getElementById('app').classList.add('d-none');
    API.setToken(null);
  },

  showApp(user) {
    document.getElementById('login-page').classList.add('d-none');
    document.getElementById('app').classList.remove('d-none');
    document.getElementById('nav-username').textContent = user.display_name || 'ครู';

    // Show admin sidebar if admin
    this.isAdmin = user.is_admin === 1 || user.isAdmin === true;
    if (this.isAdmin) {
      document.getElementById('sidebar-admin').classList.remove('d-none');
      this.loadPendingBadge();
    }

    // Load active semester display
    this.loadSemesterLabel();

    // Check first-time setup
    this.checkSetup();

    // Navigate to dashboard
    this.navigate('dashboard');

    // Load notification badge
    this.loadNotifBadge();
  },

  async loadNotifBadge() {
    const res = await API.get('/api/notifications?unread=1');
    const badge = document.getElementById('notif-badge');
    if (badge && res.success) {
      const count = res.data.length;
      badge.textContent = count;
      badge.classList.toggle('d-none', !count);
    }
  },

  async loadPendingBadge() {
    const res = await API.get('/api/admin/pending-teachers');
    if (res.success) {
      const badge = document.getElementById('pending-badge');
      if (res.data.length > 0) {
        badge.textContent = res.data.length;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }
  },

  async loadSemesterLabel() {
    const res = await API.get('/api/semesters');
    if (res.success) {
      const active = res.data.find(s => s.is_active);
      if (active) {
        document.getElementById('nav-semester').textContent =
          `ปี ${active.academic_year} ภาค ${active.semester}`;
      }
    }
  },

  async checkSetup() {
    const res = await API.get('/api/settings');
    if (res.success && !res.data.school_name) {
      // First time — show setup wizard
      const modal = new bootstrap.Modal(document.getElementById('modal-setup'));
      modal.show();
    }
  },

  navigate(moduleName, params) {
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(el => {
      el.classList.toggle('active', el.dataset.module === moduleName);
    });

    this.currentModule = moduleName;
    this.currentParams = params || null;
    const area = document.getElementById('content-area');

    // Load module
    if (this.modules[moduleName]) {
      this.modules[moduleName].render(area, params);
    } else {
      area.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-bold mb-0">${this.getModuleTitle(moduleName)}</h4>
        </div>
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="empty-state">
              <i class="bi bi-tools d-block"></i>
              <p>โมดูลนี้กำลังพัฒนา</p>
              <small class="text-muted">จะเปิดให้ใช้งานเร็วๆ นี้</small>
            </div>
          </div>
        </div>`;
    }

    // Close sidebar on mobile
    if (window.innerWidth < 992) {
      document.getElementById('sidebar').classList.remove('show');
      document.getElementById('sidebar-overlay').classList.remove('show');
    }
  },

  getModuleTitle(name) {
    const titles = {
      'dashboard': 'แดชบอร์ด',
      'settings': 'ตั้งค่าเริ่มต้น',
      'admin': 'จัดการครู',
      'schedule': 'ตารางสอน/คิวงาน',
      'course-structure': 'โครงสร้างรายวิชา',
      'lesson-plan': 'แผนการจัดการเรียนรู้',
      'post-lesson': 'บันทึกหลังสอน',
      'classroom-materials': 'สื่อการสอน',
      'assessment': 'เครื่องมือวัดผล',
      'test': 'แบบทดสอบ',
      'scores': 'คะแนน',
      'grade-result': 'ผลการเรียน/เกรด',
      'student-classroom': 'สั่งงาน/ตรวจงาน',
      'research': 'วิจัยในชั้นเรียน',
      'pa': 'PA (วPA)',
      'sar': 'SAR',
      'innovation': 'นวัตกรรม',
      'plc': 'PLC',
      'logbook': 'สมุดบันทึก',
      'portfolio': 'เก็บผลงาน',
      'awards': 'เกียรติบัตร/รางวัล',
      'attendance': 'เช็คชื่อ',
      'homeroom': 'ครูที่ปรึกษา',
      'home-visit': 'เยี่ยมบ้าน',
      'sdq': 'SDQ',
      'care-record': 'บันทึกการดูแล',
      'early-warning': 'เตือนภัยล่วงหน้า',
      'evidence-pool': 'คลังหลักฐาน',
      'notifications': 'แจ้งเตือน',
      'calendar': 'ปฏิทิน',
      'documents': 'เอกสาร',
      'cover-designer': 'ออกแบบปก',
      'instruments': 'เครื่องดนตรี',
      'quick-drop': 'Quick Drop',
      'classroom-live': 'ห้องเรียน'
    };
    return titles[name] || name;
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
    toast.style.cssText = 'min-width:200px;animation:fadeIn 0.2s';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const alert = document.getElementById('login-alert');
    btn.disabled = true;
    alert.classList.add('d-none');

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    // First-time setup or normal login
    const endpoint = App._isFirstTime ? '/api/setup' : '/api/auth/login';
    const body = App._isFirstTime
      ? { username, password, display_name: username }
      : { username, password };

    const res = await API.post(endpoint, body);
    btn.disabled = false;

    if (res.success) {
      API.setToken(res.data.token);
      App._isFirstTime = false;
      App.showApp(res.data);
    } else {
      alert.className = 'alert alert-danger';
      alert.textContent = res.error || 'เข้าสู่ระบบไม่สำเร็จ';
      alert.classList.remove('d-none');
    }
  });

  // Teacher registration form
  document.getElementById('register-teacher-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-teacher-btn');
    const alertEl = document.getElementById('register-teacher-alert');
    btn.disabled = true;
    alertEl.classList.add('d-none');

    const username = document.getElementById('reg-teacher-username').value.trim();
    const displayName = document.getElementById('reg-teacher-displayname').value.trim();
    const password = document.getElementById('reg-teacher-password').value;
    const confirm = document.getElementById('reg-teacher-confirm').value;

    if (password !== confirm) {
      alertEl.className = 'alert alert-danger';
      alertEl.textContent = 'รหัสผ่านไม่ตรงกัน';
      alertEl.classList.remove('d-none');
      btn.disabled = false;
      return;
    }

    const res = await API.post('/api/auth/register-teacher', { username, password, display_name: displayName });
    btn.disabled = false;

    if (res.success) {
      alertEl.className = 'alert alert-success';
      alertEl.textContent = res.data.message || 'สมัครสมาชิกสำเร็จ กรุณารอแอดมินอนุมัติ';
      alertEl.classList.remove('d-none');
      document.getElementById('register-teacher-form').reset();
    } else {
      alertEl.className = 'alert alert-danger';
      alertEl.textContent = res.error || 'สมัครสมาชิกไม่สำเร็จ';
      alertEl.classList.remove('d-none');
    }
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      App.navigate(el.dataset.module);
    });
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  });

  // Sidebar overlay click to close
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebar-overlay').classList.remove('show');
  });

  // Collapsible sidebar sections
  document.querySelectorAll('.sidebar-toggle-section').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const target = document.getElementById(el.dataset.target);
      if (target) {
        target.classList.toggle('collapsed');
        const icon = el.querySelector('.toggle-icon');
        if (icon) {
          icon.className = target.classList.contains('collapsed')
            ? 'bi bi-chevron-right me-1 toggle-icon'
            : 'bi bi-chevron-down me-1 toggle-icon';
        }
      }
    });
    // Set initial icon state
    const target = document.getElementById(el.dataset.target);
    if (target && target.classList.contains('collapsed')) {
      const icon = el.querySelector('.toggle-icon');
      if (icon) icon.className = 'bi bi-chevron-right me-1 toggle-icon';
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await API.post('/api/auth/logout');
    App.showLogin();
  });

  // Change password
  document.getElementById('btn-change-password').addEventListener('click', (e) => {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById('modal-change-password')).show();
  });

  document.getElementById('cp-submit').addEventListener('click', async () => {
    const oldPw = document.getElementById('cp-old').value;
    const newPw = document.getElementById('cp-new').value;
    const confirm = document.getElementById('cp-confirm').value;
    const alert = document.getElementById('cp-alert');

    if (newPw !== confirm) {
      alert.className = 'alert alert-danger';
      alert.textContent = 'รหัสผ่านใหม่ไม่ตรงกัน';
      alert.classList.remove('d-none');
      return;
    }

    const res = await API.post('/api/auth/change-password', {
      old_password: oldPw,
      new_password: newPw
    });

    if (res.success) {
      bootstrap.Modal.getInstance(document.getElementById('modal-change-password')).hide();
      App.toast('เปลี่ยนรหัสผ่านสำเร็จ');
    } else {
      alert.className = 'alert alert-danger';
      alert.textContent = res.error;
      alert.classList.remove('d-none');
    }
  });

  // AI Panel toggle
  document.getElementById('ai-fab').addEventListener('click', () => {
    document.getElementById('ai-panel').classList.toggle('d-none');
  });

  document.getElementById('ai-panel-close').addEventListener('click', () => {
    document.getElementById('ai-panel').classList.add('d-none');
  });

  // Notification bell
  document.getElementById('btn-notifications')?.addEventListener('click', () => {
    App.navigate('notifications');
  });

  // Setup wizard
  let setupStep = 1;
  const maxStep = 4;

  document.getElementById('setup-next').addEventListener('click', async () => {
    if (setupStep < maxStep) {
      document.querySelector(`.setup-step[data-step="${setupStep}"]`).classList.add('d-none');
      setupStep++;
      document.querySelector(`.setup-step[data-step="${setupStep}"]`).classList.remove('d-none');

      document.getElementById('setup-prev').classList.toggle('d-none', setupStep === 1);
      document.getElementById('setup-next').innerHTML = setupStep === maxStep
        ? '<i class="bi bi-check-lg me-1"></i>เสร็จสิ้น'
        : 'ถัดไป <i class="bi bi-chevron-right ms-1"></i>';

      // Load dynamic content for step 3 & 4
      if (setupStep === 3) initSetupSubjects();
      if (setupStep === 4) initSetupClassrooms();
    } else {
      // Save setup
      await saveSetup();
    }
  });

  document.getElementById('setup-prev').addEventListener('click', () => {
    document.querySelector(`.setup-step[data-step="${setupStep}"]`).classList.add('d-none');
    setupStep--;
    document.querySelector(`.setup-step[data-step="${setupStep}"]`).classList.remove('d-none');
    document.getElementById('setup-prev').classList.toggle('d-none', setupStep === 1);
    document.getElementById('setup-next').innerHTML = 'ถัดไป <i class="bi bi-chevron-right ms-1"></i>';
  });

  // Init app
  App.init();
});

// ==================== Setup Wizard Helpers ====================

function initSetupSubjects() {
  const container = document.getElementById('setup-subjects-list');
  if (container.children.length > 0) return;
  addSubjectRow(container);

  document.getElementById('setup-add-subject').onclick = () => addSubjectRow(container);
}

function addSubjectRow(container) {
  const row = document.createElement('div');
  row.className = 'row g-2 mb-2 align-items-end';
  row.innerHTML = `
    <div class="col-3"><input type="text" class="form-control form-control-sm" placeholder="รหัสวิชา" data-field="code"></div>
    <div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="ชื่อวิชา" data-field="name"></div>
    <div class="col-3">
      <select class="form-select form-select-sm" data-field="type">
        <option value="required">พื้นฐาน</option>
        <option value="elective">เพิ่มเติม</option>
        <option value="activity">กิจกรรม</option>
      </select>
    </div>
    <div class="col-1"><button class="btn btn-outline-danger btn-sm" onclick="this.closest('.row').remove()"><i class="bi bi-x"></i></button></div>`;
  container.appendChild(row);
}

function initSetupClassrooms() {
  const container = document.getElementById('setup-classrooms-list');
  if (container.children.length > 0) return;
  addClassroomRow(container);

  document.getElementById('setup-add-classroom').onclick = () => addClassroomRow(container);
}

function addClassroomRow(container) {
  const row = document.createElement('div');
  row.className = 'row g-2 mb-2 align-items-end';
  row.innerHTML = `
    <div class="col-4">
      <select class="form-select form-select-sm" data-field="grade">
        <option value="1">ม.1</option><option value="2">ม.2</option><option value="3">ม.3</option>
        <option value="4">ม.4</option><option value="5">ม.5</option><option value="6">ม.6</option>
      </select>
    </div>
    <div class="col-4"><input type="number" class="form-control form-control-sm" placeholder="ห้องที่" data-field="room" min="1" value="1"></div>
    <div class="col-3"><input type="text" class="form-control form-control-sm" placeholder="ชื่อห้อง (ไม่บังคับ)" data-field="name"></div>
    <div class="col-1"><button class="btn btn-outline-danger btn-sm" onclick="this.closest('.row').remove()"><i class="bi bi-x"></i></button></div>`;
  container.appendChild(row);
}

async function saveSetup() {
  const btn = document.getElementById('setup-next');
  btn.disabled = true;

  // 1. Save settings (teacher profile)
  await API.put('/api/settings', {
    teacher_title: document.getElementById('setup-title').value,
    teacher_firstname: document.getElementById('setup-firstname').value,
    teacher_lastname: document.getElementById('setup-lastname').value,
    teacher_position: document.getElementById('setup-position').value,
    school_name: document.getElementById('setup-school').value
  });

  // 2. Create semester
  const semRes = await API.post('/api/semesters', {
    academic_year: parseInt(document.getElementById('setup-year').value),
    semester: parseInt(document.getElementById('setup-semester').value)
  });

  if (semRes.success) {
    await API.post(`/api/semesters/${semRes.data.id}/activate`);
  }

  // 3. Create subjects
  const subjectRows = document.querySelectorAll('#setup-subjects-list .row');
  for (const row of subjectRows) {
    const code = row.querySelector('[data-field="code"]').value.trim();
    const name = row.querySelector('[data-field="name"]').value.trim();
    const type = row.querySelector('[data-field="type"]').value;
    if (code && name) {
      await API.post('/api/subjects', { code, name, subject_type: type });
    }
  }

  // 4. Create classrooms
  const classroomRows = document.querySelectorAll('#setup-classrooms-list .row');
  for (const row of classroomRows) {
    const grade = parseInt(row.querySelector('[data-field="grade"]').value);
    const room = parseInt(row.querySelector('[data-field="room"]').value);
    const name = row.querySelector('[data-field="name"]').value.trim();
    if (grade && room) {
      await API.post('/api/classrooms', { grade_level: grade, room_number: room, name: name || undefined });
    }
  }

  btn.disabled = false;
  bootstrap.Modal.getInstance(document.getElementById('modal-setup')).hide();
  App.toast('ตั้งค่าเริ่มต้นสำเร็จ!');
  App.loadSemesterLabel();
  App.navigate('dashboard');
}

// ==================== Register Dashboard Module ====================

App.modules['dashboard'] = {
  dayNames: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
  periodTimes: [
    '08.20–09.10', '09.10–10.00', '10.20–11.10', '11.10–12.00',
    '12.20–13.10', '13.10–14.00', '14.00–14.50',
    '15.00–15.50', '15.50–16.40', '16.40–17.30'
  ],

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    this.subjects = subRes.success ? subRes.data : [];
    this.classrooms = clsRes.success ? clsRes.data : [];
    this.activeSemId = activeSem?.id || '';

    let schedSlots = [];
    if (activeSem) {
      const schedRes = await API.get(`/api/schedule?semester_id=${activeSem.id}`);
      schedSlots = schedRes.success ? schedRes.data : [];
    }
    this.slots = schedSlots;

    // Determine current day (Mon=1..Fri=5) and current period
    const now = new Date();
    const jsDay = now.getDay(); // 0=Sun..6=Sat
    this.currentDay = (jsDay >= 1 && jsDay <= 5) ? jsDay : 0;
    const mins = now.getHours() * 60 + now.getMinutes();
    const periodRanges = [
      [500,550],[550,600],[620,670],[670,720],
      [740,790],[790,840],[840,890],
      [900,950],[950,1000],[1000,1050]
    ];
    this.currentPeriod = 0;
    periodRanges.forEach((r, i) => { if (mins >= r[0] && mins < r[1]) this.currentPeriod = i + 1; });

    const paletteClasses = ['bg-primary','bg-success','bg-info','bg-warning','bg-danger','bg-secondary','bg-purple'];
    const subjectColorMap = {};
    this.subjects.forEach((s, i) => { subjectColorMap[s.id] = paletteClasses[i % paletteClasses.length]; });

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="fw-bold mb-0"><i class="bi bi-calendar-week me-2 text-primary"></i>ตารางสอน</h4>
        ${activeSem ? `<span class="badge bg-primary fs-6">ปี ${activeSem.academic_year} ภาค ${activeSem.semester}</span>` : ''}
      </div>
      ${!activeSem ? `<div class="alert alert-warning mb-3"><i class="bi bi-exclamation-triangle me-2"></i>ยังไม่ได้ตั้งค่าภาคเรียน — <a href="#" class="alert-link" onclick="App.navigate('settings')">ไปตั้งค่าเริ่มต้น</a> เพื่อเริ่มใช้งานตารางสอน</div>` : ''}
      <p class="text-muted small mb-3"><i class="bi bi-info-circle me-1"></i>กดช่องว่างเพื่อเพิ่มคาบ · กดช่องที่มีวิชาเพื่อเข้าห้องเรียน</p>

      <div class="table-responsive">
        <table class="table table-bordered text-center align-middle mb-0" id="dash-timetable" style="font-size:0.85rem">
          <thead>
            <tr class="table-dark">
              <th style="width:80px" rowspan="2">วัน</th>
              ${[1,2,3,4,5,6,7,8,9,10].map(p => `<th style="min-width:90px">คาบ ${p}</th>`).join('')}
            </tr>
            <tr class="table-light">
              ${this.periodTimes.map(t => `<th class="text-muted" style="font-size:0.65rem;font-weight:normal">${t}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${this.dayNames.map((day, idx) => {
              const dayNum = idx + 1;
              const isToday = dayNum === this.currentDay;
              return `
              <tr${isToday ? ' class="table-active"' : ''}>
                <td class="fw-semibold ${isToday ? 'bg-primary text-white' : 'bg-light'}">${day}${isToday ? '<br><span class="badge bg-light text-primary" style="font-size:0.6rem">วันนี้</span>' : ''}</td>
                ${[1,2,3,4,5,6,7,8,9,10].map(p => {
                  const slot = this.slots.find(s => s.day_of_week === dayNum && s.period === p);
                  const isCurrent = isToday && p === this.currentPeriod;
                  if (slot) {
                    const colorClass = subjectColorMap[slot.subject_id] || 'bg-primary';
                    return `<td class="dash-slot filled p-1" data-slot-id="${slot.id}" data-classroom-id="${slot.classroom_id}" data-subject-id="${slot.subject_id}" data-day="${dayNum}" data-period="${p}" role="button" style="cursor:pointer;${isCurrent ? 'box-shadow:inset 0 0 0 3px #ff5722;' : ''}">
                      <span class="badge ${colorClass} d-block mb-1" style="font-size:0.75rem">${DOMPurify.sanitize(slot.subject_code || '')}</span>
                      <div class="text-muted" style="font-size:0.65rem">${DOMPurify.sanitize(slot.classroom_name || '')}</div>
                    </td>`;
                  }
                  // Break periods (after 2,4 → lunch break markers in header already, just show empty)
                  return `<td class="dash-slot empty" data-day="${dayNum}" data-period="${p}" role="button" style="cursor:pointer;${isCurrent ? 'background:#fff3e0;' : ''}" title="กดเพื่อเพิ่มคาบ">
                    <span class="text-muted" style="font-size:0.7rem">—</span>
                  </td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="row g-3 mt-3">
        <div class="col-md-8">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold"><i class="bi bi-palette me-2"></i>สัญลักษณ์วิชา</div>
            <div class="card-body d-flex flex-wrap gap-2">
              ${this.subjects.length > 0 ? this.subjects.map((s, i) => `<span class="badge ${paletteClasses[i % paletteClasses.length]} py-2 px-3">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</span>`).join('') : '<span class="text-muted small">ยังไม่มีวิชา — <a href="#" onclick="App.navigate(\'settings\')">ไปตั้งค่า</a></span>'}
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold"><i class="bi bi-bar-chart me-2"></i>สรุป</div>
            <div class="card-body">
              <div class="d-flex justify-content-between mb-1"><span>คาบสอนทั้งหมด</span><strong>${this.slots.length}</strong></div>
              <div class="d-flex justify-content-between mb-1"><span>วิชาที่สอน</span><strong>${this.subjects.length}</strong></div>
              <div class="d-flex justify-content-between"><span>ห้องเรียน</span><strong>${this.classrooms.length}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="row g-3 mt-1">
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold"><i class="bi bi-pie-chart me-2"></i>สัดส่วนคาบสอนแต่ละวิชา</div>
            <div class="card-body"><canvas id="chart-subject-pie" height="220"></canvas></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold"><i class="bi bi-bar-chart-line me-2"></i>จำนวนคาบต่อวัน</div>
            <div class="card-body"><canvas id="chart-day-bar" height="220"></canvas></div>
          </div>
        </div>
      </div>

      <!-- Add Slot Modal -->
      <div class="modal fade" id="dashAddModal" tabindex="-1">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header"><h6 class="modal-title"><i class="bi bi-plus-circle me-2"></i>เพิ่มคาบเรียน</h6><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="mb-2" id="dash-modal-info"></div>
              <div class="mb-2"><label class="form-label small mb-1">วิชา</label>
                <select class="form-select" id="dash-add-subject">${this.subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}</select>
              </div>
              <div class="mb-2"><label class="form-label small mb-1">ห้องเรียน</label>
                <select class="form-select" id="dash-add-classroom">${this.classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}</select>
              </div>
            </div>
            <div class="modal-footer"><button class="btn btn-primary btn-sm" id="dash-add-confirm"><i class="bi bi-check-lg me-1"></i>เพิ่ม</button></div>
          </div>
        </div>
      </div>

      <!-- Slot Actions Modal (for filled slots — enter classroom or edit/delete) -->
      <div class="modal fade" id="dashSlotModal" tabindex="-1">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header"><h6 class="modal-title" id="dashSlotTitle"></h6><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div id="dashSlotInfo" class="mb-3"></div>
              <div class="d-grid gap-2">
                <button class="btn btn-primary" id="dash-enter-class"><i class="bi bi-box-arrow-in-right me-2"></i>เข้าห้องเรียน</button>
                <button class="btn btn-outline-danger btn-sm" id="dash-del-slot"><i class="bi bi-trash me-1"></i>ลบคาบนี้</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // === Event Bindings ===

    // Empty cell → add modal
    container.querySelectorAll('.dash-slot.empty').forEach(td => {
      td.addEventListener('click', () => {
        if (!this.activeSemId) {
          App.toast('ตั้งค่าภาคเรียนก่อน แล้วค่อยเพิ่มคาบ', 'danger');
          return;
        }
        if (this.subjects.length === 0 || this.classrooms.length === 0) {
          App.toast('เพิ่มวิชาและห้องเรียนในตั้งค่าก่อน', 'danger');
          return;
        }
        const day = parseInt(td.dataset.day);
        const period = parseInt(td.dataset.period);
        this._pendingDay = day;
        this._pendingPeriod = period;
        document.getElementById('dash-modal-info').innerHTML =
          `<span class="badge bg-info">${this.dayNames[day - 1]}</span> <span class="badge bg-secondary">คาบ ${period}</span> <span class="text-muted small">${this.periodTimes[period - 1]}</span>`;
        new bootstrap.Modal(document.getElementById('dashAddModal')).show();
      });
    });

    // Add confirm
    document.getElementById('dash-add-confirm').addEventListener('click', async () => {
      const subId = document.getElementById('dash-add-subject').value;
      const clsId = document.getElementById('dash-add-classroom').value;
      if (!subId || !clsId) { App.toast('เลือกวิชาและห้องเรียน', 'danger'); return; }
      const res = await API.post('/api/schedule', {
        semester_id: this.activeSemId,
        subject_id: subId,
        classroom_id: clsId,
        day_of_week: this._pendingDay,
        period: this._pendingPeriod
      });
      bootstrap.Modal.getInstance(document.getElementById('dashAddModal'))?.hide();
      if (res.success) { App.toast('เพิ่มคาบแล้ว'); App.navigate('dashboard'); }
      else App.toast(res.error || 'เพิ่มไม่สำเร็จ', 'danger');
    });

    // Filled cell → slot actions modal
    container.querySelectorAll('.dash-slot.filled').forEach(td => {
      td.addEventListener('click', () => {
        this._selectedSlotId = td.dataset.slotId;
        this._selectedClassroomId = td.dataset.classroomId;
        this._selectedSubjectId = td.dataset.subjectId;
        const day = parseInt(td.dataset.day);
        const period = parseInt(td.dataset.period);
        const slot = this.slots.find(s => s.id === td.dataset.slotId);
        document.getElementById('dashSlotTitle').textContent = slot ? `${slot.subject_code} — ${slot.classroom_name}` : 'คาบเรียน';
        document.getElementById('dashSlotInfo').innerHTML = `
          <div class="mb-1"><span class="badge bg-info">${this.dayNames[day - 1]}</span> <span class="badge bg-secondary">คาบ ${period}</span> <span class="text-muted small">${this.periodTimes[period - 1]}</span></div>
          ${slot ? `<div class="small text-muted">วิชา: ${DOMPurify.sanitize(slot.subject_name || slot.subject_code)}<br>ห้อง: ${DOMPurify.sanitize(slot.classroom_name)}</div>` : ''}`;
        new bootstrap.Modal(document.getElementById('dashSlotModal')).show();
      });
    });

    // Enter classroom
    document.getElementById('dash-enter-class').addEventListener('click', () => {
      bootstrap.Modal.getInstance(document.getElementById('dashSlotModal'))?.hide();
      App.navigate('classroom-live', {
        classroom_id: this._selectedClassroomId,
        subject_id: this._selectedSubjectId,
        semester_id: this.activeSemId
      });
    });

    // Delete slot
    document.getElementById('dash-del-slot').addEventListener('click', async () => {
      if (!confirm('ลบคาบนี้ออกจากตารางสอน?')) return;
      const res = await API.del(`/api/schedule/${this._selectedSlotId}`);
      bootstrap.Modal.getInstance(document.getElementById('dashSlotModal'))?.hide();
      if (res.success) { App.toast('ลบคาบแล้ว'); App.navigate('dashboard'); }
      else App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
    });

    // === Chart.js Visualizations ===
    if (typeof Chart !== 'undefined' && schedSlots.length > 0) {
      // Subject pie chart
      const subjectCounts = {};
      schedSlots.forEach(s => {
        const label = s.subject_code || s.subject_id;
        subjectCounts[label] = (subjectCounts[label] || 0) + 1;
      });
      const pieLabels = Object.keys(subjectCounts);
      const pieData = Object.values(subjectCounts);
      const pieColors = ['#0d6efd','#198754','#0dcaf0','#ffc107','#dc3545','#6f42c1','#fd7e14','#20c997','#d63384','#6610f2'];
      new Chart(document.getElementById('chart-subject-pie'), {
        type: 'doughnut',
        data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors.slice(0, pieLabels.length) }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Prompt' } } } } }
      });

      // Day bar chart
      const dayCounts = [0,0,0,0,0];
      schedSlots.forEach(s => { if (s.day_of_week >= 1 && s.day_of_week <= 5) dayCounts[s.day_of_week - 1]++; });
      new Chart(document.getElementById('chart-day-bar'), {
        type: 'bar',
        data: {
          labels: this.dayNames,
          datasets: [{ label: 'คาบ', data: dayCounts, backgroundColor: '#0d6efd', borderRadius: 6 }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: false } }
        }
      });
    }
  }
};

// ==================== Classroom Live (ห้องเรียน) Module ====================
App.modules['classroom-live'] = {
  async render(container, params) {
    if (!params || !params.classroom_id || !params.subject_id) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบข้อมูลห้องเรียน — กรุณากลับไปที่ตารางสอน</div>';
      return;
    }

    container.innerHTML = '<div class="loading"></div>';

    const { classroom_id, subject_id, semester_id } = params;

    const [clsRes, subRes, studRes, postsRes, attRes] = await Promise.all([
      API.get(`/api/classrooms/${classroom_id}`),
      API.get(`/api/subjects/${subject_id}`),
      API.get(`/api/students?classroom_id=${classroom_id}&semester_id=${encodeURIComponent(semester_id || '')}`),
      API.get(`/api/student-classroom?classroom_id=${classroom_id}&subject_id=${subject_id}&semester_id=${encodeURIComponent(semester_id || '')}`),
      API.get(`/api/attendance?classroom_id=${classroom_id}&date=${new Date().toISOString().slice(0, 10)}`)
    ]);

    const cls = clsRes.success ? clsRes.data : {};
    const sub = subRes.success ? subRes.data : {};
    const students = studRes.success ? (Array.isArray(studRes.data) ? studRes.data : []) : [];
    const posts = postsRes.success ? (Array.isArray(postsRes.data) ? postsRes.data : []) : [];
    const todayAtt = attRes.success ? (Array.isArray(attRes.data) ? attRes.data : []) : [];

    const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const checkedCount = todayAtt.filter(s => s.status).length;
    const totalStudents = students.length || todayAtt.length;

    // Count assignments from posts
    const assignments = posts.filter(p => p.post_type === 'assignment');
    const pendingAssignments = assignments.filter(a => {
      const submitted = a.submitted_count || 0;
      const total = a.student_count || totalStudents;
      return submitted < total;
    });

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <a href="#" class="text-decoration-none text-muted small" onclick="App.navigate('dashboard')"><i class="bi bi-arrow-left me-1"></i>กลับตารางสอน</a>
          <h4 class="fw-bold mb-0 mt-1"><i class="bi bi-mortarboard me-2 text-primary"></i>${DOMPurify.sanitize(sub.code || '')} ${DOMPurify.sanitize(sub.name || 'วิชา')}</h4>
          <span class="text-muted">${DOMPurify.sanitize(cls.name || 'ห้องเรียน')} · ${today}</span>
        </div>
        <span class="badge bg-primary fs-6">${totalStudents} คน</span>
      </div>

      <!-- Quick Action Buttons -->
      <div class="row g-2 mb-4">
        <div class="col-6 col-md-3">
          <button class="btn btn-outline-success w-100 py-3 cl-action" data-action="attendance">
            <i class="bi bi-calendar-check d-block fs-3 mb-1"></i>
            <div class="small fw-semibold">เช็คชื่อ</div>
            <div class="text-muted" style="font-size:0.7rem">${checkedCount > 0 ? 'เช็คแล้ว ' + checkedCount + '/' + totalStudents : 'ยังไม่เช็ค'}</div>
          </button>
        </div>
        <div class="col-6 col-md-3">
          <button class="btn btn-outline-primary w-100 py-3 cl-action" data-action="assign">
            <i class="bi bi-send d-block fs-3 mb-1"></i>
            <div class="small fw-semibold">สั่งงาน</div>
            <div class="text-muted" style="font-size:0.7rem">${assignments.length} งาน</div>
          </button>
        </div>
        <div class="col-6 col-md-3">
          <button class="btn btn-outline-warning w-100 py-3 cl-action" data-action="grade">
            <i class="bi bi-pencil-square d-block fs-3 mb-1"></i>
            <div class="small fw-semibold">ตรวจงาน/ให้คะแนน</div>
            <div class="text-muted" style="font-size:0.7rem">${pendingAssignments.length} รอตรวจ</div>
          </button>
        </div>
        <div class="col-6 col-md-3">
          <button class="btn btn-outline-info w-100 py-3 cl-action" data-action="post-lesson">
            <i class="bi bi-chat-square-text d-block fs-3 mb-1"></i>
            <div class="small fw-semibold">บันทึกหลังสอน</div>
          </button>
        </div>
      </div>

      <!-- Tab navigation -->
      <ul class="nav nav-tabs" id="cl-tabs">
        <li class="nav-item"><a class="nav-link active" data-tab="students" href="#">นักเรียน (${totalStudents})</a></li>
        <li class="nav-item"><a class="nav-link" data-tab="tasks" href="#">งาน/ภาระงาน (${assignments.length})</a></li>
        <li class="nav-item"><a class="nav-link" data-tab="scores" href="#">คะแนน</a></li>
      </ul>
      <div id="cl-tab-content" class="border border-top-0 rounded-bottom p-3 bg-white shadow-sm"></div>`;

    // Tab switching
    const tabContent = document.getElementById('cl-tab-content');
    const renderTab = (tabName) => {
      document.querySelectorAll('#cl-tabs .nav-link').forEach(l => l.classList.toggle('active', l.dataset.tab === tabName));

      if (tabName === 'students') {
        if (students.length === 0) {
          tabContent.innerHTML = '<div class="empty-state"><i class="bi bi-people d-block"></i><p>ยังไม่มีนักเรียนในห้องนี้</p></div>';
          return;
        }
        tabContent.innerHTML = `
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr><th style="width:40px">#</th><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>สถานะวันนี้</th></tr>
              </thead>
              <tbody>
                ${students.map((s, i) => {
                  const att = todayAtt.find(a => a.id === s.id);
                  const statusBadge = att?.status ? {
                    present: '<span class="badge bg-success">มา</span>',
                    late: '<span class="badge bg-warning text-dark">สาย</span>',
                    absent: '<span class="badge bg-danger">ขาด</span>',
                    leave: '<span class="badge bg-info">ลา</span>'
                  }[att.status] || '<span class="badge bg-secondary">-</span>' : '<span class="badge bg-light text-muted">ยังไม่เช็ค</span>';
                  return `<tr>
                    <td>${i + 1}</td>
                    <td><code>${DOMPurify.sanitize(s.student_code || '')}</code></td>
                    <td>${DOMPurify.sanitize(s.prefix || '')} ${DOMPurify.sanitize(s.first_name || '')} ${DOMPurify.sanitize(s.last_name || '')} ${s.nickname ? '<small class="text-muted">(' + DOMPurify.sanitize(s.nickname) + ')</small>' : ''}</td>
                    <td>${statusBadge}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;
      }

      if (tabName === 'tasks') {
        tabContent.innerHTML = `
          <div class="d-flex justify-content-between mb-3">
            <span class="text-muted small">${assignments.length} งานทั้งหมด</span>
            <button class="btn btn-sm btn-primary" id="cl-new-task"><i class="bi bi-plus-lg me-1"></i>สร้างงานใหม่</button>
          </div>
          ${assignments.length > 0 ? assignments.map(a => `
            <div class="card border-0 shadow-sm mb-2">
              <div class="card-body py-2 px-3">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <strong class="small">${DOMPurify.sanitize(a.title || 'งาน')}</strong>
                    ${a.due_date ? `<br><small class="text-muted"><i class="bi bi-clock me-1"></i>กำหนดส่ง: ${new Date(a.due_date).toLocaleDateString('th-TH')}</small>` : ''}
                  </div>
                  <div class="text-end">
                    ${a.max_score ? `<span class="badge bg-light text-dark">${a.max_score} คะแนน</span>` : ''}
                    <span class="badge bg-${(a.submitted_count || 0) >= totalStudents ? 'success' : 'warning'} ms-1">${a.submitted_count || 0}/${totalStudents} ส่ง</span>
                  </div>
                </div>
              </div>
            </div>`).join('') : '<div class="empty-state"><i class="bi bi-clipboard d-block"></i><p>ยังไม่มีงาน — กดปุ่ม "สร้างงานใหม่" เพื่อเริ่ม</p></div>'}`;

        document.getElementById('cl-new-task')?.addEventListener('click', () => {
          tabContent.innerHTML = `
            <div class="card border-0 shadow-sm"><div class="card-body">
              <h6 class="fw-bold mb-3">สร้างงานใหม่</h6>
              <div class="row g-2 mb-2">
                <div class="col-md-6"><label class="form-label small mb-1">หัวข้อ *</label><input id="cl-task-title" class="form-control" placeholder="เช่น ใบงานที่ 1"></div>
                <div class="col-md-3"><label class="form-label small mb-1">กำหนดส่ง</label><input type="date" class="form-control" id="cl-task-due"></div>
                <div class="col-md-3"><label class="form-label small mb-1">คะแนนเต็ม</label><input type="number" class="form-control" id="cl-task-score" placeholder="10"></div>
              </div>
              <div class="mb-2"><label class="form-label small mb-1">รายละเอียด</label><textarea id="cl-task-desc" class="form-control" rows="2" placeholder="คำอธิบายงาน (ไม่บังคับ)"></textarea></div>
              <button class="btn btn-primary btn-sm" id="cl-task-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
              <button class="btn btn-outline-secondary btn-sm ms-1" id="cl-task-cancel">ยกเลิก</button>
            </div></div>`;

          document.getElementById('cl-task-save').addEventListener('click', async () => {
            const title = document.getElementById('cl-task-title').value.trim();
            if (!title) { App.toast('ระบุหัวข้องาน', 'danger'); return; }
            const res = await API.post('/api/student-classroom', {
              classroom_id, subject_id, semester_id,
              title,
              content: document.getElementById('cl-task-desc').value,
              post_type: 'assignment',
              due_date: document.getElementById('cl-task-due').value || null,
              max_score: parseInt(document.getElementById('cl-task-score').value) || null
            });
            if (res.success) { App.toast('สร้างงานแล้ว'); renderTab('tasks'); }
            else App.toast(res.error || 'สร้างไม่สำเร็จ', 'danger');
          });
          document.getElementById('cl-task-cancel').addEventListener('click', () => renderTab('tasks'));
        });
      }

      if (tabName === 'scores') {
        tabContent.innerHTML = `
          <div class="text-center py-4">
            <i class="bi bi-graph-up fs-1 text-muted d-block mb-2"></i>
            <p class="text-muted">กดที่งานในแท็บ "งาน/ภาระงาน" เพื่อให้คะแนนรายคน</p>
            <button class="btn btn-sm btn-outline-primary" onclick="App.navigate('scores')"><i class="bi bi-graph-up me-1"></i>ไปหน้าคะแนนเต็ม</button>
          </div>`;
      }
    };

    document.querySelectorAll('#cl-tabs .nav-link').forEach(link => {
      link.addEventListener('click', (e) => { e.preventDefault(); renderTab(link.dataset.tab); });
    });

    // Quick action buttons
    container.querySelectorAll('.cl-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'attendance') App.navigate('attendance');
        if (action === 'assign') renderTab('tasks');
        if (action === 'grade') renderTab('tasks');
        if (action === 'post-lesson') App.navigate('post-lesson');
      });
    });

    // Initial tab
    renderTab('students');
  }
};

// ==================== Register Settings Module ====================

App.modules['settings'] = {
  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [setRes, semRes, subRes, classRes] = await Promise.all([
      API.get('/api/settings'),
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const s = setRes.success ? setRes.data : {};
    const semesters = semRes.success ? semRes.data : [];
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = classRes.success ? classRes.data : [];

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-gear me-2 text-primary"></i>ตั้งค่าเริ่มต้น</h4>

      <!-- Teacher Profile -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-person-badge me-2"></i>ข้อมูลครู</div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-2">
              <label class="form-label">คำนำหน้า</label>
              <select class="form-select" id="set-title">
                <option value="นาย" ${s.teacher_title === 'นาย' ? 'selected' : ''}>นาย</option>
                <option value="นาง" ${s.teacher_title === 'นาง' ? 'selected' : ''}>นาง</option>
                <option value="นางสาว" ${s.teacher_title === 'นางสาว' ? 'selected' : ''}>นางสาว</option>
              </select>
            </div>
            <div class="col-md-4"><label class="form-label">ชื่อ</label><input type="text" class="form-control" id="set-fname" value="${DOMPurify.sanitize(s.teacher_firstname || '')}"></div>
            <div class="col-md-4"><label class="form-label">นามสกุล</label><input type="text" class="form-control" id="set-lname" value="${DOMPurify.sanitize(s.teacher_lastname || '')}"></div>
            <div class="col-md-5"><label class="form-label">ตำแหน่ง</label><input type="text" class="form-control" id="set-position" value="${DOMPurify.sanitize(s.teacher_position || '')}"></div>
            <div class="col-md-5"><label class="form-label">โรงเรียน</label><input type="text" class="form-control" id="set-school" value="${DOMPurify.sanitize(s.school_name || '')}"></div>
          </div>
          <button class="btn btn-primary mt-3" id="btn-save-profile"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
        </div>
      </div>

      <!-- Semesters -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-calendar-range me-2"></i>ภาคเรียน</span>
          <button class="btn btn-sm btn-primary" id="btn-add-semester"><i class="bi bi-plus-lg me-1"></i>เพิ่ม</button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light"><tr>
                <th>ปีการศึกษา</th><th>ภาคเรียน</th><th>สถานะ</th><th></th>
              </tr></thead>
              <tbody>
                ${semesters.map(sem => `
                <tr>
                  <td>${sem.academic_year}</td>
                  <td>${sem.semester}</td>
                  <td>${sem.is_active ? '<span class="badge bg-success">ใช้งานอยู่</span>' : ''}</td>
                  <td class="text-end">
                    ${!sem.is_active ? `<button class="btn btn-sm btn-outline-success me-1" onclick="App.modules.settings.activateSem('${sem.id}')"><i class="bi bi-check-lg"></i></button>` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="App.modules.settings.deleteSem('${sem.id}')"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>`).join('')}
                ${semesters.length === 0 ? '<tr><td colspan="4" class="text-muted text-center py-3">ยังไม่มีภาคเรียน</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Subjects -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-book me-2"></i>วิชา</span>
          <button class="btn btn-sm btn-primary" id="btn-add-subject"><i class="bi bi-plus-lg me-1"></i>เพิ่ม</button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light"><tr>
                <th>รหัส</th><th>ชื่อวิชา</th><th>ประเภท</th><th>หน่วยกิต</th><th></th>
              </tr></thead>
              <tbody>
                ${subjects.map(sub => `
                <tr>
                  <td>${DOMPurify.sanitize(sub.code)}</td>
                  <td>${DOMPurify.sanitize(sub.name)}</td>
                  <td>${sub.subject_type === 'regular' ? 'พื้นฐาน' : sub.subject_type === 'elective' ? 'เพิ่มเติม' : sub.subject_type === 'activity' ? 'กิจกรรม' : sub.subject_type}</td>
                  <td>${sub.credits}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="App.modules.settings.deleteSubject('${sub.id}')"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>`).join('')}
                ${subjects.length === 0 ? '<tr><td colspan="5" class="text-muted text-center py-3">ยังไม่มีวิชา</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Google Drive Storage -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white">
          <span class="fw-semibold"><i class="bi bi-google me-2"></i>Google Drive — ที่เก็บไฟล์</span>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-2">รูปภาพ/คลิปจากนักเรียนส่งงาน และไฟล์ที่อัปโหลดทั้งหมด จะถูกเก็บในโฟลเดอร์นี้</p>
          <a href="https://drive.google.com/drive/folders/1NE_KC6zWdyaURFMmLVRw1aXXD-dWede0" target="_blank" rel="noopener" class="btn btn-outline-primary me-2">
            <i class="bi bi-folder2-open me-1"></i>เปิดโฟลเดอร์ Google Drive
          </a>
          <button class="btn btn-outline-success" id="btn-connect-drive">
            <i class="bi bi-plug me-1"></i>เชื่อมต่อ Google Drive
          </button>
          <div id="drive-status" class="mt-2"></div>
        </div>
      </div>

      <!-- Classrooms -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-building me-2"></i>ห้องเรียน</span>
          <button class="btn btn-sm btn-primary" id="btn-add-classroom"><i class="bi bi-plus-lg me-1"></i>เพิ่ม</button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light"><tr>
                <th>ระดับชั้น</th><th>ห้อง</th><th>ชื่อ</th><th></th>
              </tr></thead>
              <tbody>
                ${classrooms.map(c => `
                <tr>
                  <td>ม.${c.grade_level}</td>
                  <td>${c.room_number}</td>
                  <td>${DOMPurify.sanitize(c.name || '')}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="App.modules.settings.deleteClassroom('${c.id}')"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>`).join('')}
                ${classrooms.length === 0 ? '<tr><td colspan="4" class="text-muted text-center py-3">ยังไม่มีห้องเรียน</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    // Event bindings
    document.getElementById('btn-save-profile').addEventListener('click', async () => {
      await API.put('/api/settings', {
        teacher_title: document.getElementById('set-title').value,
        teacher_firstname: document.getElementById('set-fname').value,
        teacher_lastname: document.getElementById('set-lname').value,
        teacher_position: document.getElementById('set-position').value,
        school_name: document.getElementById('set-school').value
      });
      App.toast('บันทึกข้อมูลครูแล้ว');
    });

    document.getElementById('btn-add-semester').addEventListener('click', () => {
      const card = document.getElementById('btn-add-semester').closest('.card');
      const existing = card.querySelector('.inline-add-form');
      if (existing) { existing.remove(); return; }
      const form = document.createElement('div');
      form.className = 'inline-add-form p-3 border-top bg-light';
      form.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-5"><label class="form-label small mb-1">ปีการศึกษา</label><input type="number" class="form-control form-control-sm" id="add-sem-year" value="2568" min="2500"></div>
          <div class="col-4"><label class="form-label small mb-1">ภาคเรียน</label><select class="form-select form-select-sm" id="add-sem-num"><option value="1">1</option><option value="2">2</option></select></div>
          <div class="col-3 d-flex gap-1"><button class="btn btn-sm btn-primary flex-fill" id="add-sem-save"><i class="bi bi-check-lg"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="this.closest('.inline-add-form').remove()"><i class="bi bi-x-lg"></i></button></div>
        </div>`;
      card.appendChild(form);
      document.getElementById('add-sem-save').addEventListener('click', async () => {
        const year = parseInt(document.getElementById('add-sem-year').value);
        const sem = parseInt(document.getElementById('add-sem-num').value);
        if (year && sem) { await API.post('/api/semesters', { academic_year: year, semester: sem }); App.navigate('settings'); }
      });
    });

    document.getElementById('btn-add-subject').addEventListener('click', () => {
      const card = document.getElementById('btn-add-subject').closest('.card');
      const existing = card.querySelector('.inline-add-form');
      if (existing) { existing.remove(); return; }
      const form = document.createElement('div');
      form.className = 'inline-add-form p-3 border-top bg-light';
      form.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-3"><label class="form-label small mb-1">รหัสวิชา</label><input type="text" class="form-control form-control-sm" id="add-sub-code" placeholder="ศ21101"></div>
          <div class="col-4"><label class="form-label small mb-1">ชื่อวิชา</label><input type="text" class="form-control form-control-sm" id="add-sub-name" placeholder="ดนตรี"></div>
          <div class="col-3"><label class="form-label small mb-1">ประเภท</label><select class="form-select form-select-sm" id="add-sub-type"><option value="regular">พื้นฐาน</option><option value="elective">เพิ่มเติม</option><option value="activity">กิจกรรม</option></select></div>
          <div class="col-2 d-flex gap-1"><button class="btn btn-sm btn-primary flex-fill" id="add-sub-save"><i class="bi bi-check-lg"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="this.closest('.inline-add-form').remove()"><i class="bi bi-x-lg"></i></button></div>
        </div>`;
      card.appendChild(form);
      document.getElementById('add-sub-save').addEventListener('click', async () => {
        const code = document.getElementById('add-sub-code').value.trim();
        const name = document.getElementById('add-sub-name').value.trim();
        const type = document.getElementById('add-sub-type').value;
        if (code && name) { await API.post('/api/subjects', { code, name, subject_type: type }); App.navigate('settings'); }
        else { App.toast('กรุณากรอกรหัสและชื่อวิชา', 'warning'); }
      });
    });

    // Google Drive connect button
    document.getElementById('btn-connect-drive').addEventListener('click', async () => {
      const statusEl = document.getElementById('drive-status');
      statusEl.innerHTML = '<span class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>กำลังเชื่อมต่อ...</span>';
      const res = await API.get('/api/drive/auth');
      if (res.success && res.data.auth_url) {
        const popup = window.open(res.data.auth_url, 'drive_auth', 'width=500,height=600');
        window.addEventListener('message', async function handler(e) {
          if (e.data && e.data.type === 'drive_auth' && e.data.code) {
            window.removeEventListener('message', handler);
            const r2 = await API.post('/api/drive/auth', { code: e.data.code });
            if (r2.success) {
              statusEl.innerHTML = '<span class="text-success small"><i class="bi bi-check-circle me-1"></i>เชื่อมต่อ Google Drive สำเร็จ!</span>';
            } else {
              statusEl.innerHTML = `<span class="text-danger small">${r2.error || 'เชื่อมต่อไม่สำเร็จ'}</span>`;
            }
          }
        });
      } else {
        statusEl.innerHTML = '<span class="text-danger small">ไม่สามารถเริ่มเชื่อมต่อ Drive ได้ — ตรวจสอบ GOOGLE_DRIVE_CLIENT_ID/SECRET</span>';
      }
    });

    document.getElementById('btn-add-classroom').addEventListener('click', () => {
      const card = document.getElementById('btn-add-classroom').closest('.card');
      const existing = card.querySelector('.inline-add-form');
      if (existing) { existing.remove(); return; }
      const form = document.createElement('div');
      form.className = 'inline-add-form p-3 border-top bg-light';
      form.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-4"><label class="form-label small mb-1">ระดับชั้น</label><select class="form-select form-select-sm" id="add-cls-grade"><option value="1">ม.1</option><option value="2">ม.2</option><option value="3">ม.3</option><option value="4">ม.4</option><option value="5">ม.5</option><option value="6">ม.6</option></select></div>
          <div class="col-3"><label class="form-label small mb-1">ห้องที่</label><input type="number" class="form-control form-control-sm" id="add-cls-room" value="1" min="1"></div>
          <div class="col-3"><label class="form-label small mb-1">ชื่อ (ไม่บังคับ)</label><input type="text" class="form-control form-control-sm" id="add-cls-name" placeholder=""></div>
          <div class="col-2 d-flex gap-1"><button class="btn btn-sm btn-primary flex-fill" id="add-cls-save"><i class="bi bi-check-lg"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="this.closest('.inline-add-form').remove()"><i class="bi bi-x-lg"></i></button></div>
        </div>`;
      card.appendChild(form);
      document.getElementById('add-cls-save').addEventListener('click', async () => {
        const grade = parseInt(document.getElementById('add-cls-grade').value);
        const room = parseInt(document.getElementById('add-cls-room').value);
        const name = document.getElementById('add-cls-name').value.trim();
        if (grade && room) { await API.post('/api/classrooms', { grade_level: grade, room_number: room, name: name || undefined }); App.navigate('settings'); }
      });
    });
  },

  async activateSem(id) {
    await API.post(`/api/semesters/${id}/activate`);
    App.loadSemesterLabel();
    App.navigate('settings');
  },

  async deleteSem(id) {
    if (confirm('ลบภาคเรียนนี้?')) {
      await API.del(`/api/semesters/${id}`);
      App.navigate('settings');
    }
  },

  async deleteSubject(id) {
    if (confirm('ลบวิชานี้?')) {
      await API.del(`/api/subjects/${id}`);
      App.navigate('settings');
    }
  },

  async deleteClassroom(id) {
    if (confirm('ลบห้องเรียนนี้?')) {
      await API.del(`/api/classrooms/${id}`);
      App.navigate('settings');
    }
  }
};

// ==================== Register Admin Module ====================

App.modules['admin'] = {
  async render(container) {
    if (!App.isAdmin) {
      container.innerHTML = '<div class="alert alert-danger">ไม่มีสิทธิ์เข้าถึง</div>';
      return;
    }

    container.innerHTML = '<div class="loading"></div>';

    const [pendingRes, teachersRes] = await Promise.all([
      API.get('/api/admin/pending-teachers'),
      API.get('/api/admin/teachers')
    ]);

    const pending = pendingRes.success ? pendingRes.data : [];
    const teachers = teachersRes.success ? teachersRes.data : [];

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-shield-lock me-2 text-primary"></i>จัดการครู</h4>

      <!-- Pending Teachers -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white fw-semibold">
          <i class="bi bi-hourglass-split me-2"></i>รอการอนุมัติ
          ${pending.length > 0 ? `<span class="badge bg-danger ms-2">${pending.length}</span>` : ''}
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light"><tr>
                <th>ชื่อผู้ใช้</th><th>ชื่อที่แสดง</th><th>สมัครเมื่อ</th><th></th>
              </tr></thead>
              <tbody>
                ${pending.map(t => `
                <tr>
                  <td>${DOMPurify.sanitize(t.username)}</td>
                  <td>${DOMPurify.sanitize(t.display_name || '-')}</td>
                  <td>${new Date(t.created_at).toLocaleDateString('th-TH')}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-success me-1" onclick="App.modules.admin.approve('${t.id}')">
                      <i class="bi bi-check-lg me-1"></i>อนุมัติ
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="App.modules.admin.reject('${t.id}')">
                      <i class="bi bi-x-lg me-1"></i>ปฏิเสธ
                    </button>
                  </td>
                </tr>`).join('')}
                ${pending.length === 0 ? '<tr><td colspan="4" class="text-muted text-center py-3">ไม่มีครูรออนุมัติ</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- All Teachers -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold">
          <i class="bi bi-people me-2"></i>ครูทั้งหมด
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light"><tr>
                <th>ชื่อผู้ใช้</th><th>ชื่อที่แสดง</th><th>สถานะ</th><th>แอดมิน</th><th></th>
              </tr></thead>
              <tbody>
                ${teachers.map(t => {
                  const statusBadge = t.status === 'active' ? '<span class="badge bg-success">ใช้งาน</span>'
                    : t.status === 'pending' ? '<span class="badge bg-warning">รออนุมัติ</span>'
                    : '<span class="badge bg-danger">ปฏิเสธ</span>';
                  return `
                <tr>
                  <td>${DOMPurify.sanitize(t.username)}</td>
                  <td>${DOMPurify.sanitize(t.display_name || '-')}</td>
                  <td>${statusBadge}</td>
                  <td>${t.is_admin ? '<i class="bi bi-shield-check text-primary"></i>' : ''}</td>
                  <td class="text-end">
                    ${!t.is_admin ? `<button class="btn btn-sm btn-outline-danger" onclick="App.modules.admin.removeTeacher('${t.id}')"><i class="bi bi-trash"></i></button>` : ''}
                  </td>
                </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  async approve(id) {
    const res = await API.post(`/api/admin/approve/${id}`);
    if (res.success) {
      App.toast('อนุมัติครูสำเร็จ');
      App.loadPendingBadge();
      App.navigate('admin');
    } else {
      App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    }
  },

  async reject(id) {
    if (confirm('ปฏิเสธครูคนนี้?')) {
      const res = await API.post(`/api/admin/reject/${id}`);
      if (res.success) {
        App.toast('ปฏิเสธสำเร็จ');
        App.loadPendingBadge();
        App.navigate('admin');
      } else {
        App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
      }
    }
  },

  async removeTeacher(id) {
    if (confirm('ลบครูคนนี้ออกจากระบบ?')) {
      const res = await API.del(`/api/admin/teachers/${id}`);
      if (res.success) {
        App.toast('ลบครูสำเร็จ');
        App.loadPendingBadge();
        App.navigate('admin');
      } else {
        App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
      }
    }
  }
};

// ==================== Register Attendance Module ====================

App.modules['attendance'] = {
  selectedClassroom: null,
  selectedDate: new Date().toISOString().split('T')[0],

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    // Load classrooms
    const classRes = await API.get('/api/classrooms');
    const classrooms = classRes.success ? classRes.data : [];

    if (classrooms.length === 0) {
      container.innerHTML = `
        <h4 class="fw-bold mb-4"><i class="bi bi-calendar-check me-2 text-primary"></i>เช็คชื่อ</h4>
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>ยังไม่มีห้องเรียน — <a href="#" class="alert-link" onclick="App.navigate('settings')">ไปเพิ่มห้องเรียนก่อน</a>
        </div>`;
      return;
    }

    if (!this.selectedClassroom) this.selectedClassroom = classrooms[0].id;

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-calendar-check me-2 text-primary"></i>เช็คชื่อ</h4>

      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-4 col-6">
              <label class="form-label small mb-1"><i class="bi bi-building me-1"></i>ห้องเรียน</label>
              <select class="form-select" id="att-classroom">
                ${classrooms.map(c => `<option value="${c.id}" ${c.id === this.selectedClassroom ? 'selected' : ''}>${DOMPurify.sanitize(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label small mb-1"><i class="bi bi-calendar3 me-1"></i>วันที่</label>
              <input type="date" class="form-control" id="att-date" value="${this.selectedDate}">
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label small mb-1"><i class="bi bi-clock me-1"></i>คาบที่</label>
              <select class="form-select" id="att-period">
                <option value="">ทั้งวัน</option>
                <option value="1">คาบ 1</option><option value="2">คาบ 2</option>
                <option value="3">คาบ 3</option><option value="4">คาบ 4</option>
                <option value="5">คาบ 5</option><option value="6">คาบ 6</option>
                <option value="7">คาบ 7</option><option value="8">คาบ 8</option>
              </select>
            </div>
            <div class="col-md-2 col-6">
              <button class="btn btn-primary w-100" id="att-load"><i class="bi bi-search me-1"></i>โหลด</button>
            </div>
          </div>
          <div class="mt-2">
            <button class="btn btn-outline-success btn-sm" id="att-gps-checkin"><i class="bi bi-geo-alt me-1"></i>GPS Check-in</button>
            <button class="btn btn-outline-secondary btn-sm" id="att-manage-zones"><i class="bi bi-pin-map me-1"></i>จัดการโซน GPS</button>
            <span class="small text-muted ms-2" id="att-gps-status"></span>
          </div>
        </div>
      </div>

      <div id="att-student-list"></div>`;

    // Event: load
    document.getElementById('att-load').addEventListener('click', () => this.loadStudents());
    document.getElementById('att-classroom').addEventListener('change', (e) => {
      this.selectedClassroom = e.target.value;
    });
    document.getElementById('att-date').addEventListener('change', (e) => {
      this.selectedDate = e.target.value;
    });

    // GPS Check-in
    document.getElementById('att-gps-checkin').addEventListener('click', () => {
      const statusEl = document.getElementById('att-gps-status');
      if (!navigator.geolocation) { statusEl.textContent = 'GPS ไม่รองรับบนอุปกรณ์นี้'; return; }
      statusEl.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>กำลังค้นหาตำแหน่ง...';
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const res = await API.post('/api/attendance/gps', {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          classroom_id: document.getElementById('att-classroom').value
        });
        if (res.success && res.data.matched) {
          statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>อยู่ในโซนเช็คชื่อ</span>';
        } else if (res.success && !res.data.matched) {
          statusEl.innerHTML = res.data.zones_checked > 0
            ? '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>อยู่นอกโซนเช็คชื่อ</span>'
            : '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>ยังไม่ได้ตั้งค่าโซน GPS</span>';
        } else {
          statusEl.textContent = res.error || 'ตรวจสอบไม่สำเร็จ';
        }
      }, () => { statusEl.textContent = 'ไม่สามารถเข้าถึงตำแหน่งได้'; });
    });

    // Manage GPS Zones
    document.getElementById('att-manage-zones').addEventListener('click', async () => {
      const classroomId = document.getElementById('att-classroom').value;
      const zRes = await API.get(`/api/attendance/zones?classroom_id=${classroomId}`);
      const zones = zRes.success ? zRes.data : [];
      const area = document.getElementById('att-student-list');
      area.innerHTML = `
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white fw-semibold"><i class="bi bi-pin-map me-2"></i>โซน GPS สำหรับเช็คชื่อ</div>
          <div class="card-body">
            <div id="att-gps-map" style="height:300px;border-radius:8px" class="mb-3"></div>
            <div class="row g-2 mb-2">
              <div class="col-md-3"><input class="form-control" id="gz-name" placeholder="ชื่อโซน"></div>
              <div class="col-md-3"><input class="form-control" id="gz-lat" placeholder="ละติจูด" type="number" step="any"></div>
              <div class="col-md-3"><input class="form-control" id="gz-lng" placeholder="ลองจิจูด" type="number" step="any"></div>
              <div class="col-md-2"><input class="form-control" id="gz-radius" placeholder="รัศมี (ม.)" type="number" value="100"></div>
              <div class="col-md-1"><button class="btn btn-success w-100" id="gz-add"><i class="bi bi-plus-lg"></i></button></div>
            </div>
            <button class="btn btn-sm btn-outline-primary mb-3" id="gz-detect"><i class="bi bi-crosshair me-1"></i>ใช้ตำแหน่งปัจจุบัน</button>
            <div id="gz-list">${zones.map(z => `
              <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <span><i class="bi bi-geo-alt text-success me-1"></i>${DOMPurify.sanitize(z.zone_name)} — ${z.lat}, ${z.lng} (${z.radius_meters}m)</span>
                <button class="btn btn-sm btn-outline-danger" data-del-zone="${z.id}"><i class="bi bi-trash"></i></button>
              </div>`).join('')}
              ${zones.length === 0 ? '<p class="text-muted small">ยังไม่มีโซน — เพิ่มโซนใหม่ด้านบน</p>' : ''}
            </div>
            <button class="btn btn-secondary btn-sm mt-2" id="gz-back"><i class="bi bi-arrow-left me-1"></i>กลับไปเช็คชื่อ</button>
          </div>
        </div>`;

      // Init Leaflet map
      if (typeof L !== 'undefined') {
        const defaultLat = zones[0]?.lat || 13.7563;
        const defaultLng = zones[0]?.lng || 100.5018;
        const map = L.map('att-gps-map').setView([defaultLat, defaultLng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);
        zones.forEach(z => {
          L.circle([z.lat, z.lng], { radius: z.radius_meters || 100, color: '#198754' }).addTo(map)
            .bindPopup(DOMPurify.sanitize(z.zone_name));
        });
        map.on('click', (e) => {
          document.getElementById('gz-lat').value = e.latlng.lat.toFixed(6);
          document.getElementById('gz-lng').value = e.latlng.lng.toFixed(6);
        });
      }

      document.getElementById('gz-detect')?.addEventListener('click', () => {
        navigator.geolocation?.getCurrentPosition((pos) => {
          document.getElementById('gz-lat').value = pos.coords.latitude.toFixed(6);
          document.getElementById('gz-lng').value = pos.coords.longitude.toFixed(6);
        });
      });

      document.getElementById('gz-add')?.addEventListener('click', async () => {
        const res = await API.post('/api/attendance/zones', {
          classroom_id: classroomId,
          zone_name: document.getElementById('gz-name').value || 'Zone',
          lat: parseFloat(document.getElementById('gz-lat').value),
          lng: parseFloat(document.getElementById('gz-lng').value),
          radius_meters: parseInt(document.getElementById('gz-radius').value) || 100
        });
        if (res.success) { App.toast('เพิ่มโซนแล้ว'); document.getElementById('att-manage-zones').click(); }
        else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
      });

      area.querySelectorAll('[data-del-zone]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await API.del(`/api/attendance/zones/${btn.dataset.delZone}`);
          App.toast('ลบโซนแล้ว');
          document.getElementById('att-manage-zones').click();
        });
      });

      document.getElementById('gz-back')?.addEventListener('click', () => this.loadStudents());
    });

    // Auto-load
    this.loadStudents();
  },

  async loadStudents() {
    const classroomId = document.getElementById('att-classroom').value;
    const date = document.getElementById('att-date').value;
    const period = document.getElementById('att-period').value;
    const listEl = document.getElementById('att-student-list');
    listEl.innerHTML = '<div class="loading"></div>';

    let url = `/api/attendance?classroom_id=${classroomId}&date=${date}`;
    if (period) url += `&period=${period}`;

    const res = await API.get(url);
    const students = res.success ? res.data : [];

    if (students.length === 0) {
      listEl.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>ยังไม่มีนักเรียนในห้องนี้ — <a href="#" class="alert-link" onclick="App.navigate('settings')">ไปเพิ่มนักเรียนในตั้งค่า</a>
        </div>`;
      return;
    }

    const statusOptions = [
      { value: 'present', label: 'มา', color: 'success', icon: 'check-circle' },
      { value: 'late', label: 'สาย', color: 'warning', icon: 'clock' },
      { value: 'absent', label: 'ขาด', color: 'danger', icon: 'x-circle' },
      { value: 'leave', label: 'ลา', color: 'info', icon: 'dash-circle' }
    ];

    listEl.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-people me-2"></i>นักเรียน ${students.length} คน</span>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" onclick="App.modules.attendance.markAll('present')" title="มาทุกคน"><i class="bi bi-check-all me-1"></i>มาทั้งหมด</button>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0 align-middle">
              <thead class="table-light">
                <tr>
                  <th style="width:50px">#</th>
                  <th>ชื่อ</th>
                  <th style="width:280px" class="text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                ${students.map((s, i) => `
                <tr data-student-id="${s.id}">
                  <td class="text-muted">${i + 1}</td>
                  <td>
                    <strong>${DOMPurify.sanitize(s.first_name)} ${DOMPurify.sanitize(s.last_name)}</strong>
                    ${s.nickname ? `<span class="text-muted small ms-1">(${DOMPurify.sanitize(s.nickname)})</span>` : ''}
                  </td>
                  <td>
                    <div class="btn-group w-100" role="group">
                      ${statusOptions.map(opt => `
                        <button type="button" class="btn btn-sm btn-${s.status === opt.value ? opt.color : 'outline-' + opt.color} att-status-btn"
                          data-student="${s.id}" data-status="${opt.value}" title="${opt.label}">
                          <i class="bi bi-${opt.icon} me-1 d-none d-sm-inline"></i>${opt.label}
                        </button>`).join('')}
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer bg-white text-end">
          <span class="me-3 small text-muted" id="att-summary"></span>
          <button class="btn btn-outline-secondary btn-sm me-2" id="att-export">
            <i class="bi bi-download me-1"></i>ส่งออก
          </button>
          <button class="btn btn-primary" id="att-save">
            <i class="bi bi-check-lg me-1"></i>บันทึกเช็คชื่อ
          </button>
        </div>
      </div>`;

    // Status button clicks
    document.querySelectorAll('.att-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.dataset.student;
        const status = btn.dataset.status;
        // Toggle: deselect all in this group, select this one
        const row = btn.closest('tr');
        row.querySelectorAll('.att-status-btn').forEach(b => {
          const s = statusOptions.find(o => o.value === b.dataset.status);
          b.className = `btn btn-sm btn-${b === btn ? s.color : 'outline-' + s.color} att-status-btn`;
        });
        this.updateSummary();
      });
    });

    // Save
    document.getElementById('att-save').addEventListener('click', () => this.save());

    // Export
    document.getElementById('att-export').addEventListener('click', () => {
      const rows = [];
      document.querySelectorAll('tr[data-student-id]').forEach(row => {
        const name = row.querySelector('td:nth-child(2) strong')?.textContent || '';
        const activeBtn = row.querySelector('.att-status-btn.btn-success, .att-status-btn.btn-warning, .att-status-btn.btn-danger, .att-status-btn.btn-info');
        const status = activeBtn ? activeBtn.textContent.trim() : '-';
        rows.push({ name, status });
      });
      const date = document.getElementById('att-date').value;
      Exporter.showExportDialog(`เช็คชื่อ ${date}`, rows, {
        headers: ['name', 'status'],
        headerLabels: ['ชื่อ-สกุล', 'สถานะ']
      });
    });

    this.updateSummary();
  },

  markAll(status) {
    const statusOptions = {
      present: 'success', late: 'warning', absent: 'danger', leave: 'info'
    };
    document.querySelectorAll('tr[data-student-id]').forEach(row => {
      row.querySelectorAll('.att-status-btn').forEach(btn => {
        const s = btn.dataset.status;
        const isTarget = s === status;
        btn.className = `btn btn-sm btn-${isTarget ? statusOptions[s] : 'outline-' + statusOptions[s]} att-status-btn`;
      });
    });
    this.updateSummary();
  },

  updateSummary() {
    const rows = document.querySelectorAll('tr[data-student-id]');
    let present = 0, late = 0, absent = 0, leave = 0, unmarked = 0;
    rows.forEach(row => {
      const active = row.querySelector('.att-status-btn.btn-success, .att-status-btn.btn-warning, .att-status-btn.btn-danger, .att-status-btn.btn-info');
      if (!active) { unmarked++; return; }
      const st = active.dataset.status;
      if (st === 'present') present++;
      if (st === 'late') late++;
      if (st === 'absent') absent++;
      if (st === 'leave') leave++;
    });
    const el = document.getElementById('att-summary');
    if (el) {
      el.innerHTML = `<span class="text-success">มา ${present}</span> · <span class="text-warning">สาย ${late}</span> · <span class="text-danger">ขาด ${absent}</span> · <span class="text-info">ลา ${leave}</span>${unmarked > 0 ? ` · <span class="text-muted">ยังไม่เช็ค ${unmarked}</span>` : ''}`;
    }
  },

  async save() {
    const classroomId = document.getElementById('att-classroom').value;
    const date = document.getElementById('att-date').value;
    const period = document.getElementById('att-period').value;
    const statusColors = { present: 'success', late: 'warning', absent: 'danger', leave: 'info' };

    const records = [];
    document.querySelectorAll('tr[data-student-id]').forEach(row => {
      const studentId = row.dataset.studentId;
      // Find active button (not outline)
      const active = row.querySelector('.att-status-btn.btn-success, .att-status-btn.btn-warning, .att-status-btn.btn-danger, .att-status-btn.btn-info');
      if (active) {
        records.push({ student_id: studentId, status: active.dataset.status });
      }
    });

    if (records.length === 0) {
      App.toast('กรุณาเลือกสถานะอย่างน้อย 1 คน', 'warning');
      return;
    }

    // Get active semester
    const semRes = await API.get('/api/semesters');
    const activeSem = semRes.success ? semRes.data.find(s => s.is_active) : null;

    const res = await API.post('/api/attendance', {
      classroom_id: classroomId,
      date,
      period: period ? parseInt(period) : null,
      semester_id: activeSem?.id || null,
      records
    });

    if (res.success) {
      App.toast(`บันทึกเช็คชื่อ ${records.length} คนสำเร็จ!`);
    } else {
      App.toast(res.error || 'บันทึกไม่สำเร็จ', 'danger');
    }
  }
};

// ==================== Register Post-Lesson Module ====================

App.modules['post-lesson'] = {
  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [classRes, subRes, logsRes] = await Promise.all([
      API.get('/api/classrooms'),
      API.get('/api/subjects'),
      API.get('/api/post-lesson')
    ]);

    const classrooms = classRes.success ? classRes.data : [];
    const subjects = subRes.success ? subRes.data : [];
    const logs = logsRes.success ? logsRes.data : [];
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-chat-square-text me-2 text-primary"></i>บันทึกหลังสอน</h4>

      <!-- New Entry Form -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-plus-circle me-2"></i>เขียนบันทึกใหม่</div>
        <div class="card-body">
          <div class="row g-2 mb-3">
            <div class="col-md-3 col-6">
              <label class="form-label small mb-1">วันที่</label>
              <input type="date" class="form-control" id="pl-date" value="${today}">
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label small mb-1">ห้องเรียน</label>
              <select class="form-select" id="pl-classroom">
                <option value="">— เลือก —</option>
                ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label small mb-1">วิชา</label>
              <select class="form-select" id="pl-subject">
                <option value="">— เลือก —</option>
                ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3 col-6">
              <label class="form-label small mb-1">คาบที่</label>
              <select class="form-select" id="pl-period">
                <option value="">—</option>
                <option>1</option><option>2</option><option>3</option><option>4</option>
                <option>5</option><option>6</option><option>7</option><option>8</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small mb-1"><i class="bi bi-journal-text me-1"></i>เนื้อหาที่สอน</label>
            <input type="text" class="form-control" id="pl-topic" placeholder="เช่น จังหวะ 4/4 การอ่านโน้ตดนตรี">
          </div>
          <div class="mb-3">
            <label class="form-label small mb-1"><i class="bi bi-activity me-1"></i>กิจกรรม / สิ่งที่ทำ</label>
            <textarea class="form-control" id="pl-activities" rows="2" placeholder="เช่น ให้นักเรียนตบจังหวะตามโน้ต ฝึกปฏิบัติเครื่องดนตรี"></textarea>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label small mb-1"><i class="bi bi-eye me-1"></i>สิ่งที่สังเกต / จุดเด่น</label>
              <textarea class="form-control" id="pl-observations" rows="2" placeholder="นักเรียนให้ความร่วมมือดี..."></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1"><i class="bi bi-exclamation-triangle me-1"></i>ปัญหา / ข้อควรปรับปรุง</label>
              <textarea class="form-control" id="pl-issues" rows="2" placeholder="นักเรียนบางคนยังจับจังหวะไม่ได้..."></textarea>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small mb-1"><i class="bi bi-arrow-right-circle me-1"></i>แผนสอนคาบต่อไป</label>
            <textarea class="form-control" id="pl-next" rows="2" placeholder="ทบทวนจังหวะ + เพิ่มเนื้อหาใหม่..."></textarea>
          </div>
          <button class="btn btn-primary" id="pl-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
          <button class="btn btn-outline-info ms-2" id="pl-ai"><i class="bi bi-stars me-1"></i>AI ขัดเกลา</button>
        </div>
      </div>

      <!-- Past Logs -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-clock-history me-2"></i>บันทึกที่ผ่านมา</div>
        <div class="card-body" id="pl-logs-list">
          ${logs.length === 0 ? '<p class="text-muted mb-0">ยังไม่มีบันทึก</p>' :
            logs.map(log => `
            <div class="border rounded-3 p-3 mb-2 bg-light">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <strong>${log.date}</strong>
                  ${log.classroom_name ? `<span class="badge bg-info ms-2">${DOMPurify.sanitize(log.classroom_name)}</span>` : ''}
                  ${log.subject_name ? `<span class="badge bg-primary ms-1">${DOMPurify.sanitize(log.subject_code)}</span>` : ''}
                  ${log.period ? `<span class="text-muted small ms-2">คาบ ${log.period}</span>` : ''}
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="App.modules['post-lesson'].deleteLog('${log.id}')"><i class="bi bi-trash"></i></button>
              </div>
              ${log.topic ? `<div class="mb-1"><strong>เนื้อหา:</strong> ${DOMPurify.sanitize(log.topic)}</div>` : ''}
              ${log.activities ? `<div class="mb-1 small"><strong>กิจกรรม:</strong> ${DOMPurify.sanitize(log.activities)}</div>` : ''}
              ${log.observations ? `<div class="mb-1 small text-success"><i class="bi bi-check-circle me-1"></i>${DOMPurify.sanitize(log.observations)}</div>` : ''}
              ${log.issues ? `<div class="mb-1 small text-danger"><i class="bi bi-exclamation-circle me-1"></i>${DOMPurify.sanitize(log.issues)}</div>` : ''}
              ${log.next_plan ? `<div class="small text-primary"><i class="bi bi-arrow-right me-1"></i>${DOMPurify.sanitize(log.next_plan)}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>`;

    // Save event
    document.getElementById('pl-save').addEventListener('click', () => this.save());
    document.getElementById('pl-ai').addEventListener('click', () => {
      const topic = document.getElementById('pl-topic').value;
      const obs = document.getElementById('pl-observations').value;
      const issues = document.getElementById('pl-issues').value;
      AIPanel.open('polish_post_lesson', { topic, observations: obs, issues, userInput: `ขัดเกลาบันทึกหลังสอน: ${topic || 'ยังไม่ได้กรอก'}` }, 'quick');
    });
  },

  async save() {
    const date = document.getElementById('pl-date').value;
    if (!date) { App.toast('กรุณาเลือกวันที่', 'warning'); return; }

    const semRes = await API.get('/api/semesters');
    const activeSem = semRes.success ? semRes.data.find(s => s.is_active) : null;

    const res = await API.post('/api/post-lesson', {
      date,
      classroom_id: document.getElementById('pl-classroom').value || null,
      subject_id: document.getElementById('pl-subject').value || null,
      period: document.getElementById('pl-period').value ? parseInt(document.getElementById('pl-period').value) : null,
      semester_id: activeSem?.id || null,
      topic: document.getElementById('pl-topic').value.trim(),
      activities: document.getElementById('pl-activities').value.trim(),
      observations: document.getElementById('pl-observations').value.trim(),
      issues: document.getElementById('pl-issues').value.trim(),
      next_plan: document.getElementById('pl-next').value.trim()
    });

    if (res.success) {
      App.toast('บันทึกหลังสอนสำเร็จ!');
      App.navigate('post-lesson'); // Reload to show new entry
    } else {
      App.toast(res.error || 'บันทึกไม่สำเร็จ', 'danger');
    }
  },

  async deleteLog(id) {
    if (!confirm('ลบบันทึกนี้?')) return;
    const res = await API.del(`/api/post-lesson/${id}`);
    if (res.success) {
      App.toast('ลบบันทึกแล้ว');
      App.navigate('post-lesson');
    } else {
      App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
    }
  }
};

// ==================== Register Schedule Module ====================

App.modules['schedule'] = {
  dayNames: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
  periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  periodTimes: [
    '08.20–09.10', '09.10–10.00', '10.20–11.10', '11.10–12.00',
    '12.20–13.10', '13.10–14.00', '14.00–14.50',
    '15.00–15.50', '15.50–16.40', '16.40–17.30'
  ],

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    this.subjects = subRes.success ? subRes.data : [];
    this.classrooms = clsRes.success ? clsRes.data : [];
    this.activeSemId = activeSem?.id || '';

    if (!activeSem) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบภาคเรียนที่เปิดใช้งาน กรุณาตั้งค่าภาคเรียนก่อน</div>';
      return;
    }

    const schedRes = await API.get(`/api/schedule?semester_id=${activeSem.id}`);
    this.slots = schedRes.success ? schedRes.data : [];

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-calendar-week me-2 text-primary"></i>ตารางสอน — ${activeSem.semester}/${activeSem.academic_year}</h4>
      <p class="text-muted small mb-3"><i class="bi bi-info-circle me-1"></i>กดช่องว่างเพื่อเพิ่มคาบ / กดช่องที่มีวิชาเพื่อลบ</p>
      <div class="table-responsive">
        <table class="table table-bordered text-center align-middle mb-0" id="schedule-grid">
          <thead class="table-primary">
            <tr>
              <th style="width:90px" rowspan="2">วัน / คาบ</th>
              ${this.periods.map(p => `<th style="min-width:90px">คาบ ${p}</th>`).join('')}
            </tr>
            <tr>
              ${this.periodTimes.map(t => `<th class="text-muted" style="font-size:0.65rem;font-weight:normal">${t}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${this.dayNames.map((day, idx) => `
            <tr>
              <td class="fw-semibold bg-light">${day}</td>
              ${this.periods.map(p => {
                const slot = this.slots.find(s => s.day_of_week === idx + 1 && s.period === p);
                if (slot) {
                  return `<td class="schedule-slot filled" data-id="${slot.id}" role="button" style="cursor:pointer;background:#e8f5e9">
                    <div class="fw-semibold small">${DOMPurify.sanitize(slot.subject_code)}</div>
                    <div class="text-muted" style="font-size:0.7rem">${DOMPurify.sanitize(slot.classroom_name)}</div>
                  </td>`;
                }
                return `<td class="schedule-slot empty" data-day="${idx + 1}" data-period="${p}" role="button" style="cursor:pointer" title="กดเพื่อเพิ่ม">
                  <span class="text-muted" style="font-size:0.75rem">—</span>
                </td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Add Modal -->
      <div class="modal fade" id="scheduleModal" tabindex="-1">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header">
              <h6 class="modal-title">เพิ่มคาบเรียน</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2" id="sched-modal-info"></div>
              <div class="mb-2">
                <label class="form-label small mb-1">วิชา</label>
                <select class="form-select" id="sched-subject">
                  ${this.subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
                </select>
              </div>
              <div class="mb-2">
                <label class="form-label small mb-1">ห้องเรียน</label>
                <select class="form-select" id="sched-classroom">
                  ${this.classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary btn-sm" id="sched-confirm"><i class="bi bi-check-lg me-1"></i>เพิ่ม</button>
            </div>
          </div>
        </div>
      </div>`;

    // Event: empty cell -> open modal
    container.querySelectorAll('.schedule-slot.empty').forEach(td => {
      td.addEventListener('click', () => this.openAddModal(parseInt(td.dataset.day), parseInt(td.dataset.period)));
    });
    // Event: filled cell -> delete
    container.querySelectorAll('.schedule-slot.filled').forEach(td => {
      td.addEventListener('click', () => this.removeSlot(td.dataset.id));
    });
    // Confirm add
    document.getElementById('sched-confirm').addEventListener('click', () => this.confirmAdd());
  },

  openAddModal(day, period) {
    this.pendingDay = day;
    this.pendingPeriod = period;
    document.getElementById('sched-modal-info').innerHTML =
      `<span class="badge bg-info">${this.dayNames[day - 1]}</span> <span class="badge bg-secondary">คาบ ${period}</span>`;
    const modal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    modal.show();
  },

  async confirmAdd() {
    const res = await API.post('/api/schedule', {
      semester_id: this.activeSemId,
      subject_id: document.getElementById('sched-subject').value,
      classroom_id: document.getElementById('sched-classroom').value,
      day_of_week: this.pendingDay,
      period: this.pendingPeriod
    });
    bootstrap.Modal.getInstance(document.getElementById('scheduleModal'))?.hide();
    if (res.success) {
      App.toast('เพิ่มคาบเรียนแล้ว');
      App.navigate('schedule');
    } else {
      App.toast(res.error || 'เพิ่มไม่สำเร็จ', 'danger');
    }
  },

  async removeSlot(id) {
    if (!confirm('ลบคาบนี้ออกจากตารางสอน?')) return;
    const res = await API.del(`/api/schedule/${id}`);
    if (res.success) {
      App.toast('ลบคาบแล้ว');
      App.navigate('schedule');
    } else {
      App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
    }
  }
};

// ==================== Register Student-Classroom Module ====================

App.modules['student-classroom'] = {
  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = clsRes.success ? clsRes.data : [];

    if (!activeSem) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบภาคเรียนที่เปิดใช้งาน</div>';
      return;
    }

    this.activeSemId = activeSem.id;

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-clipboard-check me-2 text-primary"></i>สั่งงาน / ตรวจงาน</h4>

      <!-- Select classroom + subject -->
      <div class="row g-2 mb-4">
        <div class="col-md-4">
          <select class="form-select" id="sc-classroom">
            <option value="">— เลือกห้องเรียน —</option>
            ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-4">
          <select class="form-select" id="sc-subject">
            <option value="">— เลือกวิชา —</option>
            ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-4">
          <button class="btn btn-primary w-100" id="sc-load"><i class="bi bi-search me-1"></i>ดูงาน</button>
        </div>
      </div>

      <!-- Post creation form (hidden by default) -->
      <div class="card border-0 shadow-sm mb-4 d-none" id="sc-form-card">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-plus-circle me-2"></i>สร้างงานใหม่</div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4">
              <label class="form-label small mb-1">ประเภท</label>
              <select class="form-select" id="sc-type">
                <option value="assignment">สั่งงาน</option>
                <option value="announcement">ประกาศ</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">กำหนดส่ง</label>
              <input type="date" class="form-control" id="sc-due">
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">คะแนนเต็ม</label>
              <input type="number" class="form-control" id="sc-max-score" placeholder="—">
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label small mb-1">หัวข้อ</label>
            <input type="text" class="form-control" id="sc-title" placeholder="เช่น ใบงานที่ 1 จังหวะดนตรี">
          </div>
          <div class="mb-2">
            <label class="form-label small mb-1">รายละเอียด</label>
            <textarea class="form-control" id="sc-content" rows="2" placeholder="คำอธิบาย..."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="sc-post-btn"><i class="bi bi-send me-1"></i>โพสต์</button>
        </div>
      </div>

      <!-- Posts list -->
      <div id="sc-posts-area"></div>`;

    document.getElementById('sc-load').addEventListener('click', () => this.loadPosts());
    document.getElementById('sc-post-btn').addEventListener('click', () => this.createPost());
  },

  async loadPosts() {
    const classroomId = document.getElementById('sc-classroom').value;
    const subjectId = document.getElementById('sc-subject').value;
    if (!classroomId || !subjectId) { App.toast('เลือกห้องเรียนและวิชาก่อน', 'warning'); return; }

    document.getElementById('sc-form-card').classList.remove('d-none');
    const area = document.getElementById('sc-posts-area');
    area.innerHTML = '<div class="loading"></div>';

    const res = await API.get(`/api/student-classroom/posts?classroom_id=${classroomId}&subject_id=${subjectId}`);
    const posts = res.success ? res.data : [];

    if (posts.length === 0) {
      area.innerHTML = '<p class="text-muted">ยังไม่มีงานสำหรับห้องนี้ — สร้างงานใหม่ด้านบน</p>';
      return;
    }

    area.innerHTML = posts.map(p => {
      const typeLabel = p.post_type === 'assignment' ? '<span class="badge bg-warning text-dark">สั่งงาน</span>' : '<span class="badge bg-info">ประกาศ</span>';
      const score = p.max_score ? `<span class="badge bg-secondary">${p.max_score} คะแนน</span>` : '';
      const due = p.due_date ? `<span class="text-muted small ms-2"><i class="bi bi-calendar me-1"></i>ส่ง ${p.due_date}</span>` : '';
      const subCount = p.post_type === 'assignment' ? `<span class="small text-muted ms-2">ส่งแล้ว ${p.submission_count || 0}/${p.total_students || '?'}</span>` : '';
      return `
      <div class="card border-0 shadow-sm mb-2">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              ${typeLabel} ${score}
              <strong class="ms-2">${DOMPurify.sanitize(p.title)}</strong>
              ${due} ${subCount}
            </div>
            <div>
              ${p.post_type === 'assignment' ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="App.modules['student-classroom'].viewSubs('${p.id}','${DOMPurify.sanitize(p.title)}')"><i class="bi bi-people"></i></button>` : ''}
              <button class="btn btn-sm btn-outline-danger" onclick="App.modules['student-classroom'].deletePost('${p.id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          ${p.content ? `<div class="small mt-2 text-muted">${DOMPurify.sanitize(p.content)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  async createPost() {
    const title = document.getElementById('sc-title').value.trim();
    if (!title) { App.toast('กรุณากรอกหัวข้อ', 'warning'); return; }

    const res = await API.post('/api/student-classroom/posts', {
      classroom_id: document.getElementById('sc-classroom').value,
      subject_id: document.getElementById('sc-subject').value,
      semester_id: this.activeSemId,
      post_type: document.getElementById('sc-type').value,
      title,
      content: document.getElementById('sc-content').value.trim(),
      due_date: document.getElementById('sc-due').value || null,
      max_score: document.getElementById('sc-max-score').value ? parseFloat(document.getElementById('sc-max-score').value) : null
    });

    if (res.success) {
      App.toast('สร้างงานสำเร็จ!');
      document.getElementById('sc-title').value = '';
      document.getElementById('sc-content').value = '';
      document.getElementById('sc-due').value = '';
      document.getElementById('sc-max-score').value = '';
      this.loadPosts();
    } else {
      App.toast(res.error || 'สร้างไม่สำเร็จ', 'danger');
    }
  },

  async viewSubs(postId, title) {
    const area = document.getElementById('sc-posts-area');
    area.innerHTML = '<div class="loading"></div>';

    const res = await API.get(`/api/student-classroom/submissions/${postId}`);
    const subs = res.success ? res.data : [];

    area.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-people me-2"></i>ผลงานส่ง — ${DOMPurify.sanitize(title)}</span>
          <button class="btn btn-sm btn-outline-secondary" onclick="App.modules['student-classroom'].loadPosts()"><i class="bi bi-arrow-left me-1"></i>กลับ</button>
        </div>
        <div class="card-body">
          ${subs.length === 0 ? '<p class="text-muted mb-0">ยังไม่มีนักเรียนส่งงาน</p>' :
          subs.map(s => {
            let filesHtml = '';
            if (s.file_urls) {
              try {
                const files = JSON.parse(s.file_urls);
                if (Array.isArray(files)) {
                  filesHtml = `<div class="d-flex flex-wrap gap-2 mt-2">${files.map(f =>
                    `<a href="${DOMPurify.sanitize(f.url || f)}" target="_blank" rel="noopener">
                      <img src="${DOMPurify.sanitize(f.thumbnail || f.url || f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #ddd" alt="${DOMPurify.sanitize(f.name || 'file')}">
                    </a>`
                  ).join('')}</div>`;
                }
              } catch(e) {
                filesHtml = `<div class="mt-2"><a href="${DOMPurify.sanitize(s.file_urls)}" target="_blank" rel="noopener"><i class="bi bi-link-45deg me-1"></i>ดูไฟล์</a></div>`;
              }
            }
            return `
            <div class="card border mb-3">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>${DOMPurify.sanitize(s.student_code || '')}</strong>
                    <span class="ms-2">${DOMPurify.sanitize(s.first_name || '')} ${DOMPurify.sanitize(s.last_name || '')}</span>
                  </div>
                  <div>
                    <span class="badge ${s.status === 'graded' ? 'bg-success' : 'bg-warning text-dark'}">${s.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ'}</span>
                    ${s.is_late ? '<span class="badge bg-danger ms-1">สาย</span>' : ''}
                  </div>
                </div>
                ${s.submission_text ? `<div class="bg-light rounded p-2 mb-2"><i class="bi bi-chat-text me-1 text-muted"></i>${DOMPurify.sanitize(s.submission_text)}</div>` : ''}
                ${s.submission_url ? `<div class="mb-2"><a href="${DOMPurify.sanitize(s.submission_url)}" target="_blank" rel="noopener"><i class="bi bi-link-45deg me-1"></i>${DOMPurify.sanitize(s.submission_url)}</a></div>` : ''}
                ${filesHtml}
                <div class="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                  <label class="small text-muted mb-0">คะแนน:</label>
                  <input type="number" class="form-control form-control-sm" style="width:80px" value="${s.score ?? ''}" id="score-${s.id}">
                  <label class="small text-muted mb-0">Feedback:</label>
                  <input type="text" class="form-control form-control-sm" placeholder="ความคิดเห็น..." value="${DOMPurify.sanitize(s.feedback || '')}" id="fb-${s.id}">
                  <button class="btn btn-sm btn-success" onclick="App.modules['student-classroom'].grade('${s.id}')"><i class="bi bi-check-lg me-1"></i>ให้คะแนน</button>
                </div>
                <small class="text-muted">ส่งเมื่อ ${s.submitted_at ? new Date(s.submitted_at).toLocaleString('th-TH') : '-'}</small>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  async grade(submissionId) {
    const scoreEl = document.getElementById(`score-${submissionId}`);
    const fbEl = document.getElementById(`fb-${submissionId}`);
    const res = await API.post('/api/student-classroom/grade', {
      submission_id: submissionId,
      score: scoreEl ? parseFloat(scoreEl.value) : null,
      feedback: fbEl ? fbEl.value.trim() : null
    });
    if (res.success) {
      App.toast('ให้คะแนนแล้ว');
    } else {
      App.toast(res.error || 'ให้คะแนนไม่สำเร็จ', 'danger');
    }
  },

  async deletePost(postId) {
    if (!confirm('ลบงานนี้?')) return;
    const res = await API.del(`/api/student-classroom/posts/${postId}`);
    if (res.success) {
      App.toast('ลบงานแล้ว');
      this.loadPosts();
    } else {
      App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
    }
  }
};

// ==================== Register Portfolio Module ====================

App.modules['portfolio'] = {
  categories: ['ภาพกิจกรรม', 'ผลงานนักเรียน', 'ผลงานครู', 'เอกสาร', 'วิดีโอ', 'อื่นๆ'],

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const res = await API.get('/api/portfolio');
    const items = res.success ? res.data : [];
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-collection me-2 text-primary"></i>เก็บผลงาน</h4>

      <!-- Add new item -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-plus-circle me-2"></i>เพิ่มผลงาน</div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-5">
              <input type="text" class="form-control" id="pf-title" placeholder="ชื่อผลงาน เช่น การแสดงคอนเสิร์ตปีใหม่">
            </div>
            <div class="col-md-3">
              <select class="form-select" id="pf-category">
                <option value="">— หมวดหมู่ —</option>
                ${this.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2">
              <input type="date" class="form-control" id="pf-date" value="${today}">
            </div>
            <div class="col-md-2">
              <button class="btn btn-primary w-100" id="pf-save"><i class="bi bi-plus-lg me-1"></i>เพิ่ม</button>
            </div>
          </div>
          <div class="mb-2">
            <textarea class="form-control" id="pf-desc" rows="2" placeholder="รายละเอียด (ไม่บังคับ)"></textarea>
          </div>
          <div class="mb-0">
            <input type="text" class="form-control" id="pf-url" placeholder="ลิงก์ไฟล์ / รูปภาพ / YouTube (ไม่บังคับ)">
          </div>
        </div>
      </div>

      <!-- Filter -->
      <div class="mb-3">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary active" data-filter="all">ทั้งหมด</button>
          ${this.categories.map(c => `<button class="btn btn-outline-primary" data-filter="${c}">${c}</button>`).join('')}
        </div>
      </div>

      <!-- Items list -->
      <div id="pf-items">
        ${this.renderItems(items)}
      </div>`;

    this.allItems = items;

    // Save event
    document.getElementById('pf-save').addEventListener('click', () => this.saveItem());
    // Filter events
    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const f = e.target.dataset.filter;
        const filtered = f === 'all' ? this.allItems : this.allItems.filter(i => i.category === f);
        document.getElementById('pf-items').innerHTML = this.renderItems(filtered);
      });
    });
  },

  renderItems(items) {
    if (items.length === 0) return '<p class="text-muted">ยังไม่มีผลงาน</p>';
    return items.map(item => {
      const catBadge = item.category ? `<span class="badge bg-secondary">${DOMPurify.sanitize(item.category)}</span>` : '';
      const star = item.is_featured ? '<i class="bi bi-star-fill text-warning me-1"></i>' : '<i class="bi bi-star text-muted me-1"></i>';
      return `
      <div class="card border-0 shadow-sm mb-2">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span role="button" onclick="App.modules['portfolio'].toggleFeatured('${item.id}', ${item.is_featured ? 0 : 1})">${star}</span>
              <strong>${DOMPurify.sanitize(item.title)}</strong>
              ${catBadge}
              ${item.date ? `<span class="text-muted small ms-2">${item.date}</span>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="App.modules['portfolio'].deleteItem('${item.id}')"><i class="bi bi-trash"></i></button>
          </div>
          ${item.description ? `<div class="small mt-1 text-muted">${DOMPurify.sanitize(item.description)}</div>` : ''}
          ${item.file_urls ? `<div class="small mt-1"><a href="${DOMPurify.sanitize(item.file_urls)}" target="_blank" rel="noopener"><i class="bi bi-link-45deg me-1"></i>ดูไฟล์</a></div>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  async saveItem() {
    const title = document.getElementById('pf-title').value.trim();
    if (!title) { App.toast('กรุณากรอกชื่อผลงาน', 'warning'); return; }

    const res = await API.post('/api/portfolio', {
      title,
      category: document.getElementById('pf-category').value || null,
      description: document.getElementById('pf-desc').value.trim() || null,
      file_urls: document.getElementById('pf-url').value.trim() || null,
      date: document.getElementById('pf-date').value || null
    });

    if (res.success) {
      App.toast('เพิ่มผลงานสำเร็จ!');
      App.navigate('portfolio');
    } else {
      App.toast(res.error || 'เพิ่มไม่สำเร็จ', 'danger');
    }
  },

  async toggleFeatured(id, val) {
    await API.put(`/api/portfolio/${id}`, { is_featured: val });
    App.navigate('portfolio');
  },

  async deleteItem(id) {
    if (!confirm('ลบผลงานนี้?')) return;
    const res = await API.del(`/api/portfolio/${id}`);
    if (res.success) {
      App.toast('ลบผลงานแล้ว');
      App.navigate('portfolio');
    } else {
      App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
    }
  }
};

// ==================== Register Course-Structure Module ====================

App.modules['course-structure'] = {
  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = clsRes.success ? clsRes.data : [];

    if (!activeSem) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบภาคเรียนที่เปิดใช้งาน</div>';
      return;
    }
    this.activeSemId = activeSem.id;

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-diagram-3 me-2 text-primary"></i>โครงสร้างรายวิชา</h4>
      <div class="row g-2 mb-4">
        <div class="col-md-4">
          <select class="form-select" id="cs-subject">
            <option value="">— เลือกวิชา —</option>
            ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-4">
          <select class="form-select" id="cs-classroom">
            <option value="">— เลือกห้องเรียน —</option>
            ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary w-100" id="cs-load"><i class="bi bi-search me-1"></i>โหลดโครงสร้าง</button>
        </div>
        <div class="col-md-3">
          <button class="btn btn-outline-info w-100" id="cs-ai"><i class="bi bi-stars me-1"></i>AI ร่างโครงสร้าง</button>
        </div>
      </div>
      <div id="cs-content"></div>`;

    document.getElementById('cs-load').addEventListener('click', () => this.loadStructure());
    document.getElementById('cs-ai').addEventListener('click', () => {
      const subEl = document.getElementById('cs-subject');
      const subName = subEl.options[subEl.selectedIndex]?.text || '';
      AIPanel.open('course_structure', { subject: subName }, 'chat');
    });
  },

  async loadStructure() {
    const subjectId = document.getElementById('cs-subject').value;
    const classroomId = document.getElementById('cs-classroom').value;
    if (!subjectId || !classroomId) { App.toast('เลือกวิชาและห้องเรียนก่อน', 'warning'); return; }

    const area = document.getElementById('cs-content');
    area.innerHTML = '<div class="loading"></div>';

    const res = await API.get(`/api/course-structure?subject_id=${subjectId}&classroom_id=${classroomId}`);
    const structures = res.success ? res.data : [];
    const cs = structures[0] || null;

    area.innerHTML = `
      <!-- Course info form -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-info-circle me-2"></i>ข้อมูลรายวิชา</div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-3">
              <label class="form-label small mb-1">จำนวนชั่วโมง</label>
              <input type="number" class="form-control" id="cs-hours" value="${cs?.total_hours || ''}" placeholder="40">
            </div>
            <div class="col-md-9">
              <label class="form-label small mb-1">สัดส่วนคะแนน</label>
              <input type="text" class="form-control" id="cs-score-dist" value="${DOMPurify.sanitize(cs?.score_distribution || '')}" placeholder="เช่น คะแนนระหว่างเรียน 70 : สอบปลายภาค 30">
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label small mb-1">จุดประสงค์การเรียนรู้</label>
            <textarea class="form-control" id="cs-objectives" rows="2" placeholder="ตัวชี้วัด / ผลการเรียนรู้ที่คาดหวัง">${DOMPurify.sanitize(cs?.learning_objectives || '')}</textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="cs-save"><i class="bi bi-check-lg me-1"></i>บันทึกโครงสร้าง</button>
        </div>
      </div>

      <!-- Units -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-list-ol me-2"></i>หน่วยการเรียนรู้</span>
          ${cs ? `<button class="btn btn-sm btn-outline-primary" id="cs-add-unit"><i class="bi bi-plus-lg me-1"></i>เพิ่มหน่วย</button>` : ''}
        </div>
        <div class="card-body" id="cs-units-area">
          ${cs ? '<div class="loading"></div>' : '<p class="text-muted mb-0">บันทึกโครงสร้างก่อนเพื่อเพิ่มหน่วยการเรียนรู้</p>'}
        </div>
      </div>`;

    document.getElementById('cs-save').addEventListener('click', () => this.saveStructure(subjectId, classroomId));

    if (cs) {
      this.currentCSId = cs.id;
      document.getElementById('cs-add-unit').addEventListener('click', () => this.addUnit());
      this.loadUnits(cs.id);
    }
  },

  async saveStructure(subjectId, classroomId) {
    const res = await API.post('/api/course-structure', {
      subject_id: subjectId,
      classroom_id: classroomId,
      semester_id: this.activeSemId,
      total_hours: document.getElementById('cs-hours').value ? parseFloat(document.getElementById('cs-hours').value) : null,
      score_distribution: document.getElementById('cs-score-dist').value.trim(),
      learning_objectives: document.getElementById('cs-objectives').value.trim()
    });
    if (res.success) {
      App.toast(res.data.updated ? 'อัพเดตโครงสร้างแล้ว' : 'สร้างโครงสร้างแล้ว!');
      this.loadStructure();
    } else {
      App.toast(res.error || 'บันทึกไม่สำเร็จ', 'danger');
    }
  },

  async loadUnits(csId) {
    const res = await API.get(`/api/course-structure/units/${csId}`);
    const units = res.success ? res.data : [];
    const area = document.getElementById('cs-units-area');
    if (units.length === 0) {
      area.innerHTML = '<p class="text-muted mb-0">ยังไม่มีหน่วยการเรียนรู้ — กดปุ่ม "เพิ่มหน่วย"</p>';
      return;
    }
    area.innerHTML = units.map(u => `
      <div class="border rounded-3 p-3 mb-2 bg-light d-flex justify-content-between align-items-start">
        <div>
          <strong>หน่วยที่ ${u.unit_number}:</strong> ${DOMPurify.sanitize(u.title)}
          ${u.hours ? `<span class="badge bg-info ms-2">${u.hours} ชม.</span>` : ''}
          ${u.description ? `<div class="small text-muted mt-1">${DOMPurify.sanitize(u.description)}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="App.modules['course-structure'].deleteUnit('${u.id}')"><i class="bi bi-trash"></i></button>
      </div>`).join('');
  },

  async addUnit() {
    const title = prompt('ชื่อหน่วยการเรียนรู้:');
    if (!title) return;
    const num = prompt('หน่วยที่:', '1');
    const hours = prompt('จำนวนชั่วโมง:', '');
    const res = await API.post('/api/course-structure/units', {
      course_structure_id: this.currentCSId,
      title,
      unit_number: parseInt(num) || 1,
      hours: hours ? parseFloat(hours) : null
    });
    if (res.success) {
      App.toast('เพิ่มหน่วยแล้ว');
      this.loadUnits(this.currentCSId);
    } else {
      App.toast(res.error || 'เพิ่มไม่สำเร็จ', 'danger');
    }
  },

  async deleteUnit(id) {
    if (!confirm('ลบหน่วยนี้?')) return;
    const res = await API.del(`/api/course-structure/units/${id}`);
    if (res.success) { App.toast('ลบหน่วยแล้ว'); this.loadUnits(this.currentCSId); }
    else App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
  }
};

// ==================== Register Lesson Plan Module ====================

App.modules['lesson-plan'] = {
  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const activeSem = (semRes.success ? semRes.data : []).find(s => s.is_active);
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = clsRes.success ? clsRes.data : [];

    if (!activeSem) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบภาคเรียนที่เปิดใช้งาน</div>';
      return;
    }
    this.activeSemId = activeSem.id;
    this.subjects = subjects;
    this.classrooms = classrooms;

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-journal-text me-2 text-primary"></i>แผนการจัดการเรียนรู้</h4>
      <p class="text-muted small mb-3">เลือกวิชาเพื่อดูหน่วยการเรียนรู้ แล้วกดเขียนแผน</p>
      <div class="row g-2 mb-4">
        <div class="col-md-3">
          <select class="form-select" id="lp-subject">
            <option value="">— เลือกวิชา —</option>
            ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="lp-classroom">
            <option value="">— เลือกห้องเรียน —</option>
            ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary w-100" id="lp-load"><i class="bi bi-search me-1"></i>โหลดแผน</button>
        </div>
        <div class="col-md-3">
          <button class="btn btn-outline-info w-100" id="lp-ai"><i class="bi bi-stars me-1"></i>AI ร่างแผนสอน</button>
        </div>
      </div>
      <div id="lp-content"></div>`;

    document.getElementById('lp-load').addEventListener('click', () => this.loadPlans());
    document.getElementById('lp-ai').addEventListener('click', () => {
      const subEl = document.getElementById('lp-subject');
      const subName = subEl.options[subEl.selectedIndex]?.text || '';
      AIPanel.open('lesson_plan', { subject: subName }, 'chat');
    });
  },

  async loadPlans() {
    const subjectId = document.getElementById('lp-subject').value;
    const classroomId = document.getElementById('lp-classroom').value;
    if (!subjectId || !classroomId) { App.toast('เลือกวิชาและห้องเรียนก่อน', 'warning'); return; }

    const area = document.getElementById('lp-content');
    area.innerHTML = '<div class="loading"></div>';

    // Get course structure + units first
    const csRes = await API.get(`/api/course-structure?subject_id=${subjectId}&classroom_id=${classroomId}`);
    const cs = (csRes.success ? csRes.data : [])[0];

    if (!cs) {
      area.innerHTML = '<div class="alert alert-info">ยังไม่มีโครงสร้างรายวิชา — กรุณาไปตั้งค่าที่เมนู "โครงสร้างรายวิชา" ก่อน</div>';
      return;
    }

    const unitsRes = await API.get(`/api/course-structure/units/${cs.id}`);
    const units = unitsRes.success ? unitsRes.data : [];
    this.units = units;

    if (units.length === 0) {
      area.innerHTML = '<div class="alert alert-info">ยังไม่มีหน่วยการเรียนรู้ — กรุณาไปเพิ่มที่ "โครงสร้างรายวิชา" ก่อน</div>';
      return;
    }

    // Get all plans for this teacher
    const plansRes = await API.get('/api/lesson-plan');
    const allPlans = plansRes.success ? plansRes.data : [];

    area.innerHTML = units.map(u => {
      const unitPlans = allPlans.filter(p => p.learning_unit_id === u.id);
      return `
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold">หน่วยที่ ${u.unit_number}: ${DOMPurify.sanitize(u.title)}</span>
          <button class="btn btn-sm btn-outline-primary" onclick="App.modules['lesson-plan'].showCreateForm('${u.id}', ${u.unit_number})"><i class="bi bi-plus-lg me-1"></i>เขียนแผน</button>
        </div>
        <div class="card-body">
          ${unitPlans.length === 0 ? '<p class="text-muted small mb-0">ยังไม่มีแผนสำหรับหน่วยนี้</p>' :
          unitPlans.map(p => `
            <div class="border rounded-3 p-2 mb-2 bg-light d-flex justify-content-between align-items-start">
              <div>
                <strong>แผนที่ ${p.plan_number || '-'}:</strong> ${DOMPurify.sanitize(p.title)}
                ${p.date ? `<span class="text-muted small ms-2">${p.date}</span>` : ''}
                ${p.period ? `<span class="badge bg-secondary ms-1">คาบ ${p.period}</span>` : ''}
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="App.modules['lesson-plan'].deletePlan('${p.id}')"><i class="bi bi-trash"></i></button>
            </div>`).join('')}
        </div>
      </div>`;
    }).join('');
  },

  showCreateForm(unitId, unitNum) {
    const area = document.getElementById('lp-content');
    area.insertAdjacentHTML('afterbegin', `
    <div class="card border-0 shadow-sm mb-3 border-primary" id="lp-form-card" style="border-left:4px solid var(--bs-primary)!important">
      <div class="card-header bg-white fw-semibold"><i class="bi bi-pencil me-2"></i>เขียนแผนใหม่ — หน่วยที่ ${unitNum}</div>
      <div class="card-body">
        <div class="row g-2 mb-2">
          <div class="col-md-3">
            <label class="form-label small mb-1">แผนที่</label>
            <input type="number" class="form-control" id="lp-num" value="1">
          </div>
          <div class="col-md-5">
            <label class="form-label small mb-1">ชื่อแผน</label>
            <input type="text" class="form-control" id="lp-title" placeholder="เช่น การฝึกจังหวะ 4/4">
          </div>
          <div class="col-md-2">
            <label class="form-label small mb-1">วันที่</label>
            <input type="date" class="form-control" id="lp-date">
          </div>
          <div class="col-md-2">
            <label class="form-label small mb-1">คาบ</label>
            <input type="number" class="form-control" id="lp-period" min="1" max="8">
          </div>
        </div>
        <div class="mb-2">
          <label class="form-label small mb-1">จุดประสงค์</label>
          <textarea class="form-control" id="lp-objectives" rows="2" placeholder="นักเรียนสามารถ..."></textarea>
        </div>
        <div class="mb-2">
          <label class="form-label small mb-1">เนื้อหา</label>
          <textarea class="form-control" id="lp-content-text" rows="2" placeholder="เนื้อหาที่สอน..."></textarea>
        </div>
        <div class="mb-2">
          <label class="form-label small mb-1">ขั้นตอนการเรียนรู้</label>
          <textarea class="form-control" id="lp-steps" rows="3" placeholder="ขั้นนำ: ...&#10;ขั้นสอน: ...&#10;ขั้นสรุป: ..."></textarea>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-md-6">
            <label class="form-label small mb-1">สื่อ/อุปกรณ์</label>
            <input type="text" class="form-control" id="lp-materials" placeholder="เช่น กลอง, คีย์บอร์ด, ใบงาน">
          </div>
          <div class="col-md-6">
            <label class="form-label small mb-1">การวัดผล</label>
            <input type="text" class="form-control" id="lp-assessment" placeholder="เช่น สังเกตการปฏิบัติ, ใบงาน">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="App.modules['lesson-plan'].savePlan('${unitId}')"><i class="bi bi-check-lg me-1"></i>บันทึกแผน</button>
        <button class="btn btn-outline-secondary btn-sm ms-1" onclick="document.getElementById('lp-form-card').remove()">ยกเลิก</button>
      </div>
    </div>`);
    document.getElementById('lp-title').focus();
  },

  async savePlan(unitId) {
    const title = document.getElementById('lp-title').value.trim();
    if (!title) { App.toast('กรุณากรอกชื่อแผน', 'warning'); return; }

    // Need a lesson_model_id — create a default one if none exists
    let modelId = this._defaultModelId;
    if (!modelId) {
      modelId = 'model-default';
    }

    const res = await API.post('/api/lesson-plan', {
      learning_unit_id: unitId,
      semester_id: this.activeSemId,
      lesson_model_id: modelId,
      plan_number: parseInt(document.getElementById('lp-num').value) || 1,
      title,
      date: document.getElementById('lp-date').value || null,
      period: document.getElementById('lp-period').value ? parseInt(document.getElementById('lp-period').value) : null,
      objectives: document.getElementById('lp-objectives').value.trim(),
      content: document.getElementById('lp-content-text').value.trim(),
      steps: document.getElementById('lp-steps').value.trim(),
      materials: document.getElementById('lp-materials').value.trim(),
      assessment_notes: document.getElementById('lp-assessment').value.trim()
    });

    if (res.success) {
      App.toast('บันทึกแผนสำเร็จ!');
      this.loadPlans();
    } else {
      App.toast(res.error || 'บันทึกไม่สำเร็จ', 'danger');
    }
  },

  async deletePlan(id) {
    if (!confirm('ลบแผนนี้?')) return;
    const res = await API.del(`/api/lesson-plan/${id}`);
    if (res.success) { App.toast('ลบแผนแล้ว'); this.loadPlans(); }
    else App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
  }
};

// ==================== Register Classroom-Materials Module ====================

App.modules['classroom-materials'] = {
  types: ['ใบงาน', 'วิดีโอ', 'เสียง', 'สไลด์', 'เอกสาร', 'อื่นๆ'],

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [subRes, matRes] = await Promise.all([
      API.get('/api/subjects'),
      API.get('/api/classroom-materials')
    ]);

    const subjects = subRes.success ? subRes.data : [];
    const materials = matRes.success ? matRes.data : [];

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-folder2-open me-2 text-primary"></i>สื่อการสอน</h4>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-plus-circle me-2"></i>เพิ่มสื่อ</div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4">
              <input type="text" class="form-control" id="mat-title" placeholder="ชื่อสื่อ เช่น ใบงานจังหวะดนตรี">
            </div>
            <div class="col-md-3">
              <select class="form-select" id="mat-type">
                <option value="">— ประเภท —</option>
                ${this.types.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-3">
              <select class="form-select" id="mat-subject">
                <option value="">— วิชา (ไม่บังคับ) —</option>
                ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-2">
              <button class="btn btn-primary w-100" id="mat-save"><i class="bi bi-plus-lg"></i></button>
            </div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">
              <input type="text" class="form-control" id="mat-url" placeholder="ลิงก์ไฟล์ / Google Drive / YouTube (ไม่บังคับ)">
            </div>
            <div class="col-md-6">
              <input type="text" class="form-control" id="mat-desc" placeholder="รายละเอียด (ไม่บังคับ)">
            </div>
          </div>
        </div>
      </div>

      <div id="mat-list">
        ${materials.length === 0 ? '<p class="text-muted">ยังไม่มีสื่อ</p>' :
        materials.map(m => `
          <div class="card border-0 shadow-sm mb-2">
            <div class="card-body p-3 d-flex justify-content-between align-items-start">
              <div>
                <strong>${DOMPurify.sanitize(m.title)}</strong>
                ${m.material_type ? `<span class="badge bg-secondary ms-2">${DOMPurify.sanitize(m.material_type)}</span>` : ''}
                ${m.subject_code ? `<span class="badge bg-primary ms-1">${DOMPurify.sanitize(m.subject_code)}</span>` : ''}
                ${m.description ? `<div class="small text-muted mt-1">${DOMPurify.sanitize(m.description)}</div>` : ''}
                ${m.file_url ? `<div class="small mt-1"><a href="${DOMPurify.sanitize(m.file_url)}" target="_blank" rel="noopener"><i class="bi bi-link-45deg"></i> ดูสื่อ</a></div>` : ''}
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="App.modules['classroom-materials'].deleteMat('${m.id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>`).join('')}
      </div>`;

    document.getElementById('mat-save').addEventListener('click', () => this.saveMat());
  },

  async saveMat() {
    const title = document.getElementById('mat-title').value.trim();
    if (!title) { App.toast('กรุณากรอกชื่อสื่อ', 'warning'); return; }

    const res = await API.post('/api/classroom-materials', {
      title,
      material_type: document.getElementById('mat-type').value || null,
      subject_id: document.getElementById('mat-subject').value || null,
      file_url: document.getElementById('mat-url').value.trim() || null,
      description: document.getElementById('mat-desc').value.trim() || null
    });

    if (res.success) {
      App.toast('เพิ่มสื่อสำเร็จ!');
      App.navigate('classroom-materials');
    } else {
      App.toast(res.error || 'เพิ่มไม่สำเร็จ', 'danger');
    }
  },

  async deleteMat(id) {
    if (!confirm('ลบสื่อนี้?')) return;
    const res = await API.del(`/api/classroom-materials/${id}`);
    if (res.success) { App.toast('ลบสื่อแล้ว'); App.navigate('classroom-materials'); }
    else App.toast(res.error || 'ลบไม่สำเร็จ', 'danger');
  }
};

// ==================== Register Scores Module ====================

App.modules['scores'] = {
  scoreTypes: ['เก็บคะแนน', 'สอบย่อย', 'สอบกลางภาค', 'สอบปลายภาค', 'ปฏิบัติ', 'จิตพิสัย', 'อื่นๆ'],

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms')
    ]);

    const activeSem = (semRes.success ? semRes.data : []).find(s => s.is_active);
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = clsRes.success ? clsRes.data : [];

    if (!activeSem) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบภาคเรียนที่เปิดใช้งาน</div>';
      return;
    }
    this.activeSemId = activeSem.id;

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-graph-up me-2 text-primary"></i>คะแนน</h4>

      <div class="row g-2 mb-4">
        <div class="col-md-3">
          <select class="form-select" id="sc2-classroom">
            <option value="">— ห้องเรียน —</option>
            ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="sc2-subject">
            <option value="">— วิชา —</option>
            ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="sc2-type">
            ${this.scoreTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary w-100" id="sc2-load"><i class="bi bi-search me-1"></i>โหลดรายชื่อ</button>
        </div>
      </div>

      <div id="sc2-content"></div>`;

    document.getElementById('sc2-load').addEventListener('click', () => this.loadStudents());
  },

  async loadStudents() {
    const classroomId = document.getElementById('sc2-classroom').value;
    const subjectId = document.getElementById('sc2-subject').value;
    if (!classroomId || !subjectId) { App.toast('เลือกห้องเรียนและวิชาก่อน', 'warning'); return; }

    const area = document.getElementById('sc2-content');
    area.innerHTML = '<div class="loading"></div>';

    this.classroomId = classroomId;
    this.subjectId = subjectId;

    const stRes = await API.get(`/api/students?classroom_id=${classroomId}&limit=9999`);
    const students = stRes.success ? stRes.data : [];

    if (students.length === 0) {
      area.innerHTML = '<p class="text-muted">ไม่พบนักเรียนในห้องนี้</p>';
      return;
    }

    area.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold"><i class="bi bi-pencil-square me-2"></i>ลงคะแนน — <span id="sc2-type-label">${document.getElementById('sc2-type').value}</span></span>
          <div>
            <label class="me-2 small">คะแนนเต็ม:</label>
            <input type="number" class="form-control form-control-sm d-inline-block" style="width:80px" id="sc2-max" value="10">
          </div>
        </div>
        <div class="card-body p-0">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light">
              <tr><th style="width:60px">เลขที่</th><th>ชื่อ-นามสกุล</th><th style="width:100px">คะแนน</th></tr>
            </thead>
            <tbody>
              ${students.map(s => `
              <tr>
                <td>${DOMPurify.sanitize(s.student_code)}</td>
                <td>${DOMPurify.sanitize(s.first_name)} ${DOMPurify.sanitize(s.last_name)}</td>
                <td><input type="number" class="form-control form-control-sm score-input" data-sid="${s.id}" step="0.5" min="0"></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer bg-white">
          <button class="btn btn-primary" id="sc2-save"><i class="bi bi-check-lg me-1"></i>บันทึกคะแนน</button>
          <button class="btn btn-outline-info ms-2" id="sc2-view-summary"><i class="bi bi-bar-chart me-1"></i>ดูสรุป</button>
          <button class="btn btn-outline-secondary ms-2" id="sc2-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
        </div>
      </div>`;

    document.getElementById('sc2-save').addEventListener('click', () => this.saveScores());
    document.getElementById('sc2-view-summary').addEventListener('click', () => this.viewSummary());
    document.getElementById('sc2-export').addEventListener('click', () => {
      const rows = [];
      document.querySelectorAll('.score-input').forEach(inp => {
        const tr = inp.closest('tr');
        const code = tr.querySelector('td:first-child')?.textContent || '';
        const name = tr.querySelector('td:nth-child(2)')?.textContent || '';
        const score = inp.value || '';
        rows.push({ code, name, score });
      });
      const type = document.getElementById('sc2-type').value;
      Exporter.showExportDialog(`คะแนน${type}`, rows, {
        headers: ['code', 'name', 'score'],
        headerLabels: ['รหัส', 'ชื่อ-สกุล', 'คะแนน']
      });
    });
  },

  async saveScores() {
    const maxScore = parseFloat(document.getElementById('sc2-max').value);
    if (!maxScore) { App.toast('กรุณาระบุคะแนนเต็ม', 'warning'); return; }

    const records = [];
    document.querySelectorAll('.score-input').forEach(inp => {
      if (inp.value !== '') {
        records.push({ student_id: inp.dataset.sid, score: parseFloat(inp.value) });
      }
    });

    if (records.length === 0) { App.toast('ยังไม่ได้กรอกคะแนน', 'warning'); return; }

    const res = await API.post('/api/scores', {
      subject_id: this.subjectId,
      classroom_id: this.classroomId,
      semester_id: this.activeSemId,
      score_type: document.getElementById('sc2-type').value,
      max_score: maxScore,
      records
    });

    if (res.success) {
      App.toast(`บันทึกคะแนน ${res.data.saved} คน สำเร็จ!`);
    } else {
      App.toast(res.error || 'บันทึกไม่สำเร็จ', 'danger');
    }
  },

  async viewSummary() {
    const area = document.getElementById('sc2-content');
    area.innerHTML = '<div class="loading"></div>';

    const res = await API.get(`/api/scores/summary?subject_id=${this.subjectId}&classroom_id=${this.classroomId}&semester_id=${this.activeSemId}`);
    const rows = res.success ? res.data : [];

    if (rows.length === 0) {
      area.innerHTML = '<p class="text-muted">ยังไม่มีคะแนนสำหรับวิชา/ห้องนี้</p>';
      return;
    }

    area.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-bar-chart me-2"></i>สรุปคะแนนรวม</div>
        <div class="card-body p-0">
          <table class="table table-sm table-striped align-middle mb-0">
            <thead class="table-primary">
              <tr><th>รหัส</th><th>ชื่อ</th><th>คะแนนรวม</th><th>เต็มรวม</th><th>%</th><th>จำนวนรายการ</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => {
                const pct = r.total_max > 0 ? ((r.total_score / r.total_max) * 100).toFixed(1) : '-';
                return `<tr>
                  <td>${DOMPurify.sanitize(r.student_code)}</td>
                  <td>${DOMPurify.sanitize(r.first_name)} ${DOMPurify.sanitize(r.last_name)}</td>
                  <td class="fw-semibold">${r.total_score}</td>
                  <td>${r.total_max}</td>
                  <td>${pct}%</td>
                  <td>${r.score_count}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer bg-white">
          <button class="btn btn-outline-secondary btn-sm" onclick="App.modules['scores'].loadStudents()"><i class="bi bi-arrow-left me-1"></i>กลับลงคะแนน</button>
        </div>
      </div>`;
  }
};

// ==================== Register Grade-Result Module ====================

App.modules['grade-result'] = {
  gradeScale: [
    { grade: '4', label: '4 (A)', min: 80 },
    { grade: '3.5', label: '3.5 (B+)', min: 75 },
    { grade: '3', label: '3 (B)', min: 70 },
    { grade: '2.5', label: '2.5 (C+)', min: 65 },
    { grade: '2', label: '2 (C)', min: 60 },
    { grade: '1.5', label: '1.5 (D+)', min: 55 },
    { grade: '1', label: '1 (D)', min: 50 },
    { grade: '0', label: '0 (F)', min: 0 }
  ],

  calcGrade(pct) {
    for (const g of this.gradeScale) {
      if (pct >= g.min) return g.grade;
    }
    return '0';
  },

  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, clsRes, cfgRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms'),
      API.get('/api/grade-result/configs')
    ]);

    const activeSem = (semRes.success ? semRes.data : []).find(s => s.is_active);
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = clsRes.success ? clsRes.data : [];
    const configs = cfgRes.success ? cfgRes.data : [];

    if (!activeSem) {
      container.innerHTML = '<div class="alert alert-warning">ไม่พบภาคเรียนที่เปิดใช้งาน</div>';
      return;
    }
    this.activeSemId = activeSem.id;
    this.configs = configs;

    // Auto-create default config if none
    if (configs.length === 0) {
      const defRes = await API.post('/api/grade-result/configs', {
        name: 'เกณฑ์ 8 ระดับ (มาตรฐาน)',
        config_type: '8-level',
        config_data: JSON.stringify(this.gradeScale),
        is_default: true
      });
      if (defRes.success) this.configs = [{ id: defRes.data.id, name: 'เกณฑ์ 8 ระดับ (มาตรฐาน)' }];
    }

    container.innerHTML = `
      <h4 class="fw-bold mb-4"><i class="bi bi-award me-2 text-primary"></i>ผลการเรียน / เกรด</h4>
      <p class="text-muted small mb-3">ระบบจะคำนวณเกรดจากคะแนนรวมที่ลงไว้ในเมนู "คะแนน"</p>

      <div class="row g-2 mb-4">
        <div class="col-md-3">
          <select class="form-select" id="gr-classroom">
            <option value="">— ห้องเรียน —</option>
            ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="gr-subject">
            <option value="">— วิชา —</option>
            ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.code)} ${DOMPurify.sanitize(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <select class="form-select" id="gr-config">
            ${this.configs.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3">
          <button class="btn btn-primary w-100" id="gr-calc"><i class="bi bi-calculator me-1"></i>คำนวณเกรด</button>
        </div>
      </div>

      <div id="gr-content"></div>`;

    document.getElementById('gr-calc').addEventListener('click', () => this.calculate());
  },

  async calculate() {
    const classroomId = document.getElementById('gr-classroom').value;
    const subjectId = document.getElementById('gr-subject').value;
    if (!classroomId || !subjectId) { App.toast('เลือกห้องเรียนและวิชา', 'warning'); return; }

    this.classroomId = classroomId;
    this.subjectId = subjectId;

    const area = document.getElementById('gr-content');
    area.innerHTML = '<div class="loading"></div>';

    const sumRes = await API.get(`/api/scores/summary?subject_id=${subjectId}&classroom_id=${classroomId}&semester_id=${this.activeSemId}`);
    const rows = sumRes.success ? sumRes.data : [];

    if (rows.length === 0) {
      area.innerHTML = '<div class="alert alert-info">ยังไม่มีคะแนนสำหรับวิชา/ห้องนี้ — กรุณาไปลงคะแนนที่เมนู "คะแนน" ก่อน</div>';
      return;
    }

    // Calculate grades
    this.gradeRecords = rows.map(r => {
      const pct = r.total_max > 0 ? (r.total_score / r.total_max) * 100 : 0;
      return { ...r, pct: pct.toFixed(1), grade: this.calcGrade(pct) };
    });

    area.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold"><i class="bi bi-table me-2"></i>ผลการคำนวณเกรด</div>
        <div class="card-body p-0">
          <table class="table table-sm table-striped align-middle mb-0">
            <thead class="table-success">
              <tr><th>รหัส</th><th>ชื่อ</th><th>คะแนนรวม</th><th>%</th><th>เกรด</th></tr>
            </thead>
            <tbody>
              ${this.gradeRecords.map(r => `
              <tr>
                <td>${DOMPurify.sanitize(r.student_code)}</td>
                <td>${DOMPurify.sanitize(r.first_name)} ${DOMPurify.sanitize(r.last_name)}</td>
                <td>${r.total_score} / ${r.total_max}</td>
                <td>${r.pct}%</td>
                <td><span class="badge ${parseFloat(r.grade) >= 2 ? 'bg-success' : parseFloat(r.grade) >= 1 ? 'bg-warning text-dark' : 'bg-danger'} fs-6">${r.grade}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer bg-white d-flex align-items-center flex-wrap gap-2">
          <button class="btn btn-success" id="gr-save"><i class="bi bi-check-lg me-1"></i>บันทึกเกรด</button>
          <button class="btn btn-outline-secondary" id="gr-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
          <button class="btn btn-outline-primary" id="gr-pp5"><i class="bi bi-file-earmark-pdf me-1"></i>ปพ.5</button>
          <span class="text-muted small ms-auto">เกณฑ์: 4=80+ 3.5=75+ 3=70+ 2.5=65+ 2=60+ 1.5=55+ 1=50+ 0=ต่ำกว่า50</span>
        </div>
      </div>`;

    document.getElementById('gr-save').addEventListener('click', () => this.saveGrades());
    document.getElementById('gr-export').addEventListener('click', () => {
      const data = this.gradeRecords.map(r => [r.student_code, `${r.first_name} ${r.last_name}`, `${r.total_score}/${r.total_max}`, `${r.pct}%`, r.grade]);
      Exporter.showExportDialog('ผลการเรียน', data, { headers: ['code','name','score','pct','grade'], headerLabels: ['รหัส','ชื่อ-สกุล','คะแนนรวม','%','เกรด'] });
    });
    document.getElementById('gr-pp5').addEventListener('click', () => this.exportPP5());
  },

  async saveGrades() {
    const configId = document.getElementById('gr-config').value;
    if (!configId) { App.toast('เลือกเกณฑ์การตัดเกรด', 'warning'); return; }

    const records = this.gradeRecords.map(r => ({
      student_id: r.student_id,
      raw_score: r.total_score,
      grade: r.grade
    }));

    const res = await API.post('/api/grade-result', {
      subject_id: this.subjectId,
      classroom_id: this.classroomId,
      semester_id: this.activeSemId,
      grade_config_id: configId,
      is_final: false,
      records
    });

    if (res.success) {
      App.toast(`บันทึกเกรด ${res.data.saved} คน สำเร็จ!`);
    } else {
      App.toast(res.error || 'บันทึกไม่สำเร็จ', 'danger');
    }
  },

  exportPP5() {
    if (!this.gradeRecords?.length) { App.toast('ยังไม่มีข้อมูลเกรด', 'warning'); return; }
    const subEl = document.getElementById('gr-subject');
    const clsEl = document.getElementById('gr-classroom');
    const subjectName = subEl.options[subEl.selectedIndex]?.text || '';
    const classroomName = clsEl.options[clsEl.selectedIndex]?.text || '';

    // Create PDF using jsPDF
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      App.toast('กำลังโหลด jsPDF...', 'info');
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => this._generatePP5PDF(subjectName, classroomName);
      document.head.appendChild(s);
      return;
    }
    this._generatePP5PDF(subjectName, classroomName);
  },

  _generatePP5PDF(subjectName, classroomName) {
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(16);
    doc.text('PP.5 - Grade Report', 148, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Subject: ${subjectName}`, 14, 25);
    doc.text(`Classroom: ${classroomName}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString('th-TH')}`, 240, 25);

    // Table header
    const startY = 40;
    const colWidths = [10, 25, 60, 30, 25, 25, 40];
    const headers = ['#', 'Code', 'Name', 'Score', '%', 'Grade', 'Remark'];
    let y = startY;

    doc.setFillColor(40, 167, 69);
    doc.setTextColor(255);
    doc.rect(14, y, 267, 8, 'F');
    doc.setFontSize(10);
    let x = 16;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5.5);
      x += colWidths[i];
    });

    // Table rows
    doc.setTextColor(0);
    y += 8;
    this.gradeRecords.forEach((r, idx) => {
      if (y > 185) {
        doc.addPage();
        y = 15;
      }
      const bg = idx % 2 === 0 ? 245 : 255;
      doc.setFillColor(bg, bg, bg);
      doc.rect(14, y, 267, 7, 'F');
      x = 16;
      const row = [
        String(idx + 1),
        r.student_code || '',
        `${r.first_name} ${r.last_name}`,
        `${r.total_score}/${r.total_max}`,
        `${r.pct}%`,
        r.grade,
        parseFloat(r.grade) === 0 ? 'Failed' : ''
      ];
      doc.setFontSize(9);
      row.forEach((cell, i) => {
        doc.text(String(cell).substring(0, 35), x, y + 5);
        x += colWidths[i];
      });
      y += 7;
    });

    // Summary
    y += 5;
    const total = this.gradeRecords.length;
    const passed = this.gradeRecords.filter(r => parseFloat(r.grade) > 0).length;
    doc.setFontSize(10);
    doc.text(`Total: ${total} students | Passed: ${passed} | Failed: ${total - passed} | Pass rate: ${((passed/total)*100).toFixed(1)}%`, 14, y + 5);

    // Signature lines
    y += 20;
    doc.line(30, y, 90, y);
    doc.text('Instructor', 50, y + 5);
    doc.line(120, y, 180, y);
    doc.text('Head of Department', 135, y + 5);
    doc.line(210, y, 270, y);
    doc.text('Director', 232, y + 5);

    doc.save(`PP5-${classroomName}-${subjectName}.pdf`);
    App.toast('ส่งออก ปพ.5 สำเร็จ!');
  }
};

// ==================== Assessment Module ====================
App.modules['assessment'] = {
  async render(area) {
    const [subRes, toolRes] = await Promise.all([
      API.get('/api/subjects'), API.get('/api/assessment')
    ]);
    const subjects = subRes.success ? subRes.data : [];
    const tools = toolRes.success ? toolRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-clipboard-check me-2"></i>เครื่องมือวัดผล</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#assess-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มเครื่องมือ</button>
      </div>
      <div class="collapse mb-3" id="assess-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2">
            <div class="col-md-4"><input class="form-control" id="at-name" placeholder="ชื่อเครื่องมือ"></div>
            <div class="col-md-3"><select class="form-select" id="at-type">
              <option value="">-- ประเภท --</option>
              <option value="rubric">Rubric</option>
              <option value="checklist">Checklist</option>
              <option value="rating_scale">Rating Scale</option>
              <option value="observation">แบบสังเกต</option>
              <option value="interview">แบบสัมภาษณ์</option>
              <option value="other">อื่นๆ</option>
            </select></div>
            <div class="col-md-3"><select class="form-select" id="at-subject">
              <option value="">-- วิชา (ไม่บังคับ) --</option>
              ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="at-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button></div>
          </div>
          <div class="mt-2"><textarea class="form-control" id="at-desc" rows="2" placeholder="รายละเอียด (ไม่บังคับ)"></textarea></div>
        </div></div>
      </div>
      <div id="at-list">
        ${tools.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีเครื่องมือวัดผล</div>' :
          tools.map(t => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(t.name)}</strong>
              ${t.tool_type ? `<span class="badge bg-info ms-2">${DOMPurify.sanitize(t.tool_type)}</span>` : ''}
              ${t.description ? `<div class="text-muted small">${DOMPurify.sanitize(t.description)}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${t.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('at-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/assessment', {
        name: document.getElementById('at-name').value,
        tool_type: document.getElementById('at-type').value || null,
        subject_id: document.getElementById('at-subject').value || null,
        description: document.getElementById('at-desc').value || null
      });
      if (res.success) { App.toast('เพิ่มเครื่องมือสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบเครื่องมือนี้?')) return;
        const res = await API.del(`/api/assessment/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Test Module ====================
App.modules['test'] = {
  async render(area) {
    const [subRes, semRes, testRes] = await Promise.all([
      API.get('/api/subjects'), API.get('/api/semesters'), API.get('/api/test')
    ]);
    const subjects = subRes.success ? subRes.data : [];
    const activeSem = semRes.success ? semRes.data.find(s => s.is_active) : null;
    const tests = testRes.success ? testRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-journal-text me-2"></i>แบบทดสอบ</h4>
        <div>
          <button class="btn btn-outline-info me-1" id="tt-ai"><i class="bi bi-stars me-1"></i>AI สร้างข้อสอบ</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#test-form"><i class="bi bi-plus-lg me-1"></i>สร้างแบบทดสอบ</button>
        </div>
      </div>
      <div class="collapse mb-3" id="test-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2">
            <div class="col-md-4"><input class="form-control" id="tt-title" placeholder="ชื่อแบบทดสอบ"></div>
            <div class="col-md-3"><select class="form-select" id="tt-subject">
              <option value="">-- เลือกวิชา --</option>
              ${subjects.map(s => `<option value="${s.id}">${DOMPurify.sanitize(s.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-3"><select class="form-select" id="tt-type">
              <option value="quiz">แบบทดสอบย่อย</option>
              <option value="midterm">สอบกลางภาค</option>
              <option value="final">สอบปลายภาค</option>
              <option value="pretest">Pre-test</option>
              <option value="posttest">Post-test</option>
            </select></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="tt-save"><i class="bi bi-check-lg me-1"></i>สร้าง</button></div>
          </div>
          <div class="row g-2 mt-1">
            <div class="col-md-3"><input class="form-control" id="tt-time" type="number" placeholder="เวลา (นาที)"></div>
            <div class="col-md-3"><input class="form-control" id="tt-pass" type="number" placeholder="คะแนนผ่าน"></div>
            <div class="col-md-6"><input class="form-control" id="tt-inst" placeholder="คำชี้แจง (ไม่บังคับ)"></div>
          </div>
        </div></div>
      </div>
      <div id="tt-list">
        ${tests.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีแบบทดสอบ</div>' :
          tests.map(t => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(t.title)}</strong>
              <span class="badge bg-secondary ms-2">${DOMPurify.sanitize(t.test_type || '')}</span>
              ${t.total_questions ? `<span class="badge bg-info ms-1">${t.total_questions} ข้อ</span>` : ''}
              ${t.is_published ? '<span class="badge bg-success ms-1">เผยแพร่</span>' : '<span class="badge bg-warning text-dark ms-1">แบบร่าง</span>'}
            </div>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" data-pub="${t.id}" data-status="${t.is_published}">${t.is_published ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'}</button>
              <button class="btn btn-sm btn-outline-danger" data-del="${t.id}"><i class="bi bi-trash"></i></button>
            </div>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('tt-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/test', {
        title: document.getElementById('tt-title').value,
        subject_id: document.getElementById('tt-subject').value,
        semester_id: activeSem?.id,
        test_type: document.getElementById('tt-type').value,
        time_limit_minutes: parseInt(document.getElementById('tt-time').value) || null,
        passing_score: parseFloat(document.getElementById('tt-pass').value) || null,
        instructions: document.getElementById('tt-inst').value || null
      });
      if (res.success) { App.toast('สร้างแบบทดสอบสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    document.getElementById('tt-ai')?.addEventListener('click', () => {
      AIPanel.open('create_test', {}, 'chat');
    });

    area.querySelectorAll('[data-pub]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.dataset.status === '1' ? 0 : 1;
        const res = await API.put(`/api/test/${btn.dataset.pub}`, { is_published: newStatus });
        if (res.success) { App.toast(newStatus ? 'เผยแพร่แล้ว' : 'ยกเลิกเผยแพร่'); this.render(area); }
      });
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบแบบทดสอบนี้?')) return;
        const res = await API.del(`/api/test/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Research Module ====================
App.modules['research'] = {
  async render(area) {
    const [semRes, researchRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/research')
    ]);
    const activeSem = semRes.success ? semRes.data.find(s => s.is_active) : null;
    const researches = researchRes.success ? researchRes.data : [];
    const statusColors = { draft: 'warning', in_progress: 'info', completed: 'success', published: 'primary' };
    const statusLabels = { draft: 'ร่าง', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จสิ้น', published: 'เผยแพร่' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-search me-2"></i>วิจัยในชั้นเรียน</h4>
        <div>
          <button class="btn btn-outline-info me-1" id="rs-ai"><i class="bi bi-stars me-1"></i>AI ช่วยเขียน</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#res-form"><i class="bi bi-plus-lg me-1"></i>สร้างงานวิจัย</button>
        </div>
      </div>
      <div class="collapse mb-3" id="res-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="mb-2"><input class="form-control" id="rs-title" placeholder="ชื่อเรื่องวิจัย"></div>
          <div class="mb-2"><textarea class="form-control" id="rs-problem" rows="2" placeholder="สภาพปัญหา"></textarea></div>
          <div class="mb-2"><textarea class="form-control" id="rs-obj" rows="2" placeholder="วัตถุประสงค์"></textarea></div>
          <button class="btn btn-success" id="rs-save"><i class="bi bi-check-lg me-1"></i>สร้าง</button>
        </div></div>
      </div>
      <div id="rs-list">
        ${researches.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีงานวิจัย</div>' :
          researches.map(r => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <strong>${DOMPurify.sanitize(r.title)}</strong>
                <span class="badge bg-${statusColors[r.status] || 'secondary'} ms-2">${statusLabels[r.status] || r.status}</span>
              </div>
              <div>
                <select class="form-select form-select-sm d-inline-block w-auto me-1" data-status="${r.id}">
                  ${Object.entries(statusLabels).map(([k,v]) => `<option value="${k}" ${r.status===k?'selected':''}>${v}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-outline-danger" data-del="${r.id}"><i class="bi bi-trash"></i></button>
              </div>
            </div>
            ${r.problem_statement ? `<div class="text-muted small mt-1">${DOMPurify.sanitize(r.problem_statement).substring(0,100)}...</div>` : ''}
          </div></div>`).join('')}
      </div>`;

    document.getElementById('rs-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/research', {
        title: document.getElementById('rs-title').value,
        semester_id: activeSem?.id,
        problem_statement: document.getElementById('rs-problem').value || null,
        objectives: document.getElementById('rs-obj').value || null
      });
      if (res.success) { App.toast('สร้างงานวิจัยสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    document.getElementById('rs-ai')?.addEventListener('click', () => {
      AIPanel.open('write_research', {}, 'chat');
    });

    area.querySelectorAll('[data-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        await API.put(`/api/research/${sel.dataset.status}`, { status: sel.value });
        App.toast('อัปเดตสถานะแล้ว'); this.render(area);
      });
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบงานวิจัยนี้?')) return;
        const res = await API.del(`/api/research/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== PA Module ====================
App.modules['pa'] = {
  async render(area) {
    const [semRes, paRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/pa')
    ]);
    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    const agreements = paRes.success ? paRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-award me-2"></i>PA (วPA)</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#pa-form"><i class="bi bi-plus-lg me-1"></i>สร้างข้อตกลง PA</button>
      </div>
      <div class="collapse mb-3" id="pa-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-6"><select class="form-select" id="pa-sem">
              ${semesters.map(s => `<option value="${s.id}" ${s.is_active?'selected':''}>${s.academic_year}/${s.semester}</option>`).join('')}
            </select></div>
            <div class="col-md-6"><input class="form-control" id="pa-year" type="number" value="${activeSem?.academic_year || 2568}" placeholder="ปีการศึกษา"></div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-md-4"><input class="form-control" id="pa-teach" type="number" placeholder="ชม.สอน (เป้า)"></div>
            <div class="col-md-4"><input class="form-control" id="pa-support" type="number" placeholder="ชม.สนับสนุน (เป้า)"></div>
            <div class="col-md-4"><input class="form-control" id="pa-other" type="number" placeholder="ชม.อื่นๆ (เป้า)"></div>
          </div>
          <div class="mb-2"><textarea class="form-control" id="pa-duties" rows="2" placeholder="ภาระงานสอน"></textarea></div>
          <button class="btn btn-success" id="pa-save"><i class="bi bi-check-lg me-1"></i>สร้างข้อตกลง</button>
        </div></div>
      </div>
      <div id="pa-list">
        ${agreements.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีข้อตกลง PA</div>' :
          agreements.map(a => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>ปีการศึกษา ${a.academic_year}</strong>
              ${a.teaching_hours_target ? `<span class="badge bg-info ms-2">สอน ${a.teaching_hours_target} ชม.</span>` : ''}
              ${a.submitted_at ? '<span class="badge bg-success ms-1">ส่งแล้ว</span>' : '<span class="badge bg-warning text-dark ms-1">ยังไม่ส่ง</span>'}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${a.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('pa-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/pa', {
        semester_id: document.getElementById('pa-sem').value,
        academic_year: parseInt(document.getElementById('pa-year').value),
        teaching_hours_target: parseFloat(document.getElementById('pa-teach').value) || null,
        support_hours_target: parseFloat(document.getElementById('pa-support').value) || null,
        other_hours_target: parseFloat(document.getElementById('pa-other').value) || null,
        teaching_duties: document.getElementById('pa-duties').value || null
      });
      if (res.success) { App.toast('สร้างข้อตกลง PA สำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบข้อตกลงนี้?')) return;
        const res = await API.del(`/api/pa/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== SAR Module ====================
App.modules['sar'] = {
  async render(area) {
    const [semRes, sarRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/sar')
    ]);
    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    const reports = sarRes.success ? sarRes.data : [];
    const statusLabels = { draft: 'ร่าง', completed: 'เสร็จสิ้น', submitted: 'ส่งแล้ว' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-file-earmark-text me-2"></i>SAR</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#sar-form"><i class="bi bi-plus-lg me-1"></i>สร้าง SAR</button>
      </div>
      <div class="collapse mb-3" id="sar-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-6"><select class="form-select" id="sar-sem">
              ${semesters.map(s => `<option value="${s.id}" ${s.is_active?'selected':''}>${s.academic_year}/${s.semester}</option>`).join('')}
            </select></div>
            <div class="col-md-6"><input class="form-control" id="sar-year" type="number" value="${activeSem?.academic_year || 2568}" placeholder="ปีการศึกษา"></div>
          </div>
          <div class="mb-2"><textarea class="form-control" id="sar-p1" rows="2" placeholder="ส่วนที่ 1: บริบท"></textarea></div>
          <div class="mb-2"><textarea class="form-control" id="sar-p2" rows="2" placeholder="ส่วนที่ 2: ผลการดำเนินงาน"></textarea></div>
          <button class="btn btn-success" id="sar-save"><i class="bi bi-check-lg me-1"></i>สร้าง</button>
        </div></div>
      </div>
      <div id="sar-list">
        ${reports.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีรายงาน SAR</div>' :
          reports.map(r => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>SAR ปี ${r.academic_year}</strong>
              <span class="badge bg-${r.overall_status==='submitted'?'success':r.overall_status==='completed'?'info':'warning'} text-${r.overall_status==='warning'?'dark':''} ms-2">${statusLabels[r.overall_status] || r.overall_status}</span>
            </div>
            <div>
              <select class="form-select form-select-sm d-inline-block w-auto me-1" data-status="${r.id}">
                ${Object.entries(statusLabels).map(([k,v]) => `<option value="${k}" ${r.overall_status===k?'selected':''}>${v}</option>`).join('')}
              </select>
              <button class="btn btn-sm btn-outline-danger" data-del="${r.id}"><i class="bi bi-trash"></i></button>
            </div>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('sar-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/sar', {
        semester_id: document.getElementById('sar-sem').value,
        academic_year: parseInt(document.getElementById('sar-year').value),
        part1_context: document.getElementById('sar-p1').value || null,
        part2_results: document.getElementById('sar-p2').value || null
      });
      if (res.success) { App.toast('สร้าง SAR สำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        await API.put(`/api/sar/${sel.dataset.status}`, { overall_status: sel.value });
        App.toast('อัปเดตสถานะแล้ว'); this.render(area);
      });
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบ SAR นี้?')) return;
        const res = await API.del(`/api/sar/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Innovation Module ====================
App.modules['innovation'] = {
  async render(area) {
    const [semRes, innRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/innovation')
    ]);
    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    const items = innRes.success ? innRes.data : [];
    const statusLabels = { draft: 'ร่าง', in_progress: 'กำลังพัฒนา', completed: 'เสร็จสิ้น', published: 'เผยแพร่' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-lightbulb me-2"></i>นวัตกรรม</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#inn-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มนวัตกรรม</button>
      </div>
      <div class="collapse mb-3" id="inn-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-6"><input class="form-control" id="inn-title" placeholder="ชื่อนวัตกรรม"></div>
            <div class="col-md-6"><select class="form-select" id="inn-type">
              <option value="">-- ประเภท --</option>
              <option value="teaching_media">สื่อการสอน</option>
              <option value="learning_management">การจัดการเรียนรู้</option>
              <option value="assessment_tool">เครื่องมือวัดผล</option>
              <option value="curriculum">หลักสูตร</option>
              <option value="other">อื่นๆ</option>
            </select></div>
          </div>
          <div class="mb-2"><textarea class="form-control" id="inn-prob" rows="2" placeholder="ปัญหาที่แก้ไข"></textarea></div>
          <div class="mb-2"><textarea class="form-control" id="inn-desc" rows="2" placeholder="รายละเอียด"></textarea></div>
          <button class="btn btn-success" id="inn-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
        </div></div>
      </div>
      <div id="inn-list">
        ${items.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีนวัตกรรม</div>' :
          items.map(i => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(i.title)}</strong>
              ${i.innovation_type ? `<span class="badge bg-info ms-2">${DOMPurify.sanitize(i.innovation_type)}</span>` : ''}
              <span class="badge bg-${i.status==='published'?'success':i.status==='completed'?'primary':'warning'} ms-1">${statusLabels[i.status] || i.status}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${i.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('inn-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/innovation', {
        title: document.getElementById('inn-title').value,
        semester_id: activeSem?.id,
        innovation_type: document.getElementById('inn-type').value || null,
        problem_addressed: document.getElementById('inn-prob').value || null,
        description: document.getElementById('inn-desc').value || null
      });
      if (res.success) { App.toast('เพิ่มนวัตกรรมสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบนวัตกรรมนี้?')) return;
        const res = await API.del(`/api/innovation/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== PLC Module ====================
App.modules['plc'] = {
  async render(area) {
    const [semRes, plcRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/plc')
    ]);
    const activeSem = semRes.success ? semRes.data.find(s => s.is_active) : null;
    const records = plcRes.success ? plcRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-people me-2"></i>PLC</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#plc-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มบันทึก PLC</button>
      </div>
      <div class="collapse mb-3" id="plc-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4"><input class="form-control" id="plc-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="col-md-5"><input class="form-control" id="plc-topic" placeholder="หัวข้อ PLC"></div>
            <div class="col-md-3"><input class="form-control" id="plc-hours" type="number" step="0.5" placeholder="ชั่วโมง"></div>
          </div>
          <div class="mb-2"><input class="form-control" id="plc-parts" placeholder="ผู้เข้าร่วม (คั่นด้วย ,)"></div>
          <div class="mb-2"><textarea class="form-control" id="plc-outcomes" rows="2" placeholder="ผลลัพธ์/สิ่งที่ได้เรียนรู้"></textarea></div>
          <button class="btn btn-success" id="plc-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
        </div></div>
      </div>
      <div id="plc-list">
        ${records.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีบันทึก PLC</div>' :
          records.map(r => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(r.topic)}</strong>
              <span class="text-muted small ms-2">${r.session_date || ''}</span>
              ${r.hours ? `<span class="badge bg-info ms-2">${r.hours} ชม.</span>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${r.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('plc-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/plc', {
        session_date: document.getElementById('plc-date').value,
        topic: document.getElementById('plc-topic').value,
        semester_id: activeSem?.id,
        hours: parseFloat(document.getElementById('plc-hours').value) || null,
        participants: document.getElementById('plc-parts').value || null,
        outcomes: document.getElementById('plc-outcomes').value || null
      });
      if (res.success) { App.toast('บันทึก PLC สำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบบันทึก PLC นี้?')) return;
        const res = await API.del(`/api/plc/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Logbook Module ====================
App.modules['logbook'] = {
  async render(area) {
    const [semRes, logRes, sumRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/logbook'), API.get('/api/logbook/summary')
    ]);
    const activeSem = semRes.success ? semRes.data.find(s => s.is_active) : null;
    const entries = logRes.success ? logRes.data : [];
    const summary = sumRes.success ? sumRes.data : [];
    const categories = ['สอน','สนับสนุนการสอน','พัฒนาตนเอง','งานพิเศษ','อื่นๆ'];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-journal me-2"></i>สมุดบันทึก</h4>
        <div>
          <button class="btn btn-outline-secondary me-1" id="lg-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#log-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มบันทึก</button>
        </div>
      </div>
      ${summary.length > 0 ? `
      <div class="row g-2 mb-3">
        ${summary.map(s => `
        <div class="col-auto"><div class="card border-0 shadow-sm"><div class="card-body py-2 px-3">
          <small class="text-muted">${DOMPurify.sanitize(s.category)}</small><br>
          <strong>${s.total_hours} ชม.</strong> <span class="text-muted small">(${s.count} รายการ)</span>
        </div></div></div>`).join('')}
      </div>` : ''}
      <div class="collapse mb-3" id="log-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-3"><input class="form-control" id="lg-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="col-md-4"><select class="form-select" id="lg-cat">
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select></div>
            <div class="col-md-2"><input class="form-control" id="lg-hours" type="number" step="0.5" placeholder="ชม."></div>
            <div class="col-md-3"><button class="btn btn-success w-100" id="lg-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button></div>
          </div>
          <div><textarea class="form-control" id="lg-desc" rows="2" placeholder="รายละเอียด"></textarea></div>
        </div></div>
      </div>
      <div id="lg-list">
        ${entries.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีบันทึก</div>' :
          entries.map(e => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <span class="badge bg-secondary me-2">${DOMPurify.sanitize(e.category)}</span>
              <strong>${e.hours} ชม.</strong>
              <span class="text-muted small ms-2">${e.entry_date || ''}</span>
              ${e.description ? `<div class="text-muted small">${DOMPurify.sanitize(e.description).substring(0,80)}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${e.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('lg-export')?.addEventListener('click', () => {
      const data = entries.map(e => [e.entry_date || '', e.category, e.hours, e.description || '']);
      Exporter.showExportDialog('สมุดบันทึก', data, { headers: ['date','category','hours','desc'], headerLabels: ['วันที่','หมวด','ชั่วโมง','รายละเอียด'] });
    });

    document.getElementById('lg-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/logbook', {
        entry_date: document.getElementById('lg-date').value,
        category: document.getElementById('lg-cat').value,
        hours: parseFloat(document.getElementById('lg-hours').value),
        semester_id: activeSem?.id,
        description: document.getElementById('lg-desc').value || null
      });
      if (res.success) { App.toast('บันทึกสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบบันทึกนี้?')) return;
        const res = await API.del(`/api/logbook/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Awards Module ====================
App.modules['awards'] = {
  async render(area) {
    const [typeRes, awardRes] = await Promise.all([
      API.get('/api/awards/types'), API.get('/api/awards')
    ]);
    const types = typeRes.success ? typeRes.data : [];
    const awards = awardRes.success ? awardRes.data : [];
    const statusLabels = { planning: 'วางแผน', applied: 'สมัครแล้ว', waiting: 'รอผล', won: 'ได้รับ', not_won: 'ไม่ได้รับ' };
    const statusColors = { planning: 'secondary', applied: 'info', waiting: 'warning', won: 'success', not_won: 'danger' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-trophy me-2"></i>เกียรติบัตร/รางวัล</h4>
        <div>
          <button class="btn btn-outline-secondary me-1" id="aw-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
          <button class="btn btn-outline-secondary me-1" data-bs-toggle="collapse" data-bs-target="#aw-type-form"><i class="bi bi-tag me-1"></i>ประเภท</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#aw-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มรางวัล</button>
        </div>
      </div>
      <div class="collapse mb-3" id="aw-type-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2">
            <div class="col-md-5"><input class="form-control" id="awt-name" placeholder="ชื่อประเภท เช่น OBEC Awards"></div>
            <div class="col-md-3"><input class="form-control" id="awt-level" placeholder="ระดับ เช่น ชาติ"></div>
            <div class="col-md-2"><input class="form-control" id="awt-org" placeholder="หน่วยงาน"></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="awt-save">บันทึก</button></div>
          </div>
        </div></div>
      </div>
      <div class="collapse mb-3" id="aw-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-6"><select class="form-select" id="aw-type">
              <option value="">-- เลือกประเภทรางวัล --</option>
              ${types.map(t => `<option value="${t.id}">${DOMPurify.sanitize(t.name)} ${t.level ? '('+t.level+')' : ''}</option>`).join('')}
            </select></div>
            <div class="col-md-3"><input class="form-control" id="aw-year" type="number" value="${new Date().getFullYear() + 543}" placeholder="ปี พ.ศ."></div>
            <div class="col-md-3"><button class="btn btn-success w-100" id="aw-save">เพิ่ม</button></div>
          </div>
          <div><textarea class="form-control" id="aw-notes" rows="2" placeholder="หมายเหตุ"></textarea></div>
        </div></div>
      </div>
      <div id="aw-list">
        ${awards.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีรางวัล</div>' :
          awards.map(a => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(a.type_name || 'ไม่ระบุ')}</strong>
              <span class="text-muted small ms-2">ปี ${a.academic_year}</span>
              <span class="badge bg-${statusColors[a.status] || 'secondary'} ms-2">${statusLabels[a.status] || a.status}</span>
            </div>
            <div>
              <select class="form-select form-select-sm d-inline-block w-auto me-1" data-status="${a.id}">
                ${Object.entries(statusLabels).map(([k,v]) => `<option value="${k}" ${a.status===k?'selected':''}>${v}</option>`).join('')}
              </select>
              <button class="btn btn-sm btn-outline-danger" data-del="${a.id}"><i class="bi bi-trash"></i></button>
            </div>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('aw-export')?.addEventListener('click', () => {
      const sLabels = { planning: 'วางแผน', applied: 'สมัครแล้ว', waiting: 'รอผล', won: 'ได้รับ', not_won: 'ไม่ได้รับ' };
      const data = awards.map(a => [a.type_name || 'ไม่ระบุ', a.academic_year, sLabels[a.status] || a.status, a.notes || '']);
      Exporter.showExportDialog('เกียรติบัตร/รางวัล', data, { headers: ['name','year','status','notes'], headerLabels: ['ชื่อรางวัล','ปี พ.ศ.','สถานะ','หมายเหตุ'] });
    });

    document.getElementById('awt-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/awards/types', {
        name: document.getElementById('awt-name').value,
        level: document.getElementById('awt-level').value || null,
        organizing_body: document.getElementById('awt-org').value || null
      });
      if (res.success) { App.toast('เพิ่มประเภทสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    document.getElementById('aw-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/awards', {
        award_type_id: document.getElementById('aw-type').value,
        academic_year: parseInt(document.getElementById('aw-year').value),
        notes: document.getElementById('aw-notes').value || null
      });
      if (res.success) { App.toast('เพิ่มรางวัลสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        await API.put(`/api/awards/${sel.dataset.status}`, { status: sel.value });
        App.toast('อัปเดตสถานะแล้ว');
      });
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบรางวัลนี้?')) return;
        const res = await API.del(`/api/awards/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Homeroom Module ====================
App.modules['homeroom'] = {
  async render(area) {
    const [semRes, clsRes, hrRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/classrooms'), API.get('/api/homeroom')
    ]);
    const semesters = semRes.success ? semRes.data : [];
    const activeSem = semesters.find(s => s.is_active);
    const classrooms = clsRes.success ? clsRes.data : [];
    const assignments = hrRes.success ? hrRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-house-heart me-2"></i>ครูที่ปรึกษา</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#hr-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มห้อง</button>
      </div>
      <div class="collapse mb-3" id="hr-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2">
            <div class="col-md-5"><select class="form-select" id="hr-cls">
              <option value="">-- เลือกห้องเรียน --</option>
              ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-5"><select class="form-select" id="hr-sem">
              ${semesters.map(s => `<option value="${s.id}" ${s.is_active?'selected':''}>${s.academic_year}/${s.semester}</option>`).join('')}
            </select></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="hr-save">เพิ่ม</button></div>
          </div>
        </div></div>
      </div>
      <div id="hr-list">
        ${assignments.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่ได้รับมอบหมายห้อง</div>' :
          assignments.map(a => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <i class="bi bi-house-door me-2"></i>
              <strong>${DOMPurify.sanitize(a.classroom_name)}</strong>
              <span class="badge bg-info ms-2">${DOMPurify.sanitize(a.role || 'ครูที่ปรึกษา')}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${a.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('hr-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/homeroom', {
        classroom_id: document.getElementById('hr-cls').value,
        semester_id: document.getElementById('hr-sem').value
      });
      if (res.success) { App.toast('เพิ่มห้องสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบการมอบหมายนี้?')) return;
        const res = await API.del(`/api/homeroom/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Home Visit Module ====================
App.modules['home-visit'] = {
  async render(area) {
    const [clsRes, visitRes] = await Promise.all([
      API.get('/api/classrooms'), API.get('/api/home-visit')
    ]);
    const classrooms = clsRes.success ? clsRes.data : [];
    const visits = visitRes.success ? visitRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-geo-alt me-2"></i>เยี่ยมบ้าน</h4>
        <div>
          <button class="btn btn-outline-secondary me-1" id="hv-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#hv-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มบันทึก</button>
        </div>
      </div>
      <div class="collapse mb-3" id="hv-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4"><select class="form-select" id="hv-cls">
              <option value="">-- เลือกห้อง --</option>
              ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-4"><select class="form-select" id="hv-student" disabled>
              <option value="">-- เลือกนักเรียน --</option>
            </select></div>
            <div class="col-md-4"><input class="form-control" id="hv-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-md-6"><input class="form-control" id="hv-addr" placeholder="ที่อยู่ที่เยี่ยม"></div>
            <div class="col-md-3"><select class="form-select" id="hv-type">
              <option value="in_person">เยี่ยมจริง</option>
              <option value="phone">โทรศัพท์</option>
              <option value="online">ออนไลน์</option>
            </select></div>
            <div class="col-md-3"><input class="form-control" id="hv-family" placeholder="ผู้ปกครองที่พบ"></div>
          </div>
          <div class="mb-2"><textarea class="form-control" id="hv-notes" rows="2" placeholder="บันทึกการเยี่ยม"></textarea></div>
          <button class="btn btn-success" id="hv-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
        </div></div>
      </div>
      <div id="hv-list">
        ${visits.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีบันทึกการเยี่ยมบ้าน</div>' :
          visits.map(v => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(v.first_name)} ${DOMPurify.sanitize(v.last_name)}</strong>
              <span class="text-muted small ms-2">${v.student_code}</span>
              <span class="text-muted small ms-2">${v.visit_date || ''}</span>
              <span class="badge bg-${v.visit_type==='in_person'?'success':'info'} ms-2">${v.visit_type==='in_person'?'เยี่ยมจริง':v.visit_type==='phone'?'โทรฯ':'ออนไลน์'}</span>
              ${v.follow_up_needed ? '<span class="badge bg-warning text-dark ms-1">ต้องติดตาม</span>' : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${v.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('hv-export')?.addEventListener('click', () => {
      const typeLabels = { in_person: 'เยี่ยมจริง', phone: 'โทรศัพท์', online: 'ออนไลน์' };
      const data = visits.map(v => [v.student_code, `${v.first_name} ${v.last_name}`, v.visit_date || '', typeLabels[v.visit_type] || v.visit_type, v.family_present || '']);
      Exporter.showExportDialog('เยี่ยมบ้าน', data, { headers: ['code','name','date','type','family'], headerLabels: ['รหัส','ชื่อ-สกุล','วันที่','รูปแบบ','ผู้ปกครอง'] });
    });

    // Load students when classroom selected
    document.getElementById('hv-cls')?.addEventListener('change', async (e) => {
      const sel = document.getElementById('hv-student');
      if (!e.target.value) { sel.disabled = true; sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>'; return; }
      const res = await API.get(`/api/students?classroom_id=${e.target.value}`);
      if (res.success) {
        sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>' +
          res.data.map(s => `<option value="${s.id}">${s.student_code} ${DOMPurify.sanitize(s.first_name)} ${DOMPurify.sanitize(s.last_name)}</option>`).join('');
        sel.disabled = false;
      }
    });

    document.getElementById('hv-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/home-visit', {
        student_id: document.getElementById('hv-student').value,
        visit_date: document.getElementById('hv-date').value,
        visit_type: document.getElementById('hv-type').value,
        address_visited: document.getElementById('hv-addr').value || null,
        family_present: document.getElementById('hv-family').value || null,
        raw_notes: document.getElementById('hv-notes').value || null
      });
      if (res.success) { App.toast('บันทึกเยี่ยมบ้านสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบบันทึกนี้?')) return;
        const res = await API.del(`/api/home-visit/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== SDQ Module ====================
App.modules['sdq'] = {
  async render(area) {
    const [clsRes, sdqRes] = await Promise.all([
      API.get('/api/classrooms'), API.get('/api/sdq')
    ]);
    const classrooms = clsRes.success ? clsRes.data : [];
    const screenings = sdqRes.success ? sdqRes.data : [];
    const riskColors = { 'ปกติ': 'success', 'เสี่ยง': 'warning', 'มีปัญหา': 'danger' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-heart-pulse me-2"></i>SDQ</h4>
        <div>
          <button class="btn btn-outline-secondary me-1" id="sdq-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#sdq-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มแบบคัดกรอง</button>
        </div>
      </div>
      <div class="collapse mb-3" id="sdq-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4"><select class="form-select" id="sdq-cls">
              <option value="">-- เลือกห้อง --</option>
              ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-4"><select class="form-select" id="sdq-student" disabled>
              <option value="">-- เลือกนักเรียน --</option>
            </select></div>
            <div class="col-md-4"><input class="form-control" id="sdq-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col"><input class="form-control" id="sdq-emo" type="number" min="0" max="10" placeholder="อารมณ์ (0-10)"></div>
            <div class="col"><input class="form-control" id="sdq-con" type="number" min="0" max="10" placeholder="ความประพฤติ (0-10)"></div>
            <div class="col"><input class="form-control" id="sdq-hyp" type="number" min="0" max="10" placeholder="สมาธิ (0-10)"></div>
            <div class="col"><input class="form-control" id="sdq-peer" type="number" min="0" max="10" placeholder="เพื่อน (0-10)"></div>
            <div class="col"><input class="form-control" id="sdq-pro" type="number" min="0" max="10" placeholder="สังคม (0-10)"></div>
          </div>
          <button class="btn btn-success" id="sdq-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
          <small class="text-muted ms-2">คะแนนรวม (ไม่รวมสังคม): ปกติ 0-13, เสี่ยง 14-19, มีปัญหา 20+</small>
        </div></div>
      </div>
      <div id="sdq-list">
        ${screenings.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีข้อมูล SDQ</div>' :
          screenings.map(s => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(s.first_name)} ${DOMPurify.sanitize(s.last_name)}</strong>
              <span class="text-muted small ms-2">${s.student_code}</span>
              <span class="text-muted small ms-2">${s.screen_date || ''}</span>
              <span class="badge bg-${riskColors[s.risk_level] || 'secondary'} ms-2">${s.risk_level || '?'} (${s.total_difficulty})</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${s.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('sdq-export')?.addEventListener('click', () => {
      const data = screenings.map(s => [s.student_code, `${s.first_name} ${s.last_name}`, s.screen_date || '', s.total_difficulty, s.risk_level || '']);
      Exporter.showExportDialog('SDQ', data, { headers: ['code','name','date','total','risk'], headerLabels: ['รหัส','ชื่อ-สกุล','วันที่','คะแนนรวม','ระดับ'] });
    });

    document.getElementById('sdq-cls')?.addEventListener('change', async (e) => {
      const sel = document.getElementById('sdq-student');
      if (!e.target.value) { sel.disabled = true; return; }
      const res = await API.get(`/api/students?classroom_id=${e.target.value}`);
      if (res.success) {
        sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>' +
          res.data.map(s => `<option value="${s.id}">${s.student_code} ${DOMPurify.sanitize(s.first_name)} ${DOMPurify.sanitize(s.last_name)}</option>`).join('');
        sel.disabled = false;
      }
    });

    document.getElementById('sdq-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/sdq', {
        student_id: document.getElementById('sdq-student').value,
        screen_date: document.getElementById('sdq-date').value,
        emotional_score: parseInt(document.getElementById('sdq-emo').value) || 0,
        conduct_score: parseInt(document.getElementById('sdq-con').value) || 0,
        hyperactivity_score: parseInt(document.getElementById('sdq-hyp').value) || 0,
        peer_score: parseInt(document.getElementById('sdq-peer').value) || 0,
        prosocial_score: parseInt(document.getElementById('sdq-pro').value) || 0
      });
      if (res.success) {
        App.toast(`บันทึก SDQ สำเร็จ! ระดับ: ${res.data.risk_level} (${res.data.total_difficulty})`);
        this.render(area);
      } else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบข้อมูล SDQ นี้?')) return;
        const res = await API.del(`/api/sdq/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Care Record Module ====================
App.modules['care-record'] = {
  async render(area) {
    const [clsRes, careRes] = await Promise.all([
      API.get('/api/classrooms'), API.get('/api/care-record')
    ]);
    const classrooms = clsRes.success ? clsRes.data : [];
    const records = careRes.success ? careRes.data : [];
    const stepLabels = { 1: 'รู้จักผู้เรียน', 2: 'คัดกรอง', 3: 'ส่งเสริม/ป้องกัน', 4: 'แก้ไข', 5: 'ส่งต่อ' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-clipboard2-heart me-2"></i>บันทึกการดูแล</h4>
        <div>
          <button class="btn btn-outline-secondary me-1" id="cr-export"><i class="bi bi-download me-1"></i>ส่งออก</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#care-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มบันทึก</button>
        </div>
      </div>
      <div class="collapse mb-3" id="care-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-3"><select class="form-select" id="cr-cls">
              <option value="">-- เลือกห้อง --</option>
              ${classrooms.map(c => `<option value="${c.id}">${DOMPurify.sanitize(c.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-3"><select class="form-select" id="cr-student" disabled>
              <option value="">-- เลือกนักเรียน --</option>
            </select></div>
            <div class="col-md-3"><select class="form-select" id="cr-step">
              ${Object.entries(stepLabels).map(([k,v]) => `<option value="${k}">ขั้นที่ ${k}: ${v}</option>`).join('')}
            </select></div>
            <div class="col-md-3"><input class="form-control" id="cr-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
          </div>
          <div class="mb-2"><textarea class="form-control" id="cr-desc" rows="2" placeholder="รายละเอียด"></textarea></div>
          <div class="mb-2"><textarea class="form-control" id="cr-action" rows="2" placeholder="สิ่งที่ดำเนินการ"></textarea></div>
          <button class="btn btn-success" id="cr-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
        </div></div>
      </div>
      <div id="cr-list">
        ${records.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีบันทึกการดูแล</div>' :
          records.map(r => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(r.first_name)} ${DOMPurify.sanitize(r.last_name)}</strong>
              <span class="text-muted small ms-2">${r.student_code}</span>
              <span class="badge bg-primary ms-2">ขั้นที่ ${r.care_step}: ${stepLabels[r.care_step] || ''}</span>
              <span class="text-muted small ms-2">${r.record_date || ''}</span>
              ${r.description ? `<div class="text-muted small">${DOMPurify.sanitize(r.description).substring(0,80)}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${r.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('cr-export')?.addEventListener('click', () => {
      const data = records.map(r => [r.student_code, `${r.first_name} ${r.last_name}`, `ขั้นที่ ${r.care_step}`, r.record_date || '', r.description || '']);
      Exporter.showExportDialog('บันทึกการดูแล', data, { headers: ['code','name','step','date','desc'], headerLabels: ['รหัส','ชื่อ-สกุล','ขั้นตอน','วันที่','รายละเอียด'] });
    });

    document.getElementById('cr-cls')?.addEventListener('change', async (e) => {
      const sel = document.getElementById('cr-student');
      if (!e.target.value) { sel.disabled = true; return; }
      const res = await API.get(`/api/students?classroom_id=${e.target.value}`);
      if (res.success) {
        sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>' +
          res.data.map(s => `<option value="${s.id}">${s.student_code} ${DOMPurify.sanitize(s.first_name)} ${DOMPurify.sanitize(s.last_name)}</option>`).join('');
        sel.disabled = false;
      }
    });

    document.getElementById('cr-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/care-record', {
        student_id: document.getElementById('cr-student').value,
        care_step: parseInt(document.getElementById('cr-step').value),
        record_date: document.getElementById('cr-date').value,
        description: document.getElementById('cr-desc').value,
        action_taken: document.getElementById('cr-action').value || null
      });
      if (res.success) { App.toast('บันทึกการดูแลสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบบันทึกนี้?')) return;
        const res = await API.del(`/api/care-record/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Calendar Module ====================
App.modules['calendar'] = {
  async render(area) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const res = await API.get(`/api/calendar?month=${month}`);
    const events = res.success ? res.data : [];
    const typeLabels = { academic: 'วิชาการ', exam: 'สอบ', holiday: 'วันหยุด', meeting: 'ประชุม', event: 'กิจกรรม', personal: 'ส่วนตัว' };
    const typeColors = { academic: 'primary', exam: 'danger', holiday: 'success', meeting: 'info', event: 'warning', personal: 'secondary' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-calendar3 me-2"></i>ปฏิทิน</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#cal-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มกิจกรรม</button>
      </div>
      <div class="collapse mb-3" id="cal-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4"><input class="form-control" id="cal-title" placeholder="ชื่อกิจกรรม"></div>
            <div class="col-md-3"><select class="form-select" id="cal-type">
              <option value="">-- ประเภท --</option>
              ${Object.entries(typeLabels).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
            </select></div>
            <div class="col-md-3"><input class="form-control" id="cal-date" type="date"></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="cal-save">เพิ่ม</button></div>
          </div>
          <div><textarea class="form-control" id="cal-notes" rows="2" placeholder="หมายเหตุ"></textarea></div>
        </div></div>
      </div>
      <div id="cal-list">
        ${events.length === 0 ? `<div class="text-muted text-center py-4">ไม่มีกิจกรรมในเดือนนี้ (${month})</div>` :
          events.map(e => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <span class="badge bg-${typeColors[e.event_type] || 'secondary'} me-2">${typeLabels[e.event_type] || e.event_type || ''}</span>
              <strong>${DOMPurify.sanitize(e.title)}</strong>
              <span class="text-muted small ms-2">${e.date}${e.end_date ? ' - '+e.end_date : ''}</span>
              ${e.notes ? `<div class="text-muted small">${DOMPurify.sanitize(e.notes).substring(0,80)}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${e.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('cal-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/calendar', {
        title: document.getElementById('cal-title').value,
        event_type: document.getElementById('cal-type').value || null,
        date: document.getElementById('cal-date').value,
        notes: document.getElementById('cal-notes').value || null
      });
      if (res.success) { App.toast('เพิ่มกิจกรรมสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบกิจกรรมนี้?')) return;
        const res = await API.del(`/api/calendar/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Documents Module ====================
App.modules['documents'] = {
  async render(area) {
    const [typeRes, docRes] = await Promise.all([
      API.get('/api/documents/types'), API.get('/api/documents')
    ]);
    const types = typeRes.success ? typeRes.data : [];
    const docs = docRes.success ? docRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-file-earmark me-2"></i>เอกสาร</h4>
        <div>
          <button class="btn btn-outline-info me-1" id="doc-templates"><i class="bi bi-file-earmark-richtext me-1"></i>เทมเพลต (28)</button>
          <button class="btn btn-outline-secondary me-1" data-bs-toggle="collapse" data-bs-target="#doc-type-form"><i class="bi bi-tag me-1"></i>ประเภท</button>
          <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#doc-form"><i class="bi bi-plus-lg me-1"></i>สร้างเอกสาร</button>
        </div>
      </div>
      <div class="collapse mb-3" id="doc-tpl-area"></div>
      <div class="collapse mb-3" id="doc-type-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2">
            <div class="col-md-5"><input class="form-control" id="dt-name" placeholder="ชื่อประเภท"></div>
            <div class="col-md-5"><input class="form-control" id="dt-cat" placeholder="หมวดหมู่ (เช่น วิชาการ, บริหาร)"></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="dt-save">เพิ่ม</button></div>
          </div>
        </div></div>
      </div>
      <div class="collapse mb-3" id="doc-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-6"><input class="form-control" id="doc-title" placeholder="ชื่อเอกสาร"></div>
            <div class="col-md-4"><select class="form-select" id="doc-type">
              <option value="">-- ประเภท --</option>
              ${types.map(t => `<option value="${t.id}">${DOMPurify.sanitize(t.name)}</option>`).join('')}
            </select></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="doc-save">สร้าง</button></div>
          </div>
          <div><textarea class="form-control" id="doc-content" rows="3" placeholder="เนื้อหา"></textarea></div>
        </div></div>
      </div>
      <div id="doc-list">
        ${docs.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีเอกสาร</div>' :
          docs.map(d => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(d.title)}</strong>
              ${d.type_name ? `<span class="badge bg-info ms-2">${DOMPurify.sanitize(d.type_name)}</span>` : ''}
              <span class="badge bg-${d.status==='final'?'success':'secondary'} ms-2">${d.status==='final'?'เสร็จสิ้น':'ร่าง'}</span>
              <span class="text-muted small ms-2">${d.updated_at?.split('T')[0] || ''}</span>
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${d.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('dt-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/documents/types', {
        name: document.getElementById('dt-name').value,
        category: document.getElementById('dt-cat').value || null
      });
      if (res.success) { App.toast('เพิ่มประเภทสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    document.getElementById('doc-templates')?.addEventListener('click', async () => {
      const tplArea = document.getElementById('doc-tpl-area');
      if (tplArea.classList.contains('show')) { new bootstrap.Collapse(tplArea).hide(); return; }
      tplArea.innerHTML = '<div class="loading"></div>';
      new bootstrap.Collapse(tplArea).show();
      const tplRes = await API.get('/api/documents/templates');
      const templates = tplRes.success ? tplRes.data : [];
      const cats = [...new Set(templates.map(t => t.category))];
      tplArea.innerHTML = `<div class="card border-0 shadow-sm"><div class="card-body">
        <h6 class="fw-bold mb-2">เทมเพลตเอกสารราชการ (${templates.length} แบบ)</h6>
        ${cats.map(cat => `
          <div class="mb-2">
            <span class="badge bg-secondary mb-1">${cat}</span>
            <div class="d-flex flex-wrap gap-1">
              ${templates.filter(t => t.category === cat).map(t => `
                <button class="btn btn-sm btn-outline-primary" data-tpl="${t.id}" title="${t.sections?.length || 0} ส่วน">
                  <i class="bi bi-file-earmark-plus me-1"></i>${App.esc(t.name)}
                </button>`).join('')}
            </div>
          </div>
        `).join('')}
      </div></div>`;
      tplArea.querySelectorAll('[data-tpl]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const r = await API.post('/api/documents/templates/create', { template_id: btn.dataset.tpl });
          if (r.success) { App.toast(`สร้างเอกสาร "${r.data.title}" สำเร็จ!`); this.render(area); }
          else { App.toast(r.error || 'เกิดข้อผิดพลาด', 'danger'); btn.disabled = false; }
        });
      });
    });

    document.getElementById('doc-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/documents', {
        title: document.getElementById('doc-title').value,
        document_type_id: document.getElementById('doc-type').value || null,
        content: document.getElementById('doc-content').value || null
      });
      if (res.success) { App.toast('สร้างเอกสารสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบเอกสารนี้?')) return;
        const res = await API.del(`/api/documents/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Cover Designer Module ====================
App.modules['cover-designer'] = {
  async render(area) {
    const res = await API.get('/api/cover-designer');
    const templates = res.success ? res.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-palette me-2"></i>ออกแบบปก</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#cv-form"><i class="bi bi-plus-lg me-1"></i>สร้างเทมเพลต</button>
      </div>
      <div class="collapse mb-3" id="cv-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-5"><input class="form-control" id="cv-name" placeholder="ชื่อเทมเพลต"></div>
            <div class="col-md-5"><select class="form-select" id="cv-type">
              <option value="">-- ประเภท --</option>
              <option value="lesson_plan">แผนการสอน</option>
              <option value="research">วิจัย</option>
              <option value="sar">SAR</option>
              <option value="portfolio">Portfolio</option>
              <option value="general">ทั่วไป</option>
            </select></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="cv-save">สร้าง</button></div>
          </div>
          <div><textarea class="form-control" id="cv-data" rows="3" placeholder="ข้อมูลการออกแบบ (JSON หรือข้อความ)"></textarea></div>
        </div></div>
      </div>
      <div class="row g-3" id="cv-list">
        ${templates.length === 0 ? '<div class="col-12 text-muted text-center py-4">ยังไม่มีเทมเพลต</div>' :
          templates.map(t => `
          <div class="col-md-4">
            <div class="card border-0 shadow-sm h-100"><div class="card-body text-center">
              <i class="bi bi-image d-block display-4 text-muted mb-2"></i>
              <strong>${DOMPurify.sanitize(t.name)}</strong>
              ${t.template_type ? `<div class="badge bg-info">${DOMPurify.sanitize(t.template_type)}</div>` : ''}
              <div class="mt-2"><button class="btn btn-sm btn-outline-danger" data-del="${t.id}"><i class="bi bi-trash me-1"></i>ลบ</button></div>
            </div></div>
          </div>`).join('')}
      </div>`;

    document.getElementById('cv-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/cover-designer', {
        name: document.getElementById('cv-name').value,
        template_type: document.getElementById('cv-type').value || null,
        design_data: document.getElementById('cv-data').value || null
      });
      if (res.success) { App.toast('สร้างเทมเพลตสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบเทมเพลตนี้?')) return;
        const res = await API.del(`/api/cover-designer/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Instruments Module ====================
App.modules['instruments'] = {
  async render(area) {
    const res = await API.get('/api/instruments');
    const items = res.success ? res.data : [];
    const condLabels = { good: 'ดี', fair: 'พอใช้', poor: 'ชำรุด', repair: 'ซ่อม', lost: 'สูญหาย' };
    const condColors = { good: 'success', fair: 'warning', poor: 'danger', repair: 'info', lost: 'dark' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-music-note-beamed me-2"></i>เครื่องดนตรี</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#inst-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มเครื่องดนตรี</button>
      </div>
      <div class="collapse mb-3" id="inst-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4"><input class="form-control" id="ins-name" placeholder="ชื่อเครื่องดนตรี"></div>
            <div class="col-md-3"><input class="form-control" id="ins-cat" placeholder="หมวด (เช่น เครื่องสาย, ลม)"></div>
            <div class="col-md-2"><select class="form-select" id="ins-cond">
              ${Object.entries(condLabels).map(([k,v]) => `<option value="${k}" ${k==='good'?'selected':''}>${v}</option>`).join('')}
            </select></div>
            <div class="col-md-1"><input class="form-control" id="ins-qty" type="number" value="1" min="1"></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="ins-save">เพิ่ม</button></div>
          </div>
          <div class="row g-2">
            <div class="col-md-4"><input class="form-control" id="ins-serial" placeholder="เลข S/N"></div>
            <div class="col-md-4"><input class="form-control" id="ins-loc" placeholder="สถานที่เก็บ"></div>
            <div class="col-md-4"><textarea class="form-control" id="ins-notes" rows="1" placeholder="หมายเหตุ"></textarea></div>
          </div>
        </div></div>
      </div>
      <div id="ins-list">
        ${items.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มีเครื่องดนตรี</div>' :
          items.map(i => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>${DOMPurify.sanitize(i.name)}</strong>
              ${i.category ? `<span class="text-muted small ms-2">${DOMPurify.sanitize(i.category)}</span>` : ''}
              <span class="badge bg-${condColors[i.condition] || 'secondary'} ms-2">${condLabels[i.condition] || i.condition}</span>
              ${i.quantity > 1 ? `<span class="badge bg-info ms-1">${i.quantity} ชิ้น</span>` : ''}
              ${i.storage_location ? `<span class="text-muted small ms-2"><i class="bi bi-geo"></i> ${DOMPurify.sanitize(i.storage_location)}</span>` : ''}
            </div>
            <button class="btn btn-sm btn-outline-danger" data-del="${i.id}"><i class="bi bi-trash"></i></button>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('ins-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/instruments', {
        name: document.getElementById('ins-name').value,
        category: document.getElementById('ins-cat').value || null,
        condition: document.getElementById('ins-cond').value,
        quantity: parseInt(document.getElementById('ins-qty').value) || 1,
        serial_number: document.getElementById('ins-serial').value || null,
        storage_location: document.getElementById('ins-loc').value || null,
        notes: document.getElementById('ins-notes').value || null
      });
      if (res.success) { App.toast('เพิ่มเครื่องดนตรีสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบเครื่องดนตรีนี้?')) return;
        const res = await API.del(`/api/instruments/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ==================== Quick Drop Module ====================
App.modules['quick-drop'] = {
  async render(area) {
    const res = await API.get('/api/quick-drop');
    const drops = res.success ? res.data : [];
    const statusLabels = { pending: 'รอจัดหมวด', categorized: 'จัดแล้ว', linked: 'เชื่อมต่อแล้ว' };
    const statusColors = { pending: 'warning', categorized: 'info', linked: 'success' };
    const moduleLabels = { 'portfolio': 'Portfolio', 'classroom-materials': 'สื่อ', 'research': 'วิจัย', 'innovation': 'นวัตกรรม', 'documents': 'เอกสาร' };

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-cloud-arrow-down me-2"></i>Quick Drop</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#qd-form"><i class="bi bi-plus-lg me-1"></i>Drop ใหม่</button>
      </div>
      <div class="collapse mb-3" id="qd-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="mb-2"><textarea class="form-control" id="qd-content" rows="3" placeholder="โน้ต เนื้อหา หรือ URL ไฟล์"></textarea></div>
          <div class="row g-2">
            <div class="col-md-8"><input class="form-control" id="qd-url" placeholder="URL ไฟล์ (ไม่บังคับ)"></div>
            <div class="col-md-4"><button class="btn btn-success w-100" id="qd-save"><i class="bi bi-cloud-arrow-down me-1"></i>Drop!</button></div>
          </div>
        </div></div>
      </div>
      <div id="qd-list">
        ${drops.length === 0 ? '<div class="text-muted text-center py-4">ยังไม่มี Quick Drop</div>' :
          drops.map(d => `
          <div class="card border-0 shadow-sm mb-2"><div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="badge bg-${statusColors[d.status] || 'secondary'} me-2">${statusLabels[d.status] || d.status}</span>
                ${d.content ? `<span>${DOMPurify.sanitize(d.content).substring(0,100)}</span>` : ''}
                ${d.file_url ? `<div class="small"><a href="${DOMPurify.sanitize(d.file_url)}" target="_blank"><i class="bi bi-link-45deg"></i> ไฟล์</a></div>` : ''}
                <div class="text-muted small">${d.dropped_at || ''}</div>
              </div>
              <div class="d-flex gap-1">
                <select class="form-select form-select-sm" style="width:auto" data-link="${d.id}">
                  <option value="">-- เชื่อมโมดูล --</option>
                  ${Object.entries(moduleLabels).map(([k,v]) => `<option value="${k}" ${d.linked_to_module===k?'selected':''}>${v}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-outline-danger" data-del="${d.id}"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          </div></div>`).join('')}
      </div>`;

    document.getElementById('qd-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/quick-drop', {
        content: document.getElementById('qd-content').value || null,
        file_url: document.getElementById('qd-url').value || null
      });
      if (res.success) { App.toast('Drop สำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-link]').forEach(sel => {
      sel.addEventListener('change', async () => {
        const module = sel.value;
        if (!module) return;
        await API.put(`/api/quick-drop/${sel.dataset.link}`, {
          linked_to_module: module, status: 'linked'
        });
        App.toast('เชื่อมต่อโมดูลแล้ว'); this.render(area);
      });
    });

    area.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบ Quick Drop นี้?')) return;
        const res = await API.del(`/api/quick-drop/${btn.dataset.del}`);
        if (res.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });
  }
};

// ===================== EARLY WARNING (Student Alerts) =====================
App.modules['early-warning'] = {
  async render(area) {
    const sems = await API.get('/api/semesters');
    const semOpts = sems.success ? sems.data.map(s =>
      `<option value="${App.esc(s.id)}">${App.esc(s.academic_year)} / ${App.esc(s.semester)}</option>`
    ).join('') : '';
    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle me-2"></i>ระบบเตือนภัยล่วงหน้า</h5>
        <div class="d-flex gap-2">
          <select id="ew-semester" class="form-select form-select-sm" style="width:auto">${semOpts}</select>
          <button class="btn btn-sm btn-warning" id="ew-generate"><i class="bi bi-cpu me-1"></i>วิเคราะห์</button>
        </div>
      </div>
      <div id="ew-filter" class="btn-group mb-3">
        <button class="btn btn-sm btn-outline-secondary active" data-risk="">ทั้งหมด</button>
        <button class="btn btn-sm btn-outline-danger" data-risk="critical">วิกฤต</button>
        <button class="btn btn-sm btn-outline-warning" data-risk="watch">เฝ้าระวัง</button>
        <button class="btn btn-sm btn-outline-success" data-risk="normal">ปกติ</button>
      </div>
      <div id="ew-list"><div class="loading"></div></div>`;

    const loadAlerts = async (risk) => {
      const semId = document.getElementById('ew-semester')?.value || '';
      let url = '/api/student-alerts?semester_id=' + encodeURIComponent(semId);
      if (risk) url += '&risk_level=' + encodeURIComponent(risk);
      const res = await API.get(url);
      const list = document.getElementById('ew-list');
      if (!res.success || !res.data?.length) {
        list.innerHTML = '<div class="empty-state"><i class="bi bi-shield-check d-block"></i><p>ไม่พบข้อมูล — กดปุ่ม "วิเคราะห์" เพื่อสร้างรายงาน</p></div>';
        return;
      }
      const riskColors = { critical: 'danger', watch: 'warning', normal: 'success' };
      const riskLabels = { critical: 'วิกฤต', watch: 'เฝ้าระวัง', normal: 'ปกติ' };
      const typeLabels = { academic: 'วิชาการ', attendance: 'การเข้าเรียน', behavior: 'พฤติกรรม', combined: 'รวม' };
      list.innerHTML = `
        <div class="table-responsive"><table class="table table-hover align-middle mb-0">
          <thead class="table-light"><tr><th>ชื่อ</th><th>ประเภท</th><th>ระดับ</th><th>คะแนนเสี่ยง</th><th>ปัจจัย</th><th></th></tr></thead>
          <tbody>${res.data.map(a => {
            let factors = {};
            try { factors = JSON.parse(a.factors || '{}'); } catch(e) {}
            return `<tr class="${a.is_resolved ? 'text-decoration-line-through text-muted' : ''}">
              <td><strong>${App.esc(a.first_name)} ${App.esc(a.last_name)}</strong><br><small class="text-muted">${App.esc(a.student_code)}</small></td>
              <td><span class="badge bg-secondary">${typeLabels[a.alert_type] || a.alert_type}</span></td>
              <td><span class="badge bg-${riskColors[a.risk_level] || 'secondary'}">${riskLabels[a.risk_level] || a.risk_level}</span></td>
              <td><div class="progress" style="width:80px;height:20px"><div class="progress-bar bg-${riskColors[a.risk_level]}" style="width:${a.risk_score}%">${a.risk_score}</div></div></td>
              <td><small>${factors.attendance_rate !== null ? 'เข้าเรียน ' + factors.attendance_rate + '% ' : ''}${factors.avg_score !== null ? 'คะแนน ' + factors.avg_score + '% ' : ''}${factors.sdq_risk ? 'SDQ: ' + factors.sdq_risk : ''}</small></td>
              <td>${!a.is_resolved ? `<button class="btn btn-sm btn-outline-success" data-resolve="${App.esc(a.id)}"><i class="bi bi-check-lg"></i></button>` : '<i class="bi bi-check-circle text-success"></i>'}</td>
            </tr>`;
          }).join('')}</tbody></table></div>`;

      list.querySelectorAll('[data-resolve]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await API.put(`/api/student-alerts/${btn.dataset.resolve}`, { is_resolved: true });
          App.toast('แก้ไขแล้ว'); loadAlerts(document.querySelector('#ew-filter .active')?.dataset.risk || '');
        });
      });
    };

    document.getElementById('ew-generate').addEventListener('click', async () => {
      const semId = document.getElementById('ew-semester')?.value;
      if (!semId) { App.toast('เลือกภาคเรียน', 'danger'); return; }
      document.getElementById('ew-list').innerHTML = '<div class="loading"></div>';
      const res = await API.post('/api/student-alerts/generate', { semester_id: semId });
      if (res.success) {
        App.toast(`วิเคราะห์เสร็จ: ${res.data.generated} คน จาก ${res.data.total_students} คน`);
        loadAlerts('');
      } else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    document.querySelectorAll('#ew-filter .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ew-filter .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAlerts(btn.dataset.risk);
      });
    });

    document.getElementById('ew-semester').addEventListener('change', () => {
      loadAlerts(document.querySelector('#ew-filter .active')?.dataset.risk || '');
    });

    loadAlerts('');
  }
};

// ===================== EVIDENCE POOL =====================
App.modules['evidence-pool'] = {
  async render(area) {
    const sems = await API.get('/api/semesters');
    const semOpts = sems.success ? sems.data.map(s =>
      `<option value="${App.esc(s.id)}">${App.esc(s.academic_year)} / ${App.esc(s.semester)}</option>`
    ).join('') : '';
    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="fw-bold mb-0"><i class="bi bi-collection me-2"></i>คลังหลักฐาน (Evidence Pool)</h5>
        <div class="d-flex gap-2">
          <select id="ep-semester" class="form-select form-select-sm" style="width:auto">${semOpts}</select>
          <button class="btn btn-sm btn-info text-white" id="ep-collect"><i class="bi bi-arrow-repeat me-1"></i>รวบรวมอัตโนมัติ</button>
          <button class="btn btn-sm btn-primary" id="ep-add"><i class="bi bi-plus-lg me-1"></i>เพิ่มหลักฐาน</button>
        </div>
      </div>
      <div id="ep-filter" class="btn-group mb-3">
        <button class="btn btn-sm btn-outline-secondary active" data-pa="">ทั้งหมด</button>
        <button class="btn btn-sm btn-outline-primary" data-pa="teaching_hours">PA1 การสอน</button>
        <button class="btn btn-sm btn-outline-success" data-pa="support_hours">PA2 สนับสนุน</button>
        <button class="btn btn-sm btn-outline-warning" data-pa="challenging_task">PA3 วิจัย</button>
        <button class="btn btn-sm btn-outline-info" data-pa="other_hours">PA4 อื่นๆ</button>
      </div>
      <div id="ep-list"><div class="loading"></div></div>`;

    const loadEvidence = async (pa) => {
      const semId = document.getElementById('ep-semester')?.value || '';
      let url = '/api/evidence-pool?semester_id=' + encodeURIComponent(semId);
      if (pa) url += '&pa_category=' + encodeURIComponent(pa);
      const res = await API.get(url);
      const list = document.getElementById('ep-list');
      if (!res.success || !res.data?.length) {
        list.innerHTML = '<div class="empty-state"><i class="bi bi-folder2-open d-block"></i><p>ยังไม่มีหลักฐาน — กด "รวบรวมอัตโนมัติ" เพื่อดึงจากโมดูลต่างๆ</p></div>';
        return;
      }
      const typeLabels = { teaching: 'การสอน', support: 'สนับสนุน', research: 'วิจัย', innovation: 'นวัตกรรม', other: 'อื่นๆ' };
      const paLabels = { teaching_hours: 'PA1', support_hours: 'PA2', challenging_task: 'PA3', other_hours: 'PA4' };
      list.innerHTML = `
        <div class="row g-3">${res.data.map(ev => `
          <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between mb-2">
                  <span class="badge bg-primary">${paLabels[ev.pa_category] || '-'}</span>
                  <span class="badge bg-secondary">${typeLabels[ev.evidence_type] || ev.evidence_type}</span>
                </div>
                <h6 class="fw-bold">${App.esc(ev.title)}</h6>
                <p class="text-muted small mb-1">${App.esc((ev.description || '').substring(0, 100))}</p>
                <small class="text-muted"><i class="bi bi-${ev.auto_collected ? 'robot' : 'pencil'} me-1"></i>${ev.auto_collected ? 'อัตโนมัติจาก ' + App.esc(ev.source_module) : 'เพิ่มเอง'}</small>
              </div>
              <div class="card-footer bg-white border-0 pt-0">
                <small class="text-muted">${new Date(ev.created_at).toLocaleDateString('th-TH')}</small>
                ${!ev.auto_collected ? `<button class="btn btn-sm btn-outline-danger float-end" data-ep-del="${App.esc(ev.id)}"><i class="bi bi-trash"></i></button>` : ''}
              </div>
            </div>
          </div>`).join('')}
        </div>`;

      list.querySelectorAll('[data-ep-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('ลบหลักฐานนี้?')) return;
          await API.del(`/api/evidence-pool/${btn.dataset.epDel}`);
          App.toast('ลบแล้ว'); loadEvidence(document.querySelector('#ep-filter .active')?.dataset.pa || '');
        });
      });
    };

    document.getElementById('ep-collect').addEventListener('click', async () => {
      const semId = document.getElementById('ep-semester')?.value;
      if (!semId) { App.toast('เลือกภาคเรียน', 'danger'); return; }
      document.getElementById('ep-list').innerHTML = '<div class="loading"></div>';
      const res = await API.post('/api/evidence-pool/auto-collect', { semester_id: semId });
      if (res.success) {
        App.toast(`รวบรวมเสร็จ: ${res.data.collected} รายการใหม่`);
        loadEvidence('');
      } else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    document.getElementById('ep-add').addEventListener('click', () => {
      const list = document.getElementById('ep-list');
      list.innerHTML = `
        <div class="card border-0 shadow-sm"><div class="card-body">
          <h6 class="fw-bold mb-3">เพิ่มหลักฐานใหม่</h6>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label">ชื่อหลักฐาน *</label><input id="ep-title" class="form-control"></div>
            <div class="col-md-3"><label class="form-label">ประเภท</label>
              <select id="ep-type" class="form-select"><option value="teaching">การสอน</option><option value="support">สนับสนุน</option><option value="research">วิจัย</option><option value="innovation">นวัตกรรม</option><option value="other">อื่นๆ</option></select></div>
            <div class="col-md-3"><label class="form-label">หมวด PA</label>
              <select id="ep-pa" class="form-select"><option value="teaching_hours">PA1</option><option value="support_hours">PA2</option><option value="challenging_task">PA3</option><option value="other_hours">PA4</option></select></div>
            <div class="col-12"><label class="form-label">รายละเอียด</label><textarea id="ep-desc" class="form-control" rows="3"></textarea></div>
          </div>
          <div class="mt-3"><button class="btn btn-primary" id="ep-save"><i class="bi bi-check-lg me-1"></i>บันทึก</button>
            <button class="btn btn-outline-secondary ms-2" id="ep-cancel">ยกเลิก</button></div>
        </div></div>`;
      document.getElementById('ep-save').addEventListener('click', async () => {
        const title = document.getElementById('ep-title').value.trim();
        if (!title) { App.toast('ระบุชื่อหลักฐาน', 'danger'); return; }
        const res = await API.post('/api/evidence-pool', {
          title, description: document.getElementById('ep-desc').value,
          evidence_type: document.getElementById('ep-type').value,
          pa_category: document.getElementById('ep-pa').value,
          semester_id: document.getElementById('ep-semester')?.value
        });
        if (res.success) { App.toast('เพิ่มหลักฐานแล้ว'); loadEvidence(''); }
        else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
      });
      document.getElementById('ep-cancel').addEventListener('click', () => loadEvidence(''));
    });

    document.querySelectorAll('#ep-filter .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ep-filter .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadEvidence(btn.dataset.pa);
      });
    });

    document.getElementById('ep-semester').addEventListener('change', () => {
      loadEvidence(document.querySelector('#ep-filter .active')?.dataset.pa || '');
    });

    loadEvidence('');
  }
};

// ===================== NOTIFICATIONS MODULE =====================
App.modules['notifications'] = {
  async render(area) {
    area.innerHTML = '<div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-bold mb-0"><i class="bi bi-bell me-2"></i>แจ้งเตือน</h5><button class="btn btn-sm btn-outline-primary" id="notif-read-all"><i class="bi bi-check-all me-1"></i>อ่านทั้งหมด</button></div><div id="notif-list"><div class="loading"></div></div>';

    const load = async () => {
      const res = await API.get('/api/notifications');
      const list = document.getElementById('notif-list');
      if (!res.success || !res.data?.length) {
        list.innerHTML = '<div class="empty-state"><i class="bi bi-bell-slash d-block"></i><p>ไม่มีแจ้งเตือน</p></div>';
        return;
      }
      const typeIcons = { early_warning: 'exclamation-triangle', pa_deadline: 'calendar-check', award_deadline: 'trophy', system: 'gear' };
      list.innerHTML = res.data.map(n => `
        <div class="card border-0 shadow-sm mb-2 ${n.is_read ? '' : 'border-start border-primary border-3'}">
          <div class="card-body py-2 d-flex justify-content-between align-items-start">
            <div>
              <i class="bi bi-${typeIcons[n.notification_type] || 'bell'} me-1 text-primary"></i>
              <strong class="small">${App.esc(n.title)}</strong>
              <p class="text-muted small mb-0">${App.esc(n.message || '')}</p>
              <small class="text-muted">${new Date(n.created_at).toLocaleDateString('th-TH')}</small>
            </div>
            <div class="d-flex gap-1">
              ${!n.is_read ? `<button class="btn btn-sm btn-outline-primary" data-notif-read="${App.esc(n.id)}" title="อ่านแล้ว"><i class="bi bi-check"></i></button>` : ''}
              <button class="btn btn-sm btn-outline-danger" data-notif-del="${App.esc(n.id)}" title="ลบ"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`).join('');

      list.querySelectorAll('[data-notif-read]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await API.put(`/api/notifications/${btn.dataset.notifRead}`, { is_read: true });
          load(); App.loadNotifBadge();
        });
      });
      list.querySelectorAll('[data-notif-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await API.del(`/api/notifications/${btn.dataset.notifDel}`);
          App.toast('ลบแล้ว'); load(); App.loadNotifBadge();
        });
      });
    };

    document.getElementById('notif-read-all').addEventListener('click', async () => {
      await API.put('/api/notifications/read-all');
      App.toast('อ่านทั้งหมดแล้ว'); load(); App.loadNotifBadge();
    });

    load();
  }
};

// ==================== PDPA Consent Module ====================
App.modules['pdpa-consent'] = {
  async render(area) {
    const [semRes, clsRes, consentRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/classrooms'), API.get('/api/pdpa-consent')
    ]);
    const sems = semRes.success ? semRes.data : [];
    const cls = clsRes.success ? clsRes.data : [];
    const consents = consentRes.success ? consentRes.data : [];
    const activeSem = sems.find(s => s.is_active);

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-shield-lock-fill me-2 text-primary"></i>PDPA ความยินยอม</h4>
        <button class="btn btn-primary" id="pdpa-add"><i class="bi bi-plus-lg me-1"></i>บันทึกความยินยอม</button>
      </div>

      <div class="collapse mb-3" id="pdpa-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4">
              <select class="form-select" id="pdpa-cls">
                <option value="">-- เลือกห้อง --</option>
                ${cls.map(c => `<option value="${c.id}">${App.esc(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-4"><button class="btn btn-outline-primary w-100" id="pdpa-load-stu"><i class="bi bi-people me-1"></i>โหลดนักเรียน</button></div>
          </div>
          <div id="pdpa-stu-area"></div>
        </div></div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped align-middle">
          <thead class="table-primary"><tr>
            <th>รหัสนักเรียน</th><th>ชื่อ-สกุล</th><th>ประเภท</th><th>สถานะ</th><th>ผู้ปกครอง</th><th>วันที่</th>
          </tr></thead>
          <tbody>
            ${consents.length ? consents.map(c => `<tr>
              <td>${App.esc(c.student_code)}</td>
              <td>${App.esc(c.first_name)} ${App.esc(c.last_name)}</td>
              <td>${App.esc(c.consent_type)}</td>
              <td>${c.is_consented ? '<span class="badge bg-success">ยินยอม</span>' : '<span class="badge bg-danger">ไม่ยินยอม</span>'}</td>
              <td>${App.esc(c.guardian_name || '-')}</td>
              <td>${c.consent_date || '-'}</td>
            </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted py-3">ยังไม่มีข้อมูล</td></tr>'}
          </tbody>
        </table>
      </div>`;

    document.getElementById('pdpa-add').addEventListener('click', () => {
      new bootstrap.Collapse(document.getElementById('pdpa-form')).toggle();
    });

    document.getElementById('pdpa-load-stu').addEventListener('click', async () => {
      const clsId = document.getElementById('pdpa-cls').value;
      if (!clsId) { App.toast('เลือกห้องเรียน', 'warning'); return; }
      const stuRes = await API.get(`/api/students?classroom_id=${clsId}`);
      const students = stuRes.success ? stuRes.data : [];
      if (!students.length) { App.toast('ไม่พบนักเรียน', 'warning'); return; }

      const stuArea = document.getElementById('pdpa-stu-area');
      stuArea.innerHTML = `
        <div class="mt-2">
          <div class="row g-2 mb-2">
            <div class="col-md-3"><select class="form-select form-select-sm" id="pdpa-type">
              <option value="general">ทั่วไป</option><option value="photo">ภาพถ่าย</option>
              <option value="academic">ข้อมูลวิชาการ</option><option value="health">ข้อมูลสุขภาพ</option>
            </select></div>
            <div class="col-md-3"><input class="form-control form-control-sm" id="pdpa-guardian" placeholder="ชื่อผู้ปกครอง"></div>
            <div class="col-md-3"><input class="form-control form-control-sm" id="pdpa-relation" placeholder="ความสัมพันธ์"></div>
          </div>
          <div class="list-group list-group-flush" style="max-height:300px;overflow-y:auto">
            ${students.map(s => `
            <label class="list-group-item d-flex align-items-center gap-2">
              <input type="checkbox" class="form-check-input" value="${s.id}" checked>
              <span>${App.esc(s.student_code)} ${App.esc(s.first_name)} ${App.esc(s.last_name)}</span>
            </label>`).join('')}
          </div>
          <button class="btn btn-success mt-2" id="pdpa-save-batch"><i class="bi bi-check-lg me-1"></i>บันทึกความยินยอมทั้งหมด</button>
        </div>`;

      document.getElementById('pdpa-save-batch').addEventListener('click', async () => {
        const checkedIds = [...stuArea.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
        const type = document.getElementById('pdpa-type').value;
        const guardian = document.getElementById('pdpa-guardian').value;
        const relation = document.getElementById('pdpa-relation').value;
        let saved = 0;
        for (const sid of checkedIds) {
          const r = await API.post('/api/pdpa-consent', {
            student_id: sid, consent_type: type, is_consented: true,
            guardian_name: guardian || null, guardian_relation: relation || null
          });
          if (r.success) saved++;
        }
        App.toast(`บันทึกความยินยอม ${saved} คน สำเร็จ!`);
        this.render(area);
      });
    });
  }
};

// ==================== Activities (clubs) Module ====================
App.modules['activities'] = {
  async render(area) {
    const [semRes, actRes] = await Promise.all([
      API.get('/api/semesters'), API.get('/api/activities')
    ]);
    const activeSem = (semRes.success ? semRes.data : []).find(s => s.is_active);
    const activities = actRes.success ? actRes.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-music-note-beamed me-2 text-primary"></i>ชุมนุม / กิจกรรม</h4>
        <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#act-form"><i class="bi bi-plus-lg me-1"></i>เพิ่มกิจกรรม</button>
      </div>

      <div class="collapse mb-3" id="act-form">
        <div class="card border-0 shadow-sm"><div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4"><input class="form-control" id="act-name" placeholder="ชื่อกิจกรรม/ชุมนุม"></div>
            <div class="col-md-3"><select class="form-select" id="act-type">
              <option value="club">ชุมนุม</option><option value="band">วงดนตรี</option>
              <option value="sport">กีฬา</option><option value="scout">ลูกเสือ</option>
              <option value="other">อื่นๆ</option>
            </select></div>
            <div class="col-md-2"><select class="form-select" id="act-day">
              <option value="">วัน</option>
              <option value="1">จันทร์</option><option value="2">อังคาร</option>
              <option value="3">พุธ</option><option value="4">พฤหัสบดี</option><option value="5">ศุกร์</option>
            </select></div>
            <div class="col-md-3"><input class="form-control" id="act-period" placeholder="คาบ/เวลา"></div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-md-4"><input class="form-control" id="act-location" placeholder="สถานที่"></div>
            <div class="col-md-2"><input class="form-control" type="number" id="act-max" placeholder="จำนวนสูงสุด" value="30"></div>
            <div class="col-md-4"><textarea class="form-control" id="act-desc" rows="1" placeholder="รายละเอียด"></textarea></div>
            <div class="col-md-2"><button class="btn btn-success w-100" id="act-save">บันทึก</button></div>
          </div>
        </div></div>
      </div>

      <div class="row g-3" id="act-list">
        ${activities.length ? activities.map(a => {
          const dayNames = ['','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์'];
          const typeNames = {club:'ชุมนุม',band:'วงดนตรี',sport:'กีฬา',scout:'ลูกเสือ',other:'อื่นๆ'};
          return `
          <div class="col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between">
                  <h6 class="fw-bold">${App.esc(a.name)}</h6>
                  <span class="badge bg-info">${typeNames[a.activity_type] || a.activity_type}</span>
                </div>
                <p class="text-muted small mb-1">${a.description ? App.esc(a.description) : ''}</p>
                <div class="small text-muted">
                  ${a.day_of_week ? '<i class="bi bi-calendar3 me-1"></i>' + (dayNames[a.day_of_week] || '') : ''}
                  ${a.period ? ' <i class="bi bi-clock ms-2 me-1"></i>' + App.esc(a.period) : ''}
                  ${a.location ? ' <i class="bi bi-geo-alt ms-2 me-1"></i>' + App.esc(a.location) : ''}
                </div>
                <div class="mt-2 d-flex justify-content-between align-items-center">
                  <span class="badge bg-success">${a.member_count || 0} / ${a.max_members} คน</span>
                  <div>
                    <button class="btn btn-sm btn-outline-primary" data-act-members="${a.id}" data-act-name="${App.esc(a.name)}"><i class="bi bi-people"></i></button>
                    <button class="btn btn-sm btn-outline-danger" data-act-del="${a.id}"><i class="bi bi-trash"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
        }).join('') : '<div class="col-12 text-center text-muted py-4">ยังไม่มีกิจกรรม — กดปุ่ม "เพิ่มกิจกรรม" เพื่อเริ่มต้น</div>'}
      </div>`;

    document.getElementById('act-save')?.addEventListener('click', async () => {
      const res = await API.post('/api/activities', {
        name: document.getElementById('act-name').value,
        activity_type: document.getElementById('act-type').value,
        day_of_week: document.getElementById('act-day').value || null,
        period: document.getElementById('act-period').value || null,
        location: document.getElementById('act-location').value || null,
        max_members: parseInt(document.getElementById('act-max').value) || 30,
        description: document.getElementById('act-desc').value || null,
        semester_id: activeSem?.id || null
      });
      if (res.success) { App.toast('เพิ่มกิจกรรมสำเร็จ!'); this.render(area); }
      else App.toast(res.error || 'เกิดข้อผิดพลาด', 'danger');
    });

    area.querySelectorAll('[data-act-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ลบกิจกรรมนี้?')) return;
        const r = await API.del(`/api/activities/${btn.dataset.actDel}`);
        if (r.success) { App.toast('ลบแล้ว'); this.render(area); }
      });
    });

    area.querySelectorAll('[data-act-members]').forEach(btn => {
      btn.addEventListener('click', () => this.showMembers(btn.dataset.actMembers, btn.dataset.actName, area));
    });
  },

  async showMembers(actId, actName, area) {
    const [memRes, clsRes] = await Promise.all([
      API.get(`/api/activities/${actId}/members`), API.get('/api/classrooms')
    ]);
    const members = memRes.success ? memRes.data : [];
    const cls = clsRes.success ? clsRes.data : [];

    area.innerHTML = `
      <div class="d-flex align-items-center mb-3">
        <button class="btn btn-outline-secondary me-3" id="act-back"><i class="bi bi-arrow-left"></i></button>
        <h5 class="fw-bold mb-0">สมาชิก: ${actName}</h5>
      </div>
      <div class="row g-2 mb-3">
        <div class="col-md-4">
          <select class="form-select" id="act-mem-cls">
            <option value="">-- เลือกห้อง --</option>
            ${cls.map(c => `<option value="${c.id}">${App.esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3"><button class="btn btn-primary" id="act-load-stu"><i class="bi bi-plus me-1"></i>เพิ่มจากห้อง</button></div>
      </div>
      <div id="act-add-area"></div>
      <table class="table table-sm">
        <thead><tr><th>รหัส</th><th>ชื่อ-สกุล</th><th>บทบาท</th><th></th></tr></thead>
        <tbody>
          ${members.map(m => `<tr>
            <td>${App.esc(m.student_code)}</td>
            <td>${App.esc(m.first_name)} ${App.esc(m.last_name)}</td>
            <td>${m.role}</td>
            <td><button class="btn btn-sm btn-outline-danger" data-mem-del="${m.student_id}"><i class="bi bi-x"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    document.getElementById('act-back').addEventListener('click', () => this.render(area));

    document.getElementById('act-load-stu')?.addEventListener('click', async () => {
      const clsId = document.getElementById('act-mem-cls').value;
      if (!clsId) return;
      const sRes = await API.get(`/api/students?classroom_id=${clsId}`);
      const students = sRes.success ? sRes.data : [];
      const existing = new Set(members.map(m => m.student_id));
      const available = students.filter(s => !existing.has(s.id));
      const addArea = document.getElementById('act-add-area');
      addArea.innerHTML = available.length ? `<div class="list-group mb-2">${available.map(s => `
        <button class="list-group-item list-group-item-action" data-add-mem="${s.id}">
          <i class="bi bi-plus-circle me-1 text-success"></i>${App.esc(s.student_code)} ${App.esc(s.first_name)} ${App.esc(s.last_name)}
        </button>`).join('')}</div>` : '<div class="text-muted small mb-2">ไม่มีนักเรียนที่เพิ่มได้</div>';

      addArea.querySelectorAll('[data-add-mem]').forEach(b => {
        b.addEventListener('click', async () => {
          const r = await API.post(`/api/activities/${actId}/members`, { student_id: b.dataset.addMem });
          if (r.success) { App.toast('เพิ่มสมาชิกแล้ว'); this.showMembers(actId, actName, area); }
          else App.toast(r.error, 'danger');
        });
      });
    });

    area.querySelectorAll('[data-mem-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await API.del(`/api/activities/${actId}/members/${btn.dataset.memDel}`);
        App.toast('ลบสมาชิกแล้ว'); this.showMembers(actId, actName, area);
      });
    });
  }
};

// ==================== Backup Module ====================
App.modules['backup'] = {
  async render(area) {
    area.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/backup');
    const backups = res.success ? res.data : [];

    area.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-cloud-arrow-up me-2 text-primary"></i>สำรองข้อมูล</h4>
        <button class="btn btn-success" id="bk-trigger"><i class="bi bi-download me-1"></i>สำรองข้อมูลตอนนี้</button>
      </div>
      <div class="alert alert-info small"><i class="bi bi-info-circle me-1"></i>ระบบจะส่งออกข้อมูลทั้งหมดเป็นไฟล์ JSON ที่สามารถดาวน์โหลดเก็บไว้ในเครื่องได้</div>
      <div id="bk-list">
        ${backups.length ? backups.map(b => `
        <div class="card border-0 shadow-sm mb-2"><div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <strong>${b.backup_type === 'manual' ? 'สำรองด้วยตนเอง' : 'อัตโนมัติ'}</strong>
            <span class="badge bg-${b.status === 'completed' ? 'success' : 'secondary'} ms-2">${b.status}</span>
            <span class="text-muted small ms-2">${new Date(b.created_at).toLocaleString('th-TH')}</span>
          </div>
        </div></div>`).join('') : '<div class="text-muted text-center py-3">ยังไม่เคยสำรองข้อมูล</div>'}
      </div>`;

    document.getElementById('bk-trigger').addEventListener('click', async () => {
      const btn = document.getElementById('bk-trigger');
      btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังสำรอง...';
      const r = await API.post('/api/backup');
      if (r.success && r.data?.data) {
        const blob = new Blob([JSON.stringify(r.data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'harmoni-backup-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.toast('สำรองข้อมูลสำเร็จ! ไฟล์กำลังดาวน์โหลด');
        this.render(area);
      } else {
        App.toast(r.error || 'สำรองไม่สำเร็จ', 'danger');
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-download me-1"></i>สำรองข้อมูลตอนนี้';
      }
    });
  }
};