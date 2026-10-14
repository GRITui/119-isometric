import {
  findPath, createEntity, setPath, step, tryStepDir, entityPos, INPUT_DIRS, STEP_MS,
} from './movement.js';
import { gridToWorld } from './iso.js';
import assert from 'node:assert';

// --- test tilemap: 16x16 with a set of blocked tiles ---
function fakeTilemap(w = 16, h = 16, blocked = new Set()) {
  const key = (i, j) => `${i},${j}`;
  return {
    w, h, defaultTile: 'tile_grass_0',
    tileAt(i, j) {
      if (i < 0 || j < 0 || i >= w || j >= h) return null;
      return { t: 'tile_grass_0', z: 0 };
    },
    props: [],
    isBlocked(i, j) {
      return i < 0 || j < 0 || i >= w || j >= h || blocked.has(key(i, j));
    },
  };
}

function assertValidPath(path, tilemap, from, to) {
  assert.ok(Array.isArray(path), 'path is array');
  assert.deepStrictEqual(path[0], from);
  assert.deepStrictEqual(path[path.length - 1], to);
  for (let k = 1; k < path.length; k++) {
    const [pi, pj] = path[k - 1];
    const [ci, cj] = path[k];
    assert.ok(Math.abs(ci - pi) + Math.abs(cj - pj) === 1, `step ${k} is 4-neighborhood`);
    assert.ok(!tilemap.isBlocked(ci, cj), `path tile (${ci},${cj}) not blocked`);
  }
}

// --- A*: straight line on open map ---
{
  const tm = fakeTilemap();
  const p = findPath(tm, [8, 8], [8, 10]);
  assert.deepStrictEqual(p, [[8, 8], [8, 9], [8, 10]]);
}

// --- A*: from == to ---
{
  const tm = fakeTilemap();
  assert.deepStrictEqual(findPath(tm, [3, 3], [3, 3]), [[3, 3]]);
}

// --- A*: shortest path around a blocked wall ---
// wall: row j=4 blocked for i=0..14 (gap only at i=15)
{
  const blocked = new Set();
  for (let i = 0; i <= 14; i++) blocked.add(`${i},4`);
  const tm = fakeTilemap(16, 16, blocked);
  const p = findPath(tm, [2, 3], [2, 5]);
  assert.ok(p, 'path exists around the wall');
  assertValidPath(p, tm, [2, 3], [2, 5]);
  // must cross the wall at the only gap (15,4)
  assert.ok(p.some(([i, j]) => i === 15 && j === 4), 'path uses the gap at (15,4)');
  // shortest: |2-15| + |3-4| + |4-5| + |15-2| = 13+1+1+13 = 28 steps
  assert.strictEqual(p.length, 29);
}

// --- A*: null when unreachable (ring of blocked tiles) ---
{
  const tm = fakeTilemap(16, 16, new Set(['6,7', '8,7', '7,6', '7,8']));
  assert.strictEqual(findPath(tm, [7, 7], [0, 0]), null);
}

// --- A*: null when the target itself is blocked ---
{
  const tm = fakeTilemap(16, 16, new Set(['5,5']));
  assert.strictEqual(findPath(tm, [0, 0], [5, 5]), null);
}

// --- entity: step + linear interpolation ---
{
  const e = createEntity(0, 0);
  assert.strictEqual(e.state, 'idle');
  setPath(e, [[0, 0], [1, 0]]);
  assert.strictEqual(e.state, 'moving');

  step(e, 90); // half a tile (STEP_MS = 180)
  assert.strictEqual(e.state, 'moving');
  let pos = entityPos(e);
  assert.ok(Math.abs(pos.x - 8) < 1e-9, `midpoint x=8 (got ${pos.x})`);
  assert.ok(Math.abs(pos.y - 4) < 1e-9, `midpoint y=4 (got ${pos.y})`); // +i: (0.5,0) -> (8,4)
  assert.strictEqual(e.i, 0); // still on the from tile
  assert.strictEqual(e.j, 0);

  step(e, 90); // finish
  assert.strictEqual(e.state, 'idle');
  assert.strictEqual(e.i, 1);
  assert.strictEqual(e.j, 0);
  const w = gridToWorld(1, 0, 0);
  pos = entityPos(e);
  assert.strictEqual(pos.x, w.x);
  assert.strictEqual(pos.y, w.y);
}

// --- entity: quarter-tile interpolation ---
{
  const e = createEntity(0, 0);
  setPath(e, [[0, 0], [1, 0]]);
  step(e, 45);
  const pos = entityPos(e);
  assert.ok(Math.abs(pos.x - 4) < 1e-9, `quarter x=4 (got ${pos.x})`);
  assert.ok(Math.abs(pos.y - 2) < 1e-9, `quarter y=2 (got ${pos.y})`); // (0.25,0) -> (4,2)
}

// --- entity: multi-tile path, one tile per STEP_MS ---
{
  const e = createEntity(0, 0);
  setPath(e, [[0, 0], [1, 0], [2, 0], [2, 1]]);
  step(e, STEP_MS);
  assert.strictEqual(e.i, 1); assert.strictEqual(e.j, 0);
  assert.strictEqual(e.state, 'moving');
  step(e, STEP_MS);
  assert.strictEqual(e.i, 2); assert.strictEqual(e.j, 0);
  assert.strictEqual(e.state, 'moving');
  step(e, STEP_MS);
  assert.strictEqual(e.i, 2); assert.strictEqual(e.j, 1);
  assert.strictEqual(e.state, 'idle');
}

// --- entity: custom stepMs ---
{
  const e = createEntity(0, 0);
  setPath(e, [[0, 0], [1, 0]]);
  step(e, 90, null, 90);
  assert.strictEqual(e.state, 'idle');
  assert.strictEqual(e.i, 1);
}

// --- tryStepDir: blocked -> state 'blocked' ---
{
  const tm = fakeTilemap(16, 16, new Set(['1,0']));
  const e = createEntity(0, 0);
  assert.strictEqual(tryStepDir(e, 1, 0, tm), false);
  assert.strictEqual(e.state, 'blocked');
  assert.strictEqual(e.i, 0);
  // next successful step recovers
  assert.strictEqual(tryStepDir(e, 0, 1, tm), true);
  assert.strictEqual(e.state, 'moving');
}

// --- input mapping (lead decision): W=-i S=+i A=+j D=-j ---
assert.deepStrictEqual(INPUT_DIRS.w, [-1, 0]);
assert.deepStrictEqual(INPUT_DIRS.arrowup, [-1, 0]);
assert.deepStrictEqual(INPUT_DIRS.s, [1, 0]);
assert.deepStrictEqual(INPUT_DIRS.arrowdown, [1, 0]);
assert.deepStrictEqual(INPUT_DIRS.a, [0, 1]);
assert.deepStrictEqual(INPUT_DIRS.arrowleft, [0, 1]);
assert.deepStrictEqual(INPUT_DIRS.d, [0, -1]);
assert.deepStrictEqual(INPUT_DIRS.arrowright, [0, -1]);

console.log('movement.js: all tests passed (A* shortest/blocked/null, step+interp, input map)');
