 // ── CONFIG ───────────────────────────────────────────────────────────────
  const API = {
    LOANS:        '/api/loan/my-loans',
    LOAN_REQ:     '/api/loan/my-requests',
    INSTALLMENTS: '/api/installment/my',
    INST_REMAIN:  (id) => `/api/installment/loan/${id}/remaining`,
    NOTIFS:       '/api/notifications/my',
    NOTIF_READ:   '/api/notifications/mark-read',  
    NOTIF_COUNT:  '/api/notifications/unread-count', 
    LOGOUT:       '/api/auth/logout/',
  };

  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');

  // TODO: redirect if not logged in
 // if (!access) window.location.href = '/auth.html';

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` };
  }

  // ── TOAST ────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="ti ti-${type === 'success' ? 'circle-check' : 'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── GREETING + DATE ──────────────────────────────────────────────────────
  function initGreeting() {
    const now  = new Date();
    const hour = now.getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name  = localStorage.getItem('user_name') || '';
    document.getElementById('topbar-greeting').textContent = `${greet}${name ? ', ' + name : ''} 👋`;
    document.getElementById('topbar-date').textContent = now.toLocaleDateString('en-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    // sidebar user
    const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'U';
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('sidebar-name').textContent = name || 'My Account';
  }

  // ── MOCK BALANCE (replace with real endpoint when available) ─────────────
  function loadBalance() {
    document.getElementById('balance-amount').textContent = '12,480.50';
    document.getElementById('card-number').textContent = '4532 ••••';
    document.getElementById('account-number').textContent = 'DE89 3704 0044';
  }

  // ── LOANS ────────────────────────────────────────────────────────────────
  async function loadLoans() {
    const el = document.getElementById('loan-list');
    try {
      const res  = await fetch(API.LOANS, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const loans = Array.isArray(data) ? data : (data.results || data.loans || []);
      if (!loans.length) {
        el.innerHTML = `<div class="empty"><i class="ti ti-coin-off"></i> No active loans</div>`;
        return;
      }
      el.innerHTML = loans.slice(0, 4).map(l => `
        <div class="loan-item">
          <div class="loan-icon"><i class="ti ti-coin"></i></div>
          <div>
            <div class="loan-name">${l.title || l.type || 'Loan'}</div>
            <div class="loan-meta">${l.start_date || ''} ${l.duration ? '· ' + l.duration + ' months' : ''}</div>
          </div>
          <div class="loan-amount">
            <div class="loan-amount-val">€${Number(l.amount || 0).toLocaleString()}</div>
            <div class="loan-amount-label">
              <span class="badge ${l.status === 'approved' ? 'success' : l.status === 'pending' ? 'warning' : 'danger'}">
                ${l.status || 'active'}
              </span>
            </div>
          </div>
        </div>
      `).join('');
    } catch {
      // fallback mock
      el.innerHTML = `
        <div class="loan-item">
          <div class="loan-icon"><i class="ti ti-coin"></i></div>
          <div>
            <div class="loan-name">Personal Loan</div>
            <div class="loan-meta">Jan 2025 · 24 months</div>
          </div>
          <div class="loan-amount">
            <div class="loan-amount-val">€8,000</div>
            <div class="loan-amount-label"><span class="badge success">approved</span></div>
          </div>
        </div>
        <div class="loan-item">
          <div class="loan-icon"><i class="ti ti-coin"></i></div>
          <div>
            <div class="loan-name">Home Loan</div>
            <div class="loan-meta">Mar 2025 · 60 months</div>
          </div>
          <div class="loan-amount">
            <div class="loan-amount-val">€45,000</div>
            <div class="loan-amount-label"><span class="badge warning">pending</span></div>
          </div>
        </div>`;
    }
  }

  // ── INSTALLMENTS ─────────────────────────────────────────────────────────
  async function loadInstallments() {
    const el = document.getElementById('installment-list');
    try {
      const res  = await fetch(API.INSTALLMENTS, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const insts = Array.isArray(data) ? data : (data.results || data.installments || []);
      if (!insts.length) {
        el.innerHTML = `<div class="empty"><i class="ti ti-receipt-off"></i> No installments</div>`;
        return;
      }
      el.innerHTML = insts.slice(0, 3).map(i => {
        const paid  = i.paid_installments || 0;
        const total = i.total_installments || 1;
        const pct   = Math.round((paid / total) * 100);
        return `
          <div class="inst-item">
            <div class="inst-top">
              <span class="inst-name">${i.title || i.loan_title || 'Installment Plan'}</span>
              <span class="inst-due">Due: ${i.next_due || '—'}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div class="inst-foot">
              <span class="inst-paid">${paid}/${total} paid</span>
              <span class="inst-remaining">€${Number(i.remaining_amount || 0).toLocaleString()} left</span>
            </div>
          </div>`;
      }).join('');
    } catch {
      // fallback mock
      el.innerHTML = `
        <div class="inst-item">
          <div class="inst-top"><span class="inst-name">Personal Loan Plan</span><span class="inst-due">Due: Jun 1</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:58%"></div></div>
          <div class="inst-foot"><span class="inst-paid">14/24 paid</span><span class="inst-remaining">€3,360 left</span></div>
        </div>
        <div class="inst-item">
          <div class="inst-top"><span class="inst-name">Home Loan Plan</span><span class="inst-due">Due: Jun 5</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:12%"></div></div>
          <div class="inst-foot"><span class="inst-paid">7/60 paid</span><span class="inst-remaining">€41,300 left</span></div>
        </div>`;
    }
  }

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────
  async function loadUnreadCount() {
    try {
      const res  = await fetch(API.NOTIF_COUNT, { headers: authHeaders() });
      const data = await res.json();
      const count = data.count || data.unread_count || 0;
      const badge = document.getElementById('notif-nav-badge');
      const dot   = document.getElementById('notif-dot');
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.add('show');
        dot.classList.add('show');
      }
    } catch { /* silent */ }
  }

  async function loadNotifications() {
    const el = document.getElementById('notif-list');
    try {
      const res  = await fetch(API.NOTIFS, { headers: authHeaders() });
      const data = await res.json();
      const notifs = Array.isArray(data) ? data : (data.results || data.notifications || []);
      if (!notifs.length) {
        el.innerHTML = `<div class="empty"><i class="ti ti-bell-off"></i> No notifications</div>`;
        return;
      }
      el.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.is_read === false ? 'unread' : ''}" onclick="markRead('${n.id}', this)">
          <div class="notif-dot-indicator"></div>
          <div class="notif-body">
            <div class="notif-title">${n.title || 'Notification'}</div>
            <div class="notif-msg">${n.message || n.body || ''}</div>
            <div class="notif-time">${n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
          </div>
        </div>`).join('');
    } catch {
      // fallback mock
      el.innerHTML = `
        <div class="notif-item unread" onclick="this.classList.remove('unread')">
          <div class="notif-dot-indicator"></div>
          <div class="notif-body">
            <div class="notif-title">Loan request received</div>
            <div class="notif-msg">Your personal loan request of €8,000 is under review.</div>
            <div class="notif-time">Today, 09:14</div>
          </div>
        </div>
        <div class="notif-item unread" onclick="this.classList.remove('unread')">
          <div class="notif-dot-indicator"></div>
          <div class="notif-body">
            <div class="notif-title">Installment due soon</div>
            <div class="notif-msg">Your June installment of €340 is due in 3 days.</div>
            <div class="notif-time">Yesterday, 18:30</div>
          </div>
        </div>
        <div class="notif-item" onclick="">
          <div class="notif-dot-indicator"></div>
          <div class="notif-body">
            <div class="notif-title">Transfer successful</div>
            <div class="notif-msg">€200 was sent to Sarah M. successfully.</div>
            <div class="notif-time">May 17, 14:02</div>
          </div>
        </div>`;
    }
  }

  async function markRead(id, el) {
    el.classList.remove('unread');
    try {
      await fetch(`${API.NOTIF_READ}/${id}/`, { method: 'POST', headers: authHeaders() });
    } catch { /* silent */ }
  }

  async function markAllRead() {
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    document.getElementById('notif-nav-badge').classList.remove('show');
    document.getElementById('notif-dot').classList.remove('show');
    try {
      await fetch(API.NOTIF_READ, { method: 'POST', headers: authHeaders() });
      showToast('All notifications marked as read');
    } catch { showToast('All notifications marked as read'); }
  }

  // ── NOTIFICATION PANEL TOGGLE ────────────────────────────────────────────
  function openNotifPanel(e) {
    if (e) e.preventDefault();
    document.getElementById('notif-panel').classList.add('open');
    document.getElementById('overlay').classList.add('show');
    loadNotifications();
  }
  function closeNotifPanel() {
    document.getElementById('notif-panel').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }

  // ── LOGOUT ───────────────────────────────────────────────────────────────
  async function logout() {
    try {
      await fetch(API.LOGOUT, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ refresh }),
      });
    } catch { /* best-effort */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    window.location.href = '../auth/auth.html';
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  initGreeting();
  loadBalance();
  loadLoans();
  loadInstallments();
  loadUnreadCount();