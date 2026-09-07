# Decision 0002: a preconfigured mathematics library

**Status:** implemented; acceptance results are recorded separately in the [library verification record](../verification/0002-preconfigured-mathematics.md).

## The experience

Wolfbone now has an exploration surface at `/explore`, alongside the editable finite-function workspace at `/`. The library opens with twelve mathematical areas. A person can search an ordinary word or symbol, choose an idea as an anchor, inspect its context and example, and follow labelled relationships in either direction. The index and inspector provide text alternatives to the spatial map.

The initial explanations span logic and proof, sets and functions, numbers and arithmetic, algebra, geometry, trigonometry, linear algebra, calculus and analysis, probability, statistics, discrete mathematics, and mathematical structures. This is an expandable selection of foundational ideas; it is not a claim to contain every definition of basic mathematics or a uniquely minimal foundation.

Sixteen preconfigured finite constructions connect exploration to the existing working canvas. Each example has its own browser storage key. Opening a seed leaves the ordinary workspace and other examples intact. Edits persist within that example, and restoring the starting example is undoable. The context and suggested experiments describe the starting construction; later edits can change its mathematical properties.

## Three kinds of content

| Content | What is included | What its presence establishes |
| --- | --- | --- |
| Wolfbone explanations | Original plain-language definitions, context, concrete examples, symbols, and typed editorial connections | An accessible explanation and a route through the map; not a formal proof certificate |
| Imported mathlib metadata | 321,329 exact declaration names and kinds, their modules, documentation links, and 8,489 modules with direct import relationships | A locally searchable snapshot and traceable source references; not imported theorem statements or proof objects |
| Editable constructions | Sixteen explicitly finite sets/functions documents, including modular arithmetic and Boolean tables | The existing finite evaluator can inspect and compare their actual mappings |

The distinction is visible in the interface. Selecting a mathlib source module opens its metadata inspector. Selecting a declaration opens its upstream documentation. Immutable source-file links remain available beside rolling documentation links.

## Relationships and context

An explanation's `uses` relation records concepts used by that explanation. `specializes` records a kind-of relationship. `related` records an association without an implication or equivalence claim. These are separate records even when they join the same pair of concepts. Reverse traversal does not discard their kinds.

The diagram is a bounded neighbourhood, not a single universal classification tree. It can omit some connections for readability while the inspector retains the complete set of incident relationships. Its caption identifies omitted typed relationships. Changing the anchor or layout does not alter the source records.

Imported module dependencies have a different meaning: module A importing module B is not evidence that every declaration in A depends on every declaration in B. External Lean and other package modules remain named, with external documentation links; their declaration records are outside the bundled Mathlib-only corpus.

## Source snapshot and reproducibility

The [manifest](../../data/mathlib/manifest.json) identifies mathlib revision `71a80585ee495fc24472fd0eaffc89d94e4fd8d6`, the original documentation-index SHA-256, import time, counts, and hashes of each bundled artifact. The [importer](../../scripts/import-mathlib.mjs) filters the official doc-gen4 index to Mathlib, preserves identity and kind, and compacts it into gzip files by source area. The full upstream Apache-2.0 licence and [attribution](../../data/mathlib/ATTRIBUTION.txt) are included.

```sh
npm run library:verify
```

This offline check verifies artifact hashes, declaration uniqueness, module and kind references, area totals, and reciprocal in-corpus module import relationships. It does not check Lean proofs or certify the accuracy of the original explanations.

```sh
npm run library:import
```

Importing fetches a rolling upstream endpoint but requires the reviewed hash to match. If upstream has changed, it fails rather than silently assigning new data an old revision. Updating the source requires reviewing and changing the pins, rebuilding the corpus, and rerunning verification. Ordinary exploration needs no network access to external services; opening an upstream source link does.

## Implementation boundaries

The mathematical atlas data is independent of React Flow. React Flow renders a selected neighbourhood; the index, inspector, and JSON export use the same concept identities and relationships. Atlas export is an explanation/relationship document with format `wolfbone.atlas`; it is distinct from the editable finite-workspace archive and does not bundle the full declaration corpus. A general atlas-file import workflow remains future work.

The large corpus stays on the server and is loaded lazily by source area. Browser requests return at most forty declaration records per page. A complete search can load all areas into a process cache. This is appropriate for the initial local/server prototype; memory, concurrency, and full deployment load remain profiling obligations. Next file tracing includes the corpus for future packaging.

No MMT adapter, Lean runtime, proof rechecking, automatic informal-to-formal translation, multiuser synchronisation, or universal mathematical foundation is introduced by this library. These are separate capabilities with their own preservation and acceptance obligations.
