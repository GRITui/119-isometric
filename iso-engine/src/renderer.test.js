import { collectDrawables, tileColor, isEntityOccluded, draw } from './renderer.js';
import { loadTilemap } from './tilemap.js';
import { createEntity } from './movement.js';
import { createCamera } from './camera.js';
import { depthKey } from './iso.js';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const VW = 2000;
const VH = 2000;

// --- known scene: 4x4, prop at (0,0), z=1 tile at (1,1), player at (0,0) ---
const doc = {
  version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0',
  tiles: [{ i: 1, j: 1, t: 'tile_grass_0', z: 1 }],
  props: [{ id: 'p1', asset: 'spr_tree_0', i: 0, j: 0, z: 0, footprint: [[0, 0]] }],
};
const tm = loadTilemap(doc);
const cam = createCamera(2, 2, 1);
const player = createEntity(0, 0);
const d = collectDrawables(tm, player, cam, VW, VH);

// --- all 16 tiles present at this large viewport (no cull) ---
const tiles = d.filter((x) => x.kind === 'tile');
assert.strictEqual(tiles.length, 16);
assert.strictEqual(d.filter((x) => x.kind === 'prop').length, 1);
assert.strictEqual(d.filter((x) => x.kind === 'entity').length, 1);

// --- depth order: ascending depthKey; ties tile < prop < entity ---
for (let k = 1; k < d.length; k++) {
  assert.ok(d[k - 1].depthKey <= d[k].depthKey, `sorted at ${k}`);
}
// first three: tile(0,0), prop(0,0), entity(0,0) — all depthKey 0
assert.strictEqual(d[0].kind, 'tile');
assert.deepStrictEqual([d[0].i, d[0].j], [0, 0]);
assert.strictEqual(d[1].kind, 'prop');
assert.strictEqual(d[2].kind, 'entity');
// then the depthKey-1000 row: (0,1) then (1,0) (stable, i-major)
assert.strictEqual(d[3].kind, 'tile');
assert.deepStrictEqual([d[3].i, d[3].j], [0, 1]);
assert.strictEqual(d[4].kind, 'tile');
assert.deepStrictEqual([d[4].i, d[4].j], [1, 0]);

// --- elevation: z=1 tile sorts after its z=0 row-mates (2001 > 2000) ---
const z1 = d.find((x) => x.kind === 'tile' && x.i === 1 && x.j === 1);
assert.strictEqual(z1.z, 1);
assert.strictEqual(z1.depthKey, depthKey(1, 1, 1)); // 2001
const idxZ1 = d.indexOf(z1);
const idxZ0 = d.findIndex((x) => x.kind === 'tile' && x.i === 2 && x.j === 0); // key 2000
assert.ok(idxZ0 < idxZ1, 'z=1 tile draws after z=0 tile of same row');

// --- player depthKey = base tile (painter's), sits between its row-mates ---
const ent = d.find((x) => x.kind === 'entity');
assert.strictEqual(ent.depthKey, depthKey(0, 0, 0));

// --- front tile occludes back tile: (3,3) is last of the tiles ---
const front = d.filter((x) => x.kind === 'tile').at(-1);
assert.deepStrictEqual([front.i, front.j], [3, 3]);

// --- culling: small viewport on a 16x16 map, far tiles dropped ---
const bigDoc = {
  version: 1, w: 16, h: 16, defaultTile: 'tile_grass_0',
  tiles: [], props: [],
};
const bigTm = loadTilemap(bigDoc);
{
  const cam0 = createCamera(0, 0, 1);
  const d0 = collectDrawables(bigTm, null, cam0, 100, 100);
  const has = (i, j) => d0.some((x) => x.kind === 'tile' && x.i === i && x.j === j);
  assert.ok(has(0, 0), 'near tile (0,0) kept');
  assert.ok(has(6, 0), 'mid tile (6,0) kept at zoom 1');
  assert.ok(!has(15, 15), 'far tile (15,15) culled');
  assert.ok(!has(15, 0), 'far tile (15,0) culled');
}

