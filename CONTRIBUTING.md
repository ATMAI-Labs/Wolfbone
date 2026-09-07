# Contributing to Wolfbone

Wolfbone welcomes contributions to its ideas, mathematics, representations,
documentation, accessibility, and code. A plain-language explanation, a diagram,
or a careful correction can be as useful as a code change. Formal notation is not
a requirement for participating.

The project is at an early stage. Its first medium and runtime are still being
discussed; there is no application installation or build procedure yet.

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
Third-party material retains its own licence and required notices. Please make
those terms visible when proposing an import; inclusion in Wolfbone does not
automatically relicense that material.

## Before submitting a pull request

Keep the change focused and explain what it improves. Describe the checks you
performed and any limits or unresolved questions. Repository checks require
Node.js 24 or newer and npm. Install the development tools and run the checks:

```sh
npm ci
sh scripts/check.sh
```

These repository checks cover formatting and document integrity; they do not
verify mathematical claims or select an application runtime. `npm run check`
runs the same checks. If you cannot run them, say so in the pull request.

Review happens through the pull request. See [governance](GOVERNANCE.md) for how
decisions are made and [our conduct guidelines](CODE_OF_CONDUCT.md) for how we
work together. Follow [SECURITY.md](SECURITY.md) for security-sensitive reports.
