// camera.js — isometric camera: grid-space focus (cx, cy) + integer zoom.
// GRID_SPEC v2: screen = (worldPx(p) - worldPx(cam)) * zoom + viewportCenter.
// All projection math comes from iso.js — never re-derived here.
// Pure functions, Node + browser compatible.

import { gridToWorld, worldToGrid, TILE_W, TILE_H, ELEV_PX } from './iso.js';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3; // HIRES_V2: int zoom 1..3
export const ZOOM_DEFAULT = 2;

// Integer zoom, clamped to [ZOOM_MIN, ZOOM_MAX].
export function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z)));
}

// cam = { cx, cy, zoom } — focus in grid space (floats ok).
export function createCamera(cx, cy, zoom = ZOOM_DEFAULT) {
  return { cx, cy, zoom: clampZoom(zoom) };
}

// Clamp focus so the map (0..w, 0..h) stays in view.
export function clampFocus(cam, w, h) {
  return {
    ...cam,
    cx: Math.min(w, Math.max(0, cam.cx)),
    cy: Math.min(h, Math.max(0, cam.cy)),
  };
}

// World-pixel position of the camera focus (ground plane, z=0).
function camWorldPx(cam) {
  return gridToWorld(cam.cx, cam.cy, 0);
}

// p = { i, j, z } (grid space, floats ok) -> screen px.
//   screen = (worldPx(p) - worldPx(cam)) * zoom + viewportCenter
export function worldToScreen(p, cam, viewportW, viewportH) {
  const w = gridToWorld(p.i, p.j, p.z ?? 0);
  const c = camWorldPx(cam);
  return {
    x: (w.x - c.x) * cam.zoom + viewportW / 2,
    y: (w.y - c.y) * cam.zoom + viewportH / 2,
  };
}

// Screen px -> fractional grid coords (z=0 ground plane). Inverse of
// worldToScreen for z=0 points; floor the result to pick a tile.
export function screenToGrid(x, y, cam, viewportW, viewportH) {
  const c = camWorldPx(cam);
  const wx = (x - viewportW / 2) / cam.zoom + c.x;
  const wy = (y - viewportH / 2) / cam.zoom + c.y;
  return worldToGrid(wx, wy);
}

// Drag by (dx, dy) screen px -> new camera focus.
// Invariant: every world point moves exactly (dx, dy) on screen.
//   Δcx = -dx/(TILE_W·zoom) - dy/(TILE_H·zoom)
//   Δcy =  dx/(TILE_W·zoom) - dy/(TILE_H·zoom)
// Result is clamped to the map (0..w, 0..h).
export function panByScreen(dx, dy, cam, zoom, w, h) {
  const z = zoom ?? cam.zoom;
  const cx = cam.cx - dx / (TILE_W * z) - dy / (TILE_H * z);
  const cy = cam.cy + dx / (TILE_W * z) - dy / (TILE_H * z);
  return clampFocus({ ...cam, cx, cy }, w, h);
}

// --- mobile/room framing helpers (HIRES_V2) --------------------------------

// Pixel size of a w x h room incl. back walls (wallUnits elevation units tall).
export function roomPixelSize(w, h, wallUnits = 2) {
  return {
    w: (w + h) * (TILE_W / 2),
    h: (w + h) * (TILE_H / 2) + wallUnits * ELEV_PX,
  };
}

// Does the room (roomW x roomH, zoom 1) fit inside the viewport?
export function roomFits(roomW, roomH, viewportW, viewportH) {
  return roomW <= viewportW && roomH <= viewportH;
}

// Largest integer zoom in [ZOOM_MIN, ZOOM_MAX] at which the room still fits
// the viewport. Falls back to ZOOM_MIN if nothing fits.
export function fitZoom(roomW, roomH, viewportW, viewportH) {
  for (let z = ZOOM_MAX; z >= ZOOM_MIN; z--) {
    if (roomW * z <= viewportW && roomH * z <= viewportH) return z;
  }
  return ZOOM_MIN;
}
