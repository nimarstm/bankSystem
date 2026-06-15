  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';

  const API = {
    LIST:      (q)  => `/accounts/admin/?${q}`,
    DETAIL:    (id) => `/accounts/admin/${id}/`,
    STATS:           `/accounts/admin/stats/`,
    OPEN:            `/accounts/admin/open/`,
    DEPOSIT:   (id) => `/accounts/${id}/deposit/`,
    WITHDRAW:  (id) => `/accounts/${id}/withdraw/`,
    FREEZE:    (id) => `/accounts/${id}/freeze/`,
    ACTIVATE:  (id) => `/accounts/${id}/activate/`,
    CLOSE:     (id) => `/accounts/${id}/close/`,
    BLK_BAL:   (id) => `/accounts/admin/${id}/block-balance/`,
    UBLK_BAL:  (id) => `/accounts/admin/${id}/unblock-balance/`,
    SET_PRI:   (id) => `/accounts/admin/${id}/set-primary/`,
    STATEMENT: (id) => `/api/transactions/admin/account/${id}/statement/`,
    LIMITS:    (id) => `/api/transactions/admin/account/${id}/limits/usage/`,
    RESET_LIM: (id) => `/api/transactions/admin/account/${id}/limits/reset/`,
    BANKS:           `/banks/`,
    LOGOUT:          `/api/v1/auth/logout/`,
  };
  const H = () => ({'Content-Type':'application/json','Authorization':`Bearer ${access}`});

  const adminName = localStorage.getItem('user_name')||'Admin';
  document.getElementById('sidebar-name').textContent = adminName;
  document.getElementById('sidebar-avatar').textContent = adminName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'AD';

  function toast(msg,type='success'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }
  function fmt(n){ return '€'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2}); }

  let currentPage=1, totalCount=0, activeId=null, activeAction=null;
  const PAGE=20;

  // ── STATS ─────────────────────────────────────────────────────────────────
  async function loadStats(){
    try{
      const res=await fetch(API.STATS,{headers:H()});
      const d=await res.json();
      document.getElementById('stat-total').textContent   = (d.total_accounts||0).toLocaleString();
      document.getElementById('stat-balance').textContent = fmt(d.total_balance);
      document.getElementById('stat-blocked').textContent = fmt(d.total_blocked_balance);
      document.getElementById('stat-closed').textContent  = (d.by_status?.CLOSED||0).toLocaleString();
    } catch {}
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  async function loadAccounts(page=1){
    currentPage=page;
    const p=new URLSearchParams();
    const s=document.getElementById('search').value.trim();
    const status=document.getElementById('filter-status').value;
    const type  =document.getElementById('filter-type').value;
    const curr  =document.getElementById('filter-currency').value;
    if(s)      p.set('search',s);
    if(status) p.set('status',status);
    if(type)   p.set('type',type);
    if(curr)   p.set('currency',curr);
    document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('pagination').style.display='none';
    try{
      const res=await fetch(API.LIST(p),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      totalCount=data.count||list.length;
      document.getElementById('table-count').textContent=`${totalCount} result${totalCount!==1?'s':''}`;
      if(!list.length){document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-wallet-off"></i><p>No accounts found.</p></div>';return;}
      const rows=list.map(a=>`
        <tr onclick="openDrawer(${a.id})">
          <td><span class="mono">${a.account_number}</span>${a.is_primary?'<span class="badge primary-tag" style="margin-left:6px;font-size:10px;">Primary</span>':''}</td>
          <td><span class="mono" style="font-size:11px;">${(a.iban||'—').slice(0,22)}…</span></td>
          <td>${a.customer?.fullname||'—'}</td>
          <td>${a.type} · ${a.currency}</td>
          <td style="font-weight:600;">${fmt(a.balance)}</td>
          <td><span class="badge ${a.status}">${a.status}</span></td>
          <td style="color:var(--text-3);font-size:12px;">${a.created_at?new Date(a.created_at).toLocaleDateString('en-DE'):'—'}</td>
        </tr>`).join('');
      document.getElementById('table-wrap').innerHTML=`
        <table><thead><tr><th>Account No.</th><th>IBAN</th><th>Customer</th><th>Type</th><th>Balance</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
      const pages=Math.ceil(totalCount/PAGE);
      if(pages>1){
        document.getElementById('pagination').style.display='flex';
        document.getElementById('pag-info').textContent=`Page ${currentPage} of ${pages}`;
        let b=`<button class="pag-btn" onclick="loadAccounts(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
        for(let i=1;i<=Math.min(pages,7);i++) b+=`<button class="pag-btn ${i===currentPage?'active':''}" onclick="loadAccounts(${i})">${i}</button>`;
        b+=`<button class="pag-btn" onclick="loadAccounts(${currentPage+1})" ${currentPage===pages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
        document.getElementById('pag-btns').innerHTML=b;
      }
    } catch { document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function resetFilters(){
    document.getElementById('search').value='';
    ['filter-status','filter-type','filter-currency'].forEach(id=>document.getElementById(id).value='');
    loadAccounts(1);
  }

  // ── DRAWER ────────────────────────────────────────────────────────────────
  async function openDrawer(id){
    activeId=id;
    document.getElementById('overlay').classList.add('show');
    document.getElementById('acct-drawer').classList.add('open');
    switchDrawerTab('detail');
    document.getElementById('drawer-detail-body').innerHTML='<div class="empty"><i class="ti ti-loader-2"></i>Loading…</div>';
    document.getElementById('drawer-footer').innerHTML='';
    try{
      const res=await fetch(API.DETAIL(id),{headers:H()});
      const a=await res.json();
      renderDetailPanel(a);
    } catch { toast('Failed to load account','error'); }
  }

  function switchDrawerTab(tab){
    ['detail','statement','limits'].forEach(t=>{
      document.getElementById('dtab-'+t).classList.toggle('active',t===tab);
      document.getElementById('dpanel-'+t).classList.toggle('active',t===tab);
    });
    if(tab==='statement' && !document.getElementById('drawer-statement-body').dataset.loaded) loadStatement();
    if(tab==='limits'    && !document.getElementById('drawer-limits-body').dataset.loaded)    loadLimits();
  }

  function renderDetailPanel(a){
    const avail=Number(a.balance||0)-Number(a.blocked_balance||0);
    document.getElementById('drawer-detail-body').innerHTML=`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
        <div style="width:50px;height:50px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--accent);"><i class="ti ti-wallet"></i></div>
        <div>
          <div style="font-size:16px;font-weight:700;font-family:monospace;">${a.account_number||'—'}</div>
          <div style="font-size:12.5px;color:var(--text-3);margin-top:2px;">${a.customer?.fullname||'—'} · ${a.type} · ${a.currency}</div>
          <div style="margin-top:5px;display:flex;gap:6px;">
            <span class="badge ${a.status}">${a.status}</span>
            ${a.is_primary?'<span class="badge primary-tag">Primary</span>':''}
          </div>
        </div>
      </div>
      <div class="balance-row">
        <div class="balance-box"><div class="balance-box-label">Balance</div><div class="balance-box-val">${fmt(a.balance)}</div></div>
        <div class="balance-box"><div class="balance-box-label">Available</div><div class="balance-box-val green">${fmt(avail)}</div></div>
        <div class="balance-box"><div class="balance-box-label">Blocked</div><div class="balance-box-val red">${fmt(a.blocked_balance)}</div></div>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><div class="detail-label">IBAN</div><div class="detail-val" style="font-size:11.5px;font-family:monospace;">${a.iban||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Bank</div><div class="detail-val">${a.bank?.name||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Customer Email</div><div class="detail-val">${a.customer?.email||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Created</div><div class="detail-val">${a.created_at?new Date(a.created_at).toLocaleDateString('en-DE'):'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Customer ID</div><div class="detail-val">${a.customer?.id||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Loan Blocked</div><div class="detail-val">${fmt(a.loan_blocked_balance)}</div></div>
      </div>`;
    buildFooter(a);
  }

  function buildFooter(a){
    const btns=[];
    btns.push(`<button class="btn success" onclick="openAmountModal('deposit','Deposit Funds')"><i class="ti ti-arrow-down-left"></i> Deposit</button>`);
    btns.push(`<button class="btn warning" onclick="openAmountModal('withdraw','Withdraw Funds')"><i class="ti ti-arrow-up-right"></i> Withdraw</button>`);
    if(a.status==='ACTIVE')  btns.push(`<button class="btn danger"  onclick="doAction('freeze')"><i class="ti ti-snowflake"></i> Freeze</button>`);
    if(a.status==='BLOCKED') btns.push(`<button class="btn success" onclick="doAction('activate')"><i class="ti ti-player-play"></i> Activate</button>`);
    if(a.status!=='CLOSED')  btns.push(`<button class="btn danger"  onclick="doAction('close')"><i class="ti ti-circle-x"></i> Close</button>`);
    btns.push(`<button class="btn ghost" onclick="openAmountModal('block-balance','Block Balance')"><i class="ti ti-lock"></i> Block Bal</button>`);
    btns.push(`<button class="btn ghost" onclick="openAmountModal('unblock-balance','Unblock Balance')"><i class="ti ti-lock-open"></i> Unblock Bal</button>`);
    if(!a.is_primary) btns.push(`<button class="btn ghost" onclick="doAction('set-primary')"><i class="ti ti-star"></i> Set Primary</button>`);
    document.getElementById('drawer-footer').innerHTML=btns.join('');
  }

  async function loadStatement(){
    const el=document.getElementById('drawer-statement-body');
    el.dataset.loaded='1';
    el.innerHTML='<div class="empty"><i class="ti ti-loader-2"></i>Loading…</div>';
    const creditTypes=['CASH_DEPOSIT','LOAN_DISBURSEMENT','REFUND'];
    try{
      const res=await fetch(API.STATEMENT(activeId),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||data.transactions||[]);
      if(!list.length){el.innerHTML='<div class="empty"><i class="ti ti-file-off"></i>No transactions.</div>';return;}
      el.innerHTML=list.slice(0,20).map(t=>{
        const isCredit=creditTypes.includes(t.type);
        const d=new Date(t.created_at);
        return `<div class="tx-item">
          <div class="tx-icon ${isCredit?'credit':'debit'}"><i class="ti ti-arrow-${isCredit?'down-left':'up-right'}"></i></div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:500;">${t.description||t.type?.replace(/_/g,' ')||'Tx'}</div>
            <div style="font-size:11.5px;color:var(--text-3);">${d.toLocaleDateString('en-DE')}</div>
          </div>
          <div style="font-size:14px;font-weight:700;color:${isCredit?'var(--success)':'var(--danger)'};">${isCredit?'+':'-'}${fmt(t.amount)}</div>
        </div>`;
      }).join('');
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load.</div>'; }
  }

  async function loadLimits(){
    const el=document.getElementById('drawer-limits-body');
    el.dataset.loaded='1';
    el.innerHTML='<div class="empty"><i class="ti ti-loader-2"></i>Loading…</div>';
    try{
      const res=await fetch(API.LIMITS(activeId),{headers:H()});
      const d=await res.json();
      const daily  =d.daily_usage  ||d.daily  ||{used:0,limit:0};
      const monthly=d.monthly_usage||d.monthly||{used:0,limit:0};
      function pct(u,l){ return l>0?Math.min(100,Math.round(u/l*100)):0; }
      function cls(p){ return p>=90?'over':p>=70?'warn':''; }
      el.innerHTML=`
        <div style="font-size:12px;font-weight:700;color:var(--text-3);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:1rem;">Transfer Limits Usage</div>
        <div class="limit-row"><div class="limit-label">Daily</div><div class="limit-bar-bg"><div class="limit-bar-fill ${cls(pct(daily.used,daily.limit))}" style="width:${pct(daily.used,daily.limit)}%"></div></div><div class="limit-val">${fmt(daily.used)} / ${fmt(daily.limit)}</div></div>
        <div class="limit-row"><div class="limit-label">Monthly</div><div class="limit-bar-bg"><div class="limit-bar-fill ${cls(pct(monthly.used,monthly.limit))}" style="width:${pct(monthly.used,monthly.limit)}%"></div></div><div class="limit-val">${fmt(monthly.used)} / ${fmt(monthly.limit)}</div></div>
        <div style="margin-top:1.25rem;">
          <button class="btn danger" onclick="resetLimits()"><i class="ti ti-refresh"></i> Reset Limits</button>
        </div>`;
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load limits.</div>'; }
  }

  async function resetLimits(){
    try{
      const res=await fetch(API.RESET_LIM(activeId),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('Limits reset'); document.getElementById('drawer-limits-body').dataset.loaded=''; loadLimits(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
  }

  function closeDrawer(){
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('acct-drawer').classList.remove('open');
    activeId=null;
    ['statement','limits'].forEach(t=>{ const el=document.getElementById('drawer-'+t+'-body'); if(el) el.dataset.loaded=''; });
  }

  async function doAction(action){
    const urlMap={ freeze:API.FREEZE(activeId), activate:API.ACTIVATE(activeId), close:API.CLOSE(activeId), 'set-primary':API.SET_PRI(activeId) };
    const msgMap={ freeze:'Account frozen', activate:'Account activated', close:'Account closed', 'set-primary':'Set as primary' };
    try{
      const res=await fetch(urlMap[action],{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast(msgMap[action]); closeDrawer(); loadAccounts(currentPage); loadStats(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
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
    const urlMap={ deposit:API.DEPOSIT(activeId), withdraw:API.WITHDRAW(activeId), 'block-balance':API.BLK_BAL(activeId), 'unblock-balance':API.UBLK_BAL(activeId) };
    const btn=document.getElementById('amount-btn'); const spin=document.getElementById('amount-spin');
    btn.disabled=true; spin.style.display='block';
    try{
      const res=await fetch(urlMap[activeAction],{method:'POST',headers:H(),body:JSON.stringify({amount})});
      if(res.ok){ toast('Operation successful'); closeAmountModal(); closeDrawer(); loadAccounts(currentPage); loadStats(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; }
  }

  // ── OPEN ACCOUNT MODAL ────────────────────────────────────────────────────
  async function openOpenAccountModal(){
    document.getElementById('open-account-modal').classList.add('show');
    try{
      const res=await fetch(API.BANKS);
      const data=await res.json();
      const banks=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('oa-bank').innerHTML=banks.filter(b=>b.status==='ACTIVE').map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    } catch { document.getElementById('oa-bank').innerHTML='<option value="">Failed to load banks</option>'; }
  }
  function closeOpenAccountModal(){ document.getElementById('open-account-modal').classList.remove('show'); }

  async function confirmOpenAccount(){
    const customerId=document.getElementById('oa-customer').value.trim();
    const bankId    =document.getElementById('oa-bank').value;
    const type      =document.getElementById('oa-type').value;
    const currency  =document.getElementById('oa-currency').value;
    if(!customerId){ toast('Enter a customer ID','error'); return; }
    if(!bankId){ toast('Select a bank','error'); return; }
    const btn=document.getElementById('oa-btn'); const spin=document.getElementById('oa-spin'); const txt=document.getElementById('oa-text');
    btn.disabled=true; spin.style.display='block'; txt.textContent='Opening…';
    try{
      const res=await fetch(API.OPEN,{method:'POST',headers:H(),body:JSON.stringify({customer:customerId,bank:bankId,type,currency})});
      const data=await res.json();
      if(res.ok){ toast('Account opened successfully'); closeOpenAccountModal(); loadAccounts(1); loadStats(); }
      else { toast(data.detail||data.message||'Failed to open account','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; txt.textContent='Open Account'; }
  }

  ['amount-modal','open-account-modal'].forEach(id=>{
    document.getElementById(id).addEventListener('click',function(e){ if(e.target===this) this.classList.remove('show'); });
  });
  document.getElementById('search').addEventListener('keydown',e=>{ if(e.key==='Enter') loadAccounts(1); });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadStats(); loadAccounts(1);