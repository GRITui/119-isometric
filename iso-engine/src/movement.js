// movement.js — grid movement + A* pathfinding (4-neighborhood, no diagonals).
// Blocked tiles come from tilemap.isBlocked (OOB, z>0, prop footprints).
// Projection math from iso.js; neighbor set from iso.js NEIGHBORS.
// Pure functions, Node + browser compatible.

import { gridToWorld, NEIGHBORS } from './iso.js';

export const STEP_MS = 180; // one tile per 180 ms

// INPUT MAPPING (lead decision — QA-tested):
//   W/Up = -i (screen up-left)   S/Down = +i (screen down-right)
//   A/Left = +j (screen down-left)  D/Right = -j (screen up-right)
export const INPUT_DIRS = {
  w: [-1, 0], arrowup: [-1, 0],
  s: [1, 0], arrowdown: [1, 0],
  a: [0, 1], arrowleft: [0, 1],
  d: [0, -1], arrowright: [0, -1],
};

// entity = { i, j, z, path, pathIdx, progress, queue, state, facing, action, actionTimer }
//   path: [[i, j], ...] with path[0] == current tile; pathIdx = tile index
//   currently occupied; progress in [0, 1) = fraction of the move from
//   path[pathIdx] to path[pathIdx+1]. state: 'idle' | 'moving' | 'blocked'.
//   facing: 'n'|'s'|'e'|'w' (last movement direction; default 's' per save
//   schema). action: null | 'interact' with actionTimer ms remaining
//   (triggerInteract()); drives the hero interact animation.
export function createEntity(i, j, z = 0, facing = 's') {
  return {
    i, j, z, path: null, pathIdx: 0, progress: 0, queue: [], state: 'idle',
    facing, action: null, actionTimer: 0,
  };
}

// i-axis -> N/S, j-axis -> E/W (matches wall placement: i=0 wall is NW-side,
// j=0 wall is NE-side, so +i/+j move away from those walls toward S/W resp.).
export function facingFor(di, dj) {
  if (di < 0) return 'n';
  if (di > 0) return 's';
  if (dj > 0) return 'w';
  if (dj < 0) return 'e';
  return null;
}

// Start (or restart) a timed interact animation. No-op while moving.
export function triggerInteract(entity, ms = 500) {
  if (entity.state === 'moving') return;
  entity.action = 'interact';
  entity.actionTimer = ms;
}

// Assign a path. path[0] must be the entity's current tile.
// path.length < 2 -> no movement (idle).
export function setPath(entity, path) {
  if (!Array.isArray(path) || path.length < 2) {
    entity.path = null;
    entity.pathIdx = 0;
    entity.progress = 0;
    entity.state = 'idle';
    return;
  }
  entity.path = path;
  entity.pathIdx = 0;
  entity.progress = 0;
  entity.state = 'moving';
}

// A* over walkable tiles. Returns [[i, j], ...] (from..to inclusive) or null
// if unreachable. `from`/`to` = [i, j].
export function findPath(tilemap, from, to) {
  const [si, sj] = from;
  const [ti, tj] = to;
  if (tilemap.isBlocked(ti, tj)) return null;
  if (si === ti && sj === tj) return [[si, sj]];

  const key = (i, j) => `${i},${j}`;
  const h = (i, j) => Math.abs(i - ti) + Math.abs(j - tj);
  const g = new Map([[key(si, sj), 0]]);
  const came = new Map();
  const closed = new Set();
  const open = [{ i: si, j: sj, f: h(si, sj) }];

  while (open.length > 0) {
    // small maps: linear min-scan is fine (and deterministic)
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.i, cur.j);
    if (cur.i === ti && cur.j === tj) {
      const path = [[ti, tj]];
      let k = ck;
      while (came.has(k)) {
        const [pi, pj] = came.get(k);
        path.push([pi, pj]);
        k = key(pi, pj);
      }
      return path.reverse();
    }
    closed.add(ck);
    for (const [di, dj] of NEIGHBORS) {
      const ni = cur.i + di;
      const nj = cur.j + dj;
      if (tilemap.isBlocked(ni, nj)) continue;
      const nk = key(ni, nj);
      if (closed.has(nk)) continue;
      const ng = g.get(ck) + 1;
      if (ng < (g.has(nk) ? g.get(nk) : Infinity)) {
        g.set(nk, ng);
        came.set(nk, [cur.i, cur.j]);
        open.push({ i: ni, j: nj, f: ng + h(ni, nj) });
      }
    }
  }
  return null;
}

// One-tile step in direction (di, dj). Blocked -> state 'blocked', path
// cleared, returns false. Otherwise a 2-tile path, state 'moving'.
export function tryStepDir(entity, di, dj, tilemap) {
  const ti = entity.i + di;
  const tj = entity.j + dj;
  const f = facingFor(di, dj);
  if (f) entity.facing = f;
  if (tilemap.isBlocked(ti, tj)) {
    entity.path = null;
    entity.pathIdx = 0;
    entity.progress = 0;
    entity.state = 'blocked';
    return false;
  }
  entity.action = null;
  entity.actionTimer = 0;
  setPath(entity, [[entity.i, entity.j], [ti, tj]]);
  return true;
}

// Advance by dt ms (one tile per stepMs, default STEP_MS). If `path` is given
// it is assigned first (click-to-move). Linear interpolation between tiles;
// entity.i/j track the tile currently occupied.
export function step(entity, dt, path = null, stepMs = STEP_MS) {
  if (path) setPath(entity, path);
  if (entity.actionTimer > 0) {
    entity.actionTimer -= dt;
    if (entity.actionTimer <= 0) {
      entity.actionTimer = 0;
      entity.action = null;
    }
  }
  if (entity.state !== 'moving' || !entity.path) return entity;
  entity.progress += dt / stepMs;
  while (entity.progress >= 1) {
    entity.progress -= 1;
    const [pi, pj] = [entity.i, entity.j];
    entity.pathIdx += 1;
    const [ni, nj] = entity.path[entity.pathIdx];
    const f = facingFor(ni - pi, nj - pj);
    if (f) entity.facing = f;
    entity.i = ni;
    entity.j = nj;
    if (entity.pathIdx >= entity.path.length - 1) {
      entity.path = null;
      entity.progress = 0;
      entity.state = 'idle';
      return entity;
    }
  }
  return entity;
}

// Interpolated position. Returns { i, j, fi, fj, x, y, z } where (x, y) is
// the world-pixel TOP vertex of the (fractional) tile the entity visually
// occupies at elevation z; (fi, fj) are fractional grid coords.
export function entityPos(entity) {
  if (entity.state === 'moving' && entity.path && entity.pathIdx < entity.path.length - 1) {
    const [fi, fj] = entity.path[entity.pathIdx];
    const [ti, tj] = entity.path[entity.pathIdx + 1];
    const t = entity.progress;
    const x = fi + (ti - fi) * t;
    const y = fj + (tj - fj) * t;
    const w = gridToWorld(x, y, entity.z);
    return { i: entity.i, j: entity.j, fi: x, fj: y, x: w.x, y: w.y, z: entity.z };
  }
  const w = gridToWorld(entity.i, entity.j, entity.z);
  return { i: entity.i, j: entity.j, fi: entity.i, fj: entity.j, x: w.x, y: w.y, z: entity.z };
}
