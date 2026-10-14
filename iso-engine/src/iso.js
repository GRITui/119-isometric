// iso.js — 2.5D isometric coordinate system (2:1 diamond). HI-RES v2 (LOCKED).
// Shared by renderer, camera, movement, tilemap, editor, and art footprints.
// This is the single source of truth for grid<->screen math. Do NOT re-derive
// the projection elsewhere — import from here.

// HI-RES v2 (LOCKED by PO, Krit direction): every pixel dimension doubled
// from v1 (32x16 -> 64x32). Projection/depth formulas unchanged.
export const TILE_W = 64;   // screen width of one diamond tile (px)
export const TILE_H = 32;   // screen height of one diamond tile (px)  -> 2:1
export const ELEV_PX = 32;  // 1 elevation unit in screen px (= TILE_H)
const HW = TILE_W / 2;      // 32
const HH = TILE_H / 2;      // 16

// grid (i, j, z) -> world pixel space. Origin (0,0) top vertex at (ox, oy).
//   x = ox + (i - j) * (TILE_W/2)
//   y = oy + (i + j) * (TILE_H/2) - z * ELEV_PX
export function gridToWorld(i, j, z = 0, ox = 0, oy = 0) {
  return {
    x: ox + (i - j) * HW,
    y: oy + (i + j) * HH - z * ELEV_PX,
  };
}

// world pixel -> grid (for mouse picking). Assumes z=0 (ground plane).
// Returns fractional grid coords; floor() to snap to a tile.
export function worldToGrid(x, y, ox = 0, oy = 0) {
  const dx = x - ox;
  const dy = y - oy;
  return {
    i: (dx / HW + dy / HH) / 2,
    j: (dy / HH - dx / HW) / 2,
  };
}

// Snap fractional grid coords to the tile whose diamond contains the point.
export function worldToTile(x, y, ox = 0, oy = 0) {
  const g = worldToGrid(x, y, ox, oy);
  return { i: Math.floor(g.i), j: Math.floor(g.j) };
}

// Sprite anchor = tile bottom (front) vertex: (sx, sy + TILE_H).
// Character/prop feet sit here so sprites stand "in" the tile.
export function tileAnchor(i, j, ox = 0, oy = 0) {
  const c = gridToWorld(i, j, 0, ox, oy);
  return { x: c.x, y: c.y + TILE_H };
}

// Painter's-algorithm depth key. LARGER = closer to viewer = drawn LATER (on top).
// Primary: (i + j) row depth (front-to-back). Secondary: z elevation.
// Scale 1000 >> any realistic elevation, so row order always dominates.
export function depthKey(i, j, z = 0) {
  return (i + j) * 1000 + z;
}

// The four corners of a diamond tile in world pixel space.
export function tileCorners(i, j, ox = 0, oy = 0) {
  const c = gridToWorld(i, j, 0, ox, oy);
  return {
    top:    { x: c.x,      y: c.y },
    right:  { x: c.x + HW, y: c.y + HH },
    bottom: { x: c.x,      y: c.y + TILE_H },
    left:   { x: c.x - HW, y: c.y + HH },
  };
}

// 4-neighborhood (grid). Diagonals are NOT walkable in default movement.
export const NEIGHBORS = [
  [1, 0], [0, 1], [-1, 0], [0, -1],
];
