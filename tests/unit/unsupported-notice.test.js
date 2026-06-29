import { describe, it, expect } from 'vitest';

function isUnsupportedSite(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('docs.google.com');
  } catch {
    return false;
  }
}

describe('Google Docs unsupported site detection', () => {
  it('detects docs.google.com as unsupported', () => {
    expect(isUnsupportedSite('https://docs.google.com/document/d/abc123/edit')).toBe(true);
  });

  it('does not flag non-Google-Docs URLs', () => {
    expect(isUnsupportedSite('https://www.google.com')).toBe(false);
    expect(isUnsupportedSite('https://mail.google.com/mail/u/0/#inbox')).toBe(false);
    expect(isUnsupportedSite('https://example.com')).toBe(false);
  });

  it('does not flag sheets.google.com', () => {
    expect(isUnsupportedSite('https://sheets.google.com/spreadsheet/d/abc123')).toBe(false);
  });

  it('returns false for empty or invalid URL', () => {
    expect(isUnsupportedSite('')).toBe(false);
    expect(isUnsupportedSite('not-a-url')).toBe(false);
  });

  it('handles tab query returning empty array', async () => {
    chrome.tabs.query.mockResolvedValue([]);
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    expect(activeTab).toBeUndefined();
  });

  it('handles tab without URL property', async () => {
    chrome.tabs.query.mockResolvedValue([{ id: 1, title: 'Tab' }]);
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    expect(activeTab.url).toBeUndefined();
  });
});
