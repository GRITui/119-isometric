# Scene01 Furniture Asset List (v2 — Scandi studio)

Cell scale: 128px (HIRES v2 engine). Ramp names are placeholders mirroring
t_4af62a86's env palette derivation (oak-light, wall-warmwhite, wall-lightgrey,
textile-grey, sage-green, accent-black, window-glass) — confirm exact hex/ramp
IDs against scene01_palette_v2.json once that card completes; names should
match 1:1, no re-deriving.

| # | Item | Footprint (cells) | Height class | Approx px height @128 | Primary ramp |
|---|------|--------------------|-----------------|--------------------------|----------------|
| 1 | Bed wall unit — wardrobe + shelves (upper) | 2x1 | tall (wall-mounted, floor-to-ceiling) | ~256px | oak-light |
| 2 | Bed (frame + grey bedding) | 2x1 | floor | ~96px | textile-grey (bedding), oak-light (frame) |
| 3 | Floor lamp (bed-wall corner) | 1x1 | tall | ~176px | accent-black (base/stem), wall-warmwhite (shade) |
| 4 | Kitchen upper cabinets | 2x1 | wall-mounted | ~120px | oak-light |
| 5 | Kitchen open shelves | 1x1 | wall-mounted | ~110px | oak-light |
| 6 | Cooktop (countertop insert) | 1x1 | counter | ~90px (incl. base cabinet) | wall-lightgrey (counter), accent-black (hob) |
| 7 | Sink (countertop insert) | 1x1 | counter | ~90px | wall-lightgrey |
| 8 | Base cabinets (run, excl. oven/sink/cooktop footprints) | 2x1 | counter | ~90px | oak-light |
| 9 | Oven (under-counter) | 1x1 | counter | ~90px | accent-black front, wall-lightgrey frame |
| 10 | Coffee machine (counter prop) | 1x1 | counter | ~50px (prop on 90px counter) | accent-black |
| 11 | Fridge (tall unit) | 1x1 | tall | ~220px | oak-light (panel front) |
| 12 | Dining table (round) | 2x2 | floor | ~90px | oak-light |
| 13 | Dining chair (white, x2 — one footprint, placed twice) | 1x1 | floor | ~85px | wall-warmwhite |
| 14 | TV console (low) | 2x1 | floor | ~60px | oak-light |
| 15 | TV (on console) | 1x1 | counter | ~70px (on 60px console) | accent-black |
| 16 | Sofa | 2x1 | floor | ~110px | textile-grey |
| 17 | Entry partition wall (standalone, cutaway) | 1x2 | tall (floor-to-ceiling) | ~256px | wall-warmwhite |
| 18 | Door (in partition) | 1x1 | tall | ~220px | wall-warmwhite panel, accent-black handle |
| 19 | Coat hooks (wall-mounted, on partition) | 1x1 | wall-mounted | ~40px | accent-black |
| 20 | Floor plant — bed-wall corner | 1x1 | floor | ~130px | sage-green (foliage), oak-light (pot) |
| 21 | Floor plant — entry partition | 1x1 | floor | ~130px | sage-green (foliage), oak-light (pot) |
| 22 | Shelf decor — kitchen open shelves (books/ceramics) | sub-cell prop | wall-mounted | ~30-50px | wall-lightgrey / accent-black mixed |
| 23 | Shelf decor — bed-wall shelves (books/plant) | sub-cell prop | wall-mounted | ~30-50px | sage-green / oak-light mixed |

Notes:
- Kitchen run items (4–11) kept as separate footprints per brief; base cabinets
  fill gaps between cooktop/sink/oven in the run, not drawn as one giant block.
- Window units intentionally excluded — those are wall/env geometry owned by
  Background Artist (t_4af62a86 sibling), not sprite assets.
- Heights are approximate, measured against the 128px cell as the floor-tile
  depth reference; final px will be confirmed against PixelLab canvas output
  once Phase B opens (0 gens this phase).
