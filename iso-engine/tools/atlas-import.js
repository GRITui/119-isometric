// atlas-import.js — import a PNG atlas into per-cell tile sprites + manifest.
// Node CLI (ESM). tools/ MAY use npm deps (lead decision): pngjs for PNG
// decode/encode. src/ stays dep-free.
//
// Usage:
//   node tools/atlas-import.js <input.png> <outDir> --cell WxH --name <prefix>
//
// Examples:
//   node tools/atlas-import.js atlas_grass.png assets/tiles --cell 32x16 --name tile_grass
//   node tools/atlas-import.js atlas_props.png  assets/props  --cell 32x32 --name spr_tree
//
// Input:  a PNG laid out on a grid of WxH cells; each cell = one tile sprite
//         (e.g. 32x16 ground tiles, 32x32 props).
// Output: <outDir>/<prefix>_<row>_<col>.png per NON-transparent cell
//         (fully-transparent cells are skipped) + <outDir>/atlas.json:
//         { "version":1, "cellW":32, "cellH":16,
//           "cells":[{"name":"tile_grass_0_0","src":"tile_grass_0_0.png","w":32,"h":16}] }
//
// Naming follows the tile_/spr_/wall_ convention (GRID_SPEC) via --name.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

export const MANIFEST_VERSION = 1;

// Parse a "WxH" cell spec (e.g. "32x16"). Throws on bad input.
export function parseCellSpec(spec) {
  const m = /^(\d+)x(\d+)$/i.exec(String(spec ?? '').trim());
  if (!m) throw new Error(`--cell must be WxH (e.g. 32x16), got ${JSON.stringify(spec)}`);
  const cellW = Number(m[1]);
  const cellH = Number(m[2]);
  if (cellW <= 0 || cellH <= 0) throw new Error('--cell W/H must be positive');
  return { cellW, cellH };
}

// Cell name: <prefix>_<row>_<col> (row-major, 0-based).
export function cellName(prefix, row, col) {
  return `${prefix}_${row}_${col}`;
}

// Split a decoded PNG (pngjs) into WxH cells. Returns one entry per
// NON-transparent cell: { row, col, name, src, png } (png = extracted cell).
// Throws if the atlas dimensions are not divisible by the cell size.
export function splitAtlas(png, cellW, cellH, prefix) {
  const { width, height, data } = png;
  if (width % cellW !== 0 || height % cellH !== 0)
    throw new Error(`atlas ${width}x${height} not divisible by cell ${cellW}x${cellH}`);
  const cols = width / cellW;
  const rows = height / cellH;
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const out = new PNG({ width: cellW, height: cellH });
      let opaque = 0;
      for (let y = 0; y < cellH; y++) {
        const srcBase = ((row * cellH + y) * width + col * cellW) * 4;
        const dstBase = y * cellW * 4;
        for (let x = 0; x < cellW; x++) {
          const si = srcBase + x * 4;
          const di = dstBase + x * 4;
          out.data[di] = data[si];
          out.data[di + 1] = data[si + 1];
          out.data[di + 2] = data[si + 2];
          out.data[di + 3] = data[si + 3];
          if (data[si + 3] > 0) opaque++;
        }
      }
      if (opaque === 0) continue; // skip fully-transparent cells
      const name = cellName(prefix, row, col);
      cells.push({ row, col, name, src: `${name}.png`, png: out });
    }
  }
  return cells;
}

// Build the atlas.json manifest for a list of extracted cells.
export function manifestFor(cells, cellW, cellH) {
  return {
    version: MANIFEST_VERSION,
    cellW,
    cellH,
    cells: cells.map(({ name, src }) => ({ name, src, w: cellW, h: cellH })),
  };
}

// Full import: decode pngPath, extract non-transparent cells into outDir,
// write <outDir>/atlas.json. Returns { manifest, cells: [{name, src, outPath}] }.
export function importAtlas(pngPath, outDir, { cellW, cellH, name }) {
  if (!name || typeof name !== 'string')
    throw new Error('--name <prefix> is required (e.g. tile_grass)');
  if (!/^(tile|spr|wall)_/.test(name))
    console.warn(`atlas-import: prefix ${JSON.stringify(name)} does not match the tile_/spr_/wall_ convention`);
  const png = PNG.sync.read(readFileSync(pngPath));
  const cells = splitAtlas(png, cellW, cellH, name);
  mkdirSync(outDir, { recursive: true });
  const written = cells.map((c) => {
    const outPath = join(outDir, c.src);
    writeFileSync(outPath, PNG.sync.write(c.png));
    return { name: c.name, src: c.src, outPath };
  });
  const manifest = manifestFor(cells, cellW, cellH);
  writeFileSync(join(outDir, 'atlas.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, cells: written };
}

// --- CLI ---

function parseArgs(argv) {
  const pos = [];
  let cell = null;
  let name = null;
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--cell') cell = argv[++k];
    else if (a === '--name') name = argv[++k];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node tools/atlas-import.js <input.png> <outDir> --cell WxH --name <prefix>');
      process.exit(0);
    } else pos.push(a);
  }
  return { input: pos[0], outDir: pos[1], cell, name };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { input, outDir, cell, name } = parseArgs(process.argv.slice(2));
  if (!input || !outDir) {
    console.error('Usage: node tools/atlas-import.js <input.png> <outDir> --cell WxH --name <prefix>');
    process.exit(1);
  }
  try {
    const { cellW, cellH } = parseCellSpec(cell);
    const { manifest, cells } = importAtlas(input, outDir, { cellW, cellH, name });
    console.log(`atlas-import: ${cells.length} cell(s) -> ${outDir}/ (skipped ${manifest.cells.length === 0 ? 'all' : 'transparent'} )`);
    for (const c of cells) console.log(`  ${c.src}`);
    console.log(`atlas-import: manifest -> ${join(outDir, 'atlas.json')}`);
  } catch (err) {
    console.error(`atlas-import: ${err.message}`);
    process.exit(1);
  }
}