// --- culling at zoom: zoom 2 sees less of the map ---
{
  const d2 = collectDrawables(bigTm, null, createCamera(0, 0, 2), 100, 100);
  const has = (i, j) => d2.some((x) => x.kind === 'tile' && x.i === i && x.j === j);
  assert.ok(has(0, 0));
  assert.ok(!has(6, 0), 'zoom 2: (6,0) off-screen');
}

// --- no entity -> no entity drawable ---
assert.strictEqual(collectDrawables(tm, null, cam, VW, VH).filter((x) => x.kind === 'entity').length, 0);

// --- deterministic per-tile-id color ---
assert.strictEqual(tileColor('tile_grass_0'), tileColor('tile_grass_0'));
assert.notStrictEqual(tileColor('tile_grass_0'), tileColor('tile_path_0'));
assert.ok(/^hsl\(\d+ 45% 40%\)$/.test(tileColor('tile_mystery_99')), 'unknown id -> deterministic hsl');

// --- F-01: occlusion cue (fixture: freestanding tall prop, open floor) ---
// Uses data/scene_f01_fixture.json — a prop NOT wall-flush, so the tile
// "behind" it (toward the camera-far corner) is walkable and exercises the
// occlusion path that SCENE_01 never hits.
const here = dirname(fileURLToPath(import.meta.url));
const fixtureDoc = JSON.parse(readFileSync(join(here, '..', 'data', 'scene_f01_fixture.json'), 'utf8'));
const fixtureTm = loadTilemap(fixtureDoc);
const fixtureCam = createCamera(3, 3, 2);

// Player standing on the open tile diagonally "behind" the fridge (one step
// toward the back wall direction, di=-1,dj=-1 from the prop) is fully
// screen-covered by the 2u-tall fridge with the old renderer.
const occludedPlayer = createEntity(2, 2);
const dOcc = collectDrawables(fixtureTm, occludedPlayer, fixtureCam, 1000, 1000);
assert.strictEqual(isEntityOccluded(dOcc, fixtureCam, 1000, 1000), true, 'F-01: player behind freestanding prop is flagged occluded');

// Same player, standing clear of the prop (far corner) -> not occluded.
const clearPlayer = createEntity(0, 0);
const dClear = collectDrawables(fixtureTm, clearPlayer, fixtureCam, 1000, 1000);
assert.strictEqual(isEntityOccluded(dClear, fixtureCam, 1000, 1000), false, 'F-01: player in open floor is not occluded');

// draw() must not throw when occluded, and must paint an extra cue pass
// (recorded via a minimal fake 2D context) on top of the normal entity draw.
{
  const calls = [];
  const fakeCtx = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'imageSmoothingEnabled') return true;
      return (...args) => calls.push([prop, args]);
    },
    set(_t, prop, val) {
      if (prop === 'imageSmoothingEnabled') return true;
      calls.push(['set:' + String(prop), val]);
      return true;
    },
  });
  draw(fakeCtx, dOcc, fixtureCam, 1000, 1000, null);
  const saves = calls.filter((c) => c[0] === 'save').length;
  assert.ok(saves >= 1, 'F-01: occluded frame runs the cue draw pass (ctx.save called)');
}
{
  const calls = [];
  const fakeCtx = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'imageSmoothingEnabled') return true;
      return (...args) => calls.push([prop, args]);
    },
    set() { return true; },
  });
  draw(fakeCtx, dClear, fixtureCam, 1000, 1000, null);
  const saves = calls.filter((c) => c[0] === 'save').length;
  assert.strictEqual(saves, 0, 'F-01: clear frame does not run the cue draw pass');
}

console.log('renderer.js: all tests passed (depth sort, elevation, cull, deterministic color, F-01 occlusion cue)');
