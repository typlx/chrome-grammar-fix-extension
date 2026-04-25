import { getConfig, getDisabledSites } from '../utils/storage.js';
import { getProvider, getDefaultProvider, getProviderList } from './providers/provider-registry.js';

const SYSTEM_PROMPT =
  'Fix grammar and spelling in the following text. Return only the corrected text, nothing else. Preserve the original language, tone, and formatting.';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'fixGrammar') {
    handleFixGrammar(message.text)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
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

  if (message.type === 'getProviders') {
    sendResponse({ providers: getProviderList() });
    return false;
  }

  if (message.type === 'isSiteEnabled') {
    getDisabledSites()
      .then((sites) => sendResponse({ enabled: !sites.includes(message.hostname) }))
      .catch(() => sendResponse({ enabled: true }));
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

  const provider = getProvider(config.provider) || getDefaultProvider();

  const corrected = await provider.fixGrammar(text, SYSTEM_PROMPT, config);
  return { corrected };
}

export async function validateConfig(payload) {
  const providerId = payload?.provider || 'openai';
  const provider = getProvider(providerId);

  if (!provider) {
    return { ok: false, error: `Unknown provider: ${providerId}` };
  }

  return provider.validateConfig(payload);
}
