# Executing the original 9,900 generated Playwright scenarios

This setup runs **existing original test IDs**, not newly invented smoke checks.

- GitHub Actions → `Inventory - original 9900 Playwright suite` → `Run workflow`.
- First select `DISCOVER_ALL`, confirmation `ORIGINALTESTS`. This actually imports/compiles/discovers the 9,900 declarations but **does not run a browser test**.
- Then select `LOGIN`, followed by `PRODUCTS`, `STOCK`, `SUPPLIERS`, and `PURCHASE_ORDERS` as each passes or is fixed. Same confirmation.
- Counts in each reviewed group: LOGIN 9, PRODUCTS 6, STOCK 8, SUPPLIERS 7, PURCHASE_ORDERS 8 (38 original IDs total). Other 9,862 remain unexecuted until their individual source and permissions are reviewed and approved for live use.
- The reviewed groups only use read-only navigation and/or mocked API responses; they cannot establish backend mutation, tenant isolation or data persistence. The real tenant login creates sessions/audit activity.
- Production read-only mode blocks non-auth POST/PATCH/PUT/DELETE network calls at the page route; a source fingerprint and exact-ID allowlist gate each supported group. The main 9,900 suite retains its disposable-environment restriction and **must not** be run unfiltered against production.
- No secrets in Playwright artifacts. Uses existing `E2E_EMAIL` and `E2E_PASSWORD` in the GitHub `Production` environment for authenticated reviewed groups. Do not upload credentials or browser storage.
- Some untested original IDs are intentionally excluded (for example tests that change inventory or require special synthetic role accounts). Avoid running those live until separately reviewed and guarded.
- Generated scenarios can fail due to stale UI assertions or mocked fixtures; a green result is evidence only for the actual assertions that ran, not full app acceptance.
