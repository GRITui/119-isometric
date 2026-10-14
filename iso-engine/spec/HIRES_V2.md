# HI-RES v2 — 2x resolution (LOCKED by PO 2026-10-14, Krit direction)

Krit: "bigger tiles and sprites". Every pixel dimension doubles; projection, depth rule,
palette, lighting and style are unchanged. Supersedes the size numbers in GRID_SPEC v1,
ISO ART SPEC v1 and ATLAS_SCHEMA.md. Scene layout (SCENE_01_STUDIO.md) is unchanged:
it is in grid cells, not pixels.

| item                     | v1        | v2 (now)                     |
|--------------------------|-----------|------------------------------|
| tile (2:1 diamond)       | 32x16     | 64x32                        |
| ELEV_PX (1 height unit)  | 16        | 32                           |
| grid -> screen           | sx=ox+(i-j)*16, sy=oy+(i+j)*8-z*16 | sx=ox+(i-j)*32, sy=oy+(i+j)*16-z*32 |
| anchor                   | (sx, sy+16) | (sx, sy+32)                |
| depthKey                 | (i+j)*1000+z | unchanged                 |
| sprite canvas / anchor   | 64x64, (32,63) | 128x128, (64,127)       |
| character height         | 40-48px   | 80-96px, 1-tile footprint (64x32) |
| 2x1 prop footprint       | 48x24 diamond | 96x48 diamond            |
| wall 1u / 2u             | 16 / 32px | 32 / 64px                    |
| atlas cells              | tiles 32x16 (h 32), sprites 64x64 | tiles 64x32 (h up to 64), sprites 128x128 |
| UI legibility floor      | 390x844   | unchanged                    |

Palette: same 16 colours (SNES sprites are 16 colours; extra pixels go into detail, not colour).

## Native redraw, not upscale (hard rule)
v2 art is drawn at v2 size. A 2x nearest-neighbour upscale of v1 art is a FAIL: verify scripts
must assert the image is NOT made of uniform 2x2 blocks (count of 2x2 blocks with >1 colour > 0,
and well above zero on every frame). The extra resolution goes into detail: face features, cloth
folds, wood grain, appliance handles, book spines, leaf clusters, 1px highlights.

## Framing
10x8 room at v2 = 576x352 px incl. 2u back walls ((10+8)*32 wide, (10+8)*16+64 tall).
1280x720 fits at zoom 1 and zoom 2 (1152x704, tight); int zoom 1..3.
390x844 portrait does not fit the room at zoom 1: the camera follows the hero and the hero
is always fully on screen; no fractional zoom (keeps pixels crisp).

## Output budget (art workers have crashed on output caps)
Same batched rule as ART_GEN.md: one generator script per asset group, files only, never print
pixel data, stdout = verify summary. v2 frames are 4x the pixels — keep sprite_data.json per group.
