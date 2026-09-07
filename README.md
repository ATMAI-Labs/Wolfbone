# WOLFBONE

**Mathematical thought, across media.**

An open mathematical workspace for exploring ideas, following relationships, and making constructions. Initiated and maintained by **[Atmai](https://github.com/ATMAI-Labs)**.

[Get started](#run-locally) · [Why Wolfbone?](#why-wolfbone) · [Explore the interface](#from-an-idea-to-a-construction) · [Contribute](#build-with-us)

![Wolfbone's mathematics library: twelve areas on an open canvas, with an area index and an inspector that explains how to explore.](docs/images/mathematics-map.png)

*The working mathematics library. Enter through an area, a familiar word, a symbol, or a construction.*

## A map you can think with

Mathematics holds an extraordinary body of ideas. Different minds need different ways to reach them.

Wolfbone makes those ideas explorable through a shared map. Choose a concept as your anchor. See what it uses, what uses it, and which assumptions give it meaning. Move between ordinary language, notation, diagrams, and working examples as you investigate.

Our aim is to **democratize the exploration of mathematical thought**: to make understanding, construction, and contribution accessible through the forms that help people reason.

| Explained ideas | Labelled relationships | Mathematical areas | Editable constructions |
| :---: | :---: | :---: | :---: |
| **166** | **669** | **12** | **16** |

Alongside the foundations map, a local catalogue connects **321,329 mathlib declaration records** across **8,489 source modules** to their original documentation. These imported records contain names, kinds, and module relationships; formal statements and proofs remain upstream.

## Why Wolfbone?

The name honours the **notched wolf bone from Dolní Věstonice**, in present-day Czechia. Its marks have been interpreted as tallying, although their original purpose remains uncertain. Historian Jaroslav Folta discusses the object and its possible meanings in [*Věstonická vrubovka*](https://vesmir.cz/cz/casopis/archiv-casopisu/1997/cislo-6/vestonicka-vrubovka.html).

For us, the name begins with the medium: a physical, three-dimensional object carrying marks. It evokes the act of giving thought an external form—something that can be revisited, compared, and shared.

Wolfbone carries that idea forward. A mathematical structure may be encountered through text, symbols, a spatial arrangement, or another representation. We want people to work through the medium that helps them think, with the underlying relationships and rules available for inspection.

Atmai maintains the project; we make no ownership claim over mathematics. Our commitment to openness extends to mathematical understanding wherever it may arise, including beyond our own species or world.

## From an idea to a construction

### 01 · Follow the relationships

Search for **Function**, make it your anchor, and explore its neighbourhood. Switch between **uses and used by**, **kinds and specializations**, and **related ideas**. Each connection says what it means; the inspector retains the full list when the diagram shows a smaller view.

![Function anchored between Set, which its explanation uses, and Predicate and Function composition, which use it. The inspector shows context, an example, and further connections.](docs/images/follow-an-idea.png)

*A change of perspective changes the view. The underlying concept identities and relationship kinds stay explicit.*

The initial map spans logic and proof, sets and functions, numbers and arithmetic, algebra, geometry, trigonometry, linear algebra, calculus and analysis, probability, statistics, discrete mathematics, and mathematical structures.

### 02 · Make something and inspect what follows

Open a prepared construction or build your own finite collections and functions. Assign outputs, connect elements, compose compatible functions, and compare the results on every declared input. Diagram and table represent the same mathematical document.

![The finite-function canvas after changing h(a) to moon. The right-hand inspector identifies a concrete disagreement: the composed route reaches sun.](docs/images/find-a-counterexample.png)

*Change one assignment. The diagram changes, and a specific input witnesses the disagreement.*

The sixteen starting examples include composition, identity, injection, bijection and inverse, parity, arithmetic modulo three, Boolean operations, permutations, and finite samples of familiar functions. Each has **its own saved workspace**, with undo/redo and JSON export/import. Opening an example keeps your ordinary workspace and other examples separate.

### 03 · Follow an idea back to its source

The **Mathlib** view searches the bundled declaration catalogue locally. Inspect a module's direct imports, move to another module, or open the original documentation and pinned source file. Source provenance stays visible alongside the accessible explanations.

The catalogue preserves module-import relationships. These have a different meaning from the editorial relationships in the foundations map and from dependencies between individual proofs.

[See all five interface screenshots and their capture notes →](docs/images/README.md)

## Run locally

Use **Node.js 24 or newer** and npm. From the repository checkout:

```sh
npm ci
npm run dev -- --port 3100
```

| Open | Start here |
| --- | --- |
| [Mathematics library](http://127.0.0.1:3100/explore) | Explore the map, search ideas and sources, or choose an example |
| [Your workspace](http://127.0.0.1:3100) | Create and inspect finite collections and functions |

The preconfigured library is included in the repository. Browsing its explanations and searching the local catalogue require no account or external API key. Upstream source links require internet access.

The server binds to the local machine. Workspaces are saved in the browser for that site address; export a JSON copy to carry work between browsers or keep it before clearing storage.

## Where the project stands

Wolfbone is an **early working prototype**, being prepared for public release. The current implementation provides a foundations map, a locally searchable source catalogue, and a finite-function construction engine. The broader aim is a shared mathematical environment across many media.

| Working today | Boundary |
| --- | --- |
| Concept map, index, and context inspector | An expandable set of original explanations and editorial relationships |
| Imported mathlib catalogue | Declaration metadata and source links; no theorem bodies or imported proof objects |
| Editable mathematical constructions | Explicitly finite collections and functions, with exact evaluation on their inputs |
| Diagram, table, and file representations | One finite mathematical model with layout stored separately |
| Saved examples and personal workspace | Single-user browser storage; shared editing is future work |

Lean proof checking, MMT translation, a general mathematical construction engine, and further media remain separate work ahead. Every representation or translation must state what it preserves and how that is checked.

The implementation uses **Next.js 16, React 19, React Flow, shadcn, Tailwind CSS, and Motion**, with Atmai's 1.2 visual language. The mathematical data is independent of the canvas renderer. See the [workspace decision](docs/architecture/0001-first-workspace.md) and [library decision](docs/architecture/0002-preconfigured-mathematics.md) for the architecture and exact scope.

**Locally checked on 7 September 2026:** 72 unit tests and 21 browser journeys passed, together with corpus integrity, type, production-build, formatting, and repository checks. The [verification record](docs/verification/0002-preconfigured-mathematics.md) describes the evidence and its limits. Local results do not report a remote CI result or a public deployment.

## Build with us

There are many ways to contribute:

- **Explain an idea.** Add clear language, an example, and the context in which it holds.
- **Connect the map.** Identify a dependency, classification, or relationship and say which kind it is.
- **Make a construction.** Give people something they can change and inspect.
- **Open another medium.** Help preserve mathematical meaning across representations.
- **Improve access.** Contribute keyboard interaction, readable layouts, alternative presentations, or accessibility feedback.

A precise question, a careful correction, or a useful diagram can be a substantial contribution. Start with [CONTRIBUTING.md](CONTRIBUTING.md), bring ideas to [Discussions](https://github.com/ATMAI-Labs/Wolfbone/discussions), or propose a concrete improvement in [Issues](https://github.com/ATMAI-Labs/Wolfbone/issues). Access follows the repository's current visibility.

## Project guide

| Read | For |
| --- | --- |
| [Project definition](docs/PROJECT.md) | Purpose, contexts, relationship kinds, and preservation obligations |
| [Related systems](docs/ECOSYSTEM.md) | MMT, OMDoc, Lean, and other relevant work |
| [First-medium proposal](docs/proposals/0001-first-medium.md) | The initial construction and inspection experience |
| [First-workspace verification](docs/verification/0001-first-workspace.md) | The original finite-workspace acceptance record |
| [Library verification](docs/verification/0002-preconfigured-mathematics.md) | Corpus, exploration, and construction checks |
| [Governance](GOVERNANCE.md) · [Community conduct](CODE_OF_CONDUCT.md) | Stewardship and participation |
| [Security](SECURITY.md) · [Public launch](docs/PUBLIC_LAUNCH.md) | Reporting concerns and preparing the project for release |

## Development checks

After installing the locked dependencies:

```sh
npm run test
npm run library:verify
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
sh scripts/check.sh
```

The [contribution guide](CONTRIBUTING.md#before-submitting-a-pull-request) explains browser setup. Corpus verification runs offline; see the [import procedure](docs/architecture/0002-preconfigured-mathematics.md#source-snapshot-and-reproducibility) before updating the reviewed source snapshot. File checks and successful builds do not establish mathematical claims.

## Licence and acknowledgements

Wolfbone's original code, explanations, examples, and project documentation use the **[MIT licence](LICENSE)**. Contributions do not require copyright assignment.

Imported mathlib metadata retains **Apache-2.0**, with the upstream licence, source revision, and attribution included. Dependencies and fonts retain their own terms. See [third-party notices](THIRD_PARTY_NOTICES.md).

This project builds on the work of the mathematical community, the Lean and mathlib contributors, and the maintainers of the open-source tools beneath its interface. The [ecosystem notes](docs/ECOSYSTEM.md) distinguish systems we study from capabilities we have integrated.

**Mathematics is a shared pursuit. Our contribution is another way into it.**

Maintained by [Atmai](https://github.com/ATMAI-Labs).
