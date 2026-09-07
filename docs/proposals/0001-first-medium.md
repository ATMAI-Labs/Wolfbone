# Proposal: the first operable medium

**Status:** accepted as the first medium, 7 September 2026; the first local prototype is implemented and has passed scoped [local verification](../verification/0001-first-workspace.md). The [first-workspace decision](../architecture/0001-first-workspace.md) records the selected stack, model, and acceptance requirements. Future representation ideas are identified below.

## The experience

A browser workspace for constructing and inspecting finite labelled collections and total functions between them. Each input has exactly one output. The collections are finite and explicitly shown, so each case can be inspected. People can create new collections and functions; the experience is not limited to a fixed example.

The person can:

1. Create a few labelled tokens in each of three collections.
2. Connect every token in the first collection to exactly one token in the second, defining a function.
3. Do the same from the second collection to the third.
4. Compose the functions and inspect the resulting direct connections.
5. Propose a different direct function and see whether it agrees on every input, or inspect a specific input where it differs.

The input labels can be words. Identity must not depend only on colour, position, or familiarity with numerical notation. The diagram and keyboard-accessible table/form represent the same model. Inspectors expose the full mapping and its context; source-concept references provide a route into existing mathematics.

## What changes when the view changes

The same function appears as a complete table of inputs and outputs, or as tokens joined by labelled connections. Both complete representations retain the entire finite mapping.

The current canvas shows expanded collection cards and element assignments. A collapsed category-style overview, showing collections as objects and functions as arrows, remains future work. Such a summary would need access to the complete mapping; the visible arrow alone would not encode all its details.

Moving a token changes its displayed position. Editing its outgoing connection changes the mathematical function and updates both complete representations. Selecting a token highlights its path through a composition.

## First correctness boundary

Within the declared finite example:

- Every completed function has exactly one output for every input. An unfinished connection remains an explicit incomplete construction.
- Composition requires the first function's output collection ID to be the second function's input collection ID, and computes the output obtained by following both functions in order. Collections with matching labels remain different when their identities differ.
- Comparing two functions with the same declared domain and codomain checks their outputs at every input, using the declared element identities; disagreement produces a particular input and the two different outputs.
- Diagram and table preserve the same complete input-output mapping. Exporting and importing the versioned archive recovers that mapping and its declared identities.
- Layout changes preserve the mapping; mathematical edits update all views of that mapping.

Exhaustive comparison can settle equality for the particular finite functions. A general proof of the framework's laws, a faithful connection to a proof assistant, and translation between different foundations each require their own evidence.

## Connection to existing mathematics

This starts inside a familiar mathematical setting with a direct category-theoretic account: finite types as objects and functions as morphisms. [Mathlib's finite-type category](https://leanprover-community.github.io/mathlib4_docs/Mathlib/CategoryTheory/FintypeCat.html) supplies an existing formal reference.

[ProofWidgets4](https://github.com/leanprover-community/ProofWidgets4) and [Penrose](https://penrose.cs.cmu.edu/docs/ref) provide relevant interaction and representation precedents. [MMT](https://uniformal.github.io/doc/) remains a reference for contexts and theory mappings. Compatibility with a Wolfbone implementation has not been tested.

## Accepted first implementation

The browser workspace uses Next.js, React, React Flow, shadcn components, Tailwind, Motion, and Atmai's 1.2 visual language. Its mathematical model remains independent of the canvas. The exact selected versions and licence assessment are recorded in the [decision](../architecture/0001-first-workspace.md).

Storage is browser-local, with mathematical records separated from layout in a versioned JSON archive. Imports require strict validation and have a 2 MB file-size limit. This is a single-user workspace; repository sharing does not imply collaborative editing.

Exact evaluation of finite functions is the first correctness mechanism. Lean, full mathlib, MMT, and AXLE integrations are outside this first implementation. References to those systems do not establish a working connection.

The selected composition pair belongs to interface state. Adding the computed result stores its complete finite mapping as a snapshot; source-function derivation IDs are not persisted. A person can select the pair and recompute.

## Decisions still open beyond this milestone

- Which mathematical fragments and additional media to support next.
- Which formal-content adapter or checking connection should follow, with its own compatibility and preservation evidence.
- How to interpret and connect contexts with different logics or foundations.
- Whether profiling or a specific capability later justifies an additional runtime such as Rust.

The intended demonstration is: a person constructs a mathematical object, composes it with another, changes its representation, and inspects an exact reason why a proposed equality succeeds or fails.
