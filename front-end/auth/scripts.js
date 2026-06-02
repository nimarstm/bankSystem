 const API = {
    LOGIN:      '/api/auth/login/',
    VERIFY_OTP: '/api/auth/verify-otp/',
    LOGOUT:     '/api/auth/logout/',
  };

  // ── token helpers ────────────────────────────────────────────────────────
  function saveTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  // ── message helpers ──────────────────────────────────────────────────────
  function showError(msg) {
    document.getElementById('global-success').classList.remove('show');
    document.getElementById('global-error-text').textContent = msg;
    document.getElementById('global-error').classList.add('show');
  }
  function showSuccess(msg) {
    document.getElementById('global-error').classList.remove('show');
    document.getElementById('global-success-text').textContent = msg;
    document.getElementById('global-success').classList.add('show');
  }
  function clearMessages() {
    document.getElementById('global-error').classList.remove('show');
    document.getElementById('global-success').classList.remove('show');
  }
  function fieldError(id, msg) {
    const el = document.getElementById(id);
    if (msg) { el.textContent = msg; el.classList.add('show'); }
    else { el.classList.remove('show'); }
  }

  // ── loading state ────────────────────────────────────────────────────────
  function setLoading(btnId, spinId, textId, loading, label) {
    document.getElementById(btnId).disabled = loading;
    document.getElementById(spinId).style.display = loading ? 'block' : 'none';
    if (!loading && label) document.getElementById(textId).textContent = label;
  }

  // ── validation ───────────────────────────────────────────────────────────
  function validatePhone(val) {
    return /^\+?[\d\s\-]{7,15}$/.test(val.trim());
  }

  // ── tab switch ───────────────────────────────────────────────────────────
  function switchTab(tab) {
    clearMessages();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
  }

  // ── password toggle ──────────────────────────────────────────────────────
  function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.querySelector('i').className = isText ? 'ti ti-eye' : 'ti ti-eye-off';
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  async function handleLogin() {
    clearMessages();
    const phone    = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    let valid = true;

    if (!validatePhone(phone)) {
      fieldError('err-login-phone', 'Please enter a valid phone number.');
      document.getElementById('login-phone').classList.add('error');
      valid = false;
    } else {
      fieldError('err-login-phone', '');
      document.getElementById('login-phone').classList.remove('error');
    }
    if (!password) {
      fieldError('err-login-password', 'Please enter your password.');
      document.getElementById('login-password').classList.add('error');
      valid = false;
    } else {
      fieldError('err-login-password', '');
      document.getElementById('login-password').classList.remove('error');
    }
    if (!valid) return;

    setLoading('btn-login', 'spin-login', 'btn-login-text', true);
    try {
      const res  = await fetch(API.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.ok) {
        saveTokens(data.access, data.refresh);
        showSuccess('Login successful! Redirecting…');
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      } else {
        showError(data.detail || data.message || 'Invalid phone number or password.');
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setLoading('btn-login', 'spin-login', 'btn-login-text', false, 'Sign in');
    }
  }

  // ── OTP — send code ──────────────────────────────────────────────────────
  let countdownTimer = null;

  async function handleSendOtp() {
    clearMessages();
    const phone = document.getElementById('otp-phone').value.trim();
    if (!validatePhone(phone)) {
      fieldError('err-otp-phone', 'Please enter a valid phone number.');
      document.getElementById('otp-phone').classList.add('error');
      return;
    }
    fieldError('err-otp-phone', '');
    document.getElementById('otp-phone').classList.remove('error');

    const btn = document.getElementById('btn-send-otp');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res  = await fetch(API.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: 'send' }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Code sent! Check your SMS.');
        document.getElementById('otp-code-section').classList.add('visible');
        document.getElementById('otp0').focus();
        startCountdown(60);
      } else {
        showError(data.detail || data.message || 'Could not send OTP. Try again.');
        btn.disabled = false;
        btn.textContent = 'Send code';
      }
    } catch {
      showError('Network error. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Send code';
    }
  }

  function startCountdown(seconds) {
    clearInterval(countdownTimer);
    let remaining = seconds;
    const btn = document.getElementById('btn-send-otp');
    btn.textContent = `Resend in ${remaining}s`;
    btn.disabled = true;
    countdownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        btn.disabled = false;
        btn.textContent = 'Resend';
      } else {
        btn.textContent = `Resend in ${remaining}s`;
      }
    }, 1000);
  }

  function resendOtp() {
    if (!document.getElementById('btn-send-otp').disabled) handleSendOtp();
  }

  // OTP box auto-advance & paste
  document.querySelectorAll('.otp-box').forEach((box, idx, boxes) => {
    box.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < boxes.length - 1) boxes[idx + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      [...pasted].slice(0, 6).forEach((ch, i) => { if (boxes[i]) boxes[i].value = ch; });
      boxes[Math.min(pasted.length, 5)].focus();
    });
  });

  // ── OTP — verify ─────────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    clearMessages();
    const phone = document.getElementById('otp-phone').value.trim();
    const code  = [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');

    if (!validatePhone(phone)) { showError('Please enter your phone number first.'); return; }
    if (code.length < 6)       { showError('Please enter the full 6-digit code.');   return; }

    setLoading('btn-verify-otp', 'spin-otp', 'btn-otp-text', true);
    try {
      const res  = await fetch(API.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, action: 'verify' }),
      });
      const data = await res.json();
      if (res.ok) {
        saveTokens(data.access, data.refresh);
        showSuccess('Verified! Redirecting…');
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      } else {
        showError(data.detail || data.message || 'Invalid or expired code.');
        document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.add('error'); });
        document.getElementById('otp0').focus();
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setLoading('btn-verify-otp', 'spin-otp', 'btn-otp-text', false, 'Verify & sign in');
    }
  }

  // ── LOGOUT (call from any page) ───────────────────────────────────────────
  async function logout() {
    const refresh = localStorage.getItem('refresh_token');
    try {
      await fetch(API.LOGOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ refresh }),
      });
    } catch { /* best-effort */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';
  }

  // ── Enter key shortcuts ───────────────────────────────────────────────────
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('otp-phone').addEventListener('keydown',      e => { if (e.key === 'Enter') handleSendOtp(); });