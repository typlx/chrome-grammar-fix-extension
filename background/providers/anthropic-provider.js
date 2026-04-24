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

export async function fixGrammar(text, systemPrompt, config) {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/messages`;

  const response = await fetch(url, {
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
  });

  if (!response.ok) {
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
    });
  } catch (err) {
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

  if (response.status >= 500) {
    return { ok: false, error: `Anthropic server error (${response.status}). Try again later.` };
  }

  return { ok: true };
}
