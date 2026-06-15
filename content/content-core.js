export function isEditable(el) {
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT' && ['text', 'search', 'email', 'url'].includes(el.type)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export function isGmailComposeBody(el) {
  const isGmail = window.location.hostname === 'mail.google.com';
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

export function hasEditableAncestor(el) {
  let parent = el.parentElement;
  while (parent) {
    if (isEditable(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

export function isTooSmall(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width < 100 || rect.height < 30) return true;
  const style = window.getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
}

export function isTwitterComposeBox(el) {
  const isTwitter =
    window.location.hostname === 'twitter.com' || window.location.hostname === 'x.com';
  if (!isTwitter) return false;
  if (!el.isContentEditable) return false;
  if (el.getAttribute('role') !== 'textbox') return false;
  return !isTooSmall(el);
}

export function shouldAttachTarget(el) {
  if (!isEditable(el)) return false;
  if (hasEditableAncestor(el)) return false;

  const hostname = window.location.hostname;
  if (hostname === 'docs.google.com') return false;

  const isGmail = hostname === 'mail.google.com';
  if (isGmail) return isGmailComposeBody(el);

  const isTwitter = hostname === 'twitter.com' || hostname === 'x.com';
  if (isTwitter) return isTwitterComposeBox(el);

  if (isTooSmall(el)) return false;

  return true;
}

export function getText(el) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
  return el.innerText;
}

export function setText(el, text) {
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

export function getSelection(el) {
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

export function replaceSelection(el, original, corrected) {
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

export function renderDiffHtml(diff) {
  return diff
    .map((d) => {
      const escaped = d.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (d.type === 'removed') return `<span class="gf-diff-removed">${escaped}</span>`;
      if (d.type === 'added') return `<span class="gf-diff-added">${escaped}</span>`;
      return escaped;
    })
    .join('');
}

export function positionHost(host, target) {
  const rect = target.getBoundingClientRect();
  host.style.top = `${rect.top + window.scrollY}px`;
  host.style.left = `${rect.left + window.scrollX}px`;
  host.style.width = `${rect.width}px`;
  host.style.height = `${rect.height}px`;
}

export function showTooltip(tooltip, msg, duration = 2500) {
  tooltip.textContent = msg;
  tooltip.classList.add('visible');
  setTimeout(() => tooltip.classList.remove('visible'), duration);
}
