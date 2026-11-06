# Batch 167 — Tenant Users source contract gaps (remain open)

These findings come from immutable source comparison; **no observed runtime failures** are claimed.

1. **Email format:** `UsersPage.tsx:170-179,352-361` accepts any value containing `@` and `.`; `users.validation.js:27` requires `Joi.string().email().max(255)`. The form is `noValidate` (`UsersPage.tsx:727`), so browser-native email constraint validation is not a substitute. Any real backend rejection and customer-facing remediation remain for later acceptance.
2. **Name/email lengths:** `UsersPage.tsx:736-764` has no `maxLength` on name and email, while `users.validation.js:26-27` limits them to 255. The app may send values the server rejects. No Phase 1 mock asserts that production accepts them.
3. **Whitespace-only optional edit password:** `UsersPage.tsx:175,352-361` can regard 10 spaces as a valid optional update, while `updateUser` at lines `104-113` omits a password whose trimmed value is empty. Whether to treat this as no change or show a field error needs a product decision; no automatic blocker closure is implied.
4. **Real tenant lifecycle:** `users.js` requires `users.read`/`users.write`; controller enforces tenant scope, row locking and last-active-admin protections, while deletion may be rejected by retained references. Mocked browser tests cannot prove these server/database guarantees. Existing blocked and partial acceptance records remain open.

PLCR-084 is unchanged and unrelated. Original source archives are immutable.
