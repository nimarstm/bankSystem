    const API = {
    MY_ACCOUNTS: '/accounts/my/',
    DETAIL:      (id) => `/accounts/${id}/`,
    SET_PRIMARY: (id) => `/accounts/${id}/set-primary/`,
    TX_LIMITS:   (id) => `/api/transactions/limits/${id}/usage/`,
    BANKS:       '/',
    OPEN_ACCOUNT:'/accounts/open/',
    STATEMENT:   (id) => `/api/transactions/statement/${id}/`,
    LOGOUT:      '/api/v1/auth/logout/',
  };

  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';
  const H = () => ({'Content-Type':'application/json','Authorization':`Bearer ${access}`});

  const userName = localStorage.getItem('user_name')||'';
  document.getElementById('sidebar-name').textContent = userName||'My Account';
  document.getElementById('sidebar-avatar').textContent = userName?userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'U';

  function toast(msg,type='success'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }
  function fmt(n){ return '€'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2}); }

  let accounts=[];

  // ── LOAD ACCOUNTS ─────────────────────────────────────────────────────────
  async function loadAccounts(){
    try{
      const res=await fetch(API.MY_ACCOUNTS,{headers:H()});
      const data=await res.json();
      accounts=Array.isArray(data)?data:(data.results||[]);
    } catch { accounts=[]; }

    const grid=document.getElementById('accounts-grid');
    if(!accounts.length){
      grid.innerHTML=`<div class="empty-state">
        <i class="ti ti-wallet-off"></i>
        <p>You don't have any accounts yet.</p>
        <button class="btn btn-primary" onclick="openCreateModal()" style="margin:0 auto;">
          <i class="ti ti-plus"></i> Open your first account
        </button>
      </div>`;
      return;
    }

    // Store primary account id for transfers
    const primary=accounts.find(a=>a.is_primary)||accounts[0];
    if(primary){
      localStorage.setItem('account_id',primary.id);
      localStorage.setItem('account_number',primary.account_number||'');
    }

    grid.innerHTML=accounts.map((a,i)=>`
      <div class="account-card ${a.is_primary?'primary-card':''}" style="animation-delay:${i*0.06}s">
        <div class="account-visual">
          <div class="account-visual-top">
            <div>
              <div class="account-type-lbl">${a.type} Account</div>
              <div class="account-bank"><i class="ti ti-building-bank"></i>${a.bank?.name||'—'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge ${a.status}">${a.status}</span>
              ${a.is_primary?'<i class="ti ti-star-filled primary-star" title="Primary account"></i>':''}
            </div>
          </div>
          <div class="account-balance"><span class="account-balance-currency">${a.currency}</span>${Number(a.balance||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
          <div class="account-number-lbl">${a.account_number||'—'}</div>
        </div>
        <div class="account-body">
          <div class="account-stats">
            <div>
              <div class="account-stat-label">Available</div>
              <div class="account-stat-val green">${fmt(Number(a.balance||0)-Number(a.blocked_balance||0))}</div>
            </div>
            <div>
              <div class="account-stat-label">Blocked</div>
              <div class="account-stat-val red">${fmt(a.blocked_balance)}</div>
            </div>
          </div>
          <div class="iban-row">
            <i class="ti ti-building-bank" style="color:var(--text-3);font-size:15px;flex-shrink:0;"></i>
            <span id="iban-${a.id}">${a.iban||'—'}</span>
            <button class="copy-btn" onclick="copyIban('${a.iban||''}','iban-${a.id}')" title="Copy IBAN"><i class="ti ti-copy"></i></button>
          </div>
          <div class="limits-section" id="limits-${a.id}">
            <div style="font-size:11px;color:var(--text-3);">Loading usage…</div>
          </div>
        </div>
        <div class="account-footer">
          ${!a.is_primary&&a.status==='ACTIVE'?`<button class="acct-btn success" onclick="setPrimary(${a.id})"><i class="ti ti-star"></i> Set Primary</button>`:''}
          <a class="acct-btn ghost" href="statement.html" onclick="localStorage.setItem('account_id','${a.id}')"><i class="ti ti-file-description"></i> Statement</a>
          <a class="acct-btn ghost" href="transfer.html"  onclick="localStorage.setItem('account_id','${a.id}');localStorage.setItem('account_number','${a.account_number||''}')"><i class="ti ti-arrows-right-left"></i> Transfer</a>
        </div>
      </div>`).join('');

    // Load limits for each account in background
    accounts.forEach(a=>loadLimits(a.id));
  }

  // ── LOAD LIMITS ───────────────────────────────────────────────────────────
  async function loadLimits(accountId){
    const el=document.getElementById(`limits-${accountId}`);
    if(!el) return;
    try{
      const res=await fetch(API.TX_LIMITS(accountId),{headers:H()});
      if(!res.ok){ el.innerHTML=''; return; }
      const d=await res.json();
      const daily  = d.daily_usage  ||d.daily  ||{used:0,limit:0};
      const monthly= d.monthly_usage||d.monthly||{used:0,limit:0};

      function pct(used,limit){ return limit>0?Math.min(100,Math.round((used/limit)*100)):0; }
      function cls(p){ return p>=90?'over':p>=70?'warn':''; }

      el.innerHTML=`
        <div style="font-size:11px;font-weight:700;color:var(--text-3);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Transfer Limits</div>
        <div class="limit-row">
          <div class="limit-label">Daily</div>
          <div class="limit-bar-bg"><div class="limit-bar-fill ${cls(pct(daily.used,daily.limit))}" style="width:${pct(daily.used,daily.limit)}%"></div></div>
          <div class="limit-val">${fmt(daily.used)} / ${fmt(daily.limit)}</div>
        </div>
        <div class="limit-row">
          <div class="limit-label">Monthly</div>
          <div class="limit-bar-bg"><div class="limit-bar-fill ${cls(pct(monthly.used,monthly.limit))}" style="width:${pct(monthly.used,monthly.limit)}%"></div></div>
          <div class="limit-val">${fmt(monthly.used)} / ${fmt(monthly.limit)}</div>
        </div>`;
    } catch { el.innerHTML=''; }
  }

  // ── SET PRIMARY ───────────────────────────────────────────────────────────
  async function setPrimary(id){
    try{
      const res=await fetch(API.SET_PRIMARY(id),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('Primary account updated'); loadAccounts(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
  }

  // ── COPY IBAN ─────────────────────────────────────────────────────────────
  function copyIban(iban,elId){
    if(!iban||iban==='—') return;
    navigator.clipboard.writeText(iban.replace(/\s/g,'')).then(()=>{
      const el=document.getElementById(elId);
      const orig=el.textContent;
      el.textContent='Copied!';
      el.style.color='var(--success)';
      setTimeout(()=>{ el.textContent=orig; el.style.color=''; },1500);
    }).catch(()=> toast('Copy failed','error'));
  }

  // ── OPEN ACCOUNT MODAL ────────────────────────────────────────────────────
  async function openCreateModal(){
    document.getElementById('create-modal').classList.add('show');
    // Load banks
    try{
      const res=await fetch(API.BANKS);
      const data=await res.json();
      const banks=Array.isArray(data)?data:(data.results||[]);
      const sel=document.getElementById('m-bank');
      if(banks.length){
        sel.innerHTML=banks.filter(b=>b.status==='ACTIVE').map(b=>`<option value="${b.id}">${b.name} (${b.code})</option>`).join('');
      } else {
        sel.innerHTML='<option value="">No active banks available</option>';
      }
    } catch { document.getElementById('m-bank').innerHTML='<option value="">Failed to load banks</option>'; }
  }
  function closeCreateModal(){ document.getElementById('create-modal').classList.remove('show'); }

  async function createAccount(){
    const bankId  =document.getElementById('m-bank').value;
    const type    =document.getElementById('m-type').value;
    const currency=document.getElementById('m-currency').value;
    if(!bankId){ toast('Please select a bank','error'); return; }

    const btn=document.getElementById('create-btn'); const spin=document.getElementById('create-spin'); const icon=document.getElementById('create-icon'); const txt=document.getElementById('create-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Opening…';

    try{
      const res=await fetch(API.OPEN_ACCOUNT,{method:'POST',headers:H(),body:JSON.stringify({bank:bankId,type,currency})});
      const data=await res.json();
      if(res.ok){ toast('Account opened successfully!'); closeCreateModal(); loadAccounts(); }
      else { toast(data.detail||data.message||'Failed to open account','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Open Account'; }
  }

  document.getElementById('create-modal').addEventListener('click',function(e){ if(e.target===this) closeCreateModal(); });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadAccounts();
