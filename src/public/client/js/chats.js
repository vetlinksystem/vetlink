/* ===========================================================
   CLIENT — MESSAGES (1:1 chat with other pet owners)
   -----------------------------------------------------------
   APIs:
   GET  /client/profile/me
   GET  /client/chats/my
   GET  /client/chats/:id/messages?after=...
   POST /client/chats/:id/messages   { text }
   PUT  /client/chats/:id/read
   GET  /client/pets/my
   GET  /client/breeding/candidates?petId=...
   POST /client/breeding/propose     { myPetId, targetPetId, message, conversationId }
   =========================================================== */
(function () {
  const fetchJSON = async (url, options = {}, timeoutMs = 15000) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        signal: ctl.signal,
        ...options
      });
      clearTimeout(t);
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(t);
      return { ok: false, status: 0, body: { message: err.message } };
    }
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));

  const showToast = (msg) => window.theToast ? window.theToast(msg) : alert(msg);

  // Elements
  const chatList = document.getElementById('chatList');
  const chatListPane = document.getElementById('chatListPane');
  const chatThreadPane = document.getElementById('chatThreadPane');
  const threadHead = document.getElementById('threadHead');
  const threadAvatar = document.getElementById('threadAvatar');
  const threadName = document.getElementById('threadName');
  const threadSub = document.getElementById('threadSub');
  const threadBody = document.getElementById('threadBody');
  const threadEmpty = document.getElementById('threadEmpty');
  const threadComposer = document.getElementById('threadComposer');
  const composerInput = document.getElementById('composerInput');
  const composerSend = document.getElementById('composerSend');
  const backToList = document.getElementById('backToList');
  const proposeFromChat = document.getElementById('proposeFromChat');

  const cpModal = document.getElementById('chatProposeModal');
  const cpMyPet = document.getElementById('cpMyPet');
  const cpTheirPet = document.getElementById('cpTheirPet');
  const cpHint = document.getElementById('cpHint');
  const cpMessage = document.getElementById('cpMessage');
  const cpSubmit = document.getElementById('cpSubmit');

  if (!chatList) return;

  let ME = null;            // my client id
  let CONVOS = [];
  let ACTIVE = null;        // active conversation summary
  let MESSAGES = [];
  let lastMessageId = null;
  let pollTimer = null;
  let listTimer = null;

  const timeOf = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      return sameDay
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const isMobile = () => window.innerWidth <= 860;
  const showThreadMobile = (showThread) => {
    if (!isMobile()) {
      chatListPane.classList.remove('hidden-mobile');
      chatThreadPane.classList.remove('hidden-mobile');
      return;
    }
    chatListPane.classList.toggle('hidden-mobile', showThread);
    chatThreadPane.classList.toggle('hidden-mobile', !showThread);
  };

  // ---------- Conversation list ----------
  const renderList = () => {
    if (!CONVOS.length) {
      chatList.innerHTML = `<p class="muted" style="padding:1rem">No chats yet. Start one from the <a href="/client/breeding">Breeding</a> page.</p>`;
      return;
    }
    chatList.innerHTML = CONVOS.map(c => `
      <div class="chat-item ${ACTIVE && ACTIVE.id === c.id ? 'active' : ''}" data-id="${esc(c.id)}">
        <span class="avatar">${c.otherClient?.avatarUrl
          ? `<img src="${esc(c.otherClient.avatarUrl)}" alt=""/>`
          : esc((c.otherClient?.name || 'P').charAt(0).toUpperCase())}</span>
        <div class="meta">
          <div class="name">${esc(c.otherClient?.name || 'Pet owner')}</div>
          <div class="preview">${esc(c.lastMessage || 'Say hi! 👋')}</div>
        </div>
        <div class="right">
          <span class="when">${esc(timeOf(c.lastMessageAt))}</span>
          ${c.unreadCount ? `<span class="unread">${esc(c.unreadCount)}</span>` : ''}
        </div>
      </div>
    `).join('');

    chatList.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => openConversation(item.getAttribute('data-id')));
    });
  };

  const loadList = async () => {
    const { ok, body } = await fetchJSON('/client/chats/my');
    if (!ok || body.success === false) return;
    CONVOS = Array.isArray(body.conversations) ? body.conversations : [];
    renderList();
  };

  // ---------- Thread ----------
  const bubbleHtml = (m) => {
    if (m.type === 'system') {
      return `<div class="bubble system">${esc(m.text)}</div>`;
    }
    if (m.type === 'breeding_proposal') {
      return `<div class="bubble proposal">💞 ${esc(m.text)}<span class="when">${esc(timeOf(m.createdAt))}</span></div>`;
    }
    const me = String(m.senderId) === String(ME);
    return `<div class="bubble ${me ? 'me' : 'them'}">${esc(m.text)}<span class="when">${esc(timeOf(m.createdAt))}</span></div>`;
  };

  const appendMessages = (msgs, scroll = true) => {
    if (!msgs.length) return;
    threadEmpty.style.display = 'none';
    const atBottom = threadBody.scrollHeight - threadBody.scrollTop - threadBody.clientHeight < 80;
    threadBody.insertAdjacentHTML('beforeend', msgs.map(bubbleHtml).join(''));
    MESSAGES = MESSAGES.concat(msgs);
    lastMessageId = msgs[msgs.length - 1].id;
    if (scroll || atBottom) threadBody.scrollTop = threadBody.scrollHeight;
  };

  const stopPolling = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  const pollNewMessages = async () => {
    if (!ACTIVE || !lastMessageId) return;
    const { ok, body } = await fetchJSON(
      `/client/chats/${encodeURIComponent(ACTIVE.id)}/messages?after=${encodeURIComponent(lastMessageId)}`);
    if (!ok || body.success === false) return;
    const msgs = Array.isArray(body.messages) ? body.messages : [];
    if (msgs.length) {
      appendMessages(msgs, false);
      fetchJSON(`/client/chats/${encodeURIComponent(ACTIVE.id)}/read`, { method: 'PUT' });
    }
  };

  const openConversation = async (conversationId) => {
    const convo = CONVOS.find(c => String(c.id) === String(conversationId));
    if (!convo) return;
    ACTIVE = convo;
    MESSAGES = [];
    lastMessageId = null;
    stopPolling();

    // Header
    threadHead.style.display = '';
    threadComposer.style.display = '';
    threadAvatar.innerHTML = convo.otherClient?.avatarUrl
      ? `<img src="${esc(convo.otherClient.avatarUrl)}" alt=""/>`
      : esc((convo.otherClient?.name || 'P').charAt(0).toUpperCase());
    threadName.textContent = convo.otherClient?.name || 'Pet owner';
    threadSub.textContent = '';

    threadBody.innerHTML = '';
    threadEmpty.style.display = 'none';
    threadBody.insertAdjacentHTML('beforeend', '<p class="muted" id="threadLoading" style="text-align:center">Loading…</p>');

    renderList();
    showThreadMobile(true);

    const { ok, body } = await fetchJSON(`/client/chats/${encodeURIComponent(conversationId)}/messages`);
    const loading = document.getElementById('threadLoading');
    if (loading) loading.remove();

    if (!ok || body.success === false) {
      threadBody.innerHTML = `<p class="muted" style="text-align:center">${esc(body?.message || 'Could not load messages.')}</p>`;
      return;
    }

    const msgs = Array.isArray(body.messages) ? body.messages : [];
    if (!msgs.length) {
      threadBody.innerHTML = `<div class="bubble system">This is the start of your conversation. Say hi! 👋</div>`;
    } else {
      appendMessages(msgs, true);
    }

    // Mark read + clear badge locally
    fetchJSON(`/client/chats/${encodeURIComponent(conversationId)}/read`, { method: 'PUT' });
    convo.unreadCount = 0;
    renderList();

    pollTimer = setInterval(pollNewMessages, 4000);
  };

  // ---------- Send ----------
  const send = async () => {
    const text = (composerInput.value || '').trim();
    if (!text || !ACTIVE) return;
    composerInput.value = '';
    composerSend.disabled = true;

    const { ok, body } = await fetchJSON(`/client/chats/${encodeURIComponent(ACTIVE.id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    composerSend.disabled = false;

    if (!ok || body.success === false) {
      showToast(body?.message || 'Failed to send.');
      composerInput.value = text;
      return;
    }
    if (body.message && body.message.id) {
      appendMessages([body.message], true);
    }
    loadList();
  };

  composerSend.addEventListener('click', send);
  composerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  backToList.addEventListener('click', () => showThreadMobile(false));

  // ---------- Propose from chat ----------
  let MY_PETS = [];
  let CP_CANDIDATES = [];

  const closeCpModal = () => cpModal.classList.remove('show');
  cpModal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeCpModal));
  cpModal.addEventListener('click', (e) => { if (e.target === cpModal) closeCpModal(); });

  const loadTheirPets = async () => {
    cpTheirPet.innerHTML = '<option value="">Loading…</option>';
    cpHint.textContent = '';
    CP_CANDIDATES = [];
    const myPetId = cpMyPet.value;
    if (!myPetId || !ACTIVE) {
      cpTheirPet.innerHTML = '<option value="">—</option>';
      return;
    }
    const { ok, body } = await fetchJSON(`/client/breeding/candidates?petId=${encodeURIComponent(myPetId)}`);
    if (!ok || body.success === false) {
      cpTheirPet.innerHTML = '<option value="">—</option>';
      cpHint.textContent = body?.message || 'Could not load matching pets.';
      return;
    }
    const theirs = (body.candidates || []).filter(c =>
      String(c.owner?.id) === String(ACTIVE.otherClient?.id) && !c.proposal);
    CP_CANDIDATES = theirs;
    if (!theirs.length) {
      cpTheirPet.innerHTML = '<option value="">No available match</option>';
      cpHint.textContent = `${ACTIVE.otherClient?.name || 'This owner'} has no available pet that matches (same species, opposite sex, breeding allowed, no open proposal).`;
      return;
    }
    cpTheirPet.innerHTML = theirs.map(c =>
      `<option value="${esc(c.pet.id)}">${esc(c.pet.name)} — ${esc(c.pet.breed || c.pet.species || '')} (${esc(c.pet.sex)})</option>`).join('');
  };

  cpMyPet.addEventListener('change', loadTheirPets);

  proposeFromChat.addEventListener('click', async () => {
    if (!ACTIVE) return;
    if (!MY_PETS.length) {
      const { ok, body } = await fetchJSON('/client/pets/my');
      if (ok && body.success !== false) MY_PETS = Array.isArray(body.pets) ? body.pets : [];
    }
    const eligible = MY_PETS.filter(p => p.breedingAllowed && p.sex);
    if (!eligible.length) {
      showToast('None of your pets are available for breeding. Enable breeding on a pet first.');
      return;
    }
    cpMyPet.innerHTML = eligible.map(p =>
      `<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.breed || p.species || '')} (${esc(p.sex)})</option>`).join('');
    cpMessage.value = '';
    cpModal.classList.add('show');
    loadTheirPets();
  });

  cpSubmit.addEventListener('click', async () => {
    if (!ACTIVE) return;
    const myPetId = cpMyPet.value;
    const targetPetId = cpTheirPet.value;
    if (!myPetId || !targetPetId) {
      showToast('Pick both pets first.');
      return;
    }
    cpSubmit.disabled = true;
    cpSubmit.textContent = 'Sending…';
    const { ok, body } = await fetchJSON('/client/breeding/propose', {
      method: 'POST',
      body: JSON.stringify({
        myPetId,
        targetPetId,
        message: cpMessage.value.trim(),
        conversationId: ACTIVE.id
      })
    });
    cpSubmit.disabled = false;
    cpSubmit.textContent = 'Send proposal';
    if (!ok || body.success === false) {
      showToast(body?.message || 'Failed to send proposal.');
      return;
    }
    closeCpModal();
    showToast('Proposal sent!');
    pollNewMessages(); // the proposal card lands in the thread
  });

  // ---------- Init ----------
  (async function bootstrap() {
    const me = await fetchJSON('/client/profile/me');
    ME = me.body?.client?.id || null;

    await loadList();
    listTimer = setInterval(loadList, 15000);

    const params = new URLSearchParams(window.location.search);
    const open = params.get('c');
    if (open && CONVOS.some(c => String(c.id) === String(open))) {
      openConversation(open);
    } else {
      showThreadMobile(false);
    }
  })();
})();
