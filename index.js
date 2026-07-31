/* index.js — Landing page interactivity */

// ── AUTH STATE ────────────────────────────────────────────────────────────
(function updateNavForAuth() {
  const user = Auth.currentUser();
  if (user) {
    const loginBtn  = document.getElementById('navLogin');
    const signupBtn = document.getElementById('navSignup');
    if (loginBtn)  { loginBtn.textContent = 'DASHBOARD'; loginBtn.href = 'dashboard.html'; }
    if (signupBtn) { signupBtn.textContent = user.name.split(' ')[0]; signupBtn.href = 'dashboard.html'; signupBtn.style.fontSize = '0.82rem'; }
  }
})();

// ── NAVBAR SCROLL ─────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── HAMBURGER ─────────────────────────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('mobileMenu').classList.toggle('open');
});

// ── PARTICLE CANVAS ───────────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: -9999, y: -9999 };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  resize();

  class Particle {
    constructor() { this.reset(true); }
    reset(initial) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : Math.random() * H;
      this.r  = Math.random() * 1.6 + 0.4;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = -(Math.random() * 0.4 + 0.1);
      this.a  = Math.random() * 0.45 + 0.08;
      this.color = Math.random() > 0.5 ? '217,70,239' : '99,102,241';
      this.maxA = this.a;
    }
    update() {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 120) {
        this.vx += dx / d * 0.04;
        this.vy += dy / d * 0.04;
      }
      this.vx *= 0.99;
      this.vy *= 0.99;
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10 || this.x < -10 || this.x > W + 10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.a})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 100; i++) particles.push(new Particle());

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(217,70,239,${0.07 * (1 - d / 90)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  let raf;
  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    raf = requestAnimationFrame(loop);
  }
  loop();
})();

// ── SCROLL ANIMATIONS (IntersectionObserver) ──────────────────────────────
(function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = el.dataset.delay ? parseInt(el.dataset.delay) : 0;
      setTimeout(() => { el.classList.add('is-visible'); }, delay);
      observer.unobserve(el);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
})();

// ── ANIMATED COUNTERS ─────────────────────────────────────────────────────
(function initCounters() {
  const counters = document.querySelectorAll('.counter-num');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el      = entry.target;
      const target  = parseFloat(el.dataset.target);
      const suffix  = el.dataset.suffix || '';
      const decimal = parseInt(el.dataset.decimal || '0');
      const abbrev  = el.dataset.abbrev === 'true';
      const duration = 2000;
      const start    = performance.now();

      function format(n) {
        if (abbrev) {
          if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        }
        return decimal > 0 ? n.toFixed(decimal) : Math.floor(n).toLocaleString();
      }

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: easeOutExpo
        const eased = 1 - Math.pow(2, -10 * progress);
        el.textContent = format(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
})();

// ── LIVE HERO NUMBERS ─────────────────────────────────────────────────────
(function animateLiveNumbers() {
  let users   = 155364;
  let servers = 151384;
  const uEl = document.getElementById('liveUsers');
  const sEl = document.getElementById('liveServers');
  if (!uEl || !sEl) return;

  setInterval(() => {
    users   += Math.floor(Math.random() * 3);
    servers += Math.floor(Math.random() * 2);
    uEl.textContent = users.toLocaleString();
    sEl.textContent = servers.toLocaleString();
  }, 2800);
})();

// ── MOCK CONSOLE TYPING ───────────────────────────────────────────────────
(function mockConsoleTyping() {
  const lines = [
    'npm start',
    'Server running on :3000',
    'Connected to DB ✓',
    'GET /api/health 200',
  ];
  let lineIdx = 0;
  let charIdx = 0;

  const typingEl = document.getElementById('typingLine');
  if (!typingEl) return;

  function type() {
    const line = lines[lineIdx];
    charIdx++;
    const text = line.slice(0, charIdx);
    typingEl.innerHTML = text + '<span class="cursor">▋</span>';

    if (charIdx < line.length) {
      setTimeout(type, 60 + Math.random() * 60);
    } else {
      setTimeout(() => {
        // add line to body
        const body = document.getElementById('mockConsoleBody');
        const newLine = document.createElement('div');
        newLine.className = 'mcm-line';
        newLine.textContent = line;
        body.insertBefore(newLine, typingEl);
        charIdx = 0;
        lineIdx = (lineIdx + 1) % lines.length;
        // keep max 6 lines
        while (body.children.length > 6) body.removeChild(body.firstChild);
        setTimeout(type, 1200);
      }, 800);
    }
  }
  setTimeout(type, 1500);
})();

// ── PRICING TOGGLE ────────────────────────────────────────────────────────
let isYearly = false;

function togglePricing() {
  isYearly = !isYearly;
  applyPricing();
}
function setPricingPeriod(period) {
  isYearly = period === 'yearly';
  applyPricing();
}
function applyPricing() {
  const knob     = document.getElementById('ptogKnob');
  const monthly  = document.getElementById('ptogMonthly');
  const yearly   = document.getElementById('ptogYearly');

  knob.classList.toggle('right', isYearly);
  monthly.classList.toggle('active', !isYearly);
  yearly.classList.toggle('active', isYearly);

  document.querySelectorAll('.plan-price').forEach(el => {
    const m = parseInt(el.dataset.monthly);
    const y = parseInt(el.dataset.yearly);
    const val = isYearly ? y : m;
    el.textContent = val === 0 ? '0' : val;
  });
}
// set monthly active on load
document.getElementById('ptogMonthly')?.classList.add('active');

// ── OFFER CARD TILT ───────────────────────────────────────────────────────
document.querySelectorAll('.offer-card, .plan-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `translateY(-6px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});
