  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  // TODO: uncomment this
  // if (!access) window.location.href = '/auth.html';

  const API = {
    LOAN_REQUEST:  '/api/loan/request',
    MY_REQUESTS:   '/api/loan/my-requests',
    MY_LOANS:      '/api/loan/my-loans',
    LOGOUT:        '/api/auth/logout/',
  };

  function authHeaders() {
    return { 'Content-Type':'application/json', 'Authorization':`Bearer ${access}` };
  }

  // ── SIDEBAR USER ─────────────────────────────────────────────────────────
  const userName = localStorage.getItem('user_name') || '';
  document.getElementById('sidebar-name').textContent = userName || 'My Account';
  const initials = userName ? userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : 'U';
  document.getElementById('sidebar-avatar').textContent = initials;

  // ── TOAST ────────────────────────────────────────────────────────────────
  function showToast(msg, type='success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── TAB SWITCHING ────────────────────────────────────────────────────────
  const tabs = ['request','my-requests','my-loans'];
  function switchTab(tab) {
    tabs.forEach(t => {
      document.getElementById('tab-'+t).classList.toggle('active', t===tab);
      document.getElementById('panel-'+t).classList.toggle('active', t===tab);
    });
    if (tab === 'my-requests') loadRequests();
    if (tab === 'my-loans')    loadLoans();
  }

  // ── LOAN TYPE ────────────────────────────────────────────────────────────
  let selectedType = 'personal';
  function selectType(el) {
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedType = el.dataset.type;
    updateSummary();
  }

  // ── AMOUNT SLIDER ────────────────────────────────────────────────────────
  function updateAmount(input) {
    const val = Number(input.value);
    document.getElementById('amount-display').textContent = val.toLocaleString();
    const pct = ((val - 1000) / (100000 - 1000)) * 100;
    input.style.setProperty('--pct', pct + '%');
    updateSummary();
  }
  // init slider gradient
  (() => {
    const r = document.getElementById('amount-range');
    const pct = ((10000 - 1000) / (100000 - 1000)) * 100;
    r.style.setProperty('--pct', pct + '%');
  })();

  // ── SUMMARY CALCULATOR ───────────────────────────────────────────────────
  function updateSummary() {
    const amount   = Number(document.getElementById('amount-range').value);
    const duration = Number(document.getElementById('duration').value);
    if (!duration) {
      document.getElementById('est-monthly').textContent = '—';
      document.getElementById('est-total').textContent   = '—';
      return;
    }
    const rate    = 0.065 / 12;
    const monthly = (amount * rate * Math.pow(1+rate, duration)) / (Math.pow(1+rate, duration) - 1);
    const total   = monthly * duration;
    document.getElementById('est-monthly').textContent = '€' + monthly.toFixed(2);
    document.getElementById('est-total').textContent   = '€' + total.toFixed(2);
  }
  document.getElementById('duration').addEventListener('change', updateSummary);

  // ── FORM VALIDATION ──────────────────────────────────────────────────────
  function fe(id, msg) {
    const el = document.getElementById(id);
    if (msg) { el.textContent = msg; el.classList.add('show'); }
    else { el.classList.remove('show'); }
  }

  function validateForm() {
    let ok = true;
    if (!selectedType)   { fe('err-type','Please select a loan type.'); ok=false; } else fe('err-type','');
    const amount = Number(document.getElementById('amount-range').value);
    if (!amount)         { fe('err-amount','Please select an amount.'); ok=false; }    else fe('err-amount','');
    const dur = document.getElementById('duration').value;
    if (!dur)            { fe('err-duration','Please select a duration.'); ok=false; } else fe('err-duration','');
    const income = document.getElementById('monthly-income').value;
    if (!income || Number(income) <= 0) { fe('err-income','Please enter your monthly income.'); ok=false; } else fe('err-income','');
    const debt = document.getElementById('existing-debt').value;
    if (debt === '' || Number(debt) < 0) { fe('err-debt','Please enter a valid amount.'); ok=false; } else fe('err-debt','');
    return ok;
  }

  // ── SUBMIT FLOW ──────────────────────────────────────────────────────────
  function submitLoanRequest() {
    if (!validateForm()) return;
    const amount   = Number(document.getElementById('amount-range').value);
    const dur      = document.getElementById('duration').value;
    const income   = document.getElementById('monthly-income').value;
    const debt     = document.getElementById('existing-debt').value;
    const typeMap  = {personal:'Personal',home:'Home',car:'Car',business:'Business'};
    document.getElementById('confirm-body').innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
        <tr><td style="padding:6px 0;color:var(--text-3);">Type</td><td style="text-align:right;font-weight:600;">${typeMap[selectedType]}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-3);">Amount</td><td style="text-align:right;font-weight:600;">€${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-3);">Duration</td><td style="text-align:right;font-weight:600;">${dur} months</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-3);">Monthly Income</td><td style="text-align:right;font-weight:600;">€${Number(income).toLocaleString()}</td></tr>
        <tr><td style="padding:6px 0;color:var(--text-3);">Existing Debt</td><td style="text-align:right;font-weight:600;">€${Number(debt).toLocaleString()}</td></tr>
        <tr style="border-top:1px solid var(--border);"><td style="padding:8px 0 2px;color:var(--text-3);">Est. Monthly Payment</td><td style="text-align:right;font-weight:700;color:var(--accent);">${document.getElementById('est-monthly').textContent}</td></tr>
      </table>`;
    document.getElementById('confirm-modal').classList.add('show');
  }

  function closeModal() { document.getElementById('confirm-modal').classList.remove('show'); }

  async function confirmSubmit() {
    const btn  = document.getElementById('confirm-btn');
    const spin = document.getElementById('confirm-spin');
    const txt  = document.getElementById('confirm-text');
    btn.disabled = true; spin.style.display='block'; txt.textContent='Submitting…';

    const payload = {
      amount:          Number(document.getElementById('amount-range').value),
      duration_months: Number(document.getElementById('duration').value),
      type:            selectedType,
      monthly_income:  Number(document.getElementById('monthly-income').value),
      existing_debt:   Number(document.getElementById('existing-debt').value),
    };

    try {
      const res  = await fetch(API.LOAN_REQUEST, { method:'POST', headers:authHeaders(), body:JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        showToast('Loan application submitted successfully!');
        resetForm();
        switchTab('my-requests');
      } else {
        closeModal();
        showToast(data.detail || data.message || 'Submission failed. Please try again.', 'error');
      }
    } catch {
      closeModal();
      showToast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled=false; spin.style.display='none'; txt.textContent='Confirm & Submit';
    }
  }

  function resetForm() {
    document.getElementById('amount-range').value = 10000;
    document.getElementById('amount-display').textContent = '10,000';
    const r = document.getElementById('amount-range');
    r.style.setProperty('--pct', ((10000-1000)/(100000-1000)*100)+'%');
    document.getElementById('duration').value = '';
    document.getElementById('monthly-income').value = '';
    document.getElementById('existing-debt').value = '0';
    selectedType = 'personal';
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    document.querySelector('[data-type="personal"]').classList.add('selected');
    document.getElementById('est-monthly').textContent = '—';
    document.getElementById('est-total').textContent   = '—';
    ['err-type','err-amount','err-duration','err-income','err-debt'].forEach(id => fe(id,''));
  }

  // ── TYPE ICON MAP ─────────────────────────────────────────────────────────
  const typeIcon  = {home:'ti-home',car:'ti-car',business:'ti-briefcase',personal:'ti-user'};
  const typeClass = {home:'home',car:'car',business:'business',personal:'personal'};
  const typeLabel = {home:'Home Loan',car:'Car Loan',business:'Business Loan',personal:'Personal Loan'};

  // ── LOAD REQUESTS ─────────────────────────────────────────────────────────
  async function loadRequests() {
    const el = document.getElementById('requests-list');
    el.innerHTML = '<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    try {
      const res  = await fetch(API.MY_REQUESTS, { headers:authHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || data.requests || []);
      document.getElementById('req-count').textContent = list.length;
      if (!list.length) {
        el.innerHTML = `<div class="empty-state"><i class="ti ti-clock-off"></i><p>No loan requests yet.</p><span onclick="switchTab('request')">Submit your first request →</span></div>`;
        return;
      }
      el.innerHTML = list.map((r,i) => renderLoanCard(r, i, 'request')).join('');
    } catch {
      // mock
      document.getElementById('req-count').textContent = 2;
      el.innerHTML = [
        {id:'req-1',type:'personal',amount:8000,duration_months:24,monthly_income:3500,existing_debt:0,status:'pending',created_at:'2026-05-10'},
        {id:'req-2',type:'home',amount:45000,duration_months:60,monthly_income:3500,existing_debt:500,status:'under_review',created_at:'2026-04-20'},
      ].map((r,i) => renderLoanCard(r,i,'request')).join('');
    }
  }

  // ── LOAD LOANS ────────────────────────────────────────────────────────────
  async function loadLoans() {
    const el = document.getElementById('loans-list');
    el.innerHTML = '<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    try {
      const res  = await fetch(API.MY_LOANS, { headers:authHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || data.loans || []);
      document.getElementById('loan-count').textContent = list.length;
      if (!list.length) {
        el.innerHTML = `<div class="empty-state"><i class="ti ti-coin-off"></i><p>No active loans.</p><span onclick="switchTab('request')">Apply for a loan →</span></div>`;
        return;
      }
      el.innerHTML = list.map((l,i) => renderLoanCard(l,i,'loan')).join('');
    } catch {
      // mock
      document.getElementById('loan-count').textContent = 1;
      el.innerHTML = [
        {id:'loan-1',type:'personal',amount:8000,duration_months:24,monthly_income:3500,existing_debt:0,status:'approved',created_at:'2025-01-15',start_date:'2025-02-01',paid_installments:14,total_installments:24,remaining_amount:3360},
      ].map((l,i) => renderLoanCard(l,i,'loan')).join('');
    }
  }

  // ── RENDER LOAN CARD ──────────────────────────────────────────────────────
  function renderLoanCard(item, idx, mode) {
    const t   = item.type || 'personal';
    const statusBadge = {
      pending:      '<span class="badge warning"><i class="ti ti-clock"></i> Pending</span>',
      under_review: '<span class="badge info"><i class="ti ti-search"></i> Under Review</span>',
      approved:     '<span class="badge success"><i class="ti ti-circle-check"></i> Approved</span>',
      rejected:     '<span class="badge danger"><i class="ti ti-circle-x"></i> Rejected</span>',
      active:       '<span class="badge success"><i class="ti ti-circle-check"></i> Active</span>',
    };
    const badge = statusBadge[item.status] || `<span class="badge info">${item.status||'—'}</span>`;

    const details = mode === 'loan' ? `
      <div class="detail-cell"><div class="detail-label">Start Date</div><div class="detail-val">${item.start_date||'—'}</div></div>
      <div class="detail-cell"><div class="detail-label">Paid Installments</div><div class="detail-val">${item.paid_installments||0} / ${item.total_installments||item.duration_months||'—'}</div></div>
      <div class="detail-cell"><div class="detail-label">Remaining</div><div class="detail-val">€${Number(item.remaining_amount||0).toLocaleString()}</div></div>
      <div class="detail-cell"><div class="detail-label">Monthly Income</div><div class="detail-val">€${Number(item.monthly_income||0).toLocaleString()}</div></div>
      <div class="detail-cell"><div class="detail-label">Existing Debt</div><div class="detail-val">€${Number(item.existing_debt||0).toLocaleString()}</div></div>
      <div class="detail-cell"><div class="detail-label">Applied On</div><div class="detail-val">${item.created_at||'—'}</div></div>
    ` : `
      <div class="detail-cell"><div class="detail-label">Duration</div><div class="detail-val">${item.duration_months} months</div></div>
      <div class="detail-cell"><div class="detail-label">Monthly Income</div><div class="detail-val">€${Number(item.monthly_income||0).toLocaleString()}</div></div>
      <div class="detail-cell"><div class="detail-label">Existing Debt</div><div class="detail-val">€${Number(item.existing_debt||0).toLocaleString()}</div></div>
      <div class="detail-cell"><div class="detail-label">Submitted On</div><div class="detail-val">${item.created_at||'—'}</div></div>
      <div class="detail-cell"><div class="detail-label">Status</div><div class="detail-val">${badge}</div></div>
      <div class="detail-cell"><div class="detail-label">Loan ID</div><div class="detail-val" style="font-size:12px;font-family:monospace;">${item.id||'—'}</div></div>
    `;

    const actions = mode === 'loan'
      ? `<a class="btn-sm accent" href="installments.html?loan=${item.id}"><i class="ti ti-receipt"></i> View Installments</a>`
      : (item.status === 'pending' ? `<button class="btn-sm outline" style="color:var(--danger);border-color:var(--danger);" onclick="cancelRequest('${item.id}')"><i class="ti ti-trash"></i> Cancel Request</button>` : '');

    return `
      <div class="loan-card" id="card-${item.id||idx}">
        <div class="loan-card-header" onclick="toggleCard('card-${item.id||idx}')">
          <div class="loan-type-icon ${typeClass[t]||'personal'}"><i class="ti ${typeIcon[t]||'ti-coin'}"></i></div>
          <div class="loan-card-info">
            <div class="loan-card-title">${typeLabel[t]||'Loan'} ${badge}</div>
            <div class="loan-card-meta">Applied ${item.created_at||'—'} &nbsp;·&nbsp; ${item.duration_months} months</div>
          </div>
          <div class="loan-card-right">
            <div class="loan-amount-big">€${Number(item.amount||0).toLocaleString()}</div>
          </div>
          <i class="ti ti-chevron-down loan-chevron"></i>
        </div>
        <div class="loan-details">
          <div class="loan-details-grid">${details}</div>
          ${actions ? `<div class="loan-details-actions">${actions}</div>` : ''}
        </div>
      </div>`;
  }

  function toggleCard(id) {
    document.getElementById(id).classList.toggle('open');
  }

  async function cancelRequest(id) {
    if (!confirm('Cancel this loan request?')) return;
    showToast('Request cancelled.', 'error');
    document.getElementById('card-'+id)?.remove();
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  async function logout() {
    try { await fetch(API.LOGOUT, { method:'POST', headers:authHeaders(), body:JSON.stringify({refresh}) }); } catch {}
    localStorage.clear();
    window.location.href = '../../auth/auth.html';
  }

  // close modal on overlay click
  document.getElementById('confirm-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });