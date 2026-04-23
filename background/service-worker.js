import { getConfig } from '../utils/storage.js';

const SYSTEM_PROMPT =
  'Fix grammar and spelling in the following text. Return only the corrected text, nothing else. Preserve the original language, tone, and formatting.';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'fixGrammar') {
    handleFixGrammar(message.text)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'checkToken') {
    getConfig()
      .then((config) => sendResponse({ hasToken: !!config.token }))
      .catch(() => sendResponse({ hasToken: false }));
    return true;
  }

  if (message.type === 'validateConfig') {
    validateConfig(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

export async function handleFixGrammar(text) {
  if (!text || !text.trim()) {
    return { error: 'No text to fix' };
  }

  const config = await getConfig();

  if (!config.token) {
    return { error: 'API token not configured. Click the extension icon to set it up.' };
  }

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
        { role: 'system', content: SYSTEM_PROMPT },
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

  return { corrected: corrected.trim() };
}

export async function validateConfig(payload) {
  const apiUrl = payload?.apiUrl?.trim();
  const token = payload?.token?.trim();
  const model = payload?.model?.trim();

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
      return {
        ok: false,
        error: 'API URL must start with http:// or https://',
      };
    }
    normalizedBaseUrl = parsed.href.replace(/\/+$/, '');
  } catch {
    return {
      ok: false,
      error: 'Invalid API URL format. Example: https://api.openai.com/v1',
    };
  }

  const url = `${normalizedBaseUrl}/models`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: `Cannot reach API URL (${url}). Check URL/network/CORS. Details: ${err.message}`,
    };
  }

  if (!response.ok) {
    const parsedError = await extractApiErrorMessage(response);
    return {
      ok: false,
      error: parsedError,
    };
  }

  let data;
  try {
    data = await response.json();
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

  if (status === 400) {
    return `Bad request to /models (400). API URL may be wrong or provider expects different format. ${compactDetails}`;
  }
  if (status === 401) {
    return `Unauthorized (401). Token is invalid, expired, or missing required prefix. ${compactDetails}`;
  }
  if (status === 403) {
    return `Forbidden (403). Token is valid but does not have permission for this endpoint. ${compactDetails}`;
  }
  if (status === 404) {
    return `Endpoint not found (404). API URL is likely incorrect. For OpenAI use: https://api.openai.com/v1`;
  }
  if (status === 429) {
    return `Rate limit / quota exceeded (429). Token works, but usage limit was reached. ${compactDetails}`;
  }
  if (status >= 500) {
    return `Provider server error (${status}). Try again later. ${compactDetails}`;
  }

  return `Model check failed (${status}). ${compactDetails || 'Unknown API error.'}`;
}
