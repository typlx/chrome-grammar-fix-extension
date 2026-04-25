# Contributing Guide

Thanks for contributing to Typlix.

## Development Setup

1. Fork the repository on GitHub.
2. Clone your fork:

```bash
git clone https://github.com/<your-user>/chrome-grammar-fix-extension.git
cd chrome-grammar-fix-extension
```

3. Install dependencies:

```bash
npm install --include=dev
```

4. Load extension in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select project folder

## Code Quality

This project enforces code quality through ESLint, Prettier, and Vitest. CI runs all checks automatically on every pull request.

### Linting

```bash
npm run lint          # check for issues
npm run lint:fix      # auto-fix what ESLint can
```

### Formatting

```bash
npm run format:check  # check formatting
npm run format        # auto-format all files
```

### Testing

```bash
npm test              # run all tests
npm run test:watch    # run tests in watch mode
npm run test:coverage # run tests with coverage report
```

### Full Validation

Run lint, format check, and tests in one command:

```bash
npm run validate
```

## Workflow

1. Create a branch:

```bash
git checkout -b feat/short-description
```

2. Implement your change.

3. Run the full validation before committing:

```bash
npm run validate
```

4. Test manually in Chrome:
   - popup save validation
   - Typlix fix on textarea/contenteditable/input
   - dynamic page behavior (elements added after load)

5. Commit with a clear message:

```bash
git commit -m "feat: short description"
```

6. Push and open a Pull Request.

## Code Expectations

- Keep Manifest V3 compatibility.
- Do not expose API tokens to content scripts or page scripts.
- Keep error messages clear and actionable for users.
- Preserve existing behavior unless change is explicit in PR description.
- All code must pass ESLint and Prettier checks before merge.
- Write tests for new functionality; test names should describe the scenario.
