import {
  gridToWorld, worldToGrid, worldToTile, tileAnchor, depthKey, tileCorners,
  TILE_W, TILE_H, ELEV_PX,
} from './iso.js';
import assert from 'node:assert';

// --- 2:1 ratio + locked constants (HIRES_V2) ---
assert.strictEqual(TILE_W, 64);
assert.strictEqual(TILE_H, 32);
assert.strictEqual(TILE_W / TILE_H, 2);
assert.strictEqual(ELEV_PX, 32);

// --- grid->screen matches the locked art spec exactly ---
// sx = ox + (i-j)*32 ; sy = oy + (i+j)*16 - z*32
let p = gridToWorld(5, 2, 1, 100, 50);
assert.strictEqual(p.x, 100 + (5 - 2) * 32);      // 196
assert.strictEqual(p.y, 50 + (5 + 2) * 16 - 1 * 32); // 130

// --- round-trip grid<->screen (z=0), all tiles in a 16x16 map ---
for (let i = 0; i < 16; i++) {
  for (let j = 0; j < 16; j++) {
    const w = gridToWorld(i, j, 0);
    const g = worldToGrid(w.x, w.y);
    assert.ok(Math.abs(g.i - i) < 1e-9, `i roundtrip ${i},${j}`);
    assert.ok(Math.abs(g.j - j) < 1e-9, `j roundtrip ${i},${j}`);
  }
}

// --- anchor = tile bottom (front) vertex (sx, sy+32) ---
const a = tileAnchor(2, 2);
assert.strictEqual(a.x, (2 - 2) * 32);       // 0
assert.strictEqual(a.y, (2 + 2) * 16 + 32);  // 96

// --- tile corners form a 2:1 diamond ---
const c = tileCorners(0, 0);
assert.strictEqual(c.right.x - c.left.x, TILE_W);   // width 64
assert.strictEqual(c.bottom.y - c.top.y, TILE_H);   // height 32

// --- depth ordering (painter's algorithm) ---
assert.ok(depthKey(2, 2) < depthKey(3, 3), "front row draws later");
assert.ok(depthKey(3, 3, 0) < depthKey(3, 3, 1), "higher z draws later");
assert.ok(depthKey(0, 5) === depthKey(5, 0), "same row depth equal");

// --- picking: a point inside a tile snaps to that tile ---
const center = gridToWorld(4, 4, 0);
const snapped = worldToTile(center.x, center.y + 4); // slightly toward front
assert.strictEqual(snapped.i, 4);
assert.strictEqual(snapped.j, 4);

console.log('iso.js: all tests passed (2:1 grid<->screen, anchor, depth key, picking)');
