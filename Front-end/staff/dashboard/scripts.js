  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  //if (!access) window.location.href = '../../auth/auth.html';

  const role    = localStorage.getItem('user_role') || 'employee';
  const isManager = role === 'manager';

  const API = {
    ACCOUNTS:     '/accounts/admin/',
    TRANSACTIONS: '/api/transactions/admin/',
    LOAN_PENDING: '/loans/admin/requests/pending/',
    USERS:        '/api/v1/users/admin/',
    LOGOUT:       '/api/v1/auth/logout/',
  };
  const H = () => ({ 'Content-Type':'application/json','Authorization':`Bearer ${access}` });

  // ── ROLE SETUP ────────────────────────────────────────────────────────────
  function setupRole(){
    const name = localStorage.getItem('user_name')||'Staff';
    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('sidebar-avatar').textContent = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'ST';
    document.getElementById('sidebar-role').textContent = isManager ? 'Manager' : 'Employee';
    document.getElementById('role-label').textContent   = isManager ? 'Manager' : 'Employee';
    document.getElementById('topbar-title').textContent = isManager ? 'Manager Dashboard' : 'Employee Dashboard';
    const badge = document.getElementById('role-badge');
    badge.className = `role-badge ${isManager?'manager':'employee'}`;
    badge.querySelector('i').className = isManager ? 'ti ti-crown' : 'ti ti-id-badge';
    document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-DE',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

    if(isManager){
      document.querySelectorAll('.manager-only').forEach(el=>el.style.display='flex');
      document.getElementById('second-card-title').innerHTML = '<i class="ti ti-coin" style="font-size:16px;color:var(--warning);"></i> Pending Loan Requests';
      document.getElementById('second-card-link').href = '../../ststaff-loans.html';
      document.getElementById('second-card-link').textContent = 'Review all';
      document.getElementById('user-avatar').style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
    }
  }

  function toast(msg){
    const el=document.createElement('div');el.className='toast';
    el.innerHTML=`<i class="ti ti-alert-circle"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),3500);
  }
  function fmt(n){ return '€'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2}); }

  // ── LOAD ACCOUNTS ─────────────────────────────────────────────────────────
  async function loadAccounts(){
    try{
      const res=await fetch(API.ACCOUNTS,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('kpi-accounts').textContent = list.filter(a=>a.status==='ACTIVE').length.toLocaleString();
      document.getElementById('kpi-accounts-sub').textContent = `${list.length} total accounts`;
      const recent=list.slice(0,5);
      if(!recent.length){ document.getElementById('recent-accounts').innerHTML='<div class="empty"><i class="ti ti-wallet-off"></i>No accounts</div>'; return; }
      document.getElementById('recent-accounts').innerHTML=recent.map(a=>`
        <a class="list-item" href="staff-accounts.html">
          <div class="list-icon ${a.status==='ACTIVE'?'blue':'red'}"><i class="ti ti-wallet"></i></div>
          <div>
            <div class="list-name">${a.customer_name}</div>
            <div class="list-meta">${a.account_number} · ${a.type}</div>
          </div>
          <div class="list-right">
            <div class="list-amount">${fmt(a.balance)}</div>
            <span class="badge ${a.status==='ACTIVE'?'ACTIVE_ACC':'BLOCKED'}">${a.status}</span>
          </div>
        </a>`).join('');
    } catch { document.getElementById('recent-accounts').innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load</div>'; }
  }

  // ── LOAD TRANSACTIONS ─────────────────────────────────────────────────────
  async function loadTransactions(){
    try{
      const today=new Date().toISOString().slice(0,10);
      const res=await fetch(API.TRANSACTIONS,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('kpi-tx').textContent = list.length.toLocaleString();
      if(!isManager){
        if(!list.length){ document.getElementById('second-card-body').innerHTML='<div class="empty"><i class="ti ti-arrows-off"></i>No transactions today</div>'; return; }
        document.getElementById('second-card-body').innerHTML=list.slice(0,5).map(t=>`
          <a class="list-item" href="staff-transactions.html">
            <div class="list-icon blue"><i class="ti ti-arrows-right-left"></i></div>
            <div>
              <div class="list-name">${t.description||t.type?.replace(/_/g,' ')||'Transaction'}</div>
              <div class="list-meta">${t.reference_number||'—'}</div>
            </div>
            <div class="list-right">
              <div class="list-amount">${fmt(t.amount)}</div>
              <span class="badge ${t.status==='SUCCESS'?'APPROVED':'PENDING'}">${t.status}</span>
            </div>
          </a>`).join('');
      }
    } catch { document.getElementById('kpi-tx').textContent='—'; }
  }


  // ── LOAD CUSTOMERS ────────────────────────────────────────────────────────
  async function loadCustomers(){
    try{
      const res=await fetch(`${API.USERS}?primary_role=customer`,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('kpi-customers').textContent = list.length.toLocaleString();
    } catch { document.getElementById('kpi-customers').textContent='—'; }
  }

  async function loadAll(){
    const btn=document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    await Promise.all([loadAccounts(), loadTransactions(), loadPendingLoans(), loadCustomers()]);
    btn.classList.remove('spinning');
  }

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  setupRole();
  loadAll();
