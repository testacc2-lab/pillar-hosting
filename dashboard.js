/* ═══════════════════════════════════════════════════════
   dashboard.js — Pella Dashboard Logic
   Requires: auth.js loaded first
═══════════════════════════════════════════════════════ */

// ── AUTH GUARD ────────────────────────────────────────────────────────────
const currentUser = Auth.requireAuth();
if (!currentUser) throw new Error('Not authenticated');

// ── STATE ─────────────────────────────────────────────────────────────────
const PROJECTS_KEY = 'pella_projects_' + currentUser.id;
const ACTIVITY_KEY = 'pella_activity_' + currentUser.id;
const BACKUPS_KEY  = 'pella_backups_'  + currentUser.id;
const NOTIFS_KEY   = 'pella_notifs_'   + currentUser.id;

let currentPage    = 'overview';
let selectedDeployType   = 'Flask';
let selectedDeployCategory = 'webapp';
let selectedDeployMethod = 'github';
let activeManagedProjectId = null;
let activeManageTab = 'console';

const DEPLOY_CATEGORY_TYPES = {
  webapp: ['Flask', 'Django', 'FastAPI', 'Express', 'Koa'],
  discord: ['Python', 'NodeJS', 'Bun', 'Java']
};

const TYPE_EMOJIS = {
  'Web App': '🌐',
  'Discord Bot': '🤖',
  'Express': '🚂',
  'Express.js': '🚂',
  'FastAPI': '⚡',
  'Flask': '🧪',
  'Django': '🎸',
  'Koa': '🥝',
  'Python': '🐍',
  'NodeJS': '🟢',
  'Node.js': '🟢',
  'Bun': '🍞',
  'Java': '☕'
};

// ── STORAGE HELPERS ───────────────────────────────────────────────────────
function getProjects() { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); }
function saveProjects(p) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(p)); }
function getActivity() { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]'); }
function saveActivity(a) { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(a)); }
function getBackups() { return JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]'); }
function saveBackups(b) { localStorage.setItem(BACKUPS_KEY, JSON.stringify(b)); }
function getNotifs() { return JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]'); }
function saveNotifs(n) { localStorage.setItem(NOTIFS_KEY, JSON.stringify(n)); }

function addActivity(text, type = 'info') {
  const log = getActivity();
  log.unshift({ text, type, time: new Date().toISOString() });
  if (log.length > 50) log.pop();
  saveActivity(log);
}
function addNotif(title, body = '') {
  const notifs = getNotifs();
  notifs.unshift({ title, body, time: new Date().toISOString(), id: Date.now() });
  saveNotifs(notifs);
  renderNotifBadge();
}

// ── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateUserUI();
  startClock();
  setupNavigation();
  setupDeployPage();
  cleanupLegacySeededProjects();
  renderOverview();
  renderNotifBadge();
  startResourceSimulator();
  startRequestCounter();
  handleInitialRoute();
});

function handleInitialRoute() {
  const hash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
  const routeMap = {
    profile: 'settings',
    settings: 'settings',
    deploy: 'deploy',
    projects: 'projects',
    console: 'console',
    files: 'files',
    backups: 'backups',
    addons: 'addons'
  };
  const targetPage = routeMap[hash];
  if (targetPage) navigateTo(targetPage);
}

function populateUserUI() {
  const u = currentUser;
  document.getElementById('userAvatar').textContent = u.avatar || u.name.slice(0,2).toUpperCase();
  document.getElementById('userName').textContent   = u.name;
  document.getElementById('userPlan').textContent   = 'Free Plan · Always $0';
  document.getElementById('welcomeMsg').textContent = 'Welcome back, ' + u.name.split(' ')[0] + '!';
  document.getElementById('bigAvatar').textContent        = u.avatar || u.name.slice(0,2).toUpperCase();
  document.getElementById('profileNameDisplay').textContent = u.name;
  document.getElementById('profileEmailDisplay').textContent = u.email;
  document.getElementById('settingName').value  = u.name;
  document.getElementById('settingEmail').value = u.email;
}

// ── CLOCK ─────────────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now  = new Date();
    const h    = String(now.getHours()).padStart(2,'0');
    const m    = String(now.getMinutes()).padStart(2,'0');
    const s    = String(now.getSeconds()).padStart(2,'0');
    document.getElementById('topbarClock').textContent = h + ':' + m + ':' + s;
  }
  tick();
  setInterval(tick, 1000);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
}

function navigateTo(page) {
  // update nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // update breadcrumb
  document.getElementById('topbarPage').textContent = navEl
    ? navEl.querySelector('span:nth-child(2)').textContent
    : (page === 'manage' ? 'Project Manager' : page);
  currentPage = page;

  // lazy render
  if (page === 'overview')  renderOverview();
  if (page === 'projects')  renderProjects();
  if (page === 'console')   setupConsoleSelect();
  if (page === 'files')     setupFilesSelect();
  if (page === 'backups')   renderBackups();
  if (page === 'addons')    renderAddons();
  if (page === 'manage')    renderProjectManager();
  if (page === 'settings')  populateUserUI();

  closeSidebar();
}

// ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── USER DROPDOWN ─────────────────────────────────────────────────────────
function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user-card')) {
    document.getElementById('userDropdown')?.classList.remove('open');
  }
  if (!e.target.closest('.notif-btn') && !e.target.closest('.notif-panel')) {
    document.getElementById('notifPanel')?.classList.remove('open');
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
function renderNotifBadge() {
  const notifs = getNotifs();
  const count  = document.getElementById('notifCount');
  if (notifs.length > 0) {
    count.textContent = notifs.length > 9 ? '9+' : notifs.length;
    count.style.display = 'flex';
  } else {
    count.style.display = 'none';
  }
}
function toggleNotifications() {
  document.getElementById('notifPanel').classList.toggle('open');
  renderNotifList();
}
function renderNotifList() {
  const notifs = getNotifs();
  const list   = document.getElementById('notifList');
  if (!notifs.length) {
    list.innerHTML = '<div class="np-empty">No new notifications</div>';
    return;
  }
  list.innerHTML = notifs.map(n => `
    <div class="np-item">
      <div class="np-item-title">${esc(n.title)}</div>
      ${n.body ? `<div style="font-size:0.76rem;color:var(--muted)">${esc(n.body)}</div>` : ''}
      <div class="np-item-time">${timeAgo(n.time)}</div>
    </div>`).join('');
}
function clearNotifications() {
  saveNotifs([]);
  renderNotifBadge();
  renderNotifList();
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────
function renderOverview() {
  const projects = getProjects();
  const running  = projects.filter(p => p.status === 'running');

  // stat cards
  animateNum(document.getElementById('scProjects'), running.length);
  const totalRam = running.reduce((s, p) => s + (p.ram || 128), 0);
  document.getElementById('scRam').textContent = totalRam >= 1024
    ? (totalRam/1024).toFixed(1) + ' GB' : totalRam + ' MB';
  document.getElementById('navBadgeProjects').textContent = projects.length;

  // projects preview (last 3)
  const listEl = document.getElementById('overviewProjectsList');
  if (!projects.length) {
    listEl.innerHTML = '<div class="activity-empty">No projects yet — <a href="#" onclick="navigateTo(\'deploy\');return false;" style="color:var(--pink)">deploy one</a>.</div>';
  } else {
    listEl.innerHTML = projects.slice(0,4).map(p => `
      <div class="ov-project-row">
        <div class="pc-icon ${typeClass(p.type)}" style="width:28px;height:28px">${typeLabel(p.type)}</div>
        <span class="ov-name">${esc(p.name)}</span>
        <span class="ov-type">${esc(p.type)}</span>
        <span class="pc-status ${p.status}">${p.status === 'running' ? '● Running' : p.status === 'deploying' ? '◌ Deploying' : '○ Stopped'}</span>
      </div>`).join('');
  }

  // activity log
  const acts = getActivity();
  const actEl = document.getElementById('activityList');
  if (!acts.length) {
    actEl.innerHTML = '<div class="activity-empty">No activity yet.</div>';
  } else {
    actEl.innerHTML = acts.slice(0,8).map(a => `
      <div class="activity-item">
        <div class="ai-dot ${a.type}"></div>
        <span class="ai-text">${esc(a.text)}</span>
        <span class="ai-time">${timeAgo(a.time)}</span>
      </div>`).join('');
  }
}

// ── PROJECTS ──────────────────────────────────────────────────────────────
function renderProjects(filter = '') {
  const projects = getProjects().filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()));
  const grid = document.getElementById('projectsGrid');

  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">NEW</div>
        <p>${filter ? 'No projects match your search.' : "You haven't deployed anything yet."}</p>
        <button class="btn-primary-sm" onclick="navigateTo('deploy')">+ Deploy your first project</button>
      </div>`;
    return;
  }

  grid.innerHTML = projects.map((p, i) => `
    <div class="project-card" style="animation-delay:${i * 60}ms">
      <div class="pc-header">
        <div class="pc-icon ${typeClass(p.type)}">${typeLabel(p.type)}</div>
        <div class="pc-info">
          <div class="pc-name">${esc(p.name)}</div>
          <div class="pc-type">${esc(p.type)}</div>
        </div>
        <div class="pc-status ${p.status}">
          ${p.status === 'running' ? '● Running' : p.status === 'deploying' ? '◌ Deploying' : '○ Stopped'}
        </div>
      </div>
      <div class="pc-meta">
        <span>RAM: ${p.ram || 128} MB</span>
        <span>CPU: ${p.cpu || '1'} vCPU</span>
        ${p.uptime ? `<span>Up: ${p.uptime}</span>` : ''}
        <span>Plan: ${p.plan || 'Free'}</span>
      </div>
      <div class="pc-actions">
        <button class="pc-btn primary" onclick="openProjectManager('${p.id}')">Manage Project</button>
      </div>
    </div>`).join('');
}

function filterProjects() {
  renderProjects(document.getElementById('projectSearch').value);
}

function projectAction(id, action) {
  const projects = getProjects();
  const p = projects.find(x => x.id === id);
  if (!p) return;

  if (action === 'delete') {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const updated = projects.filter(x => x.id !== id);
    saveProjects(updated);
    addActivity(`Deleted project "${p.name}"`, 'warn');
    addNotif('Project deleted', p.name + ' was removed.');
    if (activeManagedProjectId === id) {
      activeManagedProjectId = null;
      navigateTo('projects');
    }
    renderProjects();
    renderOverview();
    return;
  }
  if (action === 'start')   { p.status = 'running';  addActivity(`Started "${p.name}"`, 'success'); }
  if (action === 'stop')    { p.status = 'stopped';  addActivity(`Stopped "${p.name}"`, 'warn'); }
  if (action === 'restart') { p.status = 'running';  addActivity(`Restarted "${p.name}"`, 'info'); }

  saveProjects(projects);
  renderProjects(document.getElementById('projectSearch')?.value || '');
  renderOverview();
}

// ── DEPLOY ────────────────────────────────────────────────────────────────
function setupDeployPage() {
  const typePicker = document.getElementById('typePicker');
  const backBtn = document.getElementById('typeBack');

  function renderTypePicker() {
    const choices = DEPLOY_CATEGORY_TYPES[selectedDeployCategory] || [];
    typePicker.innerHTML = choices.map(type => {
      const emoji = TYPE_EMOJIS[type] || '🧩';
      const active = type === selectedDeployType ? ' active' : '';
      return `<button class="type-btn${active}" data-type="${esc(type)}"><span class="qd-icon" aria-hidden="true">${emoji}</span>${esc(type)}</button>`;
    }).join('');

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDeployType = btn.dataset.type;
        document.getElementById('dpType').textContent = selectedDeployType;
      });
    });
  }

  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDeployCategory = btn.dataset.category;
      selectedDeployType = btn.dataset.defaultType;
      document.getElementById('dpType').textContent = selectedDeployType;
      backBtn.style.display = 'inline-flex';
      renderTypePicker();
    });
  });

  backBtn?.addEventListener('click', () => {
    backBtn.style.display = 'none';
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    const activeCategory = document.querySelector(`.category-btn[data-category="${selectedDeployCategory}"]`);
    if (activeCategory) activeCategory.classList.add('active');
  });

  renderTypePicker();

  // method tabs
  document.querySelectorAll('.method-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedDeployMethod = tab.dataset.method;
      document.getElementById('repoGroup').style.display = selectedDeployMethod === 'github' ? 'flex' : 'none';
      document.getElementById('dpMethod').textContent = tab.textContent.trim();
    });
  });

  // plan picker
  document.querySelectorAll('.plan-radio').forEach(r => {
    r.addEventListener('click', () => {
      document.querySelectorAll('.plan-radio').forEach(x => x.classList.remove('active'));
      r.classList.add('active');
      document.getElementById('dpPlan').textContent = r.textContent.trim().split('—')[0].trim();
    });
  });

  // live preview name
  document.getElementById('deployName')?.addEventListener('input', function() {
    document.getElementById('dpName').textContent = this.value || '—';
  });
}

function deployProject() {
  const inputName = document.getElementById('deployName').value.trim();
  const fallbackName = selectedDeployType.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + String(Date.now()).slice(-4);
  const name = inputName || fallbackName;

  // plan is always free on Pillar
  const plan = 'free';
  const ramMap   = { free: 512 };
  const cpuMap   = { free: '1' };

  const project = {
    id:      'p_' + Date.now(),
    name,
    type:    selectedDeployType,
    method:  selectedDeployMethod,
    plan:    plan.charAt(0).toUpperCase() + plan.slice(1),
    status:  'deploying',
    ram:     ramMap[plan],
    cpu:     cpuMap[plan],
    createdAt: new Date().toISOString(),
  };

  // Show deploy log
  const logDiv = document.getElementById('deployLog');
  const logBody = document.getElementById('deployLogBody');
  logDiv.style.display = 'block';
  logBody.innerHTML = '';

  const btn = document.getElementById('btnDeploy');
  btn.disabled = true;

  const steps = [
    { msg: `<span class="cl-blue">[1/4]</span> Validating project configuration...`, delay: 300 },
    { msg: `<span class="cl-blue">[2/4]</span> Allocating ${project.ram >= 1024 ? project.ram/1024+'GB' : project.ram+'MB'} RAM · ${project.cpu} vCPU...`, delay: 900 },
    { msg: `<span class="cl-blue">[3/4]</span> Setting up environment for <span class="cl-pink">${esc(project.type)}</span>...`, delay: 1600 },
    { msg: `<span class="cl-green">[4/4]</span> Deployment successful ✓`, delay: 2400 },
    { msg: `<span class="cl-green">${esc(project.name)}</span> is now live!`, delay: 2800 },
  ];

  steps.forEach(({ msg, delay }) => {
    setTimeout(() => {
      const line = document.createElement('div');
      line.innerHTML = msg;
      logBody.appendChild(line);
      logBody.scrollTop = logBody.scrollHeight;
    }, delay);
  });

  setTimeout(() => {
    project.status = 'running';
    project.uptime = '0m';
    const projects = getProjects();
    projects.unshift(project);
    saveProjects(projects);
    addActivity(`Deployed "${project.name}" (${project.type})`, 'success');
    addNotif('Deployment successful', project.name + ' is now live!');
    renderOverview();
    renderProjects(document.getElementById('projectSearch')?.value || '');
    setupConsoleSelect();
    setupFilesSelect();
    document.getElementById('deployBtnText').textContent = '✓ Deployed!';
    btn.style.background = '#16a34a';
    setTimeout(() => {
      btn.disabled = false;
      btn.style.background = '';
      document.getElementById('deployBtnText').textContent = 'Deploy Project';
      document.getElementById('deployName').value = '';
      document.getElementById('dpName').textContent = '—';
      logDiv.style.display = 'none';
      openProjectManager(project.id);
    }, 2500);
  }, 3200);
}

function quickDeploy(type) {
  navigateTo('deploy');
  if (type === 'Web App') {
    selectedDeployCategory = 'webapp';
    selectedDeployType = 'Flask';
  } else if (type === 'Discord Bot') {
    selectedDeployCategory = 'discord';
    selectedDeployType = 'Python';
  } else {
    selectedDeployType = type;
  }

  const categoryBtn = document.querySelector(`.category-btn[data-category="${selectedDeployCategory}"]`);
  if (categoryBtn) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    categoryBtn.classList.add('active');
  }

  const typePicker = document.getElementById('typePicker');
  if (typePicker) {
    const choices = DEPLOY_CATEGORY_TYPES[selectedDeployCategory] || [];
    typePicker.innerHTML = choices.map(item => {
      const emoji = TYPE_EMOJIS[item] || '🧩';
      const active = item === selectedDeployType ? ' active' : '';
      return `<button class="type-btn${active}" data-type="${esc(item)}"><span class="qd-icon" aria-hidden="true">${emoji}</span>${esc(item)}</button>`;
    }).join('');
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDeployType = btn.dataset.type;
        document.getElementById('dpType').textContent = selectedDeployType;
      });
    });
  }

  document.getElementById('dpType').textContent = selectedDeployType;
}

function openProjectManager(projectId) {
  activeManagedProjectId = projectId;
  activeManageTab = 'console';
  navigateTo('manage');
}

function showDeployLog(msg, type) {
  const logDiv = document.getElementById('deployLog');
  const logBody = document.getElementById('deployLogBody');
  logDiv.style.display = 'block';
  logBody.innerHTML = `<div class="cl-${type === 'warn' ? 'yellow' : 'green'}">${msg}</div>`;
}

function renderProjectManager() {
  const shell = document.getElementById('manageShell');
  if (!shell) return;

  const projects = getProjects();
  const p = projects.find(x => x.id === activeManagedProjectId);

  if (!p) {
    shell.innerHTML = `
      <div class="manage-empty">
        <h3>No project selected</h3>
        <p>Open the Projects page and click Manage Project on any project.</p>
      </div>`;
    document.getElementById('manageProjectTitle').textContent = 'Project Manager';
    document.getElementById('manageProjectSub').textContent = 'Manage runtime, files, packages, and startup for a selected project.';
    return;
  }

  document.getElementById('manageProjectTitle').textContent = p.name;
  document.getElementById('manageProjectSub').textContent = `${p.type} · ${p.status} · ${p.plan || 'Free'} plan`;

  const tabs = ['console', 'files', 'settings', 'packages', 'startup'];
  const labels = {
    console: 'Console',
    files: 'File Manager',
    settings: 'Settings',
    packages: 'Packages',
    startup: 'Startup'
  };

  shell.innerHTML = `
    <div class="manage-topbar">
      ${tabs.map(tab => `<button class="manage-tab ${activeManageTab === tab ? 'active' : ''}" onclick="switchManageTab('${tab}')">${labels[tab]}</button>`).join('')}
      <button class="pc-btn danger" onclick="projectAction('${p.id}','delete')">Delete Project</button>
    </div>
    <div class="manage-content">
      ${renderManageTabContent(p)}
    </div>`;
}

function switchManageTab(tab) {
  activeManageTab = tab;
  renderProjectManager();
}

function renderManageTabContent(project) {
  if (activeManageTab === 'console') {
    return `
      <div class="manage-card">
        <div class="manage-card-head">Runtime Console</div>
        <div class="manage-console">${generateConsoleLogs(project).map(line => `<div class="console-line">${line}</div>`).join('')}</div>
      </div>`;
  }

  if (activeManageTab === 'files') {
    const files = getDefaultFiles(project.type);
    return `
      <div class="manage-card">
        <div class="manage-card-head">File Manager</div>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Size</th><th>Modified</th><th>Action</th></tr></thead>
          <tbody>
            ${files.map(f => `<tr><td><span class="file-kind">${f.icon}</span> ${esc(f.name)}</td><td>${f.size}</td><td>${f.modified}</td><td><button class="tbl-btn">${f.type === 'dir' ? 'Open' : 'Edit'}</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  if (activeManageTab === 'settings') {
    return `
      <div class="manage-card">
        <div class="manage-card-head">Project Settings</div>
        <div class="manage-grid">
          <div>
            <label>Status</label>
            <div class="manage-actions-row">
              <button class="pc-btn start" onclick="projectAction('${project.id}','start'); renderProjectManager();">Start</button>
              <button class="pc-btn stop" onclick="projectAction('${project.id}','stop'); renderProjectManager();">Stop</button>
              <button class="pc-btn" onclick="projectAction('${project.id}','restart'); renderProjectManager();">Restart</button>
            </div>
          </div>
          <div>
            <label>Project Name</label>
            <input class="form-input" id="manageProjectName" value="${esc(project.name)}" />
          </div>
          <div>
            <label>Environment Variables</label>
            <textarea class="form-input form-textarea" id="manageProjectEnv" placeholder="KEY=value&#10;ANOTHER=value">${esc(project.env || '')}</textarea>
          </div>
          <button class="btn-primary-sm" onclick="saveManagedProjectSettings('${project.id}')">Save Settings</button>
        </div>
      </div>`;
  }

  if (activeManageTab === 'packages') {
    const pkgs = Array.isArray(project.packages) ? project.packages : [];
    return `
      <div class="manage-card">
        <div class="manage-card-head">Packages</div>
        <div class="manage-actions-row">
          <input class="form-input" id="pkgInput" placeholder="e.g. express@latest, numpy, discord.js" />
          <button class="btn-primary-sm" onclick="addManagedPackage('${project.id}')">Add</button>
        </div>
        <div class="pkg-list">
          ${pkgs.length ? pkgs.map((pkg, i) => `<div class="pkg-item"><span>${esc(pkg)}</span><button class="tbl-btn danger" onclick="removeManagedPackage('${project.id}', ${i})">Remove</button></div>`).join('') : '<div class="activity-empty">No packages added yet.</div>'}
        </div>
      </div>`;
  }

  return `
    <div class="manage-card">
      <div class="manage-card-head">Startup</div>
      <div class="manage-grid">
        <div>
          <label>Startup Command</label>
          <input class="form-input" id="startupCommand" value="${esc(project.startupCommand || '')}" placeholder="npm start / python main.py / java -jar app.jar" />
        </div>
        <div>
          <label>Entrypoint File</label>
          <input class="form-input" id="startupFile" value="${esc(project.startupFile || '')}" placeholder="index.js / main.py / app.jar" />
        </div>
        <div>
          <label>Port</label>
          <input class="form-input" id="startupPort" value="${esc(String(project.port || 3000))}" />
        </div>
        <button class="btn-primary-sm" onclick="saveManagedStartup('${project.id}')">Save Startup</button>
      </div>
    </div>`;
}

function saveManagedProjectSettings(projectId) {
  const projects = getProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;

  const newName = document.getElementById('manageProjectName')?.value.trim();
  const envText = document.getElementById('manageProjectEnv')?.value || '';
  if (!newName) {
    alert('Project name cannot be empty.');
    return;
  }

  p.name = newName;
  p.env = envText;
  saveProjects(projects);
  addActivity(`Updated settings for "${p.name}"`, 'info');
  renderOverview();
  renderProjects(document.getElementById('projectSearch')?.value || '');
  renderProjectManager();
}

function addManagedPackage(projectId) {
  const pkgInput = document.getElementById('pkgInput');
  const pkg = pkgInput?.value.trim();
  if (!pkg) return;

  const projects = getProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  if (!Array.isArray(p.packages)) p.packages = [];
  if (!p.packages.includes(pkg)) p.packages.push(pkg);

  saveProjects(projects);
  addActivity(`Added package ${pkg} to "${p.name}"`, 'success');
  renderProjectManager();
}

function removeManagedPackage(projectId, idx) {
  const projects = getProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p || !Array.isArray(p.packages)) return;
  const removed = p.packages.splice(idx, 1)[0];
  saveProjects(projects);
  if (removed) addActivity(`Removed package ${removed} from "${p.name}"`, 'warn');
  renderProjectManager();
}

function saveManagedStartup(projectId) {
  const projects = getProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;

  p.startupCommand = document.getElementById('startupCommand')?.value.trim() || '';
  p.startupFile = document.getElementById('startupFile')?.value.trim() || '';
  const port = parseInt(document.getElementById('startupPort')?.value || '3000');
  p.port = Number.isFinite(port) ? port : 3000;
  saveProjects(projects);
  addActivity(`Updated startup for "${p.name}"`, 'info');
  renderProjectManager();
}

// ── CONSOLE ───────────────────────────────────────────────────────────────
function setupConsoleSelect() {
  const sel = document.getElementById('consoleProjectSelect');
  const projects = getProjects();
  sel.innerHTML = '<option value="">Select a project...</option>';
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + ' (' + p.type + ')';
    sel.appendChild(opt);
  });
}

function switchConsoleProject() {
  const id = document.getElementById('consoleProjectSelect').value;
  const body = document.getElementById('consoleBody');
  if (!id) {
    body.innerHTML = '<div class="console-placeholder">Select a project to view its console output.</div>';
    document.getElementById('consoleTitle').textContent = 'No project selected';
    return;
  }
  const projects = getProjects();
  const p = projects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('consoleTitle').textContent = p.name.toUpperCase();

  const logs = generateConsoleLogs(p);
  body.innerHTML = logs.map(l => `<div class="console-line">${l}</div>`).join('');
  body.scrollTop = body.scrollHeight;
}

function generateConsoleLogs(p) {
  const lines = [
    `<span class="cl-pink">*</span> Hello world <span class="cl-pink">*</span>`,
    `<span class="cl-green">[INFO]</span> Starting ${esc(p.type)} application...`,
    `<span class="cl-green">[INFO]</span> Environment: production`,
    `<span class="cl-green">[INFO]</span> Allocated RAM: ${p.ram}MB · CPU: ${p.cpu} vCPU`,
    `<span class="cl-green">[INFO]</span> Server started successfully`,
  ];
  if (p.type.includes('Express') || p.type === 'Flask' || p.type === 'FastAPI') {
    lines.push(`<span class="cl-green">[INFO]</span> Listening on port 3000`);
    lines.push(`<span class="cl-green">[INFO]</span> GET / 200 4ms`);
    lines.push(`<span class="cl-green">[INFO]</span> GET /api/health 200 2ms`);
  }
  if (p.type.includes('Bot')) {
    lines.push(`<span class="cl-green">[INFO]</span> Connecting to gateway...`);
    lines.push(`<span class="cl-green">[INFO]</span> Bot is online and ready!`);
  }
  if (p.status === 'stopped') {
    lines.push(`<span class="cl-yellow">[WARN]</span> Process stopped.`);
  }
  return lines;
}

function clearConsole() {
  document.getElementById('consoleBody').innerHTML = '<div class="console-placeholder">Console cleared.</div>';
}

function copyConsole() {
  const text = document.getElementById('consoleBody').innerText;
  navigator.clipboard.writeText(text).catch(() => {});
}

function downloadLogs() {
  const text = document.getElementById('consoleBody').innerText;
  const blob = new Blob([text], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'pella-logs.txt';
  a.click();
}

function handleConsoleCmd(e) {
  if (e.key === 'Enter') runConsoleCmd();
}

function runConsoleCmd() {
  const input = document.getElementById('consoleInput');
  const cmd   = input.value.trim();
  if (!cmd) return;
  input.value = '';

  const body = document.getElementById('consoleBody');
  const responses = {
    help:    `<span class="cl-blue">Commands:</span> start, stop, restart, status, logs, clear, help`,
    status:  `<span class="cl-green">[INFO]</span> All processes running normally.`,
    start:   `<span class="cl-green">[INFO]</span> Starting server...`,
    stop:    `<span class="cl-yellow">[WARN]</span> Stopping server...`,
    restart: `<span class="cl-yellow">[WARN]</span> Restarting server...`,
    logs:    `<span class="cl-green">[INFO]</span> Tailing logs... (Ctrl+C to stop)`,
    clear:   null,
  };

  const cmdLine = document.createElement('div');
  cmdLine.className = 'console-line';
  cmdLine.innerHTML = `<span class="cl-cmd">$ ${esc(cmd)}</span>`;
  body.appendChild(cmdLine);

  if (cmd.toLowerCase() === 'clear') { clearConsole(); return; }

  const reply = document.createElement('div');
  reply.className = 'console-line';
  reply.innerHTML = responses[cmd.toLowerCase()] || `<span class="cl-red">bash: ${esc(cmd)}: command not found</span>`;
  body.appendChild(reply);
  body.scrollTop = body.scrollHeight;
}

// ── FILES ─────────────────────────────────────────────────────────────────
function setupFilesSelect() {
  const sel = document.getElementById('filesProjectSelect');
  const projects = getProjects();
  sel.innerHTML = projects.length
    ? projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')
    : '<option>No projects</option>';
  loadFiles();
}

function loadFiles() {
  const id = document.getElementById('filesProjectSelect').value;
  const projects = getProjects();
  const p = projects.find(x => x.id === id);
  const body = document.getElementById('filesBody');
  const bc   = document.getElementById('filesBreadcrumb');

  if (!p) { body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">No project selected.</td></tr>'; return; }
  bc.textContent = '/ ' + p.name + ' /';

  const baseFiles = getDefaultFiles(p.type);
  body.innerHTML = baseFiles.map(f => `
    <tr>
      <td><span class="file-kind">${f.icon}</span> ${esc(f.name)}</td>
      <td>${f.size}</td>
      <td>${f.modified}</td>
      <td>
        <button class="tbl-btn">${f.type === 'dir' ? 'Open' : 'Edit'}</button>
        <button class="tbl-btn danger" onclick="deleteFile('${esc(f.name)}')">Delete</button>
      </td>
    </tr>`).join('');
}

function getDefaultFiles(type) {
  const common = [
    { name: '.env',        icon: 'FIL', size: '0.3 KB', modified: '1h ago',   type: 'file' },
    { name: 'README.md',   icon: 'FIL', size: '2.1 KB', modified: '2d ago',   type: 'file' },
  ];
  const typeFiles = {
    'Express':      [{ name: 'node_modules', icon: 'DIR', size: '42 MB',  modified: '1d ago', type: 'dir' },
                     { name: 'src',          icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'index.js',     icon: 'FIL', size: '3.2 KB', modified: '1h ago', type: 'file' },
                     { name: 'package.json', icon: 'FIL', size: '1.1 KB', modified: '1h ago', type: 'file' }],
    'Express.js':   [{ name: 'node_modules', icon: 'DIR', size: '42 MB',  modified: '1d ago', type: 'dir' },
                     { name: 'src',          icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'index.js',     icon: 'FIL', size: '3.2 KB', modified: '1h ago', type: 'file' },
                     { name: 'package.json', icon: 'FIL', size: '1.1 KB', modified: '1h ago', type: 'file' }],
    'NodeJS':       [{ name: 'src',          icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'index.js',     icon: 'FIL', size: '2.1 KB', modified: '1h ago', type: 'file' },
                     { name: 'package.json', icon: 'FIL', size: '1.0 KB', modified: '1h ago', type: 'file' }],
    'Node.js':      [{ name: 'src',          icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'index.js',     icon: 'FIL', size: '2.1 KB', modified: '1h ago', type: 'file' },
                     { name: 'package.json', icon: 'FIL', size: '1.0 KB', modified: '1h ago', type: 'file' }],
    'Python':       [{ name: 'bot.py',       icon: 'FIL', size: '2.3 KB', modified: '2h ago', type: 'file' },
                     { name: 'cogs',         icon: 'DIR', size: '—',      modified: '2h ago', type: 'dir' },
                     { name: 'requirements.txt', icon: 'FIL', size: '0.4 KB', modified: '2h ago', type: 'file' }],
    'FastAPI':      [{ name: 'main.py',       icon: 'FIL', size: '2.8 KB', modified: '2h ago', type: 'file' },
                     { name: 'requirements.txt', icon: 'FIL', size: '0.4 KB', modified: '2h ago', type: 'file' },
                     { name: '__pycache__',   icon: 'DIR', size: '—',      modified: '2h ago', type: 'dir' }],
    'Flask':        [{ name: 'app.py',        icon: 'FIL', size: '1.9 KB', modified: '3h ago', type: 'file' },
                     { name: 'templates',     icon: 'DIR', size: '—',      modified: '3h ago', type: 'dir' },
                     { name: 'requirements.txt', icon: 'FIL', size: '0.3 KB', modified: '3h ago', type: 'file' }],
    'Django':       [{ name: 'manage.py',     icon: 'FIL', size: '0.6 KB', modified: '1d ago', type: 'file' },
                     { name: 'myapp',         icon: 'DIR', size: '—',      modified: '1d ago', type: 'dir' },
                     { name: 'requirements.txt', icon: 'FIL', size: '0.5 KB', modified: '1d ago', type: 'file' }],
    'Koa':          [{ name: 'src',           icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
             { name: 'server.js',     icon: 'FIL', size: '2.2 KB', modified: '1h ago', type: 'file' },
             { name: 'package.json',  icon: 'FIL', size: '0.9 KB', modified: '1h ago', type: 'file' }],
    'Discord Bot':  [{ name: 'bot.js',        icon: 'FIL', size: '4.1 KB', modified: '5h ago', type: 'file' },
                     { name: 'commands',      icon: 'DIR', size: '—',      modified: '5h ago', type: 'dir' },
                     { name: 'package.json',  icon: 'FIL', size: '0.9 KB', modified: '5h ago', type: 'file' }],
    'Telegram Bot': [{ name: 'main.py',       icon: 'FIL', size: '2.3 KB', modified: '6h ago', type: 'file' },
                     { name: 'handlers',      icon: 'DIR', size: '—',      modified: '6h ago', type: 'dir' }],
    'PHP':          [{ name: 'public',        icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'index.php',     icon: 'FIL', size: '2.0 KB', modified: '1h ago', type: 'file' },
                     { name: 'composer.json', icon: 'FIL', size: '0.8 KB', modified: '1h ago', type: 'file' }],
    'Ruby':         [{ name: 'app',           icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'Gemfile',       icon: 'FIL', size: '0.7 KB', modified: '1h ago', type: 'file' },
                     { name: 'config.ru',     icon: 'FIL', size: '0.5 KB', modified: '1h ago', type: 'file' }],
    'Go':           [{ name: 'cmd',           icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'main.go',       icon: 'FIL', size: '1.5 KB', modified: '1h ago', type: 'file' },
                     { name: 'go.mod',        icon: 'FIL', size: '0.3 KB', modified: '1h ago', type: 'file' }],
    'Rust':         [{ name: 'src',           icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'main.rs',       icon: 'FIL', size: '1.2 KB', modified: '1h ago', type: 'file' },
                     { name: 'Cargo.toml',    icon: 'FIL', size: '0.4 KB', modified: '1h ago', type: 'file' }],
    'Java':         [{ name: 'src',           icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'pom.xml',       icon: 'FIL', size: '1.0 KB', modified: '1h ago', type: 'file' },
                     { name: 'Main.java',     icon: 'FIL', size: '1.3 KB', modified: '1h ago', type: 'file' }],
    '.NET':         [{ name: 'Program.cs',    icon: 'FIL', size: '1.4 KB', modified: '1h ago', type: 'file' },
                     { name: 'app.csproj',    icon: 'FIL', size: '0.9 KB', modified: '1h ago', type: 'file' },
                     { name: 'Properties',    icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' }],
    'Bun':          [{ name: 'src',           icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                     { name: 'index.ts',      icon: 'FIL', size: '1.8 KB', modified: '1h ago', type: 'file' },
                     { name: 'bun.lockb',     icon: 'FIL', size: '0.1 KB', modified: '1h ago', type: 'file' }],
    'Custom Runtime': [{ name: 'app',         icon: 'DIR', size: '—',      modified: '1h ago', type: 'dir' },
                       { name: 'start.sh',    icon: 'FIL', size: '0.6 KB', modified: '1h ago', type: 'file' },
                       { name: 'README.md',   icon: 'FIL', size: '1.2 KB', modified: '1h ago', type: 'file' }],
  };
  return [...(typeFiles[type] || []), ...common];
}

function uploadFileDialog() { alert('File upload would open a file picker in a real deployment.'); }
function deleteFile(name)   { if (confirm('Delete ' + name + '?')) { addActivity('Deleted file: ' + name, 'warn'); } }

// ── ADDONS ────────────────────────────────────────────────────────────────
const ADDONS_LIST = [
  { id: 'mongo',   icon: '🍃', name: 'MongoDB',     desc: 'Managed MongoDB database for your projects.' },
  { id: 'redis',   icon: '🟥', name: 'Redis',       desc: 'In-memory cache and message broker.' },
  { id: 'postgres',icon: '🐘', name: 'PostgreSQL',  desc: 'Powerful open-source relational database.' },
  { id: 'smtp',    icon: '✉️', name: 'SMTP Mail',   desc: 'Send transactional emails from your app.' },
  { id: 'ssl',     icon: '🔒', name: 'SSL Certificate', desc: "Free Let's Encrypt SSL for custom domains." },
  { id: 'analytics',icon:'📊', name: 'Analytics',   desc: 'Real-time traffic and performance dashboard.' },
  { id: 'cron',    icon: '⏱️', name: 'Cron Jobs',   desc: 'Schedule tasks to run at specified intervals.' },
  { id: 's3',      icon: '🪣', name: 'Object Storage', desc: 'S3-compatible file and asset storage.' },
];

function renderAddons() {
  const installed = JSON.parse(localStorage.getItem('pella_addons_' + currentUser.id) || '[]');
  const grid = document.getElementById('addonsGrid');
  grid.innerHTML = ADDONS_LIST.map(a => {
    const on = installed.includes(a.id);
    return `
    <div class="addon-card ${on ? 'installed' : ''}">
      <div class="addon-icon">${a.icon}</div>
      <div class="addon-name">${a.name}</div>
      <div class="addon-desc">${a.desc}</div>
      <button class="addon-btn ${on ? 'installed' : ''}" onclick="toggleAddon('${a.id}', this)">
        ${on ? '✓ Installed' : 'Install'}
      </button>
    </div>`;
  }).join('');
}

function toggleAddon(id, btn) {
  const key  = 'pella_addons_' + currentUser.id;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const on   = list.includes(id);
  const addon = ADDONS_LIST.find(a => a.id === id);
  if (on) {
    const updated = list.filter(x => x !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    addActivity('Removed addon: ' + addon.name, 'warn');
  } else {
    list.push(id);
    localStorage.setItem(key, JSON.stringify(list));
    addActivity('Installed addon: ' + addon.name, 'success');
    addNotif('Addon installed', addon.name + ' is now active.');
  }
  renderAddons();
}

// ── BACKUPS ───────────────────────────────────────────────────────────────
function renderBackups() {
  const backups = getBackups();
  const body    = document.getElementById('backupsBody');
  if (!backups.length) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No backups yet. Click "+ Create Backup" to make one.</td></tr>';
    return;
  }
  body.innerHTML = backups.map(b => `
    <tr>
      <td><span style="font-family:monospace;font-size:0.82rem">${esc(b.name)}</span></td>
      <td>${esc(b.project)}</td>
      <td>${b.size}</td>
      <td>${timeAgo(b.createdAt)}</td>
      <td>
        <button class="tbl-btn" onclick="restoreBackup('${b.id}')">Restore</button>
        <button class="tbl-btn" onclick="downloadBackup('${b.id}')">Download</button>
        <button class="tbl-btn danger" onclick="deleteBackup('${b.id}')">Delete</button>
      </td>
    </tr>`).join('');
}

function createBackup() {
  const projects = getProjects();
  if (!projects.length) { alert('You need at least one project to create a backup.'); return; }
  const p = projects[0];
  const backup = {
    id: 'b_' + Date.now(),
    name: 'backup-' + new Date().toISOString().slice(0,16).replace('T','-'),
    project: p.name,
    projectId: p.id,
    size: (8 + Math.floor(Math.random() * 20)) + ' MB',
    createdAt: new Date().toISOString(),
  };
  const backups = getBackups();
  backups.unshift(backup);
  saveBackups(backups);
  addActivity('Created backup: ' + backup.name, 'info');
  addNotif('Backup created', backup.name);
  renderBackups();
}

function deleteBackup(id) {
  if (!confirm('Delete this backup?')) return;
  const backups = getBackups().filter(b => b.id !== id);
  saveBackups(backups);
  addActivity('Deleted backup', 'warn');
  renderBackups();
}
function restoreBackup(id) {
  const b = getBackups().find(x => x.id === id);
  if (!b) return;
  alert('Restoring backup: ' + b.name + '\nThis would restore ' + b.project + ' to this snapshot.');
  addActivity('Restored backup: ' + b.name, 'success');
}
function downloadBackup(id) {
  const b = getBackups().find(x => x.id === id);
  if (!b) return;
  alert('Download: ' + b.name + '.tar.gz (' + b.size + ')');
}

// ── SETTINGS ──────────────────────────────────────────────────────────────
function saveProfile() {
  const name  = document.getElementById('settingName').value.trim();
  const email = document.getElementById('settingEmail').value.trim();
  const msg   = document.getElementById('profileMsg');

  if (!name || !email) { showMsg(msg, 'Name and email are required.', 'err'); return; }

  Auth.updateUser({ name, email, avatar: name.slice(0,2).toUpperCase() });
  addActivity('Updated profile', 'info');
  showMsg(msg, 'Profile saved successfully!', 'ok');
  populateUserUI();
}

function changePassword() {
  const old  = document.getElementById('settingOldPass').value;
  const n1   = document.getElementById('settingNewPass').value;
  const n2   = document.getElementById('settingConfPass').value;
  const msg  = document.getElementById('passMsg');

  if (!old || !n1 || !n2) { showMsg(msg, 'All fields are required.', 'err'); return; }
  if (n1 !== n2)           { showMsg(msg, 'New passwords do not match.', 'err'); return; }
  if (n1.length < 6)       { showMsg(msg, 'Password must be at least 6 characters.', 'err'); return; }

  // Verify old password
  const result = Auth.login(currentUser.email, old);
  if (!result.ok) { showMsg(msg, 'Current password is incorrect.', 'err'); return; }

  // Update (hash stored by auth.js on next login — store new hash)
  function h(s) { let x=0; for(let i=0;i<s.length;i++) x=Math.imul(31,x)+s.charCodeAt(i)|0; return x.toString(36); }
  const users = JSON.parse(localStorage.getItem('pella_users') || '[]');
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx > -1) { users[idx].password = h(n1); localStorage.setItem('pella_users', JSON.stringify(users)); }

  ['settingOldPass','settingNewPass','settingConfPass'].forEach(id => { document.getElementById(id).value = ''; });
  showMsg(msg, 'Password updated successfully!', 'ok');
  addActivity('Changed password', 'info');
}

function showMsg(el, text, type) {
  el.textContent  = text;
  el.className    = 'save-msg ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function confirmDeleteAccount() {
  const confirmed = prompt('Type DELETE to confirm account deletion:');
  if (confirmed !== 'DELETE') return;
  const users = JSON.parse(localStorage.getItem('pella_users') || '[]').filter(u => u.id !== currentUser.id);
  localStorage.setItem('pella_users', JSON.stringify(users));
  // clean up user data
  [PROJECTS_KEY, ACTIVITY_KEY, BACKUPS_KEY, NOTIFS_KEY].forEach(k => localStorage.removeItem(k));
  Auth.logout();
}

// ── RESOURCE SIMULATOR ────────────────────────────────────────────────────
function startResourceSimulator() {
  let cpu = 15, ram = 35, net = 20, sto = 42;
  function update() {
    cpu = clamp(cpu + (Math.random() - 0.48) * 8, 2, 95);
    ram = clamp(ram + (Math.random() - 0.49) * 4, 10, 90);
    net = clamp(net + (Math.random() - 0.5)  * 15, 0, 100);
    sto = clamp(sto + (Math.random() - 0.49) * 1, 10, 95);

    setBar('cpu', cpu); setBar('ram', ram); setBar('net', net); setBar('sto', sto);
    document.getElementById('cpuVal').textContent = cpu.toFixed(1) + '%';
    document.getElementById('ramVal').textContent = ram.toFixed(1) + '%';
    document.getElementById('netVal').textContent = (net * 1.2).toFixed(1) + ' KB/s';
    document.getElementById('stoVal').textContent = sto.toFixed(1) + '%';
  }
  update();
  setInterval(update, 2500);
}
function setBar(id, val) {
  const bar = document.getElementById(id + 'Bar');
  if (bar) bar.style.width = val + '%';
}
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

// ── REQUEST COUNTER ───────────────────────────────────────────────────────
function startRequestCounter() {
  let reqs = Math.floor(Math.random() * 2000) + 500;
  document.getElementById('scReqs').textContent = reqs.toLocaleString();
  setInterval(() => {
    reqs += Math.floor(Math.random() * 30);
    const el = document.getElementById('scReqs');
    if (el) el.textContent = reqs.toLocaleString();
  }, 1800);
}

// ── SEED DEMO DATA ────────────────────────────────────────────────────────
function cleanupLegacySeededProjects() {
  const projects = getProjects();
  const cleaned = projects.filter(p => !String(p.id).startsWith('p_demo'));
  if (cleaned.length !== projects.length) {
    saveProjects(cleaned);
    addActivity('Removed legacy demo projects', 'info');
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24)  return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function animateNum(el, target) {
  if (!el) return;
  const start = performance.now();
  const dur   = 600;
  const from  = parseInt(el.textContent) || 0;
  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * e);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function typeClass(type) {
  const map = {
    'Web App':'emoji',
    'Discord Bot':'emoji',
    'Express':'emoji',
    'Express.js':'emoji',
    'FastAPI':'emoji',
    'Flask':'emoji',
    'Django':'emoji',
    'Koa':'emoji',
    'Python':'emoji',
    'NodeJS':'emoji',
    'Node.js':'emoji',
    'Bun':'emoji',
    'Java':'emoji'
  };
  return map[type] || 'default';
}
function typeLabel(type) {
  return TYPE_EMOJIS[type] || '🧩';
}
