$EF$BB$BF// HARMONI AI Panel — Quick AI (1-click) + Chat AI (interactive)
const AIPanel = {
  isOpen: false,
  mode: null,
  template: null,
  context: {},
  messages: [],
  panelEl: null,

  QUICK_TASKS: [
    { id: 'polish_post_lesson', icon: 'bi-pencil-square', label: '\u0e02\u0e31\u0e14\u0e40\u0e01\u0e25\u0e32\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e2b\u0e25\u0e31\u0e07\u0e2a\u0e2d\u0e19', desc: '\u0e41\u0e1b\u0e25\u0e07\u0e20\u0e32\u0e29\u0e32\u0e1e\u0e39\u0e14\u0e40\u0e1b\u0e47\u0e19\u0e20\u0e32\u0e29\u0e32\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23' },
    { id: 'analyze_test', icon: 'bi-bar-chart', label: '\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e02\u0e49\u0e2d\u0e2a\u0e2d\u0e1a', desc: 'IOC + \u0e08\u0e33\u0e41\u0e19\u0e01 + \u0e04\u0e27\u0e32\u0e21\u0e22\u0e32\u0e01' },
    { id: 'analyze_grade', icon: 'bi-graph-up', label: '\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e1c\u0e25\u0e40\u0e01\u0e23\u0e14', desc: '\u0e2a\u0e23\u0e38\u0e1b\u0e08\u0e38\u0e14\u0e41\u0e02\u0e47\u0e07/\u0e2d\u0e48\u0e2d\u0e19' },
    { id: 'early_warning', icon: 'bi-exclamation-triangle', label: 'Early Warning', desc: '\u0e04\u0e30\u0e41\u0e19\u0e19+\u0e40\u0e02\u0e49\u0e32\u0e40\u0e23\u0e35\u0e22\u0e19+SDQ' },
    { id: 'analyze_sdq', icon: 'bi-heart-pulse', label: '\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c SDQ', desc: '5 subscales \u0e41\u0e1b\u0e25\u0e1c\u0e25' },
    { id: 'polish_home_visit', icon: 'bi-house-heart', label: '\u0e02\u0e31\u0e14\u0e40\u0e01\u0e25\u0e32\u0e40\u0e22\u0e35\u0e48\u0e22\u0e21\u0e1a\u0e49\u0e32\u0e19', desc: '\u0e41\u0e1b\u0e25\u0e07\u0e20\u0e32\u0e29\u0e32\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23' },
    { id: 'categorize_quickdrop', icon: 'bi-lightning', label: '\u0e08\u0e31\u0e14\u0e2b\u0e21\u0e27\u0e14\u0e2b\u0e21\u0e39\u0e48 Quick Drop', desc: '\u0e08\u0e33\u0e41\u0e19\u0e01\u0e25\u0e07\u0e42\u0e21\u0e14\u0e39\u0e25' },
    { id: 'completeness_check', icon: 'bi-check2-all', label: '\u0e15\u0e23\u0e27\u0e08\u0e04\u0e27\u0e32\u0e21\u0e04\u0e23\u0e1a', desc: '\u0e04\u0e23\u0e1a/\u0e44\u0e21\u0e48\u0e04\u0e23\u0e1a + \u0e41\u0e19\u0e30\u0e19\u0e33' }
  ],

  CHAT_TASKS: [
    { id: 'course_structure', icon: 'bi-diagram-3', label: '\u0e23\u0e48\u0e32\u0e07\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e34\u0e0a\u0e32' },
    { id: 'lesson_plan', icon: 'bi-journal-text', label: '\u0e23\u0e48\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e2a\u0e2d\u0e19' },
    { id: 'teaching_style', icon: 'bi-lightbulb', label: '\u0e41\u0e19\u0e30\u0e19\u0e33\u0e23\u0e39\u0e1b\u0e41\u0e1a\u0e1a\u0e2a\u0e2d\u0e19' },
    { id: 'pdca_improve', icon: 'bi-arrow-repeat', label: 'PDCA \u0e1b\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e38\u0e07' },
    { id: 'create_rubric', icon: 'bi-table', label: '\u0e2a\u0e23\u0e49\u0e32\u0e07 Rubric' },
    { id: 'create_test', icon: 'bi-question-circle', label: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e02\u0e49\u0e2d\u0e2a\u0e2d\u0e1a' },
    { id: 'write_research', icon: 'bi-book', label: '\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e02\u0e35\u0e22\u0e19\u0e27\u0e34\u0e08\u0e31\u0e22' },
    { id: 'write_sar', icon: 'bi-file-earmark-text', label: '\u0e23\u0e48\u0e32\u0e07 SAR' },
    { id: 'write_pa', icon: 'bi-award', label: '\u0e23\u0e48\u0e32\u0e07 PA1' },
    { id: 'organize_pa2', icon: 'bi-folder2-open', label: '\u0e08\u0e31\u0e14 Evidence PA2' },
    { id: 'write_innovation', icon: 'bi-rocket', label: '\u0e40\u0e02\u0e35\u0e22\u0e19\u0e19\u0e27\u0e31\u0e15\u0e01\u0e23\u0e23\u0e21' },
    { id: 'write_document', icon: 'bi-file-earmark-ruled', label: '\u0e23\u0e48\u0e32\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e23\u0e32\u0e0a\u0e01\u0e32\u0e23' },
    { id: 'khor4_readiness', icon: 'bi-trophy', label: '\u0e04\u0e28.4 Readiness' },
    { id: 'suggest_cover', icon: 'bi-palette', label: '\u0e41\u0e19\u0e30\u0e19\u0e33\u0e1b\u0e01' }
  ],

  init() {
    // Create panel element
    const panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `+
      <div class="ai-panel-backdrop" onclick="AIPanel.close()"></div>+
      <div class="ai-panel-drawer">+
        <div class="ai-panel-header">+
          <h5 class="mb-0"><i class="bi bi-stars me-2"></i>AI Assistant</h5>+
          <button class="btn btn-sm btn-outline-light" onclick="AIPanel.close()"><i class="bi bi-x-lg"></i></button>+
        </div>+
        <div class="ai-panel-body" id="ai-panel-body"></div>+
      </div>;
    document.body.appendChild(panel);
    this.panelEl = panel;

    // Add styles
    const style = document.createElement('style');
    style.textContent = 
      #ai-panel { display:none; position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999; }
      #ai-panel.open { display:flex; }
      .ai-panel-backdrop { flex:1; background:rgba(0,0,0,.3); }
      .ai-panel-drawer { width:420px; max-width:90vw; height:100%; background:#fff; display:flex; flex-direction:column; box-shadow:-4px 0 20px rgba(0,0,0,.15); }
      .ai-panel-header { background:linear-gradient(135deg,#0d6efd,#6610f2); color:#fff; padding:1rem; display:flex; justify-content:space-between; align-items:center; }
      .ai-panel-body { flex:1; overflow-y:auto; padding:1rem; }
      .ai-task-btn { display:flex; align-items:center; gap:.75rem; padding:.75rem; border:1px solid #dee2e6; border-radius:.5rem; cursor:pointer; transition:all .15s; background:#fff; width:100%; text-align:left; }
      .ai-task-btn:hover { border-color:#0d6efd; background:#f0f4ff; }
      .ai-task-btn i { font-size:1.25rem; color:#0d6efd; }
      .ai-msg { margin-bottom:.75rem; padding:.75rem; border-radius:.75rem; max-width:90%; }
      .ai-msg-user { background:#0d6efd; color:#fff; margin-left:auto; }
      .ai-msg-ai { background:#f8f9fa; border:1px solid #dee2e6; }
      .ai-msg-ai pre { white-space:pre-wrap; margin:0; font-family:inherit; }
      .ai-input-area { border-top:1px solid #dee2e6; padding:.75rem; display:flex; gap:.5rem; }
      .ai-loading { text-align:center; padding:2rem; color:#6c757d; }
    ;
    document.head.appendChild(style);
  },

  open(template, context, mode) {
    if (!this.panelEl) this.init();
    this.template = template;
    this.context = context || {};
    this.mode = mode || 'chat';
    this.messages = [];
    this.panelEl.classList.add('open');
    this.isOpen = true;

    if (!template) {
      this.renderTaskList();
    } else if (mode === 'quick') {
      this.sendMessage(context?.userInput || '\u0e0a\u0e48\u0e27\u0e22\u0e14\u0e49\u0e27\u0e22');
    } else {
      this.renderChat();
    }
  },

  close() {
    this.panelEl?.classList.remove('open');
    this.isOpen = false;
    this.messages = [];
  },

  renderTaskList() {
    const body = document.getElementById('ai-panel-body');
    body.innerHTML = 
      <h6 class="fw-semibold text-primary mb-3"><i class="bi bi-lightning me-1"></i>Quick AI (\u0e04\u0e25\u0e34\u0e01\u0e40\u0e14\u0e35\u0e22\u0e27)</h6>
      <p class="text-muted small">\u0e23\u0e30\u0e1a\u0e1a\u0e08\u0e30\u0e14\u0e36\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e08\u0e32\u0e01\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19\u0e41\u0e25\u0e30\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e1c\u0e25\u0e43\u0e2b\u0e49\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34</p>
      <div class="d-grid gap-2 mb-4">
        +this.QUICK_TASKS.map(t => <button class="ai-task-btn" onclick="AIPanel.quickRun('')"><i class="bi "></i><div><strong></strong><br><small class="text-muted"></small></div></button>).join('')+
      </div>
      <hr>
      <h6 class="fw-semibold text-primary mb-3"><i class="bi bi-chat-dots me-1"></i>Chat AI (\u0e2a\u0e19\u0e17\u0e19\u0e32)</h6>
      <div class="d-grid gap-2">
        +this.CHAT_TASKS.map(t => <button class="ai-task-btn" onclick="AIPanel.open('',{},'chat')"><i class="bi "></i><div><strong></strong></div></button>).join('')+
      </div>;
  },

  quickRun(template) {
    // Gather context from current page
    const ctx = this.gatherContext();
    this.open(template, ctx, 'quick');
  },

  gatherContext() {
    // Try to get data from current module's visible content
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return {};
    const text = mainContent.innerText?.substring(0, 3000) || '';
    return { pageContent: text };
  },

  renderChat() {
    const body = document.getElementById('ai-panel-body');
    const taskInfo = [...this.QUICK_TASKS, ...this.CHAT_TASKS].find(t => t.id === this.template);

    // Build context hint for lesson_plan / course_structure
    let ctxHint = '';
    let autoDraftBtn = '';
    if (this.template === 'lesson_plan' && this.context?.subject) {
      const parts = [];
      if (this.context.subject) parts.push((this.context.subject_code ? this.context.subject_code + ' ' : '') + this.context.subject);
      if (this.context.unit_title) parts.push('\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 ' + this.context.unit_number + ': ' + this.context.unit_title);
      if (this.context.indicators) parts.push('\u0e15\u0e31\u0e27\u0e0a\u0e35\u0e49\u0e27\u0e31\u0e14: ' + this.context.indicators);
      if (this.context.duration_minutes) parts.push(this.context.duration_minutes + ' \u0e19\u0e32\u0e17\u0e35');
      if (parts.length) {
        ctxHint = `<div class="alert alert-info small py-2 px-3 mb-2"><i class="bi bi-info-circle me-1"></i>${parts.join(' \u2022 ')}</div>`;
        autoDraftBtn = `<div class="d-grid mb-3"><button class="btn btn-primary btn-sm" id="btn-ai-auto-draft"><i class="bi bi-stars me-1"></i>\u0e23\u0e48\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e2a\u0e2d\u0e19\u0e43\u0e2b\u0e49\u0e40\u0e25\u0e22</button></div>`;
      }
    } else if (this.template === 'course_structure' && this.context?.subject) {
      ctxHint = `<div class="alert alert-info small py-2 px-3 mb-2"><i class="bi bi-info-circle me-1"></i>\u0e27\u0e34\u0e0a\u0e32: ${this.context.subject}</div>`;
      autoDraftBtn = `<div class="d-grid mb-3"><button class="btn btn-primary btn-sm" id="btn-ai-auto-draft"><i class="bi bi-stars me-1"></i>\u0e2d\u0e2d\u0e01\u0e41\u0e1a\u0e1a\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e34\u0e0a\u0e32\u0e43\u0e2b\u0e49\u0e40\u0e25\u0e22</button></div>`;
    }

    body.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0 fw-semibold">${taskInfo?.name || '\u0e2a\u0e19\u0e17\u0e19\u0e32\u0e01\u0e31\u0e1a AI'}</h6>
        <button class="btn btn-sm btn-outline-secondary" onclick="AIPanel.open()"><i class="bi bi-arrow-left me-1"></i>\u0e01\u0e25\u0e31\u0e1a</button>
      </div>
      ${ctxHint}
      ${autoDraftBtn}
      <div id="ai-messages"></div>
      <div class="ai-input-area">
        <input type="text" class="form-control" id="ai-input" placeholder="\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21..." onkeydown="if(event.key==='Enter')AIPanel.sendMessage()">
        <button class="btn btn-primary" onclick="AIPanel.sendMessage()"><i class="bi bi-send"></i></button>
      </div>`;
    document.getElementById('ai-input')?.focus();

    // Auto-draft button handler
    document.getElementById('btn-ai-auto-draft')?.addEventListener('click', () => {
      const ctx = this.context;
      let msg = '';
      if (this.template === 'lesson_plan') {
        const sub = (ctx.subject_code ? ctx.subject_code + ' ' : '') + (ctx.subject || '');
        const unit = ctx.unit_title ? ` \u0e2b\u0e19\u0e48\u0e27\u0e22: ${ctx.unit_title}` : '';
        const ind = ctx.indicators ? ` \u0e15\u0e31\u0e27\u0e0a\u0e35\u0e49\u0e27\u0e31\u0e14: ${ctx.indicators}` : '';
        const dur = ctx.duration_minutes ? ` \u0e40\u0e27\u0e25\u0e32 ${ctx.duration_minutes} \u0e19\u0e32\u0e17\u0e35` : '';
        const pln = ctx.plan_number ? ` \u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48 ${ctx.plan_number}` : '';
        msg = `\u0e23\u0e48\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e2a\u0e2d\u0e19${pln} \u0e27\u0e34\u0e0a\u0e32 ${sub}${unit}${ind}${dur}`.trim();
      } else if (this.template === 'course_structure') {
        msg = `\u0e2d\u0e2d\u0e01\u0e41\u0e1a\u0e1a\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e34\u0e0a\u0e32 ${ctx.subject || ''}`.trim();
      }
      if (msg) this.sendMessage(msg);
    });
  },

  async sendMessage(userInput) {
    const input = userInput || document.getElementById('ai-input')?.value?.trim();
    if (!input) return;

    // Clear input
    const inputEl = document.getElementById('ai-input');
    if (inputEl) inputEl.value = '';

    // Add user message
    this.messages.push({ role: 'user', content: input });

    // Show messages
    const msgArea = document.getElementById('ai-messages');
    if (!msgArea) {
      this.renderChat();
      await new Promise(r => setTimeout(r, 100));
    }
    this.renderMessages();

    // Show loading
    const loadId = 'ai-load-' + Date.now();
    const msgAreaEl = document.getElementById('ai-messages');
    if (msgAreaEl) {
      msgAreaEl.innerHTML += <div id="" class="ai-loading"><div class="spinner-border spinner-border-sm me-2"></div>\u0e01\u0e33\u0e25\u0e31\u0e07\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e1c\u0e25...</div>;
      msgAreaEl.scrollTop = msgAreaEl.scrollHeight;
    }

    try {
      const res = await API.post('/api/ai', {
        template: this.template,
        context: this.context,
        messages: this.messages.filter(m => m.role !== 'system'),
        userInput: input
      });

      document.getElementById(loadId)?.remove();

      if (res.success && res.data?.result) {
        this.messages.push({ role: 'assistant', content: res.data.result });
      } else {
        this.messages.push({ role: 'assistant', content: '\u274c ' + (res.error || '\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e1c\u0e25\u0e44\u0e14\u0e49 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32 API Key \u0e43\u0e19 Cloudflare Dashboard') });
      }
    } catch (e) {
      document.getElementById(loadId)?.remove();
      this.messages.push({ role: 'assistant', content: '\u274c \u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14: ' + (e.message || '') });
    }

    this.renderMessages();
  },

  renderMessages() {
    const area = document.getElementById('ai-messages');
    if (!area) return;
    area.innerHTML = this.messages.map(m => {
      if (m.role === 'user') {
        return <div class="ai-msg ai-msg-user"></div>;
      } else {
        return <div class="ai-msg ai-msg-ai"><pre></pre>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="AIPanel.copyResult(this)" title="\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01"><i class="bi bi-clipboard"></i></button>
            <button class="btn btn-sm btn-outline-success me-1" onclick="AIPanel.useResult(this)" title="\u0e40\u0e15\u0e34\u0e21\u0e25\u0e07\u0e1f\u0e2d\u0e23\u0e4c\u0e21"><i class="bi bi-box-arrow-in-down"></i></button>
            <button class="btn btn-sm btn-outline-secondary" onclick="AIPanel.sendMessage('\u0e23\u0e48\u0e32\u0e07\u0e43\u0e2b\u0e21\u0e48')" title="\u0e23\u0e48\u0e32\u0e07\u0e43\u0e2b\u0e21\u0e48"><i class="bi bi-arrow-repeat"></i></button>
          </div>
        </div>;
      }
    }).join('');
    area.scrollTop = area.scrollHeight;
  },

  copyResult(btn) {
    const text = btn.closest('.ai-msg-ai')?.querySelector('pre')?.textContent;
    if (text) {
      navigator.clipboard.writeText(text);
      App.toast('\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27!');
    }
  },

  useResult(btn) {
    const text = btn.closest('.ai-msg-ai')?.querySelector('pre')?.textContent;
    if (!text) return;
    const parsed = this._extractJSON(text);
    if (parsed && this.template === 'lesson_plan') { this._fillLessonPlanForm(parsed); return; }
    if (parsed && this.template === 'course_structure') { this._fillCourseStructureForm(parsed); return; }
    // Fallback: paste into last textarea
    const textareas = document.querySelectorAll('#main-content textarea:not([readonly])');
    if (textareas.length > 0) {
      const ta = textareas[textareas.length - 1];
      ta.value = text;
      ta.dispatchEvent(new Event('input'));
      App.toast('\u0e40\u0e15\u0e34\u0e21\u0e25\u0e07\u0e1f\u0e2d\u0e23\u0e4c\u0e21\u0e41\u0e25\u0e49\u0e27!');
      this.close();
    } else {
      navigator.clipboard.writeText(text);
      App.toast('\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27', 'info');
    }
  },

  _extractJSON(text) {
    // Try ===JSON=== marker first
    const marker = '===JSON===';
    const mIdx = text.lastIndexOf(marker);
    if (mIdx >= 0) {
      const after = text.slice(mIdx + marker.length).trim();
      const fb = after.indexOf('{');
      if (fb >= 0) { try { return JSON.parse(after.slice(fb)); } catch (e) {} }
    }
    // Try ```json code block
    const cb = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (cb) { try { return JSON.parse(cb[1]); } catch (e) {} }
    // Try last { ... } in text
    let depth = 0, end = -1, start = -1;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === '}') { if (depth === 0) end = i; depth++; }
      else if (text[i] === '{') { depth--; if (depth === 0) { start = i; break; } }
    }
    if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {} }
    return null;
  },

  _fillLessonPlanForm(plan) {
    // Find the currently open plan form
    let formArea = null;
    document.querySelectorAll('[id^="plan-form-area-"]').forEach(el => {
      if (el.querySelector('#lp-title')) formArea = el;
    });
    if (!formArea) {
      navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
      App.toast('\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01 JSON \u2014 \u0e40\u0e1b\u0e34\u0e14\u0e1f\u0e2d\u0e23\u0e4c\u0e21\u0e41\u0e1c\u0e19\u0e01\u0e48\u0e2d\u0e19', 'info');
      return;
    }
    const g = id => formArea.querySelector('#' + id);
    if (plan.title)            { const el = g('lp-title');       if (el) el.value = plan.title; }
    if (plan.objectives)       { const el = g('lp-objectives');  if (el) el.value = plan.objectives; }
    if (plan.content)          { const el = g('lp-content-text'); if (el) el.value = plan.content; }
    if (plan.steps)            { const el = g('lp-steps');       if (el) el.value = plan.steps; }
    if (plan.materials)        { const el = g('lp-materials');   if (el) el.value = plan.materials; }
    if (plan.assessment_notes) { const el = g('lp-assessment');  if (el) el.value = plan.assessment_notes; }
    App.toast('AI \u0e40\u0e15\u0e34\u0e21\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e2a\u0e2d\u0e19\u0e25\u0e07\u0e1f\u0e2d\u0e23\u0e4c\u0e21\u0e41\u0e25\u0e49\u0e27!');
    this.close();
  },

  _fillCourseStructureForm(data) {
    const g = id => document.getElementById(id);
    let filled = 0;
    if (data.learning_objectives && g('cs-objectives')) { g('cs-objectives').value = data.learning_objectives; filled++; }
    if (data.total_hours && g('cs-hours'))               { g('cs-hours').value = data.total_hours; filled++; }
    if (data.score_distribution && g('cs-score-dist'))   { g('cs-score-dist').value = data.score_distribution; filled++; }
    if (filled > 0) {
      const u = Array.isArray(data.units) ? ` (AI \u0e41\u0e19\u0e30\u0e19\u0e33 ${data.units.length} \u0e2b\u0e19\u0e48\u0e27\u0e22)` : '';
      App.toast(`AI \u0e40\u0e15\u0e34\u0e21\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e34\u0e0a\u0e32\u0e41\u0e25\u0e49\u0e27${u}`);
      this.close();
    } else {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      App.toast('\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01 JSON \u2014 \u0e40\u0e1b\u0e34\u0e14\u0e2b\u0e19\u0e49\u0e32\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e01\u0e48\u0e2d\u0e19', 'info');
    }
  }
};