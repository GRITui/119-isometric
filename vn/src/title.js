// title.js — title screen, ending screen, save-slot UI (DOM, per SPEC.md §4/§5/§6).
// Each screen is a full-bleed overlay that replaces all other UI.

/** @typedef {{ onNewGame?: () => void, onLoad?: () => void }} TitleConfig */
/** @typedef {{ endingTitle: string, endingText: string, onTitle?: () => void, onReplay?: () => void }} EndingConfig */
/** @typedef {{ list: Array<{ slot: number, record: { nodeId: string, ts: number, speaker: string | null } | null }>, mode: 'save' | 'load', onPick?: (slot: number) => void, onBack?: () => void }} SaveConfig */

/**
 * @param {HTMLElement} mount
 * @param {TitleConfig} config
 * @param {typeof document} [doc]
 * @returns {{ destroy: () => void }}
 */
export function showTitle(mount, config, doc) {
  const d = doc ?? document;
  const screen = d.createElement('div');
  screen.className = 'vn-screen vn-title';
  const h1 = d.createElement('h1');
  h1.className = 'vn-title-name';
  h1.textContent = '9:47';
  const sub = d.createElement('div');
  sub.className = 'vn-title-sub';
  sub.textContent = 'a salary man story';
  const menu = d.createElement('div');
  menu.className = 'vn-title-menu';
  const btnNew = d.createElement('button');
  btnNew.className = 'vn-btn';
  btnNew.type = 'button';
  btnNew.textContent = 'NEW GAME';
  btnNew.addEventListener('click', () => config.onNewGame?.());
  const btnLoad = d.createElement('button');
  btnLoad.className = 'vn-btn';
  btnLoad.type = 'button';
  btnLoad.textContent = 'LOAD';
  btnLoad.addEventListener('click', () => config.onLoad?.());
  menu.append(btnNew, btnLoad);
  screen.append(h1, sub, menu);
  mount.appendChild(screen);
  return { destroy: () => screen.remove() };
}

/**
 * @param {HTMLElement} mount
 * @param {EndingConfig} config
 * @param {typeof document} [doc]
 * @returns {{ destroy: () => void }}
 */
export function showEnding(mount, config, doc) {
  const d = doc ?? document;
  const screen = d.createElement('div');
  screen.className = 'vn-screen vn-ending';
  const h1 = d.createElement('h1');
  h1.className = 'vn-ending-title';
  h1.textContent = config.endingTitle.toUpperCase();
  const text = d.createElement('div');
  text.className = 'vn-ending-text';
  text.textContent = config.endingText;
  const btns = d.createElement('div');
  btns.className = 'vn-ending-btns';
  const btnTitle = d.createElement('button');
  btnTitle.className = 'vn-btn vn-btn-primary';
  btnTitle.type = 'button';
  btnTitle.textContent = 'TITLE SCREEN';
  btnTitle.addEventListener('click', () => config.onTitle?.());
  const btnReplay = d.createElement('button');
  btnReplay.className = 'vn-btn';
  btnReplay.type = 'button';
  btnReplay.textContent = 'REPLAY';
  btnReplay.addEventListener('click', () => config.onReplay?.());
  btns.append(btnTitle, btnReplay);
  screen.append(h1, text, btns);
  mount.appendChild(screen);
  return { destroy: () => screen.remove() };
}

/**
 * @param {HTMLElement} mount
 * @param {SaveConfig} config
 * @param {object} [deps]
 * @param {typeof document} [deps.document]
 * @param {(msg: string) => boolean} [deps.confirm]
 * @returns {{ destroy: () => void }}
 */
export function showSaveSlots(mount, config, deps) {
  const d = deps?.document ?? document;
  const confirmFn = deps?.confirm ?? confirm;
  const screen = d.createElement('div');
  screen.className = 'vn-screen vn-saves';
  const back = d.createElement('button');
  back.className = 'vn-back';
  back.type = 'button';
  back.textContent = '\u2190 BACK';
  back.addEventListener('click', () => config.onBack?.());
  const list = d.createElement('div');
  list.className = 'vn-save-list';
  for (const row of config.list) {
    const slot = d.createElement('div');
    slot.className = 'vn-save-slot';
    const label = d.createElement('span');
    label.className = 'vn-save-label';
    label.textContent = `SLOT ${row.slot}`;
    const ts = d.createElement('span');
    ts.className = 'vn-save-ts';
    ts.textContent = row.record ? new Date(row.record.ts).toLocaleString() : '';
    slot.append(label, ts);
    slot.addEventListener('click', () => {
      const action = row.record ? (config.mode === 'load' ? 'load' : 'overwrite') : 'save';
      if (action === 'load' || confirmFn(action === 'overwrite' ? 'Overwrite?' : 'Load?')) {
        config.onPick?.(row.slot);
      }
    });
    list.appendChild(slot);
  }
  screen.append(back, list);
  mount.appendChild(screen);
  return { destroy: () => screen.remove() };
}
