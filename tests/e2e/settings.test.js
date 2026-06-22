import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { launchBrowser, getExtensionId, extensionUrl } from './helpers/browser.js';
import { createMockApi } from './helpers/mock-api.js';

describe('Settings / options page', () => {
  let browser, extensionId, mockApi, page;

  beforeAll(async () => {
    mockApi = createMockApi();
    await mockApi.start();
    browser = await launchBrowser();
    extensionId = await getExtensionId(browser);
  });

  afterAll(async () => {
    await browser?.close();
    await mockApi?.stop();
  });

  beforeEach(async () => {
    mockApi.clearRequests();
    page = await browser.newPage();
    await page.goto(extensionUrl(extensionId, 'popup/popup.html'), {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('#settings-form');
    await page.waitForSelector('#apiUrl');
  });

  afterEach(async () => {
    await page?.close();
  });

  it('loads the settings form with default OpenAI fields', async () => {
    const provider = await page.$eval('#provider', (el) => el.value);
    expect(provider).toBe('openai');

    const apiUrl = await page.$eval('#apiUrl', (el) => el.value);
    expect(apiUrl).toContain('openai.com');

    const model = await page.$eval('#model', (el) => el.value);
    expect(model).toBe('gpt-4o-mini');
  });

  it('switches fields when provider is changed to Anthropic', async () => {
    await page.select('#provider', 'anthropic');
    await page.waitForSelector('#apiUrl');

    const apiUrl = await page.$eval('#apiUrl', (el) => el.value);
    expect(apiUrl).toContain('anthropic.com');

    const model = await page.$eval('#model', (el) => el.value);
    expect(model).toContain('claude');
  });

  it('saves settings when form is submitted with valid config', async () => {
    const fillField = async (id, value) => {
      const input = await page.$(`#${id}`);
      await input.click({ clickCount: 3 });
      await input.type(value);
    };

    await fillField('apiUrl', mockApi.apiUrl);
    await fillField('model', 'test-model');
    await fillField('token', 'test-api-key');

    await page.click('button[type="submit"]');
    await page.waitForSelector('.toast.success.visible', { timeout: 10_000 });

    const toastText = await page.$eval('.toast', (el) => el.textContent);
    expect(toastText).toContain('saved');
  });

  it('shows validation error for empty token', async () => {
    const tokenInput = await page.$('#token');
    await tokenInput.click({ clickCount: 3 });
    await tokenInput.press('Backspace');

    await page.click('button[type="submit"]');
    await page.waitForSelector('.toast.error.visible', { timeout: 10_000 });

    const toastText = await page.$eval('.toast', (el) => el.textContent);
    expect(toastText).toBeTruthy();
  });

  it('shows validation error when API URL is unreachable', async () => {
    const fillField = async (id, value) => {
      const input = await page.$(`#${id}`);
      await input.click({ clickCount: 3 });
      await input.type(value);
    };

    await fillField('apiUrl', 'http://127.0.0.1:1/v1');
    await fillField('model', 'test-model');
    await fillField('token', 'test-token');

    await page.click('button[type="submit"]');
    await page.waitForSelector('.toast.error.visible', { timeout: 15_000 });

    const toastText = await page.$eval('.toast', (el) => el.textContent);
    expect(toastText).toContain('Cannot reach');
  });

  it('shows the first-run setup hint when no token is configured', async () => {
    const freshPage = await browser.newPage();

    const workerTarget = await browser.waitForTarget(
      (t) => t.type() === 'service_worker' && t.url().includes(extensionId),
    );
    const worker = await workerTarget.worker();
    await worker.evaluate(() => chrome.storage.local.remove('grammarfix_config'));

    await freshPage.goto(extensionUrl(extensionId, 'popup/popup.html'), {
      waitUntil: 'domcontentloaded',
    });
    await freshPage.waitForSelector('#settings-form');
    await new Promise((r) => setTimeout(r, 500));

    const hintVisible = await freshPage.$eval(
      '#setup-hint',
      (el) => !el.classList.contains('hidden'),
    );
    expect(hintVisible).toBe(true);

    await freshPage.close();
  });

  it('can navigate to the Sites tab', async () => {
    await page.click('[data-tab="sites"]');
    await page.waitForSelector('#sites-panel:not(.hidden)');

    const toggleBtn = await page.$('#toggle-current-site');
    expect(toggleBtn).toBeTruthy();
  });

  it('can navigate to the Stats tab and see stat cards', async () => {
    await page.click('[data-tab="stats"]');
    await page.waitForSelector('#stats-panel:not(.hidden)');

    const corrections = await page.$eval('#stat-corrections', (el) => el.textContent);
    expect(corrections).toBeDefined();

    const accuracy = await page.$eval('#stat-accuracy', (el) => el.textContent);
    expect(accuracy).toBeDefined();
  });

  it('can toggle analytics on and off', async () => {
    await page.click('[data-tab="stats"]');
    await page.waitForSelector('#stats-panel:not(.hidden)');
    await new Promise((r) => setTimeout(r, 500));

    const toggleBtn = await page.$('#toggle-analytics');
    expect(toggleBtn).toBeTruthy();

    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  });

  it('can reset stats', async () => {
    await page.click('[data-tab="stats"]');
    await page.waitForSelector('#stats-panel:not(.hidden)');
    await new Promise((r) => setTimeout(r, 500));

    await page.click('#reset-stats-btn');
    await page.waitForSelector('.toast.visible', { timeout: 5000 });

    const toastText = await page.$eval('.toast', (el) => el.textContent);
    expect(toastText).toContain('reset');
  });

  it('toggles password visibility for the API token field', async () => {
    const tokenType = await page.$eval('#token', (el) => el.type);
    expect(tokenType).toBe('password');

    await page.click('.toggle-visibility');
    const revealedType = await page.$eval('#token', (el) => el.type);
    expect(revealedType).toBe('text');

    await page.click('.toggle-visibility');
    const hiddenAgain = await page.$eval('#token', (el) => el.type);
    expect(hiddenAgain).toBe('password');
  });

  it('shows the language selector with expected options', async () => {
    const options = await page.$$eval('#language option', (els) =>
      els.map((el) => ({ value: el.value, text: el.textContent })),
    );

    expect(options.map((o) => o.value)).toEqual(['auto', 'en', 'es', 'fr']);
    expect(options[0].text).toContain('Auto');
  });
});
