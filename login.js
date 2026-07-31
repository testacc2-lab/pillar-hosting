/* login.js — handles login page logic, canvas particles, tab switching */

// Redirect if already logged in
Auth.requireGuest();

/* ── PARTICLE CANVAS ─────────────────────────────────────────────────────── */
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.r  = Math.random() * 1.4 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.a  = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '217,70,239' : '99,102,241';
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.a})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(217,70,239,${0.08 * (1 - d/100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ── TAB SWITCHING ───────────────────────────────────────────────────────── */
function switchTab(tab) {
  const indicator = document.getElementById('tabIndicator');
  const loginTab  = document.getElementById('tabLogin');
  const signupTab = document.getElementById('tabSignup');
  const formLogin = document.getElementById('formLogin');
  const formSignup = document.getElementById('formSignup');
  const switchLink = document.getElementById('switchLink');
  const heading = document.getElementById('authHeading');

  hideBanners();

  if (tab === 'login') {
    loginTab?.classList.add('active');
    signupTab?.classList.remove('active');
    indicator?.classList.remove('right');
    formLogin.style.display  = 'flex';
    formSignup.style.display = 'none';
    if (switchLink) switchLink.textContent = 'Create a new account';
    if (heading) heading.textContent = 'Log In';
  } else {
    signupTab?.classList.add('active');
    loginTab?.classList.remove('active');
    indicator?.classList.add('right');
    formSignup.style.display = 'flex';
    formLogin.style.display  = 'none';
    if (switchLink) switchLink.textContent = 'Back to login';
    if (heading) heading.textContent = 'Create Account';
  }
}

/* ── BANNERS ─────────────────────────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('bannerError');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('bannerSuccess').style.display = 'none';
}
function showSuccess(msg) {
  const el = document.getElementById('bannerSuccess');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('bannerError').style.display = 'none';
}
function hideBanners() {
  document.getElementById('bannerError').style.display   = 'none';
  document.getElementById('bannerSuccess').style.display = 'none';
}

/* ── PASSWORD TOGGLE ─────────────────────────────────────────────────────── */
function togglePass(id, btn) {
  const input = document.getElementById(id);
  input.type  = input.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = input.type === 'text' ? 'Hide' : 'Show';
}

/* ── PASSWORD STRENGTH ───────────────────────────────────────────────────── */
document.getElementById('signupPassword')?.addEventListener('input', function() {
  const val   = this.value;
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  let score   = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { w:'0%',   bg:'transparent', txt:'' },
    { w:'25%',  bg:'#ef4444',     txt:'Weak' },
    { w:'50%',  bg:'#f97316',     txt:'Fair' },
    { w:'75%',  bg:'#eab308',     txt:'Good' },
    { w:'100%', bg:'#22c55e',     txt:'Strong' },
  ];
  const lvl = levels[Math.min(score, 4)];
  fill.style.width      = lvl.w;
  fill.style.background = lvl.bg;
  label.textContent     = lvl.txt;
  label.style.color     = lvl.bg;
});

document.addEventListener('DOMContentLoaded', () => {
  const switchLink = document.getElementById('switchLink');
  switchLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const isLoginVisible = document.getElementById('formLogin').style.display !== 'none';
    switchTab(isLoginVisible ? 'signup' : 'login');
  });
  switchTab('login');
});

/* ── SUBMIT HANDLERS ─────────────────────────────────────────────────────── */
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.querySelector('.btn-text').style.display   = loading ? 'none' : 'inline';
  btn.querySelector('.btn-spinner').style.display = loading ? 'inline-flex' : 'none';
  btn.disabled = loading;
}

function handleLogin(e) {
  e.preventDefault();
  hideBanners();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  setLoading('btnLogin', true);

  setTimeout(() => {
    const result = Auth.login(email, password);
    setLoading('btnLogin', false);
    if (!result.ok) { showError(result.error); return; }
    showSuccess('Welcome back, ' + result.user.name + '! Redirecting...');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
  }, 700);
}

function handleSignup(e) {
  e.preventDefault();
  hideBanners();
  const name     = document.getElementById('signupName').value;
  const email    = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  setLoading('btnSignup', true);

  setTimeout(() => {
    const result = Auth.register(name, email, password);
    setLoading('btnSignup', false);
    if (!result.ok) { showError(result.error); return; }
    showSuccess('Account created! Redirecting to dashboard...');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
  }, 800);
}

/* ── DEMO LOGIN ──────────────────────────────────────────────────────────── */
function demoLogin() {
  hideBanners();
  Auth.register('Demo User', 'demo@pillarhosting.io', 'demo123');
  const result = Auth.login('demo@pillarhosting.io', 'demo123');
  if (result.ok) {
    showSuccess('Logging in as Demo User...');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  }
}
