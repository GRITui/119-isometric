// engine.js — core VN loop for 9:47. Pure logic: story graph, node
// resolution, choice handling, ending detection. No DOM.
// Data-driven: story + characters come from JSON; nothing hardcoded.

/** @typedef {{ id: string, speaker: string|null, text: string, bg: string, portrait: string|null, next: string|null, choices?: Array<{text:string,next:string}>, ending?: boolean, endingTitle?: string }} StoryNode */
/** @typedef {{ start: string, endings: string[], nodes: StoryNode[] }} Story */
/** @typedef {{ id: string, name: string, expressions: Array<{id:string,label:string,file:string}> }} Character */
/** @typedef {{ characters: Character[] }} Characters */

export class StoryError extends Error {}

/**
 * @param {Story} story
 * @returns {Map<string, StoryNode>}
 */
export function buildIndex(story) {
  const idx = new Map();
  for (const node of story.nodes) {
    if (idx.has(node.id)) throw new StoryError(`duplicate node id: ${node.id}`);
    idx.set(node.id, node);
  }
  return idx;
}

/** @param {Story} story @param {string} id @returns {StoryNode} */
export function getNode(story, id) {
  const node = story.nodes.find((n) => n.id === id);
  if (!node) throw new StoryError(`unknown node: ${id}`);
  return node;
}

/**
 * @param {Story} story @param {Characters} chars
 * @returns {Map<string, Character>} keyed by lowercase character id
 */
export function characterIndex(chars) {
  const idx = new Map();
  for (const c of chars.characters) idx.set(c.id.toLowerCase(), c);
  return idx;
}

/**
 * @param {Story} story @param {string} id @returns {string|null}
 * Resolve the display name for a node's speaker. Unknown speakers
 * fall back to the raw string (data-driven, never throws mid-story).
 */
export function speakerName(story, chars, id) {
  const node = getNode(story, id);
  if (!node.speaker) return null;
  const c = characterIndex(chars).get(node.speaker.toLowerCase());
  return c ? c.name : node.speaker;
}

/** @param {Story} story @param {string} id @returns {boolean} */
export function isEnding(story, id) {
  return story.endings.includes(id);
}

/**
 * @param {Story} story @param {string} id
 * @returns {string|null} next node id, or null at an ending
 */
export function nextId(story, id) {
  const node = getNode(story, id);
  if (isEnding(story, id)) return null;
  if (node.choices && node.choices.length > 0) return null; // choice node: caller picks
  return node.next;
}

/** @param {Story} story @param {string} id @returns {Array<{text:string,next:string}>} */
export function choices(story, id) {
  const node = getNode(story, id);
  return node.choices ?? [];
}

/**
 * @param {Story} story @param {string} id @param {number} choiceIndex
 * @returns {string} the next node id for the chosen branch
 */
export function choose(story, id, choiceIndex) {
  const list = choices(story, id);
  if (choiceIndex < 0 || choiceIndex >= list.length) {
    throw new StoryError(`choice ${choiceIndex} out of range on ${id}`);
  }
  return list[choiceIndex].next;
}

/**
 * @param {Story} story @param {string} startId
 * @returns {Map<string, Set<string>>} node id -> set of reachable node ids
 * (BFS; used by vn_gate to verify endings are reachable)
 */
export function reachability(story, startId) {
  const seen = new Map();
  const queue = [startId];
  seen.set(startId, new Set([startId]));
  while (queue.length) {
    const id = queue.shift();
    const node = getNode(story, id);
    const targets = node.choices ? node.choices.map((c) => c.next) : node.next ? [node.next] : [];
    for (const t of targets) {
      if (!seen.has(t)) {
        seen.set(t, new Set([t]));
        queue.push(t);
      }
    }
  }
  return seen;
}

/**
 * @param {Story} story @param {string} startId
 * @returns {string[]} all node ids reachable from start (BFS order)
 */
export function reachableIds(story, startId) {
  return [...reachability(story, startId).keys()];
}
