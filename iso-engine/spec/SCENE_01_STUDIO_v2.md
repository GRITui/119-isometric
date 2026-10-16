# SCENE 01 — Studio apartment (v2 DRAFT — ux-ui proposal, pending Krit decision-gate)

Status: DRAFT. Supersedes SCENE_01_STUDIO.md (v1) ONLY once Krit approves via the
decision-gate card (t_7793de3c). Do not edit v1; do not treat this as locked until that
gate closes. Built from SCENE_01_STUDIO_v2_wireframe.md (layout) and
SCENE_01_STUDIO_v2_ASSET_NAMING.md (naming/atlas table, same directory) — see those
files for the reference-mapping rationale and the full naming notes respectively.

Grid/projection/palette/style unchanged from v1: GRID_SPEC v1 + ISO ART SPEC v1. Engine
is HIRES v2 (64x32 tiles, 128px sprite cells per HIRES_V2.md) but layout stays
grid-cell-defined, resolution-independent.

## Room

- Grid 10 (i) x 8 (j), unchanged from v1. i in [0,10), j in [0,8).
- CUTAWAY: only the two BACK walls are built — i=0 column (NW wall) and j=0 row
  (NE wall). Front edges (i=9, j=7) are open floor, no wall. Player must never be
  hidden.
- NEW in v2: a THIRD wall segment, the entry partition, is a freestanding interior
  wall at j=6, i=6 and i=8 (door gap at i=7). Not a back wall, but sits between camera
  and interior near the entry path — needs the same "never hide the player"
  fade/cutaway treatment as the back walls. SE owns the render technique; this spec
  fixes position/size only (1 cell each side of a 1-cell door gap, 2u tall).
- Walls are 2 units tall (64 engine-px, HIRES v2), blocked, z=0 base, unless noted.
- Floor = interior i in [1,10), j in [1,8).

## Layout (grid coords (i,j); all props blocked unless marked non-blocking)

| what | asset | footprint | height | blocking |
|---|---|---|---|---|
| NW wall (bed side) | wall_int_0 | i=0, j=0..7 | 2u | yes |
| NE wall (kitchen+window side) | wall_int_0 | j=0, i=0..9 | 2u | yes |
| window (NE wall, kitchen end) | wall_int_window_ne_0 | (7,0) | 2u | wall seg |
| window (NE wall, window end) | wall_int_window_ne_1 | (9,0) | 2u | wall seg |
| wardrobe + open shelves | spr_wardrobe_shelf_0 | (1,1) | 2.5u | yes |
| shelf decor (bed-wall) | spr_decor_books_0 | (1,1) overlay | 2.3u | no (deco overlay) |
| bed | spr_bed_0 | (1,2),(1,3) | 1u | yes |
| floor lamp | spr_lamp_0 | (1,4) | 2u | yes |
| plant (bed-wall corner) | spr_plant_0 | (2,4) | ~1.5u | yes |
| upper cabinets / open shelves | spr_wall_cabinets_kitchen_0 | (1,0)..(4,0) overlay on NE wall | 1u strip, z 1.5-2u | no (wall-mounted) |
| shelf decor (kitchen) | spr_decor_ceramics_0 | (2,0),(3,0) overlay | 1.8u | no (deco overlay) |
| cooktop | spr_cooktop_0 | (2,1) | 1u | yes |
| sink | spr_sink_0 | (3,1) | 1u | yes |
| oven / base cabinet | spr_oven_cabinet_0 | (4,1) | 1u | yes |
| coffee machine (on counter) | spr_coffee_machine_0 | (5,1) | 1u | yes |
| fridge (tall) | spr_fridge_1 | (6,1) | 2u | yes |
| TV console | spr_tv_console_0 | (8,1) | 1u | yes |
| sofa (perpendicular to TV) | spr_sofa_1 | (7,2),(8,2) | 1u | yes |
| dining chair A | spr_chair_1 | (4,3) | 1u | yes |
| dining chair B | spr_chair_1 | (5,2) | 1u | yes |
| dining table (round) | spr_table_round_0 | (5,3) | 1u | yes |
| entry partition, left of door | wall_int_partition_0 | (6,6) | 2u | yes, cutaway-eligible |
| coat hooks (on partition) | spr_coat_hooks_0 | (6,6) overlay | 1.8u | no (wall-mounted) |
| front door | wall_int_door_0 | (7,6) | 2u | door opening, passable |
| entry partition, right of door | wall_int_partition_0 | (8,6) | 2u | yes, cutaway-eligible |
| plant (entry) | spr_plant_1 | (8,5) | ~1.5u | yes |
| wood floor | floor_wood_0 / floor_wood_1 (variant) | everything else interior | 0 | no |
| kitchen floor tile | floor_tile_0 | i 1..6, j 1 (kitchen run) | 0 | no |

