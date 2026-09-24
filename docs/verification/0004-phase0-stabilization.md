# Verification 0004: Phase 0 workspace stabilisation

**Status:** implemented and locally checked on 24 September 2026, on branch `codex/wolfbone-phase0-20260924` in fix commit `d20b488`. This record covers the stabilisation of the in-flight arithmetic and ink workspace. The original in-flight work was preserved in checkpoint commit `c553f6c`; the [roadmap](../proposals/0002-roadmap.md) remains a proposal. These results are from a local worktree, not a merge, remote CI run, deployment, or release.

## Changes exercised

- **Browser saves.** New writes use `wolfbone.workspace` and corresponding per-example keys. Earlier `wolfbone.workspace.v1` keys are read as a fallback but never rewritten by the new client. Version 1 and version 2 archives remain importable. An unreadable or unsupported newer save blocks automatic writes; the interface offers a download of its original stored text. Explicit import or confirmed example restore can replace a protected save. Before writing, the client compares the current key and, during migration, the legacy key with the text it last observed. A storage event from another tab pauses stale writes, including a `localStorage.clear()` event; the interface then prompts an export of the open workspace. Pending edits are flushed on page hide and client-side workspace unmount.
- **Undo.** Consecutive expression-only edits to one card occupy one Undo step. Blur or another accepted edit ends the group; rejected edits do not erase history or its Redo branch. Undo shortcuts while a card input is focused use workspace history. Cards, ink, finite functions, and layout continue to share the same archive history.
- **Canvas interactions.** Tray drops require Wolfbone's numeral data and a single digit; arbitrary plain-text drops and drops during Pencil drawing are ignored. Rejected card adds leave selection and tool state intact. Returning from Table to Diagram no longer refocuses the old card. Adding a collection after a card selects and fits the new collection. Six browser assertions were updated to the current heading text.

The implementation is in [storage](../../src/lib/workspace/storage.ts), [archive decoding](../../src/lib/workspace/archive.ts), [history](../../src/lib/workspace/history.ts), and the [workspace](../../src/components/workspace/workspace.tsx) and [canvas](../../src/components/workspace/function-canvas.tsx) components. The browser journeys are in [canvas tests](../../tests/canvas.spec.ts), alongside the existing [workspace](../../tests/workspace.spec.ts) and [library](../../tests/library.spec.ts) suites.

## Local checks

Node.js 24 was used through `mise exec node@24 --`. Playwright ran against an optimized local Next.js production build at `127.0.0.1:3100`, using the installed Google Chrome through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The counts below refer to the full suites, including earlier tests.

| Check | Recorded result | Scope |
| --- | --- | --- |
| `npm ci` | Passed | Locked dependency installation |
| `npm test` | 105 of 105 passed | Mathematical core, archives, save conflicts, history, library, and examples |
| `npm run library:verify` | Passed | Bundled mathlib metadata integrity: 321,329 declarations and 8,489 modules |
| `npm run typecheck` | Passed | TypeScript application checks |
| `npm run format:check` | Passed | Configured application and test formatting |
| `npm run build` | Passed | Optimized Next.js production build |
| `npm run test:e2e` | 35 of 35 passed | Browser workflows against the local production server and installed Chrome |
| `sh scripts/check.sh` | Passed | Markdown, links, YAML, and Git whitespace checks |

The new browser journeys check exact arithmetic and persistence, a grouped typing Undo and keyboard shortcut, save on rapid reload and client navigation, numeral placement and card movement, ink separation, version 1/2 file import, legacy-key migration, protected-save download, an all-storage clear in another tab, view-switch focus, collection selection, plain-text/Pencil drops, and a rejected add at the card limit. Storage unit tests cover corrupt and future saves, example-key migration, and changes to current or legacy keys before migration commits.

## What this result does and does not establish

These checks support the listed software behaviours for the tested cases. The active key separates new-client saves from the older client's legacy key, and the new client protects an observed conflicting save. Browser storage still has no multiuser synchronisation or atomic transaction across tabs; no exhaustive concurrent-tab stress test is claimed. An export remains the portable copy when changing browsers or clearing site storage.

The arithmetic evaluator computes exact rational results within declared limits, but no Lean checker runs here. A passing build, browser journey, or finite test is not a general mathematical proof or evidence of a faithful translation to MMT, OpenMath, or Lean. The broader contexts, mappings, evidence statuses, and new mathematical fragments in the roadmap remain proposed work.

`npm audit` reported two high-severity advisories on the development dependency path through `markdownlint-cli2` and `smol-toml`. The lockfile was not changed in this stabilisation, so the dependency update remains a separate release-readiness task. These local checks do not establish accessibility certification, performance at maximum canvas size, remote CI status, or public-release readiness.
