/* ===========================================================
   EMPLOYEE — MESSAGES (clinic ↔ pet owner)
   -----------------------------------------------------------
   "Message veterinarian to costumer": the clinic can open a thread
   with an owner about one of their pets.

   APIs:
     GET  /employee/chats/my
     POST /employee/chats/start          { clientId, petId?, text }
     GET  /employee/chats/:id/messages   ?after=<messageId>
     POST /employee/chats/:id/messages   { text }
     PUT  /employee/chats/:id/read
     GET  /employee/users/get-all        (owner picker)
     GET  /employee/pets/register        (pet picker)
   =========================================================== */
(function () {
  const API_MY      = '/employee/chats/my';
  const API_START   = '/employee/chats/start';
  const API_MSGS    = (id) => `/employee/chats/${encodeURIComponent(id)}/messages`;
  const API_READ    = (id) => `/employee/chats/${encodeURIComponent(id)}/read`;
  const API_CLIENTS = '/employee/users/get-all';
  const API_PETS    = '/employee/pets/register';

  const $ = (id) => document.getElementById(id);

  const convosEl   = $('msConversations');
  const messagesEl = $('msMessages');
  const searchBox  = $('msSearch');
  const threadHead = $('msThreadHead');
  const threadName = $('msThreadName');
  const threadMeta = $('msThreadMeta');
  const ownerLink  = $('msThreadOwnerLink');
  const form       = $('msForm');
  const textInput  = $('msText');
  const sendBtn    = $('msSend');
  const navUnread  = $('navUnread');
  const toastEl    = $('msToast');

  const newBtn     = $('msNewBtn');
  const newModal   = $('msNewModal');
  const newForm    = $('msNewForm');
  const newClient  = $('msNewClient');
  const newPet     = $('msNewPet');
  const newText    = $('msNewText');
  const newSend    = $('msNewSend');

  if (!convosEl) return;

  let CONVOS = [];
  let PETS = [];
  let activeId = null;
  let lastMessageId = null;
  let pollTimer = null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const toast = (msg) => {
    if (!toastEl) { alert(msg); return; }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2400);
  };

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

  const fmtWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit' });
  };

  const myId = () => String(window.VETLINK_EMPLOYEE?.id || '');

  // ===== Conversation list =====

  const renderConvos = () => {
    const q = (searchBox?.value || '').trim().toLowerCase();
    const list = CONVOS.filter(c => {
      if (!q) return true;
      return [c.client?.name, c.lastMessage, ...(c.petNames || [])]
        .some(v => String(v || '').toLowerCase().includes(q));
    });

    const totalUnread = CONVOS.reduce((n, c) => n + (c.unreadCount || 0), 0);
    if (navUnread) {
      navUnread.textContent = String(totalUnread);
      navUnread.hidden = totalUnread === 0;
    }

    if (!list.length) {
      convosEl.innerHTML = `<p class="ms-muted">${q ? 'No conversations match.' : 'No conversations yet.'}</p>`;
      return;
    }

    convosEl.innerHTML = list.map(c => `
      <button type="button" class="ms-convo ${String(c.id) === String(activeId) ? 'active' : ''}"
              data-convo="${esc(c.id)}">
        <div class="ms-convo-top">
          <strong>${esc(c.client?.name || 'Pet owner')}</strong>
          <span class="ms-when">${esc(fmtWhen(c.lastMessageAt))}</span>
        </div>
        ${(c.petNames || []).length
          ? `<div class="ms-about">about ${esc(c.petNames.join(', '))}</div>` : ''}
        <div class="ms-preview">${esc(c.lastMessage || 'No messages yet')}</div>
        ${c.unreadCount ? `<span class="ms-unread">${esc(c.unreadCount)}</span>` : ''}
      </button>
    `).join('');

    convosEl.querySelectorAll('[data-convo]').forEach(b =>
      b.addEventListener('click', () => openConversation(b.getAttribute('data-convo'))));
  };

  const loadConvos = async () => {
    const { ok, status, body } = await fetchJSON(API_MY);
    if (!ok) {
      const msg = status === 403
        ? (body?.message || 'You are not allowed to view messages.')
        : 'Failed to load conversations.';
      convosEl.innerHTML = `<p class="ms-muted">${esc(msg)}</p>`;
      return;
    }
    CONVOS = Array.isArray(body.conversations) ? body.conversations : [];
    renderConvos();
  };

  // ===== Thread =====

  const bubbleHTML = (m) => {
    const mine = String(m.senderId) === myId();
    if (m.type === 'system') {
      return `<div class="ms-system">${esc(m.text)}</div>`;
    }
    return `
      <div class="ms-bubble ${mine ? 'mine' : 'theirs'}">
        <div class="ms-text">${esc(m.text)}</div>
        <div class="ms-time">${esc(fmtWhen(m.createdAt))}</div>
      </div>`;
  };

  const renderMessages = (messages, { append = false } = {}) => {
    const html = messages.map(bubbleHTML).join('');
    if (append) messagesEl.insertAdjacentHTML('beforeend', html);
    else messagesEl.innerHTML = html || '<p class="ms-empty">No messages yet. Say hello.</p>';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const openConversation = async (id) => {
    activeId = id;
    lastMessageId = null;
    renderConvos();

    const convo = CONVOS.find(c => String(c.id) === String(id));
    if (convo) {
      threadHead.hidden = false;
      threadName.textContent = convo.client?.name || 'Pet owner';
      threadMeta.textContent = (convo.petNames || []).length
        ? `about ${convo.petNames.join(', ')}`
        : 'Pet owner';
      ownerLink.href = `/employee/user?id=${encodeURIComponent(convo.client?.id || '')}`;
      form.hidden = false;
    }

    messagesEl.innerHTML = '<p class="ms-empty">Loading…</p>';
    const { ok, body } = await fetchJSON(API_MSGS(id));
    if (!ok || body.success === false) {
      messagesEl.innerHTML = `<p class="ms-empty">${esc(body?.message || 'Could not load messages.')}</p>`;
      return;
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    renderMessages(messages);
    if (messages.length) lastMessageId = messages[messages.length - 1].id;

    // Clear the unread badge for this thread.
    await fetchJSON(API_READ(id), { method: 'PUT' });
    if (convo) convo.unreadCount = 0;
    renderConvos();

    startPolling();
  };

  /** Poll for new messages in the open thread, and refresh the list periodically. */
  const startPolling = () => {
    stopPolling();
    pollTimer = setInterval(async () => {
      if (!activeId) return;
      const url = lastMessageId
        ? `${API_MSGS(activeId)}?after=${encodeURIComponent(lastMessageId)}`
        : API_MSGS(activeId);
      const { ok, body } = await fetchJSON(url);
      if (!ok || body.success === false) return;

      const fresh = Array.isArray(body.messages) ? body.messages : [];
      if (fresh.length) {
        renderMessages(fresh, { append: !!lastMessageId });
        lastMessageId = fresh[fresh.length - 1].id;
        await fetchJSON(API_READ(activeId), { method: 'PUT' });
      }
      loadConvos();
    }, 8000);
  };

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  };

  window.addEventListener('beforeunload', stopPolling);

  // ===== Send =====

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (textInput.value || '').trim();
    if (!text || !activeId) return;

    sendBtn.disabled = true;
    const { ok, body } = await fetchJSON(API_MSGS(activeId), {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    sendBtn.disabled = false;

    if (!ok || body.success === false) {
      toast(body?.message || 'Failed to send.');
      return;
    }

    textInput.value = '';
    if (body.message) {
      renderMessages([body.message], { append: true });
      lastMessageId = body.message.id;
    }
    loadConvos();
  });

  // Enter sends, shift+Enter makes a new line.
  textInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ===== New message =====

  const openNew = async () => {
    newForm.reset();
    newPet.innerHTML = '<option value="">Not about a specific pet</option>';
    newModal.classList.add('show');
    newModal.setAttribute('aria-hidden', 'false');

    if (!newClient.options.length) {
      const { ok, body } = await fetchJSON(`${API_CLIENTS}?limit=500&offset=0`);
      const items = ok ? (body.items || body || []) : [];
      const clients = Array.isArray(items) ? items : [];
      newClient.innerHTML = '<option value="">Select owner…</option>' +
        clients.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.email || c.id)}</option>`).join('');
    }

    if (!PETS.length) {
      const { ok, body } = await fetchJSON(API_PETS);
      if (ok) PETS = Array.isArray(body.pets) ? body.pets : [];
    }
  };

  const closeNew = () => {
    newModal.classList.remove('show');
    newModal.setAttribute('aria-hidden', 'true');
  };

  newBtn?.addEventListener('click', openNew);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ms-close]')) closeNew();
  });

  // Only that owner's pets can be the subject of the thread.
  newClient?.addEventListener('change', () => {
    const ownerId = newClient.value;
    const theirs = PETS.filter(p => String(p.ownerId) === String(ownerId));
    newPet.innerHTML = '<option value="">Not about a specific pet</option>' +
      theirs.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.breed ? ` (${esc(p.breed)})` : ''}</option>`).join('');
  });

  newForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = newClient.value;
    const text = (newText.value || '').trim();

    if (!clientId) { toast('Select the pet owner.'); return; }
    if (!text) { toast('Write a message.'); return; }

    newSend.disabled = true;
    const { ok, body } = await fetchJSON(API_START, {
      method: 'POST',
      body: JSON.stringify({ clientId, petId: newPet.value || undefined, text })
    });
    newSend.disabled = false;

    if (!ok || body.success === false) {
      toast(body?.message || 'Failed to send the message.');
      return;
    }

    closeNew();
    toast(body.created ? 'Conversation started.' : 'Message sent.');
    await loadConvos();
    openConversation(body.conversationId);
  });

  // ===== Filters =====
  searchBox?.addEventListener('input', renderConvos);

  // ===== Init =====
  // core.js resolves the employee asynchronously; myId() is needed to align bubbles,
  // so wait for it before the first render.
  document.addEventListener('vetlink:role-ready', () => {
    if (activeId) openConversation(activeId);
  });

  loadConvos();
})();
