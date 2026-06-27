import { describe, it, expect, vi } from 'vitest';
import { fixGrammar, validateConfig, defaults } from '../../background/providers/anthropic-provider.js';

describe('anthropic-provider', () => {
  describe('fixGrammar', () => {
    it('sends correct headers and body to Anthropic API', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            content: [{ type: 'text', text: 'Corrected.' }],
          }),
        }),
      );

      const config = {
        apiUrl: 'https://api.anthropic.com/v1',
        model: 'claude-sonnet-4-20250514',
        token: 'sk-ant-key',
      };

      const result = await fixGrammar('fix this', 'You are a grammar checker.', config);
      expect(result).toBe('Corrected.');

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(options.headers['x-api-key']).toBe('sk-ant-key');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
      expect(options.headers['anthropic-dangerous-direct-browser-access']).toBe('true');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.max_tokens).toBe(4096);
      expect(body.system).toBe('You are a grammar checker.');
      expect(body.messages).toEqual([{ role: 'user', content: 'fix this' }]);
    });

    it('strips trailing slashes from API URL', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            content: [{ type: 'text', text: 'Done.' }],
          }),
        }),
      );

      await fixGrammar('test', 'prompt', {
        apiUrl: 'https://api.anthropic.com/v1///',
        model: 'claude-sonnet-4-20250514',
        token: 'key',
      });

      expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
    });

    it('trims whitespace from corrected text', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            content: [{ type: 'text', text: '  Corrected with spaces.  ' }],
          }),
        }),
      );

      const result = await fixGrammar('test', 'prompt', {
        apiUrl: 'https://api.anthropic.com/v1',
        model: 'm',
        token: 'k',
      });
      expect(result).toBe('Corrected with spaces.');
    });

    it('throws on non-OK response with status and body excerpt', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        }),
      );

      await expect(
        fixGrammar('test', 'prompt', {
          apiUrl: 'https://api.anthropic.com/v1',
          model: 'm',
          token: 'k',
        }),
      ).rejects.toThrow('API error 429: Rate limit exceeded');
    });

    it('throws on non-OK response when body read fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => {
            throw new Error('read failed');
          },
        }),
      );

      await expect(
        fixGrammar('test', 'prompt', {
          apiUrl: 'https://api.anthropic.com/v1',
          model: 'm',
          token: 'k',
        }),
      ).rejects.toThrow('API error 500');
    });

    it('throws when response has no content', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ content: [] }),
        }),
      );

      await expect(
        fixGrammar('test', 'prompt', {
          apiUrl: 'https://api.anthropic.com/v1',
          model: 'm',
          token: 'k',
        }),
      ).rejects.toThrow('Unexpected API response format');
    });

    it('throws when response content has no text', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ content: [{ type: 'image' }] }),
        }),
      );

      await expect(
        fixGrammar('test', 'prompt', {
          apiUrl: 'https://api.anthropic.com/v1',
          model: 'm',
          token: 'k',
        }),
      ).rejects.toThrow('Unexpected API response format');
    });
  });

  describe('validateConfig', () => {
    it('rejects when token is missing', async () => {
      const result = await validateConfig({ model: 'claude-sonnet-4-20250514' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('rejects when model is missing', async () => {
      const result = await validateConfig({ token: 'sk-ant-key' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('rejects when both token and model are missing', async () => {
      const result = await validateConfig({});
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('rejects invalid URL protocol', async () => {
      const result = await validateConfig({
        apiUrl: 'ftp://api.anthropic.com/v1',
        token: 'sk-ant-key',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('http://');
    });

    it('rejects malformed URL', async () => {
      const result = await validateConfig({
        apiUrl: 'not-a-url',
        token: 'sk-ant-key',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid API URL');
    });

    it('returns ok when API responds successfully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ content: [{ type: 'text', text: 'Hi' }] }),
        }),
      );

      const result = await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result).toEqual({ ok: true });
    });

    it('uses default API URL when none provided', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ content: [{ type: 'text', text: 'Hi' }] }),
        }),
      );

      await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toBe(`${defaults.apiUrl}/messages`);
    });

    it('returns error for 401 unauthorized', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
        }),
      );

      const result = await validateConfig({
        token: 'sk-ant-bad',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('returns model-not-found error for 404 when body mentions model', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => 'model: claude-nonexistent not found',
        }),
      );

      const result = await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-nonexistent',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.error).toContain('claude-nonexistent');
    });

    it('returns endpoint-not-found error for 404 without model reference', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => 'page not found',
        }),
      );

      const result = await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found (404)');
    });

    it('returns server error for 500+ status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
        }),
      );

      const result = await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('server error');
      expect(result.error).toContain('503');
    });

    it('returns network error when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network timeout')));

      const result = await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Cannot reach');
      expect(result.error).toContain('Network timeout');
    });

    it('handles 404 when body text() rejects', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => {
            throw new Error('read failed');
          },
        }),
      );

      const result = await validateConfig({
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result.ok).toBe(false);
    });
  });
});
