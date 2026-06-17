  const access=localStorage.getItem('access_token');
  const refresh=localStorage.getItem('refresh_token');
  //if(!access) window.location.href='../../auth/auth.html';
  const role=localStorage.getItem('user_role')||'employee';
  const isManager=role==='manager';
  const API={ LIST:(q)=>`/api/transactions/admin/?${q}`, LOGOUT:'/api/v1/auth/logout/' };
  const H=()=>({'Content-Type':'application/json','Authorization':`Bearer ${access}`});

  const name=localStorage.getItem('user_name')||'Staff';
  document.getElementById('sidebar-name').textContent=name;
  document.getElementById('sidebar-avatar').textContent=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'ST';
  document.getElementById('sidebar-role').textContent=isManager?'Manager':'Employee';
  document.getElementById('role-label').textContent=isManager?'Manager':'Employee';
  document.getElementById('role-badge').className=`role-badge ${isManager?'manager':'employee'}`;
  if(isManager) document.getElementById('nav-loans').style.display='flex';

  const creditTypes=['CASH_DEPOSIT','LOAN_DISBURSEMENT','REFUND'];
  const typeIcons={CARD_TO_CARD:'ti-credit-card',IBAN_TRANSFER:'ti-building-bank',CASH_DEPOSIT:'ti-arrow-down-left',CASH_WITHDRAW:'ti-arrow-up-right',LOAN_DISBURSEMENT:'ti-coin',INSTALLMENT_PAYMENT:'ti-receipt',REFUND:'ti-rotate-clockwise-2'};

  let currentPage=1, totalCount=0;
  const PAGE=20;

  async function loadTx(page=1){
    currentPage=page;
    const p=new URLSearchParams();
    const ref=document.getElementById('search').value.trim();
    const type=document.getElementById('filter-type').value;
    const status=document.getElementById('filter-status').value;
    const from=document.getElementById('filter-from').value;
    const to=document.getElementById('filter-to').value;
    if(ref)    p.set('reference_number',ref);
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
        return `<tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:9px;background:${isCredit?'var(--success-bg)':'var(--danger-bg)'};display:flex;align-items:center;justify-content:center;font-size:16px;color:${isCredit?'var(--success)':'var(--danger)'};flex-shrink:0;">
                <i class="ti ${typeIcons[t.type]||'ti-arrows-right-left'}"></i>
              </div>
              <div>
                <div style="font-size:13px;font-weight:500;">${(t.type||'').replace(/_/g,' ')}</div>
                <div class="mono" style="color:var(--text-3);">${t.reference_number||'—'}</div>
              </div>
            </div>
          </td>
          <td>${t.account?.customer?.fullname||'—'}</td>
          <td><span class="tx-amount ${isCredit?'credit':'debit'}">${isCredit?'+':'-'}€${Number(t.amount||0).toFixed(2)}</span></td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
          <td style="font-size:12px;color:var(--text-3);">${d.toLocaleDateString('en-DE')}<br>${d.toLocaleTimeString('en-DE',{hour:'2-digit',minute:'2-digit'})}</td>
        </tr>`;
      }).join('');
      document.getElementById('table-wrap').innerHTML=`<table><thead><tr><th>Transaction</th><th>Account Holder</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
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
    ['search','filter-from','filter-to'].forEach(id=>document.getElementById(id).value='');
    ['filter-type','filter-status'].forEach(id=>document.getElementById(id).value='');
    loadTx(1);
  }
  document.getElementById('search').addEventListener('keydown',e=>{if(e.key==='Enter')loadTx(1);});
  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }
  loadTx(1);