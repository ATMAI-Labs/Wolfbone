# Decision 0001: the first Wolfbone workspace

**Status:** accepted, 7 September 2026; the first local prototype is implemented and has passed scoped [local verification](../verification/0001-first-workspace.md). The acceptance requirements below remain the criteria for subsequent changes; the verification record identifies the actual checks and their limits.

## Decision and purpose

The first operable medium is a browser workspace for constructing and inspecting finite labelled sets and total functions. People can create their own collections and functions, compose compatible functions, compare results, and inspect the same mathematical content as a diagram or table. This implements the experience described in the [first-medium proposal](../proposals/0001-first-medium.md).

React Flow supplies the interactive workspace. Next.js and React supply the application; shadcn components, Tailwind, Motion, and Atmai's 1.2 visual language supply its interface. This selects a first medium, not a universal mathematical foundation or a permanent requirement for every future medium.

## Selected versions

These are the selected versions at the decision date. The package manifest and lockfile record installed dependencies; a version listed here does not establish a successful installation or build.

| Component | Selected version | Role |
| --- | --- | --- |
| Next.js | 16.3.4 | Application framework |
| React / React DOM | 19.2.8 | Interface and custom mathematical cards |
| React Flow (`@xyflow/react`) | 12.11.6 | Interactive nodes, connections, selection, pan and zoom |
| Tailwind CSS | 4.3.3 | Styling |
| Motion | 13.2.0 | Purposeful movement and transitions |
| shadcn CLI | 4.21.0 | Component generation; not a required browser runtime |
| Atmai design language | 1.2 | Visual conventions |
| Node.js | 26 locally; project requires 24 or newer | Development and application runtime |

## Mathematical model and representations

The mathematical model is independent of React Flow and browser layout. Sets, elements, and functions have explicit identities. Labels are descriptions; identical labels do not establish identical objects. Membership refers to a particular declared set. The document itself supplies the local finite-set context; this first prototype does not implement a general calculus of contexts or mappings between different foundations.

A total function assigns exactly one codomain element to every domain element. A function construction that has missing or invalid assignments must remain incomplete or be rejected; it cannot acquire completed status from a plausible-looking diagram.

Composition follows the first function and then the second. It is admissible only when the first function's codomain ID is the second function's domain ID. Matching names, positions, or cardinalities do not satisfy that condition. The selected pair is tracked in interface state. Adding the result stores its complete finite mapping as a snapshot, without a persistent derivation linking source-function IDs. The interface must make this distinction visible; people can recompute from a selected pair.

Comparison requires the same domain and codomain identities. It examines every input; disagreement supplies a witness consisting of an input and its two different outputs. This exact finite comparison is distinct from a general theorem about arbitrary functions.

Connections carry their actual relationship and label: a function arrow and an element assignment have different roles. Diagram position alone does not add an ordering, dependency, inference, or mathematical equivalence. Inspectors expose assignments, context, and construction details. A source-concept drawer connects the example to definitions and references, with source content distinguished from an integration or checked proof.

Diagram and table read the same model. Moving a card changes layout; editing an assignment changes the function. The implemented canvas uses expanded collection cards and element assignments. A collapsed collection/category overview is future work; it would be a summary with access to the complete mappings, not a claim that an arrow's visible shape encodes every assignment.

## Persistence and boundaries

The first workspace is browser-local and single-user. Sharing the repository does not provide collaborative editing or synchronisation between people's browsers.

A versioned JSON archive contains the mathematical records and separate layout records. Export and import must preserve object identities and supported constructions. Import uses strict validation of the archive version, structure, identities, references, and mathematical assignments, with a maximum file size of 2 MB. Invalid input must not silently replace a valid workspace. Browser storage uses the versioned format and must handle unavailable storage or malformed saved data visibly.

No full mathlib corpus, MMT runtime or archive, AXLE service, or semantic translation between these systems is included in this decision. External links are references. The first mathematical fragment is finite sets and functions; broader mathematics remains part of the project direction.

Rust is an option if profiling or a concrete capability later warrants it. It is not a prerequisite for this first browser workspace. Alternative media should be able to use the mathematical model without inheriting its canvas implementation.

