import { describe, it, expect } from 'vitest';
import { computeWordDiff, hasChanges } from '../../utils/diff.js';

describe('word-level diff engine', () => {
  describe('identical texts produce no changes', () => {
    it('returns all-equal for the same sentence', () => {
      const diff = computeWordDiff('hello world', 'hello world');
      expect(hasChanges(diff)).toBe(false);
      diff.forEach((d) => expect(d.type).toBe('equal'));
    });

    it('handles empty strings', () => {
      const diff = computeWordDiff('', '');
      expect(diff).toEqual([]);
      expect(hasChanges(diff)).toBe(false);
    });
  });

  describe('single word replacement', () => {
    it('detects a spelling fix', () => {
      const diff = computeWordDiff('I hav a cat', 'I have a cat');
      expect(hasChanges(diff)).toBe(true);

      const removed = diff.filter((d) => d.type === 'removed');
      const added = diff.filter((d) => d.type === 'added');
      expect(removed.length).toBeGreaterThanOrEqual(1);
      expect(added.length).toBeGreaterThanOrEqual(1);
      expect(removed.some((d) => d.value.includes('hav'))).toBe(true);
      expect(added.some((d) => d.value.includes('have'))).toBe(true);
    });
  });

  describe('word insertion', () => {
    it('detects an added word', () => {
      const diff = computeWordDiff('I a cat', 'I have a cat');
      expect(hasChanges(diff)).toBe(true);
      const added = diff.filter((d) => d.type === 'added');
      expect(added.some((d) => d.value.includes('have'))).toBe(true);
    });
  });

  describe('word deletion', () => {
    it('detects a removed word', () => {
      const diff = computeWordDiff('I have really a cat', 'I have a cat');
      expect(hasChanges(diff)).toBe(true);
      const removed = diff.filter((d) => d.type === 'removed');
      expect(removed.some((d) => d.value.includes('really'))).toBe(true);
    });
  });

  describe('multi-word change', () => {
    it('handles a rewrite with several corrections', () => {
      const diff = computeWordDiff('Their going too the store', "They're going to the store");
      expect(hasChanges(diff)).toBe(true);
    });
  });

  describe('whitespace preservation', () => {
    it('preserves whitespace tokens as equal segments', () => {
      const diff = computeWordDiff('hello  world', 'hello  world');
      expect(hasChanges(diff)).toBe(false);
    });
  });

  describe('adjacent changes are merged', () => {
    it('merges consecutive added tokens', () => {
      const diff = computeWordDiff('a', 'a b c');
      const added = diff.filter((d) => d.type === 'added');
      expect(added.length).toBeLessThanOrEqual(2);
    });
  });

  describe('long text threshold avoids quadratic freeze', () => {
    function generateWords(n) {
      return Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
    }

    it('returns summary when original exceeds 300 tokens', () => {
      const original = generateWords(400);
      const corrected = generateWords(400).replace('word5', 'fixed5');
      const diff = computeWordDiff(original, corrected);
      expect(diff.type).toBe('summary');
      expect(diff.removed).toBeGreaterThanOrEqual(1);
      expect(diff.added).toBeGreaterThanOrEqual(1);
      expect(diff.total).toBeGreaterThan(0);
    });

    it('returns summary when corrected exceeds 300 tokens', () => {
      const original = generateWords(100);
      const corrected = generateWords(400);
      const diff = computeWordDiff(original, corrected);
      expect(diff.type).toBe('summary');
    });

    it('returns normal diff array at exactly 300 tokens', () => {
      const text = generateWords(150);
      const diff = computeWordDiff(text, text);
      expect(Array.isArray(diff)).toBe(true);
    });

    it('returns summary for empty original and long corrected', () => {
      const diff = computeWordDiff('', generateWords(400));
      expect(diff.type).toBe('summary');
    });

    it('completes in under 50ms for 1000-word input', () => {
      const original = generateWords(1000);
      const corrected = original.replace('word500', 'corrected500');
      const start = performance.now();
      computeWordDiff(original, corrected);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('hasChanges returns true for a summary with changes', () => {
      const original = generateWords(400);
      const corrected = original.replace('word5', 'fixed5');
      const diff = computeWordDiff(original, corrected);
      expect(hasChanges(diff)).toBe(true);
    });

    it('hasChanges returns false for identical long texts', () => {
      const text = generateWords(400);
      const diff = computeWordDiff(text, text);
      expect(diff.type).toBe('summary');
      expect(hasChanges(diff)).toBe(false);
    });
  });
});
