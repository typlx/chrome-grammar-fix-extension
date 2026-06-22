import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchBrowser, getExtensionId, extensionUrl } from './helpers/browser.js';

describe('Extension installation and onboarding', () => {
  let browser, extensionId;

  beforeAll(async () => {
    browser = await launchBrowser();
    extensionId = await getExtensionId(browser);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('registers the service worker on install', async () => {
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
  });

  it('opens the onboarding page on first install', async () => {
    const pages = await browser.pages();
    const onboardingPage = pages.find((p) => p.url().includes('onboarding/onboarding.html'));
    expect(onboardingPage).toBeTruthy();
  });

  it('displays welcome content with setup steps', async () => {
    const pages = await browser.pages();
    const page = pages.find((p) => p.url().includes('onboarding/onboarding.html'));

    const title = await page.$eval('h1', (el) => el.textContent);
    expect(title).toBe('Typlx');

    const tagline = await page.$eval('.tagline', (el) => el.textContent);
    expect(tagline).toContain('grammar');

    const steps = await page.$$('.step');
    expect(steps.length).toBe(3);

    const stepTexts = await page.$$eval('.step-content h3', (els) =>
      els.map((el) => el.textContent),
    );
    expect(stepTexts).toContain('Add your API key');
    expect(stepTexts).toContain('Write in any text field');
    expect(stepTexts).toContain('Review and accept');
  });

  it('has a working Open Settings button', async () => {
    const pages = await browser.pages();
    const page = pages.find((p) => p.url().includes('onboarding/onboarding.html'));

    const ctaBtn = await page.$('#open-settings');
    expect(ctaBtn).toBeTruthy();

    const btnText = await page.$eval('#open-settings', (el) => el.textContent);
    expect(btnText).toContain('Open Settings');
  });

  it('can load the popup settings page directly', async () => {
    const page = await browser.newPage();
    await page.goto(extensionUrl(extensionId, 'popup/popup.html'), {
      waitUntil: 'domcontentloaded',
    });

    const heading = await page.$eval('h1', (el) => el.textContent);
    expect(heading).toBe('Typlx');

    const tabs = await page.$$eval('.tab', (els) => els.map((el) => el.textContent));
    expect(tabs).toEqual(['Settings', 'Sites', 'Stats']);

    await page.close();
  });
});