## Canvas assessment

Primary documentation and current package metadata were inspected on 7 September 2026. Stars indicate accumulated popularity; a recent repository push indicates activity. Neither establishes measured growth, a GitHub Trending rank, or future maintenance capacity.

| Candidate | Licence boundary | Fit and tradeoff |
| --- | --- | --- |
| [React Flow](https://reactflow.dev/learn/customization/custom-nodes) | [MIT core](https://github.com/xyflow/xyflow/blob/main/LICENSE) | Selected: arbitrary React content, meaningful edges, and existing keyboard and ARIA support fit rich mathematical cards. |
| [Excalidraw](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration) | [MIT](https://github.com/excalidraw/excalidraw/blob/master/LICENSE) | Strong sketching and annotation medium; its drawing-element model is less direct for interactive React cards. Next.js embedding is client-only. |
| [tldraw](https://tldraw.dev/community/license) | Current SDK is source-available under its own licence, not MIT | Production requires an active additional licence; downstream users also need production licences. This does not meet the chosen permissive canvas requirement. |
| [AntV X6](https://x6.antv.antgroup.com/en/tutorial/intermediate/react) | [MIT](https://github.com/antvis/X6/blob/master/LICENSE) | Credible SVG/HTML graph alternative; React nodes use an adapter and need Portal mode for application context. |
| [Rete](https://retejs.org/docs/guides/renderers/react/) | MIT core; [some advanced plugins are CC-BY-NC-SA-4.0](https://retejs.org/docs/licensing/) | Useful for node programming; requires plugin assembly and care not to equate dataflow with mathematical meaning. |
| [Konva](https://konvajs.org/docs/react/index.html) / [PixiJS](https://github.com/pixijs/pixijs) | MIT cores | Useful drawing and graphics primitives; more graph interaction and accessibility infrastructure would be ours to implement. |

The inspected React Flow release was 12.11.6, published on 1 September 2026. Its [repository](https://github.com/xyflow/xyflow) had 38,286 stars and a last push dated 5 September; the [npm registry](https://registry.npmjs.org/@xyflow%2freact) supplied package metadata. These are a dated snapshot, not a trend claim.

Wolfbone's original code and documentation remain [MIT](../../LICENSE). Preserve applicable copyright and licence notices for dependencies and any copied components in the third-party notices inventory. Paid examples, separately licensed plugins, and linked mathematical archives do not become MIT through association with a selected library.

## Integration requirements

- Use a client component for the interactive workspace. React Flow also [supports SSR](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration), but server rendering needs explicit node dimensions and handle positions.
- Keep custom React nodes and callbacks stable; show a deliberate neighbourhood rather than assuming a full mathematical corpus can be rendered simultaneously. See [performance guidance](https://reactflow.dev/learn/advanced-use/performance).
- Keep input controls usable inside draggable cards. Motion must not overwrite the canvas wrapper's positioning transform; respect reduced-motion preferences.
- Preserve keyboard traversal and visible focus, and provide table/form alternatives to pointer construction. React Flow's [accessibility features](https://reactflow.dev/learn/advanced-use/accessibility) are a starting point, not a certification.
- Apply mathematical validation in the independent core. The canvas's connection validation is an interface to those rules, not the source of mathematical truth.

## Acceptance evidence required

**Core tests** must cover totality, invalid references and assignments, exact set identity in composition, composition results, equality and disagreement witnesses, and archive validation and round trips. Include rejection cases that look visually plausible, such as different middle sets with the same label. Verify identity and associativity on declared finite fixtures while identifying that scope explicitly.

**Browser checks** must demonstrate creating a new collection and function, editing assignments, composing a selected compatible pair, inspecting its result, and comparing functions with an inspectable witness. They must also cover diagram/table agreement, preserved mathematics after layout edits, persistence after reload, valid export/import, rejected invalid imports, and usable keyboard controls. A build or a screenshot alone does not establish these behaviours.

**Repository checks** cover formatting, links, configuration, types, and build integrity as appropriate. Record the actual commands and outcomes when run. Passing these checks, or the finite tests above, does not establish a general proof, an imported theorem, or a verified translation into Lean or MMT.
