import { describe, it, expect } from 'vitest';
import {
  getConfig,
  saveConfig,
  hasToken,
  getDisabledSites,
  setDisabledSites,
  toggleSite,
} from '../../utils/storage.js';

describe('storage', () => {
  describe('getConfig returns defaults when storage is empty', () => {
    it('uses default provider', async () => {
      const config = await getConfig();
      expect(config.provider).toBe('openai');
    });

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

  describe('saveConfig persists provider, URL, model, and encrypts the token', () => {
    it('stores provider, apiUrl, and model in plain text', async () => {
      await saveConfig({
        provider: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1',
        model: 'claude-sonnet-4-20250514',
        token: 'sk-ant-test',
      });

      const config = await getConfig();
      expect(config.provider).toBe('anthropic');
      expect(config.apiUrl).toBe('https://api.anthropic.com/v1');
      expect(config.model).toBe('claude-sonnet-4-20250514');
    });

    it('encrypts the token so raw storage does not contain plaintext', async () => {
      await saveConfig({
        provider: 'openai',
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
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-secret-value',
      });

      const config = await getConfig();
      expect(config.token).toBe('sk-secret-value');
    });

    it('handles null token by storing null encryptedToken', async () => {
      await saveConfig({
        provider: 'openai',
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
      await saveConfig({ provider: 'openai', apiUrl: '', model: 'custom-model', token: 'tk' });

      const config = await getConfig();
      expect(config.apiUrl).toBe('https://api.openai.com/v1');
    });

    it('uses default model when empty string provided', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://custom.api.com/v1',
        model: '',
        token: 'tk',
      });

      const config = await getConfig();
      expect(config.model).toBe('gpt-4o-mini');
    });

    it('uses default provider when not specified', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'tk',
      });

      const config = await getConfig();
      expect(config.provider).toBe('openai');
    });
  });

  describe('hasToken', () => {
    it('returns false when no config is saved', async () => {
      expect(await hasToken()).toBe(false);
    });

    it('returns false when config is saved without token', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: '',
      });

      expect(await hasToken()).toBe(false);
    });

    it('returns true when config has a token', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-real-token',
      });

      expect(await hasToken()).toBe(true);
    });
  });

  describe('disabled sites management', () => {
    it('returns empty array when no sites are disabled', async () => {
      const sites = await getDisabledSites();
      expect(sites).toEqual([]);
    });

    it('persists disabled sites', async () => {
      await setDisabledSites(['example.com', 'test.org']);
      const sites = await getDisabledSites();
      expect(sites).toEqual(['example.com', 'test.org']);
    });

    it('toggleSite adds a site when not in the list', async () => {
      const wasDisabled = await toggleSite('example.com');
      expect(wasDisabled).toBe(true);
      const sites = await getDisabledSites();
      expect(sites).toContain('example.com');
    });

    it('toggleSite removes a site when already in the list', async () => {
      await setDisabledSites(['example.com']);
      const wasDisabled = await toggleSite('example.com');
      expect(wasDisabled).toBe(false);
      const sites = await getDisabledSites();
      expect(sites).not.toContain('example.com');
    });

    it('toggleSite does not affect other disabled sites', async () => {
      await setDisabledSites(['keep.com', 'remove.com']);
      await toggleSite('remove.com');
      const sites = await getDisabledSites();
      expect(sites).toEqual(['keep.com']);
    });
  });
});
