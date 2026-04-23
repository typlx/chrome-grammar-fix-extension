import { vi, beforeEach } from 'vitest';

const store = {};

function clearStore() {
  Object.keys(store).forEach((k) => delete store[k]);
}

const chromeStorageLocal = {
  get: vi.fn(async (keys) => {
    if (typeof keys === 'string') {
      return { [keys]: store[keys] };
    }
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach((k) => (result[k] = store[k]));
      return result;
    }
    return {};
  }),
  set: vi.fn(async (items) => {
    Object.assign(store, items);
  }),
  remove: vi.fn(async (keys) => {
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]);
  }),
};

globalThis.chrome = {
  storage: { local: chromeStorageLocal },
  runtime: {
    id: 'test-extension-id-abc123',
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
  },
};

globalThis.__testChromeStore = store;
globalThis.__clearChromeStore = clearStore;

if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}

if (typeof HTMLElement !== 'undefined' && !('isContentEditable' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'isContentEditable', {
    get() {
      if (this.contentEditable === 'true') return true;
      if (this.contentEditable === 'false') return false;
      const parent = this.parentElement;
      return parent ? parent.isContentEditable : false;
    },
  });
}

beforeEach(() => {
  clearStore();
  vi.restoreAllMocks();

  chromeStorageLocal.get.mockImplementation(async (keys) => {
    if (typeof keys === 'string') {
      return { [keys]: store[keys] };
    }
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach((k) => (result[k] = store[k]));
      return result;
    }
    return {};
  });

  chromeStorageLocal.set.mockImplementation(async (items) => {
    Object.assign(store, items);
  });

  chromeStorageLocal.remove.mockImplementation(async (keys) => {
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]);
  });
});
