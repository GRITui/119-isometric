# Pixel-Art Style Knowledge Base — Scene 01 Studio Apartment (2:1 iso)

Project context: Scene 01 studio apartment, 2:1 isometric, 64x32 tiles, 128px
sprite cell / 80-96px hero art, 16-colour environment palette, 48-colour hero
palette, PixelLab for hero generation (trial budget nearly exhausted — zero new
generations spent on this research).

Sources are footnoted `[n]`; see the end-of-document reference list and
`style-items.json` for the structured, per-claim version with recommendations.
Everything here is either a primary craft source, a dev-documented game
example, or a direct reading of our own PixelLab call logs — nothing is
invented.

## 1. Palette

A ramp is a dark-to-light run (3-9 colours) for one material; brightness rises
left→right, saturation peaks mid-ramp and drops at both ends or colours get
eye-burning (bright end) or muddy (dark end). Hue-shift the ramp — cooler/blue
shadows, warmer/yellow lights — rather than only changing value; "straight"
ramps that skip this look flat and clash with other ramps in the same scene [1].
Don't let palette selection block starting work: pick an existing named
palette (16 or 32 colours is common) and swap later — swapping a finished
piece's palette is cheap [2]. Hyper Light Drifter fixed a small 16-bit-style
light/dark palette early and has carried it as a brand constraint across
multiple projects rather than re-deriving colour per scene [3] — directly
supports locking our 16-colour env / 48-colour hero budget now rather than
re-tuning per room.

## 2. Line / outline

Start with a full dark outline to lock the silhouette, then apply selective
outlining ("selout"): replace outline pixels with lighter/body-matched colours
on the lit side (top/left under our NW light), keep the darkest line only
where the sprite meets background or needs internal segmentation. Over-
lightening background-facing edges breaks the silhouette against busy scenes
[2]. Our actual hero v3 PixelLab calls used the literal parameter value
`"outline": "single color black outline"` on `create-character-v3` — i.e. the
simplest full-outline mode, with no selective-outline PixelLab parameter
observed in the logs [8]. Small sprites often drop outlines entirely and let
colour blocks define the silhouette instead (classic Mario has no outline —
sideburns/overalls/sleeves carry the shape) [2].

## 3. Light / shading

Pick one light source — commonly front/above-left — and hold it constant
across every sprite in the set; think in volumes/forms (sculpt like clay), not
flat line-fills; squint-test should still show a few large light/dark
clusters. Flip-horizontal and full-desaturate are useful self-check tools for
proportion/shading errors [2]. Eastward's team built sprites from layered 2D
parts reassembled in a 3D scene and hand-painted per-piece into a bump map so
each part picks up correct per-tile lighting — a hybrid 2D/3D pipeline rather
than hand-painted flat shading [4]. A Short Hike instead renders a full 3D
world to a tiny offscreen texture and applies a custom unlit shader with a
stair-stepped lighting ramp, deliberately flattening shading bands to stay
crisp rather than noisy [5]. Octopath Traveler's team found flat 2D lighting
insufficient and added true 3D depth/DOF, then had to re-balance resolution
and saturation because over-resolved sprites lose the pixel-art read [6] — a
caution against over-engineering lighting at our small scale.

## 4. Anti-aliasing / dithering

AA = an intermediate colour at the inner corner of a staircase/jaggy edge,
only on steps 2+ pixels long — never AA a 45°/1px step or an already-straight
line (the main cause of "too much AA" blur); the AA run length should scale
with the step length. Blend-colour value matters more than hue/saturation for
small palettes. Never AA the outer edge of a sprite meant to sit on an unknown
background colour — tune inner-only [1][2]. Dithering fakes an intermediate
shade between two colours with a noise pattern instead of adding a palette
colour, mainly to kill banding on large flat areas or suggest rough texture;
some artists skip it entirely. Bitmap Brothers and PC-98-era Japanese titles
are the commonly cited heavy/skilled dithering studios [2].

## 5. Readability / silhouette

Visible flat colour bands read as flat/blurry — fix with "band compression"
(squeeze the band into a tiny area) or rotate the gradient/AA direction to
match the surface slope. A line is a lower-resolution translation of an
intended line; every half-filled edge pixel is a deliberate AA decision, and
jaggies are unavoidable but should be minimised [1][2]. A Short Hike pairs a
soft edge-detect outline pass with distance fog specifically to compensate for
low-pixel-count noise at a distance [5].

## 6. Scale & detail density

Craft tutorials often start at a large canvas (Derek Yu uses 96x96) because
the same shading/AA/selout techniques are easier to demonstrate large, then
scale down; smaller sprites lean more on colour-defined shapes than outlines
[2]. Saint11 runs dedicated "Scaling Pixel Art" / "Big Pixel Art" series on
detail-density tradeoffs at different canvas sizes [2][7]. Unpacking fixed the
smallest drawable unit (a mug) first and scaled/abstracted every other prop
relative to it, rather than drawing true relative size — directly applicable
to our 128px-cell prop scale decisions [9].

## 7. Isometric / tile conventions

