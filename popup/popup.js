import { getConfig, saveConfig, getDisabledSites, setDisabledSites } from '../utils/storage.js';

const PROVIDER_FIELDS = {
  openai: [
    { key: 'apiUrl', label: 'API URL', type: 'url', placeholder: 'https://api.openai.com/v1' },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
    { key: 'token', label: 'API Token', type: 'password', placeholder: 'sk-...' },
  ],
  anthropic: [
    {
      key: 'apiUrl',
      label: 'API URL',
      type: 'url',
      placeholder: 'https://api.anthropic.com/v1',
    },
    { key: 'model', label: 'Model', type: 'text', placeholder: 'claude-sonnet-4-20250514' },
    { key: 'token', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
  ],
};

const PROVIDER_DEFAULTS = {
  openai: { apiUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { apiUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const form = document.getElementById('settings-form');
const providerSelect = document.getElementById('provider');
const languageSelect = document.getElementById('language');
const dynamicFields = document.getElementById('dynamic-fields');
const toast = document.getElementById('toast');

const tabs = document.querySelectorAll('.tab');
const settingsPanel = document.getElementById('settings-panel');
const sitesPanel = document.getElementById('sites-panel');
const toggleCurrentSiteBtn = document.getElementById('toggle-current-site');
const currentSiteLabel = document.getElementById('current-site-label');
const disabledSitesList = document.getElementById('disabled-sites-list');
const noDisabledSites = document.getElementById('no-disabled-sites');
const statsPanel = document.getElementById('stats-panel');
const setupHint = document.getElementById('setup-hint');
const toggleAnalyticsBtn = document.getElementById('toggle-analytics');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const trendChart = document.getElementById('trend-chart');

let currentHostname = null;
let toastTimer;

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), type === 'error' ? 7000 : 2500);
}

function renderFields(providerId, values = {}) {
  const fields = PROVIDER_FIELDS[providerId] || PROVIDER_FIELDS.openai;
  const defaults = PROVIDER_DEFAULTS[providerId] || {};

  dynamicFields.innerHTML = fields
    .map((field) => {
      const value = values[field.key] || defaults[field.key] || '';
      if (field.type === 'password') {
        return `
        <div class="field">
          <label for="${field.key}">${field.label}</label>
          <div class="token-wrap">
            <input type="password" id="${field.key}" placeholder="${field.placeholder}"
              autocomplete="off" spellcheck="false" value="${escapeAttr(value)}" />
            <button type="button" class="icon-btn toggle-visibility" data-target="${field.key}" title="Show/hide">
              <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>`;
      }
      return `
      <div class="field">
        <label for="${field.key}">${field.label}</label>
        <input type="${field.type}" id="${field.key}" placeholder="${field.placeholder}"
          autocomplete="off" spellcheck="false" value="${escapeAttr(value)}" />
      </div>`;
    })
    .join('');

  dynamicFields.querySelectorAll('.toggle-visibility').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function getFieldValues(providerId) {
  const fields = PROVIDER_FIELDS[providerId] || PROVIDER_FIELDS.openai;
  const values = { provider: providerId };
  for (const field of fields) {
    const input = document.getElementById(field.key);
    values[field.key] = input ? input.value.trim() : '';
  }
  return values;
}

async function loadSettings() {
  try {
    const config = await getConfig();
    providerSelect.value = config.provider;
    renderFields(config.provider, config);
  } catch {
    showToast('Failed to load settings', 'error');
  }

  try {
    const { language } = await chrome.runtime.sendMessage({ type: 'getLanguageConfig' });
    languageSelect.value = language || 'auto';
  } catch {
    /* language config unavailable */
  }
}

providerSelect.addEventListener('change', () => {
  const providerId = providerSelect.value;
  const defaults = PROVIDER_DEFAULTS[providerId] || {};
  renderFields(providerId, defaults);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = getFieldValues(providerSelect.value);

    const validation = await chrome.runtime.sendMessage({
      type: 'validateConfig',
      payload,
    });

    if (!validation?.ok) {
      showToast(validation?.error || 'Config validation failed', 'error');
      return;
    }

    await saveConfig(payload);
    await chrome.runtime.sendMessage({
      type: 'setLanguageConfig',
      language: languageSelect.value,
    });
    showToast('Settings saved and validated');
  } catch {
    showToast('Failed to save settings', 'error');
  }
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const target = tab.dataset.tab;
    settingsPanel.classList.toggle('hidden', target !== 'settings');
    sitesPanel.classList.toggle('hidden', target !== 'sites');
    statsPanel.classList.toggle('hidden', target !== 'stats');

    if (target === 'sites') loadSitesPanel();
    if (target === 'stats') loadStatsPanel();
  });
});

async function loadSitesPanel() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.url) {
      currentHostname = new URL(activeTab.url).hostname;
      currentSiteLabel.textContent = currentHostname;
    } else {
      currentHostname = null;
      currentSiteLabel.textContent = 'No active site';
    }
  } catch {
    currentHostname = null;
    currentSiteLabel.textContent = 'No active site';
  }

  const disabledSites = await getDisabledSites();

  if (currentHostname) {
    const isDisabled = disabledSites.includes(currentHostname);
    toggleCurrentSiteBtn.classList.toggle('off', isDisabled);
    toggleCurrentSiteBtn.disabled = false;
  } else {
    toggleCurrentSiteBtn.classList.add('off');
    toggleCurrentSiteBtn.disabled = true;
  }

  renderDisabledSites(disabledSites);
}

