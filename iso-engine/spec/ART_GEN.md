# ART GENERATION — batched strategy (fix for output-cap crashes)

Background Artist (t_0354be02) gave up twice on **output-cap crashes** — one big PIL dump
exceeded the output budget. This sheet locks the process so that doesn't recur.

## Rule: generate in batches, never one big dump
- One script run per asset GROUP (e.g. all ground tiles, all wall tiles, all prop sprites,
  the hero). Each run emits its own PNG + its own `sprite_data.json` slice.
- A crash loses ONE batch, not the whole set. Re-run only the failed batch.

## Output budget (the actual fix)
- Write pixels to FILES (PNG + JSON). Do NOT print pixel arrays to stdout/chat.
- Stdout = verify results only: counts, on-palette check, decode==JSON result, exit code.
- Keep each run's stdout under a few KB. If a verify needs to show pixels, write a contact
  sheet PNG and reference the path — don't inline the grid.

## Per-batch verify (must pass before commit)
- Re-decode pixels from the emitted PNG; assert decode == JSON (0 mismatch).
- On-palette: <=16 distinct colors, all in the ISO ART SPEC v1 16-color set.
- Grid size correct (tile 32x16; sprite cell 64x64; wall h in {16,32}).
- 4x nearest-neighbor sheet == exact nearest (for the contact/preview sheet only).
- Exit 0. No exit 0 without a green verify.

## Commit cadence
- One commit per asset group, message: `iso-engine: <group> <tiles|sprites> - <kanban task id>`.
- Update `data/atlas.json` in the SAME commit as the sheets it describes (no orphan refs).
- Push to `GRITui/119-isometric` main after each green batch so QA can sample incrementally.

## Script hygiene
- Never name a script after a stdlib module (no inspect.py, copy.py, json.py).
- Scripts live in the asset's workspace; only the emitted assets + atlas.json land in the repo.
