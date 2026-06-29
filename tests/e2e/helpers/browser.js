import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '..', '..', '..');

export async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
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
  await page.waitForSelector('#apiUrl');

  await page.evaluate((url) => {
    const setField = (id, value) => {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setField('apiUrl', url);
    setField('model', 'test-model');
    setField('token', 'test-token-e2e');
  }, apiUrl);

  await page.click('button[type="submit"]');
  await page.waitForSelector('.toast.success.visible', { timeout: 15_000 });
  await page.close();
}
