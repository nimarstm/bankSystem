  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access) window.location.href = '../../auth/auth.html';

  const API = {
    STATS:        '/api/ai/admin/stats/',
    CONVS:        (q) => `/api/ai/admin/conversations/?${q}`,
    CONV_DETAIL:  (id) => `/api/ai/admin/conversations/${id}/`,
    ACTIONS:      (q) => `/api/ai/admin/actions/?${q}`,
    ACTION_DETAIL:(id) => `/api/ai/admin/actions/${id}/`,
    CANCEL_ACTION:(id) => `/api/ai/admin/actions/${id}/cancel/`,
    LOGOUT: '/api/v1/auth/logout/',
  };
  const H = () => ({ 'Content-Type':'application/json','Authorization':`Bearer ${access}` });

  const adminName = localStorage.getItem('user_name')||'Admin';
  document.getElementById('sidebar-name').textContent = adminName;
  document.getElementById('sidebar-avatar').textContent = adminName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'AD';

  function toast(msg,type='success'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-${type==='success'?'circle-check':'alert-circle'}"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }

  // ── TABS ──────────────────────────────────────────────────────────────────
  function switchTab(tab){
    ['conversations','actions'].forEach(t=>{
      document.getElementById('tab-'+t).classList.toggle('active',t===tab);
      document.getElementById('panel-'+t).classList.toggle('active',t===tab);
    });
    if(tab==='conversations') loadConversations();
    if(tab==='actions')       loadActions();
  }

  // ── STATS ─────────────────────────────────────────────────────────────────
  async function loadStats(){
    try{
      const res=await fetch(API.STATS,{headers:H()});
      const d=await res.json();
      document.getElementById('stat-convs').textContent    = (d.total_conversations||0).toLocaleString();
      document.getElementById('stat-msgs').textContent     = (d.total_messages||0).toLocaleString();
      document.getElementById('stat-pending').textContent  = (d.actions_by_status?.PENDING||0).toLocaleString();
      document.getElementById('stat-executed').textContent = (d.actions_by_status?.EXECUTED||0).toLocaleString();
    } catch {
      ['stat-convs','stat-msgs','stat-pending','stat-executed'].forEach(id=>document.getElementById(id).textContent='—');
    }
  }

  // ── CONVERSATIONS ─────────────────────────────────────────────────────────
  async function loadConversations(){
    document.getElementById('conv-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    const p=new URLSearchParams();
    const search=document.getElementById('conv-search').value.trim();
    const uid   =document.getElementById('conv-user-id').value.trim();
    const from  =document.getElementById('conv-from').value;
    const to    =document.getElementById('conv-to').value;
    if(search) p.set('search',search);
    if(uid)    p.set('user_id',uid);
    if(from)   p.set('date_from',from);
    if(to)     p.set('date_to',to);

    try{
      const res=await fetch(API.CONVS(p),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('conv-count').textContent=`${list.length} result${list.length!==1?'s':''}`;
      if(!list.length){document.getElementById('conv-wrap').innerHTML='<div class="empty-state"><i class="ti ti-messages-off"></i><p>No conversations found.</p></div>';return;}
      document.getElementById('conv-wrap').innerHTML=`
        <table>
          <thead><tr><th>ID</th><th>User</th><th>Title / Last Message</th><th>Messages</th><th>Updated</th></tr></thead>
          <tbody>${list.map(c=>`
            <tr onclick="openConvDrawer(${c.id})">
              <td style="font-weight:600;color:var(--accent);">#${c.id}</td>
              <td>${c.user_name||'—'}<br><span style="font-size:11.5px;color:var(--text-3);">${c.user_phone||''}</span></td>
              <td>
                <div style="font-weight:500;font-size:13px;">${c.title||'Untitled'}</div>
                ${c.messages?.length?`<div style="font-size:12px;color:var(--text-3);margin-top:2px;">${(c.messages[c.messages.length-1]?.content||'').slice(0,60)}…</div>`:''}
              </td>
              <td style="font-weight:600;">${(c.messages||[]).length}</td>
              <td style="font-size:12px;color:var(--text-3);">${c.updated_at?new Date(c.updated_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):''}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } catch {
      document.getElementById('conv-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load conversations.</p></div>';
    }
  }

  function resetConvFilters(){
    ['conv-search','conv-user-id','conv-from','conv-to'].forEach(id=>document.getElementById(id).value='');
    loadConversations();
  }

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  async function loadActions(){
    document.getElementById('act-wrap').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    const p=new URLSearchParams();
    const uid   =document.getElementById('act-user-id').value.trim();
    const intent=document.getElementById('act-intent').value;
    const status=document.getElementById('act-status').value;
    const from  =document.getElementById('act-from').value;
    const to    =document.getElementById('act-to').value;
    if(uid)    p.set('user_id',uid);
    if(intent) p.set('intent',intent);
    if(status) p.set('status',status);
    if(from)   p.set('date_from',from);
    if(to)     p.set('date_to',to);

    try{
      const res=await fetch(API.ACTIONS(p),{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      document.getElementById('act-count').textContent=`${list.length} result${list.length!==1?'s':''}`;
      if(!list.length){document.getElementById('act-wrap').innerHTML='<div class="empty-state"><i class="ti ti-player-pause"></i><p>No actions found.</p></div>';return;}
      document.getElementById('act-wrap').innerHTML=`
        <table>
          <thead><tr><th>ID</th><th>User</th><th>Intent</th><th>Status</th><th>Confirmation</th><th>Created</th><th>Expires</th></tr></thead>
          <tbody>${list.map(a=>`
            <tr onclick="openActionDrawer(${a.id})">
              <td style="font-weight:600;color:var(--accent);">#${a.id}</td>
              <td>${a.user_name||'—'}<br><span style="font-size:11.5px;color:var(--text-3);">${a.user_phone||''}</span></td>
              <td><span style="font-weight:500;font-size:13px;">${(a.intent||'—').replace(/_/g,' ')}</span></td>
              <td><span class="badge ${a.status}">${a.status}</span></td>
              <td style="font-size:12.5px;color:var(--text-2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.confirmation_text||'—'}</td>
              <td style="font-size:12px;color:var(--text-3);">${a.created_at?new Date(a.created_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):''}</td>
              <td style="font-size:12px;color:${a.expires_at&&new Date(a.expires_at)<new Date()?'var(--danger)':'var(--text-3)'};">${a.expires_at?new Date(a.expires_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } catch {
      document.getElementById('act-wrap').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load actions.</p></div>';
    }
  }

  function resetActFilters(){
    ['act-user-id','act-from','act-to'].forEach(id=>document.getElementById(id).value='');
    ['act-intent','act-status'].forEach(id=>document.getElementById(id).value='');
    loadActions();
  }

  // ── CONVERSATION DRAWER ────────────────────────────────────────────────────
  async function openConvDrawer(id){
    document.getElementById('drawer-title').textContent='Conversation #'+id;
    document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('drawer-footer').innerHTML='';
    document.getElementById('overlay').classList.add('show');
    document.getElementById('detail-drawer').classList.add('open');

    try{
      const res=await fetch(API.CONV_DETAIL(id),{headers:H()});
      const c=await res.json();
      const msgs=(c.messages||[]).map(m=>`
        <div class="chat-msg">
          <div class="chat-msg-role ${m.role}">${m.role==='user'?'👤 User':'🤖 Assistant'}</div>
          <div class="chat-msg-bubble">${escHtml(m.content)}</div>
          <div class="chat-msg-time">${m.created_at?new Date(m.created_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'medium'}):''}</div>
        </div>`).join('');
      document.getElementById('drawer-body').innerHTML=`
        <div class="detail-grid">
          <div class="detail-cell"><div class="detail-label">User</div><div class="detail-val">${c.user_name||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Phone</div><div class="detail-val">${c.user_phone||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Created</div><div class="detail-val">${c.created_at?new Date(c.created_at).toLocaleDateString('en-DE'):'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Messages</div><div class="detail-val">${(c.messages||[]).length}</div></div>
        </div>
        <div class="section-lbl">Conversation</div>
        <div>${msgs||'<div class="empty-state"><i class="ti ti-message-off"></i><p>No messages</p></div>'}</div>`;
      document.getElementById('drawer-footer').innerHTML=`
        <button class="btn danger" onclick="deleteConversation(${id})"><i class="ti ti-trash"></i> Delete Conversation</button>`;
    } catch { document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  // ── ACTION DRAWER ─────────────────────────────────────────────────────────
  async function openActionDrawer(id){
    document.getElementById('drawer-title').textContent='Pending Action #'+id;
    document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-loader-2"></i><p>Loading…</p></div>';
    document.getElementById('drawer-footer').innerHTML='';
    document.getElementById('overlay').classList.add('show');
    document.getElementById('detail-drawer').classList.add('open');

    try{
      const res=await fetch(API.ACTION_DETAIL(id),{headers:H()});
      const a=await res.json();
      const isExpired=a.expires_at&&new Date(a.expires_at)<new Date();
      document.getElementById('drawer-body').innerHTML=`
        <div style="margin-bottom:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--warning-bg);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--warning);flex-shrink:0;"><i class="ti ti-player-play"></i></div>
          <div>
            <div style="font-size:15px;font-weight:700;">${(a.intent||'—').replace(/_/g,' ')}</div>
            <div style="margin-top:5px;"><span class="badge ${a.status}">${a.status}</span>${isExpired?'<span class="badge EXPIRED" style="margin-left:6px;">Expired</span>':''}</div>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-cell"><div class="detail-label">User</div><div class="detail-val">${a.user_name||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Phone</div><div class="detail-val">${a.user_phone||'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Created</div><div class="detail-val">${a.created_at?new Date(a.created_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):''}</div></div>
          <div class="detail-cell"><div class="detail-label">Expires</div><div class="detail-val" style="color:${isExpired?'var(--danger)':'inherit'};">${a.expires_at?new Date(a.expires_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Executed At</div><div class="detail-val">${a.executed_at?new Date(a.executed_at).toLocaleString('en-DE',{dateStyle:'short',timeStyle:'short'}):'—'}</div></div>
          <div class="detail-cell"><div class="detail-label">Intent</div><div class="detail-val">${a.intent||'—'}</div></div>
        </div>
        <div class="section-lbl">Confirmation Text</div>
        <div style="font-size:13.5px;color:var(--text-2);line-height:1.6;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">${a.confirmation_text||'—'}</div>
        <div class="section-lbl">Payload</div>
        <div class="payload-box">${JSON.stringify(a.payload||{},null,2)}</div>`;

      if(a.status==='PENDING'){
        document.getElementById('drawer-footer').innerHTML=`
          <button class="btn danger" id="cancel-action-btn" onclick="cancelAction(${id})">
            <div class="spinner" id="cancel-spin"></div>
            <i class="ti ti-x"></i> Cancel Action
          </button>`;
      }
    } catch { document.getElementById('drawer-body').innerHTML='<div class="empty-state"><i class="ti ti-alert-circle"></i><p>Failed to load.</p></div>'; }
  }

  function closeDrawer(){
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('detail-drawer').classList.remove('open');
  }

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  async function deleteConversation(id){
    if(!confirm('Delete this conversation permanently?')) return;
    try{
      const res=await fetch(API.CONV_DETAIL(id),{method:'DELETE',headers:H()});
      if(res.ok||res.status===204){ toast('Conversation deleted'); closeDrawer(); loadConversations(); loadStats(); }
      else toast('Failed to delete','error');
    } catch { toast('Network error','error'); }
  }

  async function cancelAction(id){
    const btn=document.getElementById('cancel-action-btn');
    const spin=document.getElementById('cancel-spin');
    btn.disabled=true;spin.style.display='block';
    try{
      const res=await fetch(API.CANCEL_ACTION(id),{method:'POST',headers:H(),body:'{}'});
      if(res.ok){ toast('Action cancelled'); closeDrawer(); loadActions(); loadStats(); }
      else toast('Failed to cancel','error');
    } catch { toast('Network error','error'); }
    finally { btn.disabled=false;spin.style.display='none'; }
  }

  function escHtml(str){ const d=document.createElement('div');d.textContent=str;return d.innerHTML; }

  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  loadStats();
  loadConversations();