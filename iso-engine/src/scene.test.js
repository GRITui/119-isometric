// scene.test.js — scene assembly: generic engine behavior (camera, input,
// A*, pan/zoom) against a synthetic fixture (not the real Scene 01 data —
// see scene01.test.js for scene-specific coverage).
import { createScene } from './scene.js';
import { loadTilemap } from './tilemap.js';
import { worldToScreen, screenToGrid } from './camera.js';
import { gridToWorld } from './iso.js';
import { entityPos } from './movement.js';
import assert from 'node:assert';

const VW = 800;
const VH = 600;

const sceneJson = {
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
const tilemap = loadTilemap(sceneJson);
const save = {
  version: 1, scene: 'scene.json',
  player: { i: 8, j: 8, z: 0, facing: 's' },
  camera: { cx: 8, cy: 8, zoom: 2 },
  props: tilemap.props,
};
assert.strictEqual(tilemap.w, 16);
assert.strictEqual(tilemap.h, 16);

// --- createScene from save: camera + player restored ---
const scene = createScene({ tilemap, save, width: VW, height: VH });
assert.strictEqual(scene.camera.cx, 8);
assert.strictEqual(scene.camera.cy, 8);
assert.strictEqual(scene.camera.zoom, 2);
assert.strictEqual(scene.player.i, 8);
assert.strictEqual(scene.player.j, 8);
assert.strictEqual(scene.player.state, 'idle');

// --- no save: camera + player default to map center ---
{
  const s2 = createScene({ tilemap, width: VW, height: VH });
  assert.strictEqual(s2.camera.cx, 8);
  assert.strictEqual(s2.camera.cy, 8);
  assert.strictEqual(s2.camera.zoom, 2);
  assert.strictEqual(s2.player.i, 8);
  assert.strictEqual(s2.player.j, 8);
}

// --- WASD mapping: W=-i, S=+i, A=+j, D=-j (one tile per press) ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  s.handleKey('w'); s.update(180);
  assert.strictEqual(s.player.i, 7); assert.strictEqual(s.player.j, 8);
  assert.strictEqual(s.player.state, 'idle');
  s.handleKey('d'); s.update(180);
  assert.strictEqual(s.player.i, 7); assert.strictEqual(s.player.j, 7);
  s.handleKey('s'); s.update(180);
  assert.strictEqual(s.player.i, 8); assert.strictEqual(s.player.j, 7);
  s.handleKey('a'); s.update(180);
  assert.strictEqual(s.player.i, 8); assert.strictEqual(s.player.j, 8);
  // arrows behave identically
  s.handleKey('ArrowUp'); s.update(180);
  assert.strictEqual(s.player.i, 7);
  s.handleKey('ArrowLeft'); s.update(180);
  assert.strictEqual(s.player.j, 9);
  s.handleKey('ArrowDown'); s.update(180);
  assert.strictEqual(s.player.i, 8);
  s.handleKey('ArrowRight'); s.update(180);
  assert.strictEqual(s.player.j, 8);
}

// --- keys queue while moving ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  s.handleKey('w');            // start moving (8,8) -> (7,8)
  s.handleKey('w');            // queued while moving
  assert.strictEqual(s.player.state, 'moving');
  s.update(180);               // arrive (7,8), queue pops -> moving to (6,8)
  assert.strictEqual(s.player.i, 7);
  assert.strictEqual(s.player.state, 'moving');
  s.update(180);               // arrive (6,8)
  assert.strictEqual(s.player.i, 6);
  assert.strictEqual(s.player.state, 'idle');
}

