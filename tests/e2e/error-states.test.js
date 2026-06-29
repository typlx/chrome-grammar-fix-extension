import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { launchBrowser, getExtensionId, configureExtension } from './helpers/browser.js';
import { createMockApi } from './helpers/mock-api.js';
import { waitForGrammarButton, clickGrammarButton, withShadow } from './helpers/shadow-dom.js';

describe('Error states', () => {
  let browser, extensionId, mockApi, page;

  beforeAll(async () => {
    mockApi = createMockApi();
    await mockApi.start();
    browser = await launchBrowser();
    extensionId = await getExtensionId(browser);
    await configureExtension(browser, extensionId, mockApi.apiUrl);
  });

  afterAll(async () => {
    await browser?.close();
    await mockApi?.stop();
  });

  beforeEach(async () => {
    mockApi.clearRequests();
    page = await browser.newPage();
    await page.goto(mockApi.testPageUrl, { waitUntil: 'domcontentloaded' });
    await waitForGrammarButton(page);
  });

  afterEach(async () => {
    await page?.close();
  });

  it('shows error tooltip when API returns 500', async () => {
    mockApi.enqueueError(500, 'Internal Server Error');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const hasError = await shadow.exists('.gf-btn.error');
      expect(hasError).toBe(true);

      const tooltipText = await shadow.getText('.gf-tooltip');
      expect(tooltipText).toBeTruthy();
      expect(tooltipText).toContain('500');
    });
  });

  it('shows error tooltip when API returns 401 unauthorized', async () => {
    mockApi.enqueueError(401, 'Unauthorized');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const hasError = await shadow.exists('.gf-btn.error');
      expect(hasError).toBe(true);
    });
  });

  it('shows error tooltip when API returns 429 rate limit', async () => {
    mockApi.enqueueError(429, 'Rate limit exceeded');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const hasError = await shadow.exists('.gf-btn.error');
      expect(hasError).toBe(true);
    });
  });

  it('shows "Nothing to fix" when textarea is empty', async () => {
    await page.$eval('#test-textarea', (el) => {
      el.value = '';
    });

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 1000));

    await withShadow(page, async (shadow) => {
      const tooltipText = await shadow.getText('.gf-tooltip');
      expect(tooltipText).toContain('Nothing to fix');
    });
  });

  it('recovers from error and can retry successfully', async () => {
    mockApi.enqueueError(500, 'Temporary failure');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const hasError = await shadow.exists('.gf-btn.error');
      expect(hasError).toBe(true);
    });

    await new Promise((r) => setTimeout(r, 3500));

    mockApi.setDefaultCorrection('I have an error in this sentence.');
    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const previewVisible = await shadow.exists('.gf-preview.visible');
      expect(previewVisible).toBe(true);
    });
  });

  it('shows loading state while waiting for API response', async () => {
    mockApi.enqueueDelay(3000, 'Fixed text.');

    await clickGrammarButton(page);

    await withShadow(page, async (shadow) => {
      await shadow.waitFor('.gf-btn.loading', 2000);
    });
  });
});
