import { describe, it, expect, vi } from 'vitest';
import {
  isEditable,
  hasEditableAncestor,
  shouldAttachTarget,
  getText,
  setText,
  getSelection,
  replaceSelection,
  positionHost,
  showTooltip,
} from '../../content/content-core.js';

describe('content-core', () => {
  describe('isEditable', () => {
    it('returns true for textarea', () => {
      const el = document.createElement('textarea');
      expect(isEditable(el)).toBe(true);
    });

    it('returns true for text input', () => {
      const el = document.createElement('input');
      el.type = 'text';
      expect(isEditable(el)).toBe(true);
    });

    it('returns true for search input', () => {
      const el = document.createElement('input');
      el.type = 'search';
      expect(isEditable(el)).toBe(true);
    });

    it('returns true for email input', () => {
      const el = document.createElement('input');
      el.type = 'email';
      expect(isEditable(el)).toBe(true);
    });

    it('returns true for url input', () => {
      const el = document.createElement('input');
      el.type = 'url';
      expect(isEditable(el)).toBe(true);
    });

    it('returns true for contenteditable element', () => {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      document.body.appendChild(el);
      expect(isEditable(el)).toBe(true);
      el.remove();
    });

    it('returns false for regular div', () => {
      const el = document.createElement('div');
      expect(isEditable(el)).toBe(false);
    });

    it('returns false for checkbox input', () => {
      const el = document.createElement('input');
      el.type = 'checkbox';
      expect(isEditable(el)).toBe(false);
    });

    it('returns false for radio input', () => {
      const el = document.createElement('input');
      el.type = 'radio';
      expect(isEditable(el)).toBe(false);
    });

    it('returns false for button element', () => {
      const el = document.createElement('button');
      expect(isEditable(el)).toBe(false);
    });
  });

  describe('hasEditableAncestor', () => {
    it('returns false when no parent is editable', () => {
      const wrapper = document.createElement('div');
      const child = document.createElement('input');
      child.type = 'text';
      wrapper.appendChild(child);
      expect(hasEditableAncestor(child)).toBe(false);
    });

    it('returns true when a direct parent is contenteditable', () => {
      const parent = document.createElement('div');
      parent.contentEditable = 'true';
      const child = document.createElement('div');
      child.contentEditable = 'true';
      parent.appendChild(child);
      document.body.appendChild(parent);
      expect(hasEditableAncestor(child)).toBe(true);
      parent.remove();
    });

    it('returns true when a grandparent is editable', () => {
      const grandparent = document.createElement('textarea');
      const parent = document.createElement('span');
      const child = document.createElement('input');
      child.type = 'text';
      grandparent.appendChild(parent);
      parent.appendChild(child);
      expect(hasEditableAncestor(child)).toBe(true);
    });
  });

  describe('shouldAttachTarget', () => {
    it('returns false for non-editable elements', () => {
      const el = document.createElement('div');
      expect(shouldAttachTarget(el)).toBe(false);
    });

    it('returns true for a top-level textarea on a non-Gmail site', () => {
      const el = document.createElement('textarea');
      document.body.appendChild(el);
      expect(shouldAttachTarget(el)).toBe(true);
      el.remove();
    });

    it('returns false for an input nested inside a contenteditable div', () => {
      const grandparent = document.createElement('div');
      const parent = document.createElement('div');
      parent.contentEditable = 'true';
      const child = document.createElement('input');
      child.type = 'text';
      parent.appendChild(child);
      grandparent.appendChild(parent);
      document.body.appendChild(grandparent);
      expect(shouldAttachTarget(child)).toBe(false);
      grandparent.remove();
    });
  });

  describe('getText', () => {
    it('returns value from textarea', () => {
      const el = document.createElement('textarea');
      el.value = 'hello world';
      expect(getText(el)).toBe('hello world');
    });

    it('returns value from text input', () => {
      const el = document.createElement('input');
      el.type = 'text';
      el.value = 'input value';
      expect(getText(el)).toBe('input value');
    });

    it('returns innerText from contenteditable', () => {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      el.innerText = 'editable content';
      expect(getText(el)).toBe('editable content');
    });

    it('returns empty string from empty textarea', () => {
      const el = document.createElement('textarea');
      expect(getText(el)).toBe('');
    });
  });

  describe('setText', () => {
    it('sets value on textarea and dispatches input+change events', () => {
      const el = document.createElement('textarea');
      document.body.appendChild(el);
      const inputSpy = vi.fn();
      const changeSpy = vi.fn();
      el.addEventListener('input', inputSpy);
      el.addEventListener('change', changeSpy);

      setText(el, 'new value');

      expect(el.value).toBe('new value');
      expect(inputSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      el.remove();
    });

    it('sets value on text input and dispatches events', () => {
      const el = document.createElement('input');
      el.type = 'text';
      document.body.appendChild(el);
      const inputSpy = vi.fn();
      el.addEventListener('input', inputSpy);

      setText(el, 'updated');

      expect(el.value).toBe('updated');
      expect(inputSpy).toHaveBeenCalledTimes(1);
      el.remove();
    });

    it('sets innerText on contenteditable and dispatches input event', () => {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      document.body.appendChild(el);
      const inputSpy = vi.fn();
      el.addEventListener('input', inputSpy);

      setText(el, 'edited content');

      expect(el.innerText).toBe('edited content');
      expect(inputSpy).toHaveBeenCalledTimes(1);
      el.remove();
    });
  });

  describe('getSelection from textarea', () => {
    it('returns selected text and offsets when a range is selected', () => {
      const el = document.createElement('textarea');
      el.value = 'hello cruel world';
      document.body.appendChild(el);
      el.selectionStart = 6;
      el.selectionEnd = 11;

      const sel = getSelection(el);
      expect(sel).not.toBeNull();
      expect(sel.text).toBe('cruel');
      expect(sel.start).toBe(6);
      expect(sel.end).toBe(11);
      el.remove();
    });

    it('returns null when no text is selected in textarea', () => {
      const el = document.createElement('textarea');
      el.value = 'hello world';
      document.body.appendChild(el);
      el.selectionStart = 5;
      el.selectionEnd = 5;

      expect(getSelection(el)).toBeNull();
      el.remove();
    });
  });

  describe('replaceSelection in textarea', () => {
    it('replaces the selected range with corrected text', () => {
      const el = document.createElement('textarea');
      el.value = 'I hav a cat';
      document.body.appendChild(el);

      const original = { start: 2, end: 5 };
      replaceSelection(el, original, 'have');

      expect(el.value).toBe('I have a cat');
      expect(el.selectionStart).toBe(2);
      expect(el.selectionEnd).toBe(6);
      el.remove();
    });

    it('dispatches input and change events after replacement', () => {
      const el = document.createElement('textarea');
      el.value = 'abc';
      document.body.appendChild(el);

      const inputSpy = vi.fn();
      const changeSpy = vi.fn();
      el.addEventListener('input', inputSpy);
      el.addEventListener('change', changeSpy);

      replaceSelection(el, { start: 0, end: 3 }, 'xyz');

      expect(inputSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      el.remove();
    });
  });

  describe('positionHost', () => {
    it('positions the host element to match target bounding rect', () => {
      const host = document.createElement('div');
      const target = document.createElement('div');
      document.body.appendChild(target);

      target.getBoundingClientRect = () => ({
        top: 100,
        left: 200,
        width: 300,
        height: 50,
        right: 500,
        bottom: 150,
      });

      positionHost(host, target);

      expect(host.style.top).toBe('100px');
      expect(host.style.left).toBe('200px');
      expect(host.style.width).toBe('300px');
      expect(host.style.height).toBe('50px');
      target.remove();
    });
  });

  describe('showTooltip', () => {
    it('sets message text and adds visible class', () => {
      const tooltip = document.createElement('div');
      showTooltip(tooltip, 'Text fixed!');

      expect(tooltip.textContent).toBe('Text fixed!');
      expect(tooltip.classList.contains('visible')).toBe(true);
    });

    it('removes visible class after specified duration', async () => {
      vi.useFakeTimers();
      const tooltip = document.createElement('div');
      showTooltip(tooltip, 'Done', 1000);

      expect(tooltip.classList.contains('visible')).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(tooltip.classList.contains('visible')).toBe(false);

      vi.useRealTimers();
    });
  });
});
