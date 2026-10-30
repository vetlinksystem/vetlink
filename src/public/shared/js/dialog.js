/* src/public/shared/js/dialog.js
 * In-app replacement for the browser's alert() / confirm().
 *
 * The native boxes show the host name ("vetlink-9x1g.onrender.com says"), ignore the
 * clinic's styling and block the page. This draws a proper dialog instead, styled with
 * the same beige tokens as the rest of the site, and is loaded on both the client and
 * employee sides (before core.js).
 *
 * Usage:
 *   await vetlinkDialog.alert('Vaccine name is required.', { variant: 'error' });
 *   const ok = await vetlinkDialog.confirm({
 *     title: 'Delete appointment?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true
 *   });
 *
 * variant: 'info' | 'success' | 'warning' | 'error'
 * confirmText: (confirm only) a word the user must type before OK enables, for
 *              irreversible actions such as the admin data reset.
 */
(function () {
  if (window.vetlinkDialog) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));

  const ICONS = {
    info:    '<path d="M12 8h.01M11 12h1v5h1"/><circle cx="12" cy="12" r="9"/>',
    success: '<path d="M8 12.5l2.5 2.5L16 9.5"/><circle cx="12" cy="12" r="9"/>',
    warning: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    error:   '<path d="M15 9l-6 6M9 9l6 6"/><circle cx="12" cy="12" r="9"/>'
  };

  const TITLES = { info: 'Notice', success: 'Done', warning: 'Please check', error: 'Something went wrong' };

  const CSS = `
    .vdlg{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px}
    .vdlg-backdrop{position:absolute;inset:0;background:rgba(43,33,22,.38);backdrop-filter:blur(2px);
      opacity:0;transition:opacity .16s ease}
    .vdlg-card{position:relative;width:min(420px,100%);background:#fff;border-radius:16px;
      border:1px solid var(--border,#E8DFD0);box-shadow:0 20px 48px rgba(43,33,22,.22);
      padding:22px 22px 18px;font:inherit;color:var(--ink,#2B2116);
      opacity:0;transform:translateY(8px) scale(.98);transition:opacity .16s ease,transform .16s ease}
    .vdlg.in .vdlg-backdrop{opacity:1}
    .vdlg.in .vdlg-card{opacity:1;transform:none}
    .vdlg-head{display:flex;gap:14px;align-items:flex-start}
    .vdlg-icon{flex:0 0 40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center}
    .vdlg-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .vdlg--info .vdlg-icon{background:var(--container,#F3E9D7);color:var(--brand-ink,#7A5A2E)}
    .vdlg--success .vdlg-icon{background:#E4F0E8;color:#2F6B48}
    .vdlg--warning .vdlg-icon{background:#FFF4E0;color:#9A5B00}
    .vdlg--error .vdlg-icon{background:#FDECEA;color:#B42318}
    .vdlg-title{margin:0 0 4px;font-size:17px;font-weight:700;line-height:1.3}
    .vdlg-msg{margin:0;font-size:14px;line-height:1.55;color:#5B4D3C;white-space:pre-line;word-break:break-word}
    .vdlg-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
    .vdlg-btn{font:inherit;font-size:14px;font-weight:600;border-radius:10px;padding:9px 16px;cursor:pointer;
      border:1px solid var(--border,#E8DFD0);background:#fff;color:inherit;min-width:84px}
    .vdlg-btn:hover{background:#FAF6EF}
    .vdlg-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(200,160,106,.35)}
    .vdlg-btn--primary{background:var(--brand,#C8A06A);border-color:var(--brand,#C8A06A);color:#fff}
    .vdlg-btn--primary:hover{background:var(--brand-ink,#A8834F);border-color:var(--brand-ink,#A8834F)}
    .vdlg-btn--danger{background:#C0392B;border-color:#C0392B;color:#fff}
    .vdlg-btn--danger:hover{background:#A93226;border-color:#A93226}
    .vdlg-btn:disabled{opacity:.45;cursor:not-allowed}
    .vdlg-typed{display:flex;flex-direction:column;gap:6px;margin-top:16px;font-size:13px;color:#5B4D3C}
    .vdlg-typed input{font:inherit;font-size:14px;padding:9px 11px;border:1px solid var(--border,#E8DFD0);border-radius:10px}
    .vdlg-typed input:focus{outline:none;border-color:#C0392B;box-shadow:0 0 0 3px rgba(192,57,43,.15)}
    @media (max-width:480px){.vdlg-actions{flex-direction:column-reverse}.vdlg-btn{width:100%}}
  `;

  const injectStyles = () => {
    if (document.getElementById('vdlg-styles')) return;
    const style = document.createElement('style');
    style.id = 'vdlg-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  };

  // Dialogs queue rather than stack, so two quick errors read one after the other.
  let chain = Promise.resolve();

  const show = (opts) => {
    const run = () => new Promise((resolve) => {
      injectStyles();
      const variant = ICONS[opts.variant] ? opts.variant : 'info';
      const root = document.createElement('div');
      root.className = `vdlg vdlg--${variant}`;
      root.setAttribute('role', opts.cancelLabel ? 'alertdialog' : 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.innerHTML = `
        <div class="vdlg-backdrop"></div>
        <div class="vdlg-card">
          <div class="vdlg-head">
            <span class="vdlg-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[variant]}</svg></span>
            <div>
              <h2 class="vdlg-title">${esc(opts.title || TITLES[variant])}</h2>
              ${opts.message ? `<p class="vdlg-msg">${esc(opts.message)}</p>` : ''}
            </div>
          </div>
          ${opts.confirmText ? `
            <label class="vdlg-typed"><span>Type <b>${esc(opts.confirmText)}</b> to confirm</span>
              <input type="text" autocomplete="off" spellcheck="false" data-vdlg-typed/>
            </label>` : ''}
          <div class="vdlg-actions">
            ${opts.cancelLabel ? `<button type="button" class="vdlg-btn" data-vdlg="0">${esc(opts.cancelLabel)}</button>` : ''}
            <button type="button" class="vdlg-btn ${opts.danger ? 'vdlg-btn--danger' : 'vdlg-btn--primary'}" data-vdlg="1">
              ${esc(opts.okLabel || 'OK')}
            </button>
          </div>
        </div>`;

      const previousFocus = document.activeElement;

      // Type-to-confirm: OK stays disabled until the exact word is typed.
      const okBtn = root.querySelector('[data-vdlg="1"]');
      const typed = root.querySelector('[data-vdlg-typed]');
      const typedOk = () => !typed || typed.value.trim() === opts.confirmText;
      if (typed) {
        okBtn.disabled = true;
        typed.addEventListener('input', () => { okBtn.disabled = !typedOk(); });
      }

      const close = (result) => {
        document.removeEventListener('keydown', onKey, true);
        root.classList.remove('in');
        setTimeout(() => root.remove(), 160);
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        resolve(result);
      };

      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (typedOk()) close(true); }
        else if (e.key === 'Tab') {
          // Keep focus inside the dialog.
          const btns = Array.from(root.querySelectorAll('input, button:not(:disabled)'));
          const i = btns.indexOf(document.activeElement);
          e.preventDefault();
          btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
        }
      };

      root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-vdlg]');
        if (btn) return close(btn.dataset.vdlg === '1');
        // Clicking outside only dismisses a plain notice, never a pending decision.
        if (e.target.classList.contains('vdlg-backdrop') && !opts.cancelLabel) close(false);
      });
      document.addEventListener('keydown', onKey, true);

      document.body.appendChild(root);
      requestAnimationFrame(() => root.classList.add('in'));
      (typed || okBtn).focus();
    });

    const p = chain.then(run);
    chain = p.catch(() => {});
    return p;
  };

  const alertDialog = (message, opts = {}) =>
    show({ ...opts, message, cancelLabel: null }).then(() => undefined);

  const confirmDialog = (opts = {}) => show({
    ...opts,
    variant: opts.variant || (opts.danger ? 'warning' : 'info'),
    title: opts.title || 'Please confirm',
    okLabel: opts.confirmLabel || 'Confirm',
    cancelLabel: opts.cancelLabel || 'Cancel'
  });

  window.vetlinkDialog = { alert: alertDialog, confirm: confirmDialog };

  // Safety net: anything that still calls the native alert() gets the in-app dialog.
  window.alert = (msg) => { alertDialog(String(msg ?? '')); };
})();
