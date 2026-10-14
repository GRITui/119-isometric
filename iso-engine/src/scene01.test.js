// scene01.test.js — Scene 01 studio apartment (real data/scene.json +
// data/save.json): spec conformance, A* connectivity, cutaway walls,
// multi-tile prop depth-sort (bed/sofa) vs hero on every adjacent tile.
import { loadTilemap } from './tilemap.js';
import { parse as parseSave } from './save.js';
import { findPath } from './movement.js';
import { collectDrawables } from './renderer.js';
import { createCamera } from './camera.js';
import { createEntity } from './movement.js';
import { depthKey } from './iso.js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert';

const sceneRaw = readFileSync(new URL('../data/scene.json', import.meta.url), 'utf8');
const saveRaw = readFileSync(new URL('../data/save.json', import.meta.url), 'utf8');
const tm = loadTilemap(sceneRaw);
const save = parseSave(saveRaw);

// --- shape ---
assert.strictEqual(tm.w, 10);
assert.strictEqual(tm.h, 8);

// --- spawn: (8,1) facing S ---
assert.deepStrictEqual(save.player, { i: 8, j: 1, z: 0, facing: 's' });
assert.strictEqual(tm.isBlocked(save.player.i, save.player.j), false, 'spawn tile walkable');

// --- cutaway: only back walls (j=0 row, i=0 column) are built + blocked;
//     front edges (i=9, j=7) are open floor, not walls ---
for (let i = 0; i < 10; i++) assert.strictEqual(tm.isBlocked(i, 0), true, `(${i},0) back wall blocked`);
for (let j = 0; j < 8; j++) assert.strictEqual(tm.isBlocked(0, j), true, `(0,${j}) back wall blocked`);
for (let i = 1; i < 10; i++) assert.notStrictEqual(tm.tileAt(i, 7).z, 2, `(${i},7) front edge no wall`);
for (let j = 1; j < 8; j++) assert.notStrictEqual(tm.tileAt(9, j).z, 2, `(9,${j}) front edge no wall`);
assert.strictEqual(tm.isBlocked(9, 7), false, 'front-right corner open floor');
// door/window asset keys verbatim at spec'd cells
assert.strictEqual(tm.tileAt(8, 0).t, 'wall_int_door_ne_0');
assert.strictEqual(tm.tileAt(5, 0).t, 'wall_int_window_ne_0');
assert.strictEqual(tm.tileAt(0, 4).t, 'wall_int_window_nw_0');
assert.strictEqual(tm.tileAt(1, 0).t, 'wall_int_0');
assert.strictEqual(tm.tileAt(0, 1).t, 'wall_int_0');
// walls are 2 units tall
for (let i = 0; i < 10; i++) assert.strictEqual(tm.tileAt(i, 0).z, 2);
for (let j = 0; j < 8; j++) assert.strictEqual(tm.tileAt(0, j).z, 2);

// --- props: 11, all blocked, asset keys verbatim ---
assert.strictEqual(tm.props.length, 11);
const byId = Object.fromEntries(tm.props.map((p) => [p.id, p]));
const EXPECT = {
  p_fridge: { asset: 'spr_fridge_0', footprint: [[1, 1]] },
  p_stove: { asset: 'spr_stove_0', footprint: [[1, 2]] },
  p_counter: { asset: 'spr_counter_0', footprint: [[1, 3]] },
  p_desk: { asset: 'spr_desk_0', footprint: [[1, 4]] },
  p_chair: { asset: 'spr_chair_0', footprint: [[2, 4]] },
  p_bed: { asset: 'spr_bed_0', footprint: [[1, 5], [1, 6]] },
  p_lamp: { asset: 'spr_lamp_0', footprint: [[1, 7]] },
  p_sofa: { asset: 'spr_sofa_0', footprint: [[4, 1], [5, 1]] },
  p_shelf: { asset: 'spr_shelf_0', footprint: [[7, 1]] },
  p_plant: { asset: 'spr_plant_0', footprint: [[9, 1]] },
  p_crate: { asset: 'spr_crate_0', footprint: [[7, 6], [8, 7]] },
};
for (const [id, exp] of Object.entries(EXPECT)) {
  assert.ok(byId[id], `prop ${id} present`);
  assert.strictEqual(byId[id].asset, exp.asset, `${id} asset key`);
  assert.deepStrictEqual(byId[id].footprint, exp.footprint, `${id} footprint`);
  for (const [fi, fj] of exp.footprint) assert.strictEqual(tm.isBlocked(fi, fj), true, `${id} cell (${fi},${fj}) blocked`);
}

