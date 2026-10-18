// dialog.test.js — node --test for dialog.js (DOM via happy-dom-free minimal stub).
// Uses a tiny fake DOM so the test runs under plain node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDialog } from './dialog.js';

// --- minimal DOM stub -----------------------------------------------------
class El {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.type = '';
    this._listeners = {};
    const s = new Set();
    this._cls = {
      add: (...c) => c.forEach((x) => s.add(x)),
      remove: (...c) => c.forEach((x) => s.delete(x)),
      toggle: (c, force) => { const on = force ?? !s.has(c); if (on) s.add(c); else s.delete(c); return on; },
      contains: (c) => s.has(c),
    };
  }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text ?? ''; }
  set innerHTML(v) { this._html = String(v); if (v === '') this.children = []; }
  get innerHTML() { return this._html ?? ''; }
  get className() { return [...this._cls].join(' '); }
  set className(v) {
    const s = new Set(v.split(' ').filter(Boolean));
    this._cls = {
      add: (...c) => c.forEach((x) => s.add(x)),
      remove: (...c) => c.forEach((x) => s.delete(x)),
      toggle: (c, force) => { const on = force ?? !s.has(c); if (on) s.add(c); else s.delete(c); return on; },
      contains: (c) => s.has(c),
    };
  }
  get classList() { return this._cls; }
  append(...els) { this.children.push(...els); }
  appendChild(el) { this.children.push(el); return el; }
  remove() {}
  addEventListener(ev, fn) { (this._listeners[ev] ??= []).push(fn); }
  click() { for (const fn of this._listeners.click ?? []) fn(); }
}

function fakeDocument() {
  return { createElement: (t) => new El(t) };
}

function fakeWindow() {
  // setInterval that never fires on its own; tests call complete() directly.
  return { setInterval: () => 0, clearInterval: () => {} };
}

const deps = { document: fakeDocument(), window: fakeWindow() };

// --- tests -----------------------------------------------------------------
test('show() renders speaker uppercased and starts typing', () => {
  const mount = new El('div');
  const d = createDialog(mount, { onAdvance: () => {} }, deps);
  d.show('Mina', 'hello world');
  const box = mount.children[0];
  const name = box.children[0];
  assert.equal(name.textContent, 'MINA');
  assert.equal(d.isTyping(), true);
  d.destroy();
});

test('complete() fills full text and stops typing', () => {
  const mount = new El('div');
  const d = createDialog(mount, {}, deps);
  d.show(null, 'abc');
  d.complete();
  assert.equal(d.isTyping(), false);
  const box = mount.children[0];
  const text = box.children[1];
  assert.equal(text.textContent, 'abc');
  d.destroy();
});

test('showChoices renders buttons and fires onChoice with index', () => {
  const mount = new El('div');
  /** @type {number[]} */
  const picked = [];
  const d = createDialog(mount, { onChoice: (i) => picked.push(i) }, deps);
  d.showChoices([{ text: 'A', next: 'n1' }, { text: 'B', next: 'n2' }]);
  const wrap = mount.children[1];
  assert.equal(wrap.children.length, 2);
  assert.equal(wrap.children[0].textContent, 'A');
  wrap.children[1].click();
  assert.deepEqual(picked, [1]);
  d.destroy();
});

test('hide() hides dialog and clears choices', () => {
  const mount = new El('div');
  const d = createDialog(mount, {}, deps);
  d.show('Kenji', 'x');
  d.showChoices([{ text: 'A', next: 'n1' }]);
  d.hide();
  const box = mount.children[0];
  assert.ok(box.classList.contains('hidden'));
  assert.equal(mount.children[1].children.length, 0);
  d.destroy();
});
