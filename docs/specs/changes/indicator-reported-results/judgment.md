# Judgment-day ledger — `changes/indicator-reported-results`

| Field | Value |
|---|---|
| Target | `requirements.md`, `design.md`, `tasks.md`, `proposal.md`, `mockup/` (frozen 2026-09-03) |
| Mode | judgment_day — **inline fallback** |
| Judges | requested: 2 × `Explore` on `sonnet` (blind, read-only). Spawn 1 and 2 failed (`Failed to create teammate pane: Timed out waiting for the Orca runtime` / `tmux: Timed out waiting for split pane handle`); retry 1 and 2 failed identically. Per `/akili-specify` *Delegation During an Interactive Phase* rule 2 the review degraded to inline (author-read, single pass). Recorded as a deviation from author ≠ auditor for this phase; `/akili-execute` keeps its Implementer → Reviewer gate |
| Rounds | 1 (fixes applied, no re-judge — standing feedback 2026-09-02) |

## Findings

| ID | Severity | Document §section | Finding | Evidence | Fix applied |
|---|---|---|---|---|---|
| JI-1 | SEVERE | requirements §6 Glossary *All scope*, §10 A-2; design §4.1; tasks T-1 | "every `ResultStatusData` value except Discontinued, Rejected" silently includes **Draft (8)** | `onecgiar-pr-server/src/shared/constants/result-status.enum.ts:15` `Draft = new ResultStatusData('draft', 8)` | *All scope* is now the explicit list Editing, Quality Assessed, Submitted, Pending Review, Approved; T-1 disqualifier adds `status_id = 8` must be absent |
| JI-2 | WARNING | design §6.2 *Row menu*; tasks T-3 | "reuse the `.pr-row-menu` markup" — the rules are component-scoped | `reporting-aow-table.component.scss:204,223,256`; no global `.pr-row-menu` in `src/styles/*.scss` | copy the rules into the drawer scss with a promote-to-shared note |
| JI-3 | WARNING | design §6.2 *Row actions* | toast service not named; a wrong service would miss the `globalUserNotification` host | `programme-results.component.ts:34,564,1207` uses `PrToastService` from `shared/components/pr-toast` | named in design §6.2 and T-3 |
| JI-4 | INFO | design §14; tasks §0 | test LOC 350 likely under-counts DOM tests (`KZ-REH-1` recurrence) | KCR run: tests ≈ 900 vs 190 estimate | estimate raised to ≈ 450; trip stays 1 000 |

Verified true during the pass: `Result.obj_result_type` (`result.entity.ts:96`); `pr-table/index.ts` exports the four directives the design names; the drawer's reset effect sets `tabTouched = true` (`indicator-drawer.component.ts:135-147`) so `initialTab` always wins; handler / loader / mapper / role-resolver specs exist (8/3/4/4 `it`s); `results-api.service.spec.ts:4948` asserts the current URL, which the optional-`scope` design keeps green.

Not verifiable without a live payload (owned by T-5's disqualifier): `PhasesService.phases.reporting[].id === version_id`.

Totals: SEVERE 1 · WARNING 2 · INFO 1. Contradictions between judges: n/a (single reader).

**JUDGMENT: APPROVED ✅** (inline fallback — see Mode)
