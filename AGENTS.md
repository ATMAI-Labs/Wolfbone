# Working on Wolfbone

Read [README.md](README.md) and [docs/PROJECT.md](docs/PROJECT.md) before proposing architectural or mathematical changes. Follow [CONTRIBUTING.md](CONTRIBUTING.md).

- Wolfbone is an Atmai-maintained project intended for public release under MIT. Keep the current repository visibility unless the user explicitly requests a change.
- This is a founding-stage repository. Distinguish proposals, implementations, and verified results; do not describe planned software as working.
- Preserve the source context, assumptions, and kind of each mathematical relationship. Diagram position alone does not establish mathematical meaning.
- Give ordinary-language explanations beside notation. Support construction and inspection, and avoid relying only on colour or positional directions.
- Record what an encoding or translation preserves and how that is checked. An illustration or successful build does not verify a mathematical claim.
- Preserve third-party attribution and applicable terms. Do not copy private Atmai materials, personal conversation history, or datasets into this public-intended repository without explicit authorization.
- Keep changes focused and preserve other contributors' work. Do not introduce an application framework, proof foundation, external service, or runtime by accident through a documentation change.
- For documentation and repository changes, run `npm ci` and `sh scripts/check.sh`. These checks validate files and configuration, not mathematics. Add appropriate checks when executable mathematics is introduced.
- Do not change visibility, publish packages, deploy sites, or announce releases unless requested.
