export const id = 'openai';
export const displayName = 'OpenAI Compatible';

export const defaults = {
  apiUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

export const configFields = [
  { key: 'apiUrl', label: 'API URL', type: 'url', placeholder: 'https://api.openai.com/v1' },
  { key: 'model', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
  { key: 'token', label: 'API Token', type: 'password', placeholder: 'sk-...' },
];

export async function fixGrammar(text, systemPrompt, config) {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const corrected = data.choices?.[0]?.message?.content;

  if (!corrected) {
    throw new Error('Unexpected API response format');
  }

  return corrected.trim();
}

export async function validateConfig(config) {
  const apiUrl = config.apiUrl?.trim();
  const token = config.token?.trim();
  const model = config.model?.trim();

  if (!apiUrl || !token || !model) {
    return {
      ok: false,
      error: 'Missing required field(s): API URL, model, and token are all required.',
    };
  }

  let normalizedBaseUrl;
  try {
    const parsed = new URL(apiUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: 'API URL must start with http:// or https://' };
    }
    normalizedBaseUrl = parsed.href.replace(/\/+$/, '');
  } catch {
    return {
      ok: false,
      error: 'Invalid API URL format. Example: https://api.openai.com/v1',
    };
  }

  const modelsUrl = `${normalizedBaseUrl}/models`;
  let modelsResponse;
  try {
    modelsResponse = await fetch(modelsUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return {
      ok: false,
      error: `Cannot reach API URL (${modelsUrl}). Check URL/network/CORS. Details: ${err.message}`,
    };
  }

  if (modelsResponse.status === 404) {
    return await validateViaChatProbe(normalizedBaseUrl, token, model);
  }

  if (!modelsResponse.ok) {
    const parsedError = await extractApiErrorMessage(modelsResponse);
    return { ok: false, error: parsedError };
  }

  let data;
  try {
    data = await modelsResponse.json();
  } catch {
    return {
      ok: false,
      error: 'API returned non-JSON response for /models. Check provider compatibility.',
    };
  }

  const models = Array.isArray(data?.data) ? data.data : null;
  if (!models) {
    return {
      ok: false,
      error:
        'API /models response format is unsupported. Expected JSON with data: [{ id: "model-name" }].',
    };
  }

  const modelExists = models.some((item) => item?.id === model);
  if (!modelExists) {
    const sampleModels = models
      .map((item) => item?.id)
      .filter(Boolean)
      .slice(0, 5);
    return {
      ok: false,
      error: sampleModels.length
        ? `Model "${model}" not found for this token. Available examples: ${sampleModels.join(', ')}`
        : `Model "${model}" not found for this token.`,
    };
  }

  return { ok: true };
}

async function validateViaChatProbe(baseUrl, token, model) {
  const url = `${baseUrl}/chat/completions`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Cannot reach API (${url}). Check URL/network/CORS. Details: ${err.message}`,
    };
  }

  if (response.status === 401) {
    return { ok: false, error: 'Unauthorized (401). Token is invalid, expired, or missing required prefix.' };
  }

  if (response.status === 403) {
    return { ok: false, error: 'Forbidden (403). Token does not have permission for this endpoint.' };
  }

  if (response.status >= 500) {
    return { ok: false, error: `Provider server error (${response.status}). Try again later.` };
  }

  return { ok: true };
}

export async function extractApiErrorMessage(response) {
  const status = response.status;
  let details = '';
  try {
    const text = await response.text();
    if (text) {
      try {
        const json = JSON.parse(text);
        details = json?.error?.message || json?.message || json?.detail || text;
      } catch {
        details = text;
      }
    }
  } catch {
    details = '';
  }

  const compactDetails = details.replace(/\s+/g, ' ').trim().slice(0, 220);

  if (status === 400)
    return `Bad request to /models (400). API URL may be wrong or provider expects different format. ${compactDetails}`;
  if (status === 401)
    return `Unauthorized (401). Token is invalid, expired, or missing required prefix. ${compactDetails}`;
  if (status === 403)
    return `Forbidden (403). Token is valid but does not have permission for this endpoint. ${compactDetails}`;
  if (status === 404)
    return `Endpoint not found (404). API URL is likely incorrect. For OpenAI use: https://api.openai.com/v1`;
  if (status === 429)
    return `Rate limit / quota exceeded (429). Token works, but usage limit was reached. ${compactDetails}`;
  if (status >= 500) return `Provider server error (${status}). Try again later. ${compactDetails}`;

  return `Model check failed (${status}). ${compactDetails || 'Unknown API error.'}`;
}
