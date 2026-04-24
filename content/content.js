(() => {
  const PROCESSED = new WeakSet();
  const ICON_HOST_ATTR = 'data-gf-host';
  const DISABLED_SITES_KEY = 'grammarfix_disabled_sites';
  const isGmail = window.location.hostname === 'mail.google.com';

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

  function shouldAttachTarget(el) {
    if (!isEditable(el)) return false;
    if (hasEditableAncestor(el)) return false;

    if (isGmail) {
      return isGmailComposeBody(el);
    }

    return true;
  }

  function getText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
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

    shadow.append(style, tooltip, btn);
    document.body.appendChild(host);
    positionHost(host, target);

    const reposition = () => positionHost(host, target);
    const resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(target);
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (btn.classList.contains('loading')) return;

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
          showTooltip(tooltip, response.error);
          setTimeout(() => btn.classList.remove('error'), 3000);
          return;
        }

        if (selection) {
          replaceSelection(target, selection, response.corrected);
        } else {
          setText(target, response.corrected);
        }

        btn.classList.remove('loading');
        btn.classList.add('success');
        btn.innerHTML = ICON_SVG;
        showTooltip(tooltip, selection ? 'Selection fixed!' : 'Text fixed!');
        setTimeout(() => btn.classList.remove('success'), 2000);
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

  function scanAndAttach(root = document) {
    const selector = isGmail
      ? '[contenteditable="true"][role="textbox"]'
      : 'textarea, [contenteditable="true"], [contenteditable=""], input[type="text"], input[type="search"], input[type="email"], input[type="url"]';
    const targets = root.querySelectorAll(selector);
    targets.forEach((target) => {
      if (shouldAttachTarget(target)) attachIcon(target);
    });
  }

  async function init() {
    const result = await chrome.storage.local.get(DISABLED_SITES_KEY);
    const disabledSites = result[DISABLED_SITES_KEY] || [];
    if (disabledSites.includes(window.location.hostname)) return;

    scanAndAttach();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (shouldAttachTarget(node)) attachIcon(node);
          scanAndAttach(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