Pixel-art iso uses a 2-pixel-across / 1-pixel-down angle (~26.565°), not true
30° CAD isometric, which looks jaggy at pixel scale; documented tile-size
guidance (32x16, 64x32, 128x64) matches our 64x32 spec directly [10]. Two
established wall conventions: draw walls slightly outside/overlapping the tile
boundary (Sims-style — needs 4 directional variants) or give each wall its own
full tile (needs only 1 asset) [11][12]. The Sims' own design documentation
lists concrete iso-room pitfalls: ambient-only wall lighting bands at low
light, objects without shadows appear to float, and multi-tile objects poke
through walls [11] — a direct checklist for our wall/floor/prop QA pass.
Final Fantasy Tactics aligns every body landmark (shoulders, hips, eyes, feet)
to the same diagonal as the floor plane so a chibi sprite reads as standing on
the iso grid, and covers all 4 cardinals via a front/back mirrored pose pair
[13]. Flat-textured ground tiles plus perpendicular 2D billboard quads (grass,
props) deliver iso depth without true 3D geometry [14].

Craft-researcher flag: no named-artist primary source was found specifically
for iso tile/wall pixel conventions beyond the game-reference evidence above —
treat the game-level sources ([10]-[14]) as the citation basis for this
category rather than a craft tutorial.

## 8. Animation

Octopath's team iterated their lighting-first HD-2D pipeline because a
"just add dramatic lighting to flat 2D art" approach was insufficient; this
iteration lesson generalises to any animation/shading pass on top of base
sprites [6]. D-Pad Studio (Owlboy, GDC 2017) redrew assets multiple times
across the 10-year production specifically so the finished game wouldn't look
"10 years out of date" — evidence that style consistency across an animation
set requires periodic redraws, not one static style guide [15]. No primary
craft source specific to walk-cycle/animation timing was independently
re-verified in this pass beyond Saint11's tutorial index, which lists a Walk
Cycle tutorial without an extracted claim here [7].

## 9. Characters

Small sprites rely on colour blocking over fine facial detail — see Scale &
Detail Density above [2]. Hyper Light Drifter commits to bold flat colour
blocking over gradient shading as a deliberate house-style discipline to keep
characters legible against saturated environments [3]. No primary source for
small-sprite face construction specifically was independently verified this
pass (see Gaps, below).

## 10. Props / interiors

Unpacking greyboxes rooms directly in Aseprite on a placement grid, then
splits furniture into layered pieces for depth before import — a grid-first
workflow inside the art tool itself [9]. Habbo Hotel's entire interior-building
model is a shared modular "furni" catalog placed into a fixed iso grid — the
direct ancestor of cozy iso room-building games, with long-lived rooms (e.g.
the Library) keeping consistent furni layout/identity across years [16][17].
No primary craft-tutorial source for prop/interior pixel-art construction
specifically was independently verified this pass (see Gaps).

## 11. UI-in-pixel

