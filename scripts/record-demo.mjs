#!/usr/bin/env node
/**
 * Records the Typlx demo sequence as screenshots for GIF assembly.
 * Requires: npx playwright install chromium (with OS deps)
 * Usage: node scripts/record-demo.mjs
 * Output: docs/images/demo-frame-*.png + docs/images/typlx-demo.gif (if ffmpeg available)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEMO_PAGE = join(ROOT, 'docs', 'demo-page.html');
const OUTPUT_DIR = join(ROOT, 'docs', 'images');
const EXTENSION_DIR = ROOT;

mkdirSync(OUTPUT_DIR, { recursive: true });

const VIEWPORT = { width: 800, height: 500 };
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Launching browser with Typlx extension...');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      '--no-first-run',
      '--disable-default-apps',
    ],
    viewport: VIEWPORT,
  });

  const page = await context.newPage();
  await page.goto(`file://${DEMO_PAGE}`);
  await sleep(1000);

  // Scene 1: Show the text with errors
  console.log('Scene 1: Context — text with errors');
  await page.click('textarea');
  await sleep(500);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-01-context.png'),
  });

  // Scene 2: Focus textarea to trigger Typlx icon
  console.log('Scene 2: Trigger — Typlx icon appears');
  await page.focus('textarea');
  await sleep(1500);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-02-icon.png'),
  });

  // Scene 3: Click the Typlx fix icon (bottom-right of textarea)
  console.log('Scene 3: Click fix icon');
  const textarea = await page.locator('textarea');
  const box = await textarea.boundingBox();
  if (box) {
    // The fix icon appears near the bottom-right corner of the textarea
    await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20);
    await sleep(500);
    await page.screenshot({
      path: join(OUTPUT_DIR, 'demo-frame-03-hover.png'),
    });
    await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20);
  }

  // Scene 4: Processing / spinner
  console.log('Scene 4: Processing');
  await sleep(800);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-04-processing.png'),
  });

  // Scene 5: Wait for correction to complete
  console.log('Scene 5: Result — corrected text');
  await sleep(3000);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-05-result.png'),
  });

  // Scene 6: Final state with success indicator
  await sleep(1000);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-06-success.png'),
  });

  await context.close();
  console.log(`\nScreenshots saved to ${OUTPUT_DIR}/`);

  // Try to assemble GIF if ffmpeg is available
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    console.log('Assembling GIF with ffmpeg...');
    execSync(
      `ffmpeg -y -framerate 0.7 -pattern_type glob -i '${OUTPUT_DIR}/demo-frame-*.png' ` +
        `-vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" ` +
        `${OUTPUT_DIR}/typlx-demo.gif`,
      { stdio: 'inherit' },
    );
    console.log(`GIF saved: ${OUTPUT_DIR}/typlx-demo.gif`);
  } catch {
    console.log('ffmpeg not found — screenshots captured, assemble GIF manually.');
    console.log(
      "  ffmpeg -framerate 0.7 -pattern_type glob -i 'docs/images/demo-frame-*.png' " +
        '-vf "scale=800:-1:flags=lanczos" docs/images/typlx-demo.gif',
    );
  }
}

main().catch((e) => {
  console.error('Demo recording failed:', e.message);
  process.exit(1);
});
