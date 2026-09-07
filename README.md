# Wolfbone

*Mathematical thought, across media.*

Wolfbone is an open-source project initiated by Atmai to make mathematical structures, relationships, and constructions accessible across forms of representation.

We are building a shared map in which people can explore how ideas connect, inspect the rules under which they operate, and construct through representations suited to how they think.

The name evokes an early physical medium for recording patterns. It honours the long human practice of giving thought an external form and leaves the project open to forms of mathematical reasoning beyond our own.

Wolfbone is being prepared for a public launch under the [MIT licence](LICENSE), with Atmai maintaining the project and participation and reuse at the centre of its development.

Mathematics is a shared pursuit. Our contribution is to help more minds work with it.

## Project status

Wolfbone is in its founding design stage. This repository currently contains the project definition, research references, and contribution infrastructure. An executable mathematical workspace, its implementation stack, and its formal foundation have not yet been selected.

The first usable medium is being discussed. The [first-medium proposal](docs/proposals/0001-first-medium.md) describes a small two-dimensional workspace for constructing finite functions. It is a proposal, not an implemented or selected application.

## Start here

| Document | What it contains |
| --- | --- |
| [Project definition](docs/PROJECT.md) | Requirements, preservation obligations, and open questions |
| [Related systems](docs/ECOSYSTEM.md) | MMT, OMDoc, Lean, and relevant precedents |
| [First-medium proposal](docs/proposals/0001-first-medium.md) | A concrete experience to discuss before implementation |
| [Contributing](CONTRIBUTING.md) | Ways to participate and how changes are reviewed |
| [Governance](GOVERNANCE.md) | Atmai's stewardship and how decisions are made |
| [Community conduct](CODE_OF_CONDUCT.md) | Expectations for working together |
| [Security](SECURITY.md) | Reporting security concerns |
| [Public launch](docs/PUBLIC_LAUNCH.md) | Remaining steps before opening the repository |

## Participate

Contributions can be mathematical, visual, technical, or editorial. Plain-language explanations, diagrams, accessibility feedback, and counterexamples are welcome.

Use [Discussions](https://github.com/ATMAI-Labs/Wolfbone/discussions) for questions and early ideas, [Issues](https://github.com/ATMAI-Labs/Wolfbone/issues) for concrete proposals or corrections, and pull requests for changes. Repository access follows its current GitHub visibility.

## Repository checks

These tools validate the repository's documentation and configuration. They do not select the future application's runtime or verify mathematical claims.

With Node.js 24 or newer installed:

```sh
npm ci
sh scripts/check.sh
```

The checks cover Markdown style, relative Markdown file links, YAML syntax, and Git whitespace errors. The same checks run in GitHub Actions. External websites and mathematical statements are outside these checks.

## Licence and attribution

Wolfbone's original code and accompanying project documentation are covered by the [MIT licence](LICENSE). Contributing does not require copyright assignment. Preserve applicable notices and terms when proposing third-party material; linking to a mathematical library does not import or relicense it.

Maintained by [Atmai](https://github.com/ATMAI-Labs).
