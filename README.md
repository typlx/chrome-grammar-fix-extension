# Typlix

Open-source, privacy-first Chrome grammar checker and writing assistant (Manifest V3) for `textarea`, text `input`, and `contenteditable` fields on any website.  
Click the inline fix button to run grammar and spelling correction through multiple LLM providers, with secure encrypted token storage and configurable API/model settings.

## Documentation

- [User Guide](USERGUIDE.md)
- [Contributing Guide](CONTRIBUTING.md)

## What It Does

- Injects a bottom-right fix icon into:
  - `textarea`
  - `input[type="text" | "search" | "email" | "url"]`
  - `contenteditable` elements
- Works across dynamic pages/apps (SPA friendly)
- Sends text to a configured LLM provider (OpenAI-compatible or Anthropic)
- Replaces original text with corrected text
- Provides popup settings:
  - Provider selection (OpenAI-compatible, Anthropic Claude)
  - API URL, model, and token
  - Per-site enable/disable toggle
- Validates settings on save and shows detailed errors
- Stores token encrypted in `chrome.storage.local` (AES-GCM + PBKDF2)

## Project Structure

```text
manifest.json
background/
  service-worker.js
  providers/
    anthropic-provider.js
    openai-provider.js
    provider-registry.js
content/
  content.js
  content-core.js
  content.css
popup/
  popup.html
  popup.css
  popup.js
utils/
  analytics.js
  crypto.js
  diff.js
  storage.js
icons/
  icon16.png
  icon48.png
  icon128.png
```

## Setup (Local Development)

1. Clone the repo:

```bash
git clone https://github.com/varteq-company/chrome-grammar-fix-extension.git
cd chrome-grammar-fix-extension
```

2. Install dependencies:

```bash
npm install --include=dev
```

3. Open Chrome extensions page:
   - Navigate to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select this project folder

4. Configure the extension:
   - Click the Typlix icon in toolbar
   - Select your LLM provider
   - Set API URL, model, and token
   - Click **Save Settings**
   - Validation must pass before config is saved

## Usage

1. Focus any supported text field on a page.
2. Click the fix icon in the field's bottom-right corner.
3. Wait for response (spinner is shown).
4. Text is replaced with corrected content.

## API Compatibility

Typlix supports multiple LLM providers:

- **OpenAI-compatible**: Any API implementing `GET /models` and `POST /chat/completions`
- **Anthropic Claude**: Native Anthropic Messages API

If your provider uses a different schema/path, validation or correction may fail until adapter logic is added.

## Security Notes

- Token is encrypted before writing to `chrome.storage.local`.
- Token is only used in the service worker (not in page context).
- This improves local-at-rest secrecy but is not equivalent to hardware-backed secret storage.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow details.

## License

Distributed under the MIT License. See `LICENSE` for details.
