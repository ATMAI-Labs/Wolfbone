# Proposal: the first operable medium

Status: proposed, 7 September 2026. This document supports discussion; no application, implementation stack, or formal integration has been selected or built.

## The experience

A two-dimensional workspace for constructing and inspecting finite collections and total functions between them. Each input has exactly one output. The collections are finite and explicitly shown, so each case can be inspected.

The person can:

1. Create a few labelled tokens in each of three collections.
2. Connect every token in the first collection to exactly one token in the second, defining a function.
3. Do the same from the second collection to the third.
4. Compose the functions and inspect the resulting direct connections.
5. Propose a different direct function and see whether it agrees on every input, or inspect a specific input where it differs.

The input labels can be words or labelled shapes. Identity must not depend only on colour, position, or familiarity with numerical notation. A keyboard-accessible table provides an alternative to dragging connections.

## What changes when the view changes

The same function appears as a complete table of inputs and outputs, or as tokens joined by labelled connections. Both complete representations retain the entire finite mapping.

A collapsed category-style diagram shows the collections as objects and the functions as arrows. This is a summary view backed by the complete mapping, not a claim that the visible arrow alone encodes all its details. Collections can be expanded again.

Moving a token changes its displayed position. Editing its outgoing connection changes the mathematical function and updates both complete representations. Selecting a token highlights its path through a composition.

## First correctness boundary

Within the declared finite example:

- Every completed function has exactly one output for every input. An unfinished connection remains an explicit incomplete construction.
- Composition requires the first function's output collection to be the second function's input collection, and computes the output obtained by following both functions in order.
- Comparing two functions with the same declared domain and codomain checks their outputs at every input, using the declared element identities; disagreement produces a particular input and the two different outputs.
- Encoding and decoding either complete representation recovers the same input-output mapping.
- Layout changes preserve the mapping; mathematical edits update all views of that mapping.

Exhaustive comparison can settle equality for the particular finite functions. A general proof of the framework's laws, a faithful connection to a proof assistant, and translation between different foundations each require their own evidence.

## Connection to existing mathematics

This starts inside a familiar mathematical setting with a direct category-theoretic account: finite types as objects and functions as morphisms. [Mathlib's finite-type category](https://leanprover-community.github.io/mathlib4_docs/Mathlib/CategoryTheory/FintypeCat.html) supplies an existing formal reference.

[ProofWidgets4](https://github.com/leanprover-community/ProofWidgets4) and [Penrose](https://penrose.cs.cmu.edu/docs/ref) provide relevant interaction and representation precedents. [MMT](https://uniformal.github.io/doc/) remains a reference for contexts and theory mappings. Compatibility with a Wolfbone implementation has not been tested.

## Decisions still open

- Whether this is the first example contributors want to operate on.
- Whether the first interface is a standalone browser workspace or runs within an existing mathematical environment.
- The chosen identities and encoding format for the finite objects.
- Whether the first milestone includes a verified Lean connection, or begins with exact finite evaluation and adds proof-assistant checking as a separate milestone.

The intended demonstration is: a person constructs a mathematical object, composes it with another, changes its representation, and inspects an exact reason why a proposed equality succeeds or fails.
