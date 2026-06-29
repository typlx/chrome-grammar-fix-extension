# Contributing to Typlx

Thank you for your interest in contributing. Typlx is a small, focused project — contributions that improve reliability, privacy, and model compatibility are especially welcome.

## Quick Start

```bash
git clone https://github.com/typlx/chrome-grammar-fix-extension
cd chrome-grammar-fix-extension
npm install --include=dev
npm run validate
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the project folder

## What We're Looking For

### High-priority contributions

- Support for additional LLM providers (Cohere, Mistral, etc.)
- Compatibility fixes for specific sites (Google Docs edge cases, Slack, etc.)
- Performance improvements (debouncing, token estimation)
- Localization (i18n strings)
- Bug fixes with a reproduction case

### Out of scope (for now)

- Features that require Typlx to proxy or store user text
- Adding a Typlx cloud account/sync feature
- Social login integrations

## Development Notes

- **No telemetry** — do not add analytics or phone-home calls. This is a hard rule.
- **API keys** are encrypted client-side with AES-GCM and stored only in `chrome.storage.local`.
- **Content scripts** must not extract text without explicit user action (icon click or keyboard shortcut).
- Keep Manifest V3 compatibility.
- Do not expose API tokens to content scripts or page scripts.

## Code Quality

This project enforces code quality through ESLint, Prettier, and Vitest. CI runs all checks automatically on every pull request.

```bash
npm run lint          # check for issues
npm run lint:fix      # auto-fix what ESLint can
npm run format:check  # check formatting
npm run format        # auto-format all files
npm test              # run all tests
npm run test:watch    # run tests in watch mode
npm run test:coverage # run tests with coverage report
npm run validate      # lint + format:check + test (run this before every PR)
```

## Submitting a PR

1. Fork the repo and create a branch (`feat/my-change` or `fix/issue-123`)
2. Implement your change
3. Test manually in Chrome (popup, textarea/contenteditable/input, dynamic pages)
4. Run `npm run validate` — all checks must pass
5. Open a PR against `main` — the PR template will guide the description

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- Chrome version and OS
- Which LLM provider and model you're using (you don't need to share your API key)
- Steps to reproduce
- What you expected vs. what happened

## Code of Conduct

Be kind, be specific, be constructive. We're all here because we believe writing tools should respect user privacy.
