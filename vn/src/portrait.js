// portrait.js — bust-up portrait swap with crossfade (DOM, per SPEC.md §2).
// Placement: left (x:48px) for kenji/mina, right for daichi, center otherwise.
// Crossfade: 150ms opacity transition. null portrait = hidden.

/** @typedef {{ kenji: 'left', mina: 'left', daichi: 'right' }} PlacementMap */

const CROSSFADE_MS = 150;

/**
 * @param {HTMLElement} mount
 * @param {PlacementMap} [placement]
 * @param {typeof document} [deps]
 * @param {typeof document} [deps.document]
 * @param {typeof setTimeout} [deps.setTimeout]
 * @param {typeof clearTimeout} [deps.clearTimeout]
 * @returns {{ show: (charId: string|null) => void, destroy: () => void }}
 */
export function createPortrait(mount, placement, deps) {
  const d = deps?.document ?? document;
  const st = deps?.setTimeout ?? setTimeout;
  const ct = deps?.clearTimeout ?? clearTimeout;
  const pos = placement ?? { kenji: 'left', mina: 'left', daichi: 'right' };

  /** @type {HTMLDivElement} */
  const wrap = d.createElement('div');
  wrap.className = 'vn-portrait';
  const front = d.createElement('img');
  front.className = 'vn-portrait-img';
  front.alt = '';
  const back = d.createElement('img');
  back.className = 'vn-portrait-img';
  back.alt = '';
  wrap.append(back, front);
  mount.appendChild(wrap);

  let current = null;
  let active = front;
  let inactive = back;
  let timer = 0;

  /** @param {string|null} charId */
  function show(charId) {
    if (charId === current) return;
    const prev = current;
    current = charId;
    const side = pos[charId] ?? 'center';
    wrap.className = `vn-portrait pos-${side}`;
    if (!charId) {
      if (timer) { ct(timer); timer = 0; }
      active.style.opacity = '0';
      inactive.style.opacity = '0';
      return;
    }
    const src = `assets/portraits/${charId}.png`;
    inactive.src = src;
    inactive.style.opacity = '0';
    // force reflow so the transition fires
    void wrap.offsetWidth;
    active.style.opacity = '0';
    inactive.style.opacity = '1';
    if (timer) ct(timer);
    timer = st(() => {
      [active, inactive] = [inactive, active];
      if (prev) inactive.src = '';
    }, CROSSFADE_MS);
  }

  function destroy() {
    if (timer) ct(timer);
    wrap.remove();
  }

  return { show, destroy };
}
