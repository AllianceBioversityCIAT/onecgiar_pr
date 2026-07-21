# Design: P2-3085 — ToC review fields in the Contribution Request notification

## Context

`notification-item.component` renders each request in a `@switch` by type. The main contribution case shows the request sentence (inside an `@if (is_map_to_toc) … @else …`) followed by `.notification_content_actions` (Accept/Decline, P2-3106). The component takes `@Input() notification: any`. The backend now adds `notification.toc_contribution_review[]` for `is_map_to_toc: true` requests.

## Goals / Non-Goals

- **Goals:** render a read-only ToC review block (7 fields, fixed order) per `toc_contribution_review` entry, between the sentence and the actions; no change to accept/decline.
- **Non-Goals:** editing any field, changing the request workflow, backend changes, the popup create surface (P2-3114).

## Decisions

### D1 — Placement & structure
Insert the block inside the `@if (notification?.is_map_to_toc)` branch, after the request sentence (`~line 76`) and before `.notification_content_actions` (`~line 79`). Iterate `@for (review of tocReview(); track $index)`; render one card per entry with the 7 fields in AC order.

### D2 — Typed accessor
Add a getter/computed `tocReview()` returning `notification?.toc_contribution_review ?? []` so the template stays clean and null-safe. Optionally introduce a small interface `TocContributionReview` for the entry shape (level, outcome_label, outcome_statement, indicator_typology, unit_of_measurement, target, contribution_target, + ids) instead of `any`.

### D3 — Read-only presentation
All fields are display-only text (label + value), reusing the existing notification styles (`notification_content_body` / a new `.toc_review` block in the component scss). No form controls. "Read-only" fields (statement, typology, unit, target) are simply non-editable text — consistent with the ToC section's read-only rendering.

### D4 — Empty / partial safety
If `toc_contribution_review` is absent or empty (older payloads, non-ToC requests), render nothing (the block is gated on `is_map_to_toc` AND a non-empty array). Individual missing fields render a neutral placeholder (e.g. `—`) rather than "undefined".

## Field mapping

See proposal table. Open question carried to design: **Q1** — does AC "Statement" map to `outcome_statement` (assumed) or `statement`? Default to `outcome_statement`; if Juanda confirms otherwise, swap the binding (1-line change).

## Risks / Trade-offs

- **No runtime data (main risk):** the reviewer test user has no contribution requests. Mitigation: implement against Juanda's documented contract + unit tests with a fixture; do the runtime e2e once a test contribution exists (coordinate with Juanda/QA).
- **Payload shape drift:** if `toc_contribution_review` keys differ from the contract, the block shows placeholders (D4) rather than breaking. Confirm keys against the first real payload.

## Migration / Rollout

Frontend-only, gated on `is_map_to_toc` + non-empty `toc_contribution_review`. Safe to ship ahead of having runtime data (renders nothing without the array).

## Open Questions

- **Q1:** "Statement" → `outcome_statement` vs `statement` (default `outcome_statement`).
- **Q2:** should multiple `toc_contribution_review` entries be visually separated (one card each) — assumed yes.
