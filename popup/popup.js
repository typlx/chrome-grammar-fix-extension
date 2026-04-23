import { getConfig, saveConfig } from '../utils/storage.js';

const form = document.getElementById('settings-form');
const apiUrlInput = document.getElementById('apiUrl');
const modelInput = document.getElementById('model');
const tokenInput = document.getElementById('token');
const toggleBtn = document.getElementById('toggle-token');
const toast = document.getElementById('toast');

let toastTimer;

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => {
      toast.classList.remove('visible');
    },
    type === 'error' ? 7000 : 2500,
  );
}

async function loadSettings() {
  try {
    const config = await getConfig();
    apiUrlInput.value = config.apiUrl;
    modelInput.value = config.model;
    if (config.token) {
      tokenInput.value = config.token;
    }
  } catch (_err) {
    showToast('Failed to load settings', 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      apiUrl: apiUrlInput.value.trim(),
      model: modelInput.value.trim(),
      token: tokenInput.value.trim(),
    };

    const validation = await chrome.runtime.sendMessage({
      type: 'validateConfig',
      payload,
    });

    if (!validation?.ok) {
      showToast(validation?.error || 'Config validation failed', 'error');
      return;
    }

    await saveConfig({
      apiUrl: payload.apiUrl,
      model: payload.model,
      token: payload.token,
    });
    showToast('Settings saved and validated');
  } catch (_err) {
    showToast('Failed to save settings', 'error');
  }
});

toggleBtn.addEventListener('click', () => {
  const isPassword = tokenInput.type === 'password';
  tokenInput.type = isPassword ? 'text' : 'password';
});

loadSettings();
