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

  const fillField = async (id, value) => {
    const input = await page.$(`#${id}`);
    await input.click({ clickCount: 3 });
    await input.type(value);
  };

  await fillField('apiUrl', apiUrl);
  await fillField('model', 'test-model');
  await fillField('token', 'test-token-e2e');

  await page.click('button[type="submit"]');
  await page.waitForSelector('.toast.success.visible', { timeout: 10_000 });
  await page.close();
}
