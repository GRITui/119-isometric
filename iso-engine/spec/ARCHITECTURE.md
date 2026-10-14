# ARCHITECTURE / TECHNICAL DIRECTION — Iso 2.5D Engine

Lead: software-engineer. Project root: t_7e0cc068. Grid spec: `spec/GRID_SPEC.md`
(LOCKED v1 — see that file for all coordinate math).

## Stack
- **Web-based 2.5D isometric engine.** HTML5 Canvas 2D renderer (crisp pixel
  art, `imageSmoothingEnabled=false`). No WebGL — 2:1 diamond is fully 2D.
- **Plain ES modules (JS)**, no build step, no framework. Served by a tiny
  static server (`tools/serve.js`). Matches the team's servable-web convention.
- **Node** for tooling + tests (`npm test`). Node v26 available.
- Chosen for verifiability: the scene is servable + screenshot-able, so QA can
  prove z-ordering / pan-zoom / movement from a rendered frame.

## Module layout (owned per worker — do not cross-own)
```
iso-engine/
  spec/GRID_SPEC.md        # LOCKED grid/coordinate spec (lead)
  spec/ARCHITECTURE.md     # this file (lead)
  src/iso.js               # coordinate system — REFERENCE, verified (lead)
  src/iso.test.js          # tests for iso.js (lead)
  src/tilemap.js           # [Backend] tilemap data model + load
  src/save.js              # [Backend] save/load state serializer
  src/camera.js            # [Gameplay] pan + zoom (iso)
  src/movement.js          # [Gameplay] grid movement + A* pathfinding
  src/renderer.js          # [Gameplay] tilemap + sprite renderer, z-order
  src/scene.js             # [Gameplay] scene assembly + game loop
  index.html               # [Gameplay] playable scene entry
  data/                    # [Backend] tilemap + save JSON (schema in save.js)
  tools/atlas-import.js    # [Tooling] iso atlas import
  tools/tilemap-editor.html# [Tooling] tilemap editor UI
  tools/serve.js           # [lead] static server
```

## Conventions
- **Single source of truth for projection**: `src/iso.js`. Every module
  imports `gridToWorld` / `worldToGrid` / `tileAnchor` / `depthKey` from it.
  Never re-derive the 2:1 math.
- **Data-driven**: the scene renders from a tilemap JSON (Backend owns the
  schema). Renderer never hardcodes tiles.
- **Deterministic depth**: all drawables sorted by `depthKey` ascending.
- **Pixel-perfect**: integer zoom, no smoothing, all positions in whole px at
  1x.
- **Tests**: every `src/*.js` has a `*.test.js` runnable via `npm test`.

## Integration (the "playable iso scene" deliverable)
- [Gameplay] owns the end-to-end playable scene: ground + placeable sprites +
  camera pan/zoom + grid movement, rendered with correct z-ordering.
- It consumes [Backend]'s tilemap JSON + [Tooling]'s atlas (or a placeholder
  atlas until the real one lands from pixel-art-designer).
- Acceptance (track): a playable iso scene renders with correct z-ordering,
  camera pan/zoom, and grid movement — verified by a rendered screenshot.

## Worker boundaries (3 children of this lead task)
1. **Gameplay Developer** — `camera.js`, `movement.js`, `renderer.js`,
   `scene.js`, `index.html`. Delivers the playable scene. Depends on Backend
   (tilemap data). Uses placeholder atlas if the real one isn't ready.
2. **Backend Developer** — `tilemap.js`, `save.js`, `data/*.json`. Delivers the
   tilemap data model + save/load. Foundational — no deps.
3. **Tooling Support** — `atlas-import.js`, `tilemap-editor.html`. Delivers
   atlas import + tilemap editor/serializer. Depends on Backend (data model).

## Dependency graph
lead (this task) → Backend → { Gameplay, Tooling } (parallel).
Gameplay + Tooling both build on the Backend data model; Gameplay uses a
placeholder atlas so it is NOT blocked on Tooling or pixel-art-designer.
