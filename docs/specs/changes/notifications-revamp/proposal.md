# Proposal: notifications-revamp

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/notifications-revamp` |
| Type | Change |
| Approval Mode | gated |
| Author | Santiago Sanchez |
| Date | 2026-09-25 |
| Status | Draft — pending approval |

> **Model checkpoint:** this phase is T1 Architect. The registry (`AGENTS.md → Model Routing`) recommends `opus`; this session is on `sonnet`. You can switch with `/model opus` before approving — continuing on `sonnet` is fine, this is not a blocker.

## Intent

Redesign the visual surface of the **Notifications module** (`onecgiar-pr-client`, requests received/sent + release-style bell) to match the approved mockup, expressed through PRMS's **own** 2026 design tokens and Spartan components — not the mockup's raw CSS.

## Problem / Current Behavior

The current Notifications surface (`pages/results/pages/results-outlet/pages/results-notifications/`) is functionally equivalent but visually pre-dates the 2026 brand redesign (DD-12 in `docs/ux-ui/design.md`):

- `requests.component.html` renders "Requests received" / "Requests sent" as two plain `<a routerLink>` text links (`requests_header_item`), not a segmented control.
- `received-requests` / `sent-requests` render as flat lists — no Today/This week/Earlier grouping, no per-row Accept/Decline actions visible in a single scan, no decision-state chip.
- There is no visible multi-facet filter (Program / Center / Bilateral project) or active-filter chip row.
- The header bell (`shell-topbar.component.html`) already uses `lucideBell` + a `pr-topbar-badge` count — closer to the target than the list page, but its popover/hover states haven't been re-audited against the mockup.
- Client `CLAUDE.md` §5 flags this class of surface as **legacy SCSS-heavy**, i.e. pre-Tailwind-first, pre-preflight — a known candidate for the "migrate opportunistically" note.

## Proposed Outcome

Users see, on `/result/results-outlet/results-notifications`:

- A segmented **Received / Sent** control (Spartan tab/segmented pattern, not two bare links).
- Requests grouped under **Today / This week / Earlier** headers with a count pill.
- A search box, a **Filter** button (Program / Center / Bilateral project checkboxes) with an active-count badge, and removable filter chips.
- Each row: avatar or entity icon, result code in `font-mono`, **Accept / Decline** actions while pending, a status chip (**Accepted** / **Declined**) once decided.
- A **Notification settings** entry point aligned to the row of controls.
- The header bell badge/tooltip behavior matches the mockup (unread count, hover tooltip).

All of it built from `--pr-*` tokens, Tailwind utilities, Spartan/Helm primitives, and the existing shared status-chip pattern (`docs/ux-ui/design.md` §8 rule 2) — no new hardcoded hex, no copy-pasted mockup CSS.

## Scope

- Client only: `pages/results/pages/results-outlet/pages/results-notifications/**` (requests, received-requests, sent-requests, updates, settings, notification-item) and the bell/badge in `shared/components/shell-topbar/`.
- Visual + interaction layer: layout, grouping, segmented control, filter panel, chips, row actions, empty states.
- Reuse of existing data already surfaced by `results-notifications.service.ts` / `pop-up-notification-item` — grouping by Today/This week/Earlier is a presentation concern over the existing `time`/timestamp field unless that field is missing from the current payload (to confirm in `/akili-specify`).

## Non-Goals

- No change to **how** notifications are triggered, delivered, or stored server-side (`onecgiar-pr-server/src/api/notification`, sockets/Pusher, email microservice).
- No new notification types or business rules for accept/decline. `request_status_id` values (`1` pending, `2` accepted, `3` declined) and the accept/decline PATCH flow (`notification-item.component.ts` → `acceptOrReject`) are reused as-is.
- No change to `user-notification-settings` business logic — only ensuring the entry point/button is present and styled.
- **`pages/updates/` and `pages/settings/`** (siblings of `pages/requests/` under `results-notifications/`) are explicitly excluded — confirmed with the user 2026-09-25. Not covered by the mockup; left as-is in code; to be revamped in a later chunk.
- No dark-mode work (client is light-only per `src/CLAUDE.md` §13 — the mockup's dark-mode token pairs are **not** in scope).
- No sidebar/nav chrome changes — only the Notifications page content and the header bell.

## Affected Users, Systems, And Specs

- **Users:** all result submitters (primary consumers of Received/Sent requests), indirectly QA reviewers/PMU (they also get tagged/update notifications).
- **Client code:** `pages/results/pages/results-outlet/pages/results-notifications/**`, `shared/components/shell-topbar/`, `shared/components/header-panel/components/pop-up-notification-item/`.
- **Related specs (server-side, not touched by this change but same domain):** `docs/specs/notifications/bilateral-contributor-tagging/`, `docs/specs/notifications/bilateral-review-decision/`.
- **Design baseline to update if a new pattern emerges:** `docs/ux-ui/design.md` §8 (Component Inventory) / §12 (Design Decisions) — e.g. if "grouped-by-recency list with segmented filter" becomes a reusable pattern.

## Visual Reference

- Source: Generated mockup (Claude Design), exported by the user.
- Location: `docs/specs/changes/notifications-revamp/mockups/` — `PRMS-Reporting.dc.html` (full export, Notifications section under `showNotifications`), `screenshots/notifications-list.png`, `screenshots/bell-icon-badge.png`, `README.md` (navigation summary + token extract).
- Notes: covers the Notifications list screen (Received/Sent, grouped list, filters, actions, decision chips) and the header bell/badge. Does not cover Updates or Settings sub-pages in visual detail — `/akili-specify` should confirm whether those inherit the same treatment or are out of this chunk's scope.

## Requirement Delta Preview

### ADDED Requirements

- Segmented Received/Sent control replacing the plain text-link header.
- Time-bucketed grouping (Today / This week / Earlier) with per-group count.
- Multi-facet filter panel (Program, Center, Bilateral project) with active-filter chips and clear-all.
- Decision-state chip (Accepted/Declined) rendered in place of Accept/Decline once a request is resolved.
- Search-by-text over the requests list.

### MODIFIED Requirements

- `requests.component.html` header navigation (two `<a>` tags) → segmented control component.
- `received-requests` / `sent-requests` row rendering → grouped, chip-capable row layout.
- Bell icon/badge in `shell-topbar` → verified/aligned hover + tooltip + badge treatment against the mockup (likely small delta, not a rebuild).

### REMOVED Requirements

- None identified. This is additive/visual; no existing capability is deprecated.

## Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Token-mapped rebuild (recommended)** | Rebuild the Notifications page markup using Tailwind utilities + Spartan primitives, mapping every mockup element to an existing `--pr-*` token or Tailwind alias (`brand-*`, `surface-*`). Where the mockup implies a token that doesn't exist (status fg/bg pairs), reuse the closest existing pair (`--pr-color-green-500` / `--pr-color-red-300`) tinted for background, per hard rule "status fg/bg pairs are fixed, never invent a sixth". | Smallest safe path; fully consistent with DD-12 and the client's Tailwind-first hard rules. Requires `/akili-specify` to nail down the exact tint values. |
| **B. Introduce new `st-approved-*`/`st-rejected-*` tokens** | Add the mockup's own status token pair (`#047857`/`#D1FAE5`, `#B91C1C`/`#FEF2F2`) to `colors.scss` as first-class tokens. | Pixel-exact match to the mockup, but breaks the "never invent a sixth status color" hard rule and duplicates what `green-500`/`red-300` already mean semantically — creates two ways to say "approved". Not recommended unless design explicitly wants a new semantic (decision outcome ≠ result status). |
| **C. Wrap the mockup's HTML/CSS directly** | Port the `.dc.html` fragment with its own `var(--token)` names as scoped component CSS. | Fastest, but violates the Tailwind-first hard rule, introduces a second token system, and diverges from every other screen the moment the brand tokens next change. Rejected. |

## Recommended Approach

**Option A.** Rebuild with Tailwind + Spartan + existing `--pr-*` tokens; treat the mockup as the authoritative **layout/IA/interaction** reference and the project's `colors.scss`/`fonts.scss` as the authoritative **value** reference. Where a genuine gap exists (no existing tinted status-chip background), `/akili-specify` proposes the smallest addition to `colors.scss` following the existing naming convention, gated by the "status fg/bg pairs are fixed" rule — i.e. confirm with design whether Accepted/Declined reuses the `green-500`/`red-300` pair or is a legitimately new semantic before adding tokens.

## Risks, Dependencies, And Open Questions

- **Risk:** the mockup's dark sidebar/nav tint (`#271862`) is not in scope (sidebar untouched), but if any Notifications-page element assumes that dark chrome nearby, it needs re-checking against the real navy-carbon chrome gradient (`#1e202f → #1f2235`).
- **Resolved — grouping/decision data:** verified directly in `results-notifications.service.ts` and `notification-item.component.ts` (no backend gap, no network validation needed). Each request row already carries `requested_date` (real timestamp, already used for `Date.parse` sorting) and `request_status_id` (`2` = accepted, `3` = declined, via `acceptOrReject()`'s `isAccept ? 2 : 3`). Today/This week/Earlier bucketing and the Accepted/Declined chip are **pure frontend derivations** over data already in the payload. The only real change is the current "Pending" / "Done" two-section grouping (`received-requests.component.html`) → mockup's time-bucketed grouping.
- **Resolved — Updates/Settings scope:** confirmed with the user. `pages/updates/` and `pages/settings/` (siblings of `pages/requests/` under `results-notifications/`) are **explicitly out of scope** for this chunk — not covered by the mockup, left as-is in code, to be revamped in a later chunk.
- **Dependency:** none — no backend change required for this chunk.

## Success Criteria

- Notifications list visually matches the mockup's layout, grouping, and interaction affordances (segmented control, filters, chips, grouped list, Accept/Decline, decision chips).
- Zero new hardcoded hex values in the changed components; all colors trace to `--pr-*` tokens or Tailwind `brand-*`/status aliases.
- No `primeng` or bare native `<select>`/`<input>` introduced; Spartan/`custom-fields` primitives used throughout.
- Client Jest suite for the touched components stays green; coverage thresholds (50/60/60/60) unaffected.
- Manual browser check (per `onecgiar-pr-client/CLAUDE.md` §9) against `/result/results-outlet/results-notifications`, both Received and Sent, at desktop and tablet widths.

## Next Step

```text
/akili-specify changes/notifications-revamp
```
