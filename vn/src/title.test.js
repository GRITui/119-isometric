// title.test.js — node --test for title.js (fake DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showTitle, showEnding, showSaveSlots } from './title.js';

class El {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.textContent = '';
    this.type = '';
    this._listeners = {};
  }
  append(...els) { this.children.push(...els); }
  appendChild(el) { this.children.push(el); return el; }
  remove() { this._removed = true; }
  addEventListener(ev, fn) { (this._listeners[ev] ??= []).push(fn); }
  click() { for (const fn of this._listeners.click ?? []) fn(); }
}
const doc = { createElement: (t) => new El(t) };

test('showTitle renders title + 2 buttons, NEW GAME fires onNewGame', () => {
  const mount = new El('div');
  /** @type {string[]} */
  const calls = [];
  const h = showTitle(mount, { onNewGame: () => calls.push('new'), onLoad: () => calls.push('load') }, doc);
  const screen = mount.children[0];
  assert.equal(screen.children[0].textContent, '9:47');
  const menu = screen.children[2];
  assert.equal(menu.children.length, 2);
  menu.children[0].click();
  menu.children[1].click();
  assert.deepEqual(calls, ['new', 'load']);
  h.destroy();
  assert.equal(screen._removed, true);
});

test('showEnding renders title + text + 2 buttons', () => {
  const mount = new El('div');
  /** @type {string[]} */
  const calls = [];
  const h = showEnding(mount, {
    endingTitle: 'The Delay',
    endingText: 'He let the 8:12 go.',
    onTitle: () => calls.push('title'),
    onReplay: () => calls.push('replay'),
  }, doc);
  const screen = mount.children[0];
  assert.equal(screen.children[0].textContent, 'THE DELAY');
  assert.equal(screen.children[1].textContent, 'He let the 8:12 go.');
  const btns = screen.children[2];
  assert.equal(btns.children.length, 2);
  btns.children[0].click();
  btns.children[1].click();
  assert.deepEqual(calls, ['title', 'replay']);
  h.destroy();
});

test('showSaveSlots renders 3 slots with labels and timestamps', () => {
  const mount = new El('div');
  const h = showSaveSlots(mount, {
    list: [
      { slot: 1, record: { nodeId: 'n5', ts: 1700000000000, speaker: 'Mina' } },
      { slot: 2, record: null },
      { slot: 3, record: { nodeId: 'n13', ts: 1700000001000, speaker: 'Kenji' } },
    ],
    mode: 'load',
    onPick: () => {},
    onBack: () => {},
  }, { document: doc, confirm: () => true });
  const screen = mount.children[0];
  const list = screen.children[1];
  assert.equal(list.children.length, 3);
  assert.equal(list.children[0].children[0].textContent, 'SLOT 1');
  assert.ok(list.children[0].children[1].textContent.length > 0); // ts present
  assert.equal(list.children[1].children[1].textContent, ''); // empty slot
  h.destroy();
});

test('showSaveSlots: clicking empty slot fires onPick (save)', () => {
  const mount = new El('div');
  /** @type {number[]} */
  const picked = [];
  const h = showSaveSlots(mount, {
    list: [
      { slot: 1, record: null },
      { slot: 2, record: null },
      { slot: 3, record: null },
    ],
    mode: 'save',
    onPick: (s) => picked.push(s),
    onBack: () => {},
  }, { document: doc, confirm: () => true });
  const list = mount.children[0].children[1];
  list.children[1].click();
  assert.deepEqual(picked, [2]);
  h.destroy();
});
