# Archive Summary — `bilateral/manual-create-drawer`

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bilateral/manual-create-drawer/` |
| Archive path | `docs/specs/archive/2026-09-14-bilateral--manual-create-drawer/` |
| Archive date | 2026-09-14 |
| Approval mode | gated |
| Branch at archive | `qa-development-2026` (spec branch; default `master`) — shared-file syncs recorded as pending |
| Final status | **Shipped in branch** — 7/7 tasks PASS |

## Outcome in one paragraph

W3 bilateral **Manual Entry** creation moved from an inline wizard block into a right-side drawer (scrim, context header, RFUX footer) opened from the home project catalog or the create wizard. The form reuses KP browse/manual tabs, debounced title uniqueness, and posts an optional `title` on `POST api/bilateral/center/create-header`. AI-Assisted creation on the same page is unchanged.

## Requirements delivered

| Group | Status |
|---|---|
| `BIL-MCD-R-1..R-9` (drawer UX, validation, KP, create, AI coexistence) | Delivered |
| `BIL-MCD-AC-1..AC-7` | AC-1..AC-6 met (unit); AC-7 responsive/axe **HITL pending** |
| Server additive `title` on create-header | Delivered + change log |

## Files changed (from `execution.md`)

| Area | Summary |
|---|---|
| `onecgiar-pr-server` | `create-center-result.dto.ts`, `bilateral-center.service.ts` + spec, `bilateral-result-summaries.en.md` change log |
| `onecgiar-pr-client` | `bilateral-create-drawer/`, `bilateral-manual-create-form/`, `bilateral-manual-create-drawer-host/`, `bilateral-manual-create-flow.service.ts`, `shared/result-types-by-level.ts`, `shared/bilateral-title-legacy-type.ts`, `internationalization/bilateral-manual-create.copy.ts`, `bilateral-result-creator/*`, `bilateral-projects-panel/*`, `bilateral-creation.service.ts` + specs |
| Docs | Component `CLAUDE.md` (drawer, form), wizard section in `bilateral-result-creator/CLAUDE.md` |

## Test evidence

| Layer | Evidence |
|---|---|
| Server Jest | 53 passed — `bilateral-center.service.spec` |
| Client Jest (scoped) | drawer 8, form 19, flow service, creator 43, projects-panel, creation service |
| Lint | `npx ng lint --quiet` green |
| `test-report.md` / `validation-report.md` | **Absent — accepted**; per-task verification in `execution.md` |

## Validation summary

No `/akili-validate` run. Leader-inline audits (Implementer/Reviewer subagents unavailable). Judgment Day fixes applied at specify time.

## Accepted warnings and follow-ups

| # | Item | Where recorded |
|---|---|---|
| 1 | HITL responsive (375 / 768 / 1280px) + axe on open drawer | `execution.md` T-7 HITL table |
| 2 | Pending default-branch kaizen apply (if any guide-sync items) | `docs/specs/kaizen/bilateral--manual-create-drawer.md` |

## Historical notes

- UX iteration during execute: Back control moved header → footer → **top of body** (user-approved 2026-09-14).
- Home catalog entry: drawer opens in-place via `beginFromProject()` without navigating to `/create`.
- Copy centralized in `bilateral-manual-create.copy.ts` (RF reporting `*.copy.ts` pattern, not `TerminologyService`).
