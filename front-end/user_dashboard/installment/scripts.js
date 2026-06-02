 const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  // TODO: uncomment 
  // if (!access) window.location.href = '/auth.html';

  const API = {
    MY_INSTALLMENTS: '/api/installment/my',
    PAY:   (id)      => `/api/installment/${id}/pay`,
    REMAINING: (lid) => `/api/installment/loan/${lid}/remaining`,
    LOGOUT: '/api/auth/logout/',
  };

  function authHeaders() {
    return { 'Content-Type':'application/json', 'Authorization':`Bearer ${access}` };
  }

  // sidebar user
  const userName = localStorage.getItem('user_name') || '';
  document.getElementById('sidebar-name').textContent = userName || 'My Account';
  const initials = userName ? userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : 'U';
  document.getElementById('sidebar-avatar').textContent = initials;

  // toast
  function showToast(msg, type='success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── STATUS HELPERS ────────────────────────────────────────────────────────
  function statusBadge(status) {
    const map = {
      paid:    '<span class="badge paid"><i class="ti ti-circle-check"></i> Paid</span>',
      pending: '<span class="badge pending"><i class="ti ti-clock"></i> Pending</span>',
      overdue: '<span class="badge overdue"><i class="ti ti-alert-triangle"></i> Overdue</span>',
      partial: '<span class="badge partial"><i class="ti ti-adjustments"></i> Partial</span>',
    };
    return map[status] || `<span class="badge pending">${status}</span>`;
  }

  function isOverdue(item) {
    return item.status === 'overdue' || (item.status !== 'paid' && new Date(item.due_date) < new Date());
  }

  const typeIcon  = {home:'ti-home',car:'ti-car',business:'ti-briefcase',personal:'ti-user'};
  const typeClass = {home:'home',car:'car',business:'business',personal:'personal'};
  const typeLabel = {home:'Home Loan',car:'Car Loan',business:'Business Loan',personal:'Personal Loan'};

  // ── LOAD ALL ──────────────────────────────────────────────────────────────
  let allInstallments = [];

  async function loadInstallments() {
    try {
      const res  = await fetch(API.MY_INSTALLMENTS, { headers:authHeaders() });
      const data = await res.json();
      allInstallments = Array.isArray(data) ? data : (data.results || data.installments || []);
    } catch {
      // mock data
      allInstallments = [
        { id:'inst-1', loan:{id:'loan-a', type:'personal', amount:8000, duration_months:24}, number:15, due_date:'2026-06-01', amount:380.00, paid_amount:0,    penalty_amount:0,   status:'pending', paid_at:null,         created_at:'2025-01-15' },
        { id:'inst-2', loan:{id:'loan-a', type:'personal', amount:8000, duration_months:24}, number:14, due_date:'2026-05-01', amount:380.00, paid_amount:380,   penalty_amount:0,   status:'paid',    paid_at:'2026-05-02', created_at:'2025-01-15' },
        { id:'inst-3', loan:{id:'loan-a', type:'personal', amount:8000, duration_months:24}, number:13, due_date:'2026-04-01', amount:380.00, paid_amount:380,   penalty_amount:0,   status:'paid',    paid_at:'2026-04-01', created_at:'2025-01-15' },
        { id:'inst-4', loan:{id:'loan-b', type:'home',     amount:45000,duration_months:60}, number:8,  due_date:'2026-05-15', amount:870.00, paid_amount:0,    penalty_amount:28.50,status:'overdue', paid_at:null,         created_at:'2025-10-01' },
        { id:'inst-5', loan:{id:'loan-b', type:'home',     amount:45000,duration_months:60}, number:9,  due_date:'2026-06-15', amount:870.00, paid_amount:0,    penalty_amount:0,   status:'pending', paid_at:null,         created_at:'2025-10-01' },
        { id:'inst-6', loan:{id:'loan-b', type:'home',     amount:45000,duration_months:60}, number:7,  due_date:'2026-04-15', amount:870.00, paid_amount:870,  penalty_amount:0,   status:'paid',    paid_at:'2026-04-14', created_at:'2025-10-01' },
      ];
    }
    renderAll();
    await loadRemainingForGroups();
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  function renderAll() {
    // stats
    const total   = allInstallments.length;
    const paid    = allInstallments.filter(i=>i.status==='paid').length;
    const overdue = allInstallments.filter(i=>i.status==='overdue' || isOverdue(i)).length;
    const pending = total - paid - overdue;
    document.getElementById('stat-total').textContent   = total;
    document.getElementById('stat-paid').textContent    = paid;
    document.getElementById('stat-pending').textContent = Math.max(0,pending);
    document.getElementById('stat-overdue').textContent = overdue;

    // group by loan
    const groups = {};
    allInstallments.forEach(inst => {
      const lid = inst.loan?.id || inst.loan || 'unknown';
      if (!groups[lid]) groups[lid] = { loan:inst.loan, items:[] };
      groups[lid].items.push(inst);
    });

    const container = document.getElementById('groups-container');
    if (!Object.keys(groups).length) {
      container.innerHTML = `<div class="empty-state"><i class="ti ti-receipt-off"></i><p>No installments found.</p></div>`;
      return;
    }

    container.innerHTML = Object.entries(groups).map(([lid, group], gi) => {
      const items    = group.items.sort((a,b) => a.number - b.number);
      const loan     = group.loan || {};
      const t        = loan.type || 'personal';
      const lTotal   = items.length;
      const lPaid    = items.filter(i=>i.status==='paid').length;
      const pct      = Math.round((lPaid/lTotal)*100);
      const hasOverdue = items.some(i => i.status==='overdue' || isOverdue(i));
      const nextDue  = items.find(i => i.status !== 'paid');

      const rows = items.map(inst => {
        const overdue = isOverdue(inst);
        const canPay  = inst.status !== 'paid';
        const total   = (inst.amount||0) + (inst.penalty_amount||0);
        return `
          <tr id="row-${inst.id}">
            <td><span class="td-number">${inst.number}</span></td>
            <td class="td-date">
              ${inst.due_date}
              ${overdue && inst.status!=='paid' ? '<br><span style="font-size:11px;color:var(--danger);font-weight:600;">OVERDUE</span>' : ''}
            </td>
            <td>
              <span class="td-amount">€${Number(inst.amount||0).toFixed(2)}</span>
              ${inst.penalty_amount > 0 ? `<span class="td-penalty">+€${Number(inst.penalty_amount).toFixed(2)} penalty</span>` : ''}
            </td>
            <td>${statusBadge(overdue && inst.status!=='paid' ? 'overdue' : inst.status)}</td>
            <td class="td-paid-at">${inst.paid_at ? inst.paid_at : '—'}</td>
            <td>
              ${canPay
                ? `<button class="pay-btn ${overdue?'overdue':''}" onclick="openPayModal('${inst.id}',${inst.number},'${inst.due_date}',${inst.amount},${inst.penalty_amount||0})">
                     <i class="ti ti-credit-card"></i> Pay
                   </button>`
                : `<i class="ti ti-circle-check paid-check" title="Paid on ${inst.paid_at}"></i>`
              }
            </td>
          </tr>`;
      }).join('');

      return `
        <div class="loan-group${gi===0?' open':''}" id="group-${lid}">
          <div class="loan-group-header" onclick="toggleGroup('group-${lid}')">
            <div class="loan-group-icon ${typeClass[t]||'personal'}"><i class="ti ${typeIcon[t]||'ti-coin'}"></i></div>
            <div class="loan-group-info">
              <div class="loan-group-title">${typeLabel[t]||'Loan'} ${hasOverdue?'<span class="badge overdue" style="font-size:10px;margin-left:6px;"><i class="ti ti-alert-triangle"></i> Overdue</span>':''}</div>
              <div class="group-progress">
                <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                <div class="progress-label">${lPaid} of ${lTotal} paid · ${pct}%${nextDue ? ' · Next due: '+nextDue.due_date : ''}</div>
              </div>
            </div>
            <div class="loan-group-stats">
              <div class="lg-stat">
                <div class="lg-stat-label">Loan Amount</div>
                <div class="lg-stat-val">€${Number(loan.amount||0).toLocaleString()}</div>
              </div>
              <div class="lg-stat">
                <div class="lg-stat-label">Remaining</div>
                <div class="lg-stat-val accent" id="remaining-${lid}">—</div>
              </div>
            </div>
            <i class="ti ti-chevron-down group-chevron"></i>
          </div>

          <div class="inst-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="remaining-footer">
              <div>
                <div class="remaining-label">Total Remaining Balance</div>
                <div class="remaining-sub">Including all pending installments</div>
              </div>
              <div class="remaining-val" id="remaining-footer-${lid}">—</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ── LOAD REMAINING PER LOAN ───────────────────────────────────────────────
  async function loadRemainingForGroups() {
    const groups = {};
    allInstallments.forEach(inst => {
      const lid = inst.loan?.id || inst.loan || 'unknown';
      groups[lid] = true;
    });
    await Promise.all(Object.keys(groups).map(async lid => {
      try {
        const res  = await fetch(API.REMAINING(lid), { headers:authHeaders() });
        const data = await res.json();
        const val  = data.remaining_amount ?? data.remaining ?? data.amount ?? null;
        if (val !== null) {
          const fmt = '€' + Number(val).toLocaleString(undefined,{minimumFractionDigits:2});
          const el1 = document.getElementById(`remaining-${lid}`);
          const el2 = document.getElementById(`remaining-footer-${lid}`);
          if (el1) el1.textContent = fmt;
          if (el2) el2.textContent = fmt;
        }
      } catch { /* silent — mock already shows — */ }
    }));
  }

  function toggleGroup(id) {
    document.getElementById(id).classList.toggle('open');
  }

  // ── PAY MODAL ─────────────────────────────────────────────────────────────
  let activePayId = null;

  function openPayModal(id, number, dueDate, amount, penalty) {
    activePayId = id;
    const total = amount + penalty;
    document.getElementById('m-number').textContent  = `#${number}`;
    document.getElementById('m-due').textContent     = dueDate;
    document.getElementById('m-amount').textContent  = `€${Number(amount).toFixed(2)}`;
    document.getElementById('m-penalty').textContent = `€${Number(penalty).toFixed(2)}`;
    document.getElementById('m-total').textContent   = `€${Number(total).toFixed(2)}`;
    document.getElementById('m-penalty-row').style.display = penalty > 0 ? 'flex' : 'none';
    document.getElementById('pay-modal').classList.add('show');
  }

  function closeModal() {
    document.getElementById('pay-modal').classList.remove('show');
    activePayId = null;
  }

  async function confirmPay() {
    if (!activePayId) return;
    const btn  = document.getElementById('pay-confirm-btn');
    const spin = document.getElementById('pay-spin');
    const icon = document.getElementById('pay-icon');
    const txt  = document.getElementById('pay-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Processing…';

    try {
      const res  = await fetch(API.PAY(activePayId), { method:'POST', headers:authHeaders() });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        showToast('Payment successful!');
        // update the row UI
        const idx = allInstallments.findIndex(i => i.id === activePayId);
        if (idx !== -1) {
          allInstallments[idx].status   = 'paid';
          allInstallments[idx].paid_at  = new Date().toISOString().slice(0,10);
        }
        renderAll();
        await loadRemainingForGroups();
      } else {
        closeModal();
        showToast(data.detail || data.message || 'Payment failed. Please try again.', 'error');
      }
    } catch {
      closeModal();
      showToast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Pay Now';
    }
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  async function logout() {
    try { await fetch(API.LOGOUT,{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh})}); } catch {}
    localStorage.clear();
    window.location.href = '../../auth/auth.html';
  }

  // close modal on overlay click
  document.getElementById('pay-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // check if arriving from loan page with ?loan= param
  const params = new URLSearchParams(window.location.search);
  const focusLoan = params.get('loan');

  // init
  loadInstallments().then(() => {
    if (focusLoan) {
      const el = document.getElementById(`group-${focusLoan}`);
      if (el) { el.classList.add('open'); el.scrollIntoView({behavior:'smooth',block:'start'}); }
    }
  });