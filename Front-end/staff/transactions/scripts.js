  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';

  const API = {
    LIST:    (q)   => `/api/transactions/admin/?${q}`,
    DETAIL:  (id)  => `/api/transactions/admin/${id}/`,
    BY_REF:  (ref) => `/api/transactions/admin/ref/${ref}/`,
    LOGOUT:         `/api/v1/auth/logout/`,
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
  function fmt(n){ return '€'+Number(n||0).toFixed(2); }

  const creditTypes=['CASH_DEPOSIT','LOAN_DISBURSEMENT','REFUND'];
  const typeIcons={CARD_TO_CARD:'ti-credit-card',IBAN_TRANSFER:'ti-building-bank',INTERNAL_TRANSFER:'ti-arrows-right-left',CASH_DEPOSIT:'ti-arrow-down-left',CASH_WITHDRAW:'ti-arrow-up-right',LOAN_DISBURSEMENT:'ti-coin',INSTALLMENT_PAYMENT:'ti-receipt',REFUND:'ti-rotate-clockwise-2',LATE_FEE:'ti-alert-circle'};

  let currentPage=1, totalCount=0, activeId=null;
  const PAGE=20;

  // ── REFERENCE LOOKUP ──────────────────────────────────────────────────────
  async function lookupByRef(){
    const ref=document.getElementById('ref-input').value.trim();
    if(!ref){ toast('Enter a reference number','error'); return; }
    const el=document.getElementById('lookup-result');
    el.className='lookup-result show';
    el.innerHTML='<i class="ti ti-loader-2"></i> Looking up…';
    try{
      const res=await fetch(API.BY_REF(ref),{headers:H()});
      if(!res.ok){ el.innerHTML=`<span style="color:var(--danger);">No transaction found for reference <b>${ref}</b></span>`; return; }
      const t=await res.json();
      const isCredit=creditTypes.includes(t.type);
      el.innerHTML=`
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:9px;background:${isCredit?'var(--success-bg)':'var(--danger-bg)'};display:flex;align-items:center;justify-content:center;font-size:16px;color:${isCredit?'var(--success)':'var(--danger)'};">
            <i class="ti ${typeIcons[t.type]||'ti-arrows-right-left'}"></i>
          </div>
          <div style="flex:1;">
            <div style="font-size:13.5px;font-weight:600;">${(t.type||'').replace(/_/g,' ')} · ${t.customer_name}</div>
            <div style="font-size:12px;color:var(--text-3);font-family:monospace;">${t.reference_number}</div>
          </div>
          <div style="font-size:15px;font-weight:700;color:${isCredit?'var(--success)':'var(--danger)'};">${isCredit?'+':'-'}${fmt(t.amount)}</div>
          <button onclick="openDrawer('${t.id}')" style="height:30px;padding:0 12px;border-radius:var(--radius-sm);background:var(--accent);color:#fff;border:none;font-family:'Sora',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">View</button>
        </div>`;
    } catch { el.innerHTML='<span style="color:var(--danger);">Lookup failed. Try again.</span>'; }
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  async function loadTx(page=1){
    currentPage=page;
    const p=new URLSearchParams();
    const type  =document.getElementById('filter-type').value;
    const status=document.getElementById('filter-status').value;
    const from  =document.getElementById('filter-from').value;
    const to    =document.getElementById('filter-to').value;
    if(type)   p.set('type',type);
    if(status) p.set('status',status);
    if(from)   p.set('date_from',from);
    if(to)     p.set('date_to',to);
    document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('pagination').style.display='none';
    try{
      const res=await fetch(API.LIST(p),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      totalCount=data.count||list.length;
      document.getElementById('table-count').textContent=`${totalCount} result${totalCount!==1?'s':''}`;
      if(!list.length){document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-arrows-right-left"></i><p>No transactions found.</p></div>';return;}
      const rows=list.map(t=>{
        const isCredit=creditTypes.includes(t.type);
        const d=new Date(t.created_at);
        return `<tr onclick="openDrawer('${t.id}')">
          <td><div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:9px;background:${isCredit?'var(--success-bg)':'var(--danger-bg)'};display:flex;align-items:center;justify-content:center;font-size:16px;color:${isCredit?'var(--success)':'var(--danger)'};">
              <i class="ti ${typeIcons[t.type]||'ti-arrows-right-left'}"></i>
            </div>
            <div>
              <div style="font-size:13px;font-weight:500;">${(t.type||'').replace(/_/g,' ')}</div>
              <div class="mono" style="color:var(--text-3);">${t.reference_number||'—'}</div>
            </div>
          </div></td>
          <td>${t.customer_name}</td>
          <td><span class="tx-amount ${isCredit?'credit':'debit'}">${isCredit?'+':'-'}${fmt(t.amount)}</span></td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
          <td style="font-size:12px;color:var(--text-3);">${d.toLocaleDateString('en-DE')}<br>${d.toLocaleTimeString('en-DE',{hour:'2-digit',minute:'2-digit'})}</td>
        </tr>`;
      }).join('');
      document.getElementById('table-wrap').innerHTML=`
        <table><thead><tr><th>Transaction</th><th>Account Holder</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody></table>`;
      const pages=Math.ceil(totalCount/PAGE);
      if(pages>1){
        document.getElementById('pagination').style.display='flex';
        document.getElementById('pag-info').textContent=`Page ${currentPage} of ${pages}`;
        let b=`<button class="pag-btn" onclick="loadTx(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
        for(let i=1;i<=Math.min(pages,7);i++) b+=`<button class="pag-btn ${i===currentPage?'active':''}" onclick="loadTx(${i})">${i}</button>`;
        b+=`<button class="pag-btn" onclick="loadTx(${currentPage+1})" ${currentPage===pages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
        document.getElementById('pag-btns').innerHTML=b;
      }
    } catch { document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function resetFilters(){
    ['filter-from','filter-to'].forEach(id=>document.getElementById(id).value='');
    ['filter-type','filter-status'].forEach(id=>document.getElementById(id).value='');
    loadTx(1);
  }

  // ── DRAWER ────────────────────────────────────────────────────────────────
  async function openDrawer(id){
    activeId=id;
    document.getElementById('overlay').classList.add('show');
    document.getElementById('tx-drawer').classList.add('open');
    document.getElementById('drawer-body').innerHTML='<div style="text-align:center;padding:2rem;color:var(--text-3);"><i class="ti ti-loader-2" style="font-size:28px;display:block;margin-bottom:8px;"></i>Loading…</div>';
    document.getElementById('drawer-footer').innerHTML='';
    try{
      const res=await fetch(API.DETAIL(id),{headers:H()});
      const t=await res.json();
      renderDrawer(t);
    } catch { toast('Failed to load transaction','error'); }
  }

  function renderDrawer(t){
    const isCredit=creditTypes.includes(t.type);
    const d=new Date(t.created_at);
    document.getElementById('drawer-body').innerHTML=`
      <div style="text-align:center;padding:1.5rem 0 1.75rem;border-bottom:1px solid var(--border);margin-bottom:1.25rem;">
        <div style="width:56px;height:56px;border-radius:14px;background:${isCredit?'var(--success-bg)':'var(--danger-bg)'};display:flex;align-items:center;justify-content:center;font-size:26px;color:${isCredit?'var(--success)':'var(--danger)'};margin:0 auto 12px;">
          <i class="ti ${typeIcons[t.type]||'ti-arrows-right-left'}"></i>
        </div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px;">${(t.type||'').replace(/_/g,' ')}</div>
        <div style="font-family:'DM Serif Display',serif;font-size:36px;color:${isCredit?'var(--success)':'var(--danger)'};">${isCredit?'+':'-'}${fmt(t.amount)}</div>
        <div style="margin-top:8px;"><span class="badge ${t.status}">${t.status}</span></div>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><div class="detail-label">Reference</div><div class="detail-val" style="font-family:monospace;font-size:11px;">${t.reference_number||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Account Holder</div><div class="detail-val">${t.customer_name}</div></div>
        <div class="detail-cell"><div class="detail-label">Account No.</div><div class="detail-val" style="font-family:monospace;font-size:12px;">${t.account_number}</div></div>
        <div class="detail-cell"><div class="detail-label">Fee</div><div class="detail-val">€${Number(t.fee||0).toFixed(2)}</div></div>
        <div class="detail-cell"><div class="detail-label">Date</div><div class="detail-val">${d.toLocaleDateString('en-DE')}</div></div>
        <div class="detail-cell"><div class="detail-label">Time</div><div class="detail-val">${d.toLocaleTimeString('en-DE')}</div></div>
        <div class="detail-cell" style="grid-column:1/-1;"><div class="detail-label">Description</div><div class="detail-val">${t.description||'—'}</div></div>
        <div class="detail-cell" style="grid-column:1/-1;"><div class="detail-label">Transaction ID</div><div class="detail-val" style="font-family:monospace;font-size:11px;">${t.id}</div></div>
      </div>`;
  }

  function closeDrawer(){ document.getElementById('overlay').classList.remove('show'); document.getElementById('tx-drawer').classList.remove('open'); activeId=null; }


  document.getElementById('ref-input').addEventListener('keydown',e=>{ if(e.key==='Enter') lookupByRef(); });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadTx(1);
