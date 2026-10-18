// vn_gate.mjs — story structure gate for the 9:47 VN.
// Validates: all nodes resolve, all 3 endings reachable, all character refs
// resolve, all bg refs resolve. Exit 0 on pass, non-zero on fail.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildIndex, getNode, characterIndex, reachableIds } from '../src/engine.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const story = JSON.parse(readFileSync(here + '../data/story.json', 'utf8'));
const chars = JSON.parse(readFileSync(here + '../data/characters.json', 'utf8'));

const errors = [];

// 1. All nodes resolve (no duplicates, no dangling next/choice targets)
try {
  const idx = buildIndex(story);
  if (idx.size !== story.nodes.length) {
    errors.push(`duplicate node ids: ${story.nodes.length} nodes, ${idx.size} unique`);
  }
  for (const n of story.nodes) {
    if (n.next && !idx.has(n.next)) errors.push(`dangling next: ${n.id} -> ${n.next}`);
    for (const c of n.choices ?? []) {
      if (!idx.has(c.next)) errors.push(`dangling choice: ${n.id} -> ${c.next}`);
    }
  }
} catch (e) {
  errors.push(`buildIndex failed: ${e.message}`);
}

// 2. All 3 endings reachable from start
const reachable = new Set(reachableIds(story, story.start));
for (const eid of story.endings) {
  if (!reachable.has(eid)) errors.push(`ending ${eid} not reachable from ${story.start}`);
}
if (story.endings.length !== 3) errors.push(`expected 3 endings, got ${story.endings.length}`);

// 3. All character refs resolve
const charIdx = characterIndex(chars);
for (const n of story.nodes) {
  if (n.portrait && !charIdx.has(n.portrait.toLowerCase())) {
    errors.push(`unknown portrait ref: ${n.portrait} on node ${n.id}`);
  }
}

// 4. All bg refs resolve (known backgrounds)
const KNOWN_BGS = new Set(['apartment', 'shop', 'platform']);
for (const n of story.nodes) {
  if (!KNOWN_BGS.has(n.bg)) errors.push(`unknown bg ref: ${n.bg} on node ${n.id}`);
}

// 5. All nodes reachable from start
for (const n of story.nodes) {
  if (!reachable.has(n.id)) errors.push(`node ${n.id} not reachable from ${story.start}`);
}

if (errors.length) {
  console.error('vn_gate: FAIL');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
} else {
  console.log(`vn_gate: PASS (${story.nodes.length} nodes, ${story.endings.length} endings, all reachable, all refs resolve)`);
  process.exit(0);
}
