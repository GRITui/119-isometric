# 9:47 — Layout Spec (vn/SPEC.md)

SOT for all VN UI. Dark/neon language: bg #05070d, teal #5eead4, faint grid, rounded panels, uppercase letter-spaced type, system fonts, zero external deps.

## 1. Dialog Box
- Position: bottom-anchored, full-width minus 48px side margins.
- Size: 160px tall (120px text + 40px name bar).
- Panel: bg rgba(5,7,13,0.82), 1px border #1c2b33, 8px radius, 1px teal top-accent line.
- Name bar: speaker name uppercase, letter-spacing 0.12em, 13px, teal #5eead4, left-aligned, 12px padding.
- Text: 16px, line-height 1.6, color #d8e2e8, max 3 lines visible (scroll if longer).
- Typewriter: 30ms/char. Click/Space advances. Click during type = show full text instantly.
- Advance indicator: small teal ▸ bottom-right, pulses when text complete.

## 2. Portrait
- Bust-up (head + shoulders), bottom-anchored.
- Size: 420px tall, ~320px wide (aspect from art).
- Placement: left (x: 48px) for Kenji/Mina, right (x: calc(100% - 48px - 320px)) for Daichi. Center for group/none.
- Layer: above background, below dialog box.
- Swap: 150ms crossfade. No portrait = null (empty).
- Expression swap: same crossfade, same position.

## 3. Background
- Full-bleed, 16:9, cover. Layer 0 (bottom).
- 3 backgrounds: apartment (iso render), shop, platform.
- Crossfade: 400ms opacity transition on bg change.
- Faint grid overlay: 1px lines, rgba(94,234,212,0.04), 40px cells, on top of bg, below all UI.
- Vignette: radial gradient, transparent center → rgba(0,0,0,0.4) edges.

## 4. Title Screen
- Full-bleed bg #05070d + grid overlay.
- Title "9:47" centered, 72px, uppercase, letter-spacing 0.3em, teal #5eead4, subtle glow (text-shadow 0 0 24px rgba(94,234,212,0.3)).
- Subtitle "a salary man story" 14px, #6b7d85, letter-spacing 0.2em, 16px below title.
- Menu buttons (vertical, centered, 24px apart): NEW GAME, LOAD, (no settings in phase 1).
- Button: 200px wide, 48px tall, 1px border #1c2b33, 8px radius, bg rgba(5,7,13,0.6), uppercase 14px letter-spacing 0.12em, #d8e2e8. Hover: border teal, bg rgba(94,234,212,0.08).
- Click NEW GAME → start at story.json start node. Click LOAD → save-slot UI.

## 5. Ending Screen
- Triggered when node id is in endings[] (e1, e2, e3).
- Full-bleed bg #05070d + grid overlay.
- Ending title centered, 36px, uppercase, letter-spacing 0.2em, teal.
- Ending text: 18px, #d8e2e8, max-width 560px, centered, line-height 1.8, below title 32px.
- Buttons (horizontal, centered, 16px apart): TITLE SCREEN (primary, teal border), REPLAY (secondary, #1c2b33 border).
- No save on ending screen (save slots only during story).

## 6. Save-Slot UI
- 3 slots, vertical list, centered, 16px apart.
- Slot: 320px wide, 56px tall, 1px border #1c2b33, 8px radius, bg rgba(5,7,13,0.6).
- Slot content: left = "SLOT 1/2/3" uppercase 12px #6b7d85; right = timestamp (if saved) 12px #6b7d85.
- Hover: border teal.
- Click empty slot = save. Click filled slot = load (with confirm: "Overwrite?" for save, "Load?" for load).
- Back button top-left: "← BACK" uppercase 12px letter-spacing 0.12em, #6b7d85, hover teal.
- Storage: localStorage, key "vn947_save_{n}", value JSON { nodeId, ts, speaker }.

## 7. Choice UI
- Triggered when node has choices[].
- 2-3 options, vertical stack, centered, 12px apart.
- Option: 360px wide, 52px tall, 1px border #1c2b33, 8px radius, bg rgba(5,7,13,0.7), 16px text #d8e2e8, centered.
- Hover: border teal #5eead4, bg rgba(94,234,212,0.1), text #fff.
- Click = advance to choice.next. No typewriter on choices (instant).
- Dialog box hidden during choice (replaced by choice UI).

## 8. Z-Order (bottom → top)
1. Background (full-bleed)
2. Grid overlay
3. Vignette
4. Portrait
5. Dialog box / Choice UI
6. Title/Ending/Save screens (full-bleed, replace all)

## 9. Viewport
- 16:9, min 1024×576. Letterbox if aspect differs.
- No scroll. All UI fits within viewport.