- Spawn: (7,5), just inside the door at (7,6), facing N (into the room, toward the
  dining nook / back wall).
- Connectivity: entry partition occupies only 2 of 9 cells on row j=6, door at i=7
  passable, i=1..5 and i=9 open on that row — cannot isolate any region. All other
  furniture blocks are single/double-cell islands against the back walls. Expect full
  connectivity to spawn (7,5); SE still runs the formal A* test per the engine
  contract (see wireframe doc for the full walk-path breakdown).

## Asset list (names = scene.json keys = atlas.json keys)

- Floors: floor_wood_0, floor_wood_1 (variant), floor_tile_0 (kitchen run)
- Walls: wall_int_0, wall_int_window_ne_0, wall_int_window_ne_1, wall_int_partition_0,
  wall_int_door_0
- Built-ins / large props: spr_wardrobe_shelf_0, spr_bed_0 (2x1), spr_wall_cabinets_kitchen_0
  (wall-mounted strip), spr_fridge_1, spr_sofa_1 (2x1), spr_tv_console_0, spr_table_round_0
- Small props: spr_cooktop_0, spr_sink_0, spr_oven_cabinet_0, spr_coffee_machine_0,
  spr_lamp_0, spr_chair_1 (x2 placements), spr_coat_hooks_0 (wall-mounted)
- Decor overlays (non-blocking): spr_decor_books_0, spr_decor_ceramics_0
- Plants: spr_plant_0, spr_plant_1
- Character: hero (reuse existing, no change)
- Palette: unchanged from v1 — wood_1/2/3, ground_1/2/3, metal_1, accent_a/accent_b.
  No new colors needed for this layout.
- Full naming/atlas-key table with per-asset notes: see
  SCENE_01_STUDIO_v2_ASSET_NAMING.md (same directory).

## Multi-tile props (engine, unchanged from v1)

2x1 props (spr_bed_0, spr_sofa_1) must z-sort correctly against the hero on every
adjacent tile. Engine owns the method; no "hero drawn under furniture while standing
in front of it." Same requirement now applies to the entry partition (wall_int_partition_0
x2 + wall_int_door_0 door gap passable, both partition cells cutaway-eligible like the
back walls) — SE owns the fade/cutaway mechanism.

## Deltas vs v1

- Bed wall moves from a desk+bed mix to a single built-in bed-wall unit
  (spr_wardrobe_shelf_0 over bed), matching reference; desk removed, not in reference
  scope.
- Kitchen moves from NW wall (v1) to NE wall (v2, kitchen end), and gains granular
  footprints (cooktop/sink/oven/coffee machine/fridge as separate sprites) instead of
  one fridge+stove+counter block.
- Door moves off the back wall onto a new freestanding entry partition (v1 had door on
  NE wall at (8,0)); this is the one new engine-facing requirement — partition
  cutaway.
- Dining nook, TV+sofa lounge corner, and second plant are new; v1 had neither.
- Spawn point moves from (8,1) to (7,5) to stay adjacent to the new door location.
- Six v1 prop keys drop out of the v2 layout: spr_stove_0, spr_counter_0, spr_desk_0,
  spr_chair_0, spr_shelf_0, spr_crate_0 (see ASSET_NAMING.md for disposition).
- Three v1 keys get new v2 variant numbers because their role/footprint changed:
  spr_fridge_0 -> spr_fridge_1, spr_sofa_0 -> spr_sofa_1, spr_chair_0 -> spr_chair_1.

## Out of scope for scene 1 (unchanged)

Outdoor tiles/props, bathroom, NPCs, audio, day/night.
