  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  // TODO: uncomment
  // if (!access) window.location.href = '/auth.html';

  // account_id — stored at login or use a default
  const accountId = localStorage.getItem('account_id') || '1';

  const API = {
    STATEMENT: `/api/transactions/statement/${accountId}`,
    LOGOUT:    '/api/auth/logout/',
  };
  function authHeaders() {
    return { 'Content-Type':'application/json','Authorization':`Bearer ${access}` };
  }

  // sidebar
  const userName = localStorage.getItem('user_name') || '';
  document.getElementById('sidebar-name').textContent = userName || 'My Account';
  const initials = userName ? userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : 'U';
  document.getElementById('sidebar-avatar').textContent = initials;

  // toast
  function showToast(msg,type='success'){
    const el=document.createElement('div'); el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(()=>el.remove(),4000);
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  let allTx       = [];
  let filteredTx  = [];
  let currentType = 'all';
  let currentPage = 1;
  const PAGE_SIZE = 15;

  // ── LOAD ──────────────────────────────────────────────────────────────────
  async function loadStatement() {
    try {
      const res  = await fetch(API.STATEMENT, { headers:authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      allTx = Array.isArray(data) ? data : (data.results || data.transactions || []);
    } catch {
      // mock data
      allTx = [
        { id:'tx-1',  type:'income',   description:'Salary deposit',         reference:'SAL-2026-05', amount:3200.00, status:'completed', created_at:'2026-05-15T09:00:00Z' },
        { id:'tx-2',  type:'expense',  description:'Rent payment',           reference:'RENT-0501',   amount:950.00,  status:'completed', created_at:'2026-05-14T11:30:00Z' },
        { id:'tx-3',  type:'transfer', description:'Transfer to Sarah M.',   reference:'TRF-88210',   amount:200.00,  status:'completed', created_at:'2026-05-13T14:22:00Z' },
        { id:'tx-4',  type:'expense',  description:'Electricity bill',       reference:'BILL-0430',   amount:84.50,   status:'completed', created_at:'2026-05-10T08:10:00Z' },
        { id:'tx-5',  type:'income',   description:'Freelance payment',      reference:'FRL-4412',    amount:750.00,  status:'completed', created_at:'2026-05-08T16:45:00Z' },
        { id:'tx-6',  type:'expense',  description:'Grocery shopping',       reference:'GRC-9921',    amount:132.80,  status:'completed', created_at:'2026-05-07T10:05:00Z' },
        { id:'tx-7',  type:'transfer', description:'Card transfer to Ahmed',  reference:'TRF-88100',  amount:500.00,  status:'completed', created_at:'2026-05-05T13:00:00Z' },
        { id:'tx-8',  type:'expense',  description:'Internet subscription',  reference:'SUB-0501',    amount:39.99,   status:'completed', created_at:'2026-05-03T09:00:00Z' },
        { id:'tx-9',  type:'income',   description:'Bank interest',          reference:'INT-0501',    amount:12.40,   status:'completed', created_at:'2026-05-01T00:00:00Z' },
        { id:'tx-10', type:'expense',  description:'Loan installment',       reference:'INST-15',     amount:380.00,  status:'completed', created_at:'2026-04-30T08:00:00Z' },
        { id:'tx-11', type:'income',   description:'Salary deposit',         reference:'SAL-2026-04', amount:3200.00, status:'completed', created_at:'2026-04-15T09:00:00Z' },
        { id:'tx-12', type:'expense',  description:'Rent payment',           reference:'RENT-0401',   amount:950.00,  status:'completed', created_at:'2026-04-14T11:00:00Z' },
        { id:'tx-13', type:'expense',  description:'Car insurance',          reference:'INS-0401',    amount:210.00,  status:'completed', created_at:'2026-04-10T10:00:00Z' },
        { id:'tx-14', type:'transfer', description:'Transfer to family',     reference:'TRF-77320',   amount:300.00,  status:'pending',   created_at:'2026-04-08T17:30:00Z' },
        { id:'tx-15', type:'expense',  description:'Restaurant',             reference:'EXP-4490',    amount:67.20,   status:'completed', created_at:'2026-04-05T20:15:00Z' },
        { id:'tx-16', type:'income',   description:'Tax refund',             reference:'TAX-2026',    amount:420.00,  status:'completed', created_at:'2026-03-20T12:00:00Z' },
        { id:'tx-17', type:'expense',  description:'Loan installment',       reference:'INST-14',     amount:380.00,  status:'completed', created_at:'2026-03-31T08:00:00Z' },
      ];
    }
    applyFilters();
  }

  // ── FILTERS ───────────────────────────────────────────────────────────────
  function applyFilters() {
    const from = document.getElementById('filter-from').value;
    const to   = document.getElementById('filter-to').value;

    filteredTx = allTx.filter(tx => {
      const date = new Date(tx.created_at);
      if (from && date < new Date(from)) return false;
      if (to   && date > new Date(to + 'T23:59:59')) return false;
      if (currentType !== 'all' && tx.type !== currentType) return false;
      return true;
    });

    currentPage = 1;
    updateStats();
    renderTable();
  }

  function resetFilters() {
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value   = '';
    currentType = 'all';
    ['all','income','expense','transfer'].forEach(t =>
      document.getElementById('pill-'+t).classList.toggle('active', t==='all')
    );
    applyFilters();
  }

  function setTypePill(type) {
    currentType = type;
    ['all','income','expense','transfer'].forEach(t =>
      document.getElementById('pill-'+t).classList.toggle('active', t===type)
    );
    applyFilters();
  }

  // ── STATS ─────────────────────────────────────────────────────────────────
  function updateStats() {
    const income  = filteredTx.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const expense = filteredTx.filter(t=>t.type!=='income').reduce((s,t)=>s+Number(t.amount),0);
    const net     = income - expense;
    document.getElementById('stat-total').textContent   = filteredTx.length;
    document.getElementById('stat-income').textContent  = '€' + income.toLocaleString(undefined,{minimumFractionDigits:2});
    document.getElementById('stat-expense').textContent = '€' + expense.toLocaleString(undefined,{minimumFractionDigits:2});
    const netEl = document.getElementById('stat-net');
    netEl.textContent = (net>=0?'+':'') + '€' + Math.abs(net).toLocaleString(undefined,{minimumFractionDigits:2});
    netEl.className = 'strip-val ' + (net>=0?'green':'red');
  }

  // ── RENDER TABLE ──────────────────────────────────────────────────────────
  const typeIcon = { income:'ti-arrow-down-left', expense:'ti-arrow-up-right', transfer:'ti-arrows-right-left' };

  function renderTable() {
    const wrap = document.getElementById('table-wrap');
    document.getElementById('table-count').textContent = `${filteredTx.length} result${filteredTx.length!==1?'s':''}`;

    if (!filteredTx.length) {
      wrap.innerHTML = `<div class="empty-state"><i class="ti ti-file-off"></i><p>No transactions match your filters.</p></div>`;
      document.getElementById('pagination').style.display = 'none';
      return;
    }

    const totalPages = Math.ceil(filteredTx.length / PAGE_SIZE);
    const start = (currentPage-1)*PAGE_SIZE;
    const page  = filteredTx.slice(start, start+PAGE_SIZE);

    const rows = page.map(tx => {
      const t    = tx.type || 'expense';
      const sign = t==='income' ? '+' : '-';
      const d    = new Date(tx.created_at);
      const dateStr = d.toLocaleDateString('en-DE',{day:'2-digit',month:'short',year:'numeric'});
      const timeStr = d.toLocaleTimeString('en-DE',{hour:'2-digit',minute:'2-digit'});
      const statusBadge = tx.status==='completed'
        ? '<span class="badge success"><i class="ti ti-circle-check"></i> Completed</span>'
        : tx.status==='pending'
        ? '<span class="badge pending"><i class="ti ti-clock"></i> Pending</span>'
        : '<span class="badge failed"><i class="ti ti-circle-x"></i> Failed</span>';
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="tx-type-icon ${t}"><i class="ti ${typeIcon[t]||'ti-arrows-right-left'}"></i></div>
              <div>
                <div class="tx-desc">${tx.description||'Transaction'}</div>
                <div class="tx-ref">${tx.reference||tx.id||'—'}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="tx-date-main">${dateStr}</div>
            <div class="tx-date-time">${timeStr}</div>
          </td>
          <td>${statusBadge}</td>
          <td class="right">
            <span class="tx-amount ${t}">${sign}€${Number(tx.amount).toFixed(2)}</span>
          </td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Date</th>
            <th>Status</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    // pagination
    const pagEl  = document.getElementById('pagination');
    const pagInfo = document.getElementById('pag-info');
    const pagBtns = document.getElementById('pag-btns');
    pagEl.style.display = totalPages > 1 ? 'flex' : 'none';
    pagInfo.textContent = `Showing ${start+1}–${Math.min(start+PAGE_SIZE,filteredTx.length)} of ${filteredTx.length} transactions`;

    let btns = '';
    btns += `<button class="pag-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
    for (let i=1;i<=totalPages;i++) {
      if (totalPages<=7 || i===1 || i===totalPages || Math.abs(i-currentPage)<=1) {
        btns += `<button class="pag-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
      } else if (Math.abs(i-currentPage)===2) {
        btns += `<button class="pag-btn" disabled style="border:none;">…</button>`;
      }
    }
    btns += `<button class="pag-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
    pagBtns.innerHTML = btns;
  }

  function goPage(p) {
    const total = Math.ceil(filteredTx.length/PAGE_SIZE);
    if (p<1||p>total) return;
    currentPage = p;
    renderTable();
    document.querySelector('.table-card').scrollIntoView({behavior:'smooth',block:'start'});
  }

  // ── PDF EXPORT ────────────────────────────────────────────────────────────
  function exportPDF() {
    const btn = document.getElementById('export-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader-2"></i> Generating…';

    // set pdf header date
    const now = new Date().toLocaleString('en-DE',{dateStyle:'long',timeStyle:'short'});
    document.getElementById('pdf-date').textContent = now;

    // show all rows for print (temporarily remove pagination)
    const savedPage = currentPage;
    const savedFiltered = [...filteredTx];

    // render all rows
    const allRows = filteredTx.map(tx => {
      const t    = tx.type||'expense';
      const sign = t==='income'?'+':'-';
      const d    = new Date(tx.created_at);
      const dateStr = d.toLocaleDateString('en-DE',{day:'2-digit',month:'short',year:'numeric'});
      return `
        <tr>
          <td>${tx.description||'Transaction'}</td>
          <td>${tx.reference||tx.id||'—'}</td>
          <td>${dateStr}</td>
          <td>${tx.type||'—'}</td>
          <td>${tx.status||'—'}</td>
          <td style="text-align:right;font-weight:700;">${sign}€${Number(tx.amount).toFixed(2)}</td>
        </tr>`;
    }).join('');

    document.getElementById('table-wrap').innerHTML = `
      <table>
        <thead><tr><th>Description</th><th>Reference</th><th>Date</th><th>Type</th><th>Status</th><th class="right">Amount</th></tr></thead>
        <tbody>${allRows}</tbody>
      </table>`;
    document.getElementById('pagination').style.display='none';

    setTimeout(() => {
      window.print();
      // restore after print
      setTimeout(() => {
        filteredTx = savedFiltered;
        currentPage = savedPage;
        renderTable();
        btn.disabled=false;
        btn.innerHTML='<i class="ti ti-file-type-pdf"></i> Export PDF';
        showToast('Statement exported successfully!');
      }, 500);
    }, 300);
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  async function logout() {
    try { await fetch(API.LOGOUT,{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh})}); } catch {}
    localStorage.clear();
    window.location.href='../../auth/auth.html';
  }

  // set default date range (last 3 months)
  const today = new Date();
  const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth()-3);
  document.getElementById('filter-to').value   = today.toISOString().slice(0,10);
  document.getElementById('filter-from').value = threeMonthsAgo.toISOString().slice(0,10);

  loadStatement();