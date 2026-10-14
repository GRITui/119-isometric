// renderer.js — Canvas 2D isometric renderer (painter's algorithm).
// Collects drawables (tiles + props + player), sorts by depthKey ascending
// (ties: ground tiles first, then props, then entities), culls outside the
// viewport, draws back-to-front. imageSmoothingEnabled = false.
//
// Placeholder art (procedural) until real art lands; an atlas manifest
// (data/atlas.json from tools/atlas-import.js: { version, cells: [{ name,
// src, w, h }] }) swaps in PNGs when present.
//
// collectDrawables() is pure (Node-testable); draw() needs a 2D context.

import { gridToWorld, tileCorners, depthKey, TILE_H } from './iso.js';
import { worldToScreen } from './camera.js';
import { entityPos } from './movement.js';

const TYPE_ORDER = { tile: 0, prop: 1, entity: 2 };

// Deterministic per-tile-id color (known ids get tuned hues).
export function tileColor(id) {
  const known = {
    tile_grass_0: 'hsl(95 45% 38%)',
    tile_path_0: 'hsl(35 35% 55%)',
  };
  if (known[id]) return known[id];
  let h = 0;
  for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) >>> 0;
  return `hsl(${h % 360} 45% 40%)`;
}

function shade(hsl, dl) {
  const m = hsl.match(/hsl\((\d+) (\d+)% (\d+)%\)/);
  if (!m) return hsl;
  return `hsl(${m[1]} ${m[2]}% ${Math.max(0, Math.min(100, Number(m[3]) + dl))}%)`;
}

// World pixel point -> screen px (same transform as worldToScreen, but for
// raw world points — tile corners, anchors).
function toScreen(wp, cam, vw, vh) {
  const c = gridToWorld(cam.cx, cam.cy, 0);
  return {
    x: (wp.x - c.x) * cam.zoom + vw / 2,
    y: (wp.y - c.y) * cam.zoom + vh / 2,
  };
}

// Pure: collect + sort + cull drawables for one frame.
//   tile:   { kind, i, j, t, z, depthKey }
//   prop:   { kind, id, asset, i, j, z, footprint, depthKey } (tilemap's key)
//   entity: { kind, i, j, x, y, z, depthKey } (x,y = interpolated top vertex)
// Ascending depthKey; ties broken tile < prop < entity.
export function collectDrawables(tilemap, entity, camera, viewportW, viewportH) {
  const out = [];
  const z = camera.zoom;
  // margin: half a tile diagonal + prop height headroom (v2: 128px sprite
  // canvas), scaled by zoom
  const margin = (TILE_H * z) + 96 * z;

  for (let i = 0; i < tilemap.w; i++) {
    for (let j = 0; j < tilemap.h; j++) {
      const tile = tilemap.tileAt(i, j);
      if (!tile) continue;
      const s = worldToScreen({ i, j, z: 0 }, camera, viewportW, viewportH);
      if (
        s.x + 32 * z < -margin || s.x - 32 * z > viewportW + margin ||
        s.y + TILE_H * z < -margin || s.y > viewportH + margin
      ) continue;
      out.push({ kind: 'tile', i, j, t: tile.t, z: tile.z, depthKey: depthKey(i, j, tile.z) });
    }
  }

  for (const p of tilemap.props) {
    const s = worldToScreen({ i: p.i, j: p.j, z: p.z }, camera, viewportW, viewportH);
    if (s.x < -margin || s.x > viewportW + margin || s.y < -margin || s.y > viewportH + margin) continue;
    out.push({ kind: 'prop', id: p.id, asset: p.asset, i: p.i, j: p.j, z: p.z, footprint: p.footprint, depthKey: p.depthKey });
  }

  if (entity) {
    const pos = entityPos(entity);
    out.push({
      kind: 'entity', i: entity.i, j: entity.j, x: pos.x, y: pos.y, z: entity.z,
      facing: entity.facing ?? 's', state: entity.state, action: entity.action ?? null,
      progress: entity.progress ?? 0,
      depthKey: depthKey(entity.i, entity.j, entity.z),
    });
  }

  out.sort((a, b) => a.depthKey - b.depthKey || TYPE_ORDER[a.kind] - TYPE_ORDER[b.kind]);
  return out;
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
  ctx.closePath();
  ctx.fill();
}

// Look up an atlas tile/sprite cell + its sheet image. Returns null if the
// atlas or the named cell is absent (caller falls back to placeholder).
function atlasCell(atlas, table, name) {
  if (!atlas) return null;
  const cell = atlas[table][name];
  if (!cell) return null;
  const img = atlas.images[cell.sheet];
  if (!img || !img.complete || img.naturalWidth === 0) return null; // not loaded yet
  const sheet = atlas.sheets[cell.sheet];
  return { cell, img, sheet };
}

