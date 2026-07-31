/* ═══════════════════════════════════════════════════════
   auth.js  —  Pella authentication & session management
   Storage: localStorage  (no server needed)
═══════════════════════════════════════════════════════ */

const Auth = (() => {

  const USERS_KEY   = 'pella_users';
  const SESSION_KEY = 'pella_session';

  /* ── helpers ─────────────────────────────────────── */
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }
  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ── simple hash (not crypto — demo only) ────────── */
  function hashPass(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h.toString(36);
  }

  /* ── public API ──────────────────────────────────── */
  function register(name, email, password) {
    if (!name || !email || !password)
      return { ok: false, error: 'All fields are required.' };
    if (password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters.' };

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: 'An account with that email already exists.' };

    const user = {
      id:       'u_' + Date.now(),
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashPass(password),
      plan:     'Free',
      avatar:   name.trim().slice(0,2).toUpperCase(),
      createdAt: new Date().toISOString(),
      projects: [],
      notifications: []
    };
    users.push(user);
    saveUsers(users);

    const session = { ...user };
    delete session.password;
    saveSession(session);
    return { ok: true, user: session };
  }

  function login(email, password) {
    if (!email || !password)
      return { ok: false, error: 'Email and password are required.' };

    const users = getUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user)
      return { ok: false, error: 'No account found with that email.' };
    if (user.password !== hashPass(password))
      return { ok: false, error: 'Incorrect password.' };

    const session = { ...user };
    delete session.password;
    saveSession(session);
    return { ok: true, user: session };
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  function currentUser() {
    return getSession();
  }

  function requireAuth() {
    if (!getSession()) {
      window.location.href = 'login.html';
      return null;
    }
    return getSession();
  }

  function requireGuest() {
    if (getSession()) {
      window.location.href = 'dashboard.html';
    }
  }

  /* refresh session from users store (picks up changes) */
  function refreshSession() {
    const sess = getSession();
    if (!sess) return null;
    const users = getUsers();
    const fresh = users.find(u => u.id === sess.id);
    if (!fresh) return sess;
    const updated = { ...fresh };
    delete updated.password;
    saveSession(updated);
    return updated;
  }

  /* update user data in both users array and session */
  function updateUser(changes) {
    const sess = getSession();
    if (!sess) return false;
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === sess.id);
    if (idx === -1) return false;
    Object.assign(users[idx], changes);
    saveUsers(users);
    const updated = { ...users[idx] };
    delete updated.password;
    saveSession(updated);
    return true;
  }

  return { register, login, logout, currentUser, requireAuth, requireGuest, refreshSession, updateUser };
})();
