#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP="$ROOT/dist/typlx-chrome.zip"

if [ ! -f "$ZIP" ]; then
  echo "Build artifact not found. Running build first..."
  bash "$ROOT/scripts/build.sh"
fi

if [ -z "${CHROME_WEBSTORE_EXTENSION_ID:-}" ]; then
  echo "Error: CHROME_WEBSTORE_EXTENSION_ID is not set" >&2
  exit 1
fi

for var in CHROME_WEBSTORE_CLIENT_ID CHROME_WEBSTORE_CLIENT_SECRET CHROME_WEBSTORE_REFRESH_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set" >&2
    exit 1
  fi
done

export EXTENSION_ID="$CHROME_WEBSTORE_EXTENSION_ID"
export CLIENT_ID="$CHROME_WEBSTORE_CLIENT_ID"
export CLIENT_SECRET="$CHROME_WEBSTORE_CLIENT_SECRET"
export REFRESH_TOKEN="$CHROME_WEBSTORE_REFRESH_TOKEN"

echo "Uploading and publishing $ZIP to Chrome Web Store..."
chrome-webstore-upload --source "$ZIP"
echo "Done."