function drawTile(ctx, d, cam, vw, vh, atlas) {
  const zpx = d.z * TILE_H * cam.zoom;
  const top = toScreen(gridToWorld(d.i, d.j, d.z), cam, vw, vh); // top vertex of top face
  const r = { x: top.x + 32 * cam.zoom, y: top.y + 16 * cam.zoom };
  const b = { x: top.x, y: top.y + TILE_H * cam.zoom };
  const l = { x: top.x - 32 * cam.zoom, y: top.y + 16 * cam.zoom };
  const color = tileColor(d.t);

  const found = atlasCell(atlas, 'tiles', d.t);
  if (found) {
    const { cell, img, sheet } = found;
    const h = cell.h ?? sheet.cellH; // wall tiles are taller than cellH
    const dw = sheet.cellW * cam.zoom;
    const dh = h * cam.zoom;
    // `top` is already the top vertex of this tile's top face at elevation z
    // (gridToWorld raises it by z*ELEV_PX); the full extruded-box sprite
    // (h px tall) is drawn from there straight down to the ground line.
    ctx.drawImage(img, cell.x, cell.y, sheet.cellW, h, l.x, top.y, dw, dh);
    return;
  }

  if (d.z > 0) {
    const gb = { x: b.x, y: b.y + zpx };
    const gl = { x: l.x, y: l.y + zpx };
    const gr = { x: r.x, y: r.y + zpx };
    ctx.fillStyle = shade(color, -14);
    poly(ctx, [l, b, gb, gl]);
    ctx.fillStyle = shade(color, -26);
    poly(ctx, [r, b, gb, gr]);
  }
  ctx.fillStyle = color;
  poly(ctx, [top, r, b, l]);
}

// Feet anchor of a prop/entity in screen px (tile bottom vertex).
function anchorScreen(i, j, z, cam, vw, vh) {
  const a = gridToWorld(i, j, z);
  return toScreen({ x: a.x, y: a.y + TILE_H }, cam, vw, vh);
}

// Procedural placeholder heights (px at zoom 1) per SCENE_01_STUDIO.md (v2).
// fridge/shelf/lamp (+ walls, drawn separately via drawTile) = 2u (64px);
// plant = ~1.5u (48px); everything else = 1u (32px).
const PROP_HEIGHT_PX = {
  spr_fridge_0: 64,
  spr_shelf_0: 64,
  spr_lamp_0: 64,
  spr_plant_0: 48,
};
export function propHeightPx(asset) {
  return PROP_HEIGHT_PX[asset] ?? 32;
}

function drawProp(ctx, d, cam, vw, vh, atlas) {
  const A = anchorScreen(d.i, d.j, d.z, cam, vw, vh);
  const found = atlasCell(atlas, 'sprites', d.asset);
  if (found) {
    const { cell, img } = found;
    const w = cell.w * cam.zoom;
    const h = cell.h * cam.zoom;
    // anchor is always bottom-center per ATLAS_SCHEMA
    ctx.drawImage(img, cell.x, cell.y, cell.w, cell.h, A.x - w / 2, A.y - h, w, h);
    return;
  }
  const s = cam.zoom;
  if (d.asset.startsWith('spr_') && !d.asset.startsWith('spr_tree')) {
    const h = propHeightPx(d.asset) * s;
    const w = (32 + 32 * (Math.max(1, (d.footprint ?? [1]).length) - 1)) * s;
    let h0 = 0;
    for (let k = 0; k < d.asset.length; k++) h0 = (h0 * 31 + d.asset.charCodeAt(k)) >>> 0;
    ctx.fillStyle = `hsl(${h0 % 360} 35% 45%)`;
    ctx.fillRect(A.x - w / 2, A.y - h, w, h);
    ctx.fillStyle = `hsl(${h0 % 360} 35% 32%)`;
    ctx.fillRect(A.x - w / 2, A.y - h, w, 6 * s);
    return;
  }
  if (d.asset.startsWith('spr_tree')) {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(A.x - 4 * s, A.y - 20 * s, 8 * s, 20 * s);
    ctx.fillStyle = '#3e7d32';
    ctx.beginPath();
    ctx.moveTo(A.x, A.y - 64 * s);
    ctx.lineTo(A.x + 20 * s, A.y - 20 * s);
    ctx.lineTo(A.x - 20 * s, A.y - 20 * s);
    ctx.closePath();
    ctx.fill();
  } else if (d.asset.startsWith('wall_')) {
    // 32px-tall (1 elevation unit) extruded box, tile-sized top face
    const zpx = TILE_H * s;
    const t = { x: A.x, y: A.y - TILE_H * s - zpx }; // top vertex of box top face (ground top vertex raised by z=1)
    const tr = { x: t.x + 32 * s, y: t.y + 16 * s };
    const tb = { x: t.x, y: t.y + TILE_H * s };
    const tl = { x: t.x - 32 * s, y: t.y + 16 * s };
    ctx.fillStyle = shade('#8a6a42', -14);
    poly(ctx, [tl, tb, { x: tb.x, y: tb.y + zpx }, { x: tl.x, y: tl.y + zpx }]);
    ctx.fillStyle = shade('#8a6a42', -26);
    poly(ctx, [tr, tb, { x: tb.x, y: tb.y + zpx }, { x: tr.x, y: tr.y + zpx }]);
    ctx.fillStyle = '#8a6a42';
    poly(ctx, [t, tr, tb, tl]);
  } else {
    ctx.fillStyle = '#777';
    ctx.fillRect(A.x - 16 * s, A.y - 32 * s, 32 * s, 32 * s);
  }
}

