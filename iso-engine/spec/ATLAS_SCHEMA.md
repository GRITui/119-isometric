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

## Acceptance (both sides)
- Art: every name in `scene.json` resolves to a valid `{sheet,x,y[,w,h]}` in atlas.json;
  sheets exist on disk; re-decode verify green (on-palette <=16, decode==JSON); v2 art is
  drawn at v2 size (native redraw, not a 2x upscale of v1 — see HIRES_V2.md hard rule).
- SE: renderer loads atlas.json, maps each scene asset to its region, draws with correct
  anchor + depthKey; `npm test` green; scene renders real art (no placeholder) at 1280x800.
