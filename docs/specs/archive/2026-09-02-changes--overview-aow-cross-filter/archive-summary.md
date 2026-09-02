# Archive Summary — `changes/overview-aow-cross-filter`

**Outcome:** delivered in full. 18/18 tasks `[x]`. The Overview gained a ToC-scope cross-filter, and the browser-verification gate caught **seven** defects that jest, lint and `ng build` all passed clean.

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/overview-aow-cross-filter/` |
| Archive date | 2026-09-02 |
| Branch context | **spec branch** (`qa-development-2026` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Final status | **Complete** — 18/18 tasks, no unresolved FAIL |
| Approval mode | `gated` in the proposal; run pragmatically (≤1 Reviewer round per task, targeted jest) |

## 2. Final Status

| Signal | Value |
|---|---|
| Tasks | **18/18 `[x]`** (10 planned + 8 added from measured defects) |
| Reviewer rounds | 18 tasks, **6 FAIL rounds**, all remediated; 0 HALT, 0 FATAL_FAIL |
| Pivots | 1 (`OSF-T-2` — `OSF-T-1` refuted the design's root-cause analysis) |
| Tests | `dashboard-lab` **725** · `reporting-aow-table` **108** · `reporting-program-band` **59** |
| Lint / build | clean |
| `OSF-AC-9` | green at **5 widths × 2 band states × 2 tabs** |
| Commits | **none** — all work is in the working tree |

## 3. Requirements Delivered

| ID | Delivered by |
|---|---|
| `OSF-R-1`, `R-2`, `R-4`, `R-7`, `R-11` | `OSF-T-4` (host scope state, URL sync) |
| `OSF-R-3` | `OSF-T-5` (W3/Bilateral partition, all four cards) |
| `OSF-R-5`, `R-6`, `R-13` | `OSF-T-7`, `OSF-T-13` |
| `OSF-R-8`, `R-9`, `R-10` | `OSF-T-2`, `T-2c`, `T-2b`, `T-10`, `T-12`, `T-15`, `T-16` |
| `OSF-R-14` | `OSF-T-6` (`Not tagged` selectable) |
| `OSF-NFR Accessibility` | `OSF-T-9`, `OSF-T-14` |
| `OSF-AC-1`…`AC-12` | verified across `OSF-T-4`, `T-7`, `T-8`, and the four width tasks |

## 4. Files Changed

**Server** — `results-framework-reporting.service.ts` (+spec), `results.service.ts` (+spec), **new** `w1-w2-result-source-filter.constant.ts` (the single-homed W1/W2 population filter — the FIND-01 fix).

**Client** — `dashboard-lab.component.{ts,html}`, **new** `overview-scope-filter.ts` (single-homed pure filter), **new** `dashboard-lab.scope.spec.ts`; `program-overview.component.{ts,html}` + `CLAUDE.md`, **new** `program-overview.scope.spec.ts`; `reporting-program-band.component.{html,spec.ts}`; `reporting-aow-table.component.{html,ts,spec.ts}` + `CLAUDE.md`; `pr-viz-chart.component.{html,spec.ts}`; `entity-details.interface.ts`; **new** `src/app/spartan/popover/`; `package.json`, `tsconfig.json`, `tests/mocks/spartanBrainMock.ts`.

## 5. Test Evidence

Per-task, recorded in `execution.md` §1–§21: targeted jest, `ng lint --quiet`, `ng build` (run deliberately — lint and `tsc --noEmit` do not typecheck Angular templates), plus **element-level browser measurement** on the live authenticated stack for every layout and accessibility clause.

**No `test-report.md`** — `/akili-test` was never run. **Explicitly accepted:** verification was performed in-task and is stronger than the usual artifact, because the defect classes here (layout starvation, contrast ratios, accessible names, page overflow) are ones jsdom cannot evaluate at all.

## 6. Validation

**No `validation-report.md`** — `/akili-validate` was never run. **Explicitly accepted:** every task carried an independent Reviewer (author ≠ auditor, Implementer on T2 / Reviewer on T3), and the six FAIL rounds are recorded verbatim with their remediation. No FAIL was closed by argument; each was closed by a re-measurement.

## 7. Accepted Warnings & Follow-Ups

| Item | Disposition |
|---|---|
| Sighted keyboard-only / touch users cannot reach content shed to a `title` (no `focus` listener on `PrTooltipDirective`) | Advisory. Same standing kaizen item §5 raised about this file's `truncate`-without-`title` convention — a codebase-wide question, not this spec's defect |
| `reporting-aow-table/CLAUDE.md` is 133 lines against a 120 cap (was 125 before this spec) | Pending item — trim on the default branch |
| Five pre-existing `max-[899px]`/`max-[1279px]` sites share the Tailwind exclusive-boundary bug | Pending item; deliberately not touched (out of scope) |
| Three owner-raised improvements | Recorded in `docs/specs/changes/overview-aow-followups.md` as a `/akili-propose` seed — new scope, deliberately kept out so this spec could close |
| Nothing committed | Three PRs per `tasks.md` §7, now carrying `T-2b`, `T-9`…`T-16` — a disclosed budget overrun |

## 8. Historical Notes

**The gate earned its place.** Seven defects shipped past every automated check: an AoW name column collapsed to **0px** at three of five widths; a focus ring that computed to `none`; an active-option indicator at **1.09:1** against a 3:1 requirement; group headers at **3.04:1** against 4.5:1; a **48px** page overflow at 768px; **98px** at 900px; **177px** on the Reporting tab. Jest, lint and `ng build` were green throughout.

**One measurement family, six variants.** Every one produced a confident, defensible "clean": `overflowsParent` instead of page level · page level with the band expanded · verified at 768 and inferred for 900 · two offenders of similar size (47px/48px) masking each other · `set viewport` in sequence without reload · reading during the loading skeleton. The most transferable fact: **900px is more constrained than 768px** (at 768 the sidebar is `hidden md:block`; at 900 the 64px rail renders), so "if the narrowest passes, the wider ones pass" is invalid on this surface.

**Twice a task fixed one accessibility defect and introduced another** at the same widths (§14, §19) — both times by applying the right treatment at one site and not carrying it to the site the task itself added. `OSF-T-16` broke the streak.

**The structural gap:** `OSF-DD-9` describes the breakdown without enumerating its columns, and no DoD said "match the mockup's column set". The pre-flight records *Mockup approved*, but the mockup was never a **gate** — so `OSF-T-7` shipped three columns where the mockup has four, and its Reviewer passed it correctly, auditing the DD text the diff satisfied. **An approved mockup that no DoD references cannot fail anything.**
