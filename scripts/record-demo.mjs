#!/usr/bin/env node
/**
 * Records the Typlx demo sequence as screenshots for GIF assembly.
 * Simulates the extension UI in headless Chromium since extensions
 * can't load in headless mode.
 *
 * Usage: NODE_PATH=/usr/local/lib/node_modules node scripts/record-demo.mjs
 * Output: docs/images/demo-frame-*.png
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { execSync } from 'child_process';

const require = createRequire('/usr/local/lib/node_modules/');
const { chromium } = require('playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEMO_PAGE = join(ROOT, 'docs', 'demo-page.html');
const OUTPUT_DIR = join(ROOT, 'docs', 'images');

mkdirSync(OUTPUT_DIR, { recursive: true });

const VIEWPORT = { width: 800, height: 500 };

const FIXED_TEXT =
  'We are excited to announce Typlx, an open-source grammar checking tool that respects your privacy. Unlike other tools, Typlx doesn’t send your text to third-party servers.';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function injectFixIcon(page, state) {
  await page.evaluate((s) => {
    let icon = document.getElementById('typlx-fix-icon');
    if (!icon) {
      const ta = document.querySelector('textarea');
      let wrap = document.getElementById('typlx-ta-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'typlx-ta-wrap';
        wrap.style.cssText = 'position: relative; display: block;';
        ta.parentNode.insertBefore(wrap, ta);
        wrap.appendChild(ta);
      }
      icon = document.createElement('div');
      icon.id = 'typlx-fix-icon';
      wrap.appendChild(icon);
    }
    const styles = {
      idle: {
        background: '#6c63ff',
        color: '#fff',
        content: '✏️',
        border: '1px solid #7c74ff',
      },
      hover: {
        background: '#7c74ff',
        color: '#fff',
        content: '✏️',
        border: '1px solid #9d96ff',
      },
      spinning: {
        background: '#6c63ff',
        color: '#fff',
        content: '⏳',
        border: '1px solid #7c74ff',
      },
      success: {
        background: '#238636',
        color: '#fff',
        content: '✓',
        border: '1px solid #2ea043',
      },
    };
    const st = styles[s];
    icon.style.cssText = `
      position: absolute; bottom: 16px; right: 16px;
      width: 28px; height: 28px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; z-index: 10;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      background: ${st.background}; color: ${st.color}; border: ${st.border};
    `;
    icon.textContent = st.content;
  }, state);
}

async function addPrivacyBadge(page) {
  await page.evaluate(() => {
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute; bottom: 52px; right: 12px;
      background: rgba(35, 134, 54, 0.95); color: #fff;
      padding: 6px 12px; border-radius: 6px; font-size: 12px;
      font-family: -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 20; white-space: nowrap;
    `;
    badge.textContent = '🔒 Powered by your API — no data shared';
    const wrap = document.getElementById('typlx-ta-wrap');
    wrap.appendChild(badge);
  });
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Launching headless Chromium...');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`file://${DEMO_PAGE}`);
  await sleep(500);

  // Scene 1: Text with errors, no icon yet
  // eslint-disable-next-line no-console
  console.log('Scene 1: Text with errors');
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-01-context.png'),
  });

  // Scene 2: Focus textarea, Typlx icon appears
  // eslint-disable-next-line no-console
  console.log('Scene 2: Typlx icon appears');
  await page.click('textarea');
  await sleep(300);
  await injectFixIcon(page, 'idle');
  await sleep(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-02-icon.png'),
  });

  // Scene 3: Hover over fix icon
  // eslint-disable-next-line no-console
  console.log('Scene 3: Hover fix icon');
  await injectFixIcon(page, 'hover');
  await sleep(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-03-hover.png'),
  });

  // Scene 4: Click — spinner appears
  // eslint-disable-next-line no-console
  console.log('Scene 4: Processing');
  await injectFixIcon(page, 'spinning');
  await sleep(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-04-processing.png'),
  });

  // Scene 5: Text corrected, success checkmark
  // eslint-disable-next-line no-console
  console.log('Scene 5: Corrected text');
  await page.evaluate((text) => {
    document.querySelector('textarea').value = text;
  }, FIXED_TEXT);
  await injectFixIcon(page, 'success');
  await sleep(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-05-result.png'),
  });

  // Scene 6: Privacy badge appears
  // eslint-disable-next-line no-console
  console.log('Scene 6: Privacy badge');
  await addPrivacyBadge(page);
  await sleep(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, 'demo-frame-06-privacy.png'),
  });

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`\nScreenshots saved to ${OUTPUT_DIR}/`);

  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    // eslint-disable-next-line no-console
    console.log('Assembling GIF with ffmpeg...');
    execSync(
      `ffmpeg -y -framerate 0.7 -pattern_type glob -i '${OUTPUT_DIR}/demo-frame-*.png' ` +
        `-vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" ` +
        `${OUTPUT_DIR}/typlx-demo.gif`,
      { stdio: 'inherit' },
    );
    // eslint-disable-next-line no-console
    console.log(`GIF saved: ${OUTPUT_DIR}/typlx-demo.gif`);
  } catch {
    // eslint-disable-next-line no-console
    console.log('ffmpeg not found — screenshots captured, assemble GIF manually.');
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Demo recording failed:', e.message);
  process.exit(1);
});
