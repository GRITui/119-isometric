// atlas.test.js — every data/scene.json asset key resolves in data/atlas.json
// (ATLAS_SCHEMA.md acceptance: "every name in scene.json resolves to a valid
// {sheet,x,y[,w,h]} in atlas.json").
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const scene = JSON.parse(readFileSync(join(root, 'data/scene.json'), 'utf8'));
const atlas = JSON.parse(readFileSync(join(root, 'data/atlas.json'), 'utf8'));

for (const sheet of atlas.sheets) {
  assert.ok(existsSync(join(root, sheet.file)), `sheet file exists: ${sheet.file}`);
}

for (const t of scene.tiles) {
  assert.ok(atlas.tiles[t.t], `scene tile key resolves in atlas.tiles: ${t.t}`);
}
for (const p of scene.props) {
  assert.ok(atlas.sprites[p.asset], `scene prop asset resolves in atlas.sprites: ${p.asset}`);
}
assert.ok(atlas.animations.hero, 'atlas.animations.hero present');
for (const dir of ['N', 'S', 'E', 'W']) {
  for (const state of ['walk', 'idle', 'interact']) {
    assert.ok(
      Array.isArray(atlas.animations.hero[dir]?.[state]) && atlas.animations.hero[dir][state].length > 0,
      `hero anim ${dir}.${state} present`,
    );
  }
}
console.log('atlas.js: all tests passed (scene keys resolve, sheet files exist, hero anims complete)');
