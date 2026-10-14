# ART SCOPE — Iso 2.5D (v1, DRAFT — pending Krit sign-off)

> SUPERSEDED for Scene 01 (2026-10-14): Krit chose a studio-apartment first scene.
> Scene 01 asset list + layout: SCENE_01_STUDIO.md. Outdoor forks below are deferred.

What to draw. Reference (already LOCKED, do not re-decide):
- Grid/projection: `GRID_SPEC.md` — tile 32x16 (2:1), ELEV_PX=16, depthKey (i+j)*1000+z.
- Style/palette/animation: ISO ART SPEC v1 (pixel workspace `iso_art_spec.md`) — crisp, no AA,
  1px ink outline on silhouettes only, NW lighting, 16-color shared palette.

Every asset below is on the 2:1 grid, on the 16-color palette, NW-lit. Footprint = grid cells.
Names MUST match `data/scene.json` asset keys exactly (the renderer already keys on them).

## A. Ground tiles (flat, z=0) — footprint 1x1 (32x16 diamond)
De-facto minimum (scene.json): `tile_grass_0` (default), `tile_path_0`.

RECOMMENDED v1 set:
| name          | note                          |
|---------------|-------------------------------|
| tile_grass_0  | default ground                |
| tile_grass_1  | 2nd variant (texture break)   |
| tile_path_0   | walkable path                 |
| tile_path_1   | 2nd variant                   |
| tile_water_0  | OPTIONAL — 2-frame anim (see E)|
| tile_sand_0   | OPTIONAL — shore/edge         |

FORK: (a) minimal = grass_0 + path_0 only · (b) recommended = +grass_1/path_1 · (c) expanded = +water/sand.

## B. Wall / height tiles — vertical extent 1-2 units (16-32px), footprint 1x1
De-facto minimum: `wall_wood_1` (h=1).

RECOMMENDED v1 set:
| name          | height | note            |
|---------------|--------|-----------------|
| wall_wood_1   | 1      | wood, 1 unit    |
| wall_wood_2   | 2      | wood, 2 units   |
| wall_stone_1  | 1      | stone, 1 unit   |
| wall_hedge_1  | 1      | OPTIONAL        |

FORK: (a) minimal = wall_wood_1 only · (b) recommended = +wood_2/stone_1 · (c) expanded = +hedge.

## C. Prop sprites (placeable, z-ordered) — 1x1 base
De-facto minimum: `spr_tree_0`.

RECOMMENDED v1 set:
| name        | base | height   | note            |
|-------------|------|----------|-----------------|
| spr_tree_0  | 1x1  | up to 3u (48px) | canopy occludes behind |
| spr_rock_0  | 1x1  | 1u       |                 |
| spr_crate_0 | 1x1  | 1u       |                 |
| spr_bush_0  | 1x1  | 1u       | OPTIONAL        |

FORK: (a) minimal = tree only · (b) recommended = +rock/crate · (c) expanded = +bush.

## D. Characters — 1x1 base, 40-48px tall, 4 dirs (N/S/E/W)
De-facto minimum: hero (already ~done in Sprite Artist scratch).

RECOMMENDED v1: **hero only** (no NPCs yet).
FORK: (a) hero only · (b) +1-2 NPCs (name + palette role needed if chosen).

## E. Animation — LOCKED contract (ISO ART SPEC v1)
4 dirs x (walk 4 + idle 2 + interact 2) = 32 frames/character.
RECOMMENDED: keep as-is.
FORK: reduce to walk 4 + idle 2 (drop interact) = 24 frames/char, if frame count is the constraint.

## F. What is OUT of scope for v1 (deferred)
- Audio (Krit decision 2026-10-13: deferred to a later milestone).
- Extra biomes, day/night art variants, parallax background.
