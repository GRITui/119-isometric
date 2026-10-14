# SCENE 01 — Studio apartment (v1, LOCKED by PO 2026-10-14, Krit direction)

The game's first scene is a small studio apartment interior. Supersedes the outdoor
grass/path sample map in data/scene.json and the outdoor forks in ART_SCOPE.md for scene 1.
Grid/projection/palette/style unchanged: GRID_SPEC v1 + ISO ART SPEC v1 (tile 32x16 2:1,
ELEV_PX 16, depthKey (i+j)*1000+z, 16-color palette, NW light, no AA).

## Room
- Grid 10 (i) x 8 (j). i in [0,10), j in [0,8).
- CUTAWAY: only the two BACK walls are built — j=0 row (NE edge, upper-right) and i=0 column
  (NW edge, upper-left). Front edges (i=9, j=7) are open floor edges, no wall. Reason: the player
  must never be hidden behind a wall.
- Walls are 2 units tall (32px), blocked, z=0 base.
- Floor = interior i in [1,10), j in [1,8).

## Layout (grid coords (i,j); all props blocked)
| what                | asset              | footprint        | height |
|---------------------|--------------------|------------------|--------|
| front door (NE wall)| wall_int_door_ne_0 | (8,0)            | 2u     |
| window (NE wall)    | wall_int_window_ne_0 | (5,0)          | 2u     |
| window (NW wall)    | wall_int_window_nw_0 | (0,4)          | 2u     |
| other wall cells    | wall_int_0         | rest of i=0 / j=0| 2u     |
| fridge              | spr_fridge_0       | (1,1)            | 2u     |
| stove               | spr_stove_0        | (1,2)            | 1u     |
| counter + sink      | spr_counter_0      | (1,3)            | 1u     |
| desk (under window) | spr_desk_0         | (1,4)            | 1u     |
| chair               | spr_chair_0        | (2,4)            | 1u     |
| bed                 | spr_bed_0          | (1,5),(1,6)      | 1u     |
| floor lamp          | spr_lamp_0         | (1,7)            | 2u     |
| sofa (under window) | spr_sofa_0         | (4,1),(5,1)      | 1u     |
| bookshelf           | spr_shelf_0        | (7,1)            | 2u     |
| plant               | spr_plant_0        | (9,1)            | ~1.5u  |
| moving boxes        | spr_crate_0        | (7,6),(8,7)      | 1u     |
| rug (flat, walkable)| floor_rug_0        | (4..5, 2..3)     | 0      |
| kitchen floor       | floor_tile_0       | i 1..2, j 1..3   | 0      |
| wood floor          | floor_wood_0 / floor_wood_1 (variant) | everything else | 0 |

- Spawn: (8,1), just inside the front door, facing S.
- Connectivity: every walkable floor tile must reach spawn (A* test required).

## Asset list (names = scene.json keys = atlas.json keys)
- Floors (tiles.png, 32x16 cells): floor_wood_0, floor_wood_1, floor_tile_0, floor_rug_0
- Walls (tiles.png, h=32): wall_int_0, wall_int_window_ne_0, wall_int_window_nw_0, wall_int_door_ne_0
- Props (props.png, 64x64 cells, anchor bottom-center): spr_fridge_0, spr_stove_0, spr_counter_0,
  spr_desk_0, spr_chair_0, spr_bed_0 (2x1), spr_lamp_0, spr_sofa_0 (2x1), spr_shelf_0,
  spr_plant_0, spr_crate_0 (exists in Sprite Artist output as "crate")
- Character: hero (32 frames, done) — hero.png per ATLAS_SCHEMA.
- Interior palette: wood_1/2/3 floors + furniture, ground_1/2/3 walls/kitchen tile, metal_1
  appliances, accent_a/accent_b soft furnishings (bed, sofa, rug). No new colors.

## Multi-tile props (engine)
2x1 props (bed, sofa) must z-sort correctly against the hero on every adjacent tile. Engine owns
the method (e.g. slice the sprite per footprint cell, or depthKey = max(i+j) with tests); no
"hero drawn under the bed when standing in front of it" artifacts.

## Out of scope for scene 1
Outdoor tiles/props (grass, path, tree, rock), bathroom, NPCs, audio, day/night.
