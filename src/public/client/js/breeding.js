/* ===========================================================
   CLIENT — BREEDING (find a match, propose, respond, withdraw)
   -----------------------------------------------------------
   APIs:
   GET  /client/pets/my
   GET  /client/breeding/candidates?petId=...
   POST /client/breeding/propose      { myPetId, targetPetId, message }
   GET  /client/breeding/my
   PUT  /client/breeding/respond      { id, decision: 'accept'|'decline' }
   PUT  /client/breeding/cancel       { id }
   POST /client/chats/start           { otherClientId, myPetId, otherPetId }
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
  const myPetChips = document.getElementById('myPetChips');
  const candidatesGrid = document.getElementById('candidatesGrid');
  const candidatesHint = document.getElementById('candidatesHint');
  const proposalsList = document.getElementById('proposalsList');
  const proposalsBadge = document.getElementById('proposalsBadge');
  const matchPane = document.getElementById('matchPane');
  const proposalsPane = document.getElementById('proposalsPane');
  const tabMatch = document.getElementById('tabMatch');
  const tabProposals = document.getElementById('tabProposals');

  const proposeModal = document.getElementById('proposeModal');
  const proposePair = document.getElementById('proposePair');
  const proposeMessage = document.getElementById('proposeMessage');
  const proposeSubmit = document.getElementById('proposeSubmit');

  if (!myPetChips) return;

  let MY_PETS = [];
  let SELECTED_PET = null;
  let CANDIDATES = [];
  let PROPOSALS = [];
  let proposeTarget = null;

  const sexIcon = (sex) => String(sex).toLowerCase() === 'female' ? '♀' : '♂';

  // ---------- Tabs ----------
  const showTab = (tab) => {
    const match = tab === 'match';
    matchPane.style.display = match ? '' : 'none';
    proposalsPane.style.display = match ? 'none' : '';
    tabMatch.classList.toggle('active', match);
    tabProposals.classList.toggle('active', !match);
    if (!match) loadProposals();
  };
  tabMatch.addEventListener('click', () => showTab('match'));
  tabProposals.addEventListener('click', () => showTab('proposals'));

  // ---------- My pets ----------
  const renderMyPets = () => {
    if (!MY_PETS.length) {
      myPetChips.innerHTML = `<p class="muted">You have no pets yet. <a href="/client/pets">Add a pet</a> first.</p>`;
      return;
    }
    myPetChips.innerHTML = MY_PETS.map(p => {
      const eligible = p.breedingAllowed && p.sex;
      const title = !p.breedingAllowed
        ? 'Not allowed for breeding — edit the pet to enable it'
        : (!p.sex ? 'Set this pet’s sex first' : '');
      return `
        <div class="pet-chip ${eligible ? '' : 'disabled'} ${SELECTED_PET && SELECTED_PET.id === p.id ? 'selected' : ''}"
             data-pet="${esc(p.id)}" data-eligible="${eligible ? '1' : ''}" title="${esc(title)}">
          <span class="avatar">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt=""/>` : esc((p.name || 'P').charAt(0).toUpperCase())}</span>
          <span>${esc(p.name)} ${p.sex ? sexIcon(p.sex) : ''}</span>
        </div>
      `;
    }).join('');

    myPetChips.querySelectorAll('.pet-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (!chip.getAttribute('data-eligible')) {
          showToast(chip.getAttribute('title') || 'This pet cannot breed yet.');
          return;
        }
        const id = chip.getAttribute('data-pet');
        SELECTED_PET = MY_PETS.find(p => String(p.id) === String(id)) || null;
        renderMyPets();
        loadCandidates();
      });
    });
  };

  // ---------- Candidates ----------
  const renderCandidates = () => {
    if (!SELECTED_PET) {
      candidatesHint.style.display = '';
      candidatesGrid.innerHTML = '';
      return;
    }
    candidatesHint.style.display = 'none';

    if (!CANDIDATES.length) {
      candidatesGrid.innerHTML = `<p class="muted">No available ${esc(SELECTED_PET.species || '')} partners for ${esc(SELECTED_PET.name)} right now. Check back later!</p>`;
      return;
    }

    candidatesGrid.innerHTML = CANDIDATES.map(c => {
      const p = c.pet || {};
      const proposal = c.proposal;
      let actionHtml;
      if (proposal) {
        const label = proposal.status === 'pending'
          ? (proposal.direction === 'outgoing' ? 'Proposal sent' : 'They proposed — check My proposals')
          : `Proposal ${proposal.status}`;
        actionHtml = `<span class="status-pill ${esc(proposal.status)}" style="flex:1;text-align:center">${esc(label)}</span>
          <button class="btn secondary js-chat" data-pet="${esc(p.id)}">💬 Chat</button>`;
      } else {
        actionHtml = `
          <button class="btn js-propose" data-pet="${esc(p.id)}">💞 Propose</button>
          <button class="btn secondary js-chat" data-pet="${esc(p.id)}">💬 Chat</button>`;
      }
      return `
        <article class="cand-card">
          <div class="cand-photo">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt=""/>` : '🐾'}</div>
          <div class="cand-body">
            <h3 class="cand-name">${esc(p.name)} ${sexIcon(p.sex)}</h3>
            <div class="cand-sub">${esc(p.breed || p.species || '')}</div>
            <div class="cand-meta">
              <span class="chip">${esc(p.species || 'Pet')}</span>
              <span class="chip">${esc(p.sex || '')}</span>
              ${typeof p.age === 'number' ? `<span class="chip">${esc(p.age)} yr(s)</span>` : ''}
            </div>
            <div class="cand-owner">👤 ${esc(c.owner?.name || 'Pet owner')}</div>
          </div>
          <div class="cand-actions">${actionHtml}</div>
        </article>
      `;
    }).join('');

    candidatesGrid.querySelectorAll('.js-propose').forEach(b => {
      b.addEventListener('click', () => openProposeModal(b.getAttribute('data-pet')));
    });
    candidatesGrid.querySelectorAll('.js-chat').forEach(b => {
      b.addEventListener('click', () => startChat(b.getAttribute('data-pet')));
    });
  };

  const loadCandidates = async () => {
    if (!SELECTED_PET) return;
    candidatesGrid.innerHTML = '<p class="muted">Looking for partners…</p>';
    candidatesHint.style.display = 'none';
    const { ok, body } = await fetchJSON(`/client/breeding/candidates?petId=${encodeURIComponent(SELECTED_PET.id)}`);
    if (!ok || body.success === false) {
      CANDIDATES = [];
      candidatesGrid.innerHTML = `<p class="muted">${esc(body?.message || 'Could not load candidates.')}</p>`;
      return;
    }
    CANDIDATES = Array.isArray(body.candidates) ? body.candidates : [];
    renderCandidates();
  };

  // ---------- Propose ----------
  const openProposeModal = (targetPetId) => {
    const c = CANDIDATES.find(x => String(x.pet?.id) === String(targetPetId));
    if (!c || !SELECTED_PET) return;
    proposeTarget = c;

    const side = (pet) => `
      <div class="side">
        <div class="ph">${pet.imageUrl ? `<img src="${esc(pet.imageUrl)}" alt=""/>` : '🐾'}</div>
        <div class="nm">${esc(pet.name)} ${sexIcon(pet.sex)}</div>
        <small class="muted">${esc(pet.breed || pet.species || '')}</small>
      </div>`;
    proposePair.innerHTML = `${side(SELECTED_PET)}<div class="heart">💞</div>${side(c.pet)}`;
    proposeMessage.value = '';
    proposeModal.classList.add('show');
  };

  const closeProposeModal = () => proposeModal.classList.remove('show');
  proposeModal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeProposeModal));
  proposeModal.addEventListener('click', (e) => { if (e.target === proposeModal) closeProposeModal(); });

  proposeSubmit.addEventListener('click', async () => {
    if (!proposeTarget || !SELECTED_PET) return;
    proposeSubmit.disabled = true;
    proposeSubmit.textContent = 'Sending…';

    const { ok, body } = await fetchJSON('/client/breeding/propose', {
      method: 'POST',
      body: JSON.stringify({
        myPetId: SELECTED_PET.id,
        targetPetId: proposeTarget.pet.id,
        message: proposeMessage.value.trim()
      })
    });

    proposeSubmit.disabled = false;
    proposeSubmit.textContent = 'Send proposal';

    if (!ok || body.success === false) {
      showToast(body?.message || 'Failed to send proposal.');
      return;
    }
    closeProposeModal();
    showToast('Proposal sent! The owner has been notified.');
    loadCandidates();
  });

  // ---------- Chat ----------
  const startChat = async (targetPetId) => {
    const c = CANDIDATES.find(x => String(x.pet?.id) === String(targetPetId));
    if (!c) return;
    const { ok, body } = await fetchJSON('/client/chats/start', {
      method: 'POST',
      body: JSON.stringify({
        otherClientId: c.owner?.id,
        myPetId: SELECTED_PET?.id,
        otherPetId: c.pet?.id
      })
    });
    if (!ok || body.success === false || !body.conversationId) {
      showToast(body?.message || 'Could not open chat.');
      return;
    }
    window.location.href = `/client/chats?c=${encodeURIComponent(body.conversationId)}`;
  };

  // ---------- Proposals ----------
  const statusLabel = {
    pending: 'Waiting for response',
    accepted: 'Accepted — waiting for clinic approval',
    approved: 'Approved by clinic ✅',
    rejected: 'Rejected',
    cancelled: 'Cancelled'
  };

  const renderProposals = () => {
    const open = PROPOSALS.filter(p => p.direction === 'incoming' && p.status === 'pending').length;
    proposalsBadge.style.display = open ? '' : 'none';
    proposalsBadge.textContent = String(open);

    if (!PROPOSALS.length) {
      proposalsList.innerHTML = '<p class="muted">No breeding proposals yet. Find a match and send one!</p>';
      return;
    }

    proposalsList.innerHTML = PROPOSALS.map(p => {
      const dirText = p.direction === 'incoming'
        ? `${esc(p.otherOwner?.name || 'Someone')} proposed to you`
        : (p.direction === 'outgoing' ? `You proposed to ${esc(p.otherOwner?.name || 'someone')}` : 'Clinic proposal');

      const avatar = (pet) => `
        <span class="prop-avatar">${pet?.imageUrl ? `<img src="${esc(pet.imageUrl)}" alt=""/>` : '🐾'}</span>`;

      let actions = '';
      if (p.status === 'pending' && p.direction === 'incoming') {
        actions = `
          <button class="btn js-accept" data-id="${esc(p.id)}">Accept</button>
          <button class="btn secondary js-decline" data-id="${esc(p.id)}">Decline</button>`;
      } else if (p.status === 'pending' && p.direction === 'outgoing') {
        actions = `<button class="btn secondary js-withdraw" data-id="${esc(p.id)}">Withdraw</button>`;
      }
      actions += `<button class="btn ghost js-chat-owner" data-owner="${esc(p.otherOwner?.id || '')}" data-mypet="${esc(p.myPet?.id || '')}" data-otherpet="${esc(p.otherPet?.id || '')}">💬 Chat</button>`;

      return `
        <div class="prop-card">
          <div class="prop-row">
            <div>
              <div class="prop-pets">
                ${avatar(p.myPet)} ${esc(p.myPet?.name || '?')}
                <span class="x">×</span>
                ${avatar(p.otherPet)} ${esc(p.otherPet?.name || '?')}
              </div>
              <div class="prop-sub">
                ${dirText} • ${esc(p.requestedAt || '')}
                ${p.message ? `<br/>💬 “${esc(p.message)}”` : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.5rem;align-items:flex-end">
              <span class="status-pill ${esc(p.status)}">${esc(statusLabel[p.status] || p.status)}</span>
              <div class="prop-actions">${actions}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const respond = async (id, decision) => {
      const { ok, body } = await fetchJSON('/client/breeding/respond', {
        method: 'PUT',
        body: JSON.stringify({ id, decision })
      });
      if (!ok || body.success === false) {
        showToast(body?.message || 'Failed.');
        return;
      }
      showToast(decision === 'accept' ? 'Accepted! The clinic will review it.' : 'Declined.');
      loadProposals();
    };

    proposalsList.querySelectorAll('.js-accept').forEach(b =>
      b.addEventListener('click', () => respond(b.getAttribute('data-id'), 'accept')));
    proposalsList.querySelectorAll('.js-decline').forEach(b =>
      b.addEventListener('click', () => respond(b.getAttribute('data-id'), 'decline')));
    proposalsList.querySelectorAll('.js-withdraw').forEach(b =>
      b.addEventListener('click', async () => {
        const { ok, body } = await fetchJSON('/client/breeding/cancel', {
          method: 'PUT',
          body: JSON.stringify({ id: b.getAttribute('data-id') })
        });
        if (!ok || body.success === false) { showToast(body?.message || 'Failed.'); return; }
        showToast('Proposal withdrawn.');
        loadProposals();
      }));
    proposalsList.querySelectorAll('.js-chat-owner').forEach(b =>
      b.addEventListener('click', async () => {
        const { ok, body } = await fetchJSON('/client/chats/start', {
          method: 'POST',
          body: JSON.stringify({
            otherClientId: b.getAttribute('data-owner'),
            myPetId: b.getAttribute('data-mypet'),
            otherPetId: b.getAttribute('data-otherpet')
          })
        });
        if (!ok || body.success === false || !body.conversationId) {
          showToast(body?.message || 'Could not open chat.');
          return;
        }
        window.location.href = `/client/chats?c=${encodeURIComponent(body.conversationId)}`;
      }));
  };

  const loadProposals = async () => {
    const { ok, body } = await fetchJSON('/client/breeding/my');
    if (!ok || body.success === false) {
      proposalsList.innerHTML = `<p class="muted">${esc(body?.message || 'Could not load proposals.')}</p>`;
      return;
    }
    PROPOSALS = Array.isArray(body.proposals) ? body.proposals : [];
    renderProposals();
  };

  // ---------- Init ----------
  (async function bootstrap() {
    myPetChips.innerHTML = '<p class="muted">Loading your pets…</p>';
    const { ok, body } = await fetchJSON('/client/pets/my');
    if (!ok || body.success === false) {
      myPetChips.innerHTML = `<p class="muted">${esc(body?.message || 'Could not load your pets.')}</p>`;
      return;
    }
    MY_PETS = Array.isArray(body.pets) ? body.pets : [];
    renderMyPets();

    // Auto-select first eligible pet
    const eligible = MY_PETS.find(p => p.breedingAllowed && p.sex);
    if (eligible) {
      SELECTED_PET = eligible;
      renderMyPets();
      loadCandidates();
    }

    // Badge for incoming proposals on first load
    loadProposals();

    // Deep link: /client/breeding?tab=proposals
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'proposals') showTab('proposals');
  })();
})();
