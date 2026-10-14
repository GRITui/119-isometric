// tilemap.js — tilemap data model + loader (schema v1).
// ES module, no deps, Node + browser compatible.
//
// Schema (data/scene.json):
//   { version: 1, w, h, defaultTile,
//     tiles: [{ i, j, t, z? }],          // sparse: only tiles differing from default
//     props: [{ id, asset, i, j, z?, footprint: [[i, j], ...] }] }
//
// Conventions (lead decision):
//   - tiles[] is sparse; tileAt() falls back to { t: defaultTile, z: 0 }.
//   - isBlocked(): out-of-bounds, z > 0 (v1: no climbing), or prop footprint tile.
//   - A prop's depth key = max (i + j) of its footprint, at the prop's z
//     (GRID_SPEC: the max (i+j) footprint tile is the depth key).
//   - Projection/depth math comes from iso.js — never re-derive it.

import { depthKey } from './iso.js';

export const SCHEMA_VERSION = 1;

function isInt(v) {
  return Number.isInteger(v);
}

// Validate one prop entry (shared with save.js).
// bounds = { w, h } | null — when given, footprint tiles must be in bounds.
// Returns the normalized prop in schema shape: { id, asset, i, j, z, footprint }.
export function validateProp(p, idx, bounds = null, label = 'prop') {
  if (!p || typeof p !== 'object' || Array.isArray(p))
    throw new Error(`${label}: prop #${idx} must be an object`);
  if (typeof p.id !== 'string' || p.id.length === 0)
    throw new Error(`${label}: prop #${idx} has missing/invalid id (non-empty string)`);
  if (typeof p.asset !== 'string' || p.asset.length === 0)
    throw new Error(`${label}: prop ${p.id} has missing/invalid asset (non-empty string)`);
  if (!isInt(p.i) || !isInt(p.j))
    throw new Error(`${label}: prop ${p.id} has non-integer i/j (got ${p.i}, ${p.j})`);
  const z = p.z === undefined ? 0 : p.z;
  if (!isInt(z) || z < 0)
    throw new Error(`${label}: prop ${p.id} has invalid z (${p.z}); expected integer >= 0`);
  if (!Array.isArray(p.footprint) || p.footprint.length === 0)
    throw new Error(`${label}: prop ${p.id} has empty/invalid footprint`);
  const footprint = p.footprint.map((cell, k) => {
    if (!Array.isArray(cell) || cell.length !== 2 || !isInt(cell[0]) || !isInt(cell[1]))
      throw new Error(`${label}: prop ${p.id} footprint cell #${k} must be [i, j] integers`);
    const [fi, fj] = cell;
    if (bounds && (fi < 0 || fj < 0 || fi >= bounds.w || fj >= bounds.h))
      throw new Error(`${label}: prop ${p.id} footprint tile (${fi},${fj}) out of bounds [0,${bounds.w})x[0,${bounds.h})`);
    return [fi, fj];
  });
  return { id: p.id, asset: p.asset, i: p.i, j: p.j, z, footprint };
}

// loadTilemap(json: string | object) -> Tilemap
// Tilemap: { version, w, h, defaultTile, tileAt(i,j), props[], isBlocked(i,j), raw }
//   - tileAt(i,j) -> { t, z } for in-bounds tiles (default fallback when unlisted),
//     null when out of bounds.
//   - props[] = normalized schema-shape props, each extended with depthKey
//     (max footprint (i+j) * 1000 + z, via iso.js depthKey).
//   - raw = normalized source document (defaults filled, input order kept) so
//     tooling can re-serialize deterministically.
export function loadTilemap(json) {
  let raw;
  if (typeof json === 'string') {
    try {
      raw = JSON.parse(json);
    } catch (err) {
      throw new Error(`loadTilemap: invalid JSON: ${err.message}`);
    }
  } else {
    raw = json;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('loadTilemap: expected a tilemap object or JSON string');
  if (raw.version !== SCHEMA_VERSION)
    throw new Error(`loadTilemap: unsupported version ${JSON.stringify(raw.version)} (expected ${SCHEMA_VERSION})`);
  const { w, h } = raw;
  if (!isInt(w) || !isInt(h) || w <= 0 || h <= 0)
    throw new Error(`loadTilemap: w/h must be positive integers (got w=${w}, h=${h})`);
  if (typeof raw.defaultTile !== 'string' || raw.defaultTile.length === 0)
    throw new Error('loadTilemap: defaultTile must be a non-empty string');

  const bounds = { w, h };

  // Sparse tile map: "i,j" -> { t, z }
  const tiles = new Map();
  for (const entry of raw.tiles ?? []) {
    const { i, j, t, z } = entry ?? {};
    if (!isInt(i) || !isInt(j) || i < 0 || j < 0 || i >= w || j >= h)
      throw new Error(`loadTilemap: tile (${i},${j}) out of bounds [0,${w})x[0,${h})`);
    if (typeof t !== 'string' || t.length === 0)
      throw new Error(`loadTilemap: tile (${i},${j}) has missing/invalid t (non-empty string)`);
    const zz = z === undefined ? 0 : z;
    if (!isInt(zz) || zz < 0)
      throw new Error(`loadTilemap: tile (${i},${j}) has invalid z (${z}); expected integer >= 0`);
    tiles.set(`${i},${j}`, { t, z: zz });
  }

  const props = (raw.props ?? []).map((p, idx) => {
    const prop = validateProp(p, idx, bounds, 'loadTilemap');
    const maxSum = Math.max(...prop.footprint.map(([fi, fj]) => fi + fj));
    return { ...prop, depthKey: depthKey(maxSum, 0, prop.z) };
  });

  // Props block walking: their footprint tiles are not walkable (v1).
  const blockedByProp = new Set();
  for (const p of props)
    for (const [fi, fj] of p.footprint) blockedByProp.add(`${fi},${fj}`);

  function tileAt(i, j) {
    if (!isInt(i) || !isInt(j) || i < 0 || j < 0 || i >= w || j >= h) return null;
    return tiles.get(`${i},${j}`) ?? { t: raw.defaultTile, z: 0 };
  }

  function isBlocked(i, j) {
    if (!isInt(i) || !isInt(j) || i < 0 || j < 0 || i >= w || j >= h) return true;
    const tile = tiles.get(`${i},${j}`);
    if (tile && tile.z > 0) return true; // v1: no climbing
    return blockedByProp.has(`${i},${j}`);
  }

  return {
    version: SCHEMA_VERSION,
    w,
    h,
    defaultTile: raw.defaultTile,
    tileAt,
    props,
    isBlocked,
    raw: {
      version: SCHEMA_VERSION,
      w,
      h,
      defaultTile: raw.defaultTile,
      tiles: [...tiles.entries()].map(([key, v]) => {
        const [ti, tj] = key.split(',').map(Number);
        return { i: ti, j: tj, t: v.t, z: v.z };
      }),
      props,
    },
  };
}
