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

  navigate(moduleName) {
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(el => {
      el.classList.toggle('active', el.dataset.module === moduleName);
    });

    this.currentModule = moduleName;
    const area = document.getElementById('content-area');

    // Load module
    if (this.modules[moduleName]) {
      this.modules[moduleName].render(area);
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
      'calendar': 'ปฏิทิน',
      'documents': 'เอกสาร',
      'cover-designer': 'ออกแบบปก',
      'instruments': 'เครื่องดนตรี',
      'quick-drop': 'Quick Drop'
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
      await API.post('/api/subjects', { code, name_th: name, subject_type: type });
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
  async render(container) {
    container.innerHTML = '<div class="loading"></div>';

    const [semRes, subRes, classRes, studentRes] = await Promise.all([
      API.get('/api/semesters'),
      API.get('/api/subjects'),
      API.get('/api/classrooms'),
      API.get('/api/students?limit=9999')
    ]);

    const semesters = semRes.success ? semRes.data : [];
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = classRes.success ? classRes.data : [];
    const studentCount = studentRes.success ? studentRes.data.length : 0;

    const active = semesters.find(s => s.is_active);

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-speedometer2 me-2 text-primary"></i>แดชบอร์ด</h4>
        ${active ? `<span class="badge bg-primary fs-6">ปี ${active.academic_year} ภาค ${active.semester}</span>` : ''}
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-3 col-6">
          <div class="card stat-card bg-primary bg-gradient text-white">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small opacity-75">ภาคเรียน</div>
                  <div class="fs-3 fw-bold">${semesters.length}</div>
                </div>
                <i class="bi bi-calendar3 fs-2 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card stat-card bg-success bg-gradient text-white">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small opacity-75">วิชา</div>
                  <div class="fs-3 fw-bold">${subjects.length}</div>
                </div>
                <i class="bi bi-book fs-2 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card stat-card bg-info bg-gradient text-white">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small opacity-75">ห้องเรียน</div>
                  <div class="fs-3 fw-bold">${classrooms.length}</div>
                </div>
                <i class="bi bi-building fs-2 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card stat-card bg-warning bg-gradient text-white">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="small opacity-75">นักเรียน</div>
                  <div class="fs-3 fw-bold">${studentCount}</div>
                </div>
                <i class="bi bi-people fs-2 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${!active ? `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        ยังไม่ได้ตั้งค่าภาคเรียน — <a href="#" class="alert-link" onclick="App.navigate('settings')">ไปตั้งค่าเริ่มต้น</a>
      </div>` : ''}

      <div class="row g-3">
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold"><i class="bi bi-lightning me-2"></i>ใช้งานด่วน</div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary text-start" onclick="App.navigate('attendance')">
                  <i class="bi bi-calendar-check me-2"></i>เช็คชื่อ
                </button>
                <button class="btn btn-outline-primary text-start" onclick="App.navigate('schedule')">
                  <i class="bi bi-clock-history me-2"></i>ตารางสอน/คิวงาน
                </button>
                <button class="btn btn-outline-primary text-start" onclick="App.navigate('student-classroom')">
                  <i class="bi bi-send me-2"></i>สั่งงาน/ตรวจงาน
                </button>
                <button class="btn btn-outline-primary text-start" onclick="App.navigate('post-lesson')">
                  <i class="bi bi-chat-square-text me-2"></i>บันทึกหลังสอน
                </button>
                <button class="btn btn-outline-primary text-start" onclick="App.navigate('portfolio')">
                  <i class="bi bi-briefcase me-2"></i>เก็บผลงาน
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold"><i class="bi bi-book me-2"></i>วิชาที่สอน</div>
            <div class="card-body">
              ${subjects.length > 0 ? subjects.map(s => `
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <strong>${DOMPurify.sanitize(s.code)}</strong>
                    <span class="text-muted ms-2">${DOMPurify.sanitize(s.name)}</span>
                  </div>
                  <span class="badge bg-light text-dark">${s.subject_type === 'regular' ? 'พื้นฐาน' : s.subject_type === 'elective' ? 'เพิ่มเติม' : s.subject_type === 'activity' ? 'กิจกรรม' : s.subject_type}</span>
                </div>`).join('') : '<p class="text-muted mb-0">ยังไม่มีวิชา</p>'}
            </div>
          </div>
        </div>
      </div>`;
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
  periods: [1, 2, 3, 4, 5, 6, 7, 8],

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
              <th style="width:90px">วัน / คาบ</th>
              ${this.periods.map(p => `<th style="min-width:100px">คาบ ${p}</th>`).join('')}
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
