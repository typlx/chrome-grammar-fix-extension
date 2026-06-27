import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isGmailComposeBody,
  isTwitterComposeBox,
  isTooSmall,
  shouldAttachTarget,
  getSelection,
  replaceSelection,
} from '../../content/content-core.js';

function mockHostname(hostname) {
  Object.defineProperty(window, 'location', {
    value: { hostname },
    writable: true,
    configurable: true,
  });
}

function makeSizedElement(tag, opts = {}) {
  const el = document.createElement(tag);
  if (opts.contentEditable) el.contentEditable = 'true';
  if (opts.role) el.setAttribute('role', opts.role);
  if (opts.ariaLabel) el.setAttribute('aria-label', opts.ariaLabel);
  if (opts.className) el.className = opts.className;
  if (opts.gEditable) el.setAttribute('g_editable', opts.gEditable);

  el.getBoundingClientRect = () => ({
    width: opts.width ?? 400,
    height: opts.height ?? 200,
    top: 0,
    left: 0,
    right: opts.width ?? 400,
    bottom: opts.height ?? 200,
  });

  if (opts.display || opts.visibility) {
    const origGetComputedStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element === el) {
        return {
          display: opts.display || 'block',
          visibility: opts.visibility || 'visible',
        };
      }
      return origGetComputedStyle(element);
    });
  }

  document.body.appendChild(el);
  return el;
}

