# SCENE 01 v2 — Asset naming + atlas-key table (DRAFT, companion to SCENE_01_STUDIO_v2.md)

Status: DRAFT, ux-ui proposal, pending Krit decision-gate approval alongside the v2 scene
spec. Extends ATLAS_SCHEMA.md naming convention (spr_<name>_<variant>,
wall_int_<type>_<wall>_<variant>, floor_<type>_<variant>). Atlas key == asset name
(ATLAS_SCHEMA.md Decision 4 — no renaming between scene.json/atlas.json).

Sheet convention: v2 is a native redraw per HIRES_V2.md (no 2x upscale), so every v1
prop gets regenerated anyway. Recommendation: keep ONE sheet per asset class
(`assets/tiles.png`, `assets/props.png`) and regenerate them in place at v2 cell size
(128x128 sprites / 64x32 tiles) rather than opening a second props sheet — 27 total
sprite entries (11 carried-over-or-dropped v1 names + 16 new v2 names) fits a 4-col
sheet in 7 rows, well under any size concern. FORK for Krit: if the pixel-art team
would rather isolate the v2 redraw batch for review, a split sheet
(`assets/props_room01.png`) is the alternative — flag only, not blocking this spec.

Cell packing (x/y offsets in the sheet) is a pixel-art-designer/atlas-build concern,
not named here — this table fixes NAMES, FOOTPRINTS, HEIGHTS and the schema fields
atlas.json must carry; actual x/y assignment happens when the sheet is built (0 gens
in this task).

## Walls / tiles (assets/tiles.png, 64x32 cells, h up to 64)

| name | atlas key | footprint (scene cells) | height | sheet | notes |
|---|---|---|---|---|---|
| wall_int_0 | wall_int_0 | i=0 (j=0..7) and j=0 (i=0..9), minus window/door/partition cells | 2u (h=64) | tiles.png | reused v1 key, unchanged art — generic back-wall segment |
| wall_int_window_ne_0 | wall_int_window_ne_0 | (7,0) | 2u (h=64) | tiles.png | wall seg, kitchen-end window; reused v1 key/art if window art unchanged |
| wall_int_window_ne_1 | wall_int_window_ne_1 | (9,0) | 2u (h=64) | tiles.png | NEW — second window, window-end of NE wall; same art family as window_ne_0, distinct cell for a 2-window wall per reference |
| wall_int_partition_0 | wall_int_partition_0 | (6,6) and (8,6) (2 placements, same asset) | 2u (h=64) | tiles.png | NEW — freestanding interior wall, cutaway-eligible like back walls (SE render concern, see Multi-tile section below). Same tile art both placements. |
| wall_int_door_0 | wall_int_door_0 | (7,6) | 2u (h=64) | tiles.png | NEW — door set into the partition, passable opening. v1's `wall_int_door_ne_0` was a back-wall door; this is a different wall family (partition, not NE back wall) hence the plain `_door_0` name, no `_ne` infix. |
| floor_wood_0 / floor_wood_1 | floor_wood_0 / floor_wood_1 | interior floor, non-kitchen | 0 | tiles.png | reused v1 keys, unchanged |
| floor_tile_0 | floor_tile_0 | kitchen run, i=1..6, j=1 | 0 | tiles.png | reused v1 key, unchanged |

## Sprites (assets/props.png, 128x128 cells, anchor bottom-center (64,127))

