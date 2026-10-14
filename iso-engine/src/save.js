// save.js — save/load state serializer (schema v1).
// ES module, no deps. Node: saveState/loadState via node:fs/promises (dynamic
// import, so this module stays browser-loadable — in the browser use
// serialize/parse only; there is no fs).
//
// Schema (data/save.json):
//   { version: 1,
//     scene: "scene.json",
//     player: { i, j, z },
//     camera: { cx, cy, zoom },
//     props: [ ...same shape as tilemap props... ] }
//
// Conventions (lead decision):
//   - serialize(state) emits keys in a STABLE order (below), 2-space indent.
//   - parse(str) validates version === 1 + required fields and throws a
//     descriptive Error on malformed input.
//   - player/camera: i, j, z integers (z >= 0); cx, cy finite numbers;
//     zoom a positive finite number (integer by default; non-integer allowed
//     but discouraged per GRID_SPEC).
//   - props reuse tilemap.js validateProp (no bounds check — a save does not
//     carry the scene dimensions).

import { validateProp } from './tilemap.js';

export const SAVE_VERSION = 1;

function isInt(v) {
  return Number.isInteger(v);
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// Canonicalize + validate a state object. Returns a fresh object with the
// stable key order (top: version, scene, player, camera, props;
// player: i, j, z; camera: cx, cy, zoom; prop: id, asset, i, j, z, footprint).
function canonicalize(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state))
    throw new Error('save: state must be an object');
  if (state.version !== SAVE_VERSION)
    throw new Error(`save: unsupported version ${JSON.stringify(state.version)} (expected ${SAVE_VERSION})`);
  if (typeof state.scene !== 'string' || state.scene.length === 0)
    throw new Error('save: scene must be a non-empty string (scene file name)');

  const p = state.player;
  if (!p || typeof p !== 'object' || Array.isArray(p))
    throw new Error('save: player must be an object { i, j, z }');
  if (!isInt(p.i)) throw new Error(`save: player.i must be an integer (got ${JSON.stringify(p.i)})`);
  if (!isInt(p.j)) throw new Error(`save: player.j must be an integer (got ${JSON.stringify(p.j)})`);
  const pz = p.z === undefined ? 0 : p.z;
  if (!isInt(pz) || pz < 0)
    throw new Error(`save: player.z must be an integer >= 0 (got ${JSON.stringify(p.z)})`);

  const c = state.camera;
  if (!c || typeof c !== 'object' || Array.isArray(c))
    throw new Error('save: camera must be an object { cx, cy, zoom }');
  if (!isNum(c.cx)) throw new Error(`save: camera.cx must be a finite number (got ${JSON.stringify(c.cx)})`);
  if (!isNum(c.cy)) throw new Error(`save: camera.cy must be a finite number (got ${JSON.stringify(c.cy)})`);
  if (!isNum(c.zoom) || c.zoom <= 0)
    throw new Error(`save: camera.zoom must be a positive number (got ${JSON.stringify(c.zoom)})`);

  if (!Array.isArray(state.props))
    throw new Error('save: props must be an array (same shape as tilemap props)');
  const props = state.props.map((pr, idx) => validateProp(pr, idx, null, 'save'));

  return {
    version: SAVE_VERSION,
    scene: state.scene,
    player: { i: p.i, j: p.j, z: pz },
    camera: { cx: c.cx, cy: c.cy, zoom: c.zoom },
    props,
  };
}

// serialize(state) -> string. Stable key order, 2-space indent.
export function serialize(state) {
  const s = canonicalize(state);
  return JSON.stringify(s, null, 2);
}

// parse(str) -> state. Validates; throws a descriptive Error on malformed input.
export function parse(str) {
  if (typeof str !== 'string')
    throw new Error('save: parse expects a JSON string');
  let obj;
  try {
    obj = JSON.parse(str);
  } catch (err) {
    throw new Error(`save: invalid JSON: ${err.message}`);
  }
  return canonicalize(obj);
}

// --- Node-only convenience (fs). Browser: use serialize/parse. ---

let fsMod = null;
async function nodeFs() {
  if (!fsMod) fsMod = await import('node:fs/promises');
  return fsMod;
}

// saveState(path, state) — writes serialize(state) + trailing newline.
export async function saveState(path, state) {
  const fs = await nodeFs();
  await fs.writeFile(path, serialize(state) + '\n', 'utf8');
}

// loadState(path) -> state (parsed + validated).
export async function loadState(path) {
  const fs = await nodeFs();
  return parse(await fs.readFile(path, 'utf8'));
}
