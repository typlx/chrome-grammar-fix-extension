const ANALYTICS_KEY = 'grammarfix_analytics';
const ANALYTICS_ENABLED_KEY = 'grammarfix_analytics_enabled';
const DAILY_HISTORY_KEY = 'grammarfix_daily_history';
const MAX_HISTORY_DAYS = 30;

const DEFAULT_STATS = {
  totalCorrections: 0,
  totalAccepted: 0,
  totalRejected: 0,
  charactersProcessed: 0,
  wordsChecked: 0,
  totalResponseMs: 0,
  responseCount: 0,
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getDailyHistory() {
  const result = await chrome.storage.local.get(DAILY_HISTORY_KEY);
  return result[DAILY_HISTORY_KEY] || {};
}

async function updateDailyHistory(update) {
  const history = await getDailyHistory();
  const today = todayKey();

  if (!history[today]) {
    history[today] = { corrections: 0, accepted: 0, rejected: 0, words: 0 };
  }

  update(history[today]);

  const keys = Object.keys(history).sort();
  if (keys.length > MAX_HISTORY_DAYS) {
    for (const key of keys.slice(0, keys.length - MAX_HISTORY_DAYS)) {
      delete history[key];
    }
  }

  await chrome.storage.local.set({ [DAILY_HISTORY_KEY]: history });
}

export async function getDailyTrend(days = 7) {
  const history = await getDailyHistory();
  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = history[key] || { corrections: 0, accepted: 0, rejected: 0, words: 0 };
    result.push({ date: key, ...entry });
  }

  return result;
}

export async function recordCorrection(charCount, wordCount = 0) {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalCorrections++;
  stats.charactersProcessed += charCount;
  stats.wordsChecked += wordCount;
  stats.lastUsed = new Date().toISOString();
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });

  await updateDailyHistory((day) => {
    day.corrections++;
    day.words += wordCount;
  });
}

export async function recordAccepted() {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalAccepted++;
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });

  await updateDailyHistory((day) => {
    day.accepted++;
  });
}

export async function recordRejected() {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalRejected++;
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });

  await updateDailyHistory((day) => {
    day.rejected++;
  });
}

export async function recordResponseTime(ms) {
  if (!(await isAnalyticsEnabled())) return;

  const stats = await getStats();
  stats.totalResponseMs += ms;
  stats.responseCount++;
  await chrome.storage.local.set({ [ANALYTICS_KEY]: stats });
}

export async function resetStats() {
  await chrome.storage.local.set({
    [ANALYTICS_KEY]: { ...DEFAULT_STATS },
    [DAILY_HISTORY_KEY]: {},
  });
}
