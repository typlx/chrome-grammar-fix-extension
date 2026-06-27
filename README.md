# Typlx — AI Grammar Checker for Chrome

> AI-powered grammar and writing corrections for every text field in your browser. **Your text never passes through Typlx servers.**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/koffcnafpmfkoafknhkmcgcpdgmpgfop?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/koffcnafpmfkoafknhkmcgcpdgmpgfop)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/koffcnafpmfkoafknhkmcgcpdgmpgfop)](https://chromewebstore.google.com/detail/koffcnafpmfkoafknhkmcgcpdgmpgfop)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/typlx/chrome-grammar-fix-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/typlx/chrome-grammar-fix-extension/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Typlx connects your browser directly to the LLM of your choice — OpenAI, Anthropic Claude, Google Gemini, or a fully local model via Ollama. You own the API key. You choose the model. Typlx is just the interface.

![Typlx demo](docs/images/typlx-demo.gif)

## Install

**[→ Install from Chrome Web Store](https://chromewebstore.google.com/detail/koffcnafpmfkoafknhkmcgcpdgmpgfop)**

Also available on [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/typlx/PLACEHOLDER) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/typlx/).

Or clone and load unpacked for development (see [Contributing](CONTRIBUTING.md)).

## Why Typlx?

| | Typlx | Grammarly | LanguageTool |
|---|---|---|---|
| Price | Free | $12–30/mo | Free–$6.99/mo |
| Your text on their servers | ❌ Never | ✅ Always | ✅ Default (self-host for privacy) |
| Open source | ✅ MIT | ❌ | ✅ Partial |
| AI-quality corrections | ✅ | ✅ | ❌ |
| Local model support | ✅ Ollama/LM Studio | ❌ | ❌ |
| Account required | ❌ | ✅ | ✅ |

## Supported Models

- **OpenAI** — GPT-4o, GPT-4o mini, GPT-3.5
- **Anthropic** — Claude Haiku, Sonnet, Opus
- **Google** — Gemini Flash, Gemini Pro
- **Local** — Any Ollama or LM Studio model (fully offline, no API key)

### From Source

1. Clone and install:

```bash
git clone https://github.com/typlx/chrome-grammar-fix-extension.git
cd chrome-grammar-fix-extension
npm install --include=dev
```

2. Build both targets:

```bash
npm run build
```

3. Load in your browser:
   - **Chrome**: Navigate to `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select `dist/chrome/`
   - **Edge**: Navigate to `edge://extensions`, enable **Developer mode**, click **Load unpacked** and select `dist/edge/`
   - **Firefox**: Navigate to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and select `dist/firefox/manifest.json`

4. Configure:
   - Click the Typlx icon in the toolbar
   - Select your LLM provider (OpenAI-compatible or Anthropic Claude)
   - Enter your API URL, model, and token
   - Click **Save Settings**

## Usage

1. Focus any text field on any page.
2. Click the fix icon in the field's bottom-right corner.
3. Wait for the correction (a spinner shows progress).
4. Done — your text is replaced with the corrected version.

Typlx works with `textarea`, `input[type="text" | "search" | "email" | "url"]`, and `contenteditable` elements. It handles dynamic/SPA pages automatically.

## Supported Providers

| Provider              | Endpoints Used                          |
| --------------------- | --------------------------------------- |
| **OpenAI-compatible** | `GET /models`, `POST /chat/completions` |
| **Anthropic Claude**  | Native Anthropic Messages API           |

Any API that implements the OpenAI chat completions interface works — including local model servers like Ollama, LM Studio, and vLLM.

## Security

- API tokens are **encrypted at rest** (AES-GCM with PBKDF2 key derivation) in `chrome.storage.local`.
- Tokens are only used in the background service worker — never exposed to content scripts or page context.
- No telemetry, no analytics, no phone-home behavior.

## Project Structure

```text
manifest.json              # Chrome manifest
manifest.firefox.json      # Firefox manifest (gecko settings, background scripts)
background/
  service-worker.js
  providers/
    anthropic-provider.js
    openai-provider.js
    provider-registry.js
content/
  content.js          # injected into pages (IIFE, shadow DOM)
  content-core.js     # testable pure functions
  content.css
popup/
  popup.html / popup.css / popup.js
utils/
  crypto.js           # AES-GCM token encryption
  storage.js          # Chrome storage wrapper
icons/
```

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code quality tools (ESLint, Prettier, Vitest), and workflow.

## Documentation

- [User Guide](USERGUIDE.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Release Notes](RELEASE_NOTES.md)
- [Privacy Policy](PRIVACY_POLICY.md)

## License

MIT. See [LICENSE](LICENSE) for details.
