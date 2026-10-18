// save.test.js — node --test for save.js (pure logic, fake storage).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, browserSaveStore, SLOTS, KEY } from './save.js';

function memStore() {
  const m = new Map();
  return {
    read: (k) => (m.has(k) ? m.get(k) : null),
    write: (k, v) => m.set(k, v),
    raw: (k) => m.get(k),
  };
}

test('SLOTS is 3 slots', () => assert.deepEqual(SLOTS, [1, 2, 3]));
test('KEY format', () => assert.equal(KEY(2), 'vn947_save_2'));

test('empty slot loads null', () => {
  const s = createSaveStore(memStore().read, memStore().write);
  assert.equal(s.load(1), null);
});

test('save then load round-trips', () => {
  const m = memStore();
  const s = createSaveStore(m.read, m.write);
  const rec = s.save(1, 'n13', 'Kenji');
  assert.equal(typeof rec.ts, 'number');
  const got = s.load(1);
  assert.deepEqual(got, { nodeId: 'n13', ts: rec.ts, speaker: 'Kenji' });
});

test('speaker defaults to null', () => {
  const m = memStore();
  const s = createSaveStore(m.read, m.write);
  s.save(3, 'e2', null);
  assert.equal(s.load(3).speaker, null);
});

test('list returns all 3 slots with records', () => {
  const m = memStore();
  const s = createSaveStore(m.read, m.write);
  s.save(2, 'n5', 'Mina');
  const rows = s.list();
  assert.equal(rows.length, 3);
  assert.equal(rows[0].record, null);
  assert.equal(rows[1].record.nodeId, 'n5');
  assert.equal(rows[2].record, null);
});

test('corrupt JSON loads null', () => {
  const m = memStore();
  m.write('vn947_save_1', '{not json');
  const s = createSaveStore(m.read, m.write);
  assert.equal(s.load(1), null);
});

test('record without nodeId loads null', () => {
  const m = memStore();
  m.write('vn947_save_1', JSON.stringify({ ts: 1 }));
  const s = createSaveStore(m.read, m.write);
  assert.equal(s.load(1), null);
});

test('browserSaveStore wraps a Storage-like object', () => {
  const backing = new Map();
  const storage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, v),
  };
  const s = browserSaveStore(storage);
  s.save(1, 'n1', null);
  assert.equal(backing.get('vn947_save_1').includes('"nodeId":"n1"'), true);
  assert.equal(s.load(1).nodeId, 'n1');
});
