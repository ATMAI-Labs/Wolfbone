# Verification 0001: the first local workspace

**Recorded:** 7 September 2026, with the final browser capture at 05:03:29 UTC. The first local prototype is implemented and verified within the scope below. This record covers local execution; GitHub Actions is configured but a remote CI run and deployment are not part of this result.

## Environment and checks

The application used its locked dependencies and an optimized Next.js production build. Browser checks ran in Chrome 152.0.7977.77 against the local server on port 3100. Browser coverage included desktop dimensions of 1512 × 982 and a mobile viewport of 390 × 844, with additional readability snapshots; the same test count should not be interpreted as a complete duplicate suite on every viewport. Responsive capture showed no horizontal overflow at 1512 × 982, 1280 × 800, 1024 × 768, and 390 × 844, and no runtime errors were observed in that capture.

| Check | Recorded result | Scope |
| --- | --- | --- |
| `npm ci` | Passed | Locked dependency installation |
| `npm run test` | 43 of 43 passed | Finite mathematical core and workspace archive |
| `npm run typecheck` | Passed | TypeScript application checks |
| `npm run build` | Passed | Optimized Next.js production build |
| `npm run test:e2e` | 11 of 11 passed | Browser workflows against the local application |
| `npm run format:check` | Passed | Source, test, and selected configuration formatting |

The suites are maintained in [core tests](../../src/lib/math/model.test.ts), [archive tests](../../src/lib/workspace/archive.test.ts), and [browser tests](../../tests/workspace.spec.ts). The [contribution guide](../../CONTRIBUTING.md#before-submitting-a-pull-request) records how to run them. Documentation integrity is checked separately with `sh scripts/check.sh`.

## Workflows exercised

- Create a new labelled collection and function through ordinary controls; newly added collections come into view automatically.
- Complete and edit assignments, compose compatible functions, and inspect exact finite results. Incomplete or cancelled composition remains consistent between diagram and table.
- Compare functions and inspect a concrete input with differing outputs as a counterexample to equality.
- Undo and redo mathematical edits; keep table, diagram, and exported file in agreement.
- Reload browser-local state and round-trip the versioned archive. Invalid imports retain the current workspace; malformed saved browser data is protected rather than silently overwritten.
- Move collection cards with the pointer and keyboard while preserving their mathematical mappings. Construct connections through keyboard controls.
- Exercise Unicode and punctuation in identifiers and check that DOM control IDs remain unique.
- Inspect desktop and mobile presentation and readability. No initial runtime console errors were observed during the checked startup.

These results concern the tested behaviours and fixtures. Source-format checks and screenshots contribute different evidence from mathematical assertions and interactive browser checks.

## What this result establishes

The finite model is independent of canvas layout. Composition requires the same middle set identity, and comparison requires the same declared domain and codomain before checking every input. The archive retains mathematical records separately from layout. The tests support these behaviours for the checked implementation and cases.

The current canvas shows expanded collection cards and element assignments. A collapsed collection/category overview remains future work. The document supplies the local finite-set context; this prototype does not implement a general calculus of contexts.

The selected composition pair belongs to interface state. Adding a computed result stores a complete finite mapping snapshot, without persistent derivation links to source-function IDs. A selected pair can be recomputed; the stored result does not automatically track later edits to its sources.

## Limits

- The workspace is single-user and browser-local; there is no collaborative synchronisation.
- Full mathlib, MMT, AXLE, and other proof-engine integrations are absent. Source links are references rather than checked adapters.
- Exact finite evaluation and these tests do not establish a universal mathematical theorem, a verified translation between foundations, or a proof that Wolfbone's general core is minimal.
- Desktop and mobile checks do not establish comprehensive assistive-technology compatibility or accessibility certification.
- There is no measured claim about DOM performance at maximum supported graph sizes or full-corpus scale.
- Local installation, build, and browser results do not establish a remote CI result, public deployment, or release.

The [architecture decision](../architecture/0001-first-workspace.md) records the selected technology and continuing acceptance obligations.
