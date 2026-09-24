# Proposal: a path to full Wolfbone

**Status:** proposed, 24 September 2026. This records a direction for discussion, not an implemented core, a verified translation, or a release. It extends the [accepted first medium](0001-first-medium.md) and the [project definition](../PROJECT.md).

## What “full Wolfbone” would mean

The first workspace can construct and compare finite functions. The broader goal is a mathematical workspace in which a person can state the context of an idea, build with it, follow relationships, change representation, and inspect the evidence for each conclusion. A proof checker is one possible source of evidence; an informal explanation or a diagram still needs its own account of meaning.

The governing test comes from [PROJECT.md](../PROJECT.md#what-fidelity-means): a complete encoding must reconstruct its declared content, and a supported construction must correspond to the construction after translation. Partial views must say what they omit. Status, assumptions, source, and checking method stay attached to a claim.

## Borrow the methods, define Wolfbone's own contract

The proposed direction is a small TypeScript core for Wolfbone's own objects, with adapters for exchange and checking. These systems offer specific ideas to test; referring to them does not make Wolfbone compatible with them.

| Source | Idea to borrow | Wolfbone's first test of that idea |
| --- | --- | --- |
| [MMT modules](https://uniformal.github.io/doc/language/modules.html) | Keep theories or contexts, includes, structures, and interpretations distinct. A theory view supplies assignments and preservation obligations. | Represent two finite-function contexts and an explicit mapping. Reject a mapping with a missing symbol assignment or a failed operation-preservation check. Keep a mathematical interpretation distinct from a visual perspective. |
| [sTeX / FLAMS](https://kwarc.info/people/mkohlhase/submit/icms26-semantics.pdf) and the [Universal Lexicon Ontology](https://kwarc.info/people/frabe/Research/CKMRSW_ulo_19.pdf) | Add semantic links to narrative mathematics progressively; keep named relationships and their direction explicit. | Annotate one explanation with source-backed symbol references. Mark unannotated parts as such, and review each mapping from ULO to Wolfbone's eight relationship kinds. A ULO `uses` edge is not automatically a Wolfbone dependency. |
| [OpenMath](https://openmath.org/standard/om20-2019-07-01/omstd20.html) | Identify symbols by content-dictionary base, dictionary, and name; exchange mathematical expressions through a specified JSON encoding. | Try a small OpenMath JSON adapter for finite expressions after a symbol mapping is written. Round-trip the supported identities and operations, and reject unsupported content explicitly. This adapter would not encode the whole Wolfbone archive or its proof status. |
| [ACSets](https://algebraicjulia.github.io/ACSets.jl/) and [CQL](https://categoricaldata.net/cql/lambdaconf.pdf) | Make schemas, instances, and mappings explicit so that a data migration states what structure it preserves. | Model one versioned Wolfbone fragment and migrate sample instances. Check exact identities, source links, and a commuting operation on both sides. Database migration is an analogy, not evidence that mathematical truth is preserved. |
| [Lean](https://lean-lang.org/) and [leanblueprint](https://github.com/PatrickMassot/leanblueprint) | Link informal statements to formal names and dependencies, while distinguishing a declared formalisation status from a checker result. | Export one finite construction and one claim to a local Lean file. Record the generated statement, toolchain, assumptions, checker result, and source hashes; check a deliberately false or ill-typed export fails. A status marker alone is not a checked proof. |

Copying third-party code, schemas, or content requires a separate licence and attribution review. In particular, [MMT's licence](https://raw.githubusercontent.com/UniFormal/MMT/master/COPYING.txt) limits redistribution to unmodified forms, [FLAMS is GPL-3.0](https://github.com/FlexiFormal/FLAMS/blob/main/LICENSE), and [CQL's published terms](https://categoricaldata.net/CQL/) permit noncommercial and exploratory or evaluative commercial use while directing other users to seek a separate licence. Wolfbone can study their designs without bundling their implementations.

## Sequence and acceptance gates

Each phase produces something inspectable before the next phase depends on it. The order of the mathematical fragments is a proposal, to be adjusted against actual user work and performance measurements.

| Phase | Build | Gate before calling it complete |
| --- | --- | --- |
| **0. Stabilise the current workspace** | Preserve the in-flight arithmetic and ink changes, settle the browser-storage key and migration policy, repair the reported Undo, focus, drag/drop, and rejected-add behaviours, and update stale browser assertions and documentation. | A fresh install, repository checks, unit tests, production build, and browser journeys pass on the actual branch. New journeys cover the arithmetic/ink interactions and recovery across save/import. An older build cannot silently overwrite a newer archive. |
| **1. Make extension safe** | Introduce a content-kind seam for validation, exact checks, and views; design a versioned archive upgrade path; retain source IDs when a composition is saved. Pilot a context and evidence record before spreading the schema. | Legacy archives round-trip or migrate under documented rules; future-version data has an explicit safe behaviour; a saved composition can be recomputed from its declared inputs, with stale inputs detected. |
| **2. Add checkable fragments** | Add explicit pairs and binary operations first, then integers modulo *n*, propositional truth tables, subsets and relations, and finite graphs. Connect arithmetic cards only when their expressions have a declared interpretation in a fragment. | For every kind, construction constraints and at least one nontrivial law have exact finite checks or a concrete counterexample. Diagram, table, and archive agree on identity and operations. No card label is treated as a structured pair by convention alone. |
| **3. Give the map declared meaning** | Add scoped contexts, declarations, the eight distinct relationship kinds in [PROJECT.md](../PROJECT.md#working-definition), mappings, provenance, evidence, and distinct interpretation, conjecture, formal-statement, and checked-proof statuses. Reclassify a small reviewed slice of the existing editorial map before any bulk conversion. | The same pair of nodes may have different relationship kinds without conflation. Classification, membership, and explanatory use have separate examples. Every established mapping has a check or a clearly stated unproved obligation; imported source links are not treated as proof dependencies. |
| **4. Connect formal checking** | Make a local, opt-in Lean experiment for one finite construction and claim. Extend only after its encoding and trust boundary are documented. | The generated file checks with a pinned toolchain; invalid examples fail; the evidence names the exact formal statement and assumptions. A passing check is not presented as proof that Wolfbone interpreted an informal sentence faithfully. |
| **5. Open more media** | Add an overview diagram, accessible mathematical text/MathML, and a spoken or other nonvisual path. Treat handwriting recognition, if attempted, as an interpretation requiring visible ambiguity handling. | A person can create, inspect, and compare the same supported object without relying on colour or placement. Each view declares what it preserves; accessibility is exercised with keyboard and assistive technology. |
| **6. Share and release** | Complete the separate [public-launch process](../PUBLIC_LAUNCH.md), then design synchronisation and multiuser provenance on the established content model. | Release evidence identifies the exact revision and deployed artefact; concurrent edits preserve identity, source, and evidence or surface an explicit conflict. Visibility and publication remain separate maintainer decisions. |

## The first two concrete slices

1. **Baseline slice:** inventory the current dirty work, preserve its authorship, make a reproducible Phase 0 test record, and fix the archive overwrite risk before expanding the document format. At this snapshot, version 2 envelopes still use the `wolfbone.workspace.v1` browser key, with separate keys for saved examples; migration checks must cover both. Record each browser failure as a behaviour, reproduction, fix, and retest. The previous onboarding report is a lead, not a substitute for a fresh run.
2. **Semantic pilot:** use the existing `function-composition` example and the atlas edge `binary-operation specializes operation`. Record the composition's context, input-function IDs, operation, resulting mapping, a checked finite equality or counterexample, and the original explanation's separate status. Treat the atlas edge as an editorial classification, not a proved subtype. Try a limited OpenMath JSON round-trip and a Lean export only after the native record can state what each translation preserves.

The Phase 0 and pilot results should become verification records with exact commands, revisions, and failures as well as successes. The roadmap itself establishes none of those results.

## Decisions deliberately left open

- The general primitive vocabulary and mathematical foundation. Finite sets and functions are a first fragment, not a proof of a minimal universal foundation.
- Whether the proposed archive upgrade uses a new storage key, and how newer saves open in older clients. The safe behaviour needs implementation and browser evidence before adoption.
- Whether a Lean toolchain becomes a development dependency. The first experiment can be isolated; it does not require Lean in the browser runtime.
- The precise OpenMath symbol correspondence and the loss policy for content outside the supported fragment.
- The semantics of context mappings between different foundations, including which preservation obligations are decidable or require a proof.
