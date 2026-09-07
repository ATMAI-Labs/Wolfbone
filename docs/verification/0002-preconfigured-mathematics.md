# Verification 0002: preconfigured mathematics

**Status:** implemented and locally verified within the scope below, 7 September 2026. This record covers local execution; it does not report a remote CI result or public deployment.

The [architecture decision](../architecture/0002-preconfigured-mathematics.md) defines content kinds, preservation conditions, and remaining boundaries.

## Populated content

- 166 original explanations across twelve mathematical areas.
- 669 typed editorial relationships, preserving dependencies, classification, and association separately.
- 321,329 imported mathlib declaration records and 8,489 modules from the pinned source snapshot.
- Sixteen original, editable finite constructions, each with separate browser storage.

The imported records are declaration metadata, not theorem statements or checked proof objects. Original explanations have been reviewed for mathematical meaning and source context; this review is not formal certification.

## Local checks

| Check | Result | What it establishes |
| --- | --- | --- |
| Locked dependency installation | Passed | `npm ci` completed |
| Unit suites | 72 of 72 passed | Finite mathematics, archives, history, seed examples, concept relationships, and metadata search |
| Corpus integrity | Passed | All artifact hashes, record identities, kind/module references, counts, and reciprocal in-corpus imports |
| Type checking | Passed | Application types agree |
| Production build | Passed | Next.js routes build with the bundled corpus |
| Browser journeys | 21 of 21 passed | Original workspace workflows and ten added exploration/library journeys |
| Source formatting | Passed | Prettier checks on the application, tests, and selected configuration |
| Repository checks | Passed | Markdown, local links, YAML, and whitespace |

Browser tests ran against the production server at `127.0.0.1:3100`, using Chrome 152.0.7977.77. The app was also opened in the Codex in-app browser. The dedicated Browser plugin was not available, so reproducible interaction checks used the project's Playwright suite and installed Chrome.

## Actual browser workflows

- Open the twelve-area overview, click a map card, filter ideas, search ordinary words, and anchor a concept.
- Traverse explanation dependencies and classification in both directions; browser Back returns to the previous concept anchor.
- Switch the diagram among dependencies, kinds, and related ideas. Related edges have no implication arrow; omitted typed connections remain available in the inspector.
- Search the local mathlib API and visible interface for `Function.comp_assoc`; inspect its exact kind, module, documentation link, and immutable source revision.
- Follow direct module imports, keep external package modules identified as external links, and paginate/filter actual local declaration records.
- Export the complete explanation map with explicit relationship kinds and source-snapshot context.
- Preserve the ordinary workspace while opening a parity example, editing and reloading it, restoring and undoing the seed, and opening a different example with a separate save.
- Inspect an empty-domain function, Boolean self-composition, and all nine ordered inputs of addition modulo three.
- Use keyboard navigation and reduced-motion settings at a narrow viewport. Unknown example IDs and unknown source modules return a not-found response.
- Preserve the eleven original finite-workspace journeys, including exact counterexamples, diagram/table agreement, import rejection, drag/keyboard construction, and saved-data protection.

## Visual inspection against the accepted Atmai 1.2 workspace

The approved first workspace supplied the design reference. Rendered screenshots were captured at 1512 × 982 and inspected alongside that reference. Further responsive checks at 1280 × 800, 1024 × 768, and 390 × 844 found no page-level horizontal overflow; the capture observed no application runtime errors. This is not a full duplicated test suite at every size or comprehensive assistive-technology certification.

| Comparison | Outcome |
| --- | --- |
| Paper, ink, and violet palette | Existing tokens retained; selected anchors carry the signal colour |
| Typography | Archivo and IBM Plex Mono retained; short sentences accompany symbols |
| Header and controls | Wordmark, borders, quiet buttons, and keyboard focus treatment preserved |
| Workspace structure | Library, central map/index, and context inspector retain the accepted organisation |
| Diagram readability | Focused views show fewer neighbours at readable scale; a connection selector exposes other relation kinds |
| Content/control separation | Fit padding keeps overview cards clear of floating map controls |
| Responsive continuation | Area navigation becomes a horizontal strip; the inspector follows the central content on narrow screens |

Intentional additions are the mathematics-area navigation, map/index/mathlib views, relationship perspective selector, source inspector, and ready-to-edit examples. These implement the requested preconfiguration. Existing finite-workspace controls and mathematical data remain available through the workspace link.

The browser pass caught and repaired pointer interception on non-draggable map cards. Relationship review added inverse classification and exact accounting for omitted relationship kinds. Mathematical review corrected the distinction between unbounded above and unbounded below and clarified the summation convention for ordered series.

## Remaining acceptance boundaries

The corpus is a source catalogue; local Lean proof checking, complete theorem-body import, MMT translation, and cross-foundation fidelity remain unimplemented. The explanatory map is expandable and does not claim exhaustive basic-mathematics coverage or a proven minimal foundation. Atlas export has a different format from finite workspace export and has no general atlas-import editor yet.

Performance under many simultaneous server users, exhaustive maximum-size canvas behaviour, shared editing, and production deployment have not been established by these local checks. Existing upstream terms remain attached to imported material.
