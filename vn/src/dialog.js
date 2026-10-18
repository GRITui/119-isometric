// dialog.js — dialog box + typewriter + choice UI (DOM, per SPEC.md §1/§7).
// Pure construction: the engine owns the loop; this module renders state.

/** @typedef {{ speaker: string|null, text: string, choices?: Array<{text:string,next:string}>|null, onChoice?: (i: number) => void, onAdvance?: () => void, speedMs?: number }} DialogConfig */

const TYPE_MS_DEFAULT = 30;

/**
 * @param {HTMLElement} mount
 * @param {DialogConfig} config
 * @param {object} [deps]
 * @param {typeof document} [deps.document]
 * @param {typeof window} [deps.window]
 * @returns {{ show: (speaker: string|null, text: string) => void,
 *             showChoices: (opts: Array<{text:string,next:string}>) => void,
 *             hide: () => void,
 *             isTyping: () => boolean,
 *             complete: () => void,
 *             destroy: () => void }}
 */
export function createDialog(mount, config, deps = {}) {
  const doc = deps.document ?? document;
  const win = deps.window ?? window;
  /** @type {HTMLDivElement} */
  const box = doc.createElement('div');
  box.className = 'vn-dialog';
  const nameBar = doc.createElement('div');
  nameBar.className = 'vn-dialog-name';
  const textEl = doc.createElement('div');
  textEl.className = 'vn-dialog-text';
  const arrow = doc.createElement('div');
  arrow.className = 'vn-dialog-arrow';
  arrow.textContent = '▸';
  box.append(nameBar, textEl, arrow);
  mount.appendChild(box);

  const choiceWrap = doc.createElement('div');
  choiceWrap.className = 'vn-choices';
  mount.appendChild(choiceWrap);

  let typing = false;
  let timer = 0;
  let full = '';
  let onAdvance = config.onAdvance ?? null;
  let onChoice = config.onChoice ?? null;
  const speed = config.speedMs ?? TYPE_MS_DEFAULT;

  function clear() {
    if (timer) { clearTimeout(timer); timer = 0; }
    typing = false;
    arrow.classList.remove('pulse');
  }

  function show(speaker, text) {
    choiceWrap.innerHTML = '';
    choiceWrap.classList.remove('visible');
    box.classList.remove('hidden');
    nameBar.textContent = speaker ? String(speaker).toUpperCase() : '';
    nameBar.classList.toggle('empty', !speaker);
    full = text;
    textEl.textContent = '';
    arrow.classList.remove('pulse');
    typing = true;
    let i = 0;
    timer = win.setInterval(() => {
      i += 1;
      textEl.textContent = full.slice(0, i);
      if (i >= full.length) complete();
    }, speed);
  }

  function complete() {
    if (!typing) return;
    clear();
    textEl.textContent = full;
    arrow.classList.add('pulse');
  }

  function showChoices(opts) {
    clear();
    box.classList.add('hidden');
    choiceWrap.innerHTML = '';
    for (const [i, opt] of opts.entries()) {
      const b = doc.createElement('button');
      b.className = 'vn-choice';
      b.type = 'button';
      b.textContent = opt.text;
      b.addEventListener('click', () => {
        if (onChoice) onChoice(i);
      });
      choiceWrap.appendChild(b);
    }
    choiceWrap.classList.add('visible');
  }

  function hide() {
    clear();
    box.classList.add('hidden');
    choiceWrap.classList.remove('visible');
    choiceWrap.innerHTML = '';
  }

  function destroy() {
    clear();
    box.remove();
    choiceWrap.remove();
  }

  return {
    show,
    showChoices,
    hide,
    isTyping: () => typing,
    complete,
    destroy,
  };
}
