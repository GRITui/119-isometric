// import-pixellab.js — import a PixelLab hero export (sprite sheet, directory
// of frames, or zip of frames) into assets/hero.png (128x128 cells, 8 cols,
// ATLAS_SCHEMA v2) + data/atlas.json `animations.hero` entries.
//
// Node CLI (ESM). Uses pngjs for PNG decode/encode (tools/ may use npm deps).
//
// Usage:
//   node tools/import-pixellab/import-pixellab.js <source> <manifest.json> \
//     [--atlas data/atlas.json] [--out assets/hero.png]
//
// <source> is one of:
//   - a sprite sheet PNG (frames laid out in a grid; manifest gives cellW/cellH/cols)
//   - a directory of per-frame PNGs (manifest gives a `files` list, in order)
//   - a .zip of per-frame PNGs (extracted via the system `unzip`, then treated
//     as a directory; manifest `files` order still applies)
//
// <manifest.json> describes the source layout AND the animation sequence, since
// PixelLab exports don't carry anim/dir/frame-count metadata themselves:
//   {
//     "source": "sheet" | "dir",
//     "cellW": 96, "cellH": 96, "cols": 8,      // sheet mode only
//     "files": ["n_walk_0.png", ...],            // dir mode only, in frame order
//     "sequence": [
//       { "dir": "N", "anim": "walk", "frames": 4 },
//       { "dir": "N", "anim": "idle", "frames": 2 },
//       ...
//     ]
//   }
// `sequence` frame counts must sum to the source frame count. Frames are
// consumed in order and assigned to hero.png cells 0..N-1 (row-major, 8 cols).
// `animations.hero[dir][anim]` in atlas.json becomes the matching index range.
//
// GRID_SPEC v2 anchor: (64, 127) — every output frame is translated (no
// resampling/scaling) so the source's feet point (bbox bottom-center of the
// non-transparent pixels) lands exactly on that pixel. Errors if a frame
// doesn't fit in the 128x128 canvas after alignment (no scaling allowed).
// Alpha is binarised to 0/255 (threshold 128) — no soft/antialiased edges.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';

export const CELL_W = 128;
export const CELL_H = 128;
export const COLS = 8;
export const ANCHOR = { x: 64, y: 127 };
export const ALPHA_THRESHOLD = 128;

// --- frame extraction -------------------------------------------------

// Slice a decoded sheet PNG into row-major frames of cellW x cellH.
export function sliceSheet(png, cellW, cellH, cols) {
  const { width, height, data } = png;
  if (width % cellW !== 0 || height % cellH !== 0)
    throw new Error(`sheet ${width}x${height} not divisible by cell ${cellW}x${cellH}`);
  const sheetCols = width / cellW;
  const sheetRows = height / cellH;
  if (cols !== sheetCols)
    throw new Error(`manifest cols=${cols} does not match sheet (${sheetCols} cols at cell ${cellW}x${cellH})`);
  const frames = [];
  for (let row = 0; row < sheetRows; row++) {
    for (let col = 0; col < sheetCols; col++) {
      const out = new PNG({ width: cellW, height: cellH });
      for (let y = 0; y < cellH; y++) {
        const srcBase = ((row * cellH + y) * width + col * cellW) * 4;
        const dstBase = y * cellW * 4;
        for (let x = 0; x < cellW * 4; x++) out.data[dstBase + x] = data[srcBase + x];
      }
      frames.push(out);
    }
  }
  return frames;
}

// --- alignment ----------------------------------------------------------

