    const API = {
    ME:             '/api/v1/users/me/',
    PROFILE:        '/api/v1/users/me/profile/',
    CHANGE_PW:      '/api/v1/users/me/change-password/',
    SESSIONS:       '/api/v1/auth/sessions/my/',
    REVOKE_SESSION: (id) => `/api/v1/auth/sessions/my/${id}/revoke/`,
    REVOKE_OTHERS:  '/api/v1/auth/sessions/revoke-others/',
    DEVICES:        '/api/v1/users/me/devices/',
    DELETE_DEVICE:  (id) => `/api/v1/users/me/devices/${id}/`,
    LOGOUT:         '/api/v1/auth/logout/',
  };

  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';
  const H = () => ({'Content-Type':'application/json','Authorization':`Bearer ${access}`});

  const userName = localStorage.getItem('user_name')||'';
  document.getElementById('sidebar-name').textContent = userName||'My Account';
  const initials = userName ? userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : 'U';
  document.getElementById('sidebar-avatar').textContent = initials;

  function toast(msg,type='success'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }
  function togglePw(id,btn){
    const inp=document.getElementById(id); const isText=inp.type==='text';
    inp.type=isText?'password':'text';
    btn.querySelector('i').className=isText?'ti ti-eye':'ti ti-eye-off';
  }
  function fe(id,msg){ const el=document.getElementById(id); if(msg){el.textContent=msg;el.classList.add('show');}else el.classList.remove('show'); }
  function showMsg(id,show){ document.getElementById(id).classList.toggle('show',show); }

  const tabs=['profile','security','sessions','devices'];
  function switchTab(tab){
    tabs.forEach(t=>{
      document.getElementById('tab-'+t).classList.toggle('active',t===tab);
      document.getElementById('panel-'+t).classList.toggle('active',t===tab);
    });
    if(tab==='sessions') loadSessions();
    if(tab==='devices')  loadDevices();
  }

  // ── LOAD ME + PROFILE ─────────────────────────────────────────────────────
  async function loadProfile(){
    try{
      const [meRes,profRes] = await Promise.all([
        fetch(API.ME,      {headers:H()}),
        fetch(API.PROFILE, {headers:H()}),
      ]);
      const me   = await meRes.json();
      const prof = await profRes.json();

      const name = me.fullname||'';
      const ini  = name?name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'U';
      document.getElementById('profile-avatar-lg').textContent = ini;
      document.getElementById('profile-name-big').textContent  = name||'—';
      document.getElementById('profile-role-txt').textContent  = me.primary_role||'customer';
      document.getElementById('sidebar-name').textContent      = name||'My Account';
      document.getElementById('sidebar-avatar').textContent    = ini;
      localStorage.setItem('user_name', name);

      document.getElementById('p-fullname').value     = me.fullname||'';
      document.getElementById('p-phone').value        = me.phone||'';
      document.getElementById('p-email').value        = me.email||prof.email||'';
      document.getElementById('p-national-code').value= me.national_code||'';
      document.getElementById('p-date-joined').value  = me.date_joined?new Date(me.date_joined).toLocaleDateString('en-DE'):'—';

      document.getElementById('p-dob').value         = prof.date_of_birth||'';
      document.getElementById('p-gender').value      = prof.gender||'';
      document.getElementById('p-address').value     = prof.address||'';
      document.getElementById('p-city').value        = prof.city||'';
      document.getElementById('p-postal-code').value = prof.postal_code||'';

      if(!me.is_verified){
        document.getElementById('profile-verified-badge').textContent='Unverified';
        document.getElementById('profile-verified-badge').style.background='var(--warning-bg)';
        document.getElementById('profile-verified-badge').style.color='var(--warning)';
      }
    } catch { toast('Failed to load profile','error'); }
  }

  // ── SAVE PROFILE ──────────────────────────────────────────────────────────
  async function saveProfile(){
    showMsg('profile-success',false); showMsg('profile-error',false);
    const fullname = document.getElementById('p-fullname').value.trim();
    const email    = document.getElementById('p-email').value.trim();
    if(!fullname||fullname.length<3){ toast('Full name must be at least 3 characters','error'); return; }

    const dob        = document.getElementById('p-dob').value;
    const gender      = document.getElementById('p-gender').value;
    const address     = document.getElementById('p-address').value.trim();
    const city        = document.getElementById('p-city').value.trim();
    const postalCode  = document.getElementById('p-postal-code').value.trim();

    const btn=document.getElementById('profile-save-btn');
    const spin=document.getElementById('profile-spin');
    const icon=document.getElementById('profile-save-icon');
    const txt=document.getElementById('profile-save-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Saving…';

    try{
      // fullname/email live on the User record → PATCH /me/profile/ (also accepts these)
      // address/city/country/postal_code/dob/gender live on the Profile record
      const res = await fetch(API.PROFILE,{
        method:'PATCH',
        headers:H(),
        body:JSON.stringify({
          fullname, email,
          date_of_birth: dob || null,
          gender: gender || null,
          address, city,
          postal_code: postalCode,
        }),
      });
      const data = await res.json();
      if(res.ok){
        showMsg('profile-success',true);
        localStorage.setItem('user_name',fullname);
        document.getElementById('profile-name-big').textContent=fullname;
        document.getElementById('sidebar-name').textContent=fullname;
        const ini=fullname.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        document.getElementById('profile-avatar-lg').textContent=ini;
        document.getElementById('sidebar-avatar').textContent=ini;
      } else {
        document.getElementById('profile-error-text').textContent=data.detail||data.message||'Update failed.';
        showMsg('profile-error',true);
      }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Save Changes'; }
  }

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────
  async function changePassword(){
    showMsg('pw-success',false); showMsg('pw-error',false);
    const current = document.getElementById('pw-current').value;
    const newPw   = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;
    let ok=true;
    if(!current){ fe('err-pw-current','Enter your current password.'); ok=false; } else fe('err-pw-current','');
    if(newPw.length<8){ fe('err-pw-new','Password must be at least 8 characters.'); ok=false; } else fe('err-pw-new','');
    if(newPw!==confirm){ fe('err-pw-confirm','Passwords do not match.'); ok=false; } else fe('err-pw-confirm','');
    if(!ok) return;

    const btn=document.getElementById('pw-save-btn');
    const spin=document.getElementById('pw-spin');
    const icon=document.getElementById('pw-save-icon');
    const txt=document.getElementById('pw-save-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Saving…';

    try{
      const res=await fetch(API.CHANGE_PW,{method:'POST',headers:H(),body:JSON.stringify({old_password:current,new_password:newPw})});
      const data=await res.json();
      if(res.ok){
        showMsg('pw-success',true);
        document.getElementById('pw-current').value='';
        document.getElementById('pw-new').value='';
        document.getElementById('pw-confirm').value='';
      } else {
        document.getElementById('pw-error-text').textContent=data.detail||data.old_password?.[0]||'Failed.';
        showMsg('pw-error',true);
      }
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent='Change Password'; }
  }

  // ── SESSIONS ──────────────────────────────────────────────────────────────
  async function loadSessions(){
    const el=document.getElementById('sessions-list');
    el.innerHTML='<div class="empty"><i class="ti ti-loader-2"></i>Loading…</div>';
    try{
      const res=await fetch(API.SESSIONS,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      if(!list.length){el.innerHTML='<div class="empty"><i class="ti ti-devices-off"></i>No active sessions.</div>';return;}
      el.innerHTML=list.map(s=>{
        const isCurrent=s.is_current;
        const d=new Date(s.created_at||s.last_activity);
        const icon=s.device_type==='mobile'?'ti-device-mobile':isCurrent?'ti-star':'ti-browser';
        const iconCls=isCurrent?'current':s.device_type==='mobile'?'mobile':'browser';
        return `
          <div class="session-item">
            <div class="session-icon ${iconCls}"><i class="ti ${icon}"></i></div>
            <div style="flex:1;">
              <div class="session-name">
                ${s.user_agent||s.device_name||'Unknown device'}
                ${isCurrent?'<span class="session-current-badge">Current</span>':''}
              </div>
              <div class="session-meta">${s.ip_address||'—'} · ${d.toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'})}</div>
            </div>
            ${!isCurrent?`<button class="revoke-btn" onclick="revokeSession(${s.id},this)">Sign out</button>`:''}
          </div>`;
      }).join('');
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load sessions.</div>'; }
  }

  async function revokeSession(id,btn){
    btn.disabled=true; btn.textContent='Signing out…';
    try{
      const res=await fetch(API.REVOKE_SESSION(id),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('Session signed out'); loadSessions(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; btn.textContent='Sign out'; }
  }

  async function revokeOthers(){
    if(!confirm('Sign out all other sessions?')) return;
    try{
      const res=await fetch(API.REVOKE_OTHERS,{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('All other sessions signed out'); loadSessions(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
  }

  // ── DEVICES ───────────────────────────────────────────────────────────────
  async function loadDevices(){
    const el=document.getElementById('devices-list');
    el.innerHTML='<div class="empty"><i class="ti ti-loader-2"></i>Loading…</div>';
    try{
      const res=await fetch(API.DEVICES,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      if(!list.length){el.innerHTML='<div class="empty"><i class="ti ti-device-mobile-off"></i>No trusted devices.</div>';return;}
      el.innerHTML=list.map(d=>`
        <div class="session-item">
          <div class="session-icon mobile"><i class="ti ti-device-mobile"></i></div>
          <div style="flex:1;">
            <div class="session-name">${d.device_name||d.name||'Unknown device'}</div>
            <div class="session-meta">${d.device_type||'—'} · Added ${d.created_at?new Date(d.created_at).toLocaleDateString('en-DE'):'—'}</div>
          </div>
          <button class="revoke-btn" onclick="deleteDevice(${d.id},this)"><i class="ti ti-trash"></i> Remove</button>
        </div>`).join('');
    } catch { el.innerHTML='<div class="empty"><i class="ti ti-alert-circle"></i>Failed to load devices.</div>'; }
  }

  async function deleteDevice(id,btn){
    btn.disabled=true;
    try{
      const res=await fetch(API.DELETE_DEVICE(id),{method:'DELETE',headers:H()});
      if(res.ok||res.status===204){ toast('Device removed'); loadDevices(); }
      else toast('Failed','error');
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; }
  }

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadProfile();