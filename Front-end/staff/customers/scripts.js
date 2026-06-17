  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  //if (!access) window.location.href = '../../auth/auth.html';
  const role = localStorage.getItem('user_role')||'employee';
  const isManager = role==='manager';

  const API = {
    USERS:    (q) => `/api/v1/users/admin/?${q}`,
    USER:     (id) => `/api/v1/users/admin/${id}/`,
    ACCOUNTS: (uid) => `/accounts/admin/?customer=${uid}`,
    LOANS:    (uid) => `/loans/admin/customer/${uid}/loans/`,
    REQUESTS: (uid) => `/loans/admin/customer/${uid}/requests/`,
    LOGOUT:   '/api/v1/auth/logout/',
  };
  const H = () => ({'Content-Type':'application/json','Authorization':`Bearer ${access}`});

  // sidebar setup
  const name = localStorage.getItem('user_name')||'Staff';
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-avatar').textContent = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'ST';
  document.getElementById('sidebar-role').textContent = isManager?'Manager':'Employee';
  document.getElementById('role-label').textContent   = isManager?'Manager':'Employee';
  document.getElementById('role-badge').className = `role-badge ${isManager?'manager':'employee'}`;
  if(isManager) document.getElementById('nav-loans').style.display='flex';

  function toast(msg,type='error'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-alert-circle"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }

  // avatar colors
  const avatarColors=['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
  function avatarColor(name){ return avatarColors[(name||'').charCodeAt(0)%avatarColors.length]; }
  function initials(name){ return (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

  let currentPage=1, totalCount=0;
  const PAGE=20;

  async function loadCustomers(page=1){
    currentPage=page;
    const p=new URLSearchParams();
    p.set('primary_role','customer');
    const s=document.getElementById('search').value.trim();
    const status=document.getElementById('filter-status').value;
    const verified=document.getElementById('filter-verified').value;
    if(s)       p.set('search',s);
    if(status)  p.set('status',status);
    if(verified)p.set('is_verified',verified);

    document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('pagination').style.display='none';

    try{
      const res=await fetch(API.USERS(p),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      totalCount=data.count||list.length;
      document.getElementById('table-count').textContent=`${totalCount} customer${totalCount!==1?'s':''}`;
      if(!list.length){document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-users-off"></i><p>No customers found.</p></div>';return;}
      const rows=list.map(u=>`
        <tr onclick="openDrawer(${u.id})">
          <td>
            <div class="user-cell">
              <div class="u-avatar" style="background:${avatarColor(u.fullname)}">${initials(u.fullname)}</div>
              <div>
                <div style="font-size:13.5px;font-weight:600;">${u.fullname||'—'}</div>
                <div style="font-size:12px;color:var(--text-3);">${u.phone||'—'}</div>
              </div>
            </div>
          </td>
          <td>${u.email||'—'}</td>
          <td>${u.national_code||'—'}</td>
          <td><span class="badge ${u.status||'pending'}">${u.status||'—'}</span></td>
          <td>${u.is_verified
            ?'<i class="ti ti-circle-check verified-icon" title="Verified"></i>'
            :'<i class="ti ti-clock unverified-icon" title="Unverified"></i>'}</td>
          <td style="color:var(--text-3);font-size:12px;">${u.date_joined?new Date(u.date_joined).toLocaleDateString('en-DE'):'—'}</td>
        </tr>`).join('');
      document.getElementById('table-wrap').innerHTML=`
        <table>
          <thead><tr><th>Customer</th><th>Email</th><th>National Code</th><th>Status</th><th>Verified</th><th>Joined</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
      const pages=Math.ceil(totalCount/PAGE);
      if(pages>1){
        document.getElementById('pagination').style.display='flex';
        document.getElementById('pag-info').textContent=`Page ${currentPage} of ${pages}`;
        let b=`<button class="pag-btn" onclick="loadCustomers(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
        for(let i=1;i<=Math.min(pages,7);i++) b+=`<button class="pag-btn ${i===currentPage?'active':''}" onclick="loadCustomers(${i})">${i}</button>`;
        b+=`<button class="pag-btn" onclick="loadCustomers(${currentPage+1})" ${currentPage===pages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
        document.getElementById('pag-btns').innerHTML=b;
      }
    } catch { document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function resetFilters(){
    document.getElementById('search').value='';
    document.getElementById('filter-status').value='';
    document.getElementById('filter-verified').value='';
    loadCustomers(1);
  }

  // ── DRAWER ────────────────────────────────────────────────────────────────
  async function openDrawer(id){
    document.getElementById('overlay').classList.add('show');
    document.getElementById('customer-drawer').classList.add('open');
    document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';

    try{
      const [userRes, acctRes, loansRes] = await Promise.all([
        fetch(API.USER(id),{headers:H()}),
        fetch(API.ACCOUNTS(id),{headers:H()}),
        fetch(API.LOANS(id),{headers:H()}),
      ]);
      const u = await userRes.json();
      const acctData = await acctRes.json();
      const loansData = await loansRes.json();
      const accounts = Array.isArray(acctData)?acctData:(acctData.results||[]);
      const loans    = Array.isArray(loansData)?loansData:(loansData.results||[]);
      renderDrawer(u, accounts, loans);
    } catch { document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function renderDrawer(u, accounts, loans){
    const col = avatarColor(u.fullname);
    const totalBal = accounts.reduce((s,a)=>s+Number(a.balance||0),0);

    const accountsHtml = accounts.length
      ? accounts.map(a=>`
          <div class="account-item">
            <div class="account-icon"><i class="ti ti-wallet"></i></div>
            <div>
              <div class="account-num">${a.account_number||'—'}</div>
              <div style="font-size:11.5px;color:var(--text-3);">${a.type} · ${a.currency} · <span class="badge ${a.status}" style="font-size:10px;">${a.status}</span></div>
            </div>
            <div class="account-bal">€${Number(a.balance||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
          </div>`).join('')
      : '<div style="font-size:13px;color:var(--text-3);padding:8px 0;">No accounts found.</div>';

    const loansHtml = loans.length
      ? loans.map(l=>`
          <div class="account-item">
            <div class="account-icon" style="background:#fffbeb;color:var(--warning);"><i class="ti ti-coin"></i></div>
            <div>
              <div class="account-num">${(l.loan_type||'Loan').replace(/_/g,' ')}</div>
              <div style="font-size:11.5px;color:var(--text-3);">${l.duration_months}mo · <span class="badge ${l.status}" style="font-size:10px;">${l.status}</span></div>
            </div>
            <div class="account-bal" style="color:var(--warning);">€${Number(l.principal_amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
          </div>`).join('')
      : '<div style="font-size:13px;color:var(--text-3);padding:8px 0;">No active loans.</div>';

    document.getElementById('drawer-body').innerHTML=`
      <div class="profile-header">
        <div class="profile-avatar" style="background:${col}">${initials(u.fullname)}</div>
        <div>
          <div class="profile-name">${u.fullname||'—'}</div>
          <div class="profile-phone">${u.phone||'—'}</div>
          <div class="profile-badges">
            <span class="badge ${u.status}">${u.status||'—'}</span>
            ${u.is_verified
              ?'<span class="badge active"><i class="ti ti-check"></i> Verified</span>'
              :'<span class="badge pending"><i class="ti ti-clock"></i> Unverified</span>'}
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-cell"><div class="detail-label">Email</div><div class="detail-val">${u.email||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">National Code</div><div class="detail-val">${u.national_code||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Date Joined</div><div class="detail-val">${u.date_joined?new Date(u.date_joined).toLocaleDateString('en-DE'):'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Last Login</div><div class="detail-val">${u.last_login?new Date(u.last_login).toLocaleDateString('en-DE'):'Never'}</div></div>
        <div class="detail-cell"><div class="detail-label">Total Balance</div><div class="detail-val" style="color:var(--success);">€${totalBal.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
        <div class="detail-cell"><div class="detail-label">Accounts / Loans</div><div class="detail-val">${accounts.length} / ${loans.length}</div></div>
      </div>

      <div class="section-lbl">Linked Accounts</div>
      ${accountsHtml}

      <div class="section-lbl" style="margin-top:1.25rem;">Active Loans</div>
      ${loansHtml}`;
  }

  function closeDrawer(){
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('customer-drawer').classList.remove('open');
  }

  document.getElementById('search').addEventListener('keydown',e=>{ if(e.key==='Enter') loadCustomers(1); });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadCustomers(1);