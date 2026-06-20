# Typlx — Browser Grammar Extension

Cross-browser Manifest V3 extension (Chrome + Firefox) that fixes grammar and spelling in any text field using multiple LLM providers (OpenAI-compatible and Anthropic).

## Architecture

- **manifest.json** — Chrome manifest (service_worker background)
- **manifest.firefox.json** — Firefox manifest (gecko settings, background scripts array)
- **background/service-worker.js** — Background script handling API calls and config validation via message passing
- **background/providers/** — Provider adapter modules (OpenAI, Anthropic) with a registry
- **content/content.js** — Content script injecting grammar-fix buttons into editable elements (IIFE, not a module)
- **content/content-core.js** — Exported pure functions for DOM detection and text manipulation (testable)
- **popup/popup.js** — Settings UI logic for provider selection, API config, and per-site toggles
- **utils/crypto.js** — AES-GCM encryption for token storage using PBKDF2 key derivation
- **utils/storage.js** — Browser storage wrapper with encrypted token support (uses chrome.* namespace, compatible with both Chrome and Firefox MV3)

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
npm run build              # build Chrome + Firefox to dist/
npm run build:chrome       # build and report Chrome output
npm run build:firefox      # build and report Firefox output
```

## Testing

Vitest with jsdom. Chrome APIs are mocked in tests/setup.js (chrome.storage.local, chrome.runtime). Web Crypto is polyfilled from Node's webcrypto. Test globals (describe, it, expect, vi) are enabled via vitest config.

## CI

GitHub Actions (.github/workflows/ci.yml) runs lint, test (with coverage), and packages both Chrome and Firefox zips on push to main and develop. Publish workflows trigger on GitHub releases: publish-chrome.yml uploads to Chrome Web Store, publish-firefox.yml signs and submits to Firefox Add-ons (AMO). GitLab CI (.gitlab-ci.yml) remains as a legacy mirror.
