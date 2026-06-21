  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';

  const API = {
    SEND:      '/notifications/admin/send/',
    BROADCAST: '/notifications/admin/broadcast/',
    HISTORY:   '/notifications/admin/',
    DEL_NOTIF: (id) => `/notifications/admin/${id}/delete/`,
    USER_NOTIF:(uid)=> `/notifications/admin/user/${uid}/`,
    LOGOUT:    '/api/v1/auth/logout/',
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

  // ── CHAR COUNT ────────────────────────────────────────────────────────────
  document.getElementById('notif-message').addEventListener('input',function(){
    document.getElementById('char-count').textContent=this.value.length;
  });
  function switchTab(tab){
    ['compose','history'].forEach(t=>{
      document.getElementById('tab-'+t).classList.toggle('active',t===tab);
      document.getElementById('panel-'+t).classList.toggle('active',t===tab);
    });
    if(tab==='history') loadHistory();
  }

  // ── TARGET ────────────────────────────────────────────────────────────────
  let currentTarget='individual', currentChannel='in-app';

  function setTarget(t){
    currentTarget=t;
    document.getElementById('tgt-individual').classList.toggle('active',t==='individual');
    document.getElementById('tgt-broadcast').classList.toggle('active',t==='broadcast');
    document.getElementById('user-id-field').style.display=t==='individual'?'':'none';
    document.getElementById('broadcast-warning').classList.toggle('show',t==='broadcast');
    document.getElementById('send-text').textContent=t==='broadcast'?'Broadcast to All':'Send Notification';
  }

  // ── CHANNEL ───────────────────────────────────────────────────────────────
  const channelHints={
    'in-app':'Delivered inside the EliraPay app',
    'sms':   'Send via SMS to the user\'s phone number',
    'email': 'Send via email to the user\'s email address',
  };

  function setChannel(channel, btn){
    // SMS and Email are frontend-only — show unavailable popup
    if(channel==='sms'||channel==='email'){
      document.getElementById('unavail-title').textContent=`${channel.toUpperCase()} not available`;
      document.getElementById('unavail-popup').classList.add('show');
      return; // don't switch channel
    }
    currentChannel=channel;
    document.querySelectorAll('.channel-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('channel-hint').textContent=channelHints[channel]||'';
  }

  function closeUnavailPopup(){ document.getElementById('unavail-popup').classList.remove('show'); }
  document.getElementById('unavail-popup').addEventListener('click',function(e){ if(e.target===this) closeUnavailPopup(); });

  // ── USER SEARCH DROPDOWN ──────────────────────────────────────────────────
  let userSearchTimer=null;
  let selectedUserId=null;

  async function searchUsers(query){
    const dropdown=document.getElementById('user-dropdown');
    const list=document.getElementById('user-dropdown-list');

    // If a user is already selected and they clear/change input, deselect
    if(selectedUserId){
      clearUserSelection();
    }

    if(!query||query.trim().length<1){
      // Show recent/all users on focus with empty query
      query='';
    }

    dropdown.style.display='block';
    list.innerHTML='<div style="padding:10px 14px;font-size:13px;color:var(--text-3);display:flex;align-items:center;gap:8px;"><i class="ti ti-loader-2"></i> Searching…</div>';

    clearTimeout(userSearchTimer);
    userSearchTimer=setTimeout(async()=>{
      try{
        const p=new URLSearchParams();
        if(query.trim()) p.set('search',query.trim());
        const res=await fetch(`/api/v1/users/admin/?${p}`,{headers:H()});

        if(!res.ok){
          let detail='';
          try{ const errBody=await res.json(); detail=errBody.detail||errBody.message||JSON.stringify(errBody); }
          catch{ detail=await res.text().catch(()=>''); }
          console.error('User search failed:',res.status,detail);
          list.innerHTML=`<div style="padding:12px 14px;font-size:12.5px;color:var(--danger);line-height:1.5;">
            <i class="ti ti-alert-circle"></i> Request failed (${res.status} ${res.statusText})<br>
            <span style="color:var(--text-3);">${detail||'No error details returned. Check that /api/v1/users/admin/ exists and your token is valid.'}</span>
          </div>`;
          return;
        }

        const data=await res.json();
        const users=Array.isArray(data)?data:(data.results||[]);

        if(!users.length){
          list.innerHTML='<div style="padding:12px 14px;font-size:13px;color:var(--text-3);">No users found.</div>';
          return;
        }

        const avatarColors=['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
        const col=(name)=>avatarColors[(name||'').charCodeAt(0)%avatarColors.length];
        const ini=(name)=>(name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

        list.innerHTML=users.slice(0,8).map(u=>`
          <div onclick="selectUser(${u.id},'${(u.fullname||'').replace(/'/g,"\\'")}','${u.phone||''}','${u.email||''}')"
            style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid var(--border);"
            onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
            <div style="width:32px;height:32px;border-radius:50%;background:${col(u.fullname)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${ini(u.fullname)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.fullname||'—'}</div>
              <div style="font-size:12px;color:var(--text-3);">${u.phone||''} ${u.email?'· '+u.email:''}</div>
            </div>
            <span style="font-size:11px;color:var(--text-3);font-weight:500;flex-shrink:0;">#${u.id}</span>
          </div>`).join('');
      } catch (err) {
        console.error('User search network error:', err);
        list.innerHTML=`<div style="padding:12px 14px;font-size:12.5px;color:var(--danger);line-height:1.5;">
          <i class="ti ti-alert-circle"></i> Network error<br>
          <span style="color:var(--text-3);">${err?.message||'Could not reach the server.'}</span>
        </div>`;
      }
    }, 280);
  }

  function selectUser(id, name, phone, email){
    selectedUserId=id;
    document.getElementById('target-user-id').value=id;

    // Update search input to show selected name
    document.getElementById('user-search-input').value=name;
    document.getElementById('user-search-input').style.borderColor='var(--accent)';
    document.getElementById('user-clear-btn').style.display='block';

    // Show selected badge
    const badge=document.getElementById('selected-user-badge');
    badge.style.display='flex';
    const avatarColors=['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
    const ini=(n)=>(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('selected-user-avatar').textContent=ini(name);
    document.getElementById('selected-user-avatar').style.background=avatarColors[name.charCodeAt(0)%avatarColors.length];
    document.getElementById('selected-user-name').textContent=name||'—';
    document.getElementById('selected-user-meta').textContent=[phone,email].filter(Boolean).join(' · ')||'—';
    document.getElementById('selected-user-id-badge').textContent='#'+id;

    // Hide dropdown
    document.getElementById('user-dropdown').style.display='none';
    fe('err-user-id','');
  }

  function clearUserSelection(){
    selectedUserId=null;
    document.getElementById('target-user-id').value='';
    document.getElementById('user-search-input').value='';
    document.getElementById('user-search-input').style.borderColor='';
    document.getElementById('user-clear-btn').style.display='none';
    document.getElementById('selected-user-badge').style.display='none';
    document.getElementById('user-dropdown').style.display='none';
  }

  // Close dropdown when clicking outside
  document.addEventListener('click',function(e){
    const field=document.getElementById('user-id-field');
    if(field && !field.contains(e.target)){
      document.getElementById('user-dropdown').style.display='none';
    }
  });

  // ── CHAR COUNT ────────────────────────────────────────────────────────────
  document.getElementById('notif-message').addEventListener('input',function(){
    document.getElementById('char-count').textContent=this.value.length;
  });

  // ── VALIDATION ────────────────────────────────────────────────────────────
  function fe(id,msg){ const el=document.getElementById(id); if(msg){el.textContent=msg;el.classList.add('show');}else el.classList.remove('show'); }

  function validate(){
    let ok=true;
    if(currentTarget==='individual'){
      if(!selectedUserId){ fe('err-user-id','Please select a user from the list.'); ok=false; } else fe('err-user-id','');
    }
    const title=document.getElementById('notif-title').value.trim();
    if(!title){ fe('err-title','Please enter a title.'); ok=false; } else fe('err-title','');
    const msg=document.getElementById('notif-message').value.trim();
    if(!msg){ fe('err-message','Please enter a message.'); ok=false; } else fe('err-message','');
    return ok;
  }

  // ── SEND ──────────────────────────────────────────────────────────────────
  async function sendNotification(){
    if(!validate()) return;
    const btn=document.getElementById('send-btn');
    const spin=document.getElementById('send-spin');
    const icon=document.getElementById('send-icon');
    const txt=document.getElementById('send-text');
    btn.disabled=true; spin.style.display='block'; icon.style.display='none'; txt.textContent='Sending…';

    const title  =document.getElementById('notif-title').value.trim();
    const message=document.getElementById('notif-message').value.trim();
    const type   =document.getElementById('notif-type').value;

    try{
      let res;
      if(currentTarget==='broadcast'){
        res=await fetch(API.BROADCAST,{method:'POST',headers:H(),body:JSON.stringify({title,message,type})});
      } else {
        const user_id=selectedUserId;
        res=await fetch(API.SEND,{method:'POST',headers:H(),body:JSON.stringify({title,message,type,user_id})});
      }
      if(res.ok){
        document.getElementById('compose-form').style.display='none';
        document.getElementById('send-success').classList.add('show');
        document.getElementById('success-sub').textContent=currentTarget==='broadcast'
          ?'Your broadcast has been sent to all users via In-App.'
          :`Notification sent to ${document.getElementById('selected-user-name').textContent} (#${selectedUserId}) via In-App.`;
      } else {
        const d=await res.json();
        toast(d.detail||d.message||'Failed to send notification.','error');
      }
    } catch { toast('Network error. Please try again.','error'); }
    finally { btn.disabled=false; spin.style.display='none'; icon.style.display=''; txt.textContent=currentTarget==='broadcast'?'Broadcast to All':'Send Notification'; }
  }

  function resetCompose(){
    document.getElementById('compose-form').style.display='';
    document.getElementById('send-success').classList.remove('show');
    clearUserSelection();
    document.getElementById('notif-title').value='';
    document.getElementById('notif-message').value='';
    document.getElementById('notif-type').value='INFO';
    document.getElementById('char-count').textContent='0';
    setTarget('individual');
    currentChannel='in-app';
    document.querySelectorAll('.channel-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('ch-inapp').classList.add('active');
    document.getElementById('channel-hint').textContent=channelHints['in-app'];
    ['err-user-id','err-title','err-message'].forEach(id=>fe(id,''));
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  const typeIcon={INFO:'ti-info-circle',SUCCESS:'ti-circle-check',WARNING:'ti-alert-triangle',ERROR:'ti-alert-circle',LOAN_UPDATE:'ti-coin',TRANSACTION:'ti-arrows-right-left',SECURITY:'ti-shield-lock',SYSTEM:'ti-settings'};

  async function loadHistory(){
    document.getElementById('history-list').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    try{
      const res=await fetch(API.HISTORY,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      renderHistory(list);
    } catch { renderHistory(mockHistory()); }
  }

  function renderHistory(list){
    document.getElementById('history-count').textContent=`${list.length} sent`;
    if(!list.length){
      document.getElementById('history-list').innerHTML='<div class="empty-state"><i class="ti ti-bell-off"></i><p>No notifications sent yet.</p></div>';
      return;
    }
    document.getElementById('history-list').innerHTML=list.map(n=>{
      const isBroadcast=n.is_broadcast||!n.user;
      const iconCls=isBroadcast?'broadcast':n.type==='SYSTEM'?'system':'individual';
      return `
        <div class="notif-item">
          <div class="notif-icon ${iconCls}"><i class="ti ${typeIcon[n.type]||'ti-bell'}"></i></div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <div class="notif-title-txt">${n.title||'—'}</div>
              <span class="badge ${iconCls}">${isBroadcast?'Broadcast':'Individual'}</span>
            </div>
            <div class="notif-body-txt">${n.message||n.body||'—'}</div>
            <div class="notif-meta">
              <div class="notif-meta-item"><i class="ti ti-tag"></i>${n.type||'INFO'}</div>
              ${!isBroadcast&&n.user?`<div class="notif-meta-item"><i class="ti ti-user"></i>User #${n.user}</div>`:'<div class="notif-meta-item"><i class="ti ti-speakerphone"></i>All users</div>'}
              <div class="notif-meta-item"><i class="ti ti-bell"></i>In-App</div>
              <div class="notif-meta-item"><i class="ti ti-clock"></i>${n.created_at?new Date(n.created_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):'—'}</div>
            </div>
          </div>
          <button class="btn danger-sm" onclick="deleteNotif('${n.id}',this)"><i class="ti ti-trash"></i></button>
        </div>`;
    }).join('');
  }

  async function deleteNotif(id,btn){
    btn.disabled=true;
    try{
      const res=await fetch(API.DEL_NOTIF(id),{method:'DELETE',headers:H()});
      if(res.ok||res.status===204){ toast('Notification deleted'); loadHistory(); }
      else toast('Failed to delete','error');
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false; }
  }

  function mockHistory(){
    return [
      {id:'n1',title:'System Maintenance',  message:'Scheduled maintenance on June 10 from 2–4 AM.',type:'SYSTEM',  is_broadcast:true, user:null,created_at:'2026-06-01T10:00:00Z'},
      {id:'n2',title:'Loan Approved',       message:'Your personal loan of €8,000 has been approved.',type:'LOAN_UPDATE',is_broadcast:false,user:42,created_at:'2026-05-28T14:30:00Z'},
      {id:'n3',title:'Security Alert',      message:'Login from a new device detected.',type:'SECURITY',is_broadcast:false,user:7,created_at:'2026-05-25T22:10:00Z'},
    ];
  }

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }
