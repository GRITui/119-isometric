# 119-isometric

2.5D isometric pixel-art game (2:1 diamond projection, painter's-algorithm depth).
Built by the team-room kanban board (board: `team-room`, project root task `t_7e0cc068`).

## Layout

- `iso-engine/` — the isometric engine (web, HTML5 Canvas 2D, plain ES modules, no build step).
  - `iso-engine/spec/GRID_SPEC.md` — **LOCKED grid/coordinate spec v1** (single source of truth
    for projection math; art + UI + engine all align to it).
  - `iso-engine/spec/ARCHITECTURE.md` — stack, module layout, worker ownership, conventions.
  - `iso-engine/src/iso.js` — verified reference implementation of the coordinate system
    (`npm test` in `iso-engine/`).

## Conventions

- Every module imports grid<->screen math from `src/iso.js` — never re-derive the projection.
- All `src/*.js` ship with a `*.test.js` runnable via `npm test`.
- Commits: `iso-engine: <what changed> - <kanban task id>`.
- The playable scene is served by `iso-engine/tools/serve.js` (static server).

## Tracks (kanban)

| Track | Lead task | Scope |
|---|---|---|
| Engine | t_c786263e | coords, renderer, camera, movement, tooling |
| Art | t_c57e6431 | tileset + sprites on the 2:1 grid, shared palette |
| UI | t_805b5e8e | HUD, safe areas, asset naming/atlas convention |
| QA visual | t_46760e02 | projection, z-order, palette passes |
| QA journey | t_0c5da83c | navigation, flow, state-feedback passes |
