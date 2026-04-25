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
});
