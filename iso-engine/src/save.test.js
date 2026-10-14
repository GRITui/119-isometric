// save.test.js — save/load state serializer (schema v1).
// Uses a synthetic fixture (not data/save.json, which is the real Scene 01
// save — see scene01.test.js for scene-specific coverage).
import { serialize, parse, saveState, loadState } from './save.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const fixture = {
  version: 1, scene: 'scene.json',
  player: { i: 8, j: 8, z: 0, facing: 's' },
  camera: { cx: 8, cy: 8, zoom: 2 },
  props: [
    { id: 'p1', asset: 'spr_tree_0', i: 3, j: 4, z: 0, footprint: [[3, 4]] },
    { id: 'p2', asset: 'spr_tree_0', i: 12, j: 5, z: 0, footprint: [[12, 5]] },
    { id: 'p3', asset: 'wall_wood_1', i: 5, j: 12, z: 0, footprint: [[5, 12]] },
  ],
};
const s = parse(JSON.stringify(fixture));
assert.strictEqual(s.version, 1);
assert.strictEqual(s.scene, 'scene.json');
assert.deepStrictEqual(s.player, { i: 8, j: 8, z: 0, facing: 's' });
assert.deepStrictEqual(s.camera, { cx: 8, cy: 8, zoom: 2 });
assert.strictEqual(s.props.length, 3);
assert.deepStrictEqual(s.props[0], {
  id: 'p1', asset: 'spr_tree_0', i: 3, j: 4, z: 0, footprint: [[3, 4]],
});

// --- facing defaults to 's' when omitted ---
{
  const noFacing = parse(JSON.stringify({ ...fixture, player: { i: 1, j: 2, z: 0 } }));
  assert.strictEqual(noFacing.player.facing, 's');
}

// --- facing rejects invalid values ---
assert.throws(
  () => parse(JSON.stringify({ ...fixture, player: { i: 1, j: 2, z: 0, facing: 'ne' } })),
  /save:/, 'bad facing rejected',
);

// --- round-trip lossless ---
assert.deepStrictEqual(parse(serialize(s)), s, 'parse(serialize(x)) deep-equals x');
assert.strictEqual(serialize(parse(serialize(s))), serialize(s), 'serialize is idempotent (string-stable)');

// --- stable key order + 2-space indent (exact output) ---
const mini = serialize({
  version: 1, scene: 'scene.json',
  player: { i: 1, j: 2, z: 0, facing: 'n' },
  camera: { cx: 3, cy: 4, zoom: 2 },
  props: [],
});
assert.strictEqual(mini, [
  '{',
  '  "version": 1,',
  '  "scene": "scene.json",',
  '  "player": {',
  '    "i": 1,',
  '    "j": 2,',
  '    "z": 0,',
  '    "facing": "n"',
  '  },',
  '  "camera": {',
  '    "cx": 3,',
  '    "cy": 4,',
  '    "zoom": 2',
  '  },',
  '  "props": []',
  '}',
].join('\n'));

// key order is stable regardless of input key order
const shuffled = serialize({
  props: [],
  camera: { zoom: 2, cx: 3, cy: 4 },
  player: { facing: 'n', z: 0, i: 1, j: 2 },
  scene: 'scene.json',
  version: 1,
});
assert.strictEqual(shuffled, mini, 'serialize ignores input key order');

// --- Node fs round-trip ---
const dir = mkdtempSync(join(tmpdir(), 'iso-save-'));
try {
  const p = join(dir, 's.json');
  await saveState(p, s);
  const back = await loadState(p);
  assert.deepStrictEqual(back, s, 'saveState/loadState round-trip');
  assert.strictEqual(serialize(back), serialize(s), 'fs round-trip is string-stable');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// --- malformed input rejected ---
const base = {
  version: 1, scene: 'scene.json',
  player: { i: 0, j: 0, z: 0 },
  camera: { cx: 0, cy: 0, zoom: 2 },
  props: [],
};
const bad = [
  [JSON.stringify({ ...base, version: 2 }), 'wrong version'],
  ['not json', 'invalid JSON'],
  [JSON.stringify({ version: 1, scene: 'scene.json', player: base.player, camera: base.camera }), 'missing props'],
  [JSON.stringify({ ...base, scene: '' }), 'empty scene'],
  [JSON.stringify({ ...base, player: { i: 'x', j: 0, z: 0 } }), 'non-integer player.i'],
  [JSON.stringify({ ...base, player: { i: 0, j: 0, z: -1 } }), 'negative player.z'],
  [JSON.stringify({ ...base, camera: { cx: 0, cy: 0, zoom: 0 } }), 'zero zoom'],
  [JSON.stringify({ ...base, camera: { cx: 0, cy: 0, zoom: -2 } }), 'negative zoom'],
  [JSON.stringify({ ...base, props: 'nope' }), 'props not an array'],
  [JSON.stringify({ ...base, props: [{ id: 'p', i: 0, j: 0, footprint: [[0, 0]] }] }), 'prop missing asset'],
  [JSON.stringify({ ...base, props: [{ id: 'p', asset: 'spr_tree_0', i: 0.5, j: 0, footprint: [[0, 0]] }] }), 'prop non-integer i'],
  [JSON.stringify({ ...base, props: [{ id: 'p', asset: 'spr_tree_0', i: 0, j: 0, footprint: [[0, 0, 0]] }] }), 'bad footprint cell'],
];
for (const [input, why] of bad) {
  assert.throws(() => parse(input), /save:/, `should reject: ${why}`);
}
assert.throws(() => parse(42), /save:/, 'non-string input rejected');

console.log('save.js: all tests passed (round-trip lossless, stable key order, facing, fs save/load, malformed rejected)');