describe('content-core extended coverage', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('isTooSmall', () => {
    it('returns true for elements narrower than 100px', () => {
      const el = makeSizedElement('div', { width: 50, height: 100 });
      expect(isTooSmall(el)).toBe(true);
    });

    it('returns true for elements shorter than 30px', () => {
      const el = makeSizedElement('div', { width: 200, height: 20 });
      expect(isTooSmall(el)).toBe(true);
    });

    it('returns true for hidden elements', () => {
      const el = makeSizedElement('div', { width: 200, height: 100, display: 'none' });
      expect(isTooSmall(el)).toBe(true);
    });

    it('returns true for invisible elements', () => {
      const el = makeSizedElement('div', { width: 200, height: 100, visibility: 'hidden' });
      expect(isTooSmall(el)).toBe(true);
    });

    it('returns false for adequately sized visible elements', () => {
      const el = makeSizedElement('div', { width: 200, height: 100 });
      expect(isTooSmall(el)).toBe(false);
    });
  });

  describe('isGmailComposeBody', () => {
    beforeEach(() => {
      mockHostname('mail.google.com');
    });

    it('returns false when not on Gmail', () => {
      mockHostname('example.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        ariaLabel: 'Message Body',
      });
      expect(isGmailComposeBody(el)).toBe(false);
    });

    it('returns false for non-contenteditable elements', () => {
      const el = makeSizedElement('div', { role: 'textbox' });
      expect(isGmailComposeBody(el)).toBe(false);
    });

    it('returns false when role is not textbox', () => {
      const el = makeSizedElement('div', { contentEditable: true });
      expect(isGmailComposeBody(el)).toBe(false);
    });

    it('returns false for elements too narrow', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        ariaLabel: 'Message Body',
        width: 100,
        height: 200,
      });
      expect(isGmailComposeBody(el)).toBe(false);
    });

    it('returns false for elements too short', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        ariaLabel: 'Message Body',
        width: 400,
        height: 20,
      });
      expect(isGmailComposeBody(el)).toBe(false);
    });

    it('returns false for hidden elements (display: none)', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        ariaLabel: 'Message Body',
        display: 'none',
      });
      expect(isGmailComposeBody(el)).toBe(false);
    });

    it('detects compose body by aria-label containing "message body"', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        ariaLabel: 'Message Body',
      });
      expect(isGmailComposeBody(el)).toBe(true);
    });

    it('detects compose body by g_editable attribute', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        gEditable: 'true',
      });
      expect(isGmailComposeBody(el)).toBe(true);
    });

    it('detects compose body by Am class name', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        className: 'Am Al editable',
      });
      expect(isGmailComposeBody(el)).toBe(true);
    });

    it('detects compose body by compose dialog context', () => {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      dialog.appendChild(el);
      document.body.appendChild(dialog);

      expect(isGmailComposeBody(el)).toBe(true);
    });

    it('returns false when no body hints and no compose context', () => {
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      expect(isGmailComposeBody(el)).toBe(false);
    });
  });

  describe('isTwitterComposeBox', () => {
    it('returns false when not on Twitter/X', () => {
      mockHostname('example.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      expect(isTwitterComposeBox(el)).toBe(false);
    });

    it('returns true for valid compose box on twitter.com', () => {
      mockHostname('twitter.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      expect(isTwitterComposeBox(el)).toBe(true);
    });

    it('returns true for valid compose box on x.com', () => {
      mockHostname('x.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      expect(isTwitterComposeBox(el)).toBe(true);
    });

    it('returns false for non-contenteditable on Twitter', () => {
      mockHostname('twitter.com');
      const el = makeSizedElement('div', { role: 'textbox' });
      expect(isTwitterComposeBox(el)).toBe(false);
    });

    it('returns false when role is not textbox on Twitter', () => {
      mockHostname('twitter.com');
      const el = makeSizedElement('div', { contentEditable: true });
      expect(isTwitterComposeBox(el)).toBe(false);
    });

    it('returns false for too-small compose box on Twitter', () => {
      mockHostname('twitter.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        width: 50,
        height: 10,
      });
      expect(isTwitterComposeBox(el)).toBe(false);
    });
  });

  describe('shouldAttachTarget on special sites', () => {
    it('returns false on docs.google.com', () => {
      mockHostname('docs.google.com');
      const el = makeSizedElement('textarea');
      expect(shouldAttachTarget(el)).toBe(false);
    });

    it('delegates to isGmailComposeBody on mail.google.com', () => {
      mockHostname('mail.google.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
        ariaLabel: 'Message Body',
      });
      expect(shouldAttachTarget(el)).toBe(true);
    });

    it('rejects non-compose contenteditable on Gmail', () => {
      mockHostname('mail.google.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      expect(shouldAttachTarget(el)).toBe(false);
    });

    it('delegates to isTwitterComposeBox on twitter.com', () => {
      mockHostname('twitter.com');
      const el = makeSizedElement('div', {
        contentEditable: true,
        role: 'textbox',
      });
      expect(shouldAttachTarget(el)).toBe(true);
    });

    it('returns false for too-small textarea on regular sites', () => {
      mockHostname('example.com');
      const el = makeSizedElement('textarea', { width: 50, height: 10 });
      expect(shouldAttachTarget(el)).toBe(false);
    });
  });

  describe('getSelection for contenteditable', () => {
    it('returns null when window selection is collapsed', () => {
      const el = makeSizedElement('div', { contentEditable: true });
      el.textContent = 'hello world';

      const mockSelection = {
        isCollapsed: true,
        anchorNode: el.firstChild,
        toString: () => '',
        getRangeAt: vi.fn(),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);

      expect(getSelection(el)).toBeNull();
    });

    it('returns null when selection is outside the element', () => {
      const el = makeSizedElement('div', { contentEditable: true });
      el.textContent = 'hello world';

      const otherNode = document.createTextNode('other');
      document.body.appendChild(otherNode);

      const mockSelection = {
        isCollapsed: false,
        anchorNode: otherNode,
        toString: () => 'other',
        getRangeAt: vi.fn(),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);

      expect(getSelection(el)).toBeNull();
    });

    it('returns selected text and range for contenteditable', () => {
      const el = makeSizedElement('div', { contentEditable: true });
      el.textContent = 'hello world';

      const mockRange = { startOffset: 6, endOffset: 11 };
      const mockSelection = {
        isCollapsed: false,
        anchorNode: el.firstChild,
        toString: () => 'world',
        getRangeAt: vi.fn().mockReturnValue(mockRange),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);

      const sel = getSelection(el);
      expect(sel).not.toBeNull();
      expect(sel.text).toBe('world');
      expect(sel.range).toBe(mockRange);
    });

    it('returns null when window.getSelection returns null', () => {
      const el = makeSizedElement('div', { contentEditable: true });
      el.textContent = 'hello';
      vi.spyOn(window, 'getSelection').mockReturnValue(null);

      expect(getSelection(el)).toBeNull();
    });
  });

  describe('replaceSelection for contenteditable', () => {
    it('replaces selected range content with corrected text', () => {
      const el = makeSizedElement('div', { contentEditable: true });
      el.textContent = 'hello cruel world';

      const inputSpy = vi.fn();
      el.addEventListener('input', inputSpy);

      const mockRange = {
        deleteContents: vi.fn(),
        insertNode: vi.fn(),
      };

      replaceSelection(el, { range: mockRange }, 'beautiful');

      expect(mockRange.deleteContents).toHaveBeenCalled();
      expect(mockRange.insertNode).toHaveBeenCalledWith(expect.any(Object));

      const insertedNode = mockRange.insertNode.mock.calls[0][0];
      expect(insertedNode.textContent).toBe('beautiful');

      expect(inputSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('replaceSelection for input', () => {
    it('replaces selection in text input and updates cursor', () => {
      const el = document.createElement('input');
      el.type = 'text';
      el.value = 'hello cruel world';
      document.body.appendChild(el);

      const inputSpy = vi.fn();
      el.addEventListener('input', inputSpy);

      replaceSelection(el, { start: 6, end: 11 }, 'kind');

      expect(el.value).toBe('hello kind world');
      expect(el.selectionStart).toBe(6);
      expect(el.selectionEnd).toBe(10);
      expect(inputSpy).toHaveBeenCalled();
    });
  });
});
