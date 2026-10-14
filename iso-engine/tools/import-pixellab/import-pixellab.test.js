// import-pixellab.test.js — synthetic PixelLab hero fixture round-trip.
// Builds a small fake source sheet (frames smaller than the 128x128 canvas,
// off-anchor on purpose) and asserts: output grid geometry, feet-to-anchor
// alignment, alpha binarisation, no resampling (pixel-exact after shift),
// and correct variable-length animations.hero entries in atlas.json.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import {
  CELL_W,
  CELL_H,
  COLS,
  ANCHOR,
  opaqueBBox,
  alignFrame,
  binariseAlpha,
  sliceSheet,
  buildAnimations,
  assembleSheet,
  runImport,
  writeImport,
} from './import-pixellab.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(HERE, 'import-pixellab.js');

// A small 20x30 "character" frame: solid torso block + a 1px antialiased
// (partial-alpha) fringe pixel to exercise binarisation, off-center on
// purpose (feet bbox center != frame center) to exercise alignment.
const FRAME_W = 20;
const FRAME_H = 30;
function makeCharFrame({ fringeAlpha = 90 } = {}) {
  const png = new PNG({ width: FRAME_W, height: FRAME_H });
  // opaque body from x=6..13, y=4..27 (feet at y=27, center x=(6+13)/2=9.5 -> round 10)
  for (let y = 4; y <= 27; y++) {
    for (let x = 6; x <= 13; x++) {
      const i = (y * FRAME_W + x) * 4;
      png.data[i] = 200;
      png.data[i + 1] = 100;
      png.data[i + 2] = 50;
      png.data[i + 3] = 255;
    }
  }
  // soft/antialiased edge pixel just outside the body (partial alpha)
  const i = (27 * FRAME_W + 14) * 4;
  png.data[i] = 200;
  png.data[i + 1] = 100;
  png.data[i + 2] = 50;
  png.data[i + 3] = fringeAlpha;
  return png;
}

function makeSheet(frameCount) {
  const cols = 3; // frameCount=6 fills the grid exactly (2 rows x 3 cols), no blank cells
  const rows = Math.ceil(frameCount / cols);
  const sheet = new PNG({ width: cols * FRAME_W, height: rows * FRAME_H });
  for (let n = 0; n < frameCount; n++) {
    const row = Math.floor(n / cols);
    const col = n % cols;
    const f = makeCharFrame({ fringeAlpha: n === 0 ? 90 : 200 }); // vary so binarise both directions exercised
    for (let y = 0; y < FRAME_H; y++) {
      const dstBase = ((row * FRAME_H + y) * sheet.width + col * FRAME_W) * 4;
      const srcBase = y * FRAME_W * 4;
      for (let x = 0; x < FRAME_W * 4; x++) sheet.data[dstBase + x] = f.data[srcBase + x];
    }
  }
  return sheet;
}

// 6 frames: N walk(4) + N idle(2) — deliberately variable (not the 4/2/2 x 4-dir default).
const SEQUENCE = [
  { dir: 'N', anim: 'walk', frames: 4 },
  { dir: 'N', anim: 'idle', frames: 2 },
];
const FRAME_COUNT = 6;

function fixtureManifest() {
  return { source: 'sheet', cellW: FRAME_W, cellH: FRAME_H, cols: 3, sequence: SEQUENCE };
}

test('opaqueBBox: finds bbox of non-transparent pixels', () => {
  const f = makeCharFrame();
  const bbox = opaqueBBox(f);
  assert.deepEqual(bbox, { minX: 6, minY: 4, maxX: 14, maxY: 27 }); // fringe pixel included (alpha>0)
});

test('alignFrame: translates feet (bbox center-x, bbox bottom-y) onto ANCHOR, no resample', () => {
  const f = makeCharFrame();
  const aligned = alignFrame(f);
  assert.equal(aligned.width, CELL_W);
  assert.equal(aligned.height, CELL_H);
  // feet point in source: center x of [6,14] -> round(10)=10, bottom y=27
  // shift = (64-10, 127-27) = (54, 100)
  const idx = (ANCHOR.y * CELL_W + ANCHOR.x) * 4;
  assert.ok(aligned.data[idx + 3] > 0, 'anchor pixel should be opaque');
  // the body's top-left source pixel (6,4) should land at (6+54, 4+100) = (60,104)
  const moved = ((4 + 100) * CELL_W + (6 + 54)) * 4;
  assert.deepEqual(
    [aligned.data[moved], aligned.data[moved + 1], aligned.data[moved + 2]],
    [200, 100, 50],
  );
  // nothing below the anchor row (feet sit at the bottom of the frame)
  let belowOpaque = false;
  for (let y = ANCHOR.y + 1; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++) if (aligned.data[(y * CELL_W + x) * 4 + 3] > 0) belowOpaque = true;
  }
  assert.equal(belowOpaque, false);
});

test('alignFrame: throws when the aligned frame would not fit in 128x128', () => {
  const big = new PNG({ width: 200, height: 200 });
  for (let y = 190; y < 200; y++)
    for (let x = 0; x < 200; x++) {
      const i = (y * 200 + x) * 4;
      big.data[i + 3] = 255;
    }
  assert.throws(() => alignFrame(big), /doesn't fit/);
});

test('binariseAlpha: thresholds to exactly 0 or 255', () => {
  const f = makeCharFrame({ fringeAlpha: 90 });
  binariseAlpha(f);
  const alphas = new Set();
  for (let i = 3; i < f.data.length; i += 4) alphas.add(f.data[i]);
  assert.deepEqual([...alphas].sort((a, b) => a - b), [0, 255]);
  // the 90-alpha fringe pixel (below threshold 128) is now 0
  const i = (27 * FRAME_W + 14) * 4;
  assert.equal(f.data[i + 3], 0);
});

test('binariseAlpha: alpha >= threshold rounds up to 255', () => {
  const f = makeCharFrame({ fringeAlpha: 200 });
  binariseAlpha(f);
  const i = (27 * FRAME_W + 14) * 4;
  assert.equal(f.data[i + 3], 255);
});

test('sliceSheet: splits a grid sheet into row-major frames, exact pixels', () => {
  const sheet = makeSheet(FRAME_COUNT);
  const frames = sliceSheet(sheet, FRAME_W, FRAME_H, 3);
  assert.equal(frames.length, FRAME_COUNT);
  for (const f of frames) {
    assert.equal(f.width, FRAME_W);
    assert.equal(f.height, FRAME_H);
  }
});

test('sliceSheet: rejects mismatched cols / non-divisible dims', () => {
  const sheet = makeSheet(FRAME_COUNT);
  assert.throws(() => sliceSheet(sheet, FRAME_W, FRAME_H, 5), /does not match|not divisible/);
  const bad = new PNG({ width: 37, height: 37 });
  assert.throws(() => sliceSheet(bad, FRAME_W, FRAME_H, 3), /not divisible/);
});

test('buildAnimations: variable frame counts per anim, validates total', () => {
  const anims = buildAnimations(SEQUENCE, FRAME_COUNT);
  assert.deepEqual(anims, { hero: { N: { walk: [0, 1, 2, 3], idle: [4, 5] } } });
  assert.throws(() => buildAnimations(SEQUENCE, 7), /sequence totals/);
});

test('assembleSheet: packs frames row-major at 8 cols into 128x128 cells', () => {
  const frames = [alignFrame(makeCharFrame()), alignFrame(makeCharFrame())];
  const sheet = assembleSheet(frames, COLS);
  assert.equal(sheet.width, COLS * CELL_W);
  assert.equal(sheet.height, CELL_H); // 2 frames, 1 row at 8 cols
});

test('runImport: full pipeline on fixture sheet — grid geometry, anchor, alpha', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-pixellab-'));
  try {
    const sheetPath = join(dir, 'pixellab_hero.png');
    writeFileSync(sheetPath, PNG.sync.write(makeSheet(FRAME_COUNT)));
    const manifest = fixtureManifest();
    const { sheetPng, animations, frameCount } = runImport(sheetPath, manifest);

    assert.equal(frameCount, FRAME_COUNT);
    // grid geometry: 8 cols, 128x128 cells, enough rows for 6 frames (1 row)
    assert.equal(sheetPng.width, COLS * CELL_W);
    assert.equal(sheetPng.height, CELL_H);
    assert.deepEqual(animations, { hero: { N: { walk: [0, 1, 2, 3], idle: [4, 5] } } });

    // every frame: alpha binarised + feet anchor opaque
    for (let n = 0; n < frameCount; n++) {
      const col = n % COLS;
      const row = Math.floor(n / COLS);
      const seen = new Set();
      for (let y = 0; y < CELL_H; y++) {
        for (let x = 0; x < CELL_W; x++) {
          const i = ((row * CELL_H + y) * sheetPng.width + (col * CELL_W + x)) * 4 + 3;
          seen.add(sheetPng.data[i]);
        }
      }
      assert.ok([...seen].every((a) => a === 0 || a === 255), `frame ${n} alpha not binarised: ${[...seen]}`);
      const anchorIdx = ((row * CELL_H + ANCHOR.y) * sheetPng.width + (col * CELL_W + ANCHOR.x)) * 4 + 3;
      assert.equal(sheetPng.data[anchorIdx], 255, `frame ${n} anchor pixel not opaque`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeImport: writes assets/hero.png + merges animations.hero into atlas.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-pixellab-write-'));
  try {
    const sheetPath = join(dir, 'pixellab_hero.png');
    writeFileSync(sheetPath, PNG.sync.write(makeSheet(FRAME_COUNT)));
    const atlasPath = join(dir, 'atlas.json');
    writeFileSync(
      atlasPath,
      JSON.stringify({
        version: 1,
        sheets: [{ file: 'assets/tiles.png', cellW: 64, cellH: 32, cols: 8 }],
        tiles: {},
        sprites: {},
        animations: { existing: { x: 1 } },
      }),
    );
    const outPath = join(dir, 'assets', 'hero.png');
    const { atlas, frameCount } = writeImport(sheetPath, fixtureManifest(), { atlasPath, outPath });

    assert.equal(frameCount, FRAME_COUNT);
    const onDisk = PNG.sync.read(readFileSync(outPath));
    assert.equal(onDisk.width, COLS * CELL_W);
    assert.equal(onDisk.height, CELL_H);

    assert.deepEqual(atlas.animations.hero, { N: { walk: [0, 1, 2, 3], idle: [4, 5] } });
    assert.deepEqual(atlas.animations.existing, { x: 1 }); // untouched sibling entry preserved
    assert.deepEqual(
      atlas.sheets.find((s) => s.file === 'assets/hero.png'),
      { file: 'assets/hero.png', cellW: CELL_W, cellH: CELL_H, cols: COLS },
    );
    assert.deepEqual(atlas.sheets[0], { file: 'assets/tiles.png', cellW: 64, cellH: 32, cols: 8 }); // untouched
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('dir mode: loads named frame files in manifest order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-pixellab-dir-'));
  try {
    const framesDir = join(dir, 'frames');
    mkdirSync(framesDir);
    const names = ['n_walk_0.png', 'n_walk_1.png', 'n_walk_2.png', 'n_walk_3.png', 'n_idle_0.png', 'n_idle_1.png'];
    names.forEach((n, i) => writeFileSync(join(framesDir, n), PNG.sync.write(makeCharFrame({ fringeAlpha: i === 0 ? 90 : 200 }))));
    const manifest = { source: 'dir', files: names, sequence: SEQUENCE };
    const { animations, frameCount } = runImport(framesDir, manifest);
    assert.equal(frameCount, 6);
    assert.deepEqual(animations, { hero: { N: { walk: [0, 1, 2, 3], idle: [4, 5] } } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: node tools/import-pixellab/import-pixellab.js <sheet> <manifest> --atlas --out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-pixellab-cli-'));
  try {
    const sheetPath = join(dir, 'pixellab_hero.png');
    writeFileSync(sheetPath, PNG.sync.write(makeSheet(FRAME_COUNT)));
    const manifestPath = join(dir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(fixtureManifest()));
    const atlasPath = join(dir, 'atlas.json');
    writeFileSync(atlasPath, JSON.stringify({ version: 1, sheets: [], tiles: {}, sprites: {}, animations: {} }));
    const outPath = join(dir, 'assets', 'hero.png');

    const stdout = execFileSync(
      process.execPath,
      [CLI, sheetPath, manifestPath, '--atlas', atlasPath, '--out', outPath],
      { encoding: 'utf8' },
    );
    assert.match(stdout, /6 frame\(s\)/);
    const onDisk = PNG.sync.read(readFileSync(outPath));
    assert.equal(onDisk.width, COLS * CELL_W);
    const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
    assert.deepEqual(atlas.animations.hero, { N: { walk: [0, 1, 2, 3], idle: [4, 5] } });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: mismatched sequence total exits non-zero with a message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-pixellab-cli-bad-'));
  try {
    const sheetPath = join(dir, 'pixellab_hero.png');
    writeFileSync(sheetPath, PNG.sync.write(makeSheet(FRAME_COUNT)));
    const manifestPath = join(dir, 'manifest.json');
    writeFileSync(
      manifestPath,
      JSON.stringify({ source: 'sheet', cellW: FRAME_W, cellH: FRAME_H, cols: 3, sequence: [{ dir: 'N', anim: 'walk', frames: 4 }] }),
    );
    assert.throws(
      () =>
        execFileSync(process.execPath, [CLI, sheetPath, manifestPath, '--atlas', join(dir, 'atlas.json'), '--out', join(dir, 'hero.png')], {
          encoding: 'utf8',
          stdio: 'pipe',
        }),
      (err) => err.status === 1 && /sequence totals/.test(err.stderr),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