// Pick the hero animation frame index for an entity drawable at this instant.
// walk: driven by step progress (deterministic, matches footstep cadence).
// idle/interact: driven by wall-clock time (2-frame cycle, ~400ms/frame).
export function heroFrame(anim, animName, progress) {
  const frames = anim[animName] ?? anim.idle;
  if (animName === 'walk') {
    const idx = Math.floor(progress * frames.length) % frames.length;
    return frames[idx];
  }
  const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return frames[Math.floor(t / 400) % frames.length];
}

function drawEntity(ctx, d, cam, vw, vh, atlas) {
  const A = toScreen({ x: d.x, y: d.y + TILE_H }, cam, vw, vh); // feet
  const s = cam.zoom;
  if (atlas && atlas.animations && atlas.animations.hero) {
    const dirAnim = atlas.animations.hero[d.facing.toUpperCase()];
    if (dirAnim) {
      const animName = d.action === 'interact' ? 'interact' : (d.state === 'moving' ? 'walk' : 'idle');
      const frame = heroFrame(dirAnim, animName, d.progress);
      const sheetIdx = atlas.heroSheet;
      const img = atlas.images[sheetIdx];
      const sheet = atlas.sheets[sheetIdx];
      if (img && img.complete && img.naturalWidth > 0) {
        const col = frame % sheet.cols;
        const row = Math.floor(frame / sheet.cols);
        const w = sheet.cellW * s;
        const h = sheet.cellH * s;
        ctx.drawImage(
          img, col * sheet.cellW, row * sheet.cellH, sheet.cellW, sheet.cellH,
          A.x - w / 2, A.y - h, w, h,
        );
        return;
      }
    }
  }
  ctx.fillStyle = '#3b6fd4'; // body
  ctx.fillRect(A.x - 10 * s, A.y - 28 * s, 20 * s, 24 * s);
  ctx.fillStyle = '#e8c39e'; // head
  ctx.fillRect(A.x - 8 * s, A.y - 44 * s, 16 * s, 16 * s);
}

// Screen-space AABB a drawable occupies (used for occlusion testing only;
// matches the boxes drawProp/drawEntity actually paint. When an atlas cell
// is loaded for this drawable, read its real w/h — same source
// drawProp()/drawEntity() use — instead of the placeholder box, since the
// placeholder math is far smaller than the real atlas sprite footprint.
function screenBox(d, cam, vw, vh, atlas = null) {
  const s = cam.zoom;
  if (d.kind === 'entity') {
    const A = toScreen({ x: d.x, y: d.y + TILE_H }, cam, vw, vh);
    if (atlas && atlas.heroSheet != null) {
      const sheet = atlas.sheets[atlas.heroSheet];
      if (sheet) {
        const w = sheet.cellW * s;
        const h = sheet.cellH * s;
        return { x0: A.x - w / 2, x1: A.x + w / 2, y0: A.y - h, y1: A.y };
      }
    }
    return { x0: A.x - 10 * s, x1: A.x + 10 * s, y0: A.y - 44 * s, y1: A.y };
  }
  // prop
  const A = anchorScreen(d.i, d.j, d.z, cam, vw, vh);
  const found = atlasCell(atlas, 'sprites', d.asset);
  if (found) {
    const w = found.cell.w * s;
    const h = found.cell.h * s;
    return { x0: A.x - w / 2, x1: A.x + w / 2, y0: A.y - h, y1: A.y };
  }
  if (d.asset.startsWith('spr_') && !d.asset.startsWith('spr_tree')) {
    const h = propHeightPx(d.asset) * s;
    const w = (32 + 32 * (Math.max(1, (d.footprint ?? [1]).length) - 1)) * s;
    return { x0: A.x - w / 2, x1: A.x + w / 2, y0: A.y - h, y1: A.y };
  }
  if (d.asset.startsWith('spr_tree')) return { x0: A.x - 20 * s, x1: A.x + 20 * s, y0: A.y - 64 * s, y1: A.y };
  if (d.asset.startsWith('wall_')) {
    const zpx = TILE_H * s;
    return { x0: A.x - 32 * s, x1: A.x + 32 * s, y0: A.y - TILE_H * s - zpx, y1: A.y };
  }
  return { x0: A.x - 16 * s, x1: A.x + 16 * s, y0: A.y - 32 * s, y1: A.y };
}

function boxesOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

// F-01 occlusion cue: true when any prop drawn after (on top of) the entity
// this frame screen-overlaps it and is tall enough (propHeightPx > 0, or has
// a loaded atlas sprite cell) to visually cover it. Pure (Node-testable) —
// used by draw() and by tests. `atlas` is optional so existing placeholder-art
// callers/tests keep working unchanged.
export function isEntityOccluded(drawables, cam, vw, vh, atlas = null) {
  const entity = drawables.find((d) => d.kind === 'entity');
  if (!entity) return false;
  const ebox = screenBox(entity, cam, vw, vh, atlas);
  for (const d of drawables) {
    if (d.kind !== 'prop') continue;
    if (d.depthKey <= entity.depthKey) continue; // drawn before the player, can't cover it
    const hasAtlasCell = !!atlasCell(atlas, 'sprites', d.asset);
    if (!hasAtlasCell && propHeightPx(d.asset) <= 0) continue;
    if (boxesOverlap(ebox, screenBox(d, cam, vw, vh, atlas))) return true;
  }
  return false;
}

// Draw a translucent outline silhouette for the entity, on top of whatever
// occluded it, so the player stays visually locatable (fix option (b)).
function drawOcclusionCue(ctx, entity, cam, vw, vh) {
  const A = toScreen({ x: entity.x, y: entity.y + TILE_H }, cam, vw, vh); // feet
  const s = cam.zoom;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.strokeRect(A.x - 10 * s, A.y - 44 * s, 20 * s, 44 * s);
  ctx.fillStyle = '#3b6fd4';
  ctx.globalAlpha = 0.35;
  ctx.fillRect(A.x - 10 * s, A.y - 28 * s, 20 * s, 24 * s);
  ctx.fillStyle = '#e8c39e';
  ctx.fillRect(A.x - 8 * s, A.y - 44 * s, 16 * s, 16 * s);
  ctx.restore();
}

// Draw a sorted drawable list onto a 2D context.
export function draw(ctx, drawables, cam, vw, vh, atlas = null) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, vw, vh);
  for (const d of drawables) {
    if (d.kind === 'tile') drawTile(ctx, d, cam, vw, vh, atlas);
    else if (d.kind === 'prop') drawProp(ctx, d, cam, vw, vh, atlas);
    else drawEntity(ctx, d, cam, vw, vh, atlas);
  }
  if (isEntityOccluded(drawables, cam, vw, vh, atlas)) {
    const entity = drawables.find((d) => d.kind === 'entity');
    drawOcclusionCue(ctx, entity, cam, vw, vh);
  }
}

// Browser: wrap a canvas. renderer.draw({ camera, entity, width, height }).
export function createRenderer(canvas, tilemap) {
  const ctx = canvas.getContext('2d');
  let atlas = null;
  return {
    setAtlas(a) { atlas = a; },
    getAtlas() { return atlas; }, // QA/test hook: current atlas (or null)
    draw(state) {
      const vw = state.width ?? canvas.width;
      const vh = state.height ?? canvas.height;
      const d = collectDrawables(tilemap, state.entity, state.camera, vw, vh);
      draw(ctx, d, state.camera, vw, vh, atlas);
    },
  };
}

// Browser: load an atlas manifest (ATLAS_SCHEMA.md: { sheets, tiles, sprites,
// animations }) and its sheet PNGs. Returns null when missing (404) so the
// procedural placeholder keeps rendering.
export async function loadAtlas(manifestUrl) {
  const res = await fetch(manifestUrl);
  if (!res.ok) return null;
  const manifest = await res.json();
  const images = (manifest.sheets ?? []).map((sheet) => {
    const img = new Image();
    img.src = sheet.file;
    return img;
  });
  const heroSheet = (manifest.sheets ?? []).findIndex((s) => /hero\.png$/.test(s.file));
  return {
    version: manifest.version,
    sheets: manifest.sheets ?? [],
    tiles: manifest.tiles ?? {},
    sprites: manifest.sprites ?? {},
    animations: manifest.animations ?? {},
    heroSheet: heroSheet < 0 ? null : heroSheet,
    images,
  };
}