function renderDisabledSites(sites) {
  disabledSitesList.innerHTML = '';

  if (sites.length === 0) {
    noDisabledSites.classList.remove('hidden');
    return;
  }

  noDisabledSites.classList.add('hidden');

  for (const site of sites) {
    const li = document.createElement('li');
    li.className = 'site-item';

    const span = document.createElement('span');
    span.textContent = site;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'site-remove-btn';
    removeBtn.textContent = '×';
    removeBtn.title = `Re-enable ${site}`;
    removeBtn.addEventListener('click', async () => {
      const updated = (await getDisabledSites()).filter((s) => s !== site);
      await setDisabledSites(updated);
      renderDisabledSites(updated);
      if (site === currentHostname) {
        toggleCurrentSiteBtn.classList.remove('off');
      }
    });

    li.append(span, removeBtn);
    disabledSitesList.appendChild(li);
  }
}

toggleCurrentSiteBtn.addEventListener('click', async () => {
  if (!currentHostname) return;

  const disabledSites = await getDisabledSites();
  const isDisabled = disabledSites.includes(currentHostname);

  let updated;
  if (isDisabled) {
    updated = disabledSites.filter((s) => s !== currentHostname);
  } else {
    updated = [...disabledSites, currentHostname];
  }

  await setDisabledSites(updated);
  toggleCurrentSiteBtn.classList.toggle('off', !isDisabled);
  renderDisabledSites(updated);
});

async function loadStatsPanel() {
  try {
    const { stats } = await chrome.runtime.sendMessage({ type: 'getStats' });
    if (stats) {
      document.getElementById('stat-corrections').textContent = stats.totalCorrections;
      document.getElementById('stat-accepted').textContent = stats.totalAccepted;
      document.getElementById('stat-rejected').textContent = stats.totalRejected;
      document.getElementById('stat-words').textContent = formatNumber(stats.wordsChecked || 0);

      const total = stats.totalAccepted + stats.totalRejected;
      const accuracy = total > 0 ? `${Math.round((stats.totalAccepted / total) * 100)}%` : '—';
      document.getElementById('stat-accuracy').textContent = accuracy;

      const avgTime =
        stats.responseCount > 0
          ? `${Math.round(stats.totalResponseMs / stats.responseCount)}ms`
          : '—';
      document.getElementById('stat-avg-time').textContent = avgTime;

      const lastUsedEl = document.getElementById('stat-last-used');
      if (stats.lastUsed) {
        const date = new Date(stats.lastUsed);
        lastUsedEl.textContent = `Last used: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        lastUsedEl.textContent = 'No corrections yet';
      }
    }

    const { enabled } = await chrome.runtime.sendMessage({ type: 'getAnalyticsEnabled' });
    toggleAnalyticsBtn.classList.toggle('off', !enabled);

    const { trend } = await chrome.runtime.sendMessage({ type: 'getDailyTrend', days: 7 });
    renderTrendChart(trend || []);
  } catch {
    /* stats unavailable */
  }
}

function renderTrendChart(trend) {
  trendChart.innerHTML = '';

  if (!trend.length) return;

  const maxVal = Math.max(1, ...trend.map((d) => Math.max(d.corrections, d.accepted)));

  for (const day of trend) {
    const group = document.createElement('div');
    group.className = 'trend-bar-group';

    const bars = document.createElement('div');
    bars.className = 'trend-bars';

    const corrBar = document.createElement('div');
    corrBar.className = 'trend-bar corrections';
    corrBar.style.height = `${(day.corrections / maxVal) * 100}%`;
    corrBar.title = `${day.corrections} corrections`;

    const accBar = document.createElement('div');
    accBar.className = 'trend-bar accepted';
    accBar.style.height = `${(day.accepted / maxVal) * 100}%`;
    accBar.title = `${day.accepted} accepted`;

    bars.append(corrBar, accBar);

    const label = document.createElement('div');
    label.className = 'trend-day-label';
    const dateObj = new Date(day.date + 'T12:00:00');
    label.textContent = DAY_LABELS[dateObj.getDay()];

    group.append(bars, label);
    trendChart.appendChild(group);
  }
}

function formatNumber(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

toggleAnalyticsBtn.addEventListener('click', async () => {
  const isOff = toggleAnalyticsBtn.classList.contains('off');
  await chrome.runtime.sendMessage({ type: 'setAnalyticsEnabled', enabled: isOff });
  toggleAnalyticsBtn.classList.toggle('off', !isOff);
});

resetStatsBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'resetStats' });
  await loadStatsPanel();
  showToast('Stats reset');
});

async function checkFirstRun() {
  try {
    const config = await getConfig();
    if (!config.token) {
      setupHint.classList.remove('hidden');
    }
  } catch {
    /* ignore */
  }
}

loadSettings();
checkFirstRun();
