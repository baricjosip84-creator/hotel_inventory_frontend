# Runtime Error Monitoring

The frontend now has optional Sentry error monitoring for both tenant and
platform routes. It remains a no-op when `VITE_SENTRY_DSN` is not configured.

## Captured

- React 19 uncaught, caught, and recoverable root errors;
- render crashes through a global application error boundary;
- backend network failures while the browser is online;
- backend HTTP 5xx responses, including backend request IDs;
- tenant, platform, role, tenant ID, support-session, environment, and release
  tags without transmitting email addresses.

## Privacy

The event filter removes query strings, request bodies, cookies, authorization
headers, CSRF values, passwords, secrets, tokens, API keys, email addresses,
phone numbers, and addresses. `sendDefaultPii` is disabled.

## Vercel variables

Runtime:

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=production`
- `VITE_SENTRY_TRACES_SAMPLE_RATE=0.05`

Build-only source map upload:

- `SENTRY_AUTH_TOKEN` (secret)
- `SENTRY_ORG`
- `SENTRY_PROJECT`

When all three build-only values exist, Vite generates hidden source maps,
uploads them to the matching Sentry release, and deletes them from the deployed
output. Vercel's commit SHA is used as the release identifier.

Sentry issue-alert rules are configured in Sentry itself, not in repository
code. Create alerts for new production issues, regressions, and five events in
five minutes.
