// camera.js — isometric camera: grid-space focus (cx, cy) + integer zoom.
// GRID_SPEC v1: screen = (worldPx(p) - worldPx(cam)) * zoom + viewportCenter.
// All projection math comes from iso.js — never re-derived here.
// Pure functions, Node + browser compatible.

import { gridToWorld, worldToGrid } from './iso.js';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
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
//   Δcx = -dx/(32·zoom) - dy/(16·zoom)
//   Δcy =  dx/(32·zoom) - dy/(16·zoom)
// Result is clamped to the map (0..w, 0..h).
export function panByScreen(dx, dy, cam, zoom, w, h) {
  const z = zoom ?? cam.zoom;
  const cx = cam.cx - dx / (32 * z) - dy / (16 * z);
  const cy = cam.cy + dx / (32 * z) - dy / (16 * z);
  return clampFocus({ ...cam, cx, cy }, w, h);
}
