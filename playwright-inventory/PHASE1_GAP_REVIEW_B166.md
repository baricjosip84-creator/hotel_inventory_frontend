# Batch 166 — Source discrepancies / pending acceptance

## Platform Users — form/server validation mismatch (open)

1. **Email:** `PlatformUsersPage.tsx:155` checks that email is non-empty, but does not enforce valid email syntax before calling `create.mutate()` (the `type="email"` input at line 205 is not submitted through a native HTML form; it does not automatically prevent an independent button click). Backend `routes/platform/users.js:40` requires `Joi.string().email().max(320)`. Browser acceptance of invalid-email feedback against real API remains unverified.
2. **Field length:** Frontend `PlatformUsersPage.tsx:155,224,226` only enforces a nonblank name and minimum password length; backend `users.js:40,44,56` requires name at most 200, password 10–200, and email at most 320. Correct client/server behavior and visible 400 feedback remain pending real acceptance.
3. **Deep-link ID:** `PlatformUsersPage.tsx:75,84,99` does not check GUID syntax in `platform_user_id`; backend `users.js:9,14` requires a valid UUID. Existing `PUSR-070` remains skipped, not promoted.

These are **source-evidence issues, not claimed execution failures**. Batch 166 does not alter application code, silently close existing BLOCKED obligations, or create mock-only tests asserting that the real backend was exercised. Classify/resolve against the product requirement before executable acceptance. `PLCR-084` is unrelated and still requires a product decision.
