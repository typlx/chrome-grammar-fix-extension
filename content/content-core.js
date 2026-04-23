export function isEditable(el) {
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT' && ['text', 'search', 'email', 'url'].includes(el.type))
    return true;
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

export function shouldAttachTarget(el) {
  if (!isEditable(el)) return false;
  if (hasEditableAncestor(el)) return false;

  const isGmail = window.location.hostname === 'mail.google.com';
  if (isGmail) {
    return isGmailComposeBody(el);
  }

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
