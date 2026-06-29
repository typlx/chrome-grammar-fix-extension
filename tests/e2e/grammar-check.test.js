import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { launchBrowser, getExtensionId, configureExtension } from './helpers/browser.js';
import { createMockApi } from './helpers/mock-api.js';
import { waitForGrammarButton, clickGrammarButton, withShadow } from './helpers/shadow-dom.js';

describe('Grammar check on a text input', () => {
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

  it('injects grammar-fix buttons on editable elements', async () => {
    const hosts = await page.$$('div[data-gf-host]');
    expect(hosts.length).toBeGreaterThanOrEqual(3);
  });

  it('does not inject a button on elements that are too small', async () => {
    const smallInput = await page.$('#test-small');
    const smallRect = await smallInput.boundingBox();
    const hosts = await page.$$('div[data-gf-host]');

    const hostBoxes = await Promise.all(hosts.map((h) => h.boundingBox()));
    const overlapsSmall = hostBoxes.some(
      (box) => box && Math.abs(box.x - smallRect.x) < 5 && Math.abs(box.y - smallRect.y) < 5,
    );
    expect(overlapsSmall).toBe(false);
  });

  it('sends text to the API when the grammar button is clicked on a textarea', async () => {
    mockApi.setDefaultCorrection('I have an error in this sentence.');

    const textarea = await page.$('#test-textarea');
    const textareaBox = await textarea.boundingBox();

    const hosts = await page.$$('div[data-gf-host]');
    let targetHost = null;
    for (const host of hosts) {
      const box = await host.boundingBox();
      if (box && Math.abs(box.y - textareaBox.y) < 10) {
        targetHost = host;
        break;
      }
    }
    expect(targetHost).toBeTruthy();

    const hostBox = await targetHost.boundingBox();
    await page.mouse.click(hostBox.x + hostBox.width - 20, hostBox.y + hostBox.height - 20);

    await new Promise((r) => setTimeout(r, 2000));

    const grammarReqs = mockApi.getGrammarRequests();
    expect(grammarReqs.length).toBeGreaterThanOrEqual(1);

    const lastReq = grammarReqs[grammarReqs.length - 1];
    expect(lastReq.body.messages[1].content).toBe('I has a error in this sentence.');
  });

  it('shows a diff preview after receiving corrections', async () => {
    mockApi.setDefaultCorrection('I have an error in this sentence.');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const previewExists = await shadow.exists('.gf-preview.visible');
      expect(previewExists).toBe(true);

      const diffHtml = await shadow.getHtml('.gf-preview-diff');
      expect(diffHtml).toBeTruthy();
      expect(diffHtml).toContain('gf-diff-removed');
      expect(diffHtml).toContain('gf-diff-added');
    });
  });

  it('replaces textarea text when Accept is clicked', async () => {
    mockApi.setDefaultCorrection('I have an error in this sentence.');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      await shadow.waitFor('.gf-preview.visible');
      await shadow.click('.gf-accept');
    });

    await new Promise((r) => setTimeout(r, 500));

    const value = await page.$eval('#test-textarea', (el) => el.value);
    expect(value).toBe('I have an error in this sentence.');
  });

  it('dismisses the preview when Reject is clicked', async () => {
    mockApi.setDefaultCorrection('I have an error in this sentence.');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      await shadow.waitFor('.gf-preview.visible');
      await shadow.click('.gf-reject');
    });

    await new Promise((r) => setTimeout(r, 500));

    const value = await page.$eval('#test-textarea', (el) => el.value);
    expect(value).toBe('I has a error in this sentence.');
  });

  it('shows "No changes needed" when text is already correct', async () => {
    await page.$eval('#test-textarea', (el) => {
      el.value = 'This is a correct sentence.';
    });
    mockApi.setDefaultCorrection('This is a correct sentence.');

    await clickGrammarButton(page);
    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(page, async (shadow) => {
      const tooltipText = await shadow.getText('.gf-tooltip');
      expect(tooltipText).toContain('No changes needed');
    });
  });
});

describe('Grammar check on a contenteditable div', () => {
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

  it('sends contenteditable text to the API', async () => {
    mockApi.setDefaultCorrection('This is wrong grammar.');

    const editable = await page.$('#test-contenteditable');
    const editableBox = await editable.boundingBox();

    const hosts = await page.$$('div[data-gf-host]');
    let targetHost = null;
    for (const host of hosts) {
      const box = await host.boundingBox();
      if (box && Math.abs(box.y - editableBox.y) < 10) {
        targetHost = host;
        break;
      }
    }
    expect(targetHost).toBeTruthy();

    const hostBox = await targetHost.boundingBox();
    await page.mouse.click(hostBox.x + hostBox.width - 20, hostBox.y + hostBox.height - 20);

    await new Promise((r) => setTimeout(r, 2000));

    const grammarReqs = mockApi.getGrammarRequests();
    expect(grammarReqs.length).toBeGreaterThanOrEqual(1);

    const lastReq = grammarReqs[grammarReqs.length - 1];
    expect(lastReq.body.messages[1].content).toBe('This are wrong grammer.');
  });

  it('replaces contenteditable text when Accept is clicked', async () => {
    mockApi.setDefaultCorrection('This is correct grammar.');

    const editable = await page.$('#test-contenteditable');
    await page.$eval('#test-contenteditable', (el) => {
      el.innerText = 'She dont like grammer.';
    });
    const editableBox = await editable.boundingBox();

    const hosts = await page.$$('div[data-gf-host]');
    let targetHost = null;
    let targetIndex = 0;
    for (let i = 0; i < hosts.length; i++) {
      const box = await hosts[i].boundingBox();
      if (box && Math.abs(box.y - editableBox.y) < 10) {
        targetHost = hosts[i];
        targetIndex = i;
        break;
      }
    }

    const hostBox = await targetHost.boundingBox();
    await page.mouse.click(hostBox.x + hostBox.width - 20, hostBox.y + hostBox.height - 20);

    await new Promise((r) => setTimeout(r, 2000));

    await withShadow(
      page,
      async (shadow) => {
        await shadow.waitFor('.gf-preview.visible');
        await shadow.click('.gf-accept');
      },
      targetIndex,
    );

    await new Promise((r) => setTimeout(r, 500));

    const text = await page.$eval('#test-contenteditable', (el) => el.innerText);
    expect(text.trim()).toBe('This is correct grammar.');
  });
});
