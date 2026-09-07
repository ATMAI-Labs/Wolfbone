# Public launch

The repository is currently private while Atmai prepares its public launch. Changing visibility is a separate maintainer decision.

## Before changing visibility

- [ ] Confirm and publish a working private contact for security and community-conduct reports in [SECURITY.md](../SECURITY.md) and [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
- [ ] Review the repository and its Git history for material that should not be made public, including private research, personal information, and credentials.
- [ ] Confirm the [MIT licence](../LICENSE), third-party notices where applicable, and that the README accurately describes the current implementation.
- [ ] Run the repository checks and inspect the latest GitHub Actions result.
- [ ] Obtain Atmai's explicit decision to change the repository visibility.

## Once public, or if the GitHub plan permits these features earlier

- [ ] Enable GitHub private vulnerability reporting and verify the reporting path.
- [ ] Enable a rule for `main` requiring pull requests, resolved conversations, and the `Documentation and configuration` status check; block force pushes and branch deletion. Choose required reviewer counts to match the actual maintainer team.
- [ ] Verify that the README, discussions, issue forms, and reporting contacts are usable by a person outside Atmai.

On 7 September 2026, GitHub returned HTTP 403 when querying repository rulesets for this private repository, stating that an upgrade or public visibility was required. Branch protection is therefore an outstanding platform-dependent step, not an enforced repository guarantee.

## What launch does not establish

Making the repository public does not certify a mathematical translation, imply compatibility with all referenced projects, or announce a finished application. Keep implementation and verification status explicit as the project develops.
