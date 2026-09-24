# Canvas arithmetic and pencil verification

Local development verification on 21–22 September 2026. This records software behaviour, not a formal mathematical proof or a published release.

## Scope

- Typed integers, decimals, and arithmetic expressions on the existing dotted canvas.
- Dragging numeral tray items onto the canvas, moving expression cards, and inspecting exact results.
- Freehand mouse, touch, and stylus events stored as canvas-coordinate ink. No handwriting recognition.
- Version 2 archive fields for expression source strings and stroke points; legacy archive compatibility.
- Shared save, export/import, Undo, and Redo. Finite collections and functions remain independent mathematical content.

## Automated checks

The full unit suite passed with 90 tests. Arithmetic checks include precedence, signs, exact fractions, decimals, malformed input, zero division, source limits, and 5,040 independently cross-multiplied rational-operation cases. Archive/history checks cover legacy import, enriched archive round-trips, editable incomplete expressions, schema tampering, coordinate limits, layout changes, and Undo/Redo preservation.

TypeScript and source formatting checks passed during integration. Repository documentation checks passed. Production-build results are recorded with the final task output.

## Browser observations

Using the local app in the in-app browser:

- Added `2 + 2` through the canvas toolbar; its card displayed `4`.
- Changed the card to `2 + 3`; the result and expanded numeral exploration displayed `5`.
- Dragged a card header and observed its position change.
- Dragged `7` from the numeral tray and observed a new calculating card.
- Drew a pointer stroke, then observed the stroke disappear on Undo and return on Redo.

Source review found and corrected viewport recentering during ordinary card selection, accidental blank-card creation when double-clicking existing node headers, and the need to fit ink-only imports. Pointer selection is now separate from explicit requests to find or create a card.

**Follow-up, 24 September 2026:** Later browser checks reproduced a separate focus problem when returning from Table to Diagram: a previously focused card was selected and briefly took keyboard focus. The [Phase 0 stabilisation record](0004-phase0-stabilization.md) covers that repair and its browser journey. The source-review observation above did not establish view-switch focus behaviour.

## Limits

This evaluates numeric expressions, not variables or general symbolic equations. Supported operators are addition, subtraction, multiplication, and division with parentheses. The parser never executes user source as code. Result sizes and drawing sizes are bounded. No external proof checker is connected.