// --- stepping into a blocked tile -> state 'blocked', no move ---
{
  // player at (4,12); wall_wood_1 prop blocks (5,12)
  const blockedSave = {
    version: 1, scene: 'scene.json',
    player: { i: 4, j: 12, z: 0, facing: 's' },
    camera: { cx: 4, cy: 12, zoom: 2 },
    props: tilemap.props,
  };
  const s = createScene({ tilemap, save: blockedSave, width: VW, height: VH });
  s.handleKey('s'); // +i -> (5,12) is blocked
  assert.strictEqual(s.player.state, 'blocked');
  assert.strictEqual(s.player.i, 4);
  assert.strictEqual(s.player.j, 12);
  s.update(180);
  assert.strictEqual(s.player.i, 4);
}

// --- click-to-move: A* path, player walks there ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  // screen position of the center of tile (8,10)
  const w = gridToWorld(8.5, 10.5, 0);
  const sc = worldToScreen({ i: 8.5, j: 10.5, z: 0 }, s.camera, VW, VH);
  assert.strictEqual(sc.x, (w.x - 0) * 2 + VW / 2); // camera at (8,8): world px 0
  assert.strictEqual(sc.y, (w.y - 256) * 2 + VH / 2);
  s.handleClick(sc.x, sc.y);
  assert.strictEqual(s.player.state, 'moving');
  s.update(180 * 3); // 2 tiles
  assert.strictEqual(s.player.i, 8);
  assert.strictEqual(s.player.j, 10);
  assert.strictEqual(s.player.state, 'idle');
}

// --- click on a blocked tile (prop) -> no move ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  const sc = worldToScreen({ i: 3.5, j: 4.5, z: 0 }, s.camera, VW, VH); // spr_tree_0 at (3,4)
  s.handleClick(sc.x, sc.y);
  assert.strictEqual(s.player.state, 'idle');
  assert.strictEqual(s.player.i, 8);
  assert.strictEqual(s.player.j, 8);
}

// --- click-to-move picks the tile under the cursor (screenToGrid inverse) ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  for (const [i, j] of [[2, 6], [11, 9], [8, 8]]) {
    const sc = worldToScreen({ i: i + 0.5, j: j + 0.5, z: 0 }, s.camera, VW, VH);
    const g = screenToGrid(sc.x, sc.y, s.camera, VW, VH);
    assert.strictEqual(Math.floor(g.i), i, `pick i ${i},${j}`);
    assert.strictEqual(Math.floor(g.j), j, `pick j ${i},${j}`);
  }
}

// --- zoom: integer, clamped 1..3 (HIRES_V2) ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  s.handleZoom(1);
  assert.strictEqual(s.camera.zoom, 3);
  s.handleZoom(100);
  assert.strictEqual(s.camera.zoom, 3); // clamped at max (one step per call)
  s.handleZoom(-1);
  s.handleZoom(-1);
  s.handleZoom(-100);
  assert.strictEqual(s.camera.zoom, 1); // clamped at min
  s.handleZoom(0.5);
  assert.strictEqual(s.camera.zoom, 2); // sign(0.5) = +1
}

// --- pan: screen drag moves focus, clamped to the map ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  s.handlePan(160, 0);
  assert.ok(Math.abs(s.camera.cx - 6.75) < 1e-9, `cx 6.75 (got ${s.camera.cx})`);
  assert.ok(Math.abs(s.camera.cy - 9.25) < 1e-9, `cy 9.25 (got ${s.camera.cy})`);
  s.handlePan(-100000, 0);
  assert.strictEqual(s.camera.cx, 16); // dragged left -> focus clamps to right edge
  s.handlePan(100000, 0);
  assert.strictEqual(s.camera.cx, 0); // dragged right -> focus clamps to left edge
  s.handlePan(0, -100000);
  assert.strictEqual(s.camera.cy, 16);
  s.handlePan(0, 100000);
  assert.strictEqual(s.camera.cy, 0);
}

// --- pan keeps the world under the cursor moving with the drag ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  const p = { i: 5, j: 5, z: 0 };
  const before = worldToScreen(p, s.camera, VW, VH);
  s.handlePan(40, -20);
  const after = worldToScreen(p, s.camera, VW, VH);
  assert.ok(Math.abs(after.x - (before.x + 40)) < 1e-9);
  assert.ok(Math.abs(after.y - (before.y - 20)) < 1e-9);
}

