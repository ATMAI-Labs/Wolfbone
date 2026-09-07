# Wolfbone: project definition

*Mathematical thought, across media.*

**Status:** working specification. The repository establishes the project; it does not yet provide an implemented mathematical framework or a verified translation pipeline. The first operable medium and implementation remain open decisions.

## Purpose

Wolfbone proposes a medium-independent framework for representing, connecting, exploring, and constructing mathematical knowledge through explicit relationships.

Its central object is a shared map: people can inspect what an idea depends on, follow its connections, examine its governing rules, and construct further objects or statements through admissible operations. The map should support mathematical work through representations suited to different ways of thinking.

Wolfbone is maintained by Atmai. Its original code and accompanying documentation are provided under the [MIT licence](../LICENSE). Mathematics is a shared pursuit; Wolfbone makes no ownership claim over mathematical ideas. External material retains its own attribution and licence terms.

## Working definition

A small, declared core specifies how entities, contexts, relationships, and constructions can be introduced. Its assumptions and rules are inspectable. The particular primitives and a proof of their minimality have not been selected or established.

A **context** records the vocabulary, definitions, assumptions, and rules under which its contents operate. Different contexts may use different names, conventions, or foundations. Explicit mappings connect contexts and state which structures, operations, or conclusions they preserve.

The map records different kinds of relationship. Classification, membership, definition, dependency, inference, composition, interpretation, and equivalence remain distinguishable. A single concept can participate in several intersecting organisations.

The map supports construction as well as exploration. An admissible operation produces an object or statement according to declared rules. Its inputs, assumptions, and justification remain available for inspection. Rules and constructions can themselves be represented within an appropriately declared context.

The same declared content may have several representations: symbolic, textual, diagrammatic, spatial, spoken, or another suitable encoding. A person can choose a perspective or anchor and explore the surrounding relationships. Every representation claiming fidelity must state what it preserves and how that claim is established.

Existing mathematics supplies definitions, theories, constructions, and proofs. Imports retain their source and context. Interpretations, conjectures, formal statements, and checked proofs have distinct recorded statuses.

## Requirements

| Requirement | Consequence |
| --- | --- |
| Explicit foundations | A declared starting point makes dependencies visible; unfamiliar words cannot silently supply missing definitions. |
| Local contexts | Definitions and rules have a scope. A translation identifies the assumptions needed to reuse them elsewhere. |
| Distinct relationship types | Every connection says what it means. A shared visual arrow does not make different relations equivalent. |
| Traversal and construction | People can investigate origins and consequences, and perform supported constructions through their chosen representation. |
| Multiple perspectives | The same content can be arranged around different anchors without silently changing its mathematical meaning. |
| Fidelity obligations | Every supported encoding, translation, and operation has declared preservation conditions. |
| Visible provenance and status | Source, interpretation, assumptions, and evidence for a claim remain inspectable. |
| Accessible participation | Accessibility includes creating and reasoning with mathematics, alongside reading and navigating it. |

For example, “binary operation is a kind of operation,” “a definition of binary operation uses functions,” and “this particular operation is a binary operation” express different relationships. Their visual presentation should preserve those distinctions.

Position also needs an explicit interpretation. Horizontal placement can represent time in one view and be a layout choice in another. An unspecified time interval must not silently become an infinite interval.

## What fidelity means

Two obligations guide the design:

1. **Reconstruction:** decoding an encoding recovers its declared content. If recovery is only up to a chosen equivalence, that equivalence is part of the specification.
2. **Preservation of operations:** performing a supported construction before translation corresponds to performing the translated construction afterward, under the stated correspondence.

A partial view may intentionally omit information while retaining a link to the underlying content. Its limits must be distinguishable from the guarantees of a complete encoding. Interpreting informal material is a separate task whose ambiguities need to remain visible.

A checked proof establishes a formal statement under its assumptions and checking rules. It does not, by itself, establish that an imported sentence or diagram was interpreted faithfully.

## Decisions still open

- The primitive vocabulary, formal foundation, and representation of the core.
- The first operable medium and the first mathematical fragment it will support.
- Which relationships and constructions that fragment requires.
- The equality or equivalence used for each preservation claim.
- How contexts with different logics will be connected and checked.
- Which existing systems to adopt, extend, or connect through adapters.
- How to make navigation, construction, and verification accessible across different needs and media.

Logic and mathematics are the intended initial scope. Expansion into other disciplines would also require explicit treatment of modelling assumptions, observations, and empirical evidence.

## Relationship to existing work

MMT, OMDoc, flexiformal mathematics, Math-in-the-Middle, proof assistants, and visual mathematical tools provide substantial prior art. Wolfbone will investigate their existing capabilities before selecting its architecture. The [ecosystem notes](ECOSYSTEM.md) record their relevant roles and the limits of the comparison.
