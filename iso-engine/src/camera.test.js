import {
  createCamera, clampZoom, clampFocus, worldToScreen, screenToGrid, panByScreen,
  ZOOM_MIN, ZOOM_MAX, roomPixelSize, roomFits, fitZoom,
} from './camera.js';
import { gridToWorld, TILE_W, ELEV_PX } from './iso.js';
import assert from 'node:assert';

const VW = 800;
const VH = 600;
const MAP_W = 16;
const MAP_H = 16;

// --- focus point maps to viewport center ---
const cam = createCamera(8, 8); // default zoom 2
assert.strictEqual(cam.zoom, 2);
const c = worldToScreen({ i: 8, j: 8, z: 0 }, cam, VW, VH);
assert.strictEqual(c.x, VW / 2);
assert.strictEqual(c.y, VH / 2);

// --- zoom clamped to 1..3 (HIRES_V2) ---
assert.strictEqual(clampZoom(0.4), 1);
assert.strictEqual(clampZoom(9), 3);
assert.strictEqual(clampZoom(2.6), 3); // integer zoom
assert.strictEqual(createCamera(0, 0, 99).zoom, ZOOM_MAX);
assert.strictEqual(createCamera(0, 0, 0.1).zoom, ZOOM_MIN);

// --- round-trip screen<->grid at zoom 1, 2, 3 (z=0) ---
for (const zoom of [1, 2, 3]) {
  const camZ = createCamera(8, 8, zoom);
  for (const [i, j] of [[0, 0], [3.5, 7.25], [15, 15], [7.5, 2.5]]) {
    const s = worldToScreen({ i, j, z: 0 }, camZ, VW, VH);
    const g = screenToGrid(s.x, s.y, camZ, VW, VH);
    assert.ok(Math.abs(g.i - i) < 1e-9, `roundtrip i @zoom${zoom} (${i},${j})`);
    assert.ok(Math.abs(g.j - j) < 1e-9, `roundtrip j @zoom${zoom} (${i},${j})`);
  }
}

// --- elevation: a z=1 point sits ELEV_PX*zoom px above its z=0 ground point ---
const g0 = worldToScreen({ i: 2, j: 2, z: 0 }, cam, VW, VH);
const g1 = worldToScreen({ i: 2, j: 2, z: 1 }, cam, VW, VH);
assert.strictEqual(g1.y, g0.y - ELEV_PX * 2); // ELEV_PX * zoom
assert.strictEqual(g1.x, g0.x);

// --- pan invariant: dragging by (dx, dy) moves every world point by (dx, dy) ---
for (const [dx, dy] of [[37, -12], [-200, 40], [10, 10]]) {
  const cam2 = panByScreen(dx, dy, cam, cam.zoom, MAP_W, MAP_H);
  for (const [i, j] of [[0, 0], [8, 8], [15, 15]]) {
    const before = worldToScreen({ i, j, z: 0 }, cam, VW, VH);
    const after = worldToScreen({ i, j, z: 0 }, cam2, VW, VH);
    assert.ok(Math.abs(after.x - (before.x + dx)) < 1e-9, `pan x ${i},${j}`);
    assert.ok(Math.abs(after.y - (before.y + dy)) < 1e-9, `pan y ${i},${j}`);
  }
}

// --- pan round-trip: pan by (dx,dy) then (-dx,-dy) restores the focus ---
const back = panByScreen(-37, 12, panByScreen(37, -12, cam, cam.zoom, MAP_W, MAP_H), cam.zoom, MAP_W, MAP_H);
assert.ok(Math.abs(back.cx - cam.cx) < 1e-9);
assert.ok(Math.abs(back.cy - cam.cy) < 1e-9);

// --- clamp: focus stays inside the map (0..w, 0..h) ---
const farR = panByScreen(100000, 0, cam, cam.zoom, MAP_W, MAP_H);
assert.strictEqual(farR.cx, 0); // dragged map right -> focus hits left edge
const farL = panByScreen(-100000, 0, cam, cam.zoom, MAP_W, MAP_H);
assert.strictEqual(farL.cx, MAP_W);
const farD = panByScreen(0, 100000, cam, cam.zoom, MAP_W, MAP_H);
assert.strictEqual(farD.cx, 0);
assert.strictEqual(farD.cy, 0);
const farU = panByScreen(0, -100000, cam, cam.zoom, MAP_W, MAP_H);
assert.strictEqual(farU.cx, MAP_W);
assert.strictEqual(farU.cy, MAP_H);

// --- clampFocus is a no-op inside the map, clamps outside ---
assert.deepStrictEqual(clampFocus({ cx: 4, cy: 5, zoom: 2 }, 16, 16), { cx: 4, cy: 5, zoom: 2 });
assert.deepStrictEqual(clampFocus({ cx: -3, cy: 99, zoom: 2 }, 16, 16), { cx: 0, cy: 16, zoom: 2 });

// --- pan direction sanity: drag down -> map moves down, focus goes up-left ---
const down = panByScreen(0, 100, cam, cam.zoom, MAP_W, MAP_H);
assert.ok(down.cx < cam.cx && down.cy < cam.cy);

// gridToWorld still agrees with the camera world-space (no drift)
assert.strictEqual(gridToWorld(8, 8, 0).x, (8 - 8) * (TILE_W / 2));

// --- room framing helpers (HIRES_V2: mobile follow / desktop fit) ---
// 10x8 room incl. 2u back walls = 576x352 (spec HIRES_V2.md worked example)
{
  const room = roomPixelSize(10, 8);
  assert.strictEqual(room.w, 576);
  assert.strictEqual(room.h, 352);
  assert.ok(roomFits(room.w, room.h, 1280, 720), 'room fits 1280x720');
  assert.strictEqual(fitZoom(room.w, room.h, 1280, 720), 2, '1280x720 fits at zoom 2 (1152x704)');
  assert.ok(!roomFits(room.w, room.h, 390, 844), 'room does not fit 390x844 at zoom 1');
}

console.log('camera.js: all tests passed (transform, round-trip, pan invariant, clamp, zoom, framing)');
