// label.test.js — world-anchored label geometry: formula, safe-area clamp,
// zone-aware push-clear, zoom invariance. Mirrors label_spec_v2.md
// (t_4821d1e9) verify.py's stress cases for the live labelBox() impl.
import assert from 'node:assert';
import {
  LABEL_H, LABEL_W_DESK, LABEL_W_MOB, ANCHOR_DY, HERO_H_MAX,
  vertexY, safeArea, hudZones, labelBox, isMobileViewport,
} from './label.js';

const DESK = { vw: 1280, vh: 720 };
const MOB = { vw: 390, vh: 844 };

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function assertNoZoneOverlap(box, vw, vh, mobile, label) {
  for (const [name, zx, zy, zw, zh] of hudZones(vw, vh, mobile)) {
    assert.ok(
      !rectsOverlap(box, { x: zx, y: zy, w: zw, h: zh }),
      `${label}: label overlaps HUD zone ${name} (box=${JSON.stringify(box)})`,
    );
  }
}

function assertInSafeArea(box, vw, vh, mobile, label) {
  const safe = safeArea(vw, vh, mobile);
  assert.ok(box.x >= safe.left - 0.001 && box.x + box.w <= safe.right + 0.001, `${label}: x out of safe area`);
  assert.ok(box.y >= safe.top - 0.001 && box.y + box.h <= safe.bottom + 0.001, `${label}: y out of safe area`);
}

// --- formula: vertex_y = sy + ANCHOR_DY - h ---
assert.strictEqual(vertexY(400, 80), 400 + 32 - 80);
assert.strictEqual(vertexY(400, 96), 400 + 32 - 96);
assert.strictEqual(ANCHOR_DY, 32);
assert.strictEqual(HERO_H_MAX, 96);

// --- mobile breakpoint ---
assert.strictEqual(isMobileViewport(390), true);
assert.strictEqual(isMobileViewport(1280), false);

// --- mid-screen: no clamp, exact offset vs vertex is -40px (4px gap + 36px) ---
{
  const box = labelBox(560, 420, 80, DESK.vw, DESK.vh);
  const vy = vertexY(420, 80);
  assert.strictEqual(box.vertexY, vy);
  assert.strictEqual(box.y, vy - 4 - LABEL_H); // unclamped raw offset
  assert.strictEqual(box.w, LABEL_W_DESK);
  assert.strictEqual(box.h, LABEL_H);
  assert.strictEqual(box.clamped, false);
  assertInSafeArea(box, DESK.vw, DESK.vh, false, 'desktop mid-screen h=80');
  assertNoZoneOverlap(box, DESK.vw, DESK.vh, false, 'desktop mid-screen h=80');
}

// --- desktop corner-stress: TL and BR corners, both hero height extremes ---
const deskCases = [
  [40, 50, 96, 'TL corner h=96'],
  [1250, 680, 80, 'BR corner h=80'],
  [16, 16, 80, 'extreme TL edge h=80'],
  [1264, 704, 96, 'extreme BR edge h=96'],
];
for (const [sx, sy, h, label] of deskCases) {
  const box = labelBox(sx, sy, h, DESK.vw, DESK.vh);
  assertInSafeArea(box, DESK.vw, DESK.vh, false, label);
  assertNoZoneOverlap(box, DESK.vw, DESK.vh, false, label);
}

// --- mobile corner-stress ---
const mobCases = [
  [30, 60, 96, 'mobile TL corner h=96'],
  [365, 800, 80, 'mobile BR corner h=80'],
  [16, 24, 80, 'mobile extreme TL edge'],
  [374, 820, 96, 'mobile extreme BR edge'],
];
for (const [sx, sy, h, label] of mobCases) {
  const box = labelBox(sx, sy, h, MOB.vw, MOB.vh);
  assert.strictEqual(box.w, LABEL_W_MOB);
  assertInSafeArea(box, MOB.vw, MOB.vh, true, label);
  assertNoZoneOverlap(box, MOB.vw, MOB.vh, true, label);
}

// --- zoom range 0.5x-2.0x: label box stays fixed screen-px size; only the
// anchor (sx, sy, h) moves. Exercise a corner-stress anchor at each zoom. ---
for (const zoom of [0.5, 1.0, 2.0]) {
  // world point (60,80,h=96) projected through camera zoom around a center;
  // same approach as gen_wireframes.py gen_zoom().
  const cx = 210, cy = 230; // 1x center
  const sx = cx + (60 - cx) * zoom;
  const sy = cy + (80 - cy) * zoom;
  const h = 96 * zoom;
  const box = labelBox(sx, sy, h, DESK.vw, DESK.vh);
  assert.strictEqual(box.w, LABEL_W_DESK, `zoom ${zoom}: label w must stay fixed screen-px size`);
  assert.strictEqual(box.h, LABEL_H, `zoom ${zoom}: label h must stay fixed screen-px size`);
  assertInSafeArea(box, DESK.vw, DESK.vh, false, `zoom ${zoom}`);
  assertNoZoneOverlap(box, DESK.vw, DESK.vh, false, `zoom ${zoom}`);
}

// --- dense grid sweep: no overlap anywhere in-bounds, both resolutions, both
// height extremes (exhaustive stress beyond the spec's 4 hand-picked cases) ---
for (const [vw, vh, mobile] of [[1280, 720, false], [390, 844, true]]) {
  for (let sx = 0; sx <= vw; sx += 40) {
    for (let sy = 0; sy <= vh; sy += 40) {
      for (const h of [80, 96]) {
        const box = labelBox(sx, sy, h, vw, vh);
        assertInSafeArea(box, vw, vh, mobile, `sweep (${sx},${sy},h=${h}) vw=${vw}`);
        assertNoZoneOverlap(box, vw, vh, mobile, `sweep (${sx},${sy},h=${h}) vw=${vw}`);
      }
    }
  }
}

console.log('label.test.js: all assertions passed');
