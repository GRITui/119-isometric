# SCENE 01 — Studio apartment (v2 PROPOSAL, reference-mapped wireframe)

Status: DRAFT, proposed by UX-UI, pending Krit decision-gate approval. Supersedes
SCENE_01_STUDIO.md (v1) on approval — v1 left untouched, do not edit it.

Source: redrawn-mood mapping of /Users/grit/.hermes/kanban/boards/team-room/shared/ref/scene01-reference.png
(bright Scandi studio, iso render) — not traced, zones and proportions only.

Grid/projection/palette/style unchanged from v1: GRID_SPEC v1 + ISO ART SPEC v1, engine
is HIRES v2 (64x32 tiles, 128px cells) but layout stays grid-cell-defined, resolution-independent.

## Room

- Grid kept at 10 (i) x 8 (j), as requested — fits all reference zones without cramming.
  i in [0,10), j in [0,8).
- CUTAWAY (engine constraint, unchanged): only the two BACK walls are built — column i=0
  (NW wall) and row j=0 (NE wall). Front edges (i=9, j=7) are open floor, no wall. Player
  must never be hidden.
- NEW in v2: a THIRD wall segment — the entry partition — is a freestanding interior wall
  at j=6, i=6 and i=8 (door gap at i=7). It is not a back wall and not part of the cutaway
  pair, but it sits between camera and interior near the entry path, so it needs the SAME
  "never hide the player" treatment (fade/cutaway when hero is behind/adjacent). SE owns
  the render technique; this spec only fixes where it sits and how big (1 cell each side
  of a 1-cell door gap, 2u tall, same as back walls).
- Walls are 2 units tall (32 engine-px equiv), blocked, z=0 base, unless noted.
- Floor = interior i in [1,10), j in [1,8).

## Reference mapping (room read → our axes)

- Back-left wall in ref → our i=0 (NW wall): built-in bed wall (wardrobe + open shelves
  above/beside headboard, bed below, floor lamp at foot).
- Back-right wall in ref, left portion → our j=0 row, i=1..6 (NE wall, kitchen end):
  upper cabinets/open shelves, cooktop, sink, base cabinet/oven, coffee machine, tall
  fridge at the far end nearest the windows.
- Back-right wall in ref, right portion → our j=0 row, i=7..9 (NE wall, window end):
  two windows; TV console + sofa sit on the floor in front of them, sofa perpendicular
  to console (lounge corner).
- Mid-floor between kitchen and windows → dining nook (round table + 2 chairs).
- Entry (standalone partition, not a back wall) → our j=6 row, i=6..8: partition + door
  + coat hooks, floor plant beside it.
- Plants: one near the bed-wall corner, one by the entry partition. Shelf decor (books/
  ceramics) on kitchen upper cabinets and bed-wall shelves.

## Layout (grid coords (i,j); all props blocked unless marked non-blocking)

