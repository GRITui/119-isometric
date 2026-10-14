# GRID / COORDINATE SPEC — LOCKED v1 (2026-10-13)

Source of truth for the isometric 2.5D engine. **pixel-art-designer and ux-ui:
align footprints + HUD to these numbers.** Reference implementation:
`src/iso.js` (verified, `npm test`). Any change here is a breaking change for
art + UI + engine — coordinate with software-engineer first.

## Constants (locked)
| Name     | Value | Meaning                                   |
|----------|-------|-------------------------------------------|
| TILE_W   | 32    | screen width of one diamond tile (px)     |
| TILE_H   | 16    | screen height of one diamond tile (px)    |
| ratio    | 2:1   | TILE_W / TILE_H                           |
| ELEV_PX  | 16    | 1 elevation unit in screen px (= TILE_H)  |

## Grid → Screen (world pixel space)
Grid coords `(i, j)` are integers (sub-tile positions are floats). `z` =
elevation in units. `(ox, oy)` = screen anchor of grid (0,0) top vertex
(= camera offset; default 0,0 in world space).

```
sx = ox + (i - j) * (TILE_W / 2)   // ox + (i - j) * 16
sy = oy + (i + j) * (TILE_H / 2) - z * ELEV_PX   // oy + (i + j) * 8 - z * 16
```

- `+i` moves down-right; `+j` moves down-left (diamond orientation).
- Larger `(i + j)` = lower on screen = **closer to viewer**.

## Screen → Grid (mouse picking, z = 0)
```
dx = sx - ox ; dy = sy - oy
i = (dx / 16 + dy / 8) / 2
j = (dy / 8 - dx / 16) / 2
```
Round-trips exactly (verified over a 16×16 map). To pick a tile, `floor(i), floor(j)`.

## Sprite anchor
Character/prop feet anchor at the **tile bottom (front) vertex**:
```
anchor = ( sx, sy + TILE_H )   // (sx, sy + 16)
```
where `(sx, sy)` is the tile's top vertex. Art: place the sprite's ground line
here so it stands "in" the tile.

## Tile corners (world pixel space)
```
top    = (sx,        sy)
right  = (sx + 16,   sy + 8)
bottom = (sx,        sy + 16)
left   = (sx - 16,   sy + 8)
```

## Depth / z-ordering (painter's algorithm)
Draw back-to-front = **ascending** depth key; larger key drawn later (on top).
```
depthKey = (i + j) * 1000 + z
```
- Primary: `(i + j)` row depth (front-to-back). Secondary: `z` elevation.
- Scale 1000 >> any realistic elevation, so row order always dominates.
- Entities use their **base/anchor tile** `(i, j)` for the key.
- This is the standard approximation for 2:1 iso; it correctly handles the
  common cases (front tile occludes back tile; taller object on same tile
  draws on top).

## Elevation (2.5D height)
- 1 elevation unit = ELEV_PX = 16 px (one full tile height).
- A tile/prop at elevation `z` has its top face shifted up by `z * 16` px.
- Art brief's "1–2 unit" walls = 16 px / 32 px tall.

## Camera (model)
- Camera = focus point in grid space `(cx, cy)` + integer `zoom` (default 2).
- World→screen: `screen = (worldToScreen(p) - worldToScreen(cam)) * zoom + screenCenter`.
- **Integer zoom only** by default (crisp pixel art); non-integer allowed but
  discouraged. `imageSmoothingEnabled = false` on the canvas.
- Pan = move `(cx, cy)`; clamp so the map stays in view.

## Footprint / naming (for art + UI)
- Every sprite's ground footprint sits on one tile; anchor at the bottom vertex.
- Multi-tile props: declare footprint as a list of `(i, j)` tiles; the **max**
  `(i + j)` tile is the depth key.
- Suggested asset naming: `tile_<name>_<variant>`, `spr_<name>_<dir>_<frame>`,
  `wall_<name>_<h>`. (Asset Coordinator may refine; keep the `tile_`/`spr_`/`wall_`
  prefixes so the engine's loader can route them.)

## Renderer
- HTML5 Canvas 2D (crisp pixels, no WebGL needed for 2:1 diamond).
- Draw order: collect all drawables (tiles + entities) → sort by `depthKey`
  ascending → draw. Ground tiles first within a row, then props/sprites.
