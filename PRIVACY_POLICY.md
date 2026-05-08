# Typlx Privacy Policy

**Effective date:** 2026-04-29

Typlx is an open-source browser extension that fixes grammar and spelling using a Large Language Model (LLM) provider configured by the user. This policy describes what data the extension handles and how.

## Data the extension processes

| Data                      | Where it goes                                                                          | Why                                           |
| ------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| Text you choose to check  | Sent to the LLM API endpoint **you** configure (e.g. OpenAI, Anthropic, a local model) | To generate grammar corrections               |
| API token / key           | Encrypted (AES-GCM) and stored locally in `chrome.storage.local` on your device        | To authenticate with your chosen provider     |
| Per-site disable list     | Stored locally in `chrome.storage.local`                                               | To remember which sites you disabled Typlx on |
| Usage statistics (opt-in) | Stored locally in `chrome.storage.local` — never transmitted                           | To show you personal fix counts if you opt in |

## Data the extension does NOT collect

- Typlx does **not** operate its own servers or cloud backend.
- Typlx does **not** collect, transmit, or store any user data on third-party servers controlled by Typlx.
- Typlx does **not** include telemetry, analytics beacons, or phone-home behavior of any kind.
- Typlx does **not** track browsing history, keystrokes, or page content beyond the text you explicitly ask it to check.

## Third-party LLM providers

When you click the fix button, the selected text is sent to the API endpoint you configured. That request is governed by **your provider's** privacy policy (e.g. OpenAI's, Anthropic's, or your self-hosted model's). Typlx has no control over how your chosen provider processes that data.

If privacy is a concern, you can configure Typlx to use a fully local model (via Ollama, LM Studio, or similar) so that no text ever leaves your device.

## Token security

Your API token is encrypted at rest using AES-GCM with a PBKDF2-derived key. It is only decrypted in the background service worker to make API calls and is never exposed to content scripts or page context.

## Permissions

| Permission                     | Reason                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `storage`                      | Save your settings and encrypted API token locally       |
| `activeTab`                    | Inject the grammar-fix UI into the currently active tab  |
| `tabs`                         | Detect the current site hostname for the per-site toggle |
| `host_permissions: <all_urls>` | Allow grammar checking on any website you visit          |

## Children's privacy

Typlx does not knowingly collect any personal information from children under 13.

## Changes to this policy

Updates will be posted in this file in the extension's open-source repository. The effective date at the top will be updated accordingly.

## Contact

For privacy questions, open an issue at [github.com/typlx/chrome-grammar-fix-extension](https://github.com/typlx/chrome-grammar-fix-extension) or email privacy@typlx.com.

## Source code

Typlx is MIT-licensed. You can audit the complete source code at [github.com/typlx/chrome-grammar-fix-extension](https://github.com/typlx/chrome-grammar-fix-extension).
