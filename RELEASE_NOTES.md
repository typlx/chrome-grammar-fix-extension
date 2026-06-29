## 2.2.0 — 2026-06-29

### Bug Fixes

- Fix quadratic diff freeze on long text (>300 tokens) — large documents now return an instant summary instead of allocating an O(m×n) matrix.
- Add Google Docs unsupported indicator in popup — warns users that canvas-based editors cannot be accessed by browser extensions.
- Serialize analytics storage writes to prevent multi-tab race condition — concurrent tabs no longer clobber each other's counters.

## 2.0.0 — 2026-04-24

### Changes

- Rebrand extension from "Grammar Fix" to **Typlx** across all user-facing surfaces.
- Add multi-provider support (OpenAI-compatible and Anthropic Claude).
- Add per-site enable/disable toggle in popup.
- Add provider adapter architecture.

## 1.0.1 — 2026-03-18

### Changes

- Fix Gmail compose targeting to show one grammar button.

## 1.0.0 — 2026-03-18

### Changes

- Add Chrome grammar-fix extension with secure configurable LLM settings.
- Add user guide with screenshots and docs link.
- Improve open-source documentation and add MIT license.
- Update user guide with extension manager load steps.
- Initial commit.
