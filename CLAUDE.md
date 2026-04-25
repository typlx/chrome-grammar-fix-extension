# Chrome Grammar Fix Extension

Chrome Manifest V3 extension that fixes grammar and spelling in any text field using an LLM API (OpenAI-compatible).

## Architecture

- **background/service-worker.js** — Chrome service worker handling API calls and config validation via message passing
- **content/content.js** — Content script injecting grammar-fix buttons into editable elements (IIFE, not a module)
- **content/content-core.js** — Exported pure functions for DOM detection and text manipulation (testable)
- **popup/popup.js** — Settings UI logic for API URL, model, and token configuration
- **utils/crypto.js** — AES-GCM encryption for token storage using PBKDF2 key derivation
- **utils/storage.js** — Chrome storage wrapper with encrypted token support

## Key Constraints

- Tokens are encrypted at rest; never exposed to content scripts or page context
- content.js runs as an IIFE (not ES module) inside a closed shadow DOM — it is not directly testable
- content-core.js mirrors content.js logic as testable exports
- Gmail compose detection uses heuristics (aria-label, class names, compose context selectors)

## Commands

```bash
npm install --include=dev  # install dependencies (env may omit devDeps by default)
npm test                   # vitest run
npm run test:coverage      # vitest with v8 coverage
npm run lint               # eslint
npm run format:check       # prettier --check
npm run validate           # lint + format:check + test
```

## Testing

Vitest with jsdom. Chrome APIs are mocked in tests/setup.js (chrome.storage.local, chrome.runtime). Web Crypto is polyfilled from Node's webcrypto. Test globals (describe, it, expect, vi) are enabled via vitest config.

## CI

GitHub Actions (.github/workflows/ci.yml) runs lint, test, and package on push/PR to main and develop.
