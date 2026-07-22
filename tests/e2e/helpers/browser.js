import puppeteer from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '..', '..', '..');

const SYSTEM_CHROMIUM_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

function resolveChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  for (const p of SYSTEM_CHROMIUM_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

export async function launchBrowser() {
  const executablePath = resolveChromiumPath();

  return puppeteer.launch({
    headless: 'new',
    ...(executablePath && { executablePath }),
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });
}

export async function getExtensionId(browser) {
  const target = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().includes('service-worker.js'),
    { timeout: 10_000 },
  );
  const match = target.url().match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error('Could not determine extension ID');
  return match[1];
}

export function extensionUrl(extensionId, pagePath) {
  return `chrome-extension://${extensionId}/${pagePath}`;
}

export async function configureExtension(browser, extensionId, apiUrl) {
  const page = await browser.newPage();
  await page.goto(extensionUrl(extensionId, 'popup/popup.html'), {
    waitUntil: 'domcontentloaded',
  });

  await page.evaluate(
    async (config) => {
      const SALT_KEY = 'grammarfix_salt';
      const CONFIG_KEY = 'grammarfix_config';

      const salt = crypto.getRandomValues(new Uint8Array(16));
      await chrome.storage.local.set({ [SALT_KEY]: Array.from(salt) });

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(chrome.runtime.id),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(config.token),
      );

      await chrome.storage.local.set({
        [CONFIG_KEY]: {
          provider: 'openai',
          apiUrl: config.apiUrl,
          model: config.model,
          encryptedToken: {
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(ciphertext)),
          },
        },
      });
    },
    { apiUrl, model: 'test-model', token: 'test-token-e2e' },
  );

  await page.close();
}
