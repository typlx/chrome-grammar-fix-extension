import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveConfig } from '../../utils/storage.js';

let messageListener;
let installedListener;

function captureListeners() {
  const onMessageCalls = chrome.runtime.onMessage.addListener.mock.calls;
  messageListener = onMessageCalls[onMessageCalls.length - 1]?.[0];

  const onInstalledCalls = chrome.runtime.onInstalled.addListener.mock.calls;
  installedListener = onInstalledCalls[onInstalledCalls.length - 1]?.[0];
}

function sendMessage(message) {
  return new Promise((resolve) => {
    const sendResponse = vi.fn((data) => resolve(data));
    const returnValue = messageListener(message, {}, sendResponse);
    if (returnValue === false) {
      resolve(sendResponse.mock.calls[0]?.[0]);
    }
  });
}

describe('service-worker message dispatch', () => {
  beforeEach(async () => {
    vi.resetModules();
    await import('../../background/service-worker.js');
    captureListeners();
  });

  it('registers onMessage and onInstalled listeners on load', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(typeof messageListener).toBe('function');
    expect(typeof installedListener).toBe('function');
  });

  describe('onInstalled', () => {
    it('opens onboarding tab on fresh install', () => {
      installedListener({ reason: 'install' });

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        'grammarfix_onboarded',
        expect.any(Function),
      );

      const getCallback = chrome.storage.local.get.mock.calls.find(
        (c) => c[0] === 'grammarfix_onboarded',
      )?.[1];

      if (getCallback) {
        getCallback({});

        expect(chrome.tabs.create).toHaveBeenCalledWith({
          url: expect.stringContaining('onboarding/onboarding.html'),
        });
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          grammarfix_onboarded: true,
        });
      }
    });

    it('skips onboarding when already completed', () => {
      installedListener({ reason: 'install' });

      const getCallback = chrome.storage.local.get.mock.calls.find(
        (c) => c[0] === 'grammarfix_onboarded',
      )?.[1];

      if (getCallback) {
        getCallback({ grammarfix_onboarded: true });
        expect(chrome.tabs.create).not.toHaveBeenCalled();
      }
    });

    it('does not open onboarding on extension update', () => {
      chrome.tabs.create.mockClear();
      installedListener({ reason: 'update' });

      const onboardingGetCalls = chrome.storage.local.get.mock.calls.filter(
        (c) => c[0] === 'grammarfix_onboarded',
      );
      expect(onboardingGetCalls).toHaveLength(0);
    });
  });

  describe('fixGrammar message', () => {
    it('returns corrected text via sendResponse', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.example.com/v1',
        model: 'test-model',
        token: 'sk-test',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Fixed via message.' } }],
          }),
        }),
      );

      const result = await sendMessage({ type: 'fixGrammar', text: 'fix this text' });
      expect(result.corrected).toBe('Fixed via message.');
    });

    it('returns error via sendResponse on failure', async () => {
      const result = await sendMessage({ type: 'fixGrammar', text: '' });
      expect(result.error).toBe('No text to fix');
    });
  });

  describe('checkToken message', () => {
    it('returns hasToken: false when no config saved', async () => {
      const result = await sendMessage({ type: 'checkToken' });
      expect(result.hasToken).toBe(false);
    });

    it('returns hasToken: true when token is configured', async () => {
      await saveConfig({
        provider: 'openai',
        apiUrl: 'https://api.example.com/v1',
        model: 'test-model',
        token: 'sk-test',
      });

      const result = await sendMessage({ type: 'checkToken' });
      expect(result.hasToken).toBe(true);
    });
  });

  describe('validateConfig message', () => {
    it('delegates validation and returns result', async () => {
      const result = await sendMessage({
        type: 'validateConfig',
        payload: { provider: 'nonexistent', token: 'x', model: 'x' },
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unknown provider');
    });
  });

  describe('getProviders message', () => {
    it('returns provider list synchronously', async () => {
      const result = await sendMessage({ type: 'getProviders' });
      expect(result.providers).toBeDefined();
      expect(Array.isArray(result.providers)).toBe(true);
      expect(result.providers.length).toBeGreaterThan(0);
    });
  });

  describe('isSiteEnabled message', () => {
    it('returns enabled: true for a non-disabled site', async () => {
      const result = await sendMessage({ type: 'isSiteEnabled', hostname: 'example.com' });
      expect(result.enabled).toBe(true);
    });
  });

  describe('analytics messages', () => {
    it('recordCorrection returns ok', async () => {
      const result = await sendMessage({
        type: 'recordCorrection',
        charCount: 100,
        wordCount: 15,
      });
      expect(result.ok).toBe(true);
    });

    it('recordAccepted returns ok', async () => {
      const result = await sendMessage({ type: 'recordAccepted' });
      expect(result.ok).toBe(true);
    });

    it('recordRejected returns ok', async () => {
      const result = await sendMessage({ type: 'recordRejected' });
      expect(result.ok).toBe(true);
    });

    it('getStats returns stats object', async () => {
      const result = await sendMessage({ type: 'getStats' });
      expect(result).toHaveProperty('stats');
    });

    it('getDailyTrend returns trend array', async () => {
      const result = await sendMessage({ type: 'getDailyTrend', days: 3 });
      expect(result).toHaveProperty('trend');
      expect(Array.isArray(result.trend)).toBe(true);
    });

    it('getAnalyticsEnabled returns enabled flag', async () => {
      const result = await sendMessage({ type: 'getAnalyticsEnabled' });
      expect(result).toHaveProperty('enabled');
    });

    it('setAnalyticsEnabled returns ok', async () => {
      const result = await sendMessage({ type: 'setAnalyticsEnabled', enabled: true });
      expect(result.ok).toBe(true);
    });

    it('resetStats returns ok', async () => {
      const result = await sendMessage({ type: 'resetStats' });
      expect(result.ok).toBe(true);
    });
  });

  describe('language messages', () => {
    it('getLanguageConfig returns language setting', async () => {
      const result = await sendMessage({ type: 'getLanguageConfig' });
      expect(result).toHaveProperty('language');
    });

    it('setLanguageConfig updates and returns ok', async () => {
      const result = await sendMessage({ type: 'setLanguageConfig', language: 'es' });
      expect(result.ok).toBe(true);
    });

    it('getSupportedLanguages returns languages object synchronously', async () => {
      const result = await sendMessage({ type: 'getSupportedLanguages' });
      expect(result.languages).toBeDefined();
      expect(typeof result.languages).toBe('object');
      expect(result.languages).toHaveProperty('en');
    });
  });
});
