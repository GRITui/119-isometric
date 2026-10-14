// tilemap.test.js — tilemap data model + loader (schema v1).
// Uses a synthetic fixture (not data/scene.json, which is the real Scene 01
// studio apartment — see scene01.test.js for scene-specific coverage).
import { loadTilemap, SCHEMA_VERSION } from './tilemap.js';
import assert from 'node:assert';

const doc = {
  version: 1, w: 16, h: 16, defaultTile: 'tile_grass_0',
  tiles: [
    { i: 0, j: 8, t: 'tile_path_0', z: 0 },
    { i: 2, j: 2, t: 'tile_grass_0', z: 1 },
    { i: 13, j: 13, t: 'tile_grass_0', z: 1 },
  ],
  props: [
    { id: 'p1', asset: 'spr_tree_0', i: 3, j: 4, z: 0, footprint: [[3, 4]] },
    { id: 'p2', asset: 'spr_tree_0', i: 12, j: 5, z: 0, footprint: [[12, 5]] },
    { id: 'p3', asset: 'wall_wood_1', i: 5, j: 12, z: 0, footprint: [[5, 12]] },
  ],
};
const tm = loadTilemap(doc);
assert.strictEqual(tm.version, SCHEMA_VERSION);
assert.strictEqual(tm.w, 16);
assert.strictEqual(tm.h, 16);
assert.strictEqual(tm.defaultTile, 'tile_grass_0');

// --- tileAt: default vs explicit ---
assert.deepStrictEqual(tm.tileAt(0, 0), { t: 'tile_grass_0', z: 0 }); // unlisted -> default
assert.deepStrictEqual(tm.tileAt(0, 8), { t: 'tile_path_0', z: 0 }); // explicit path tile
assert.deepStrictEqual(tm.tileAt(2, 2), { t: 'tile_grass_0', z: 1 }); // explicit elevation
assert.strictEqual(tm.tileAt(-1, 0), null, 'OOB -> null');
assert.strictEqual(tm.tileAt(16, 0), null, 'OOB -> null');
assert.strictEqual(tm.tileAt(0, 16), null, 'OOB -> null');

// --- fixture has exactly 2 elevation-1 tiles ---
let elev = 0;
for (let i = 0; i < 16; i++)
  for (let j = 0; j < 16; j++)
    if (tm.tileAt(i, j).z === 1) elev++;
assert.strictEqual(elev, 2, 'exactly two z:1 tiles in fixture');

// --- isBlocked: bounds / elevation / prop footprint / walkable ---
assert.strictEqual(tm.isBlocked(-1, 0), true, 'OOB left blocked');
assert.strictEqual(tm.isBlocked(0, -1), true, 'OOB top blocked');
assert.strictEqual(tm.isBlocked(16, 0), true, 'OOB right blocked');
assert.strictEqual(tm.isBlocked(0, 16), true, 'OOB bottom blocked');
assert.strictEqual(tm.isBlocked(2, 2), true, 'elevation z:1 blocks (no climbing, v1)');
assert.strictEqual(tm.isBlocked(13, 13), true, 'elevation z:1 blocks');
assert.strictEqual(tm.isBlocked(3, 4), true, 'prop footprint blocks');
assert.strictEqual(tm.isBlocked(12, 5), true, 'prop footprint blocks');
assert.strictEqual(tm.isBlocked(5, 12), true, 'prop footprint blocks');
assert.strictEqual(tm.isBlocked(8, 8), false, 'map center walkable');
assert.strictEqual(tm.isBlocked(0, 8), false, 'path walkable');
assert.strictEqual(tm.isBlocked(4, 4), false, 'plain grass walkable');

// --- props: 3 (spr_tree_0 x2, wall_wood_1 x1), depth key = max (i+j) * 1000 + z ---
assert.strictEqual(tm.props.length, 3);
const [p1, p2, p3] = tm.props;
assert.strictEqual(p1.asset, 'spr_tree_0');
assert.strictEqual(p2.asset, 'spr_tree_0');
assert.strictEqual(p3.asset, 'wall_wood_1');
assert.strictEqual(p1.depthKey, (3 + 4) * 1000 + 0);
assert.strictEqual(p2.depthKey, (12 + 5) * 1000 + 0);
assert.strictEqual(p3.depthKey, (5 + 12) * 1000 + 0);
assert.deepStrictEqual(p1.footprint, [[3, 4]]);

// --- loadTilemap accepts a plain object too ---
const tm2 = loadTilemap({ version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [], props: [] });
assert.deepStrictEqual(tm2.tileAt(3, 3), { t: 'tile_grass_0', z: 0 });
assert.strictEqual(tm2.isBlocked(3, 3), false);
assert.deepStrictEqual(tm2.props, []);

// --- multi-tile prop: depth key from max footprint (i+j); all cells blocked ---
const tm3 = loadTilemap({
  version: 1, w: 8, h: 8, defaultTile: 'tile_grass_0', tiles: [],
  props: [{ id: 'wall', asset: 'wall_wood_1', i: 2, j: 2, z: 0, footprint: [[2, 2], [3, 2], [4, 2]] }],
});
assert.strictEqual(tm3.props[0].depthKey, (4 + 2) * 1000 + 0, 'depth key = max footprint (i+j)');
assert.strictEqual(tm3.isBlocked(2, 2), true);
assert.strictEqual(tm3.isBlocked(3, 2), true);
assert.strictEqual(tm3.isBlocked(4, 2), true);
assert.strictEqual(tm3.isBlocked(5, 2), false, 'tile past footprint walkable');

// --- normalized raw keeps input tile order + filled defaults (tooling round-trip) ---
const tm4 = loadTilemap({
  version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0',
  tiles: [{ i: 1, j: 1, t: 'tile_path_0' }, { i: 0, j: 3, t: 'tile_grass_0', z: 1 }],
  props: [],
});
assert.deepStrictEqual(tm4.raw.tiles, [
  { i: 1, j: 1, t: 'tile_path_0', z: 0 },
  { i: 0, j: 3, t: 'tile_grass_0', z: 1 },
]);

// --- malformed input rejected ---
const bad = [
  { version: 2, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [], props: [] }, // wrong version
  { version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [{ i: 9, j: 0, t: 'tile_path_0' }], props: [] }, // OOB tile
  { version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [{ i: 0, j: 0, t: 'tile_path_0', z: -1 }], props: [] }, // bad z
  { version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [], props: [{ id: 'p', asset: 'spr_tree_0', i: 0, j: 0, footprint: [[0, 9]] }] }, // OOB footprint
  { version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [], props: [{ id: 'p', asset: 'spr_tree_0', i: 0, j: 0, footprint: [] }] }, // empty footprint
  { version: 1, w: 4, h: 4, defaultTile: 'tile_grass_0', tiles: [], props: [{ id: 'p', asset: 'spr_tree_0', i: 0, j: 0 }] }, // missing footprint
  { version: 1, w: 0, h: 4, defaultTile: 'tile_grass_0', tiles: [], props: [] }, // bad w
  { version: 1, w: 4, h: 4, defaultTile: '', tiles: [], props: [] }, // bad defaultTile
];
for (const b of bad) {
  assert.throws(() => loadTilemap(b), /loadTilemap/, `should reject: ${JSON.stringify(b)}`);
}
assert.throws(() => loadTilemap('not json'), /loadTilemap/, 'invalid JSON rejected');
assert.throws(() => loadTilemap(null), /loadTilemap/, 'null rejected');

console.log('tilemap.js: all tests passed (load, tileAt default/explicit, isBlocked bounds/elevation/prop, malformed rejected)');
