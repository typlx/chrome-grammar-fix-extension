import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveConfig, getConfig, hasToken } from '../../utils/storage.js';
import { handleFixGrammar, validateConfig, clearCache } from '../../background/service-worker.js';
import { getText, setText, isEditable, shouldAttachTarget } from '../../content/content-core.js';

describe('grammar fix end-to-end flow', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('user configures API settings, then fixes text in a textarea', () => {
    it('validates config, saves credentials, and corrects text via the API', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4' }],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: 'The quick brown fox jumps over the lazy dog.',
                  },
                },
              ],
            }),
          }),
      );

      const configPayload = {
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-live-test-key',
      };

      const validation = await validateConfig(configPayload);
      expect(validation).toEqual({ ok: true });

      await saveConfig(configPayload);
      const saved = await getConfig();
      expect(saved.token).toBe('sk-live-test-key');
      expect(saved.model).toBe('gpt-4o-mini');

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = 'The quik brown fox jumpd over the lazzy dog.';
      textarea.getBoundingClientRect = () => ({
        width: 400,
        height: 100,
        top: 0,
        left: 0,
        right: 400,
        bottom: 100,
      });

      expect(isEditable(textarea)).toBe(true);
      expect(shouldAttachTarget(textarea)).toBe(true);

      const originalText = getText(textarea);
      expect(originalText).toBe('The quik brown fox jumpd over the lazzy dog.');

      const result = await handleFixGrammar(originalText);
      expect(result.corrected).toBe('The quick brown fox jumps over the lazy dog.');
      expect(result.wordCount).toBe(9);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(result.detectedLanguage).toBe('en');

      setText(textarea, result.corrected);
      expect(textarea.value).toBe('The quick brown fox jumps over the lazy dog.');

      textarea.remove();
    });
  });

  describe('user submits text without configuring API token', () => {
    it('returns a helpful error guiding the user to setup', async () => {
      const result = await handleFixGrammar('Fix my grammer plz');
      expect(result.error).toContain('API token not configured');
      expect(result.error).toContain('extension icon');
    });
  });

  describe('API returns an error during grammar fix', () => {
    it('propagates the error with status code and details', async () => {
      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-expired-key',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ error: { message: 'Invalid API key' } }),
        }),
      );

      await expect(handleFixGrammar('Fix this')).rejects.toThrow('API error 401');
    });
  });

  describe('config validation rejects bad settings before they reach the API', () => {
    it('catches invalid URL before making any network call', async () => {
      vi.stubGlobal('fetch', vi.fn());

      const result = await validateConfig({
        apiUrl: 'not-a-url',
        token: 'sk-test',
        model: 'gpt-4',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid API URL');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('catches missing fields before making any network call', async () => {
      vi.stubGlobal('fetch', vi.fn());

      const result = await validateConfig({
        apiUrl: 'https://api.openai.com/v1',
        token: '',
        model: 'gpt-4',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing required field');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('token encryption keeps API keys secure at rest', () => {
    it('stores token encrypted and recovers it correctly across save/load', async () => {
      const sensitiveToken = 'sk-proj-abc123-very-secret';

      await saveConfig({
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: sensitiveToken,
      });

      const rawStore = globalThis.__testChromeStore['grammarfix_config'];
      expect(rawStore.encryptedToken).not.toBeNull();
      expect(JSON.stringify(rawStore)).not.toContain(sensitiveToken);

      const loaded = await getConfig();
      expect(loaded.token).toBe(sensitiveToken);
      expect(await hasToken()).toBe(true);
    });
  });
});
