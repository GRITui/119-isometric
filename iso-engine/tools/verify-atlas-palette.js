// verify-atlas-palette.js — per-category on-palette colour-count check.
// Usage: node tools/verify-atlas-palette.js [data/atlas.json]
//
// Rule (ART_GEN.md / ATLAS_SCHEMA.md): assets must stay on a small shared
// palette. Hero sprite sheets get a wider allowance (<=48 distinct colours)
// than tile/prop sheets (<=16) — animation + shading detail on the hero
// needs more ramp colours than a static tile/prop. This replaces the old
// single global 16-colour constant with a per-category limit.

import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const LIMITS = {
  hero: 48,
  default: 16,
};

// Category for a sheet entry, derived from its file name. Tiles/props (and
// anything not explicitly a hero sheet) stay on the strict default limit.
export function categoryForSheet(file) {
  return /(^|\/)hero\.png$/i.test(file) ? 'hero' : 'default';
}

export function limitForSheet(file) {
  return LIMITS[categoryForSheet(file)];
}

// Count distinct opaque colours (alpha > 0) in a decoded pngjs image.
// Fully-transparent pixels don't count against the palette budget.
export function countDistinctColors(png) {
  const seen = new Set();
  const { width, height, data } = png;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;
      seen.add(`${data[i]},${data[i + 1]},${data[i + 2]},${a}`);
    }
  }
  return seen.size;
}

// Verify one sheet: { file, category, limit, count, ok }.
export function verifySheetBuffer(file, buf) {
  const png = PNG.sync.read(buf);
  const category = categoryForSheet(file);
  const limit = limitForSheet(file);
  const count = countDistinctColors(png);
  return { file, category, limit, count, ok: count <= limit };
}

// Verify every sheet listed in an atlas manifest, resolving `file` relative
// to `root` (the atlas.json's directory's parent, per ATLAS_SCHEMA — sheet
// paths are relative to the iso-engine package root, e.g. "assets/hero.png").
export function verifyAtlas(manifest, root) {
  const results = (manifest.sheets ?? []).map((sheet) => {
    const buf = readFileSync(join(root, sheet.file));
    return verifySheetBuffer(sheet.file, buf);
  });
  return { results, ok: results.every((r) => r.ok) };
}

// --- CLI ---

const __dirname = dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const root = join(__dirname, '..');
  const atlasPath = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, 'data/atlas.json');
  const manifest = JSON.parse(readFileSync(atlasPath, 'utf8'));
  const { results, ok } = verifyAtlas(manifest, dirname(dirname(atlasPath)) === root ? root : dirname(atlasPath));
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${basename(r.file)} [${r.category}] ${r.count}/${r.limit} colours`);
  }
  if (!ok) {
    console.error('verify-atlas-palette: one or more sheets exceed their colour-count limit');
    process.exit(1);
  }
  console.log('verify-atlas-palette: all sheets on-palette');
}
