// HARMONI — Student App (student.html)

const StudentApp = {
  currentTab: 'feed',

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
  },

  switchTab(tab) {
    this.currentTab = tab;
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

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-house-door me-2"></i>หน้าหลัก</h5>
      ${res.data.map(post => `
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <span class="badge bg-primary">${DOMPurify.sanitize(post.subject_name || '')}</span>
              <small class="text-muted">${new Date(post.created_at).toLocaleDateString('th-TH')}</small>
            </div>
            <h6 class="fw-bold">${DOMPurify.sanitize(post.title)}</h6>
            <p class="text-muted small mb-0">${DOMPurify.sanitize(post.content || '').substring(0, 200)}</p>
          </div>
        </div>`).join('')}`;
  },

  async renderAssignments(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/feed?type=assignment');

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-file-earmark-text me-2"></i>งานที่ได้รับ</h5>
      ${!res.success || !res.data || res.data.length === 0
        ? '<div class="empty-state"><i class="bi bi-inbox d-block"></i><p>ยังไม่มีงาน</p></div>'
        : res.data.map(a => `
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h6 class="fw-bold">${DOMPurify.sanitize(a.title)}</h6>
              <small class="text-muted">กำหนดส่ง: ${a.due_date ? new Date(a.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</small>
            </div>
          </div>`).join('')}`;
  },

  async renderQuizzes(container) {
    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-pencil-square me-2"></i>แบบทดสอบ</h5>
      <div class="empty-state">
        <i class="bi bi-pencil-square d-block"></i>
        <p>ยังไม่มีแบบทดสอบ</p>
      </div>`;
  },

  async renderGrades(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/grades');

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-graph-up me-2"></i>คะแนนของฉัน</h5>
      ${!res.success || !res.data || res.data.length === 0
        ? '<div class="empty-state"><i class="bi bi-graph-up d-block"></i><p>ยังไม่มีคะแนน</p></div>'
        : `<div class="card border-0 shadow-sm"><div class="card-body p-0">
            <div class="table-responsive"><table class="table table-hover mb-0">
              <thead class="table-light"><tr><th>วิชา</th><th>คะแนน</th><th>เกรด</th></tr></thead>
              <tbody>${res.data.map(g => `
                <tr><td>${DOMPurify.sanitize(g.subject_name || '')}</td><td>${g.total_score || '-'}</td><td><strong>${g.grade || '-'}</strong></td></tr>`).join('')}
              </tbody></table></div></div></div>`}`;
  },

  async renderNotifications(container) {
    container.innerHTML = '<div class="loading"></div>';
    const res = await API.get('/api/student/notifications');

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-bell me-2"></i>แจ้งเตือน</h5>
      ${!res.success || !res.data || res.data.length === 0
        ? '<div class="empty-state"><i class="bi bi-bell d-block"></i><p>ไม่มีแจ้งเตือน</p></div>'
        : res.data.map(n => `
          <div class="card border-0 shadow-sm mb-2 ${n.is_read ? '' : 'border-start border-primary border-3'}">
            <div class="card-body py-2">
              <strong class="small">${DOMPurify.sanitize(n.title)}</strong>
              <p class="text-muted small mb-0">${DOMPurify.sanitize(n.message || '')}</p>
            </div>
          </div>`).join('')}`;
  },

  async renderProfile(container) {
    const res = await API.get('/api/auth/me');
    const user = res.success ? res.data : {};

    container.innerHTML = `
      <h5 class="fw-bold mb-3"><i class="bi bi-person me-2"></i>โปรไฟล์</h5>
      <div class="card border-0 shadow-sm">
        <div class="card-body text-center">
          <i class="bi bi-person-circle fs-1 text-muted d-block mb-3"></i>
          <h5 class="fw-bold">${DOMPurify.sanitize(user.display_name || '')}</h5>
          <p class="text-muted">${DOMPurify.sanitize(user.username || '')}</p>
        </div>
      </div>`;
  },

  toast(message, type = 'success') {
    // Reuse same toast logic
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

  // Logout
  document.getElementById('student-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    await API.post('/api/auth/logout');
    StudentApp.showLogin();
  });

  // Init
  StudentApp.init();
});
