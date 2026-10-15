// label.js — world-anchored name/HP label geometry for entities (HIRES v2).
//
// Spec: hud_spec.md (t_26276a38, ISO HUD SPEC) + label_spec_v2.md (t_4821d1e9,
// Hero v3 re-placement for the 80-96px hero). Pure, Node + browser compatible.
//
// Anchor: sprite TOP vertex. v2 feet anchor = (sx, sy+32); vertex = feet - h.
// Label box (58x36 desktop / 68x36 mobile) sits 4px above the vertex,
// centered on sx, then clamped into the safe area AND pushed clear of any
// fixed screen-space HUD zone it would otherwise overlap (zone-aware clamp —
// safe-area-only clamping lets a corner-standing entity's label land
// directly on a HUD panel; see label_spec_v2.md "spec gap" section).

export const LABEL_H = 36;
export const LABEL_GAP = 4; // sprite top vertex -> label bottom
export const LABEL_W_DESK = 58;
export const LABEL_W_MOB = 68;
export const ANCHOR_DY = 32; // HIRES v2 feet-anchor offset vs sy (ELEV_PX)

// Conservative sprite height used for vertex placement: the HIRES v2 hero
// is 80-96px tall inside its 128px canvas; using the MAX (96) keeps the
// label clear of the sprite at every actual height (shorter sprites just
// get extra headroom — never less).
export const HERO_H_MAX = 96;

// Mobile legibility floor viewport width (390x844). At/under this, use the
// mobile label width + mobile safe-area insets.
export const MOBILE_MAX_W = 480;

export function isMobileViewport(vw) {
  return vw <= MOBILE_MAX_W;
}

// Safe-area rect in screen px (ISO UI SPEC v1 #4 / hud_spec.md "Safe areas").
export function safeArea(vw, vh, mobile) {
  const side = 16;
  const topBottom = mobile ? 24 : 16;
  return { left: side, top: topBottom, right: vw - side, bottom: vh - topBottom };
}

