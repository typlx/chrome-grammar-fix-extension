import { describe, it, expect } from 'vitest';
import { getConfig, saveConfig, hasToken } from '../../utils/storage.js';

describe('storage', () => {
  describe('getConfig returns defaults when storage is empty', () => {
    it('uses default API URL', async () => {
      const config = await getConfig();
      expect(config.apiUrl).toBe('https://api.openai.com/v1');
    });

    it('uses default model', async () => {
      const config = await getConfig();
      expect(config.model).toBe('gpt-4o-mini');
    });

    it('returns empty token', async () => {
      const config = await getConfig();
      expect(config.token).toBe('');
    });
  });

  describe('saveConfig persists and encrypts the token', () => {
    it('stores apiUrl and model in plain text', async () => {
      await saveConfig({
        apiUrl: 'https://custom.api.com/v1',
        model: 'gpt-4-turbo',
        token: 'sk-test',
      });

      const config = await getConfig();
      expect(config.apiUrl).toBe('https://custom.api.com/v1');
      expect(config.model).toBe('gpt-4-turbo');
    });

    it('encrypts the token so raw storage does not contain plaintext', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-secret-value',
      });

      const raw = globalThis.__testChromeStore['grammarfix_config'];
      expect(raw.encryptedToken).toBeDefined();
      expect(raw.encryptedToken).not.toBe('sk-secret-value');
      expect(raw.encryptedToken).toHaveProperty('iv');
      expect(raw.encryptedToken).toHaveProperty('data');
    });

    it('decrypts the token correctly on retrieval', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-secret-value',
      });

      const config = await getConfig();
      expect(config.token).toBe('sk-secret-value');
    });

    it('handles null token by storing null encryptedToken', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: '',
      });

      const raw = globalThis.__testChromeStore['grammarfix_config'];
      expect(raw.encryptedToken).toBeNull();
    });
  });

  describe('saveConfig falls back to defaults for missing fields', () => {
    it('uses default apiUrl when empty string provided', async () => {
      await saveConfig({ apiUrl: '', model: 'custom-model', token: 'tk' });

      const config = await getConfig();
      expect(config.apiUrl).toBe('https://api.openai.com/v1');
    });

    it('uses default model when empty string provided', async () => {
      await saveConfig({ apiUrl: 'https://custom.api.com/v1', model: '', token: 'tk' });

      const config = await getConfig();
      expect(config.model).toBe('gpt-4o-mini');
    });
  });

  describe('hasToken', () => {
    it('returns false when no config is saved', async () => {
      expect(await hasToken()).toBe(false);
    });

    it('returns false when config is saved without token', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: '',
      });

      expect(await hasToken()).toBe(false);
    });

    it('returns true when config has a token', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-real-token',
      });

      expect(await hasToken()).toBe(true);
    });
  });
});