Not covered by a verified primary or game-documented source in this research
pass. PixelLab exposes a dedicated UI endpoint (`POST /generate-ui-v2`,
description examples: "pixel art dialogue box with decorative border", "sci-fi
health bar with neon glow") [8], but no craft or game-postmortem source was
found and verified to support style claims for in-game pixel UI — flagged as
an explicit gap rather than guessed.

## 12. PixelLab style parameters

Documented endpoints relevant to our pipeline, from the v2 API docs/llms.txt
[8]:
- `POST /create-character-v3` — the primary character endpoint: 8 directional
  views stored server-side under a character id. Body fields actually used in
  our hero v3 calls: `description`, `image_size` ({width:88,height:88}),
  `view` (`"low top-down"` / `"high top-down"` tested), `seed`, `n_directions`
  (8), `no_background` (true), `outline` (`"single color black outline"`),
  `detail` (`"medium detail"`), `name`.
- `CameraView` enum (from the OpenAPI schema) is exactly `["side", "low
  top-down", "high top-down"]` — there is no raw "isometric" view value; our
  2:1 iso look is achieved via "low top-down" / "high top-down", not a
  dedicated iso camera mode [8].
- `outline` and `detail` are free-text-ish style descriptors passed directly
  in the request body (not a fixed enum in the samples seen); our call logs
  show the literal strings above, not `style_description` or
  `reference_image` / `style_character_id` / `color_image` / `force_colors` —
  those richer style-transfer fields exist on other endpoints
  (`generate-with-style-v2`, `create-image-bitforge`, `transfer-outfit-v2`,
  `image-to-pixelart`) but were not exercised by the hero v3 calls inspected
  [8].
- `POST /unzoom` should run on any user-supplied reference art before feeding
  it to a reference/style endpoint — upscaled pixel art confuses the style
  models and is "the most common cause of disappointing output" per the docs
  [8]. Relevant if we ever feed a hand-drawn reference into PixelLab for style
  matching.
- `POST /reduce-colors` (`num_colors` param) is the documented way to cap a
  generated image's palette server-side; our pipeline currently does this
  locally instead (`quantize_hero.py`, MEDIANCUT quantize to a 48-colour cap,
  then re-binarizes alpha to strict 0/255) — functionally equivalent, just
  done client-side rather than via the API [per inspection of
  t_4609b12b/quantize_hero.py, workspace-local, not a public source].
- Animation: `POST /animate-with-text-v3` is the recommended default mode
  ("v3" over legacy "pro" — cheaper, usually better quality; "pro" costs
  10-25 generations per direction) [8].
- Tilesets: `POST /create-tileset` generates Wang tiles with matching edges for
  connected top-down maps.

## Gaps (explicit, not papered over)

- Iso wall/tile pixel-art conventions: no named-artist craft-primary source
  found; relying on game-documented sources instead (see §7).
- Small-sprite face design: no verified primary source found this pass.
- Interior/prop pixel-art construction craft tutorial: no verified primary
  source found this pass (Unpacking/Habbo are game-level, not craft-tutorial,
  sources).
- UI-in-pixel style claims: no source found and verified at all; PixelLab
  params only (§12).
- Animation/walk-cycle timing: Saint11 lists a relevant tutorial but no claim
  from it was independently re-extracted and verified in this pass.

## References

[1] Raymond Schlitter (Slynyrd), "Pixelblog - 1 - Color Palettes",
http://slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes (accessed 2026-10-14)
[2] Derek Yu (Spelunky), "Pixel Art Tutorial: Basics",
https://www.derekyu.com/makegames/pixelart.html (accessed 2026-10-14)
[3] Polygon, "Possessors Heart Machine developer interview",
https://polygon.com/possessors-heart-machine-developer-interview (accessed 2026-10-14);
Gamedeveloper, "Tossing out textures to build a visual bridge from Hyper Light
Breaker to its predecessor",
https://gamedeveloper.com/art/tossing-out-textures-to-build-a-visual-bridge-from-hyper-light-breaker-to-its-predecessor
(accessed 2026-10-14)
[4] Gamedeveloper, "Eastward's creators share insights on making pixel art
adventures",
https://www.gamedeveloper.com/art/eastward-s-creators-share-insights-on-making-pixel-art-adventures
(accessed 2026-10-14)
[5] PlayStation Blog, "Crafting a tiny open world: a look behind the scenes at
the creation of A Short Hike",
https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike
(accessed 2026-10-14); GDC postmortem talk (YouTube),
https://youtube.com/watch?v=ZW8gWgpptI8 (accessed 2026-10-14)
[6] Nintendo Everything, "Octopath Traveler devs on character origins, visual
style, initial HD Rumble plans, much more",
https://nintendoeverything.com/octopath-traveler-devs-on-character-origins-visual-style-initial-hd-rumble-plans-much-more/
(accessed 2026-10-14); Siliconera,
https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/
(accessed 2026-10-14)
[7] Pedro Medeiros (Saint11), "Pixel Art Tutorials" index,
https://saint11.art/blog/pixel-art-tutorials (accessed 2026-10-14)
[8] PixelLab API docs — https://api.pixellab.ai/v2/llms.txt,
https://api.pixellab.ai/v2/docs, https://api.pixellab.ai/v2/openapi.json
(all accessed 2026-10-14)
[9] Eurogamer, "How Unpacking's art combines beauty with clarity",
https://www.eurogamer.net/how-unpackings-art-combines-beauty-with-clarity
(accessed 2026-10-14); Gamedeveloper, "Intimacy from the inanimate in
house-moving puzzler Unpacking",
https://www.gamedeveloper.com/design/intimacy-from-the-inanimate-in-house-moving-puzzler-unpacking
(accessed 2026-10-14)
[10] CLIP STUDIO TIPS, "Pixel Art Isometric #1",
https://tips.clip-studio.com/en-us/articles/4969 (accessed 2026-10-14)
[11] donhopkins.com, The Sims design document PDF,
https://donhopkins.com/home/TheSimsDesignDocuments/TheStateOfTheArtAndGoingForwardToE3.pdf
(accessed 2026-10-14)
[12] StackOverflow, "What's the best way to implement and design walls in an
isometric tile game",
https://stackoverflow.com/questions/11482316/whats-the-best-way-to-implement-and-design-walls-in-an-isometric-tile-game
(accessed 2026-10-14)
[13] Pixel Art Class, "Isometric Character Basics" (YouTube),
https://youtube.com/watch?v=45gueF62t1Q (accessed 2026-10-14)
[14] gamedev.stackexchange, "How is 3D texture on a ground tile in an
isometric grid system",
https://gamedev.stackexchange.com/questions/28305/how-is-3d-texture-on-a-ground-tile-in-an-isometric-grid-system
(accessed 2026-10-14)
[15] Jo-Remi Madsen & Simon Stafsnes Andersen (D-Pad Studio), "'Owlboy': The
Evolving Art of a 10 Year Project" (GDC 2017),
https://gdcvault.com/play/1024144/-Owlboy-The-Evolving-Art (accessed 2026-10-14)
[16] IMissIt.com, "Habbo Hotel" history piece, https://imissit.com/habbo-hotel
(accessed 2026-10-14)
[17] HabboHistory, "Habbo Library", https://habbohistory.com/habbo-library
(accessed 2026-10-14)
</content>