// Fixed screen-space HUD zone rects (tl-panel, tr-minimap, tr-pause,
// tr-settings, bl-slot1..5, br-prompt), generalized by the same
// right/bottom-anchored formulas that reproduce hud_spec.md's exact numbers
// at 1280x720 (desktop) and 390x844 (mobile). The live HUD isn't rendered
// yet (HUD Assistant track); these rects exist so world labels never land
// on it once it ships. mobile br-prompt is stacked above the action bar per
// hud_spec.md's mobile stacking decision.
export function hudZones(vw, vh, mobile) {
  const safe = safeArea(vw, vh, mobile);
  const tlW = mobile ? 156 : 240;
  const tlH = mobile ? 102 : 90;
  const blY = safe.bottom - 48;
  const promptW = 240;
  const promptH = 30;
  const zones = [
    ['tl-panel', safe.left, safe.top, tlW, tlH],
    ['tr-minimap', safe.right - 40 - 8 - 96, safe.top, 96, 96],
    ['tr-pause', safe.right - 40, safe.top, 40, 40],
    ['tr-settings', safe.right - 40, safe.top + 48, 40, 40],
    ['bl-slot1', safe.left, blY, 48, 48],
    ['bl-slot2', safe.left + 56, blY, 48, 48],
    ['bl-slot3', safe.left + 112, blY, 48, 48],
    ['bl-slot4', safe.left + 168, blY, 48, 48],
    ['bl-slot5', safe.left + 224, blY, 48, 48],
  ];
  zones.push(
    mobile
      ? ['br-prompt', safe.right - promptW, blY - 8 - promptH, promptW, promptH]
      : ['br-prompt', safe.right - promptW, safe.bottom - promptH, promptW, promptH],
  );
  return zones;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function overlappingZones(box, zones) {
  return zones.filter((z) => rectsOverlap(box, { x: z[1], y: z[2], w: z[3], h: z[4] }));
}

// Push `box` clear of EVERY zone it currently overlaps in one shot. Two
// adjacent HUD zones sharing a row/column (e.g. mobile tl-panel's right edge
// sits only 58px from tr-minimap's left edge — less than the 68px mobile
// label width) make a naive "push past the one zone you're touching" clamp
// ping-pong between them forever. Instead, compute candidates against the
// UNION of every zone whose x/y-range the box currently spans (not just the
// zones it literally overlaps right now), so a single push clears the whole
// row/column band at once.
function pushClearOfZones(box, zones, allZones, safe, vh) {
  const xLo = box.x, xHi = box.x + box.w;
  const yLo = box.y, yHi = box.y + box.h;
  const colBand = allZones.filter((z) => z[1] < xHi && z[1] + z[3] > xLo);
  const rowBand = allZones.filter((z) => z[2] < yHi && z[2] + z[4] > yLo);
  const bandBottom = colBand.length ? Math.max(...colBand.map((z) => z[2] + z[4])) : box.y;
  const bandTop = colBand.length ? Math.min(...colBand.map((z) => z[2])) : box.y;
  const bandRight = rowBand.length ? Math.max(...rowBand.map((z) => z[1] + z[3])) : box.x;
  const bandLeft = rowBand.length ? Math.min(...rowBand.map((z) => z[1])) : box.x;
  // Global fallback band: hud_spec.md's layout is top band + bottom band
  // with a declared clear middle ("center 60% clear zone"). When the local
  // row/column band push can't fit (the whole top-left corner is HUD, e.g.
  // an entity sitting exactly at the safe-area corner), drop straight into
  // that clear middle instead of oscillating along the edge.
  const mid = vh / 2;
  const topZones = allZones.filter((z) => z[2] < mid);
  const bottomZones = allZones.filter((z) => z[2] >= mid);
  const belowTopBand = topZones.length ? Math.max(...topZones.map((z) => z[2] + z[4])) + 2 : null;
  const aboveBottomBand = bottomZones.length ? Math.min(...bottomZones.map((z) => z[2])) - box.h - 2 : null;
  const candidates = [
    [box.x, bandBottom + 2], // below every zone in this column band
    [box.x, bandTop - box.h - 2], // above every zone in this column band
    [bandRight + 2, box.y], // right of every zone in this row band
    [bandLeft - box.w - 2, box.y], // left of every zone in this row band
  ];
  if (belowTopBand != null) candidates.push([box.x, belowTopBand]);
  if (aboveBottomBand != null) candidates.push([box.x, aboveBottomBand]);
  const inSafe = (px, py) => px >= safe.left && px <= safe.right - box.w && py >= safe.top && py <= safe.bottom - box.h;
  const clearOfAll = (px, py) => overlappingZones({ x: px, y: py, w: box.w, h: box.h }, allZones).length === 0;
  let best = null;
  for (const [px, py] of candidates) {
    if (!inSafe(px, py) || !clearOfAll(px, py)) continue;
    const disp = Math.abs(px - box.x) + Math.abs(py - box.y);
    if (!best || disp < best.disp) best = { px, py, disp };
  }
  if (best) return { x: best.px, y: best.py };
  // No band-clearing candidate fits inside the safe area: fall back to the
  // smallest-displacement in-safe candidate, zone overlap or not (a genuine
  // design conflict — HUD zones leave no room for the label anywhere in the
  // safe area — to flag, not silently loop forever on).
  let fallback = null;
  for (const [px, py] of candidates) {
    if (!inSafe(px, py)) continue;
    const disp = Math.abs(px - box.x) + Math.abs(py - box.y);
    if (!fallback || disp < fallback.disp) fallback = { px, py, disp };
  }
  if (fallback) return { x: fallback.px, y: fallback.py };
  return {
    x: Math.min(Math.max(box.x, safe.left), safe.right - box.w),
    y: Math.min(Math.max(box.y, safe.top), safe.bottom - box.h),
  };
}

// Sprite top vertex screen-y given the feet-anchor screen-y (sy) and sprite
// height h (both in screen px at current zoom).
export function vertexY(sy, h) {
  return sy + ANCHOR_DY - h;
}

// Compute the clamped, zone-cleared label box for one entity.
//   sx, sy: feet-anchor screen px (same point drawEntity's `A` uses).
//   h: sprite height in screen px AT CURRENT ZOOM (world height * cam.zoom).
//   vw, vh: viewport px.
// Returns { x, y, w, h, vertexY, clamped } in screen px.
export function labelBox(sx, sy, h, vw, vh) {
  const mobile = isMobileViewport(vw);
  const w = mobile ? LABEL_W_MOB : LABEL_W_DESK;
  const vy = vertexY(sy, h);
  const rawX = sx - w / 2;
  const rawY = vy - LABEL_GAP - LABEL_H;
  const safe = safeArea(vw, vh, mobile);
  let x = Math.min(Math.max(rawX, safe.left), safe.right - w);
  let y = Math.min(Math.max(rawY, safe.top), safe.bottom - LABEL_H);
  let clamped = x !== rawX || y !== rawY;
  const zones = hudZones(vw, vh, mobile);
  const seen = new Set();
  for (let pass = 0; pass <= zones.length + 2; pass++) {
    const hitting = overlappingZones({ x, y, w, h: LABEL_H }, zones);
    if (hitting.length === 0) break;
    const key = `${x},${y}`;
    if (seen.has(key)) break; // cycle guard: stop re-trying an already-seen position
    seen.add(key);
    const p = pushClearOfZones({ x, y, w, h: LABEL_H }, hitting, zones, safe, vh);
    x = p.x;
    y = p.y;
    clamped = true;
  }
  return { x, y, w, h: LABEL_H, vertexY: vy, clamped };
}
