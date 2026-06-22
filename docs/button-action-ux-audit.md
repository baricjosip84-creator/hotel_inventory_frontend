# Button and Action UX Audit

Final completion status: complete for the current source tree.

This audit documents the global button/action UX coverage implemented for the inventory app at the app-provider and shared API layers.

## Static coverage scope

The audit script scans the current `src` tree for actionable controls:

- `button`
- `a[href]`
- `[role="button"]`
- `input[type="button"]`
- `input[type="submit"]`
- `input[type="reset"]`

The current completion contract requires the global app provider to cover every rendered actionable control unless it is intentionally excluded as navigation, authentication, pagination, close/cancel UI, or an explicitly skipped control.

## Behaviors enforced

- Dangerous/destructive actions ask for confirmation.
- Cancelled dangerous actions show cancellation feedback.
- Save/create/update/delete/download API actions show success or error toasts.
- Tenant API mutations show success/error feedback.
- Platform API mutations show success/error feedback.
- Tenant downloads show success/error feedback.
- Platform downloads show success/error feedback.
- Clipboard copy actions show copied/failed feedback.
- Print actions show print-dialog feedback.
- Form submissions outside authentication screens show submit feedback.
- Local non-API actions such as refresh, load, view/open, copy, print, export, generate, preview, scan, upload, add, append, replace, reset and selection changes show feedback.
- Every non-navigation, non-benign, non-skipped action has fallback feedback through the global `Action started.` message.
- Navigation/sidebar buttons are skipped to avoid noisy messages.
- Auth/login forms are skipped to avoid duplicate or confusing login feedback.

## Intentional exclusions

These are intentionally excluded from global feedback because feedback would be noisy or misleading:

- Sidebar navigation
- Navigation links inside `<nav>` or `[role="navigation"]`
- Pagination previous/next/page controls
- Close buttons
- Cancel edit/cancel form controls
- Simple risk filter chips
- Authentication/login forms
- Explicitly skipped elements using `data-skip-global-action-feedback="true"`

## Completion guarantee

For the current source tree, the feature is complete at implementation level because the app now has:

1. global click capture for actionable controls,
2. global dangerous-action confirmation,
3. global fallback feedback for otherwise uncovered custom local handlers,
4. global form-submit feedback,
5. shared tenant/platform API mutation feedback,
6. shared tenant/platform download feedback,
7. clipboard and print feedback,
8. static audit enforcement in `npm run check:button-action-ux-audit`.

Runtime testing can still reveal business-rule bugs in individual workflows, but missing button/action UX coverage is now handled globally instead of relying on page-by-page manual fixes.
