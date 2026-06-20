#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

SHARED_FILES=(
  background/
  content/
  popup/
  icons/
  utils/
  onboarding/
)

build_target() {
  local target="$1"
  local manifest="$2"
  local outdir="$DIST/$target"

  rm -rf "$outdir"
  mkdir -p "$outdir"

  for item in "${SHARED_FILES[@]}"; do
    if [ -d "$ROOT/$item" ]; then
      cp -r "$ROOT/$item" "$outdir/$item"
    elif [ -f "$ROOT/$item" ]; then
      cp "$ROOT/$item" "$outdir/$item"
    fi
  done

  cp "$ROOT/$manifest" "$outdir/manifest.json"

  echo "Built $target -> $outdir"
}

echo "Building Typlx extension..."

build_target "chrome" "manifest.json"
build_target "firefox" "manifest.firefox.json"
build_target "edge" "manifest.json"

if command -v zip &>/dev/null; then
  (cd "$DIST/chrome" && zip -r "$DIST/typlx-chrome.zip" . -q)
  (cd "$DIST/firefox" && zip -r "$DIST/typlx-firefox.zip" . -q)
  (cd "$DIST/edge" && zip -r "$DIST/typlx-edge.zip" . -q)
  echo "Packaged: dist/typlx-chrome.zip, dist/typlx-firefox.zip, dist/typlx-edge.zip"
else
  echo "zip not found — skipping packaging, use dist/ directories directly"
fi

echo "Done."
