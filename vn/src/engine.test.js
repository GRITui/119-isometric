// engine.test.js — node --test for engine.js against the real story.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildIndex, getNode, characterIndex, speakerName, isEnding,
  nextId, choices, choose, reachableIds, StoryError,
} from './engine.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const story = JSON.parse(readFileSync(here + '../data/story.json', 'utf8'));
const chars = JSON.parse(readFileSync(here + '../data/characters.json', 'utf8'));

test('story has 40 nodes', () => assert.equal(story.nodes.length, 40));

test('buildIndex indexes every node, rejects duplicates', () => {
  const idx = buildIndex(story);
  assert.equal(idx.size, 40);
  assert.throws(() => buildIndex({ ...story, nodes: [...story.nodes, story.nodes[0]] }), StoryError);
});

test('getNode throws on unknown id', () => {
  assert.throws(() => getNode(story, 'nope'), StoryError);
});

test('characterIndex resolves all 3 characters', () => {
  const idx = characterIndex(chars);
  assert.equal(idx.size, 3);
  assert.equal(idx.get('kenji').name, 'Kenji');
});

test('speakerName resolves speakers and null', () => {
  assert.equal(speakerName(story, chars, 'n5'), 'Mina');
  assert.equal(speakerName(story, chars, 'n1'), 'Kenji');
  assert.equal(speakerName(story, chars, 'e1'), null);
});

test('endings: 3, all flagged in nodes', () => {
  assert.deepEqual([...story.endings].sort(), ['e1', 'e2', 'e3']);
  for (const id of story.endings) {
    assert.equal(isEnding(story, id), true);
    assert.equal(getNode(story, id).ending, true);
    assert.equal(nextId(story, id), null);
  }
});

test('choice nodes expose choices; nextId null on them', () => {
  const c1 = choices(story, 'c1');
  assert.equal(c1.length, 2);
  assert.equal(nextId(story, 'c1'), null);
  assert.equal(choices(story, 'n1').length, 0);
});

test('choose resolves branches; out of range throws', () => {
  assert.equal(choose(story, 'c2', 0), 'n19');
  assert.equal(choose(story, 'c2', 1), 'n25');
  assert.equal(choose(story, 'c2', 2), 'n31');
  assert.throws(() => choose(story, 'c2', 3), StoryError);
});

test('all 40 nodes reachable from start', () => {
  const ids = reachableIds(story, story.start);
  assert.equal(new Set(ids).size, 40);
  for (const n of story.nodes) assert.ok(ids.includes(n.id), `unreachable: ${n.id}`);
});

test('every next/choice target resolves to a real node', () => {
  const idx = buildIndex(story);
  for (const n of story.nodes) {
    if (n.next) assert.ok(idx.has(n.next), `dangling next: ${n.id} -> ${n.next}`);
    for (const c of n.choices ?? []) assert.ok(idx.has(c.next), `dangling choice: ${n.id} -> ${c.next}`);
  }
});

test('every portrait ref is a known character id', () => {
  const idx = characterIndex(chars);
  for (const n of story.nodes) {
    if (n.portrait) assert.ok(idx.has(n.portrait.toLowerCase()), `unknown portrait: ${n.portrait} on ${n.id}`);
  }
});
