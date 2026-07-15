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

Before release, run `npm run security:check`, `npm run check:ci`, `npm run typecheck`, `npm run lint:pilot-critical`, and `npm run build` from a clean `npm ci` installation.
