  // ── ENDPOINTS ─────────────────────────────────────────────────────────────
  const API = {
    CHAT:          '/api/ai/chat/',
    CONVERSATIONS: '/api/ai/conversations/',
    MESSAGES:      (id) => `/api/ai/conversations/${id}/messages/`,
    ACTIONS:       '/api/ai/actions/pending/',
    CANCEL_ACTION: (id) => `/api/ai/actions/${id}/cancel/`,
    LOGOUT:        '/api/v1/auth/logout/',
  };

  const access  = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  //if (!access) window.location.href = '../../auth/auth.html';
  const H = () => ({ 'Content-Type':'application/json','Authorization':`Bearer ${access}` });

  // ── SIDEBAR USER ──────────────────────────────────────────────────────────
  const userName = localStorage.getItem('user_name')||'';
  document.getElementById('sidebar-name').textContent = userName||'My Account';
  const initials = userName?userName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'U';
  document.getElementById('sidebar-avatar').textContent = initials;

  function toast(msg,type='error'){
    const el=document.createElement('div');el.className=`toast ${type}`;
    el.innerHTML=`<i class="ti ti-alert-circle"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),4000);
  }

  // ── STATE ─────────────────────────────────────────────────────────────────
  let currentConversationId = null;
  let isLoading = false;

  // ── CONVERSATIONS SIDEBAR ─────────────────────────────────────────────────
  async function loadConversations(){
    try{
      const res=await fetch(API.CONVERSATIONS,{headers:H()});
      const data=await res.json();
      const list=Array.isArray(data)?data:(data.results||[]);
      const el=document.getElementById('conv-list');
      if(!list.length){
        el.innerHTML='<div style="padding:10px;font-size:12.5px;color:rgba(255,255,255,0.3);text-align:center;">No conversations yet</div>';
        return;
      }
      el.innerHTML=list.map(c=>`
        <div class="conv-item ${c.id===currentConversationId?'active':''}" onclick="loadConversation(${c.id})" id="conv-${c.id}">
          <div class="conv-title">${c.title||'Conversation #'+c.id}</div>
          <div class="conv-time">${c.updated_at?new Date(c.updated_at).toLocaleDateString('en-DE',{day:'2-digit',month:'short'}):''}</div>
        </div>`).join('');
    } catch { /* silent */ }
  }

  async function loadConversation(id){
    currentConversationId=id;
    document.getElementById('welcome-state')?.remove();
    document.querySelectorAll('.message,.typing').forEach(el=>el.remove());
    document.querySelectorAll('.conv-item').forEach(el=>el.classList.remove('active'));
    document.getElementById('conv-'+id)?.classList.add('active');
    try{
      const res=await fetch(API.MESSAGES(id),{headers:H()});
      const data=await res.json();
      const msgs=Array.isArray(data)?data:(data.results||[]);
      msgs.forEach(m=>appendMessage(m.role,m.content,new Date(m.created_at),false));
      scrollToBottom();
    } catch { toast('Failed to load conversation.'); }
  }

  function startNewConversation(){
    currentConversationId=null;
    const chatArea=document.getElementById('chat-area');
    chatArea.innerHTML=`
      <div class="welcome-state" id="welcome-state">
        <div class="welcome-icon"><i class="ti ti-robot"></i></div>
        <div class="welcome-title">Hi, I'm your banking assistant</div>
        <div class="welcome-sub">I can help you check your balance, view transactions, request loans, pay installments, and transfer money — all through conversation.</div>
        <div class="suggestions">
          <div class="suggestion" onclick="sendSuggestion('What is my account balance?')"><i class="ti ti-wallet"></i> Check balance</div>
          <div class="suggestion" onclick="sendSuggestion('Show my recent transactions')"><i class="ti ti-arrows-right-left"></i> Recent transactions</div>
          <div class="suggestion" onclick="sendSuggestion('Show my active loans')"><i class="ti ti-coin"></i> My loans</div>
          <div class="suggestion" onclick="sendSuggestion('Show my installments')"><i class="ti ti-receipt"></i> My installments</div>
          <div class="suggestion" onclick="sendSuggestion('Show my notifications')"><i class="ti ti-bell"></i> Notifications</div>
          <div class="suggestion" onclick="sendSuggestion('Transfer 100 EUR via IBAN')"><i class="ti ti-building-bank"></i> IBAN transfer</div>
        </div>
      </div>`;
    document.querySelectorAll('.conv-item').forEach(el=>el.classList.remove('active'));
  }

  // ── MESSAGE RENDERING ─────────────────────────────────────────────────────
  function appendMessage(role, content, time, animate=true){
    const ws=document.getElementById('welcome-state');
    if(ws) ws.remove();

    const timeStr=time?time.toLocaleTimeString('en-DE',{hour:'2-digit',minute:'2-digit'}):new Date().toLocaleTimeString('en-DE',{hour:'2-digit',minute:'2-digit'});
    const isUser=role==='user';

    const el=document.createElement('div');
    el.className=`message ${role}`;
    if(!animate) el.style.animation='none';

    el.innerHTML=`
      <div class="msg-avatar ${isUser?'user-av':'ai'}">${isUser?initials:'<i class="ti ti-robot"></i>'}</div>
      <div>
        <div class="msg-bubble">${escapeHtml(content)}</div>
        <div class="msg-time">${timeStr}</div>
      </div>`;

    document.getElementById('chat-area').appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendStructuredResponse(data){
    const ws=document.getElementById('welcome-state');
    if(ws) ws.remove();

    const el=document.createElement('div');
    el.className='message assistant';
    el.style.maxWidth='85%';

    let inner='';
    const type=data.type||data.intent;

    if(type==='balance'||data.balance!==undefined){
      inner=`<div class="msg-bubble">
        <div style="font-size:13px;color:var(--text-3);margin-bottom:4px;">Account Balance</div>
        <div style="font-family:'DM Serif Display',serif;font-size:32px;color:var(--navy);">${data.currency||'€'} ${Number(data.balance||0).toLocaleString()}</div>
        ${data.account_number?`<div style="font-size:12px;color:var(--text-3);margin-top:4px;">${data.account_number}</div>`:''}
      </div>`;
    } else if(data.accounts){
      const rows=data.accounts.map(a=>`<div class="rc-row"><span class="rc-label">${a.type||'Account'}</span><span class="rc-val accent">${a.currency} ${Number(a.balance||0).toLocaleString()}</span></div>`).join('');
      inner=`<div class="msg-bubble">Your accounts:<div class="response-card"><div class="response-card-header">Accounts</div><div class="response-card-body">${rows||'No accounts found.'}</div></div></div>`;
    } else if(data.transactions){
      const rows=data.transactions.slice(0,5).map(t=>`<div class="rc-row"><span class="rc-label">${t.description||t.type||'Tx'}</span><span class="rc-val ${t.amount>0?'green':'red'}">${t.amount>0?'+':''}€${Math.abs(t.amount||0).toFixed(2)}</span></div>`).join('');
      inner=`<div class="msg-bubble">Recent transactions:<div class="response-card"><div class="response-card-header">Transactions</div><div class="response-card-body">${rows||'No transactions.'}</div></div></div>`;
    } else if(data.loans){
      const rows=data.loans.map(l=>`<div class="rc-row"><span class="rc-label">${(l.loan_type||'Loan').replace(/_/g,' ')}</span><span class="rc-val">€${Number(l.principal_amount||0).toLocaleString()} · ${l.status}</span></div>`).join('');
      inner=`<div class="msg-bubble">Your loans:<div class="response-card"><div class="response-card-header">Loans</div><div class="response-card-body">${rows||'No loans.'}</div></div></div>`;
    } else if(data.installments){
      const rows=data.installments.filter(i=>i.status!=='PAID').slice(0,5).map(i=>`<div class="rc-row"><span class="rc-label">#${i.number} · Due ${i.due_date}</span><span class="rc-val ${i.status==='OVERDUE'?'red':'accent'}">€${Number(i.amount||0).toFixed(2)}</span></div>`).join('');
      inner=`<div class="msg-bubble">Your installments:<div class="response-card"><div class="response-card-header">Pending Installments</div><div class="response-card-body">${rows||'No pending installments.'}</div></div></div>`;
    } else if(data.requires_confirmation||data.confirmation_text){
      // Pending action — user needs to confirm
      const actionId=data.action_id||data.id;
      inner=`<div class="msg-bubble">
        <div class="pending-card">
          <div class="pending-title"><i class="ti ti-alert-triangle"></i> Action Required</div>
          <div class="pending-text">${data.confirmation_text||data.message||'Please confirm this action.'}</div>
          <div class="pending-actions">
            <button class="pend-btn confirm" onclick="sendConfirmation('yes')"><i class="ti ti-check"></i> Confirm</button>
            <button class="pend-btn cancel" onclick="sendConfirmation('cancel')"><i class="ti ti-x"></i> Cancel</button>
          </div>
        </div>
      </div>`;
    } else if(data.message){
      inner=`<div class="msg-bubble">${escapeHtml(data.message)}</div>`;
    } else {
      return; // nothing to render
    }

    el.innerHTML=`
      <div class="msg-avatar ai"><i class="ti ti-robot"></i></div>
      <div>${inner}<div class="msg-time">${new Date().toLocaleTimeString('en-DE',{hour:'2-digit',minute:'2-digit'})}</div></div>`;

    document.getElementById('chat-area').appendChild(el);
    scrollToBottom();
  }

  function showTyping(){
    const el=document.createElement('div');
    el.className='message assistant';
    el.id='typing-indicator';
    el.innerHTML=`<div class="msg-avatar ai"><i class="ti ti-robot"></i></div><div class="typing"><span></span><span></span><span></span></div>`;
    document.getElementById('chat-area').appendChild(el);
    scrollToBottom();
  }
  function removeTyping(){ document.getElementById('typing-indicator')?.remove(); }

  function escapeHtml(str){ const d=document.createElement('div');d.textContent=str;return d.innerHTML; }
  function scrollToBottom(){ const ca=document.getElementById('chat-area'); ca.scrollTop=ca.scrollHeight; }

  // ── SEND MESSAGE ──────────────────────────────────────────────────────────
  async function sendMessage(){
    const input=document.getElementById('chat-input');
    const text=input.value.trim();
    if(!text||isLoading) return;

    input.value='';
    input.style.height='auto';
    isLoading=true;
    document.getElementById('send-btn').disabled=true;

    appendMessage('user',text);
    showTyping();

    try{
      const payload={message:text};
      if(currentConversationId) payload.conversation_id=currentConversationId;

      const res=await fetch(API.CHAT,{method:'POST',headers:H(),body:JSON.stringify(payload)});
      const data=await res.json();

      removeTyping();

      if(!res.ok){
        appendMessage('assistant',data.detail||data.message||'Sorry, something went wrong.');
      } else {
        // Update conversation ID from response if new
        if(data.conversation_id&&!currentConversationId){
          currentConversationId=data.conversation_id;
        }
        // Render structured or plain response
        if(data.type==='error'||data.type==='unknown'){
          appendMessage('assistant',data.message||'I could not understand your request.');
        } else {
          appendStructuredResponse(data);
        }
        loadConversations();
      }
    } catch {
      removeTyping();
      appendMessage('assistant','Network error. Please check your connection and try again.');
    } finally {
      isLoading=false;
      document.getElementById('send-btn').disabled=false;
      document.getElementById('chat-input').focus();
    }
  }

  async function sendConfirmation(text){
    const input=document.getElementById('chat-input');
    input.value=text;
    await sendMessage();
  }

  function sendSuggestion(text){
    document.getElementById('chat-input').value=text;
    sendMessage();
  }

  // ── INPUT HELPERS ─────────────────────────────────────────────────────────
  function handleKeydown(e){
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
  }
  function autoResize(el){
    el.style.height='auto';
    el.style.height=Math.min(el.scrollHeight,120)+'px';
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  async function logout(){
    try{await fetch(API.LOGOUT,{method:'POST',headers:H(),body:JSON.stringify({refresh_token:refresh})});}catch{}
    localStorage.clear();window.location.href='../../auth/auth.html';
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  loadConversations();
  document.getElementById('chat-input').focus();