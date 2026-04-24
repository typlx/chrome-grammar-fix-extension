import { describe, it, expect, vi } from 'vitest';
import { saveConfig } from '../../utils/storage.js';
import { handleFixGrammar, validateConfig } from '../../background/service-worker.js';
import { extractApiErrorMessage } from '../../background/providers/openai-provider.js';

describe('service-worker', () => {
  describe('handleFixGrammar', () => {
    it('returns error when text is empty', async () => {
      const result = await handleFixGrammar('');
      expect(result).toEqual({ error: 'No text to fix' });
    });

    it('returns error when text is whitespace-only', async () => {
      const result = await handleFixGrammar('   \n  ');
      expect(result).toEqual({ error: 'No text to fix' });
    });

    it('returns error when text is null', async () => {
      const result = await handleFixGrammar(null);
      expect(result).toEqual({ error: 'No text to fix' });
    });

    it('returns error when API token is not configured', async () => {
      const result = await handleFixGrammar('fix this text');
      expect(result.error).toContain('API token not configured');
    });

    it('calls the OpenAI-compatible API and returns corrected text', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.example.com/v1',
        model: 'test-model',
        token: 'sk-test',
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Fixed text here.' } }],
        }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await handleFixGrammar('fix this plz');
      expect(result).toEqual({ corrected: 'Fixed text here.' });

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body).model).toBe('test-model');
      expect(options.headers.Authorization).toBe('Bearer sk-test');
    });

    it('calls the Anthropic API when provider is anthropic', async () => {
      await saveConfig({
        provider: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1',
        model: 'claude-sonnet-4-20250514',
        token: 'sk-ant-test',
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Corrected text from Claude.' }],
        }),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await handleFixGrammar('fix this plz');
      expect(result).toEqual({ corrected: 'Corrected text from Claude.' });

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(options.headers['x-api-key']).toBe('sk-ant-test');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
    });

    it('strips trailing slashes from API URL before calling', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.example.com/v1///',
        model: 'test-model',
        token: 'sk-test',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Done.' } }],
          }),
        }),
      );

      await handleFixGrammar('hello');
      expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions');
    });

    it('throws on non-OK API response', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.example.com/v1',
        model: 'test-model',
        token: 'sk-test',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        }),
      );

      await expect(handleFixGrammar('hello')).rejects.toThrow('API error 401');
    });

    it('throws when API response has no choices', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.example.com/v1',
        model: 'test-model',
        token: 'sk-test',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [] }),
        }),
      );

      await expect(handleFixGrammar('hello')).rejects.toThrow('Unexpected API response format');
    });
  });

  describe('validateConfig', () => {
    it('delegates to the OpenAI provider for openai config', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ id: 'gpt-4o-mini' }],
          }),
        }),
      );

      const result = await validateConfig({
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        token: 'sk-valid',
        model: 'gpt-4o-mini',
      });
      expect(result).toEqual({ ok: true });
    });

    it('delegates to the Anthropic provider for anthropic config', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            content: [{ type: 'text', text: 'Hi' }],
          }),
        }),
      );

      const result = await validateConfig({
        provider: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1',
        token: 'sk-ant-valid',
        model: 'claude-sonnet-4-20250514',
      });
      expect(result).toEqual({ ok: true });
    });

    it('rejects unknown providers', async () => {
      const result = await validateConfig({
        provider: 'nonexistent',
        apiUrl: 'https://api.example.com',
        token: 'tk',
        model: 'model',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unknown provider');
    });

    it('defaults to openai when provider is not specified', async () => {
      const result = await validateConfig({
        apiUrl: '',
        token: 'tk',
        model: 'gpt-4',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Missing required field');
    });
  });

  describe('extractApiErrorMessage (OpenAI provider)', () => {
    async function makeResponse(status, body) {
      return {
        status,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      };
    }

    it('returns bad-request message for 400', async () => {
      const msg = await extractApiErrorMessage(await makeResponse(400, 'bad'));
      expect(msg).toContain('Bad request');
      expect(msg).toContain('400');
    });

    it('returns unauthorized message for 401', async () => {
      const msg = await extractApiErrorMessage(
        await makeResponse(401, { error: { message: 'Invalid key' } }),
      );
      expect(msg).toContain('Unauthorized (401)');
      expect(msg).toContain('Invalid key');
    });

    it('returns forbidden message for 403', async () => {
      const msg = await extractApiErrorMessage(await makeResponse(403, ''));
      expect(msg).toContain('Forbidden (403)');
    });

    it('returns not-found message for 404', async () => {
      const msg = await extractApiErrorMessage(await makeResponse(404, ''));
      expect(msg).toContain('not found (404)');
    });

    it('returns rate-limit message for 429', async () => {
      const msg = await extractApiErrorMessage(await makeResponse(429, 'quota exceeded'));
      expect(msg).toContain('Rate limit');
      expect(msg).toContain('429');
    });

    it('returns server-error message for 500', async () => {
      const msg = await extractApiErrorMessage(await makeResponse(500, 'Internal error'));
      expect(msg).toContain('server error');
      expect(msg).toContain('500');
    });

    it('returns generic message for unknown status codes', async () => {
      const msg = await extractApiErrorMessage(await makeResponse(418, "I'm a teapot"));
      expect(msg).toContain('418');
    });

    it('extracts error.message from JSON error responses', async () => {
      const msg = await extractApiErrorMessage(
        await makeResponse(401, { error: { message: 'Specific error detail' } }),
      );
      expect(msg).toContain('Specific error detail');
    });

    it('truncates very long error details', async () => {
      const longDetail = 'x'.repeat(500);
      const msg = await extractApiErrorMessage(await makeResponse(400, longDetail));
      expect(msg.length).toBeLessThan(400);
    });
  });
});
