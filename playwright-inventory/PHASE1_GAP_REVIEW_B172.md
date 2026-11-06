# Batch 172 — Supplier acceptance gaps

1. The synthetic supplier IDs (`pw-sup-01`, etc.) and generated shipment identifiers are not valid backend UUIDs. Intercepted browser mutations establish request construction only, not database acceptance or real supplier lifecycle behavior.
2. Browser role visibility is not authorization enforcement. Backend rejection, tenant isolation, version races, supplier dependency checks, and shipment SLA persistence require later isolated acceptance.
3. Performance numeric-string coercion is a frontend formatting contract, not proof that malformed backend responses are valid. Static coverage does not demonstrate real network/API integration.
4. Source-only spec assertions may still contain runtime/syntax errors until the explicitly later test compilation and execution phase. They are generated and unrun, not proven passing.
5. The previous **417** blocked obligations, **272** partial-feature acceptance records, **357** scenario-labelled skips, 21 unconditional + 3 permission-dependent in-test skips, and unresolved `PLCR-084` are all preserved and still open.
