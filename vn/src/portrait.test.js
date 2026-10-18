// portrait.test.js — node --test for portrait.js (fake DOM, fake timers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPortrait } from './portrait.js';

class El {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.src = '';
    this.alt = '';
    this.className = '';
    this.offsetWidth = 0;
    this._listeners = {};
  }
  append(...els) { this.children.push(...els); }
  appendChild(el) { this.children.push(el); return el; }
  remove() { this._removed = true; }
  addEventListener(ev, fn) { (this._listeners[ev] ??= []).push(fn); }
}

function makeDoc() { return { createElement: (t) => new El(t) }; }

function makeTimers() {
  /** @type {Array<{ id: number, fn: () => void }>} */
  const queue = [];
  let nextId = 1;
  return {
    setTimeout: (fn) => { const id = nextId++; queue.push({ id, fn }); return id; },
    clearTimeout: (id) => { const i = queue.findIndex((t) => t.id === id); if (i >= 0) queue.splice(i, 1); },
    flush: () => { const q = queue.splice(0); q.forEach((t) => t.fn()); },
  };
}

test('show(char) sets src and side placement', () => {
  const mount = new El('div');
  const deps = { document: makeDoc(), setTimeout: () => 0, clearTimeout: () => {} };
  const p = createPortrait(mount, { mina: 'left', daichi: 'right' }, deps);
  p.show('mina');
  const wrap = mount.children[0];
  assert.equal(wrap.className, 'vn-portrait pos-left');
  const imgs = wrap.children;
  assert.equal(imgs[0].src, 'assets/portraits/mina.png'); // back (fading in)
  assert.equal(imgs[0].style.opacity, '1');
  assert.equal(imgs[1].style.opacity, '0'); // front (empty, fading out)
  p.destroy();
});

test('show(null) hides portrait', () => {
  const mount = new El('div');
  const deps = { document: makeDoc(), setTimeout: () => 0, clearTimeout: () => {} };
  const p = createPortrait(mount, undefined, deps);
  p.show('daichi');
  p.show(null);
  const wrap = mount.children[0];
  assert.equal(wrap.children[0].style.opacity, '0');
  assert.equal(wrap.children[1].style.opacity, '0');
  p.destroy();
});

test('same char does not re-trigger swap', () => {
  const mount = new El('div');
  const deps = { document: makeDoc(), setTimeout: () => 0, clearTimeout: () => {} };
  const p = createPortrait(mount, undefined, deps);
  p.show('kenji');
  const wrap = mount.children[0];
  const srcBefore = wrap.children[1].src;
  p.show('kenji');
  assert.equal(wrap.children[1].src, srcBefore);
  p.destroy();
});

test('crossfade swap: after flush, roles swap and old src cleared', () => {
  const mount = new El('div');
  const timers = makeTimers();
  const deps = { document: makeDoc(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout };
  const p = createPortrait(mount, undefined, deps);
  p.show('kenji');
  timers.flush(); // settle the first swap
  const wrap = mount.children[0];
  // after settle: back = kenji (active), front = empty
  assert.equal(wrap.children[0].src, 'assets/portraits/kenji.png');
  assert.equal(wrap.children[1].src, '');
  p.show('mina');
  // back (kenji) fading out, front (mina) fading in
  assert.equal(wrap.children[0].src, 'assets/portraits/kenji.png');
  assert.equal(wrap.children[1].src, 'assets/portraits/mina.png');
  timers.flush();
  // roles swapped: front = mina (active), back = empty
  assert.equal(wrap.children[1].src, 'assets/portraits/mina.png');
  assert.equal(wrap.children[0].src, '');
  p.destroy();
});

test('destroy removes wrap', () => {
  const mount = new El('div');
  const deps = { document: makeDoc(), setTimeout: () => 0, clearTimeout: () => {} };
  const p = createPortrait(mount, undefined, deps);
  const wrap = mount.children[0];
  p.destroy();
  assert.equal(wrap._removed, true);
});
