# Typlx Privacy Policy

**Effective date:** 2026-07-22

Typlx is an open-source browser extension that fixes grammar and spelling using a Large Language Model (LLM) provider configured by the user. This policy describes what data the extension handles and how.

## Data Collection

Typlx collects the following data, all of which stays on your device unless you explicitly trigger a grammar check:

- **Text you choose to check** — When you click the fix button, the selected text is sent to the LLM API endpoint **you** configure (e.g. OpenAI, Anthropic, a local model) for grammar correction.
- **API token / key** — Your API key is stored locally on your device so the extension can authenticate with your chosen LLM provider.
- **Per-site disable list** — A list of websites where you have disabled Typlx, stored locally on your device.
- **Usage statistics (opt-in)** — If you opt in, personal fix counts are stored locally on your device. These statistics are never transmitted anywhere.

Typlx does **not** collect, transmit, or store any user data on servers controlled by Typlx. Typlx does **not** include telemetry, analytics beacons, or phone-home behavior of any kind. Typlx does **not** track browsing history, keystrokes, or page content beyond the text you explicitly ask it to check. Typlx does **not** operate its own servers or cloud backend.

## Data Handling

- **Grammar correction** — When you click the fix button, the selected text is sent to the LLM API endpoint you configured. The LLM processes the text and returns corrected grammar. No other processing occurs.
- **API token encryption** — Your API token is encrypted at rest using AES-GCM with a PBKDF2-derived key. It is only decrypted in the background service worker to make API calls and is never exposed to content scripts or page context.
- **Per-site preferences** — Your per-site disable list is read when you navigate to a site to determine whether Typlx should be active. No further processing occurs.
- **Usage statistics** — If opted in, fix counts are incremented locally after each correction. They are never processed further or transmitted.

## Data Storage

All data is stored locally on your device in `chrome.storage.local`. Typlx does not store any data on external servers.

| Data                  | Storage location                          | Encryption          | Retention                                |
| --------------------- | ----------------------------------------- | ------------------- | ---------------------------------------- |
| API token / key       | `chrome.storage.local` (your device)      | AES-GCM encrypted   | Until you remove it or uninstall Typlx   |
| Per-site disable list | `chrome.storage.local` (your device)      | None (not sensitive) | Until you remove it or uninstall Typlx   |
| Usage statistics      | `chrome.storage.local` (your device)      | None (not sensitive) | Until you remove it or uninstall Typlx   |
| Checked text          | Not stored — sent transiently to your LLM | N/A                 | Not retained by Typlx after the API call |

You can delete all stored data at any time by uninstalling the extension or clearing extension storage in your browser settings.

## Data Sharing

Typlx itself does **not** share any user data with third parties.

When you click the fix button, the selected text is sent to the LLM API endpoint **you** configured. That request is governed by **your provider's** privacy policy (e.g. OpenAI's, Anthropic's, or your self-hosted model's). Typlx has no control over how your chosen provider processes that data.

If privacy is a concern, you can configure Typlx to use a fully local model (via Ollama, LM Studio, or similar) so that no text ever leaves your device.

No data is sold, rented, or otherwise disclosed to any party by Typlx.

## Permissions

| Permission                     | Reason                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `storage`                      | Save your settings and encrypted API token locally       |
| `activeTab`                    | Inject the grammar-fix UI into the currently active tab  |
| `tabs`                         | Detect the current site hostname for the per-site toggle |
| `host_permissions: <all_urls>` | Allow grammar checking on any website you visit          |

## Children's Privacy

Typlx does not knowingly collect any personal information from children under 13.

## Changes to This Policy

Updates will be posted in this file in the extension's open-source repository. The effective date at the top will be updated accordingly.

## Contact

For privacy questions, open an issue at [github.com/typlx/chrome-grammar-fix-extension](https://github.com/typlx/chrome-grammar-fix-extension) or email privacy@typlx.com.

## Source Code

Typlx is MIT-licensed. You can audit the complete source code at [github.com/typlx/chrome-grammar-fix-extension](https://github.com/typlx/chrome-grammar-fix-extension).