| name | atlas key | footprint (scene cells) | height | sheet | multi-tile / z-sort notes |
|---|---|---|---|---|---|
| spr_wardrobe_shelf_0 | spr_wardrobe_shelf_0 | (1,1) | 2.5u | props.png | NEW — built-in wardrobe + open shelves combo over the bed headboard, single cell, tall |
| spr_decor_books_0 | spr_decor_books_0 | (1,1) overlay | 2.3u | props.png | NEW — non-blocking decor overlay drawn on top of spr_wardrobe_shelf_0, no own footprint/collision |
| spr_bed_0 | spr_bed_0 | (1,2),(1,3) — 2x1 | 1u | props.png | reused v1 key/footprint shape; art redrawn at v2 size. 2x1 — must z-sort vs hero on both cells (same rule as v1) |
| spr_lamp_0 | spr_lamp_0 | (1,4) | 2u | props.png | reused v1 key, unchanged placement role (floor lamp) |
| spr_plant_0 | spr_plant_0 | (2,4) | ~1.5u | props.png | reused v1 key; v2 placement/art differs (bed-wall corner, not (9,1)) — same name is fine since v2 fully supersedes v1 art on approval |
| spr_wall_cabinets_kitchen_0 | spr_wall_cabinets_kitchen_0 | (1,0)..(4,0) overlay on NE wall | 1u strip, z 1.5-2u | props.png | NEW — wall-mounted strip, non-blocking, drawn as overlay across 4 wall cells (single sprite stretched/tiled — pixel-art-designer's call whether this is 1 wide sprite or 4 repeats of 1 cell-wide art; this spec only fixes the key) |
| spr_decor_ceramics_0 | spr_decor_ceramics_0 | (2,0),(3,0) overlay | 1.8u | props.png | NEW — non-blocking decor overlay on the cabinet strip |
| spr_cooktop_0 | spr_cooktop_0 | (2,1) | 1u | props.png | NEW — single-cell kitchen appliance |
| spr_sink_0 | spr_sink_0 | (3,1) | 1u | props.png | NEW |
| spr_oven_cabinet_0 | spr_oven_cabinet_0 | (4,1) | 1u | props.png | NEW — base cabinet/oven combo, single cell |
| spr_coffee_machine_0 | spr_coffee_machine_0 | (5,1) | 1u | props.png | NEW — countertop appliance, single cell |
| spr_fridge_1 | spr_fridge_1 | (6,1) | 2u | props.png | NEW variant — v1 `spr_fridge_0` was a different footprint role (NW wall, (1,1)); v2 fridge sits at the far kitchen end on the NE wall, tall (2u) — new variant number to avoid silently changing v1's key semantics if v1 ever needs to stay queryable |
| spr_tv_console_0 | spr_tv_console_0 | (8,1) | 1u | props.png | NEW — single cell, lounge corner |
| spr_sofa_1 | spr_sofa_1 | (7,2),(8,2) — 2x1 | 1u | props.png | NEW variant — v1 `spr_sofa_0` was under-window (4,1),(5,1) horizontal; v2 sofa is perpendicular to the TV console at a different footprint, new variant number. 2x1 — SAME z-sort rule as spr_bed_0: must composite correctly vs hero on both cells |
| spr_table_round_0 | spr_table_round_0 | (5,3) | 1u | props.png | NEW — round dining table, single cell |
| spr_chair_1 | spr_chair_1 | (4,3) and (5,2) (2 placements, same asset, engine may mirror/rotate) | 1u | props.png | NEW variant — v1 `spr_chair_0` was paired with the old desk (removed in v2); v2 chair is a dining chair, new variant. Two placements around spr_table_round_0 |
| spr_coat_hooks_0 | spr_coat_hooks_0 | (6,6) overlay | 1.8u | props.png | NEW — wall-mounted, non-blocking, overlay on the left partition segment |

## v1 props.png entries NOT used in v2 layout

spr_stove_0, spr_counter_0, spr_desk_0, spr_chair_0, spr_shelf_0, spr_crate_0 — dropped
from the v2 scene (kitchen granularized into separate appliances; desk removed per
reference; bookshelf replaced by spr_wardrobe_shelf_0 / spr_wall_cabinets_kitchen_0;
no moving-boxes prop in v2). Recommend keeping their sheet cells reserved (not
repacked) until Krit confirms v1 is fully retired, in case any ship elsewhere; final
call is the pixel-art-designer's when the sheet is actually rebuilt — no gens happened
in this task.

## Plants — second variant

Only one additional plant variant is needed: spr_plant_1 (entry, at (8,5)). The bed-wall
corner reuses spr_plant_0 (per wireframe). No third plant variant required.
