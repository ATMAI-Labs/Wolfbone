# Wolfbone

*Mathematical thought, across media.*

Wolfbone is an open-source project initiated by Atmai to make mathematical structures, relationships, and constructions accessible across forms of representation.

We are building a shared map in which people can explore how ideas connect, inspect the rules under which they operate, and construct through representations suited to how they think.

The name evokes an early physical medium for recording patterns. It honours the long human practice of giving thought an external form and leaves the project open to forms of mathematical reasoning beyond our own.

Wolfbone is being prepared for a public launch under the [MIT licence](LICENSE), with Atmai maintaining the project and participation and reuse at the centre of its development.

Mathematics is a shared pursuit. Our contribution is to help more minds work with it.

## Project status

The first local prototype is implemented and locally verified within a finite-set/function scope: create labelled collections, assign outputs, compose compatible functions, and compare their results through diagrams and tables. Its canvas shows expanded collection cards; a collapsed category overview remains future work. This is a bounded first mathematical setting within Wolfbone's wider direction.

The selected stack is Next.js 16, React 19, React Flow, shadcn components, Tailwind CSS, and Motion, using Atmai's 1.2 visual language. The [first-workspace decision](docs/architecture/0001-first-workspace.md) records exact versions, licence boundaries, and acceptance requirements. The mathematical model stays independent of the canvas.

The workspace is single-user and browser-local, with local storage and a versioned JSON export/import format. It does not yet integrate full mathlib, MMT, or an external proof-checking service. Exact finite evaluation has a narrower scope than a general mathematical proof; implementation and verification status remain distinct.

The [local verification record](docs/verification/0001-first-workspace.md) reports 43 passing core/archive tests, 11 passing browser tests, and successful type, production-build, and source-format checks. GitHub Actions is configured; a remote CI run or deployment is not claimed.

## Run locally

Use Node.js 24 or newer and npm. Development also uses Node.js 26; Rust is not required.

```sh
npm ci
npm run dev -- --port 3100
```

Open [the local workspace](http://127.0.0.1:3100). The development server binds to the local machine. Browser data belongs to that browser and site address; use JSON export for a portable copy before changing browsers or clearing storage.

## Start here

| Document | What it contains |
| --- | --- |
| [Project definition](docs/PROJECT.md) | Requirements, preservation obligations, and open questions |
| [Related systems](docs/ECOSYSTEM.md) | MMT, OMDoc, Lean, and relevant precedents |
| [First-medium proposal](docs/proposals/0001-first-medium.md) | The accepted first construction and inspection experience |
| [First-workspace decision](docs/architecture/0001-first-workspace.md) | Selected stack, independent mathematical model, and acceptance scope |
| [Local verification](docs/verification/0001-first-workspace.md) | Checked workflows, results, and remaining limits |
| [Contributing](CONTRIBUTING.md) | Ways to participate and how changes are reviewed |
| [Governance](GOVERNANCE.md) | Atmai's stewardship and how decisions are made |
| [Community conduct](CODE_OF_CONDUCT.md) | Expectations for working together |
| [Security](SECURITY.md) | Reporting security concerns |
| [Public launch](docs/PUBLIC_LAUNCH.md) | Remaining steps before opening the repository |

## Participate

Contributions can be mathematical, visual, technical, or editorial. Plain-language explanations, diagrams, accessibility feedback, and counterexamples are welcome.

Use [Discussions](https://github.com/ATMAI-Labs/Wolfbone/discussions) for questions and early ideas, [Issues](https://github.com/ATMAI-Labs/Wolfbone/issues) for concrete proposals or corrections, and pull requests for changes. Repository access follows its current GitHub visibility.

## Development checks

After installing the locked dependencies, run:

```sh
npm run test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
sh scripts/check.sh
```

Unit tests exercise the finite mathematical core and workspace archive. Type checking and the production build check application integrity. Playwright exercises browser workflows against that build on port 3100; the [contribution guide](CONTRIBUTING.md#before-submitting-a-pull-request) explains browser setup. The repository script checks Markdown style, relative links, YAML syntax, and Git whitespace. These checks are configured in GitHub Actions on Node.js 24; their presence here does not report a passing run.

Browser acceptance additionally needs to demonstrate construction, composition, comparison, keyboard use, persistence, and import/export. Neither a build nor a screenshot establishes those interactions, a general theorem, or translation fidelity to another mathematical system.

## Licence and attribution

Wolfbone's original code and accompanying project documentation are covered by the [MIT licence](LICENSE). Contributing does not require copyright assignment. Dependencies and fonts retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md). Linking to a mathematical library does not import or relicense it.

Maintained by [Atmai](https://github.com/ATMAI-Labs).
