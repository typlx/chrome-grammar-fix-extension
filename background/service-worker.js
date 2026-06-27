import { getConfig, getDisabledSites } from '../utils/storage.js';
import { getProvider, getDefaultProvider, getProviderList } from './providers/provider-registry.js';
import {
  recordCorrection,
  recordAccepted,
  recordRejected,
  recordResponseTime,
  getStats,
  getDailyTrend,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  resetStats,
} from '../utils/analytics.js';
import {
  detectLanguage,
  getSystemPrompt,
  getLanguageConfig,
  setLanguageConfig,
  getSupportedLanguages,
} from '../utils/language.js';

const LRU_MAX = 50;
const LRU_TTL_MS = 5 * 60 * 1000;
const grammarCache = new Map();

function cacheGet(text) {
  const entry = grammarCache.get(text);
  if (!entry) return null;
  if (Date.now() - entry.time > LRU_TTL_MS) {
    grammarCache.delete(text);
    return null;
  }
  grammarCache.delete(text);
  grammarCache.set(text, entry);
  return entry.result;
}

function cacheSet(text, result) {
  if (grammarCache.size >= LRU_MAX) {
    const oldest = grammarCache.keys().next().value;
    grammarCache.delete(oldest);
  }
  grammarCache.set(text, { result, time: Date.now() });
}

export function clearCache() {
  grammarCache.clear();
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const ONBOARDED_KEY = 'grammarfix_onboarded';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.get(ONBOARDED_KEY, (result) => {
      if (!result[ONBOARDED_KEY]) {
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
        chrome.storage.local.set({ [ONBOARDED_KEY]: true });
      }
    });
  }
});

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

  if (message.type === 'recordCorrection') {
    recordCorrection(message.charCount, message.wordCount || 0)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'recordAccepted') {
    recordAccepted()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'recordRejected') {
    recordRejected()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'getStats') {
    getStats()
      .then((stats) => sendResponse({ stats }))
      .catch(() => sendResponse({ stats: null }));
    return true;
  }

  if (message.type === 'getDailyTrend') {
    getDailyTrend(message.days || 7)
      .then((trend) => sendResponse({ trend }))
      .catch(() => sendResponse({ trend: [] }));
    return true;
  }

  if (message.type === 'getAnalyticsEnabled') {
    isAnalyticsEnabled()
      .then((enabled) => sendResponse({ enabled }))
      .catch(() => sendResponse({ enabled: false }));
    return true;
  }

  if (message.type === 'setAnalyticsEnabled') {
    setAnalyticsEnabled(message.enabled)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'resetStats') {
    resetStats()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'getLanguageConfig') {
    getLanguageConfig()
      .then((language) => sendResponse({ language }))
      .catch(() => sendResponse({ language: 'auto' }));
    return true;
  }

  if (message.type === 'setLanguageConfig') {
    setLanguageConfig(message.language)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'getSupportedLanguages') {
    sendResponse({ languages: getSupportedLanguages() });
    return false;
  }
});

export async function handleFixGrammar(text) {
  if (!text || !text.trim()) {
    return { error: 'No text to fix' };
  }

  const cached = cacheGet(text);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const config = await getConfig();

  if (!config.token) {
    return { error: 'API token not configured. Click the extension icon to set it up.' };
  }

  const provider = getProvider(config.provider) || getDefaultProvider();

  const langConfig = await getLanguageConfig();
  const lang = langConfig === 'auto' ? detectLanguage(text) : langConfig;
  const systemPrompt = getSystemPrompt(lang);

  const startMs = Date.now();
  const corrected = await provider.fixGrammar(text, systemPrompt, config);
  const elapsedMs = Date.now() - startMs;

  recordResponseTime(elapsedMs).catch(() => {});

  const wordCount = countWords(text);
  const result = { corrected, wordCount, elapsedMs, detectedLanguage: lang };
  cacheSet(text, result);
  return result;
}

export async function validateConfig(payload) {
  const providerId = payload?.provider || 'openai';
  const provider = getProvider(providerId);

  if (!provider) {
    return { ok: false, error: `Unknown provider: ${providerId}` };
  }

  return provider.validateConfig(payload);
}
