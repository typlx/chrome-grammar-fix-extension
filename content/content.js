(() => {
  const PROCESSED = new WeakSet();
  const ICON_HOST_ATTR = 'data-gf-host';
  const DISABLED_SITES_KEY = 'grammarfix_disabled_sites';
  const hostname = window.location.hostname;
  const isGmail = hostname === 'mail.google.com';
  const isTwitter = hostname === 'twitter.com' || hostname === 'x.com';
  const isGoogleDocs = hostname === 'docs.google.com';

  const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>`;

  const SPINNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>`;

  const SHADOW_STYLES = `
    :host {
      position: absolute;
      z-index: 2147483647;
      pointer-events: none;
    }
    .gf-btn {
      pointer-events: auto;
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: #6C63FF;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(108,99,255,.4);
      transition: background .15s, transform .15s, opacity .15s;
      opacity: 0.85;
    }
    .gf-btn:hover {
      background: #5a52d5;
      transform: scale(1.1);
      opacity: 1;
    }
    .gf-btn:active { transform: scale(0.95); }
    .gf-btn svg { width: 16px; height: 16px; }
    .gf-btn.loading svg {
      animation: gf-spin .6s linear infinite;
    }
    .gf-btn.success { background: #22c55e; }
    .gf-btn.error { background: #ef4444; }
    .gf-tooltip {
      pointer-events: none;
      position: absolute;
      bottom: 40px;
      right: 0;
      background: #1e1e2e;
      color: #fff;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      padding: 6px 10px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity .2s;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .gf-tooltip.visible { opacity: 1; }
    @keyframes gf-spin {
      to { transform: rotate(360deg); }
    }
    .gf-preview {
      pointer-events: auto;
      position: absolute;
      bottom: 42px;
      right: 0;
      width: 340px;
      max-height: 260px;
      background: #1e1e2e;
      color: #e0e0e0;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,.45);
      overflow: hidden;
      display: none;
      flex-direction: column;
    }
    .gf-preview.visible { display: flex; }
    .gf-preview-header {
      padding: 8px 12px;
      font-weight: 600;
      font-size: 12px;
      color: #a0a0b8;
      border-bottom: 1px solid #2a2a3e;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gf-preview-lang {
      font-weight: 400;
      font-size: 11px;
      color: #6a6a82;
      text-transform: uppercase;
    }
    .gf-preview-diff {
      padding: 10px 12px;
      line-height: 1.6;
      overflow-y: auto;
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .gf-diff-removed {
      background: rgba(239,68,68,.2);
      color: #fca5a5;
      text-decoration: line-through;
      border-radius: 2px;
      padding: 0 2px;
    }
    .gf-diff-added {
      background: rgba(34,197,94,.2);
      color: #86efac;
      border-radius: 2px;
      padding: 0 2px;
    }
    .gf-preview-actions {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      border-top: 1px solid #2a2a3e;
    }
    .gf-preview-actions button {
      flex: 1;
      border: none;
      border-radius: 6px;
      padding: 6px 0;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }
    .gf-preview-actions button:hover { opacity: 0.85; }
    .gf-accept { background: #22c55e; color: #fff; }
    .gf-reject { background: #3a3a50; color: #ccc; }
  `;

  function isEditable(el) {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT' && ['text', 'search', 'email', 'url'].includes(el.type)) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function isGmailComposeBody(el) {
    if (!isGmail) return false;
    if (!el.isContentEditable) return false;
    if (el.getAttribute('role') !== 'textbox') return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 140 || rect.height < 40) return false;

    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const className = typeof el.className === 'string' ? el.className : '';
    const inComposeContext = !!el.closest('.M9, .aDh, .aO7, [role="dialog"]');
    const hasBodyHints =
      ariaLabel.includes('message body') ||
      title.includes('message body') ||
      el.getAttribute('g_editable') === 'true' ||
      /\bAm\b/.test(className);

    return hasBodyHints || inComposeContext;
  }

  function hasEditableAncestor(el) {
    let parent = el.parentElement;
    while (parent) {
      if (isEditable(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function isTooSmall(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 30) return true;
    const style = window.getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  function isTwitterComposeBox(el) {
    if (!isTwitter) return false;
    if (!el.isContentEditable) return false;
    if (el.getAttribute('role') !== 'textbox') return false;
    return !isTooSmall(el);
  }

  function shouldAttachTarget(el) {
    if (!isEditable(el)) return false;
    if (hasEditableAncestor(el)) return false;

    if (isGoogleDocs) return false;

    if (isGmail) return isGmailComposeBody(el);
    if (isTwitter) return isTwitterComposeBox(el);

    if (isTooSmall(el)) return false;

    return true;
  }

  function getText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
    if (el.isContentEditable) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const parts = [];
      let node;
      while ((node = walker.nextNode())) {
        parts.push(node.textContent);
      }
      return parts.join('') || el.innerText;
    }
    return el.innerText;
  }

  function setText(el, text) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value',
      ).set;
      nativeSetter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.innerText = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function getSelection(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) {
        return { text: el.value.substring(start, end), start, end };
      }
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;
    if (!el.contains(selection.anchorNode)) return null;

    return { text: selection.toString(), range: selection.getRangeAt(0) };
  }

  function replaceSelection(el, original, corrected) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const before = el.value.substring(0, original.start);
      const after = el.value.substring(original.end);
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value',
      ).set;
      nativeSetter.call(el, before + corrected + after);
      el.selectionStart = original.start;
      el.selectionEnd = original.start + corrected.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const range = original.range;
      range.deleteContents();
      range.insertNode(document.createTextNode(corrected));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function positionHost(host, target) {
    const rect = target.getBoundingClientRect();
    host.style.top = `${rect.top + window.scrollY}px`;
    host.style.left = `${rect.left + window.scrollX}px`;
    host.style.width = `${rect.width}px`;
    host.style.height = `${rect.height}px`;
  }

  function showTooltip(tooltip, msg, duration = 2500) {
    tooltip.textContent = msg;
    tooltip.classList.add('visible');
    setTimeout(() => tooltip.classList.remove('visible'), duration);
  }

  function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function computeWordDiff(original, corrected) {
    const tokenize = (t) => t.match(/\S+|\s+/g) || [];
    const a = tokenize(original);
    const b = tokenize(corrected);
    const m = a.length,
      n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] =
          a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const lcs = [];
    let i = m,
      j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
      else j--;
    }
    const changes = [];
    let oi = 0,
      ci = 0,
      li = 0;
    while (oi < a.length || ci < b.length) {
      if (
        li < lcs.length &&
        oi < a.length &&
        ci < b.length &&
        a[oi] === lcs[li] &&
        b[ci] === lcs[li]
      ) {
        changes.push({ type: 'equal', value: a[oi] });
        oi++;
        ci++;
        li++;
      } else if (li < lcs.length && oi < a.length && a[oi] !== lcs[li]) {
        changes.push({ type: 'removed', value: a[oi] });
        oi++;
      } else if (li < lcs.length && ci < b.length && b[ci] !== lcs[li]) {
        changes.push({ type: 'added', value: b[ci] });
        ci++;
      } else if (li >= lcs.length && oi < a.length) {
        changes.push({ type: 'removed', value: a[oi] });
        oi++;
      } else if (li >= lcs.length && ci < b.length) {
        changes.push({ type: 'added', value: b[ci] });
        ci++;
      }
    }
    const merged = [];
    for (const c of changes) {
      const last = merged[merged.length - 1];
      if (last && last.type === c.type) last.value += c.value;
      else merged.push({ ...c });
    }
    return merged;
  }

  function renderDiffHtml(diff) {
    return diff
      .map((d) => {
        const escaped = d.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (d.type === 'removed') return `<span class="gf-diff-removed">${escaped}</span>`;
        if (d.type === 'added') return `<span class="gf-diff-added">${escaped}</span>`;
        return escaped;
      })
      .join('');
  }

  function attachIcon(target) {
    if (PROCESSED.has(target)) return;
    PROCESSED.add(target);

    const host = document.createElement('div');
    host.setAttribute(ICON_HOST_ATTR, '');
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = SHADOW_STYLES;

    const btn = document.createElement('button');
    btn.className = 'gf-btn';
    btn.innerHTML = ICON_SVG;
    btn.title = 'Fix grammar';

    const tooltip = document.createElement('div');
    tooltip.className = 'gf-tooltip';

    const preview = document.createElement('div');
    preview.className = 'gf-preview';
    preview.innerHTML = `
      <div class="gf-preview-header">
        <span>Suggested corrections</span>
        <span class="gf-preview-lang"></span>
      </div>
      <div class="gf-preview-diff"></div>
      <div class="gf-preview-actions">
        <button class="gf-reject">Reject</button>
        <button class="gf-accept">Accept</button>
      </div>`;
    const diffContainer = preview.querySelector('.gf-preview-diff');
    const langBadge = preview.querySelector('.gf-preview-lang');
    const acceptBtn = preview.querySelector('.gf-accept');
    const rejectBtn = preview.querySelector('.gf-reject');

    shadow.append(style, tooltip, preview, btn);
    document.body.appendChild(host);
    positionHost(host, target);

    const reposition = () => positionHost(host, target);
    const resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(target);
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    let pendingCorrection = null;

    function dismissPreview() {
      preview.classList.remove('visible');
      pendingCorrection = null;
    }

    acceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pendingCorrection) return;

      const { selection, corrected } = pendingCorrection;
      if (selection) {
        replaceSelection(target, selection, corrected);
      } else {
        setText(target, corrected);
      }

      dismissPreview();
      btn.classList.add('success');
      btn.innerHTML = ICON_SVG;
      showTooltip(tooltip, selection ? 'Selection fixed!' : 'Text fixed!');
      setTimeout(() => btn.classList.remove('success'), 2000);
      chrome.runtime.sendMessage({ type: 'recordAccepted' }).catch(() => {});
    });

    rejectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dismissPreview();
      btn.innerHTML = ICON_SVG;
      showTooltip(tooltip, 'Correction dismissed');
      chrome.runtime.sendMessage({ type: 'recordRejected' }).catch(() => {});
    });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (btn.classList.contains('loading')) return;

      if (preview.classList.contains('visible')) {
        dismissPreview();
        btn.innerHTML = ICON_SVG;
        return;
      }

      const selection = getSelection(target);
      const text = selection ? selection.text : getText(target);

      if (!text || !text.trim()) {
        showTooltip(tooltip, 'Nothing to fix');
        return;
      }

      btn.classList.remove('success', 'error');
      btn.classList.add('loading');
      btn.innerHTML = SPINNER_SVG;

      try {
        const response = await chrome.runtime.sendMessage({ type: 'fixGrammar', text });

        if (response.error) {
          btn.classList.remove('loading');
          btn.classList.add('error');
          btn.innerHTML = ICON_SVG;
          const errorMsg = response.error.includes('not configured')
            ? 'API key needed — click Typlx icon in toolbar'
            : response.error;
          showTooltip(tooltip, errorMsg, 7000);
          setTimeout(() => btn.classList.remove('error'), 3000);
          return;
        }

        if (response.corrected.trim() === text.trim()) {
          btn.classList.remove('loading');
          btn.classList.add('success');
          btn.innerHTML = ICON_SVG;
          showTooltip(tooltip, 'No changes needed');
          setTimeout(() => btn.classList.remove('success'), 2000);
          return;
        }

        const diff = computeWordDiff(text, response.corrected);
        diffContainer.innerHTML = renderDiffHtml(diff);
        pendingCorrection = { selection, corrected: response.corrected };

        if (response.detectedLanguage && langBadge) {
          langBadge.textContent = response.detectedLanguage;
        }

        btn.classList.remove('loading');
        btn.innerHTML = ICON_SVG;
        preview.classList.add('visible');

        const wordCount = countWords(text);
        chrome.runtime
          .sendMessage({ type: 'recordCorrection', charCount: text.length, wordCount })
          .catch(() => {});
      } catch (err) {
        btn.classList.remove('loading');
        btn.classList.add('error');
        btn.innerHTML = ICON_SVG;
        showTooltip(tooltip, err.message || 'Something went wrong');
        setTimeout(() => btn.classList.remove('error'), 3000);
      }
    });

    const cleanup = new MutationObserver(() => {
      if (!document.contains(target)) {
        host.remove();
        resizeObserver.disconnect();
        window.removeEventListener('scroll', reposition);
        window.removeEventListener('resize', reposition);
        cleanup.disconnect();
        PROCESSED.delete(target);
      }
    });
    cleanup.observe(document.body, { childList: true, subtree: true });
  }

  let scanTimer = null;
  const SCAN_DEBOUNCE_MS = 150;

  function scheduleScan(root) {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scanAndAttach(root);
    }, SCAN_DEBOUNCE_MS);
  }

  function scanShadowRoots(root) {
    const elements = root.querySelectorAll('*');
    for (const el of elements) {
      if (el.shadowRoot) {
        scanAndAttach(el.shadowRoot);
      }
    }
  }

  function scanAndAttach(root = document) {
    if (isGoogleDocs) return;

    let selector;
    if (isGmail || isTwitter) {
      selector = '[contenteditable="true"][role="textbox"]';
    } else {
      selector =
        'textarea, [contenteditable="true"], [contenteditable=""], input[type="text"], input[type="search"], input[type="email"], input[type="url"]';
    }
    const targets = root.querySelectorAll(selector);
    targets.forEach((target) => {
      if (shouldAttachTarget(target)) attachIcon(target);
    });

    scanShadowRoots(root);
  }

  async function init() {
    const result = await chrome.storage.local.get(DISABLED_SITES_KEY);
    const disabledSites = result[DISABLED_SITES_KEY] || [];
    if (disabledSites.includes(window.location.hostname)) return;

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => scanAndAttach());
    } else {
      scanAndAttach();
    }

    const observer = new MutationObserver((mutations) => {
      let needsScan = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (shouldAttachTarget(node)) {
            attachIcon(node);
          } else {
            needsScan = true;
          }
        }
      }
      if (needsScan) scheduleScan();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', () => scheduleScan());
    window.addEventListener('hashchange', () => scheduleScan());
  }

  init();
})();