// --- update with dt=0 is a no-op ---
{
  const s = createScene({ tilemap, save, width: VW, height: VH });
  s.handleKey('w');
  s.update(0);
  assert.strictEqual(s.player.state, 'moving');
  assert.strictEqual(s.player.i, 8);
}

// --- autoFrame: manual zoom/pan persists across update() ticks (t_97a0c254) ---
// The shipped browser build runs autoFrame=true; syncCamera() used to
// recompute cx/cy/zoom every tick, reverting handleZoom()/handlePan() within
// one rAF frame. Manual control must now persist until resetCamera().
{
  // Desktop: 16x16 room fits a large viewport -> static room-fit framing.
  const s = createScene({ tilemap, width: 2048, height: 1200, autoFrame: true });
  assert.strictEqual(s.camera.zoom, 2, 'room-fit zoom 2');
  assert.strictEqual(s.camera.cx, 8, 'centered on map');
  assert.strictEqual(s.camera.cy, 8, 'centered on map');

  // Manual zoom persists across a tick (was reverted before the fix).
  s.handleZoom(1);
  assert.strictEqual(s.camera.zoom, 3);
  s.update(16, 2048, 1200);
  assert.strictEqual(s.camera.zoom, 3, 'manual zoom persists after tick');

  // Manual pan persists across a tick.
  s.handlePan(200, 0);
  const panCx = s.camera.cx;
  const panCy = s.camera.cy;
  assert.ok(Math.abs(panCx - 8) > 1e-9 || Math.abs(panCy - 8) > 1e-9, 'pan moved focus');
  s.update(16, 2048, 1200);
  assert.strictEqual(s.camera.cx, panCx, 'manual pan cx persists after tick');
  assert.strictEqual(s.camera.cy, panCy, 'manual pan cy persists after tick');

  // resetCamera() re-engages auto-framing (the explicit reset).
  s.resetCamera();
  assert.strictEqual(s.camera.zoom, 2, 'reset restores room-fit zoom');
  assert.strictEqual(s.camera.cx, 8, 'reset recenters cx');
  assert.strictEqual(s.camera.cy, 8, 'reset recenters cy');
}

// --- autoFrame mobile: hero-follow until the user takes over (t_97a0c254) ---
{
  // 16x16 room does not fit a phone viewport -> hero-follow at zoom 1.
  const s = createScene({ tilemap, width: 390, height: 844, autoFrame: true });
  assert.strictEqual(s.camera.zoom, 1, 'follow mode zoom 1');
  const p0 = entityPos(s.player);
  assert.strictEqual(s.camera.cx, p0.fi, 'camera tracks hero');
  assert.strictEqual(s.camera.cy, p0.fj, 'camera tracks hero');

  // Hero moves -> camera follows each tick.
  s.handleKey('w');
  s.update(180, 390, 844);
  const p1 = entityPos(s.player);
  assert.notStrictEqual(p1.fi, p0.fi, 'hero moved');
  assert.strictEqual(s.camera.cx, p1.fi, 'camera follows hero after move');

  // Manual pan stops the follow (user took over) and persists.
  s.handlePan(50, 0);
  const mCx = s.camera.cx;
  const mCy = s.camera.cy;
  s.update(16, 390, 844);
  assert.strictEqual(s.camera.cx, mCx, 'manual pan stops hero-follow (cx)');
  assert.strictEqual(s.camera.cy, mCy, 'manual pan stops hero-follow (cy)');

  // resetCamera() resumes hero-follow.
  s.resetCamera();
  const p2 = entityPos(s.player);
  assert.strictEqual(s.camera.cx, p2.fi, 'reset resumes hero-follow');
}

console.log('scene.js: all tests passed (save restore, WASD map, queue, blocked, click A*, zoom, pan, autoFrame manual gating)');
