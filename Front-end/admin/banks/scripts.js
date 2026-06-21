  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';

  const API = {
    LIST:    '/banks/',
    CREATE:  '/banks/create/',
    STATUS:  (id) => `/banks/${id}/status/`,
    DETAIL:  (id) => `/banks/${id}/`,
    BRANCHES:(id) => `/banks/${id}/branches/`,
    LOGOUT:  '/api/v1/auth/logout/',
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

  let banks=[], activeStatusId=null;

  // ── LOAD BANKS ────────────────────────────────────────────────────────────
  async function loadBanks(){
    try{
      const res=await fetch(API.LIST,{headers:H()});
      const data=await res.json();
      banks=Array.isArray(data)?data:(data.results||[]);
    } catch {
      banks=[
        {id:'bank-1',name:'EliraPay Bank',code:'EPB',iban_prefix:'DE',swift_code:'EPBKDE01',transfer_fee:'0.00',status:'ACTIVE',supports_instant_transfer:true,created_at:'2024-01-01T00:00:00Z'},
        {id:'bank-2',name:'Deutsche Finance',code:'DFB',iban_prefix:'DE',swift_code:'DFINDE22',transfer_fee:'1.50',status:'ACTIVE',supports_instant_transfer:true,created_at:'2024-03-15T00:00:00Z'},
        {id:'bank-3',name:'Euro Trust Bank',code:'ETB',iban_prefix:'EU',swift_code:'ETBKEU11',transfer_fee:'2.00',status:'MAINTENANCE',supports_instant_transfer:false,created_at:'2024-06-01T00:00:00Z'},
      ];
    }
    renderBanks();
  }

  function renderBanks(){
    const grid=document.getElementById('banks-grid');
    if(!banks.length){grid.innerHTML='<div class="empty-state"><i class="ti ti-building-bank"></i><p>No banks registered.</p></div>';return;}
    grid.innerHTML=banks.map((b,i)=>`
      <div class="bank-card" style="animation-delay:${i*0.05}s">
        <div class="bank-card-header">
          <div class="bank-icon">${b.code?.slice(0,2)||'B'}</div>
          <div style="flex:1;min-width:0;">
            <div class="bank-name">${b.name}</div>
            <div class="bank-code">${b.swift_code}</div>
          </div>
          <span class="badge ${b.status}">${b.status}</span>
        </div>
        <div class="bank-body">
          <div class="bank-detail-row"><span class="bank-detail-label">Bank Code</span><span class="bank-detail-val">${b.code}</span></div>
          <div class="bank-detail-row"><span class="bank-detail-label">IBAN Prefix</span><span class="bank-detail-val">${b.iban_prefix}</span></div>
          <div class="bank-detail-row"><span class="bank-detail-label">Transfer Fee</span><span class="bank-detail-val">€${Number(b.transfer_fee||0).toFixed(2)}</span></div>
          <div class="bank-detail-row"><span class="bank-detail-label">Instant Transfer</span><span class="bank-detail-val" style="color:${b.supports_instant_transfer?'var(--success)':'var(--danger)'};">${b.supports_instant_transfer?'✓ Supported':'✗ Not supported'}</span></div>
          <div class="bank-detail-row"><span class="bank-detail-label">Registered</span><span class="bank-detail-val">${b.created_at?new Date(b.created_at).toLocaleDateString('en-DE'):'—'}</span></div>
        </div>
        <div class="bank-footer">
          <button class="btn warning" onclick="openStatusModal('${b.id}','${b.status}')"><i class="ti ti-pencil"></i> Status</button>
        </div>
      </div>`).join('');
  }



  // ── CREATE BANK ───────────────────────────────────────────────────────────
  function openCreateModal(){ document.getElementById('create-modal').classList.add('show'); }
  function closeCreateModal(){ document.getElementById('create-modal').classList.remove('show'); }

  async function createBank(){
    const name    =document.getElementById('b-name').value.trim();
    const code    =document.getElementById('b-code').value.trim();
    const prefix  =document.getElementById('b-iban-prefix').value.trim();
    const swift   =document.getElementById('b-swift').value.trim();
    const fee     =document.getElementById('b-fee').value||'0';
    const status  =document.getElementById('b-status').value;
    const instant =document.getElementById('b-instant').checked;
    if(!name||!code||!prefix||!swift){ toast('Please fill all required fields','error'); return; }

    const btn=document.getElementById('create-btn'); const spin=document.getElementById('create-spin'); const icon=document.getElementById('create-icon'); const txt=document.getElementById('create-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Creating…';
    try{
      const res=await fetch(API.CREATE,{method:'POST',headers:H(),body:JSON.stringify({
        name,code,iban_prefix:prefix,swift_code:swift,transfer_fee:fee,status,supports_instant_transfer:instant
      })});
      const data=await res.json();
      if(res.ok){ toast('Bank created successfully'); closeCreateModal(); loadBanks(); }
      else { toast(data.detail||data.name?.[0]||'Failed to create bank','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Create Bank'; }
  }

  // ── UPDATE STATUS ─────────────────────────────────────────────────────────
  function openStatusModal(id, currentStatus){
    activeStatusId=id;
    document.getElementById('new-status').value=currentStatus;
    document.getElementById('status-modal').classList.add('show');
  }
  function closeStatusModal(){ document.getElementById('status-modal').classList.remove('show'); activeStatusId=null; }

  async function confirmStatusUpdate(){
    const status=document.getElementById('new-status').value;
    const btn=document.getElementById('status-btn'); const spin=document.getElementById('status-spin');
    btn.disabled=true; spin.style.display='block';
    try{
      const res=await fetch(API.STATUS(activeStatusId),{method:'PATCH',headers:H(),body:JSON.stringify({status})});
      if(res.ok){ toast(`Bank status updated to ${status}`); closeStatusModal(); loadBanks(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; }
  }

  ['create-modal','status-modal'].forEach(id=>{
    document.getElementById(id).addEventListener('click',function(e){ if(e.target===this) this.classList.remove('show'); });
  });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadBanks();