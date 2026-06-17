  const access=localStorage.getItem('access_token');
  const refresh=localStorage.getItem('refresh_token');
  //if(!access) window.location.href='/auth.html';
  // Redirect if not manager
  //if(localStorage.getItem('user_role')!=='manager') window.location.href='/staff-dashboard.html';

  const API={
    PENDING:  '/loans/admin/requests/pending/',
    ALL:      '/loans/admin/requests/',
    DETAIL:   (id)=>`/loans/admin/requests/${id}/`,
    EVALUATE: (id)=>`/loans/admin/requests/${id}/evaluate/`,
    APPROVE:  (id)=>`/loans/admin/requests/${id}/approve/`,
    REJECT:   (id)=>`/loans/admin/requests/${id}/reject/`,
    LOGOUT:   '/api/v1/auth/logout/',
  };
  const H=()=>({'Content-Type':'application/json','Authorization':`Bearer ${access}`});

  const name=localStorage.getItem('user_name')||'Manager';
  document.getElementById('sidebar-name').textContent=name;
  document.getElementById('sidebar-avatar').textContent=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'MG';

  function toast(msg,type='success'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }

  const typeLabel={HOME:'Home Loan',CAR:'Car Loan',BUSINESS:'Business Loan',PERSONAL:'Personal Loan'};
  const typeIcon={HOME:'ti-home',CAR:'ti-car',BUSINESS:'ti-briefcase',PERSONAL:'ti-user'};

  function riskBar(score){
    const pct=Math.min(100,score||0);
    const cls=pct<40?'risk-low':pct<70?'risk-med':'risk-high';
    return `<div class="risk-bar"><div class="risk-bg"><div class="risk-fill ${cls}" style="width:${pct}%"></div></div><span style="font-size:12px;font-weight:700;">${score||0}</span></div>`;
  }

  function reqRows(list,wrap,cntEl,lbl){
    document.getElementById(cntEl).textContent=list.length;
    document.getElementById(lbl).textContent=`${list.length} request${list.length!==1?'s':''}`;
    document.getElementById('pending-badge').textContent=document.getElementById('cnt-pending').textContent;
    if(!list.length){document.getElementById(wrap).innerHTML='<div class="empty-state"><i class="ti ti-coin-off"></i><p>No requests found.</p></div>';return;}
    document.getElementById(wrap).innerHTML=`
      <table>
        <thead><tr><th>Customer</th><th>Type</th><th>Amount</th><th>Duration</th><th>Risk</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${list.map(r=>`
          <tr onclick="openDrawer('${r.id}')">
            <td>${r.customer?.fullname||'—'}</td>
            <td><span style="font-size:12px;font-weight:600;">${(r.loan_type||'').replace(/_/g,' ')}</span></td>
            <td style="font-weight:600;">€${Number(r.amount||0).toLocaleString()}</td>
            <td>${r.duration_months}mo</td>
            <td>${riskBar(r.risk_score)}</td>
            <td><span class="badge ${r.status}">${r.status?.replace('_',' ')||'—'}</span></td>
            <td style="font-size:12px;color:var(--text-3);">${r.created_at?new Date(r.created_at).toLocaleDateString('en-DE'):'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  const tabs=['pending','all'];
  function switchTab(tab){
    tabs.forEach(t=>{document.getElementById('tab-'+t).classList.toggle('active',t===tab);document.getElementById('panel-'+t).classList.toggle('active',t===tab);});
    if(tab==='pending') loadPending();
    if(tab==='all')     loadAll();
  }

  async function loadPending(){
    document.getElementById('pending-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    try{
      const res=await fetch(API.PENDING,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      reqRows(list,'pending-wrap','cnt-pending','cnt-pending-lbl');
    } catch { document.getElementById('pending-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  async function loadAll(){
    document.getElementById('all-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    try{
      const res=await fetch(API.ALL,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      reqRows(list,'all-wrap','cnt-all','cnt-all-lbl');
    } catch { document.getElementById('all-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  let activeId=null;
  async function openDrawer(id){
    activeId=id;
    document.getElementById('overlay').classList.add('show');
    document.getElementById('loan-drawer').classList.add('open');
    document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('drawer-footer').innerHTML='';
    try{
      const res=await fetch(API.DETAIL(id),{headers:H()});
      const r=await res.json();
      renderDrawer(r);
    } catch { document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function renderDrawer(r){
    document.getElementById('drawer-body').innerHTML=`
      <div style="margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:600;">${typeLabel[r.loan_type]||'Loan'}</span>
          <span class="badge ${r.status}">${r.status?.replace('_',' ')||'—'}</span>
        </div>
        <div style="font-family:'DM Serif Display',serif;font-size:30px;color:var(--navy);">€${Number(r.amount||0).toLocaleString()}</div>
        <div style="font-size:13px;color:var(--text-3);margin-top:4px;">${r.duration_months} months · ${r.customer?.fullname||'—'}</div>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><div class="detail-label">Monthly Income</div><div class="detail-val">€${Number(r.monthly_income||0).toLocaleString()}</div></div>
        <div class="detail-cell"><div class="detail-label">Existing Debt</div><div class="detail-val">€${Number(r.existing_debt||0).toLocaleString()}</div></div>
        <div class="detail-cell"><div class="detail-label">Risk Score</div><div class="detail-val">${riskBar(r.risk_score)}</div></div>
        <div class="detail-cell"><div class="detail-label">Submitted</div><div class="detail-val">${r.created_at?new Date(r.created_at).toLocaleDateString('en-DE'):'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Customer ID</div><div class="detail-val">${r.customer?.id||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Manager Note</div><div class="detail-val">${r.manager_note||'—'}</div></div>
      </div>`;
    const btns=[];
    btns.push(`<button class="btn warning" onclick="doEvaluate()"><i class="ti ti-calculator"></i> Evaluate</button>`);
    if(['PENDING','UNDER_REVIEW'].includes(r.status)){
      btns.push(`<button class="btn success" onclick="doApprove()"><i class="ti ti-circle-check"></i> Approve</button>`);
      btns.push(`<button class="btn danger"  onclick="openRejectModal()"><i class="ti ti-circle-x"></i> Reject</button>`);
    }
    document.getElementById('drawer-footer').innerHTML=btns.join('');
  }

  function closeDrawer(){ document.getElementById('overlay').classList.remove('show'); document.getElementById('loan-drawer').classList.remove('open'); activeId=null; }

  async function doEvaluate(){
    try{
      const res=await fetch(API.EVALUATE(activeId),{method:'POST',headers:H(),body:'{}'});
      const d=await res.json();
      toast(`Evaluated: Risk score ${d.risk_score} · Status: ${d.status}`);
      closeDrawer(); loadPending();
    } catch { toast('Evaluation failed','error'); }
  }

  async function doApprove(){
    try{
      const res=await fetch(API.APPROVE(activeId),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('Loan approved!'); closeDrawer(); loadPending(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
  }

  function openRejectModal(){ document.getElementById('reject-modal').classList.add('show'); }
  function closeRejectModal(){ document.getElementById('reject-modal').classList.remove('show'); }

  async function confirmReject(){
    const reason=document.getElementById('reject-reason').value.trim();
    if(!reason){ toast('Please enter a reason','error'); return; }
    const btn=document.getElementById('reject-btn'); const spin=document.getElementById('reject-spin');
    btn.disabled=true; spin.style.display='block';
    try{
      const res=await fetch(API.REJECT(activeId),{method:'POST',headers:H(),body:JSON.stringify({reason})});
      if(res.ok){ toast('Request rejected'); closeRejectModal(); closeDrawer(); loadPending(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; document.getElementById('reject-reason').value=''; }
  }

  document.getElementById('reject-modal').addEventListener('click',function(e){ if(e.target===this) closeRejectModal(); });
  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='/auth.html';
  }
  loadPending();
