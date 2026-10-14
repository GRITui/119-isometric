// verify-atlas-palette.test.js — per-category colour limits (hero <=48,
// tile/prop <=16) using synthetic in-memory PNGs (no real art needed).
import assert from 'node:assert';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import {
  categoryForSheet,
  limitForSheet,
  countDistinctColors,
  verifySheetBuffer,
  verifyAtlas,
} from './verify-atlas-palette.js';

// Build a tiny opaque PNG with exactly `n` distinct colours (grayscale ramp).
function makeSheet(n, { w = 8, h = 8 } = {}) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = (y * w + x) % n; // cycles through n distinct values
      png.data[i] = c * 3;
      png.data[i + 1] = c * 3;
      png.data[i + 2] = c * 3;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

test('categoryForSheet: hero.png -> hero, others -> default', () => {
  assert.strictEqual(categoryForSheet('assets/hero.png'), 'hero');
  assert.strictEqual(categoryForSheet('assets/tiles.png'), 'default');
  assert.strictEqual(categoryForSheet('assets/props.png'), 'default');
  assert.strictEqual(categoryForSheet('assets/herovillain.png'), 'default'); // exact "hero.png" only
});

test('limitForSheet: hero=48, tile/prop=16', () => {
  assert.strictEqual(limitForSheet('assets/hero.png'), 48);
  assert.strictEqual(limitForSheet('assets/tiles.png'), 16);
  assert.strictEqual(limitForSheet('assets/props.png'), 16);
});

test('countDistinctColors ignores fully-transparent pixels', () => {
  const png = new PNG({ width: 2, height: 1 });
  png.data.set([10, 10, 10, 255, 0, 0, 0, 0]); // 1 opaque colour, 1 transparent
  assert.strictEqual(countDistinctColors(png), 1);
});

test('tile/prop sheet: 16 colours passes, 17 fails', () => {
  const ok = verifySheetBuffer('assets/tiles.png', makeSheet(16));
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.limit, 16);

  const bad = verifySheetBuffer('assets/props.png', makeSheet(17));
  assert.strictEqual(bad.ok, false);
});

test('hero sheet: 48 colours passes (would fail the old 16-colour limit)', () => {
  const r = verifySheetBuffer('assets/hero.png', makeSheet(48));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.limit, 48);
  assert.strictEqual(r.category, 'hero');
});

test('hero sheet: 49 colours fails', () => {
  const r = verifySheetBuffer('assets/hero.png', makeSheet(49));
  assert.strictEqual(r.ok, false);
});

test('verifyAtlas: synthetic manifest, hero over 16 but under 48 passes overall', () => {
  // Build a fixture dir in-memory via a fake fs read — reuse verifySheetBuffer
  // directly per-sheet instead of touching disk (keeps this test hermetic).
  const sheets = [
    { file: 'assets/tiles.png', buf: makeSheet(16) },
    { file: 'assets/props.png', buf: makeSheet(10) },
    { file: 'assets/hero.png', buf: makeSheet(30) }, // >16, <=48: only valid under new rule
  ];
  const results = sheets.map((s) => verifySheetBuffer(s.file, s.buf));
  assert.ok(results.every((r) => r.ok), 'all sheets pass per-category limits');
  const heroResult = results.find((r) => r.category === 'hero');
  assert.ok(heroResult.count > 16, 'sanity: hero sheet exceeds the old global 16-colour limit');
  assert.ok(heroResult.ok, 'but still passes under the 48-colour hero exemption');
});

test('verifyAtlas: reads real data/atlas.json sheets from disk and passes', async () => {
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { readFileSync } = await import('node:fs');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = join(__dirname, '..');
  const manifest = JSON.parse(readFileSync(join(root, 'data/atlas.json'), 'utf8'));
  const { results, ok } = verifyAtlas(manifest, root);
  assert.strictEqual(results.length, manifest.sheets.length);
  assert.ok(ok, `current committed art stays on-palette: ${JSON.stringify(results)}`);
});
