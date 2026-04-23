import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../../utils/crypto.js';

describe('crypto', () => {
  describe('encryptToken', () => {
    it('returns null when given empty string', async () => {
      expect(await encryptToken('')).toBeNull();
    });

    it('returns null when given null', async () => {
      expect(await encryptToken(null)).toBeNull();
    });

    it('returns null when given undefined', async () => {
      expect(await encryptToken(undefined)).toBeNull();
    });

    it('returns an object with iv and data arrays for valid input', async () => {
      const result = await encryptToken('sk-test-token-12345');

      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.iv)).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.iv.length).toBe(12);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('produces different ciphertexts for the same input due to random IV', async () => {
      const first = await encryptToken('same-token');
      const second = await encryptToken('same-token');

      expect(first.iv).not.toEqual(second.iv);
    });
  });

  describe('decryptToken', () => {
    it('returns empty string for null input', async () => {
      expect(await decryptToken(null)).toBe('');
    });

    it('returns empty string for undefined input', async () => {
      expect(await decryptToken(undefined)).toBe('');
    });

    it('returns empty string when iv is missing', async () => {
      expect(await decryptToken({ data: [1, 2, 3] })).toBe('');
    });

    it('returns empty string when data is missing', async () => {
      expect(await decryptToken({ iv: [1, 2, 3] })).toBe('');
    });

    it('returns empty string for corrupted ciphertext', async () => {
      const result = await decryptToken({
        iv: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        data: [255, 255, 255, 255],
      });
      expect(result).toBe('');
    });
  });

  describe('encrypt-then-decrypt roundtrip', () => {
    it('recovers a short API token', async () => {
      const original = 'sk-abc123XYZ';
      const encrypted = await encryptToken(original);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(original);
    });

    it('recovers a long token with special characters', async () => {
      const original = 'sk-proj-very-long_token/with=special+chars!@#$%^&*()';
      const encrypted = await encryptToken(original);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(original);
    });

    it('recovers unicode content', async () => {
      const original = 'token-with-emoji-🔑-and-日本語';
      const encrypted = await encryptToken(original);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(original);
    });
  });
});
