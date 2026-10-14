# ATLAS SCHEMA — atlas.json contract (art <-> software-engineer) — v2 (HI-RES)

The renderer loads `data/atlas.json` + the PNG sheets it references. This is the joint
contract between pixel-art-designer (emits the sheets + this file) and software-engineer
(consumes it). Names MUST match `data/scene.json` asset keys.

v1 -> v2: cell sizes doubled (tiles 32x16 -> 64x32, sprites 64x64 -> 128x128) per
`spec/HIRES_V2.md`. Field names/shape unchanged.

## File: `iso-engine/data/atlas.json`
```json
{
  "version": 1,
  "sheets": [
    { "file": "assets/tiles.png",  "cellW": 64, "cellH": 32, "cols": 8 },
    { "file": "assets/props.png",  "cellW": 128, "cellH": 128, "cols": 4 },
    { "file": "assets/hero.png",   "cellW": 128, "cellH": 128, "cols": 8 }
  ],
  "tiles": {
    "tile_grass_0": { "sheet": 0, "x": 0, "y": 0 },
    "tile_grass_1": { "sheet": 0, "x": 64, "y": 0 },
    "wall_wood_1":  { "sheet": 0, "x": 0, "y": 32, "h": 64 }
  },
  "sprites": {
    "spr_tree_0": { "sheet": 1, "x": 0, "y": 0, "w": 64, "h": 96,
                    "anchor": "bottom-center", "footprint": [[0, 0]] }
  },
  "animations": {
    "hero": {
      "S": { "walk": [0, 1, 2, 3], "idle": [4, 5], "interact": [6, 7] },
      "N": { "walk": [8, 9, 10, 11], "idle": [12, 13], "interact": [14, 15] }
    }
  }
}
```

## Field rules
- `sheets[]`: one PNG per asset class. `cellW/cellH` = the cell grid; `cols` = cells per row.
  Tile cells are 64x32 (exact tile size). Sprite/character cells are 128x128 (ISO ART SPEC v2 canvas).
- `tiles{name}`: `{sheet, x, y, [h]}`. `x/y` = top-left px in the sheet. `h` optional —
  wall/height tiles exceed the 32px tile height (h=64 for 2 units). Default h=32.
- `sprites{name}`: `{sheet, x, y, w, h, anchor, footprint}`. `anchor` = "bottom-center"
  (sprite bottom-center lands on the tile's bottom vertex per GRID_SPEC). `footprint` =
  list of (i,j) grid cells; depthKey = max(i+j) (multi-tile props).
- `animations{char}{dir}{state}`: frame indices into that character's sheet row(s).
  Dir in {N,S,E,W}; state in {walk, idle, interact} per the LOCKED animation contract.

## Decisions (defaults = my recommendation; forks flagged)
1. **Sheet layout**: RECOMMENDED = one PNG per asset class (tiles.png, props.png, hero.png).
   FORK: single combined atlas (fewer files, bigger sheet, harder to batch).
2. **Tile cell size**: 64x32 (exact). Wall tiles drawn taller in the same cell column (h>32, up to 64 for 2u).
3. **Sprite cell size**: 128x128 (per ISO ART SPEC v2 canvas); a 96px tree fits with headroom.
4. **Naming**: identical to `scene.json` keys. No renaming — the renderer already resolves these.
5. **Anchor**: bottom-center, always. No per-asset anchor override in v1/v2.

## Hero asset exemption (HIRES v2, 80-96px character)
Hero v3 is a HIRES v2 character sprite (80-96px tall, 128x128 cell canvas) — far larger
than the UI icon atlas cell (24x24, see assets/ui/ ui_atlas_icons.png in the separate UI
asset spec, asset_spec.md from t_c029cba5). The hero is a GAME sprite, not a UI icon, and
is governed by this file, not the UI atlas convention. Explicit exemption:

1. **No atlas packing into the UI icon grid.** `ui_atlas_icons.png` is a fixed 24x24-cell,
   8x8-grid pack for screen-space UI icons (pause/settings/talk/pick/map). A 128x128 hero
   cell is 28x the UI icon cell area — packing it there would blow the grid or force a
   resize that breaks every other icon's manifest coords. The hero instead ships as its
   own full-resolution sheet, `assets/hero.png`, exactly like `tiles.png`/`props.png` —
   one PNG per asset class (Decision 1 above), referenced via a `sheets[]` entry
   (`cellW:128, cellH:128, cols:8`). No change to the sheets[] shape; this is already
   the existing convention, now stated as a hard rule so hero art is never routed into
   the UI icon pipeline by mistake.
2. **Naming**: `assets/hero.png` (singular file, matches `scene.json` asset key `hero` —
   Decision 4, identical-to-scene-key, no renaming). No `_state`/`_dir` suffix on the
   filename: direction and state are frame-index metadata inside `animations.hero`, not
   separate files or sheet rows addressed by name.
3. **Animation key naming** (unchanged shape, now explicitly locked):
   `animations.hero.<DIR>.<STATE>` = array of frame indices (row-major into the 8-col
   sheet). `DIR` in `{N,S,E,W}` today; if gameplay (t_d06e0576) goes 8-directional, add
   `NE/NW/SE/SW` as additional sibling keys — do not change the `{DIR:{STATE:[...]}}`
   shape. `STATE` in `{walk, idle, interact}` per the locked animation contract — same
   three states as every other character, no hero-only state names.
4. **Variable frame counts are normal, not an exception needing padding.** `idle` may be
   2 frames, `walk` 4, a future state 6 — arrays are independent lengths, no requirement
   to pad to a uniform count or reserve empty sheet cells. Backend validation
   (t_f54098f9) parses/validates per-array length, not a fixed grid fill; keep art drops
   consistent with that: only emit the frames that exist, don't pad with duplicate or
   blank cells to round out a row.
5. **Colour palette**: hero sprite gets its own cap, <=48 colours (vs <=16 for tiles/props)
   per t_f54098f9 — the verify script applies this as a per-category limit, not a global
   constant. Confirm new hero art stays <=48; tiles/props art is unaffected and stays
   <=16.
6. **Portrait asset**: none exists or is planned for Hero v3 — scope is `hero.png`
   (world sprite sheet) only, no dialogue/UI portrait. If a portrait is added later, name
   it `hero_portrait.png`, not atlas-packed (same exemption rationale as #1 — a portrait
   is full-face resolution, not an icon-grid-sized asset), referenced directly by path
   from UI code rather than through `atlas.json`'s sheet/cell system (atlas.json indexes
   game-world sprites by grid cell; a portrait has no grid position).

## Acceptance (both sides)
- Art: every name in `scene.json` resolves to a valid `{sheet,x,y[,w,h]}` in atlas.json;
  sheets exist on disk; re-decode verify green (on-palette per category — <=16 tiles/props,
  <=48 hero per the exemption above; decode==JSON); v2 art is drawn at v2 size (native
  redraw, not a 2x upscale of v1 — see HIRES_V2.md hard rule).
- SE: renderer loads atlas.json, maps each scene asset to its region, draws with correct
  anchor + depthKey; `npm test` green; scene renders real art (no placeholder) at 1280x800.
