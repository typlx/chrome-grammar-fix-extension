export const id = 'anthropic';
export const displayName = 'Anthropic Claude';

export const defaults = {
  apiUrl: 'https://api.anthropic.com/v1',
  model: 'claude-sonnet-4-20250514',
};

export const configFields = [
  { key: 'apiUrl', label: 'API URL', type: 'url', placeholder: 'https://api.anthropic.com/v1' },
  { key: 'model', label: 'Model', type: 'text', placeholder: 'claude-sonnet-4-20250514' },
  { key: 'token', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
];

async function fetchWithTimeout(url, options) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}

export async function fixGrammar(text, systemPrompt, config) {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/messages`;

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.token,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }],
    }),
  };

  const retryDelays = [1000, 2000];
  let response;
  for (let attempt = 0; attempt <= 2; attempt++) {
    response = await fetchWithTimeout(url, fetchOptions);
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
      continue;
    }
    break;
  }

  if (!response.ok) {
    if (response.status === 408) {
      throw new Error('Request timed out (408). Please try again.');
    }
    const body = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const corrected = data.content?.[0]?.text;

  if (!corrected) {
    throw new Error('Unexpected API response format');
  }

  return corrected.trim();
}

export async function validateConfig(config) {
  const apiUrl = config.apiUrl?.trim();
  const token = config.token?.trim();
  const model = config.model?.trim();

  if (!token || !model) {
    return {
      ok: false,
      error: 'Missing required field(s): model and API key are required.',
    };
  }

  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, error: 'API URL must start with http:// or https://' };
      }
    } catch {
      return {
        ok: false,
        error: 'Invalid API URL format. Example: https://api.anthropic.com/v1',
      };
    }
  }

  const baseUrl = (apiUrl || defaults.apiUrl).replace(/\/+$/, '');
  const url = `${baseUrl}/messages`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return { ok: false, error: 'Request timed out. Please try again.' };
    }
    return {
      ok: false,
      error: `Cannot reach Anthropic API (${url}). Details: ${err.message}`,
    };
  }

  if (response.status === 401) {
    return { ok: false, error: 'Invalid API key. Check your Anthropic API key.' };
  }

  if (response.status === 404) {
    const body = await response.text().catch(() => '');
    if (body.includes('model')) {
      return { ok: false, error: `Model "${model}" not found. Check the model name.` };
    }
    return { ok: false, error: 'API endpoint not found (404). Check the API URL.' };
  }

  if (response.status === 400) {
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      error: `Bad request (400). Model name or request format may be invalid. ${body.slice(0, 200)}`,
    };
  }

  if (response.status >= 500) {
    return { ok: false, error: `Anthropic server error (${response.status}). Try again later.` };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      error: `Anthropic API error (${response.status}). ${body.slice(0, 200)}`,
    };
  }

  return { ok: true };
}
