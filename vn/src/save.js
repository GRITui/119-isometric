// save.js — 3-slot save/load for the 9:47 VN. Pure logic; storage is injected.
// Slot record: { nodeId: string, ts: number, speaker: string | null }.

/** @typedef {{ nodeId: string, ts: number, speaker: string | null }} SaveRecord */
/** @typedef {(key: string) => string | null} ReadStore */
/** @typedef {(key: string, value: string) => void} WriteStore */

export const SLOTS = [1, 2, 3];
export const KEY = (n) => `vn947_save_${n}`;

/**
 * @param {ReadStore} read
 * @param {WriteStore} write
 */
export function createSaveStore(read, write) {
  return {
    /** @param {number} n */
    load(n) {
      const raw = read(KEY(n));
      if (!raw) return null;
      try {
        const rec = JSON.parse(raw);
        if (typeof rec.nodeId !== 'string') return null;
        return { nodeId: rec.nodeId, ts: Number(rec.ts) || 0, speaker: rec.speaker ?? null };
      } catch {
        return null;
      }
    },
    /** @param {number} n @param {string} nodeId @param {string|null} speaker */
    save(n, nodeId, speaker) {
      const rec = { nodeId, ts: Date.now(), speaker: speaker ?? null };
      write(KEY(n), JSON.stringify(rec));
      return rec;
    },
    /** @returns {Array<{ slot: number, record: SaveRecord | null }>} */
    list() {
      return SLOTS.map((n) => ({ slot: n, record: this.load(n) }));
    },
  };
}

/** @param {Storage} storage */
export function browserSaveStore(storage) {
  return createSaveStore(
    (key) => storage.getItem(key),
    (key, value) => storage.setItem(key, value),
  );
}
