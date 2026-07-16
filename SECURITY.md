# Security Policy

## Reporting a vulnerability

Report security issues privately to the product owner. Do not post customer data, credentials, exploit details, or private source code in a public issue.

Include the affected page, user role, reproducible steps, expected behavior, actual behavior, and redacted request/error details.

## Frontend secret rule

Everything shipped to the browser is readable by the user. Therefore:

- `VITE_*` variables must contain public configuration only;
- database credentials, JWT secrets, provider API keys, SMTP credentials, and private tokens must never be present in frontend files;
- `.env` and local test-output folders must never be included in source ZIPs;
- exposed credentials must be rotated immediately.

## Required validation

Before release, run `npm run security:check`, `npm run check:ci`, `npm run typecheck:ci`, `npm run lint:pilot-critical`, and `npm run build` from a clean `npm ci` installation.

`npm run typecheck` remains the repository-wide diagnostic. The current application contains several very large advanced pages, so the required release gate uses `typecheck:ci` for the pilot-critical operational surfaces and then runs the complete Vite production compilation. Repository-wide TypeScript partitioning remains separate technical-debt work rather than a CI command that never completes.

## Generated test-artifact cleanup

Legacy branches may still contain tracked Playwright output even though `test-results/`
and `playwright-report/` are ignored and excluded from source distributions. Run:

```bash
npm run repo:clean-generated
```

The command removes those generated folders and, when run inside a Git checkout,
stages any previously tracked generated files for deletion. Commit those deletions so
future checkouts remain clean. CI runs this compatibility cleanup before the strict
repository-hygiene check; real source secrets and forbidden dependencies remain hard
failures.

## Dependency major-version policy

Dependabot version-update groups are limited to minor and patch releases. Major upgrades must be reviewed separately and merged only after `npm ci`, TypeScript, lint, production build, and staging checks pass. In particular, TypeScript and `typescript-eslint` must be upgraded as a compatible toolchain rather than independently.
