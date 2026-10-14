// scene.js — scene assembly: tilemap (data/scene.json) + optional save
// (data/save.json) -> camera + player entity + input + rAF loop.
//
// createScene() is pure logic (headless-testable: handleKey/handleClick/
// handlePan/handleZoom/update). initBrowserScene() wires canvas + DOM
// events + requestAnimationFrame (browser only).

import { createCamera, screenToGrid, panByScreen, ZOOM_MIN, ZOOM_MAX, roomPixelSize, roomFits, fitZoom } from './camera.js';
import { createEntity, setPath, step, tryStepDir, findPath, entityPos, triggerInteract, INPUT_DIRS, STEP_MS } from './movement.js';
import { createRenderer, loadAtlas } from './renderer.js';

// opts: { tilemap, save?, width?, height?, autoFrame? }
// save = parsed save state ({ player: {i,j,z}, camera: {cx,cy,zoom} }) or null.
// autoFrame (HIRES_V2): when true, the camera self-manages framing every
// update() — room-fit static camera on desktop, hero-follow zoom-1 camera
// when the room doesn't fit the viewport (mobile/portrait). Default false
// preserves the plain save/center camera (generic engine + tests).
export function createScene({ tilemap, save = null, width = 800, height = 600, autoFrame = false }) {
  const camera = save
    ? createCamera(save.camera.cx, save.camera.cy, save.camera.zoom)
    : createCamera(tilemap.w / 2, tilemap.h / 2);
  const player = save
    ? createEntity(save.player.i, save.player.j, save.player.z ?? 0, save.player.facing ?? 's')
    : createEntity(Math.floor(tilemap.w / 2), Math.floor(tilemap.h / 2));

  const scene = { tilemap, camera, player, width, height, renderer: null };

  // WASD/arrows: one-tile step; queued while moving.
  scene.handleKey = (key) => {
    const dir = INPUT_DIRS[String(key).toLowerCase()];
    if (!dir) return;
    if (player.state === 'moving') {
      player.queue.push(dir);
      return;
    }
    tryStepDir(player, dir[0], dir[1], tilemap);
  };

  // Click-to-move: pick tile (z=0), A* path.
  scene.handleClick = (x, y) => {
    const g = screenToGrid(x, y, camera, width, height);
    const ti = Math.floor(g.i);
    const tj = Math.floor(g.j);
    if (tilemap.isBlocked(ti, tj)) return;
    const path = findPath(tilemap, [player.i, player.j], [ti, tj]);
    if (path) setPath(player, path);
  };

  // Right/middle drag pan.
  scene.handlePan = (dx, dy) => {
    const n = panByScreen(dx, dy, camera, camera.zoom, tilemap.w, tilemap.h);
    camera.cx = n.cx;
    camera.cy = n.cy;
  };

  // 'E' / interact key: plays the hero's interact animation in place.
  scene.handleInteract = () => triggerInteract(player);

  // Wheel / +/-: integer zoom, clamped 1..3 (HIRES_V2).
  scene.handleZoom = (delta) => {
    camera.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camera.zoom + Math.sign(delta || 1)));
  };

  // Advance the player by dt ms; 'blocked' decays to idle (transient);
  // pop queued directions when idle.
  scene.update = (dt, vw, vh) => {
    step(player, dt, null, STEP_MS);
    if (player.state === 'blocked') player.state = 'idle';
    if (player.state === 'idle' && player.queue.length > 0) {
      const [di, dj] = player.queue.shift();
      tryStepDir(player, di, dj, tilemap);
    }
    if (autoFrame) scene.syncCamera(vw ?? scene.width, vh ?? scene.height);
  };

  // HIRES_V2 framing: if the room fits the viewport at zoom>=1, use a
  // static camera centered on the room at the largest integer zoom that
  // fits (desktop). Otherwise follow the hero at zoom 1 so the hero is
  // always fully on screen, no fractional zoom (mobile/portrait).
  scene.syncCamera = (vw, vh) => {
    const room = roomPixelSize(tilemap.w, tilemap.h);
    if (roomFits(room.w, room.h, vw, vh)) {
      camera.zoom = fitZoom(room.w, room.h, vw, vh);
      camera.cx = tilemap.w / 2;
      camera.cy = tilemap.h / 2;
    } else {
      camera.zoom = ZOOM_MIN;
      const pos = entityPos(player);
      camera.cx = pos.fi;
      camera.cy = pos.fj;
    }
  };

  if (autoFrame) scene.syncCamera(width, height);

  return scene;
}

// Browser entry: fetch data, build scene, wire input, run the rAF loop.
export async function initBrowserScene(canvas) {
  const sceneJson = await (await fetch('data/scene.json')).json();
  // tilemap.js is browser-loadable (pure ES module)
  const { loadTilemap } = await import('./tilemap.js');
  const tilemap = loadTilemap(sceneJson);

  let save = null;
  try {
    const saveText = await (await fetch('data/save.json')).text();
    const { parse } = await import('./save.js');
    save = parse(saveText);
  } catch {
    save = null; // optional
  }

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (scene) { scene.width = canvas.width; scene.height = canvas.height; scene.syncCamera(canvas.width, canvas.height); }
  };
  let scene;
  resize();
  window.addEventListener('resize', resize);

  scene = createScene({ tilemap, save, width: canvas.width, height: canvas.height, autoFrame: true });
  scene.renderer = createRenderer(canvas, tilemap);
  try {
    scene.renderer.setAtlas(await loadAtlas('data/atlas.json'));
  } catch {
    /* no atlas yet: procedural placeholders */
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === '+' || k === '=') { scene.handleZoom(1); return; }
    if (k === '-' || k === '_') { scene.handleZoom(-1); return; }
    if (k === 'e') { scene.handleInteract(); return; }
    if (k in INPUT_DIRS) {
      e.preventDefault();
      scene.handleKey(k);
    }
  });

  // mouse: left click = move; right/middle drag = pan; wheel = zoom
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2 || e.button === 1) {
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    } else if (e.button === 0) {
      scene.handleClick(e.clientX, e.clientY);
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (!panning) return;
    scene.handlePan(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2 || e.button === 1) panning = false;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    scene.handleZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  // rAF loop
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(now - last, 100); // clamp long frames (tab switch)
    last = now;
    scene.update(dt, canvas.width, canvas.height);
    scene.renderer.draw({
      camera: scene.camera,
      entity: scene.player,
      width: canvas.width,
      height: canvas.height,
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // QA handle (headless/CDP tests): inspect/drive the live scene.
  if (typeof window !== 'undefined') window.__isoScene = scene;
  return scene;
}
