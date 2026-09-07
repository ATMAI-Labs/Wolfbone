# Contributing to Wolfbone

Wolfbone welcomes contributions to its ideas, mathematics, representations,
documentation, accessibility, and code. A plain-language explanation, a diagram,
or a careful correction can be as useful as a code change. Formal notation is not
a requirement for participating.

The project is at an early stage. Its first browser prototype implements
finite labelled sets and functions, with scoped
[local verification](docs/verification/0001-first-workspace.md). Read the
[first-workspace decision](docs/architecture/0001-first-workspace.md) for the
accepted stack and mathematical scope. Keep the mathematical model independent
of canvas layout and preserve exact object identities.

## Work locally

Use Node.js 24 or newer and npm. Node.js 26 is also used for local development;
Rust is not required for this workspace.

```sh
npm ci
npm run dev -- --port 3100
```

Open [the local workspace](http://127.0.0.1:3100). It uses this browser's local
storage; JSON export provides a portable copy. It is a single-user workspace,
without synchronisation between users or browsers.

## Start with the contribution you can make

- Open an issue to ask a question, describe a problem, or explore an idea.
- Suggest a correction with the relevant definition, assumption, or source.
- Describe an accessibility barrier and what would make the material usable.
- Send a small pull request for a clear improvement. Discuss substantial changes
  to the project's foundations or direction in an issue first.

Screenshots and diagrams are welcome. Please include a short text description
of the relationships they show so others can engage with the same idea.

## Make claims inspectable

Explain the context and assumptions behind a mathematical claim. Distinguish:

- **Proposed:** an idea or design under discussion.
- **Implemented:** something exists in the repository.
- **Verified:** a stated property has been checked, with the method and scope
  recorded.

An implementation alone does not establish mathematical correctness. An
explanation, conjecture, formal statement, and checked proof serve different
roles; identify which one you are contributing. Corrections and counterexamples
are welcome at every stage.

## Credit sources and preserve their terms

Link to sources for imported definitions, quotations, examples, and code. Record
the relevant version or revision when it affects interpretation or behaviour.

Wolfbone's original code and documentation use the [MIT licence](LICENSE).
Third-party material retains its own licence and required notices. Update
[third-party notices](THIRD_PARTY_NOTICES.md) when adding or changing bundled
components or fonts, and preserve the complete terms supplied by each package.
Inclusion in Wolfbone does not automatically relicense that material.

## Before submitting a pull request

Keep the change focused and explain what it improves. Describe the checks you
performed and any limits or unresolved questions. Repository checks require
Node.js 24 or newer and npm. Install the development tools and run the checks:

```sh
npm ci
npm run test
npm run library:verify
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
sh scripts/check.sh
```

Unit tests exercise the finite mathematical core and archive behaviour. Types
and the build check application integrity. Playwright checks browser workflows
against the production build, starting a local server on port 3100 when needed.
Keep that port available, or ensure an existing server serves the intended build.
The repository script covers
formatting and document integrity; `npm run check` runs that same documentation
check. GitHub Actions is configured to run these checks on Node.js 24. Record
actual outcomes, and say which checks you could not run.

The Chromium installation is needed once and again when Playwright requires a
new browser version. An existing compatible Chrome or Chromium installation can
be used instead by setting `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable's
absolute path and omitting the browser download. CI installs Chromium and its
system dependencies explicitly.

For an interaction change, exercise the affected browser workflow and keyboard
path. Creating and editing a function, inspecting a composition or disagreement
witness, switching representations, and saving or importing must be checked at
their actual effect. Consult the decision's
[acceptance requirements](docs/architecture/0001-first-workspace.md#acceptance-evidence-required).
Finite examples and successful builds do not constitute a general proof or a
verified connection to Lean, MMT, or another system.

Review happens through the pull request. See [governance](GOVERNANCE.md) for how
decisions are made and [our conduct guidelines](CODE_OF_CONDUCT.md) for how we
work together. Follow [SECURITY.md](SECURITY.md) for security-sensitive reports.