// Bounding box of non-transparent (alpha > 0) pixels. Returns null if empty.
export function opaqueBBox(png) {
  const { width, height, data } = png;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

// Translate `src` (any size) onto a new CELL_W x CELL_H canvas so that the
// source's opaque-bbox feet point (bbox center x, bbox bottom y) lands on
// ANCHOR. Pure integer translation — no resampling/scaling. Throws if any
// opaque source pixel would fall outside the canvas.
export function alignFrame(src) {
  const bbox = opaqueBBox(src);
  const out = new PNG({ width: CELL_W, height: CELL_H }); // transparent black
  if (!bbox) return out; // fully empty frame — nothing to align
  const feetX = Math.round((bbox.minX + bbox.maxX) / 2);
  const feetY = bbox.maxY;
  const dx = ANCHOR.x - feetX;
  const dy = ANCHOR.y - feetY;
  const { width: sw, height: sh, data: sd } = src;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const a = sd[(y * sw + x) * 4 + 3];
      if (a === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= CELL_W || ny < 0 || ny >= CELL_H)
        throw new Error(
          `frame doesn't fit in ${CELL_W}x${CELL_H} after feet-anchor alignment ` +
            `(source ${sw}x${sh}, feet at (${feetX},${feetY}), shift (${dx},${dy}))`,
        );
      const si = (y * sw + x) * 4;
      const di = (ny * CELL_W + nx) * 4;
      out.data[di] = sd[si];
      out.data[di + 1] = sd[si + 1];
      out.data[di + 2] = sd[si + 2];
      out.data[di + 3] = a;
    }
  }
  return out;
}

// Threshold alpha to 0/255 in place. Returns the png for chaining.
export function binariseAlpha(png, threshold = ALPHA_THRESHOLD) {
  const { data } = png;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= threshold ? 255 : 0;
  return png;
}

// --- sequence / manifest -------------------------------------------------

// Validate a sequence against a frame count; returns { animations, total }
// where animations.hero[dir][anim] = [startIdx..endIdx-1].
export function buildAnimations(sequence, frameCount) {
  if (!Array.isArray(sequence) || sequence.length === 0)
    throw new Error('manifest.sequence must be a non-empty array');
  const animations = { hero: {} };
  let idx = 0;
  for (const entry of sequence) {
    const { dir, anim, frames } = entry;
    if (!dir || !anim || !Number.isInteger(frames) || frames <= 0)
      throw new Error(`bad sequence entry: ${JSON.stringify(entry)}`);
    if (!animations.hero[dir]) animations.hero[dir] = {};
    const indices = [];
    for (let k = 0; k < frames; k++) indices.push(idx++);
    animations.hero[dir][anim] = indices;
  }
  if (idx !== frameCount)
    throw new Error(`sequence totals ${idx} frame(s) but source has ${frameCount}`);
  return animations;
}

// --- sheet assembly -------------------------------------------------

// Pack aligned+binarised 128x128 frames into a row-major 8-col sheet PNG.
export function assembleSheet(frames, cols = COLS) {
  const rows = Math.ceil(frames.length / cols);
  const out = new PNG({ width: cols * CELL_W, height: rows * CELL_H });
  for (let i = 0; i < frames.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const f = frames[i];
    for (let y = 0; y < CELL_H; y++) {
      const dstBase = ((row * CELL_H + y) * out.width + col * CELL_W) * 4;
      const srcBase = y * CELL_W * 4;
      for (let x = 0; x < CELL_W * 4; x++) out.data[dstBase + x] = f.data[srcBase + x];
    }
  }
  return out;
}

// --- frame loading (source mode dispatch) -------------------------------

function loadFramesFromDir(dir, files) {
  return files.map((f) => PNG.sync.read(readFileSync(join(dir, f))));
}

function extractZip(zipPath) {
  const dir = mkdtempSync(join(tmpdir(), 'import-pixellab-zip-'));
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', dir]);
  return dir;
}

