# Batch 173 — Tenant Sessions source review (not run)

Original source `frontend/src/pages/SessionsPage.tsx` inspected directly from immutable original frontend archive; backend session route `backend/src/routes/auth.js` independently checked.

New coverage: 27 unique unrun browser assertions in the existing page-specific Sessions spec.

- **TSES-051** — Network labels trim surrounding whitespace from a reported address (SessionsPage.tsx:101-111,538-541)
- **TSES-052** — IPv4-mapped loopback is identified as a proxy and preserves the reported address (SessionsPage.tsx:101-111,538-541)
- **TSES-053** — Whitespace-only network input falls back to Unknown network (SessionsPage.tsx:101-111,538-541)
- **TSES-054** — Null browser signature produces Unknown device without a fake title (SessionsPage.tsx:123-161,545-548)
- **TSES-055** — HeadlessChrome is labelled distinctly from ordinary Chrome (SessionsPage.tsx:123-161,545-548)
- **TSES-056** — Edge browser signature takes priority over embedded Chrome token (SessionsPage.tsx:123-161,545-548)
- **TSES-057** — Safari dotted version is recognized and iOS device label retained (SessionsPage.tsx:123-161,545-548)
- **TSES-058** — Playwright automation signature takes priority over Chrome markers (SessionsPage.tsx:123-161,545-548)
- **TSES-059** — Firefox on Linux keeps the browser version and OS in the summary (SessionsPage.tsx:123-161,545-548)
- **TSES-060** — Unrecognized browser signature falls back to Browser on Unknown OS (SessionsPage.tsx:123-161,545-548)
- **TSES-061** — Omitted session type does not invent a third status badge (SessionsPage.tsx:112-121,531-535)
- **TSES-062** — Tenant session type is rendered as Tenant Session rather than a raw key (SessionsPage.tsx:112-121,531-535)
- **TSES-063** — Support session type label does not itself grant support-session privileges (SessionsPage.tsx:112-121,531-535,511-524)
- **TSES-064** — Empty creation timestamp is represented by an em dash (SessionsPage.tsx:93-99,549-551)
- **TSES-065** — Malformed expiry date remains literal text for operator inspection (SessionsPage.tsx:93-99,549-551)
- **TSES-066** — Legacy missing is_active uses past expiry timestamp to disable revoke (SessionsPage.tsx:509-514,552-567)
- **TSES-067** — Legacy missing is_active with future expiry remains revocable (SessionsPage.tsx:509-514,552-567)
- **TSES-068** — Session ID of exactly eighteen characters is not shortened (SessionsPage.tsx:164-167,541-545)
- **TSES-069** — Current browser revoke control explains why individual revocation is forbidden (SessionsPage.tsx:517-527,552-567)
- **TSES-070** — Expired row explains why revocation is unnecessary (SessionsPage.tsx:517-527,552-567)
- **TSES-071** — Revoked row offers a distinct already-revoked explanation (SessionsPage.tsx:517-527,552-567)
- **TSES-072** — Other active session explains the available revoke action (SessionsPage.tsx:517-527,552-567)
- **TSES-073** — Empty revoked view provides history guidance, not the active-list message (SessionsPage.tsx:485-500,452-472)
- **TSES-074** — Revoked filter updates the inventory status badge independently of row count (SessionsPage.tsx:174-180,444-449)
- **TSES-075** — Changing the status clears prior refresh success feedback (SessionsPage.tsx:297-303,398-402)
- **TSES-076** — Changing the page size clears stale success feedback (SessionsPage.tsx:304-310,398-402)
- **TSES-077** — Last partially filled page reports correct visible row range (SessionsPage.tsx:256-264,474-483,577-591)

These tests exercise only synthetic fixture response presentation and read-only request behavior. Browser/API mocks cannot prove real token invalidation, data integrity, permissions, rate limiting or account isolation.
