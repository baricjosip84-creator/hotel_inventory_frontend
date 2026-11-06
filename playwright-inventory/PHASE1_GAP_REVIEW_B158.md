# Batch 158 — outstanding source and coverage gaps

- All 43 previous heuristic skip cases source-traced; see per-case evidence and gates in `PHASE1_MANUAL_SKIP_REVIEW_B158.md` and B158 CSV.
- **Still open: 357 labelled skips**, 24 conditional guards, 417 BLOCKED obligations, PLCR-084, and 272 partial features (39 now examined more deeply; 233 still require direct handler review).
- Source hardening: PSRD-042 offset decimal, PSRD-043 inverted page range, PSHL-066 zero-default summary, PSHL-067 missing evidence shape, PPRIV-072 invalid-date expectation.
- PUSR-070 and PSRD-080 reclassified as live API/SQL acceptance; static code does not itself establish failure.
- Preexisting B157 gaps (PNOT-061, PLEN-059/060, PPER-062) remain open, not edited.
- No original application modifications, no runtime/browser tests or compilation; original FE/BE are immutable.
