  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';

  const API = {
    USERS:    (q)  => `/api/v1/users/admin/?${q}`,
    USER:     (id) => `/api/v1/users/admin/${id}/`,
    PROFILE:  (id) => `/api/v1/users/admin/${id}/profile/`,
    DEVICES:  (id) => `/api/v1/users/admin/${id}/devices/`,
    DEL_DEV:  (id,did) => `/api/v1/users/admin/${id}/devices/${did}/`,
    SESSIONS: (id) => `/api/v1/auth/admin/users/${id}/sessions/`,
    REV_ALL:  (id) => `/api/v1/auth/admin/users/${id}/sessions/revoke-all/`,
    REV_SESS: (id) => `/api/v1/auth/admin/sessions/${id}/revoke/`,
    VERIFY:   (id) => `/api/v1/users/admin/${id}/verify/`,
    BLOCK:    (id) => `/api/v1/users/admin/${id}/block/`,
    UNBLOCK:  (id) => `/api/v1/users/admin/${id}/unblock/`,
    SUSPEND:  (id) => `/api/v1/users/admin/${id}/suspend/`,
    ACTIVATE: (id) => `/api/v1/users/admin/${id}/activate/`,
    ROLE:     (id) => `/api/v1/users/admin/${id}/change-role/`,
    RESET_PW: (id) => `/api/v1/users/admin/${id}/reset-password/`,
    RESET_FA: (id) => `/api/v1/users/admin/${id}/reset-attempts/`,
    LOGOUT:   '/api/v1/auth/logout/',
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

  const avatarColors=['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
  function avatarColor(name){ return avatarColors[(name||'').charCodeAt(0)%avatarColors.length]; }
  function initials(name){ return (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

  let allUsers=[], currentPage=1, totalCount=0, activeUserId=null;
  const PAGE=20;

  async function loadUsers(page=1){
    currentPage=page;
    const params=new URLSearchParams();
    const search=document.getElementById('search').value.trim();
    const status=document.getElementById('filter-status').value;
    const role  =document.getElementById('filter-role').value;
    const verif =document.getElementById('filter-verified').value;
    if(search) params.set('search',search);
    if(status) params.set('status',status);
    if(role)   params.set('primary_role',role);
    if(verif)  params.set('is_verified',verif);
    document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('pagination').style.display='none';
    try{
      const res=await fetch(API.USERS(params),{headers:H()});
      const data=await res.json();
      allUsers=Array.isArray(data)?data:(data.results||[]);
      totalCount=data.count||allUsers.length;
      renderTable();
    } catch {
      allUsers=[]; totalCount=0; renderTable();
    }
  }

  function renderTable(){
    document.getElementById('table-count').textContent=`${totalCount} result${totalCount!==1?'s':''}`;
    if(!allUsers.length){document.getElementById('table-wrap').innerHTML='<div class="empty-state"><i class="ti ti-users-off"></i><p>No users found.</p></div>';return;}
    const rows=allUsers.map(u=>`
      <tr onclick="openDrawer(${u.id})">
        <td><div class="user-cell">
          <div class="user-avatar-tbl" style="background:${avatarColor(u.fullname)}">${initials(u.fullname)}</div>
          <div><div style="font-size:13.5px;font-weight:600;">${u.fullname||'—'}</div><div style="font-size:12px;color:var(--text-3);">${u.phone||'—'}</div></div>
        </div></td>
        <td>${u.email||'—'}</td>
        <td><span class="badge ${u.status||'pending'}">${u.status||'—'}</span></td>
        <td><span class="badge ${u.primary_role||'customer'}">${u.primary_role||'—'}</span></td>
        <td>${u.is_verified?'<i class="ti ti-circle-check verified-icon"></i>':'<i class="ti ti-clock unverified-icon"></i>'}</td>
        <td style="color:var(--text-3);font-size:12px;">${u.date_joined?new Date(u.date_joined).toLocaleDateString('en-DE'):'—'}</td>
      </tr>`).join('');
    document.getElementById('table-wrap').innerHTML=`
      <table><thead><tr><th>User</th><th>Email</th><th>Status</th><th>Role</th><th>Verified</th><th>Joined</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
    const pages=Math.ceil(totalCount/PAGE);
    if(pages>1){
      document.getElementById('pagination').style.display='flex';
      document.getElementById('pag-info').textContent=`Page ${currentPage} of ${pages}`;
      let b=`<button class="pag-btn" onclick="loadUsers(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="ti ti-chevron-left"></i></button>`;
      for(let i=1;i<=Math.min(pages,7);i++) b+=`<button class="pag-btn ${i===currentPage?'active':''}" onclick="loadUsers(${i})">${i}</button>`;
      b+=`<button class="pag-btn" onclick="loadUsers(${currentPage+1})" ${currentPage===pages?'disabled':''}><i class="ti ti-chevron-right"></i></button>`;
      document.getElementById('pag-btns').innerHTML=b;
    }
  }

  function resetFilters(){
    ['search'].forEach(id=>document.getElementById(id).value='');
    ['filter-status','filter-role','filter-verified'].forEach(id=>document.getElementById(id).value='');
    loadUsers(1);
  }

  // ── DRAWER ────────────────────────────────────────────────────────────────
  async function openDrawer(id){
    activeUserId=id;
    document.getElementById('overlay').classList.add('show');
    document.getElementById('user-drawer').classList.add('open');
    // reset to info tab
    switchDrawerTab('info');
    document.getElementById('drawer-info-body').innerHTML='<div class="empty"><i class="ti ti-loader-2"></i>Loading…</div>';
    document.getElementById('drawer-footer').innerHTML='';
    try{
      const res=await fetch(API.USER(id),{headers:H()});
      const u=await res.json();
      renderInfoPanel(u);
    } catch { toast('Failed to load user','error'); }
  }

  function switchDrawerTab(tab){
    ['info','profile','sessions','devices'].forEach(t=>{
      document.getElementById('dtab-'+t).classList.toggle('active',t===tab);
      document.getElementById('dpanel-'+t).classList.toggle('active',t===tab);
    });
    if(tab==='profile'  && !document.getElementById('drawer-profile-body').dataset.loaded)  loadUserProfile();
    if(tab==='sessions' && !document.getElementById('drawer-sessions-body').dataset.loaded)  loadUserSessions();
    if(tab==='devices'  && !document.getElementById('drawer-devices-body').dataset.loaded)   loadUserDevices();
  }

  function renderInfoPanel(u){
    const col=avatarColor(u.fullname);
    document.getElementById('drawer-info-body').innerHTML=`
      <div class="profile-header">
        <div class="profile-avatar-lg" style="background:${col}">${initials(u.fullname)}</div>
        <div>
          <div class="profile-name">${u.fullname||'—'}</div>
          <div class="profile-sub">${u.phone||'—'}</div>
          <div class="profile-badges">
            <span class="badge ${u.status}">${u.status||'—'}</span>
            <span class="badge ${u.primary_role}">${u.primary_role||'—'}</span>
            ${u.is_verified?'<span class="badge active"><i class="ti ti-check"></i> Verified</span>':'<span class="badge pending"><i class="ti ti-clock"></i> Unverified</span>'}
          </div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><div class="detail-label">ID</div><div class="detail-val">${u.id}</div></div>
        <div class="detail-cell"><div class="detail-label">Email</div><div class="detail-val">${u.email||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">National Code</div><div class="detail-val">${u.national_code||'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Failed Logins</div><div class="detail-val">${u.failed_login_attempts??'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Last Login</div><div class="detail-val">${u.last_login?new Date(u.last_login).toLocaleString('en-DE'):'Never'}</div></div>
        <div class="detail-cell"><div class="detail-label">Joined</div><div class="detail-val">${u.date_joined?new Date(u.date_joined).toLocaleDateString('en-DE'):'—'}</div></div>
        <div class="detail-cell"><div class="detail-label">Is Staff</div><div class="detail-val">${u.is_staff?'Yes':'No'}</div></div>
        <div class="detail-cell"><div class="detail-label">Blocked Until</div><div class="detail-val">${u.blocked_until?new Date(u.blocked_until).toLocaleString('en-DE'):'—'}</div></div>
      </div>`;
    buildFooter(u);
  }

  function buildFooter(u){
    const btns=[];
    if(!u.is_verified) btns.push(`<button class="btn success" onclick="doAction('verify')"><i class="ti ti-circle-check"></i> Verify</button>`);
    if(u.status!=='blocked')   btns.push(`<button class="btn danger"  onclick="openBlockModal()"><i class="ti ti-lock"></i> Block</button>`);
    if(u.status==='blocked')   btns.push(`<button class="btn success" onclick="doAction('unblock')"><i class="ti ti-lock-open"></i> Unblock</button>`);
    if(u.status!=='suspended') btns.push(`<button class="btn warning" onclick="doAction('suspend')"><i class="ti ti-pause"></i> Suspend</button>`);
    if(['suspended','pending'].includes(u.status)) btns.push(`<button class="btn success" onclick="doAction('activate')"><i class="ti ti-player-play"></i> Activate</button>`);
    btns.push(`<button class="btn ghost" onclick="openRoleModal('${u.primary_role}')"><i class="ti ti-user-cog"></i> Role</button>`);
    btns.push(`<button class="btn ghost" onclick="doAction('reset-attempts')"><i class="ti ti-refresh"></i> Reset Attempts</button>`);
    btns.push(`<button class="btn ghost" onclick="openPwModal()"><i class="ti ti-key"></i> Reset PW</button>`);
    document.getElementById('drawer-footer').innerHTML=btns.join('');
  }

  async function loadUserProfile(){
    const el=document.getElementById('drawer-profile-body');
    el.dataset.loaded='1';
    try{
      const res=await fetch(API.PROFILE(activeUserId),{headers:H()});
      const p=await res.json();
      el.innerHTML=`
        <div class="detail-grid">
          <div class="detail-cell"><div class="detail-label">Address</div><div class="detail-val">${p.address||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">City</div><div class="detail-val">${p.city||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Country</div><div class="detail-val">${p.country||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Postal Code</div><div class="detail-val">${p.postal_code||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Date of Birth</div><div class="detail-val">${p.date_of_birth||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Gender</div><div class="detail-val">${p.gender||'—'}</div></div>
        </div>`;
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>No profile data.</div>'; }
  }

  async function loadUserSessions(){
    const el=document.getElementById('drawer-sessions-body');
    el.dataset.loaded='1';
    try{
      const res=await fetch(API.SESSIONS(activeUserId),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      if(!list.length){el.innerHTML='<div class="empty"><i class="ti ti-devices-off"></i>No active sessions.</div>';return;}
      el.innerHTML=list.map(s=>`
        <div class="sess-item">
          <div class="sess-icon"><i class="ti ti-${s.device_type==='mobile'?'device-mobile':'browser'}"></i></div>
          <div style="flex:1;">
            <div class="sess-name">${s.user_agent||'Unknown device'}</div>
            <div class="sess-meta">${s.ip_address||'—'} · ${s.created_at?new Date(s.created_at).toLocaleDateString('en-DE'):'—'}</div>
          </div>
          <button class="revoke-sm" onclick="revokeSession(${s.id},this)">Revoke</button>
        </div>`).join('');
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load.</div>'; }
  }

  async function revokeSession(id,btn){
    btn.disabled=true; btn.textContent='Revoking…';
    try{
      const res=await fetch(API.REV_SESS(id),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('Session revoked'); document.getElementById('drawer-sessions-body').dataset.loaded=''; loadUserSessions(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
    finally{ btn.disabled=false; btn.textContent='Revoke'; }
  }

  async function revokeAllUserSessions(){
    if(!confirm('Revoke all sessions for this user?')) return;
    try{
      const res=await fetch(API.REV_ALL(activeUserId),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('All sessions revoked'); document.getElementById('drawer-sessions-body').dataset.loaded=''; loadUserSessions(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
  }

  async function loadUserDevices(){
    const el=document.getElementById('drawer-devices-body');
    el.dataset.loaded='1';
    try{
      const res=await fetch(API.DEVICES(activeUserId),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      if(!list.length){el.innerHTML='<div class="empty"><i class="ti ti-device-mobile-off"></i>No devices.</div>';return;}
      el.innerHTML=list.map(d=>`
        <div class="sess-item">
          <div class="sess-icon"><i class="ti ti-device-mobile"></i></div>
          <div style="flex:1;">
            <div class="sess-name">${d.device_name||d.name||'Unknown device'}</div>
            <div class="sess-meta">${d.device_type||'—'} · ${d.created_at?new Date(d.created_at).toLocaleDateString('en-DE'):'—'}</div>
          </div>
          <button class="revoke-sm" onclick="deleteDevice(${d.id},this)"><i class="ti ti-trash"></i> Remove</button>
        </div>`).join('');
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load.</div>'; }
  }

  async function deleteDevice(deviceId,btn){
    btn.disabled=true;
    try{
      const res=await fetch(API.DEL_DEV(activeUserId,deviceId),{method:'DELETE',headers:H()});
      if(res.ok||res.status===204){ toast('Device removed'); document.getElementById('drawer-devices-body').dataset.loaded=''; loadUserDevices(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
    finally{ btn.disabled=false; }
  }

  function closeDrawer(){
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('user-drawer').classList.remove('open');
    activeUserId=null;
    ['profile','sessions','devices'].forEach(t=>{ const el=document.getElementById('drawer-'+t+'-body'); if(el) el.dataset.loaded=''; });
  }

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  async function doAction(action){
    if(!activeUserId) return;
    const map={
      verify:         {url:API.VERIFY(activeUserId),  msg:'User verified'},
      unblock:        {url:API.UNBLOCK(activeUserId), msg:'User unblocked'},
      suspend:        {url:API.SUSPEND(activeUserId), msg:'User suspended'},
      activate:       {url:API.ACTIVATE(activeUserId),msg:'User activated'},
      'reset-attempts':{url:API.RESET_FA(activeUserId),msg:'Failed attempts reset'},
    };
    const a=map[action]; if(!a) return;
    try{
      const res=await fetch(a.url,{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast(a.msg); closeDrawer(); loadUsers(currentPage); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
  }

  function openBlockModal(){ document.getElementById('block-modal').classList.add('show'); }
  function closeBlockModal(){ document.getElementById('block-modal').classList.remove('show'); }
  async function confirmBlock(){
    const btn=document.getElementById('block-btn'); const spin=document.getElementById('block-spin');
    btn.disabled=true; spin.style.display='block';
    const reason=document.getElementById('block-reason').value;
    const until =document.getElementById('block-until').value;
    const body={}; if(reason) body.reason=reason; if(until) body.blocked_until=new Date(until).toISOString();
    try{
      const res=await fetch(API.BLOCK(activeUserId),{method:'POST',headers:H(),body:JSON.stringify(body)});
      if(res.ok){ toast('User blocked'); closeBlockModal(); closeDrawer(); loadUsers(currentPage); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally{ btn.disabled=false; spin.style.display='none'; }
  }

  function openPwModal(){ document.getElementById('pw-modal').classList.add('show'); }
  function closePwModal(){ document.getElementById('pw-modal').classList.remove('show'); }
  async function confirmResetPw(){
    const pw=document.getElementById('new-password').value;
    if(!pw||pw.length<8){ toast('Password must be at least 8 characters','error'); return; }
    const btn=document.getElementById('pw-btn'); const spin=document.getElementById('pw-spin');
    btn.disabled=true; spin.style.display='block';
    try{
      const res=await fetch(API.RESET_PW(activeUserId),{method:'POST',headers:H(),body:JSON.stringify({new_password:pw})});
      if(res.ok){ toast('Password reset'); closePwModal(); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally{ btn.disabled=false; spin.style.display='none'; document.getElementById('new-password').value=''; }
  }

  function openRoleModal(current){ document.getElementById('new-role').value=current; document.getElementById('role-modal').classList.add('show'); }
  function closeRoleModal(){ document.getElementById('role-modal').classList.remove('show'); }
  async function confirmChangeRole(){
    const role=document.getElementById('new-role').value;
    const btn=document.getElementById('role-btn'); const spin=document.getElementById('role-spin');
    btn.disabled=true; spin.style.display='block';
    try{
      const res=await fetch(API.ROLE(activeUserId),{method:'POST',headers:H(),body:JSON.stringify({primary_role:role})});
      if(res.ok){ toast(`Role changed to ${role}`); closeRoleModal(); closeDrawer(); loadUsers(currentPage); }
      else { const d=await res.json(); toast(d.detail||'Failed','error'); }
    } catch { toast('Network error','error'); }
    finally{ btn.disabled=false; spin.style.display='none'; }
  }

  ['block-modal','pw-modal','role-modal','add-user-modal'].forEach(id=>{
    document.getElementById(id).addEventListener('click',function(e){ if(e.target===this) this.classList.remove('show'); });
  });
  document.getElementById('search').addEventListener('keydown',e=>{ if(e.key==='Enter') loadUsers(1); });

  function fe(id, message){
    const el = document.getElementById(id);
    if(!el) return;
    el.textContent = message;
    if(message){
      el.style.display = 'block';
      el.style.color = 'var(--danger)';
      el.style.fontSize = '12px';
      el.style.marginTop = '4px';
    } else{
      el.style.display = 'none';
    }
  }

  // ── ADD USER ──────────────────────────────────────────────────────────────
  function openAddUserModal(){
    ['au-fullname','au-phone','au-email','au-national-code','au-password'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('au-role').value='customer';
    ['err-au-fullname','err-au-phone','err-au-email','err-au-national-code','err-au-password'].forEach(id=>fe(id,''));
    document.getElementById('add-user-error').style.display='none';
    document.getElementById('add-user-modal').classList.add('show');
    setTimeout(()=>document.getElementById('au-fullname').focus(),100);
  }

  function closeAddUserModal(){ document.getElementById('add-user-modal').classList.remove('show'); }

  async function confirmAddUser(){
    ['err-au-fullname','err-au-phone','err-au-email','err-au-national-code','err-au-password'].forEach(id=>fe(id,''));
    document.getElementById('add-user-error').style.display='none';

    const fullname     = document.getElementById('au-fullname').value.trim();
    const phone        = document.getElementById('au-phone').value.trim();
    const email        = document.getElementById('au-email').value.trim();
    const nationalCode = document.getElementById('au-national-code').value.trim();
    const password     = document.getElementById('au-password').value;
    const role         = document.getElementById('au-role').value;

    let ok=true;
    if(fullname.length<3)                         { fe('err-au-fullname','Full name must be at least 3 characters.'); ok=false; }
    if(!/^\+?[\d\s\-]{7,15}$/.test(phone))       { fe('err-au-phone','Enter a valid phone number.'); ok=false; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ fe('err-au-email','Enter a valid email address.'); ok=false; }
    if(!/^\d{10}$/.test(nationalCode))            { fe('err-au-national-code','Must be exactly 10 digits.'); ok=false; }
    if(password.length<8)                         { fe('err-au-password','Password must be at least 8 characters.'); ok=false; }
    if(!ok) return;

    const btn=document.getElementById('add-user-btn');
    const spin=document.getElementById('add-user-spin');
    const icon=document.getElementById('add-user-icon');
    const txt=document.getElementById('add-user-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Creating…';

    try{
      // Step 1: Register the user
      const res=await fetch('/api/v1/users/register/',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fullname,phone,email,national_code:nationalCode,password}),
      });
      const data=await res.json();

      if(!res.ok){
        // Map backend field errors to the correct input
        const fieldMap={
          phone:'err-au-phone',
          email:'err-au-email',
          national_code:'err-au-national-code',
          fullname:'err-au-fullname',
          password:'err-au-password',
        };
        let handled=false;
        Object.entries(fieldMap).forEach(([key,errId])=>{
          if(data[key]){ fe(errId,Array.isArray(data[key])?data[key][0]:data[key]); handled=true; }
        });
        if(!handled){
          document.getElementById('add-user-error-text').textContent=data.detail||data.message||'Registration failed.';
          document.getElementById('add-user-error').style.display='flex';
        }
        return;
      }

      // Step 2: Change role if not customer
      const userId=data.id||data.user_id;
      if(role!=='customer'&&userId){
        try{
          await fetch(API.ROLE(userId),{
            method:'POST',headers:H(),
            body:JSON.stringify({primary_role:role}),
          });
        } catch{ /* non-critical — user created, role change failed */ }
      }

      toast(`User "${fullname}" created successfully!`);
      closeAddUserModal();
      loadUsers(1);

    } catch {
      document.getElementById('add-user-error-text').textContent='Network error. Please try again.';
      document.getElementById('add-user-error').style.display='flex';
    } finally {
      btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Create User';
    }
  }

  // Enter key in add user modal
  document.getElementById('au-password').addEventListener('keydown',e=>{ if(e.key==='Enter') confirmAddUser(); });

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadUsers(1);