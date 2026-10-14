// atlas-import.test.js — synthetic atlas round-trip for tools/atlas-import.js.
// Generates a PNG atlas with pngjs (colored + transparent cells), runs the
// import (module API + real CLI), asserts manifest contents + cell pixels.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { parseCellSpec, cellName, splitAtlas, manifestFor, importAtlas } from './atlas-import.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(HERE, 'atlas-import.js');

const CELL_W = 32;
const CELL_H = 16;
const GREEN = [80, 160, 80, 255];
const BLUE = [60, 90, 200, 255];
const RED = [200, 60, 60, 255];

// 2x2 grid of 32x16 cells: (0,0) green, (0,1) blue, (1,0) red, (1,1) transparent.
function makeAtlas() {
  const png = new PNG({ width: CELL_W * 2, height: CELL_H * 2 });
  const fill = (row, col, rgba) => {
    for (let y = 0; y < CELL_H; y++) {
      for (let x = 0; x < CELL_W; x++) {
        const idx = ((row * CELL_H + y) * png.width + (col * CELL_W + x)) * 4;
        png.data[idx] = rgba[0];
        png.data[idx + 1] = rgba[1];
        png.data[idx + 2] = rgba[2];
        png.data[idx + 3] = rgba[3];
      }
    }
  };
  fill(0, 0, GREEN);
  fill(0, 1, BLUE);
  fill(1, 0, RED);
  // (1,1) left fully transparent
  return png;
}

function centerPixel(path) {
  const d = PNG.sync.read(readFileSync(path));
  const idx = ((Math.floor(d.height / 2)) * d.width + Math.floor(d.width / 2)) * 4;
  return [d.data[idx], d.data[idx + 1], d.data[idx + 2], d.data[idx + 3]];
}

test('parseCellSpec: parses WxH, rejects bad input', () => {
  assert.deepEqual(parseCellSpec('32x16'), { cellW: 32, cellH: 16 });
  assert.deepEqual(parseCellSpec(' 32X32 '), { cellW: 32, cellH: 32 });
  assert.throws(() => parseCellSpec('32'), /WxH/);
  assert.throws(() => parseCellSpec('axb'), /WxH/);
  assert.throws(() => parseCellSpec('0x16'), /positive/);
});

test('cellName: <prefix>_<row>_<col>', () => {
  assert.equal(cellName('tile_grass', 0, 0), 'tile_grass_0_0');
  assert.equal(cellName('spr_tree', 1, 2), 'spr_tree_1_2');
});

test('splitAtlas: extracts non-transparent cells, skips transparent, rejects bad size', () => {
  const png = makeAtlas();
  const cells = splitAtlas(png, CELL_W, CELL_H, 'tile_grass');
  assert.deepEqual(
    cells.map((c) => [c.row, c.col, c.name, c.src]),
    [
      [0, 0, 'tile_grass_0_0', 'tile_grass_0_0.png'],
      [0, 1, 'tile_grass_0_1', 'tile_grass_0_1.png'],
      [1, 0, 'tile_grass_1_0', 'tile_grass_1_0.png'],
    ],
  );
  // extracted cell pixels are exact
  const c00 = cells[0].png;
  const idx = (7 * c00.width + 5) * 4;
  assert.deepEqual([c00.data[idx], c00.data[idx + 1], c00.data[idx + 2], c00.data[idx + 3]], GREEN);
  // non-divisible atlas throws
  const bad = new PNG({ width: 40, height: 24 });
  assert.throws(() => splitAtlas(bad, CELL_W, CELL_H, 'x'), /not divisible/);
});

test('importAtlas (module API): manifest + extracted cell pixels round-trip', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-import-'));
  try {
    const input = join(dir, 'atlas.png');
    writeFileSync(input, PNG.sync.write(makeAtlas()));
    const outDir = join(dir, 'out');
    const { manifest, cells } = importAtlas(input, outDir, { cellW: CELL_W, cellH: CELL_H, name: 'tile_grass' });

    assert.deepEqual(manifest, {
      version: 1,
      cellW: 32,
      cellH: 16,
      cells: [
        { name: 'tile_grass_0_0', src: 'tile_grass_0_0.png', w: 32, h: 16 },
        { name: 'tile_grass_0_1', src: 'tile_grass_0_1.png', w: 32, h: 16 },
        { name: 'tile_grass_1_0', src: 'tile_grass_1_0.png', w: 32, h: 16 },
      ],
    });
    assert.deepEqual(cells.map((c) => c.name), ['tile_grass_0_0', 'tile_grass_0_1', 'tile_grass_1_0']);

    // transparent cell skipped on disk
    assert.equal(existsSync(join(outDir, 'tile_grass_1_1.png')), false);
    // extracted pixels match the source atlas
    assert.deepEqual(centerPixel(join(outDir, 'tile_grass_0_0.png')), GREEN);
    assert.deepEqual(centerPixel(join(outDir, 'tile_grass_0_1.png')), BLUE);
    assert.deepEqual(centerPixel(join(outDir, 'tile_grass_1_0.png')), RED);
    // manifest on disk matches
    const onDisk = JSON.parse(readFileSync(join(outDir, 'atlas.json'), 'utf8'));
    assert.deepEqual(onDisk, manifest);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: node tools/atlas-import.js <png> <out> --cell 32x16 --name spr_tree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-cli-'));
  try {
    const input = join(dir, 'props.png');
    writeFileSync(input, PNG.sync.write(makeAtlas()));
    const outDir = join(dir, 'out');
    const stdout = execFileSync(
      process.execPath,
      [CLI, input, outDir, '--cell', '32x16', '--name', 'spr_tree'],
      { encoding: 'utf8' },
    );
    assert.match(stdout, /3 cell\(s\)/);
    const manifest = JSON.parse(readFileSync(join(outDir, 'atlas.json'), 'utf8'));
    assert.deepEqual(manifest.cells.map((c) => c.name), ['spr_tree_0_0', 'spr_tree_0_1', 'spr_tree_1_0']);
    assert.deepEqual(centerPixel(join(outDir, 'spr_tree_0_0.png')), GREEN);
    assert.equal(existsSync(join(outDir, 'spr_tree_1_1.png')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: bad --cell exits non-zero with a message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-cli-bad-'));
  try {
    const input = join(dir, 'props.png');
    writeFileSync(input, PNG.sync.write(makeAtlas()));
    assert.throws(
      () =>
        execFileSync(process.execPath, [CLI, input, join(dir, 'out'), '--cell', '32', '--name', 'x'], {
          encoding: 'utf8',
          stdio: 'pipe',
        }),
      (err) => err.status === 1 && /--cell must be WxH/.test(err.stderr),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