// Load raw (unaligned) source frames per the manifest. Returns PNG[] in order.
// Caller is responsible for cleaning up any temp dir this creates (returned
// as `cleanup`, a no-op unless a zip was extracted).
export function loadSourceFrames(sourcePath, manifest) {
  let cleanup = () => {};
  if (manifest.source === 'sheet') {
    const png = PNG.sync.read(readFileSync(sourcePath));
    const { cellW, cellH, cols } = manifest;
    if (!cellW || !cellH || !cols) throw new Error('manifest sheet mode requires cellW, cellH, cols');
    return { frames: sliceSheet(png, cellW, cellH, cols), cleanup };
  }
  if (manifest.source === 'dir') {
    let dir = sourcePath;
    if (extname(sourcePath).toLowerCase() === '.zip') {
      dir = extractZip(sourcePath);
      cleanup = () => rmSync(dir, { recursive: true, force: true });
    }
    if (!manifest.files || !manifest.files.length) throw new Error('manifest dir mode requires a non-empty files[] list');
    return { frames: loadFramesFromDir(dir, manifest.files), cleanup };
  }
  throw new Error(`manifest.source must be "sheet" or "dir", got ${JSON.stringify(manifest.source)}`);
}

// --- full import ----------------------------------------------------

// Runs the full pipeline. Returns { sheetPng, animations, frameCount }.
// Does not touch disk (pure); CLI / writeImport below handle I/O.
export function runImport(sourcePath, manifest) {
  const { frames: rawFrames, cleanup } = loadSourceFrames(sourcePath, manifest);
  try {
    const aligned = rawFrames.map((f) => binariseAlpha(alignFrame(f)));
    const sheetPng = assembleSheet(aligned, COLS);
    const animations = buildAnimations(manifest.sequence, rawFrames.length);
    return { sheetPng, animations, frameCount: rawFrames.length };
  } finally {
    cleanup();
  }
}

// Writes assets/hero.png and merges `animations.hero` + the hero sheet entry
// into the atlas.json at atlasPath. Returns the updated atlas object.
export function writeImport(sourcePath, manifest, { atlasPath, outPath }) {
  const { sheetPng, animations, frameCount } = runImport(sourcePath, manifest);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, PNG.sync.write(sheetPng));

  const atlas = existsSync(atlasPath) ? JSON.parse(readFileSync(atlasPath, 'utf8')) : { version: 1, sheets: [], tiles: {}, sprites: {}, animations: {} };
  const heroSheetIdx = atlas.sheets.findIndex((s) => s.file === 'assets/hero.png' || /hero\.png$/.test(s.file || ''));
  const heroSheetEntry = { file: 'assets/hero.png', cellW: CELL_W, cellH: CELL_H, cols: COLS };
  if (heroSheetIdx >= 0) atlas.sheets[heroSheetIdx] = { ...atlas.sheets[heroSheetIdx], ...heroSheetEntry };
  else atlas.sheets.push(heroSheetEntry);
  atlas.animations = { ...(atlas.animations || {}), ...animations };
  writeFileSync(atlasPath, JSON.stringify(atlas, null, 2) + '\n');
  return { atlas, frameCount };
}

// --- CLI -----------------------------------------------------------------

function parseArgs(argv) {
  const pos = [];
  let atlas = 'data/atlas.json';
  let out = 'assets/hero.png';
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--atlas') atlas = argv[++k];
    else if (a === '--out') out = argv[++k];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node tools/import-pixellab/import-pixellab.js <source> <manifest.json> [--atlas path] [--out path]');
      process.exit(0);
    } else pos.push(a);
  }
  return { source: pos[0], manifestPath: pos[1], atlas, out };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { source, manifestPath, atlas, out } = parseArgs(process.argv.slice(2));
  if (!source || !manifestPath) {
    console.error('Usage: node tools/import-pixellab/import-pixellab.js <source> <manifest.json> [--atlas path] [--out path]');
    process.exit(1);
  }
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const { frameCount } = writeImport(source, manifest, { atlasPath: atlas, outPath: out });
    console.log(`import-pixellab: ${frameCount} frame(s) -> ${out}`);
    console.log(`import-pixellab: animations.hero -> ${atlas}`);
  } catch (err) {
    console.error(`import-pixellab: ${err.message}`);
    process.exit(1);
  }
}
