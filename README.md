# Wolfbone

*Mathematical thought, across media.*

Wolfbone is an open-source project initiated by Atmai to make mathematical structures, relationships, and constructions accessible across forms of representation.

We are building a shared map in which people can explore how ideas connect, inspect the rules under which they operate, and construct through representations suited to how they think.

The name evokes an early physical medium for recording patterns. It honours the long human practice of giving thought an external form and leaves the project open to forms of mathematical reasoning beyond our own.

Wolfbone is being prepared for a public launch under the [MIT licence](LICENSE), with Atmai maintaining the project and participation and reuse at the centre of its development.

Mathematics is a shared pursuit. Our contribution is to help more minds work with it.

## Project status

Wolfbone includes a preconfigured mathematics library at `/explore` and an editable finite-function workspace at `/`. The library connects 166 original explanations and 669 labelled relationships across twelve foundational areas with a locally imported index of 321,329 mathlib declarations and 8,489 source modules. Sixteen editable examples connect exploration to construction. The [library decision](docs/architecture/0002-preconfigured-mathematics.md) explains the content, source snapshot, and preservation boundaries.

The finite workspace supports creating labelled collections, assigning outputs, composing compatible functions, and comparing results through diagrams and tables. Its canvas shows expanded collection cards. A general category-level construction engine remains future work.

The selected stack is Next.js 16, React 19, React Flow, shadcn components, Tailwind CSS, and Motion, using Atmai's 1.2 visual language. The [first-workspace decision](docs/architecture/0001-first-workspace.md) records exact versions, licence boundaries, and acceptance requirements. The mathematical model stays independent of the canvas.

The workspace is single-user and browser-local, with local storage and a versioned JSON export/import format. Each preconfigured example has a separate saved workspace. The mathlib import contains names, kinds, module imports, and source links; formal statements and proofs remain upstream. No Lean runtime, MMT adapter, or external proof-checking service is connected. Exact finite evaluation has a narrower scope than a general mathematical proof.

The [first-workspace verification](docs/verification/0001-first-workspace.md) records the original acceptance boundary. The [library verification](docs/verification/0002-preconfigured-mathematics.md) records the expanded implementation's checks. GitHub Actions is configured; local records do not establish a remote CI run or deployment.

## Run locally

Use Node.js 24 or newer and npm. Development also uses Node.js 26; Rust is not required.

```sh
npm ci
npm run dev -- --port 3100
```

Open [the local workspace](http://127.0.0.1:3100). The development server binds to the local machine. Browser data belongs to that browser and site address; use JSON export for a portable copy before changing browsers or clearing storage.

Open [the mathematics library](http://127.0.0.1:3100/explore) to start from an idea, inspect its relationships, search mathlib, or choose a working example. The bundled library is ready to use after installation; no import service, account, or external API key is required. Upstream source links require internet access.

## Start here

| Document | What it contains |
| --- | --- |
| [Project definition](docs/PROJECT.md) | Requirements, preservation obligations, and open questions |
| [Related systems](docs/ECOSYSTEM.md) | MMT, OMDoc, Lean, and relevant precedents |
| [First-medium proposal](docs/proposals/0001-first-medium.md) | The accepted first construction and inspection experience |
| [First-workspace decision](docs/architecture/0001-first-workspace.md) | Selected stack, independent mathematical model, and acceptance scope |
| [Local verification](docs/verification/0001-first-workspace.md) | Checked workflows, results, and remaining limits |
| [Preconfigured mathematics](docs/architecture/0002-preconfigured-mathematics.md) | Foundations map, mathlib metadata import, and editable examples |
| [Library verification](docs/verification/0002-preconfigured-mathematics.md) | Library integrity and exploration workflow checks |
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
npm run library:verify
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
sh scripts/check.sh
```

Unit tests exercise the finite mathematical core and workspace archive. Type checking and the production build check application integrity. Playwright exercises browser workflows against that build on port 3100; the [contribution guide](CONTRIBUTING.md#before-submitting-a-pull-request) explains browser setup. The repository script checks Markdown style, relative links, YAML syntax, and Git whitespace. These checks are configured in GitHub Actions on Node.js 24; their presence here does not report a passing run.

Library tests also cover relationship kinds, seed examples, and metadata search. `npm run library:verify` validates the bundled corpus offline. See the [import procedure](docs/architecture/0002-preconfigured-mathematics.md#source-snapshot-and-reproducibility) before updating its reviewed source snapshot.

Browser acceptance additionally needs to demonstrate construction, composition, comparison, keyboard use, persistence, and import/export. Neither a build nor a screenshot establishes those interactions, a general theorem, or translation fidelity to another mathematical system.

## Licence and attribution

Wolfbone's original code and accompanying project documentation are covered by the [MIT licence](LICENSE). Contributing does not require copyright assignment. Dependencies and fonts retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md). Linking to a mathematical library does not import or relicense it.

Maintained by [Atmai](https://github.com/ATMAI-Labs).
