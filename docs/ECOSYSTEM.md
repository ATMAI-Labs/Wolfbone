# Related systems and interoperability

**Status:** source-linked orientation. The [first browser workspace](architecture/0001-first-workspace.md) is implemented with scoped [local verification](verification/0001-first-workspace.md). These notes do not establish end-to-end compatibility or completed integrations with the mathematical systems below. Wolfbone's requirements are recorded in the [project definition](PROJECT.md).

## Distinctions that matter

**Formalisation, presentation medium, mathematical foundation, and verification status are separate properties.** A diagram can have precise formal rules. A symbolic document can contain informal arguments. A formal statement can remain unproved.

**Flexiformal mathematics** accommodates content with differing degrees of formalisation. This is relevant to importing existing documents while preserving the distinction between an informal explanation, an identified definition, and a checked proof. See the [Flexiformalist Manifesto](https://kwarc.info/people/mkohlhase/papers/synasc13.pdf).

**UniFormal/MMT** concerns a common framework for representing mathematical systems. Its foundation independence allows different logics to be defined or imported. Its application independence supports different applications through a common API. These properties overlap with Wolfbone's requirements for local contexts and several representations. See [MMT's independence principles](https://uniformal.github.io/doc/philosophy/independence.html).

## Representation and interoperability

| System or approach | Relevant role | Boundary to retain |
| --- | --- | --- |
| [MMT](https://uniformal.github.io/) | Theories, meta-theories, imports, and theory morphisms represent mathematical systems and their relationships. | A common API does not automatically supply a correct interpretation between arbitrary systems. |
| [OMDoc / MMT](https://docs.mathhub.info/legacy/omdoc-mmt.html) | Represents mathematical objects, statements, and contexts, with formal and narrative material. | The linked legacy documentation describes OMDoc2 as a tentative unification target; it does not establish a separate universal translator. |
| [Math-in-the-Middle](https://kwarc.info/people/frabe/Research/ODK_mitm_16.pdf) | Relates system-specific interface theories to shared mathematical theories. | Each interface and mapping needs an explicit supported scope and preservation obligations. |
| [OpenMath](https://openmath.org/standard/om20-2019-07-01/omstd20.html) | Encodes mathematical objects and identifies symbols through content dictionaries. | Exchanging an expression is distinct from proving it or providing an interactive view. |
| [MathML](https://www.w3.org/TR/MathML3/chapter1.html) | Provides mathematical presentation and content markup. | A rendering format supplies only part of a navigable, generative mathematical environment. |
| [sTeX](https://ctan.org/tex-archive/macros/latex2e/contrib/stex) and [MathHub](https://mathhub.info/) | Connect mathematical documents with explicit semantic annotations and organised archives. | Formality and checking status depend on the particular content and tooling. |
| [SMGloM](https://gl.mathhub.info/smglom) | A multilingual semantic lexical resource for mathematical concepts. | A vocabulary resource addresses terminology; supported constructions require further rules and tools. |

An MMT **view** is a technical interpretation between theories. Wolfbone uses **visual perspective** for the choice of anchor and arrangement on a display. These terms must remain distinguishable.

MMT has also documented experimental diagram operators that construct theories of homomorphisms, substructures, and congruences from existing material. This is relevant to Wolfbone's generative aim; coverage and maturity require examination. See the [MMT release notes](https://uniformal.github.io/doc/development/releases.html).

OpenDreamKit was a 2015–2019 mathematical software infrastructure project. Its Math-in-the-Middle work provides a useful interoperability reference. The [project repository](https://github.com/OpenDreamKit/OpenDreamKit) and [website repository](https://github.com/OpenDreamKit/OpenDreamKit.github.io) are sources of project materials and documentation. See the [OpenDreamKit website](https://opendreamkit.org/).

## Formal content and checking

| Resource | Relevant role |
| --- | --- |
| [Lean](https://lean-lang.org/) | A programming language and theorem prover; a possible source of formal content and checking services. |
| [mathlib](https://github.com/leanprover-community/mathlib4) | A substantial community library of definitions, theorems, proofs, and supporting tools for Lean. |
| [Mathlib Initiative](https://mathlib-initiative.org/) | An ecosystem support programme, including coordination, review, documentation, and AI integration. |
| [lean4export](https://github.com/leanprover/lean4export) | Exports Lean declarations for external processing and checking. |
| [import-graph](https://github.com/leanprover-community/import-graph) | Inspects module dependencies, one useful relationship within a broader mathematical map. |
| [Loogle](https://github.com/nomeata/loogle) | Searches Lean declarations using mathematical expression patterns. |

MMT contains a [Lean importer](https://github.com/UniFormal/MMT/blob/fca5d7e12db5b4e9d6329590f9d25380017981d8/src/mmt-lean/src/info/kwarc/mmt/lean/LeanImporter.scala). Its existence does not establish compatibility with current Lean 4 exports. Wolfbone has not tested or established such a connection.

For any eventual connection, proof checking and interpretation fidelity are separate obligations. Source versions, assumptions, and the status of imported proofs must remain available.

## Visual exploration and construction

| System | Relevant capability | Question for Wolfbone |
| --- | --- | --- |
| [TGView3D](https://kwarc.info/people/mkohlhase/papers/cicm20-tgview3d.pdf) | Visual exploration of MMT theory graphs, including neighbourhoods, clusters, and selected edge types. | Which interactions expose the particular relationships and contexts a person needs? |
| [Penrose](https://penrose.cs.cmu.edu/) | Generates mathematical diagrams from declarative descriptions. | Which diagram properties encode mathematical content, and which are layout choices? |
| [ProofWidgets4](https://github.com/leanprover-community/ProofWidgets4) | Interactive components within Lean, including visual integrations. | How can an interaction correspond to a declared construction and an inspectable checking result? |
| [Verso](https://github.com/leanprover/verso) and [doc-gen4](https://github.com/leanprover/doc-gen4) | Authoring and generated documentation in the Lean ecosystem. | How should explanations remain connected to definitions, dependencies, and evidence? |

These are references for design and possible integration. Their presence here does not mean they are installed or connected to Wolfbone.

### First canvas context

Wolfbone selected React Flow 12.11.6 for its initial browser workspace on 7 September 2026. Its [MIT core](https://github.com/xyflow/xyflow/blob/main/LICENSE), [custom React nodes](https://reactflow.dev/learn/customization/custom-nodes), and [keyboard and ARIA support](https://reactflow.dev/learn/advanced-use/accessibility) fit interactive mathematical cards and explicitly labelled relationships. The mathematical model remains separate from canvas state.

Excalidraw, tldraw, AntV X6, Rete, Konva, and PixiJS were compared for this decision. The [canvas assessment](architecture/0001-first-workspace.md#canvas-assessment) records their fit and licence boundaries, including tldraw's current non-MIT SDK and Rete's separately restricted advanced plugins. Repository activity and package versions are dated observations; they are not claims of measured popularity growth or a GitHub Trending rank.

## Problems and evaluation resources

[ConjectureBench](https://github.com/bespokelabsai/conjecture-bench) is a sourced catalogue of mathematical problems. Its documentation distinguishes recorded source claims from independently verified problem or solution status. It could supply attributed problem nodes; inclusion would not make a conjecture a theorem.

[MPPBench](https://mppbench.com/) describes preliminary evaluations using synthetic tasks and surrogates inspired by the Millennium Problems. Its published page alone does not establish a reproducible evaluation basis for Wolfbone. Task data, checking procedures, and evaluation code would need examination before adoption.

## How to use these references

MMT and Math-in-the-Middle are strong candidates for the initial architectural comparison. Lean/mathlib provide a possible first body of formal content. Flexiformal methods address existing material with incomplete formalisation, while visual tools offer concrete interaction examples.

The accepted [first medium](proposals/0001-first-medium.md) names finite labelled sets and functions, composition, exact comparison, and diagram/table preservation. Future import and checking decisions must specify their own supported content, source versions, licence terms, and interpretation guarantees.