| what                          | asset                      | footprint        | height | blocking |
|--------------------------------|----------------------------|-------------------|--------|----------|
| NW wall (bed side)             | wall_int_0                 | i=0, j=0..7       | 2u     | yes |
| NE wall (kitchen+window side)  | wall_int_0                 | j=0, i=0..9       | 2u     | yes |
| window (NE wall, kitchen end)  | wall_int_window_ne_0       | (7,0)             | 2u     | wall seg |
| window (NE wall, window end)   | wall_int_window_ne_1       | (9,0)             | 2u     | wall seg |
| wardrobe + open shelves        | spr_wardrobe_shelf_0       | (1,1)             | 2.5u   | yes |
| shelf decor (bed-wall)         | spr_decor_books_0          | (1,1) overlay     | 2.3u   | no (deco overlay) |
| bed                            | spr_bed_0                  | (1,2),(1,3)       | 1u     | yes |
| floor lamp                     | spr_lamp_0                 | (1,4)             | 2u     | yes |
| plant (bed-wall corner)        | spr_plant_0                | (2,4)             | ~1.5u  | yes |
| upper cabinets / open shelves  | spr_wall_cabinets_kitchen_0| (1,0)..(4,0) overlay on NE wall | 1u strip, z 1.5-2u | no (wall-mounted) |
| shelf decor (kitchen)          | spr_decor_ceramics_0       | (2,0),(3,0) overlay | 1.8u | no (deco overlay) |
| cooktop                        | spr_cooktop_0              | (2,1)             | 1u     | yes |
| sink                           | spr_sink_0                 | (3,1)             | 1u     | yes |
| oven / base cabinet            | spr_oven_cabinet_0         | (4,1)             | 1u     | yes |
| coffee machine (on counter)    | spr_coffee_machine_0       | (5,1)             | 1u     | yes |
| fridge (tall)                  | spr_fridge_1               | (6,1)             | 2u     | yes |
| TV console                     | spr_tv_console_0           | (8,1)             | 1u     | yes |
| sofa (perpendicular to TV)     | spr_sofa_1                 | (7,2),(8,2)       | 1u     | yes |
| dining chair A                 | spr_chair_1                | (4,3)             | 1u     | yes |
| dining chair B                 | spr_chair_1                | (5,2)             | 1u     | yes |
| dining table (round)           | spr_table_round_0          | (5,3)             | 1u     | yes |
| entry partition, left of door  | wall_int_partition_0       | (6,6)             | 2u     | yes, cutaway-eligible |
| coat hooks (on partition)      | spr_coat_hooks_0           | (6,6) overlay     | 1.8u   | no (wall-mounted) |
| front door                     | wall_int_door_0            | (7,6)             | 2u     | door opening, passable |
| entry partition, right of door | wall_int_partition_0       | (8,6)             | 2u     | yes, cutaway-eligible |
| plant (entry)                  | spr_plant_1                | (8,5)             | ~1.5u  | yes |
| wood floor                     | floor_wood_0 / floor_wood_1 (variant) | everything else interior | 0 | no |
| kitchen floor tile             | floor_tile_0               | i 1..6, j 1 (kitchen run) | 0 | no |

- Spawn: (7,5), just inside the door at (7,6), facing N (into the room, toward the
  dining nook / back wall).

## Walk-path / connectivity note (for SE's A* test — not run here)

Blocked cells (furniture + walls, not walkable):
- Wall ring: all i=0 (j=0..7), all j=0 (i=0..9).
- Bed wall: (1,1) wardrobe, (1,2) (1,3) bed, (1,4) lamp.
- Plant/bed corner: (2,4).
- Kitchen: (2,1) (3,1) (4,1) (5,1) (6,1).
- TV/sofa: (8,1), (7,2) (8,2).
- Dining: (4,3) (5,2) (5,3).
- Entry partition: (6,6), (8,6).
- Entry plant: (8,5).

Open/walkable cells: every other interior cell i=1..9, j=1..7, INCLUDING the door gap
at (7,6) which is a passable opening despite sitting on the partition row.

Connectivity check (visual, to be confirmed by SE's A* run): the entry partition only
occupies 2 of 9 cells on row j=6 (i=6 and i=8), with the door at i=7 passable and i=1..5
and i=9 open on that same row — so the partition cannot isolate any region; all furniture
blocks are single/double-cell islands against the back walls, none form a continuous
barrier. Expect full connectivity to spawn (7,5) with no island pruning needed, but SE
should still run the formal A* test per the engine contract.

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

## Multi-tile props (engine, unchanged from v1)

2x1 props (bed, sofa) must z-sort correctly against the hero on every adjacent tile.
Engine owns the method; no "hero drawn under furniture while standing in front of it."
Same requirement now applies to the entry partition (door gap passable, both partition
cells cutaway-eligible like the back walls) — SE owns the fade/cutaway mechanism.

## Deltas vs v1 (for the decision sheet)

- Bed wall moves from a desk+bed mix to a single built-in bed-wall unit (wardrobe+shelves
  over bed), matching reference; desk removed, not in reference scope.
- Kitchen moves from NW wall (v1) to NE wall (v2, kitchen end), and gains granular
  footprints (cooktop/sink/oven/coffee machine/fridge as separate sprites) instead of one
  fridge+stove+counter block.
- Door moves off the back wall onto a new freestanding entry partition (v1 had door on
  NE wall at (8,0)); this is the one new engine-facing requirement — partition cutaway.
- Dining nook, TV+sofa lounge corner, and second plant are new; v1 had neither.
- Spawn point moves from (8,1) to (7,5) to stay adjacent to the new door location.

## Out of scope for scene 1 (unchanged)

Outdoor tiles/props, bathroom, NPCs, audio, day/night.
