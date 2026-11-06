# Batch 152 — manually reviewed skip dispositions and source-backed browser guards

Parent B151 SHA-256: `9b1dbcf7192132299595d4ba6baad1e38880e9f0d86bd31d8c512df96414c6b1`. Original frontend `864b8dc06350473be433d19dd72a35175eef0b4ffdf9f87443e8887e68f5f112` and backend `e6bf02aa1b1eb9cb834a5010c4a38ef08f4f17d0afd57b75d40d24395d8c2ac4` (both byte-identical to earlier source). No app modifications.

## 17 manually source-traced priority dispositions

The previous Batch 151 skip audit used a keyword heuristic. These 17 dispositions supersede it **only for the listed IDs**. No test was executed or unskipped. The code is a reference for test authoring, **not an assertion that the backend implementation is correct**.

| Scenario | Evidence class | Source reasoning / evidence needed |
|---|---|---|
| `PPER-041` | AUTH_OR_DATABASE_ACCEPTANCE | Original `src/routes/platform/permissions.js` exposes policy mutation route, but only real support-session principals + DB can prove revocation after a permission change. |
| `PUSR-072` | AUTH_OR_DATABASE_ACCEPTANCE | `src/services/platformUsersService.js` handles lifecycle; only real actor/database transaction can establish last-superadmin and self-deactivation protections. |
| `PUSR-073` | AUTH_OR_DATABASE_ACCEPTANCE | `src/services/platformUsersService.js` and permission middleware govern role changes; future authenticated requests cannot be certified via intercepted GET. |
| `PUSR-074` | AUTH_OR_DATABASE_ACCEPTANCE | `src/services/platformUsersService.js` uses bcrypt and audit logger; hashed storage, policy and durable audit need DB verification. |
| `PUSR-075` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/users.js` defines lifecycle writes; actual Platform and Support Session invalidation requires live/disposable persistence. |
| `PUSR-078` | AUTH_OR_DATABASE_ACCEPTANCE | `src/services/platformUsersService.js` exposes MFA state; actual login-lockout records and MFA possession require independent server/security evidence. |
| `PSHL-070` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-071` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-072` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-073` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-074` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-075` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-076` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-077` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-078` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-079` | AUTH_OR_DATABASE_ACCEPTANCE | `src/routes/platform/systemHealth.js` and its service expose server-side health/scoping; this explicitly Phase 2 scenario needs actual backend/SQL/principal/environment evidence, not frontend hardening. |
| `PSHL-080` | INDEPENDENT_OR_EXTERNAL_EVIDENCE | Actual infrastructure uptime requires independent external telemetry and cannot be established by React intercepts. |

## Browser tests authored, no execution

- `PUSR-088–095` (8) establish browser-only confirmation, current-user UI guard, independent session-read and revoke permissions, local draft discard, masked password field, expired lockout status, failed-login display.
- `PUSR-072/073/074/075/078` remain skipped: these are genuine database, session, password and MFA obligations. `PPER-041` and `PSHL-070–079` remain skipped for the same source-grounded reason. `PSHL-080` remains externally evidenced.
- No frontend hardening applied. `PLCR-084` is still `NEEDS_EXPECTATION`; product choice still required. It is not a passing test.

## Risk statement

The synthetic fixture returns a self-reported state and intercepts API requests. These tests **cannot prove** backend permission enforcement, state persistence, cross-tenant isolation, session revocation, password security, MFA possession, audit durability or availability. No tests compiled, discovered or executed.
