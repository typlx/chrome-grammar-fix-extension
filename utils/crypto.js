const SALT_KEY = 'grammarfix_salt';
const KEY_USAGE = ['encrypt', 'decrypt'];
const ALGO = 'AES-GCM';
const IV_LENGTH = 12;

async function getSalt() {
  const result = await chrome.storage.local.get(SALT_KEY);
  if (result[SALT_KEY]) {
    return new Uint8Array(result[SALT_KEY]);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await chrome.storage.local.set({ [SALT_KEY]: Array.from(salt) });
  return salt;
}

async function deriveKey(salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(chrome.runtime.id),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    KEY_USAGE,
  );
}

export async function encryptToken(plaintext) {
  if (!plaintext) return null;
  const salt = await getSalt();
  const key = await deriveKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext)),
  };
}

export async function decryptToken(encrypted) {
  if (!encrypted || !encrypted.iv || !encrypted.data) return '';
  const salt = await getSalt();
  const key = await deriveKey(salt);
  const iv = new Uint8Array(encrypted.iv);
  const data = new Uint8Array(encrypted.data);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '';
  }
}
