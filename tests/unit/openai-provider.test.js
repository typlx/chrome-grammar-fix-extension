import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixGrammar, validateConfig } from '../../background/providers/openai-provider.js';

const baseConfig = {
  apiUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  token: 'sk-test',
};

const successResponse = {
  ok: true,
  json: async () => ({ choices: [{ message: { content: 'Fixed text.' } }] }),
};

afterEach(() => {
  vi.useRealTimers();
});

describe('openai-provider fixGrammar', () => {
  it('sends request with correct params and returns corrected text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successResponse));

    const result = await fixGrammar('Hello wrold', 'Fix grammar', baseConfig);
    expect(result).toBe('Fixed text.');

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('gpt-4o-mini');
  });

  it('attaches an AbortSignal to every fetch call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(successResponse));
    await fixGrammar('text', 'prompt', baseConfig);

    const [, opts] = fetch.mock.calls[0];
    expect(opts.signal).toBeDefined();
  });

  it('throws user-friendly message on TimeoutError', async () => {
    const timeoutError = Object.assign(new Error('The operation timed out.'), {
      name: 'TimeoutError',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    await expect(fixGrammar('text', 'prompt', baseConfig)).rejects.toThrow('Request timed out');
  });

  it('throws user-friendly message on AbortError', async () => {
    const abortError = Object.assign(new Error('The user aborted a request.'), {
      name: 'AbortError',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(fixGrammar('text', 'prompt', baseConfig)).rejects.toThrow('Request timed out');
  });

  it('throws user-friendly message on 408 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 408, text: async () => '' }),
    );

    await expect(fixGrammar('text', 'prompt', baseConfig)).rejects.toThrow(
      'Request timed out (408)',
    );
  });

  it('retries on 429 and succeeds on the third attempt', async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => '' })
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => '' })
      .mockResolvedValueOnce(successResponse);
    vi.stubGlobal('fetch', mockFetch);

    const promise = fixGrammar('text', 'prompt', baseConfig);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('Fixed text.');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('uses 1s then 2s backoff delays between 429 retries', async () => {
    vi.useFakeTimers();
    const delays = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay) => {
      if (typeof delay === 'number' && delay <= 2000) delays.push(delay);
      return realSetTimeout(fn, 0);
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => '' })
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => '' })
      .mockResolvedValueOnce(successResponse);
    vi.stubGlobal('fetch', mockFetch);

    const promise = fixGrammar('text', 'prompt', baseConfig);
    await vi.runAllTimersAsync();
    await promise;

    expect(delays).toContain(1000);
    expect(delays).toContain(2000);
  });

  it('stops retrying after 2 retries and throws on persistent 429', async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' });
    vi.stubGlobal('fetch', mockFetch);

    let caughtError;
    const promise = fixGrammar('text', 'prompt', baseConfig).catch((err) => {
      caughtError = err;
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(caughtError?.message).toContain('API error 429');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry on non-429 errors', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => 'Server error' });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fixGrammar('text', 'prompt', baseConfig)).rejects.toThrow('API error 500');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws on non-OK response that is not 408 or 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }),
    );

    await expect(fixGrammar('text', 'prompt', baseConfig)).rejects.toThrow('API error 401');
  });

  it('throws on unexpected response format', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [] }) }),
    );

    await expect(fixGrammar('text', 'prompt', baseConfig)).rejects.toThrow(
      'Unexpected API response format',
    );
  });
});

describe('openai-provider validateConfig', () => {
  it('attaches an AbortSignal to the fetch call', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'gpt-4o-mini' }] }),
      }),
    );

    await validateConfig(baseConfig);
    const [, opts] = fetch.mock.calls[0];
    expect(opts.signal).toBeDefined();
  });

  it('returns error when fetch times out (TimeoutError)', async () => {
    const timeoutError = Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const result = await validateConfig(baseConfig);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('returns error when fetch is aborted (AbortError)', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const result = await validateConfig(baseConfig);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('returns error when required fields are missing', async () => {
    const result = await validateConfig({ apiUrl: '', token: '', model: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Missing required field');
  });

  it('returns ok: true when config is valid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'gpt-4o-mini' }] }),
      }),
    );

    const result = await validateConfig(baseConfig);
    expect(result).toEqual({ ok: true });
  });
});
