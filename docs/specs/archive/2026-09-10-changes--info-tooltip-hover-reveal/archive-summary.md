# Archive Summary — Collapse Info/Help Panels By Default (`ITR`)

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/info-tooltip-hover-reveal/` |
| Archive date | 2026-09-10 |
| Ticket | [P2-3635](https://cgiarmel.atlassian.net/browse/P2-3635) |
| Owner / driver | Santiago Sanchez Correa |
| Branch | `qa-development-2026-ss` (not the default branch — see §6/§9) |
| Commit | `85b2d357f` — `✨ feat(alert-status) P2-3635: Collapse info panels by default with an accessible toggle` (pushed to `qa-development-2026-ss`) |

## 2. Final Status

**Shipped.** 15 tasks (`ITR-T-1`–`ITR-T-3`, `ITR-T-5`–`ITR-T-15`) executed via the Leader → Implementer → Reviewer triad, every one PASSed, committed together, and pushed. Confirmed correct live in the browser by the user after the final round of fixes (icon-inline placement, vertical alignment, and box-vs-popover classification across multiple screens).

One item deliberately not applied yet: `ITR-T-4`'s `docs/ux-ui/design.md` `RFUX-R-5` revision — content is approved and PASSed review, but per root `CLAUDE.md`'s shared-file write discipline it can only be applied on the default branch (`master`). The exact text is recorded in `execution.md` and reproduced in §9 below.

## 3. Requirements Delivered

| Requirement | Delivered as |
|---|---|
| `ITR-R-1`–`ITR-R-4` (revised) | Icon-only collapsed trigger; click/Enter/Space-activated floating popover; no hover-only reveal |
| `ITR-R-5` | `warning`/`error`/`success` variants unchanged, verified byte-identical across every task |
| `ITR-R-6` (narrowed by `ITR-R-31`) | Component-level fix reaches ~150+ existing call sites with no template change, except the explicit `[collapsible]="false"` exception sites |
| `ITR-R-7` | `RFUX-R-5` two-tier revision drafted and reviewed; application deferred to `master` (§9) |
| `ITR-R-10`, `ITR-R-11` | Accessible name via `aria-label`; `[hidden]`, not `*ngIf`, preserving DOM presence for ~29 existing specs |
| `ITR-R-20` | `[startExpanded]` escape hatch shipped, unused by default |
| `ITR-R-30`, `ITR-R-31` | `[collapsible]` escape hatch; ~39+ section-intro/subsection/banner sites classified and fixed across two audit rounds |
| `ITR-R-32` | `app-pr-field-header`'s existing `[tooltip]` mechanism reused for field-level, inline-with-title notes at ~13 sites (`pr-select`, `pr-multi-select` — extended with a new `tooltip` input — and `pr-yes-or-not`) |

## 4. Files Changed Summary

(From `execution.md`'s attempt-by-attempt log — 61 files in the final commit.)

- **Core component:** `custom-fields/alert-status/` (`.ts`, `.html`, `.scss`, `.spec.ts`, `.cy.ts`, `.contract.cy.ts`) — collapsed/expanded signal state, `isCollapsible`/`collapsible` logic, floating-panel CSS.
- **Shared mechanism fixes:** `custom-fields/pr-field-header/pr-field-header.component.scss` (vertical-alignment root-cause fix, `ITR-T-10`); `custom-fields/pr-multi-select/` (`tooltip` input added, `ITR-T-8`).
- **~50 call-site template files** across `pages/bilateral/`, `pages/ipsr/`, `pages/results/pages/result-detail/`, `pages/init-admin-section/`, `pages/type-one-report/`, `pages/result-framework-reporting/`, `shared/components/geoscope-management/`, `shared/components/alert-global-info/` — either inherited the new default behavior with zero changes, or received a one-attribute `[collapsible]="false"` / `[tooltip]="..."` classification.
- **Folder docs updated:** `pr-multi-select/CLAUDE.md`, `rd-contributors-and-partners/CLAUDE.md` (`Verified:` stamps + contract notes, per `onecgiar-pr-client/CLAUDE.md` §10 convention).

## 5. Test Evidence Summary

No standalone `/akili-test` or `/akili-validate` run — this spec's testing was embedded in the execute triad: every task's Reviewer independently verified the Implementer's verification command output (`npx ng lint --quiet`, `npx jest ...`, `npx cypress run --component ...`) rather than trusting the report. Full per-task evidence lives in `execution.md`.

Final pre-commit sanity sweep (this archive pass):

- `npx ng lint --quiet` (whole client) → clean.
- `npx jest --testPathPattern="alert-status|pr-field-header|pr-multi-select|rd-contributors-and-partners|innovation-dev-info|multiple-wps-content"` → **35 suites / 592 tests, all passing.**

One pre-existing, spec-unrelated Cypress flake (`alert-status.contract.cy.ts` → `[contract] updates the message when the consumer changes it after mount`) was investigated and confirmed independent of every change in this spec (reproduces identically against the untouched component).

## 6. Validation Summary

No standalone `/akili-validate` report exists for this spec — accepted as-is: validation happened continuously through 9 rounds of live user screenshot review across the session (documented as Pivot Records in `execution.md`), each round driving a new task that was itself Reviewer-verified. The user confirmed the final state correct live in the browser before requesting archive.

## 7. Accepted Warnings / Follow-Ups

| Item | Status |
|---|---|
| `docs/ux-ui/design.md` `RFUX-R-5` revision (`ITR-T-4`) | **Pending, recorded in §9 below** — apply on `master` per shared-file write discipline |
| Jira comms note to the ticket reporter (`ITR-DD-1`) | Not posted — user-owned, outside AKILI's file-editing scope |
| `ITR-OQ-1` (per-site `[startExpanded]` review) | Deliberately deferred at spec-design time; escape hatch shipped unused |
| Pre-existing Cypress flake (`alert-status.contract.cy.ts`) | Confirmed unrelated to this spec; not fixed here; worth its own ticket if the team wants it addressed |
| Full remaining ~100+ field-level notes not yet migrated to inline `[tooltip]` | Deliberately scoped out (`ITR-DD-6`) — per-site opt-in, not a blanket migration; only user-flagged examples were migrated |
| `app-field-card`/`pr-input`/`fieldRef`-driven fields (e.g. "short_title") | Explicitly discussed and deferred — same `[tooltip]` capability not yet extended to `field-card` |

## 8. Historical Notes

This spec is the clearest example in this project of iterative live-design-review execution: it started as a standard 4-task AKILI spec (icon+label+chevron disclosure) and grew to 15 tasks across 9 rounds of user screenshot feedback, each round diagnosed, scoped, and executed through the full Leader → Implementer → Reviewer loop rather than applied ad hoc. Two Implementer/Reviewer rounds found and fixed real defects that would otherwise have shipped silently:

- `ITR-T-1` attempt 1: a layout bug (expanded text collapsing to zero width) and a non-reactive `isCollapsible` getter.
- `ITR-T-7` attempt 1: 4 site-classification errors (one over-collapsed field-level note, three missed section-intro notes).
- `ITR-T-9` attempt 1: a silently-dropped note in the `reporting` module (a `null`-label edge case that hid the tooltip trigger entirely).
- `ITR-T-6`'s Reviewer FAIL later resolved to a diff-framing artifact (not a real defect) — evidence over-trusting a cumulative `git diff` without full task attribution.

`ITR-T-10` traced a real, previously-unconfirmed vertical-misalignment bug to its root cause (a flex-centering interaction between a legacy `margin` rule and a shared `.pr_label_row` container) via pure CSS-cascade/specificity reasoning, later confirmed correct by the user live in the browser.

## 9. Pending Items (spec-branch deferral — see §6 of `execution.md`'s Document Control and the command's Branch gate)

Recorded here per `/akili-archive` Step 3's branch gate (session is on `qa-development-2026-ss`, not the default branch `master`). No shared file was edited by this archive pass; these are the writes to apply on `master`.

### 9.1 — `guide-sync` — `docs/ux-ui/design.md` (`ITR-T-4`, already Reviewer-PASSed content)

Replace lines 299-301 (§"PRMS Form UX Pattern", item 2, `RFUX-R-5`) with:

```
2. **Persistent Accessible Inline Helper Copy (`RFUX-R-5`)**:
   - Revised 2026-09 (`docs/specs/archive/2026-09-10-changes--info-tooltip-hover-reveal/`) to distinguish two tiers of help text:
     - **Field-level constraint/validation copy** (calculation instructions, field constraints) MUST stay persistently visible directly below the field label in `text-[12px] text-gray-500` and programmatically linked to the input via `aria-describedby`. This tier is unchanged and MUST NOT be collapsed.
     - **Supplementary multi-paragraph guidance/example panels** (`<app-alert-status status="info">`) MAY collapse behind an accessible click/tap disclosure — a real `<button aria-expanded>` toggle, operable by click, tap, `Enter`, and `Space` — rather than always rendering expanded.
   - Either tier MUST NOT rely on hover `<span title="...">info</span>` tooltips or any other `:hover`/`title`-only reveal mechanism, which fail completely on touch devices and screen readers — this is exactly why the supplementary-guidance disclosure above is click/tap-based rather than hover-based.
```

(Note: the path in the provenance line should be updated to point at this spec's final archived location once moved, per this table's own row.)

**Severity:** low (documentation-only; shipped behavior already matches this text, so the doc is stale but not misleading users of the app itself — only future spec authors reading `RFUX-R-5`).

### 9.2 — `factual-sweep`

None found. Root `CLAUDE.md`/`AGENTS.md` carry no stale factual claims this spec falsified (this was a presentational component change with no new module, no architecture shift, no stack change).

### 9.3 — `trd-adr`

None. No architecture decision recorded in `docs/trd/trd.md` was overturned — this spec is frontend-presentational only, `docs/trd/trd.md` was never cited by `requirements.md`'s cross-reference list.
