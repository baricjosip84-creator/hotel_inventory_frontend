# Stock Transfers UI

This document describes the stock transfer UI in the frontend.

## Page

Stock transfers are available at:

```text
/stock-transfers
```

The sidebar link is permission-aware and appears only for users with transfer access.

## Main workflows

### Create transfer

Users select:

- source location
- destination location
- transfer items
- quantities
- optional notes/reference fields when available

Creating a transfer creates a draft only. It does not move stock.

### Edit draft

Draft transfers can be edited before execution.

Executed and cancelled transfers are locked.

### Availability preview

The selected transfer detail shows source stock availability using:

```text
GET /api/stock-transfers/:id/availability
```

If source stock is insufficient, the UI warns the user before execution.

The backend still performs final validation during execution.

### Execute transfer

Execution requires confirmation.

After execution:

- source stock decreases
- destination stock increases
- transfer becomes locked
- movement audit rows become visible

### Cancel transfer

Only draft transfers can be cancelled.

Cancellation does not change stock quantities.

### Filter transfer list

The transfer list supports filters for:

- status
- search text
- source location
- destination location
- product

### Export list CSV

The page can export currently visible transfer rows to CSV.

### Export detail CSV

The selected transfer detail can export transfer metadata, items, and movement audit rows when available.

### Print detail

The selected transfer detail has a print action for operational paperwork or internal handoff.

## Important UI rules

- The UI should never imply that draft transfers have moved stock.
- Executed transfers should clearly appear locked.
- Cancelled transfers should clearly appear locked.
- Execution should require explicit confirmation.
- Frontend availability preview is helpful, but backend execution validation is authoritative.

## Manual UI test checklist

1. Open `/stock-transfers`.
2. Create a draft transfer.
3. Edit the draft.
4. Confirm availability preview appears.
5. Try an unavailable quantity and confirm warning appears.
6. Execute a valid transfer.
7. Confirm movement rows appear.
8. Export list CSV.
9. Export detail CSV.
10. Print detail view.
11. Cancel a draft transfer.
12. Confirm executed/cancelled transfers cannot be edited.