// --- A* connectivity: every walkable interior tile reaches spawn (49/49) ---
let walkable = 0;
let reachable = 0;
const unreachable = [];
for (let i = 1; i < 10; i++) {
  for (let j = 1; j < 8; j++) {
    if (tm.isBlocked(i, j)) continue;
    walkable++;
    const path = findPath(tm, [save.player.i, save.player.j], [i, j]);
    if (path) reachable++;
    else unreachable.push([i, j]);
  }
}
assert.strictEqual(walkable, 49, `49 walkable interior tiles (got ${walkable})`);
assert.deepStrictEqual(unreachable, [], 'all walkable tiles reach spawn');
assert.strictEqual(reachable, 49, '49/49 reach spawn');

// --- multi-tile depth sort: bed (1,5)+(1,6), depthKey = max(i+j)=7 -> 7000 ---
const bed = byId.p_bed;
assert.strictEqual(bed.depthKey, depthKey(7, 0, 0));
// adjacent walkable tiles to the bed footprint
const bedAdjacent = [[2, 5], [2, 6]]; // (0,5)/(0,6) wall, (1,4)/(1,7) are other props
for (const [i, j] of bedAdjacent) assert.strictEqual(tm.isBlocked(i, j), false, `(${i},${j}) walkable beside bed`);

const cam = createCamera(5, 4, 1);
for (const [i, j] of bedAdjacent) {
  const hero = createEntity(i, j, 0);
  const d = collectDrawables(tm, hero, cam, 4000, 4000);
  const bedD = d.find((x) => x.kind === 'prop' && x.id === 'p_bed');
  const heroD = d.find((x) => x.kind === 'entity');
  const heroDepth = depthKey(i, j, 0);
  const idxBed = d.indexOf(bedD);
  const idxHero = d.indexOf(heroD);
  if (heroDepth >= bedD.depthKey) {
    assert.ok(idxHero > idxBed, `hero at (${i},${j}) depth>=bed draws in front`);
  } else {
    assert.ok(idxHero < idxBed, `hero at (${i},${j}) depth<bed draws behind`);
  }
}

// --- multi-tile depth sort: sofa (4,1)+(5,1), depthKey = max(i+j)=6 -> 6000 ---
const sofa = byId.p_sofa;
assert.strictEqual(sofa.depthKey, depthKey(6, 0, 0));
const sofaAdjacent = [[3, 1], [4, 2], [5, 2], [6, 1]];
for (const [i, j] of sofaAdjacent) assert.strictEqual(tm.isBlocked(i, j), false, `(${i},${j}) walkable beside sofa`);
for (const [i, j] of sofaAdjacent) {
  const hero = createEntity(i, j, 0);
  const d = collectDrawables(tm, hero, cam, 4000, 4000);
  const sofaD = d.find((x) => x.kind === 'prop' && x.id === 'p_sofa');
  const heroD = d.find((x) => x.kind === 'entity');
  const heroDepth = depthKey(i, j, 0);
  const idxSofa = d.indexOf(sofaD);
  const idxHero = d.indexOf(heroD);
  if (heroDepth >= sofaD.depthKey) {
    assert.ok(idxHero > idxSofa, `hero at (${i},${j}) depth>=sofa draws in front`);
  } else {
    assert.ok(idxHero < idxSofa, `hero at (${i},${j}) depth<sofa draws behind`);
  }
}
// sanity: (3,1) sum=4 is strictly behind sofa (sum=6) -> hero drawn first
{
  const hero = createEntity(3, 1, 0);
  const d = collectDrawables(tm, hero, cam, 4000, 4000);
  const sofaD = d.find((x) => x.kind === 'prop' && x.id === 'p_sofa');
  const heroD = d.find((x) => x.kind === 'entity');
  assert.ok(d.indexOf(heroD) < d.indexOf(sofaD), 'hero behind sofa when standing further back');
}

console.log('scene01.js: all tests passed (spawn/facing, cutaway walls, 11 props, 49/49 A* connectivity, bed/sofa depth-sort)');
