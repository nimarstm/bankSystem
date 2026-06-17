  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  //if (!access) window.location.href = '../../auth/auth.html';
  const role = localStorage.getItem('user_role')||'employee';
  const isManager = role==='manager';

  const API = {
    LIST:      (q)  => `/accounts/admin/?${q}`,
    DETAIL:    (id) => `/accounts/admin/${id}/`,
    DEPOSIT:   (id) => `/accounts/${id}/deposit/`,
    WITHDRAW:  (id) => `/accounts/${id}/withdraw/`,
    FREEZE:    (id) => `/accounts/${id}/freeze/`,
    ACTIVATE:  (id) => `/accounts/${id}/activate/`,
    CLOSE:     (id) => `/accounts/${id}/close/`,
    SET_PRI:   (id) => `/accounts/${id}/set-primary/`,
    BLK_BAL:   (id) => `/accounts/admin/${id}/block-balance/`,
    UBLK_BAL:  (id) => `/accounts/admin/${id}/unblock-balance/`,
    LIMITS:    (id) => `/api/transactions/admin/account/${id}/limits/usage/`,
    STATEMENT: (id) => `/api/transactions/admin/account/${id}/statement/`,
    LOGOUT: '/api/v1/auth/logout/',
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

  function toast(msg,type='success'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }
  function fmt(n){ return '€'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

  let activeId=null, activeAction=null;

  async function loadAccounts(){
    const p=new URLSearchParams();
    const s=document.getElementById('search').value.trim();
    const status=document.getElementById('filter-status').value;
    const type  =document.getElementById('filter-type').value;
    if(s)      p.set('search',s);
    if(status) p.set('status',status);
    if(type)   p.set('type',type);
    document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    try{
      const res=await fetch(API.LIST(p),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('table-count').textContent=`${list.length} result${list.length!==1?'s':''}`;
      if(!list.length){document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-wallet-off"></i><p>No accounts found.</p></div>';return;}
      document.getElementById('table-wrap').innerHTML=`
        <table>
          <thead><tr><th>Account No.</th><th>IBAN</th><th>Customer</th><th>Type</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>${list.map(a=>`
            <tr onclick="openDrawer(${a.id})">
              <td><span class="mono">${a.account_number}</span>${a.is_primary?'<span class="badge primary" style="margin-left:6px;font-size:10px;">Primary</span>':''}</td>
              <td><span class="mono">${(a.iban||'—').slice(0,18)}…</span></td>
              <td>${a.customer?.fullname||'—'}</td>
              <td>${a.type} · ${a.currency}</td>
              <td style="font-weight:600;">${fmt(a.balance)}</td>
              <td><span class="badge ${a.status}">${a.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } catch { document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function resetFilters(){
    document.getElementById('search').value='';
    document.getElementById('filter-status').value='';
    document.getElementById('filter-type').value='';
    loadAccounts();
  }

  async function openDrawer(id){
    activeId=id;
    document.getElementById('overlay').classList.add('show');
    document.getElementById('acct-drawer').classList.add('open');
    switchDTab('detail');
    document.getElementById('dpanel-detail').innerHTML='<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px;"><i class="ti ti-loader-2" style="font-size:28px;display:block;margin-bottom:8px;"></i>Loading…</div>';
    document.getElementById('drawer-footer').innerHTML='';
    document.getElementById('dpanel-statement').dataset.loaded='';
    document.getElementById('dpanel-limits').dataset.loaded='';
    try{
      const res=await fetch(API.DETAIL(id),{headers:H()});
      const a=await res.json();
      renderDrawer(a);
    } catch { toast('Failed to load account','error'); }
  }

  function switchDTab(tab){
    ['detail','statement','limits'].forEach(t=>{
      const btn=document.getElementById('dtab-'+t);
      const panel=document.getElementById('dpanel-'+t);
      const isActive=t===tab;
      btn.style.color=isActive?'var(--accent)':'var(--text-3)';
      btn.style.borderBottomColor=isActive?'var(--accent)':'transparent';
      btn.style.fontWeight=isActive?'600':'500';
      panel.style.display=isActive?'':'none';
    });
    if(tab==='statement' && !document.getElementById('dpanel-statement').dataset.loaded) loadStatement();
    if(tab==='limits'    && !document.getElementById('dpanel-limits').dataset.loaded)    loadLimits();
  }

  const creditTypes=['CASH_DEPOSIT','LOAN_DISBURSEMENT','REFUND'];

  async function loadStatement(){
    const el=document.getElementById('dpanel-statement');
    el.dataset.loaded='1';
    el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px;"><i class="ti ti-loader-2" style="font-size:28px;display:block;margin-bottom:8px;"></i>Loading…</div>';
    try{
      const res=await fetch(API.STATEMENT(activeId),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||data.transactions||[]);
      if(!list.length){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px;"><i class="ti ti-file-off" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.4;"></i>No transactions.</div>';return;}
      el.innerHTML=list.slice(0,20).map(t=>{
        const isCredit=creditTypes.includes(t.type);
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
          <div style="width:32px;height:32px;border-radius:8px;background:${isCredit?'var(--success-bg)':'var(--danger-bg)'};display:flex;align-items:center;justify-content:center;font-size:15px;color:${isCredit?'var(--success)':'var(--danger)'};flex-shrink:0;">
            <i class="ti ti-arrow-${isCredit?'down-left':'up-right'}"></i>
          </div>
          <div style="flex:1;">
            <div style="font-weight:500;">${t.description||t.type?.replace(/_/g,' ')||'Tx'}</div>
            <div style="font-size:11.5px;color:var(--text-3);">${t.created_at?new Date(t.created_at).toLocaleDateString('en-DE'):''}</div>
          </div>
          <div style="font-weight:700;color:${isCredit?'var(--success)':'var(--danger)'};">${isCredit?'+':'-'}€${Number(t.amount||0).toFixed(2)}</div>
        </div>`;
      }).join('');
    } catch { el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--danger);font-size:13px;">Failed to load statement.</div>'; }
  }

  async function loadLimits(){
    const el=document.getElementById('dpanel-limits');
    el.dataset.loaded='1';
    el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px;"><i class="ti ti-loader-2" style="font-size:28px;display:block;margin-bottom:8px;"></i>Loading…</div>';
    try{
      const res=await fetch(API.LIMITS(activeId),{headers:H()});
      const d=await res.json();
      const daily  =d.daily_usage  ||d.daily  ||{used:0,limit:0};
      const monthly=d.monthly_usage||d.monthly||{used:0,limit:0};
      function pct(u,l){ return l>0?Math.min(100,Math.round(u/l*100)):0; }
      function cls(p){ return p>=90?'var(--danger)':p>=70?'var(--warning)':'var(--accent)'; }
      el.innerHTML=`
        <div style="font-size:12px;font-weight:700;color:var(--text-3);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:1rem;">Transfer Limits Usage</div>
        ${['Daily','Monthly'].map((lbl,i)=>{
          const obj=i===0?daily:monthly;
          const p=pct(obj.used,obj.limit);
          return `<div style="margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px;">
              <span style="color:var(--text-2);font-weight:500;">${lbl}</span>
              <span style="font-weight:600;">€${Number(obj.used||0).toFixed(2)} / €${Number(obj.limit||0).toFixed(2)}</span>
            </div>
            <div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden;">
              <div style="height:100%;width:${p}%;background:${cls(p)};border-radius:99px;transition:width 0.6s;"></div>
            </div>
          </div>`;
        }).join('')}`;
    } catch { el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--danger);font-size:13px;">Failed to load limits.</div>'; }
  }

  function renderDrawer(a){
    const avail=Number(a.balance||0)-Number(a.blocked_balance||0);
    document.getElementById('dpanel-detail').innerHTML=`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
        <div style="width:50px;height:50px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--accent);"><i class="ti ti-wallet"></i></div>
        <div>
          <div style="font-size:16px;font-weight:700;font-family:monospace;">${a.account_number||'—'}</div>
          <div style="font-size:12.5px;color:var(--text-3);margin-top:2px;">${a.customer?.fullname||'—'} · ${a.type} · ${a.currency}</div>
          <div style="margin-top:5px;display:flex;gap:6px;">
            <span class="badge ${a.status}">${a.status}</span>
            ${a.is_primary?'<span class="badge primary">Primary</span>':''}
          </div>
        </div>
      </div>
      <div class="balance-row">
        <div class="balance-box"><div class="balance-box-label">Balance</div><div class="balance-box-val">${fmt(a.balance)}</div></div>
        <div class="balance-box"><div class="balance-box-label">Available</div><div class="balance-box-val green">${fmt(avail)}</div></div>
        <div class="balance-box"><div class="balance-box-label">Blocked</div><div class="balance-box-val red">${fmt(a.blocked_balance)}</div></div>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><div class="detail-label">IBAN</div><div class="detail-val" style="font-size:12px;font-family:monospace;">${a.iban||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Bank</div><div class="detail-val">${a.bank?.name||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Customer Email</div><div class="detail-val">${a.customer?.email||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Created</div><div class="detail-val">${a.created_at?new Date(a.created_at).toLocaleDateString('en-DE'):'—'}</div></div>
      </div>`;

    const btns=[];
    btns.push(`<button class="btn success" onclick="openAmountModal('deposit','Deposit Funds')"><i class="ti ti-arrow-down-left"></i> Deposit</button>`);
    btns.push(`<button class="btn warning" onclick="openAmountModal('withdraw','Withdraw Funds')"><i class="ti ti-arrow-up-right"></i> Withdraw</button>`);
    if(a.status==='ACTIVE')  btns.push(`<button class="btn danger"  onclick="doAction('freeze')"><i class="ti ti-snowflake"></i> Freeze</button>`);
    if(a.status==='BLOCKED') btns.push(`<button class="btn success" onclick="doAction('activate')"><i class="ti ti-player-play"></i> Activate</button>`);
    if(a.status!=='CLOSED')  btns.push(`<button class="btn danger"  onclick="doAction('close')"><i class="ti ti-circle-x"></i> Close</button>`);
    btns.push(`<button class="btn ghost" onclick="openAmountModal('block-balance','Block Balance')"><i class="ti ti-lock"></i> Block Bal</button>`);
    btns.push(`<button class="btn ghost" onclick="openAmountModal('unblock-balance','Unblock Balance')"><i class="ti ti-lock-open"></i> Unblock Bal</button>`);
    if(!a.is_primary&&a.status==='ACTIVE') btns.push(`<button class="btn ghost" onclick="doAction('set-primary')"><i class="ti ti-star"></i> Set Primary</button>`);
    document.getElementById('drawer-footer').innerHTML=btns.join('');
  }

  function closeDrawer(){
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('acct-drawer').classList.remove('open');
    activeId=null;
    ['statement','limits'].forEach(t=>{ const el=document.getElementById('dpanel-'+t); if(el) el.dataset.loaded=''; });
  }

  async function doAction(action){
    const urlMap={
      freeze:         API.FREEZE(activeId),
      activate:       API.ACTIVATE(activeId),
      close:          API.CLOSE(activeId),
      'set-primary':  API.SET_PRI(activeId),
    };
    const msgMap={ freeze:'Account frozen', activate:'Account activated', close:'Account closed', 'set-primary':'Set as primary account' };
    try{
      const res=await fetch(urlMap[action],{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast(msgMap[action]); closeDrawer(); loadAccounts(); }
      else { const d=await res.json(); toast(d.detail||'Action failed','error'); }
    } catch { toast('Network error','error'); }
  }

  function openAmountModal(action,title){
    activeAction=action;
    document.getElementById('amount-modal-title').textContent=title;
    document.getElementById('modal-amount').value='';
    document.getElementById('amount-modal').classList.add('show');
  }
  function closeAmountModal(){ document.getElementById('amount-modal').classList.remove('show'); activeAction=null; }

  async function confirmAmount(){
    const amount=parseFloat(document.getElementById('modal-amount').value);
    if(!amount||amount<=0){ toast('Enter a valid amount','error'); return; }
    const urlMap={
      'deposit':         API.DEPOSIT(activeId),
      'withdraw':        API.WITHDRAW(activeId),
      'block-balance':   API.BLK_BAL(activeId),
      'unblock-balance': API.UBLK_BAL(activeId),
    };
    const url=urlMap[activeAction]; if(!url) return;
    const btn=document.getElementById('amount-btn'); const spin=document.getElementById('amount-spin');
    btn.disabled=true; spin.style.display='block';
    try{
      const res=await fetch(url,{method:'POST',headers:H(),body:JSON.stringify({amount})});
      if(res.ok){ toast('Operation successful'); closeAmountModal(); closeDrawer(); loadAccounts(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; }
  }

  document.getElementById('amount-modal').addEventListener('click',function(e){ if(e.target===this) closeAmountModal(); });
  document.getElementById('search').addEventListener('keydown',e=>{ if(e.key==='Enter') loadAccounts(); });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadAccounts();