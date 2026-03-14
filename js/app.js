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
      API.get('/api/students?limit=1')
    ]);

    const semesters = semRes.success ? semRes.data : [];
    const subjects = subRes.success ? subRes.data : [];
    const classrooms = classRes.success ? classRes.data : [];

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
                  <div class="fs-3 fw-bold">${studentRes.success ? studentRes.data.length : 0}</div>
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
                    <span class="text-muted ms-2">${DOMPurify.sanitize(s.name_th)}</span>
                  </div>
                  <span class="badge bg-light text-dark">${s.subject_type}</span>
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
                  <td>${DOMPurify.sanitize(sub.name_th)}</td>
                  <td>${sub.subject_type}</td>
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

    document.getElementById('btn-add-semester').addEventListener('click', async () => {
      const year = prompt('ปีการศึกษา (เช่น 2568):');
      const sem = prompt('ภาคเรียนที่ (1 หรือ 2):');
      if (year && sem) {
        await API.post('/api/semesters', { academic_year: parseInt(year), semester: parseInt(sem) });
        App.navigate('settings');
      }
    });

    document.getElementById('btn-add-subject').addEventListener('click', async () => {
      const code = prompt('รหัสวิชา:');
      const name = prompt('ชื่อวิชา:');
      if (code && name) {
        await API.post('/api/subjects', { code, name_th: name });
        App.navigate('settings');
      }
    });

    document.getElementById('btn-add-classroom').addEventListener('click', async () => {
      const grade = prompt('ระดับชั้น (1-6):');
      const room = prompt('ห้องที่:');
      if (grade && room) {
        await API.post('/api/classrooms', { grade_level: parseInt(grade), room_number: parseInt(room) });
        App.navigate('settings');
      }
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
