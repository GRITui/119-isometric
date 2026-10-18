# 9:47 VN — Full Playthrough QA Report

## Branch 1: The Commute
- **Path:** n1→n2→c1→n4→n5→n6→n7→n8→n9→n10→n11→n12→n13→n14→n15→n16→n17→n18→c2→n19→n20→n21→n22→n23→n24→e1
- **Ending:** The Commute ✓
- **Broken refs:** None
- **Dead ends:** None
- **Voice check:** PASS (Kenji internal/weary/precise throughout)

## Branch 2: The Step Off
- **Path:** n1→n2→c1→n4→n5→n6→n7→n8→n9→n10→n11→n12→n13→n14→n15→n16→n17→n18→c2→n25→n26→n27→n28→c3→n29→n30→e2
- **Ending:** The Step Off ✓
- **Broken refs:** None
- **Dead ends:** None
- **Voice check:** PASS (Mina warm/direct at n29; Kenji consistent)

## Branch 3: The Delay
- **Path:** n1→n2→c1→n4→n5→n6→n7→n8→n9→n10→n11→n12→n13→n14→n15→n16→n17→n18→c2→n31→n32→n33→n34→n35→e3
- **Ending:** The Delay ✓
- **Broken refs:** None
- **Dead ends:** None
- **Voice check:** PASS (Daichi anxious/fast at n32; Mina warm at n34; Kenji consistent)

## Save/Restore
- **Test:** Save at c1 (choice node) → title → LOAD → slot 1
- **Result:** PASS — restored to c1, both choices visible, state matches

## Replay
- **Test:** Ending screen (THE COMMUTE) → REPLAY button
- **Result:** PASS — returned to n1 (KENJI, apartment), fresh state

## Edge Cases
| Case | Pass | Details |
|------|------|---------|
| Fast-click during typewriter | **FAIL** | Rapid clicks (10+) can soft-lock the typewriter — text freezes mid-sentence, arrow never pulses, no further clicks advance. See BUG-2. |
| Choice during typewriter | ✓ | Choices only appear after typewriter completes |
| Save at choice node | ✓ | Stores nodeId=c1, restores to c1 with choices |
| Save in all 3 slots | ✓ | Slots 1/2/3 fill independently, no conflict |
| Overwrite filled slot | ✓ | Slot 1 overwritten n5→n4, timestamp updated |
| Load after ending | ✓ | Title → LOAD works from ending state; mid-branch save resumes correctly |
| Save to empty slot | **FAIL** | Triggers `confirm('Load?')` — wrong message, blocks UI. See BUG-1. |

## Character Voice
- **Kenji** (internal/weary/precise): PASS — all 24 lines consistent
- **Mina** (warm/direct/questions): PASS — all 5 lines consistent
- **Daichi** (anxious/fast-talking): PASS — all 4 lines consistent

## Bugs

### BUG-1: Save UI shows "Load?" confirm for empty-slot save
- **Location:** `vn/src/title.js`, `showSaveSlots()`, line 108.
- **Code:** `if (action === 'load' || confirmFn('Load?'))`
- **Issue:** For an empty slot, `action='save'`, so `action === 'load'` is false, and `confirmFn('Load?')` is called. This shows a "Load?" confirm dialog for a save action — wrong message, and it blocks the UI until the user responds.
- **Impact:** Every save to an empty slot requires a confirm click with the wrong label. In automated testing, this blocks the daemon (native `confirm()` is modal).
- **Fix:** Change to `if (action === 'load' ? confirmFn('Load?') : action === 'overwrite' ? confirmFn('Overwrite?') : true)`.
- **Severity:** Medium (UX friction + blocks automation).

### BUG-2: Typewriter stuck under rapid input
- **Location:** `vn/src/dialog.js`, `show()` / `complete()`.
- **Issue:** Rapidly clicking the app (to advance) while the typewriter is running can leave the dialog in a stuck state: text is mid-typing, arrow is not pulsing, and further clicks do not advance. The typewriter interval appears to be cleared before the text completes, and `complete()` returns early if `typing` is already false.
- **Reproduction:** Start new game, rapidly click the app 10+ times during n4's typewriter. The text freezes mid-sentence, arrow opacity stays 0, and no further clicks advance.
- **Impact:** Player can get stuck on a node and must reload the page to recover.
- **Fix:** In `advance()`, if `isTyping()`, call `complete()` and return (don't advance). Ensure `complete()` always sets the full text and pulses the arrow, even if called multiple times.
- **Severity:** High (player can get soft-locked).

## Findings
1. **Typewriter speed:** 30ms/char is very slow for long nodes (n2 = 412 chars = 12.4s). Consider 15-20ms/char or a "click to skip" indicator.
2. **c1 choices both go to n4:** Both c1 choices (carry key / leave key) lead to the same node n4. The choice has no mechanical effect. This is a story design choice, not a bug, but worth flagging.
3. **No save at ending:** HUD SAVE button is hidden on ending screens (correct behavior).
4. **Load from ending save:** Loading a save at an ending node (e1) correctly shows the ending screen.
5. **BUG-1 (confirm dialog):** Save to empty slot shows "Load?" confirm — wrong message, blocks UI. See Bugs section.
6. **BUG-2 (typewriter soft-lock):** Rapid clicks can freeze the typewriter mid-text. Player must reload to recover. See Bugs section.

## Summary
- **3/3 endings reachable:** PASS
- **Save/restore:** PASS (mid-branch, choice node, all 3 slots, overwrite)
- **Replay:** PASS
- **Edge cases:** 5/7 PASS, 2 FAIL (BUG-1, BUG-2)
- **Character voice:** PASS
- **Broken references:** None
- **Dead ends:** None
- **Bugs:** 2 found (BUG-1: confirm dialog on empty-slot save, BUG-2: typewriter soft-lock under rapid input)
