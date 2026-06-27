import { describe, it, expect, vi } from 'vitest';
import {
  fixGrammar,
  validateConfig,
  extractApiErrorMessage,
  defaults,
} from '../../background/providers/openai-provider.js';

describe('openai-provider', () => {
  describe('fixGrammar', () => {
    it('sends correct headers and body to OpenAI-compatible API', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Corrected.' } }],
          }),
        }),
      );

      const config = {
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        token: 'sk-test-key',
      };

      const result = await fixGrammar('fix this', 'You are a grammar checker.', config);
      expect(result).toBe('Corrected.');

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(options.headers.Authorization).toBe('Bearer sk-test-key');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.temperature).toBe(0.3);
      expect(body.messages).toEqual([
        { role: 'system', content: 'You are a grammar checker.' },
        { role: 'user', content: 'fix this' },
      ]);
    });

    it('strips trailing slashes from API URL', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Done.' } }],
          }),
        }),
      );

      await fixGrammar('test', 'prompt', {
        apiUrl: 'https://api.openai.com/v1///',
        model: 'gpt-4o-mini',
        token: 'key',
      });

      expect(fetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('trims whitespace from corrected text', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '  Corrected with spaces.  ' } }],
          }),
        }),
      );

      const result = await fixGrammar('test', 'prompt', {
        apiUrl: 'https://api.openai.com/v1',
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
          apiUrl: 'https://api.openai.com/v1',
          model: 'm',
          token: 'k',
        }),
      ).rejects.toThrow('API error 429: Rate limit exceeded');
    });

    it('throws when response has no choices', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [] }),
        }),
      );

      await expect(
        fixGrammar('test', 'prompt', {
          apiUrl: 'https://api.openai.com/v1',
          model: 'm',
          token: 'k',
        }),
      ).rejects.toThrow('Unexpected API response format');
    });
  });

  describe('validateConfig', () => {
    it('rejects when any required field is missing', async () => {
      const result = await validateConfig({ apiUrl: 'https://example.com', model: 'gpt-4o-mini' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('rejects invalid URL protocol', async () => {
      const result = await validateConfig({
        apiUrl: 'ftp://api.openai.com/v1',
        token: 'sk-key',
        model: 'gpt-4o-mini',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('http://');
    });

    it('rejects malformed URL', async () => {
      const result = await validateConfig({
        apiUrl: 'not-a-url',
        token: 'sk-key',
        model: 'gpt-4o-mini',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid API URL');
    });

    it('returns ok when /models lists the requested model', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }],
          }),
        }),
      );

      const result = await validateConfig({
        apiUrl: 'https://api.openai.com/v1',
        token: 'sk-valid',
        model: 'gpt-4o-mini',
      });
      expect(result).toEqual({ ok: true });
    });

    it('returns error when model is not in /models list', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }],
          }),
        }),
      );

      const result = await validateConfig({
        apiUrl: 'https://api.openai.com/v1',
        token: 'sk-valid',
        model: 'nonexistent-model',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('nonexistent-model');
      expect(result.error).toContain('not found');
    });

    it('falls back to chat probe when /models returns 404 (self-hosted provider)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
          .mockResolvedValueOnce({ ok: true, status: 200 }),
      );

      const result = await validateConfig({
        apiUrl: 'http://localhost:11434/v1',
        token: 'ollama',
        model: 'llama3',
      });
      expect(result).toEqual({ ok: true });

      expect(fetch.mock.calls[0][0]).toBe('http://localhost:11434/v1/models');
      expect(fetch.mock.calls[1][0]).toBe('http://localhost:11434/v1/chat/completions');
    });

    it('reports auth error from chat probe when /models is unavailable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
          .mockResolvedValueOnce({ ok: false, status: 401 }),
      );

      const result = await validateConfig({
        apiUrl: 'http://localhost:11434/v1',
        token: 'bad-token',
        model: 'llama3',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('reports forbidden error from chat probe when /models is unavailable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
          .mockResolvedValueOnce({ ok: false, status: 403 }),
      );

      const result = await validateConfig({
        apiUrl: 'http://localhost:11434/v1',
        token: 'restricted-token',
        model: 'llama3',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Forbidden');
    });

    it('reports server error from chat probe when /models is unavailable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
          .mockResolvedValueOnce({ ok: false, status: 502 }),
      );

      const result = await validateConfig({
        apiUrl: 'http://localhost:11434/v1',
        token: 'token',
        model: 'llama3',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('server error');
    });

    it('reports network error from chat probe when server is unreachable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
          .mockRejectedValueOnce(new Error('Connection refused')),
      );

      const result = await validateConfig({
        apiUrl: 'http://localhost:11434/v1',
        token: 'token',
        model: 'llama3',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Cannot reach');
      expect(result.error).toContain('Connection refused');
    });

    it('returns network error when fetch throws on /models', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('DNS resolution failed')));

      const result = await validateConfig({
        apiUrl: 'https://bad-host.example.com/v1',
        token: 'sk-key',
        model: 'gpt-4o-mini',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Cannot reach');
      expect(result.error).toContain('DNS resolution failed');
    });

    it('returns 401 error from /models endpoint', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => '{"error":{"message":"Invalid API key"}}',
        }),
      );

      const result = await validateConfig({
        apiUrl: 'https://api.openai.com/v1',
        token: 'sk-bad',
        model: 'gpt-4o-mini',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('accepts chat probe 400 as valid (model may reject minimal request)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not Found' })
          .mockResolvedValueOnce({ ok: false, status: 400 }),
      );

      const result = await validateConfig({
        apiUrl: 'http://localhost:1234/v1',
        token: 'lm-studio',
        model: 'local-model',
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('extractApiErrorMessage', () => {
    it('extracts JSON error message from response body', async () => {
      const response = {
        status: 401,
        text: async () => '{"error":{"message":"Incorrect API key provided"}}',
      };
      const msg = await extractApiErrorMessage(response);
      expect(msg).toContain('Unauthorized');
      expect(msg).toContain('Incorrect API key provided');
    });

    it('handles plain text error body', async () => {
      const response = {
        status: 500,
        text: async () => 'Internal Server Error',
      };
      const msg = await extractApiErrorMessage(response);
      expect(msg).toContain('server error');
      expect(msg).toContain('Internal Server Error');
    });

    it('handles rate limit response', async () => {
      const response = {
        status: 429,
        text: async () => '{"error":{"message":"Rate limit exceeded"}}',
      };
      const msg = await extractApiErrorMessage(response);
      expect(msg).toContain('Rate limit');
    });

    it('handles empty response body', async () => {
      const response = {
        status: 400,
        text: async () => '',
      };
      const msg = await extractApiErrorMessage(response);
      expect(msg).toContain('400');
    });
  });
});
