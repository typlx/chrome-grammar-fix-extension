const ANALYTICS_KEY = 'grammarfix_analytics';
const ANALYTICS_ENABLED_KEY = 'grammarfix_analytics_enabled';

const DEFAULT_STATS = {
  totalCorrections: 0,
  totalAccepted: 0,
  totalRejected: 0,
  charactersProcessed: 0,
  lastUsed: null,
};

export async function isAnalyticsEnabled() {
  const result = await chrome.storage.local.get(ANALYTICS_ENABLED_KEY);
  return result[ANALYTICS_ENABLED_KEY] === true;
}

export async function setAnalyticsEnabled(enabled) {
  await chrome.storage.local.set({ [ANALYTICS_ENABLED_KEY]: enabled });
}

export async function getStats() {
  const result = await chrome.storage.local.get(ANALYTICS_KEY);
  return { ...DEFAULT_STATS, ...(result[ANALYTICS_KEY] || {}) };
}

export async function recordCorrection(charCount) {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalCorrections++;
  stats.charactersProcessed += charCount;
  stats.lastUsed = new Date().toISOString();
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });
}

export async function recordAccepted() {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalAccepted++;
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });
}

export async function recordRejected() {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalRejected++;
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });
}

export async function resetStats() {
  await chrome.storage.local.set({ [ANALYTICS_KEY]: { ...DEFAULT_STATS } });
}
