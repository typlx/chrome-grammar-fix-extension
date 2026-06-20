#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist/firefox"

if [ ! -d "$DIST" ]; then
  echo "Build artifact not found. Running build first..."
  bash "$ROOT/scripts/build.sh"
fi

for var in WEB_EXT_API_KEY WEB_EXT_API_SECRET; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set" >&2
    exit 1
  fi
done

echo "Signing and publishing $DIST to Firefox Add-ons (AMO)..."
web-ext sign \
  --source-dir "$DIST" \
  --channel listed \
  --api-key "$WEB_EXT_API_KEY" \
  --api-secret "$WEB_EXT_API_SECRET"
echo "Done."
