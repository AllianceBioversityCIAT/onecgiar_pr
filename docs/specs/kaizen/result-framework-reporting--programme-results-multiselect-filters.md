# Kaizen Entry — result-framework-reporting/programme-results-multiselect-filters

## Document Control

| Field | Value |
|---|---|
| Spec Path | `result-framework-reporting/programme-results-multiselect-filters` |
| Date | 2026-09-21 |
| Branch | qa-development-2026 (spec branch — Branch Context `spec`, not apply-capable) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (PRM-T-1..T-3) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md — single Reviewer PASS, no attempt records |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md — no `## Pivot Record` |
| PRODUCT_BUGs | n/a | no `test-report.md` (tests authored in-task) |
| Judgment-day severe findings | n/a | no judgment pass recorded |
| Validation FAIL / WARN | n/a | no `validation-report.md` |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 | HITL 2026-09-21 — 5/5 PASS, no defect found |
| `/akili-quick` escalation | 0 | n/a |
| Drift attributable to this spec | **1 (material)** | `git show f075a1adc` — optional Phase column, no PRM-R / PRM-T covers it |
| Unmet DoD closed as PASS | **1** | tasks.md PRM-T-3 "Re-stamp `**Verified:**`" vs the guide's stamp still reading `phase-filter-missing-phases-prod` |
| HITL declared, HITL run | declared 2026-09-15, run **2026-09-21** (6 days, 3 branches) | tasks.md §7 vs execution.md § HITL |

Not a clean run: the drift and the unmet DoD are both real signals.

## Lessons

- **KZ-result-framework-reporting--programme-results-multiselect-filters-1 — A DoD line whose only artifact is a doc stamp is the one line a Reviewer reading a code diff cannot see, so it closes PASS unmet.** (Product + Methodology, Medium)
  - Root cause (5W1H — *why did a PASS task leave its DoD unmet?*): `PRM-T-3`'s description ends with "Re-stamp `**Verified:**`", and its Definition of Done lists three bullets, none of which is the stamp. The Reviewer audits the diff against the DoD checklist; a requirement that lives only in the prose description, and whose evidence is a one-line edit inside a 24-line doc change, has no checklist row to fail against. The task shipped, the guide's `**Verified:**` header kept pointing at the *previous* spec for six days on three branches, and every agent loading that guide read a stale provenance line.
  - Evidence: `tasks.md` PRM-T-3 — description vs its three DoD bullets; `programme-results/CLAUDE.md:3` at `f075a1adc` still headed `2026-09-14 · spec bugfix/phase-filter-missing-phases-prod`; `execution.md` PRM-T-3 PASS with `CLAUDE.md` cited as evidence.
  - Standardization: → P1 (local), P2 (upstream).

## Noted, not a lesson

- **Escape has no owner in `pr-filter-multiselect`.** The options panel opens on CSS `:focus`/`:focus-within` over
  `a.field`; the component's only related code is `removeFocus(el) { el?.blur() }` bound to a click overlay. Escape
  therefore closes the panel purely because the browser blurs the focused element, and focus lands on `<body>`
  instead of returning to the trigger. It passes HITL today and any future focus-retention change would silently
  break it — but it is the shared component's behaviour since MWB-T-13, not something PRM introduced. Recurrence
  feed: if a second spec trips on `:focus`-driven panels, this becomes a lesson.
- Tab order inside any multiselect traverses every hidden 0×0 `input.pr-native-check` (90 on the SP01 Results page).
  Same shared-component provenance; below the bar alone.
- My Work renders a `+0 more` overflow chip when nothing is hidden. Cosmetic, one component, no pattern.
- Zero rework across 3 tasks. Unlike `KZ-BOR-1`'s shape, this one is credible: PRM-DD-1 reused MWB-T-13's shipped
  infrastructure wholesale, so there was little new surface for a Reviewer to fail. No entry.
- `requirements.md` `Status` still reads `draft` on a shipped spec — same cosmetic noted in `bilateral--overview-redesign`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | Add to the Definition-of-done guidance: "Every artifact the task's description promises — a doc stamp, a changelog row, a comment header — gets its own DoD checkbox naming the file and the string to look for. A requirement that exists only in the description has nothing for the Reviewer to fail against, and closes PASS unmet." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | In the task template's Definition-of-done section, state that every deliverable named in a task's Description must appear as its own DoD checkbox with a grep-able assertion; a Reviewer auditing a diff cannot fail a promise that has no checklist row. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-BOR-3` |
| Edit | Raise severity Medium → **High**; add `result-framework-reporting/programme-results-multiselect-filters` as a second source spec; recurrence note: "Recurs in the opposite direction — where BOR-3 had a spec's code lost inside a foreign commit, `f075a1adc` carried *foreign* work (an optional Phase table column: `phaseAcronym`, `phaseSort`, `formatProgrammeResultPhaseShort`, `programme-results.component.ts:126`, `.html:513`) inside the spec's own `[PRM]` commit, with no requirement, task, DoD or other spec covering it (`grep` over `docs/specs/` → 0 hits). Same root cause: the close-out commit is composed by file-set rather than by the spec's task manifest. The standing proposal — `bilateral--overview-redesign` P4, one close-out commit per spec scoped to its own files — now has two sources." |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/CLAUDE.md` — Contract section |
| Edit | Document the optional Phase column alongside the filter dimensions: "**Optional `phase` column** (`{ key: 'phase', sortField: 'phaseSort', track: '100px', optional: true }`, `programme-results.component.ts:126`): off by default, label from `formatProgrammeResultPhaseShort(row)` → `2026 · P25` (falls back to parsing `phaseName` when `phaseYear`/`phaseAcronym` are absent), sorted by the `YYYY_PNN` `phaseSort` rank. Shipped unspecified in `f075a1adc`; accepted as delivered scope at archive." |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | — |
| Edit | None. Swept root `CLAUDE.md` and `AGENTS.md`: this cycle was client-only filter work and falsified no structure, stack, command, count or project-stage claim there. The known-stale PrimeNG/Tailwind lines are already queued as `factual-sweep` items 6 and 7 in `bilateral--overview-redesign.md`; not duplicated here. |
| Severity | — |
| Status | n/a |

### P6

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | — |
| Edit | None. PRM-DD-1..DD-5 all reuse the MWB-T-13 filter infrastructure; no TRD architecture decision was overturned and no `## Pivot Record` exists. |
| Severity | — |
| Status | n/a |

*(Branch Context = `spec` — `qa-development-2026` is neither the `Default Branch:` pin (`master`) nor the
`Integration Branch:` pin (`staging`). Nothing above was written to a shared file, template, persona, guide, TRD
or digest from this branch. The `programme-results/CLAUDE.md` `**Verified:**` re-stamp applied at archive is
exempt: `tasks.md` PRM-T-3 names that file as the spec's own deliverable. P1–P4 await the apply phase on
`staging`.)*
