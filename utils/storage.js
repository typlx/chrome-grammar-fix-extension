import { encryptToken, decryptToken } from './crypto.js';

const CONFIG_KEY = 'grammarfix_config';
const DISABLED_SITES_KEY = 'grammarfix_disabled_sites';

const DEFAULT_CONFIG = {
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

export async function getConfig() {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  const stored = result[CONFIG_KEY] || {};
  return {
    provider: stored.provider || DEFAULT_CONFIG.provider,
    apiUrl: stored.apiUrl || DEFAULT_CONFIG.apiUrl,
    model: stored.model || DEFAULT_CONFIG.model,
    token: stored.encryptedToken ? await decryptToken(stored.encryptedToken) : '',
  };
}

export async function saveConfig({ provider, apiUrl, model, token }) {
  const encryptedToken = token ? await encryptToken(token) : null;
  await chrome.storage.local.set({
    [CONFIG_KEY]: {
      provider: provider || DEFAULT_CONFIG.provider,
      apiUrl: apiUrl || DEFAULT_CONFIG.apiUrl,
      model: model || DEFAULT_CONFIG.model,
      encryptedToken,
    },
  });
}

export async function hasToken() {
  const config = await getConfig();
  return !!config.token;
}

export async function getDisabledSites() {
  const result = await chrome.storage.local.get(DISABLED_SITES_KEY);
  return result[DISABLED_SITES_KEY] || [];
}

export async function setDisabledSites(sites) {
  await chrome.storage.local.set({ [DISABLED_SITES_KEY]: sites });
}

export async function toggleSite(hostname) {
  const sites = await getDisabledSites();
  const index = sites.indexOf(hostname);
  if (index === -1) {
    sites.push(hostname);
  } else {
    sites.splice(index, 1);
  }
  await setDisabledSites(sites);
  return index === -1;
}
