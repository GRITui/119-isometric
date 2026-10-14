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
  // margin: half a tile diagonal + prop height headroom, scaled by zoom
  const margin = (TILE_H * z) + 48 * z;

  for (let i = 0; i < tilemap.w; i++) {
    for (let j = 0; j < tilemap.h; j++) {
      const tile = tilemap.tileAt(i, j);
      if (!tile) continue;
      const s = worldToScreen({ i, j, z: 0 }, camera, viewportW, viewportH);
      if (
        s.x + 16 * z < -margin || s.x - 16 * z > viewportW + margin ||
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

function drawTile(ctx, d, cam, vw, vh, atlas) {
  const zpx = d.z * TILE_H * cam.zoom;
  const top = toScreen(gridToWorld(d.i, d.j, d.z), cam, vw, vh); // top vertex of top face
  const r = { x: top.x + 16 * cam.zoom, y: top.y + 8 * cam.zoom };
  const b = { x: top.x, y: top.y + TILE_H * cam.zoom };
  const l = { x: top.x - 16 * cam.zoom, y: top.y + 8 * cam.zoom };
  const color = tileColor(d.t);

  if (d.z > 0) {
    const gb = { x: b.x, y: b.y + zpx };
    const gl = { x: l.x, y: l.y + zpx };
    const gr = { x: r.x, y: r.y + zpx };
    ctx.fillStyle = shade(color, -14);
    poly(ctx, [l, b, gb, gl]);
    ctx.fillStyle = shade(color, -26);
    poly(ctx, [r, b, gb, gr]);
  }
  if (atlas && atlas.cells[d.t]) {
    const cell = atlas.cells[d.t];
    ctx.drawImage(cell.img, l.x, top.y, 32 * cam.zoom, TILE_H * cam.zoom);
  } else {
    ctx.fillStyle = color;
    poly(ctx, [top, r, b, l]);
  }
}

// Feet anchor of a prop/entity in screen px (tile bottom vertex).
function anchorScreen(i, j, z, cam, vw, vh) {
  const a = gridToWorld(i, j, z);
  return toScreen({ x: a.x, y: a.y + TILE_H }, cam, vw, vh);
}

function drawProp(ctx, d, cam, vw, vh, atlas) {
  const A = anchorScreen(d.i, d.j, d.z, cam, vw, vh);
  if (atlas && atlas.cells[d.asset]) {
    const cell = atlas.cells[d.asset];
    ctx.drawImage(cell.img, A.x - (cell.w * cam.zoom) / 2, A.y - cell.h * cam.zoom, cell.w * cam.zoom, cell.h * cam.zoom);
    return;
  }
  const s = cam.zoom;
  if (d.asset.startsWith('spr_tree')) {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(A.x - 2 * s, A.y - 10 * s, 4 * s, 10 * s);
    ctx.fillStyle = '#3e7d32';
    ctx.beginPath();
    ctx.moveTo(A.x, A.y - 32 * s);
    ctx.lineTo(A.x + 10 * s, A.y - 10 * s);
    ctx.lineTo(A.x - 10 * s, A.y - 10 * s);
    ctx.closePath();
    ctx.fill();
  } else if (d.asset.startsWith('wall_')) {
    // 16px-tall (1 elevation unit) extruded box, tile-sized top face
    const zpx = TILE_H * s;
    const t = { x: A.x, y: A.y - TILE_H * s - zpx }; // top vertex of box top face (ground top vertex raised by z=1)
    const tr = { x: t.x + 16 * s, y: t.y + 8 * s };
    const tb = { x: t.x, y: t.y + TILE_H * s };
    const tl = { x: t.x - 16 * s, y: t.y + 8 * s };
    ctx.fillStyle = shade('#8a6a42', -14);
    poly(ctx, [tl, tb, { x: tb.x, y: tb.y + zpx }, { x: tl.x, y: tl.y + zpx }]);
    ctx.fillStyle = shade('#8a6a42', -26);
    poly(ctx, [tr, tb, { x: tb.x, y: tb.y + zpx }, { x: tr.x, y: tr.y + zpx }]);
    ctx.fillStyle = '#8a6a42';
    poly(ctx, [t, tr, tb, tl]);
  } else {
    ctx.fillStyle = '#777';
    ctx.fillRect(A.x - 8 * s, A.y - 16 * s, 16 * s, 16 * s);
  }
}

function drawEntity(ctx, d, cam, vw, vh, atlas) {
  const A = toScreen({ x: d.x, y: d.y + TILE_H }, cam, vw, vh); // feet
  const s = cam.zoom;
  if (atlas && atlas.cells['spr_player_0']) {
    const cell = atlas.cells['spr_player_0'];
    ctx.drawImage(cell.img, A.x - (cell.w * s) / 2, A.y - cell.h * s, cell.w * s, cell.h * s);
    return;
  }
  ctx.fillStyle = '#3b6fd4'; // body
  ctx.fillRect(A.x - 5 * s, A.y - 14 * s, 10 * s, 12 * s);
  ctx.fillStyle = '#e8c39e'; // head
  ctx.fillRect(A.x - 4 * s, A.y - 22 * s, 8 * s, 8 * s);
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
}

// Browser: wrap a canvas. renderer.draw({ camera, entity, width, height }).
export function createRenderer(canvas, tilemap) {
  const ctx = canvas.getContext('2d');
  let atlas = null;
  return {
    setAtlas(a) { atlas = a; },
    draw(state) {
      const vw = state.width ?? canvas.width;
      const vh = state.height ?? canvas.height;
      const d = collectDrawables(tilemap, state.entity, state.camera, vw, vh);
      draw(ctx, d, state.camera, vw, vh, atlas);
    },
  };
}

// Browser: load an atlas manifest ({ version, cells: [{ name, src, w, h }] })
// and its PNGs. Returns null when the manifest is missing (404) so the
// procedural placeholder keeps rendering.
export async function loadAtlas(manifestUrl) {
  const res = await fetch(manifestUrl);
  if (!res.ok) return null;
  const manifest = await res.json();
  const cells = {};
  for (const c of manifest.cells ?? []) {
    const img = new Image();
    img.src = c.src;
    cells[c.name] = { img, w: c.w, h: c.h };
  }
  return { version: manifest.version, cells };
}
