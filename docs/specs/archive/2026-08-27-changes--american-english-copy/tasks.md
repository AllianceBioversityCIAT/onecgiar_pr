# `changes/american-english-copy` — Tasks

## 1. Scope of this task list

- **Module / feature:** cross-cutting client copy — British → American English
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** not-started
- **Depth:** Lite · **Budget:** 2 tasks / ~70–110 LOC / 1 review round (design.md §9)

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1 gate 2026-08-27; adjusted same day — scope generalized per user feedback)
- [x] `design.md` approved (Phase 2 gate 2026-08-27; adjusted same day)
- [x] No open questions blocking (DB-copy and word-list-completeness blind spots are recorded risks, requirements §9)
- [x] No migrations involved (client-only)
- [ ] No conflicting in-flight spec touching the same templates (check `docs/specs/` at execution start)

## 3. Task list

### `AEC-T-1` — Classified word-list sweep: respell rendered copy and update pinned tests

- **Type:** `client`
- **Description:** Record the guard baseline (grep counts of `programmeCode|ProgrammeResults|pr\.programmeResults|\.licence|s7_kp_licence` over `onecgiar-pr-client/src`, saved to task notes). Build the word-list regex from requirements AEC-R-1's stem list. Enumerate every case-insensitive match in `onecgiar-pr-client/src` (`*.html`, `*.ts`), classify each per design.md §6 (rendered copy / test pin / comment / identifier / data-coupled), and apply case- and inflection-preserving American respelling **only** to rendered-copy hits — confirmed set: all `programme` copy (incl. heading builder `reporting-program-band.component.ts:211`, error message, `'Programme-level'`, CSV fallback `'programme'`), `<h4>Licence:</h4>` in kp-content, `'Knowledge Product — licence'` filter label — plus any new rendered-copy hit the sweep surfaces. Update every Jest expectation pinning an old string in the same edit.
- **Implements:** `AEC-R-1` (all three scenarios), `AEC-R-2` (edit-time guard: BUT NOT rename identifiers/routes/files; AND IT MUST keep `pr.programmeResults.visibleColumns` and the `licence`/`s7_kp_licence` contracts byte-identical; SortKey `'programme'` stays per `AEC-DD-3`; per-hit split of `licence` per `AEC-DD-4`), `AEC-R-3`
- **Files (expected):** hotspots in design.md §2.1 (~18–22 files under `onecgiar-pr-client/src/app/`)
- **Depends on:** — · **Blocks:** `AEC-T-2`
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Baseline guard counts recorded before any edit (a missing baseline disqualifies T-2's guard — it would compare against nothing).
  - [x] Every classified rendered-copy hit edited; classification list kept (file:line → category) for T-2's audit.
  - [x] No identifier, route, file/folder, storage-key, field-name, or bound-data edit in the diff.
  - [x] `npx jest --silent --reporters=summary --no-coverage` green in `onecgiar-pr-client`. **FAIL input proving the gate sees defects:** leaving `reporting-program-band.component.spec.ts:56` asserting "programme's 2026 ToC" turns the suite red. **Disqualifier:** a green run via `--testPathPattern` narrowing or skipped suites is not evidence — full suite only.

### `AEC-T-2` — Audit, identifier/field guard, and HITL diff review

- **Type:** `tests`
- **Description:** Verify the sweep closed. (a) **Audit (AEC-AC-1):** re-run the word-list regex over `onecgiar-pr-client/src` and classify **every** remaining hit into the allowlist (identifier/key, path, comment, data-coupled name). (b) **Guard (AEC-DD-2):** post-change counts equal T-1's baseline; exact strings `pr.programmeResults.visibleColumns` and `s7_kp_licence` still present verbatim. (c) **Compile/tests:** full client jest suite green. (d) **HITL:** present the diff at the review pause for the non-automated check — no new pipes/transform functions touching interpolated data (AEC-R-1 BUT-clause).
- **Implements:** `AEC-R-1` (Platform-wide sweep THEN-clause; BUT NOT bound-data via HITL), `AEC-R-2` (Scenario: No structural change — BUT and both AND IT MUST clauses), `AEC-R-3`, `AEC-AC-1..3`
- **Files (expected):** none (verification only; audit notes appended to this folder's `execution.md`)
- **Depends on:** `AEC-T-1` · **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Audit: zero unclassified hits. **FAIL input:** planting `<span>Programme test</span>` or `<h4>Licence:</h4>` in any template yields a hit no allowlist category absorbs → FAIL. **Disqualifier:** an exit-0 grep with unclassified hits is inconclusive, not a pass — report it as inconclusive (requirements §9). What the audit cannot prove (DB-stored copy, runtime-composed strings, British words outside the stem list) stays recorded as the accepted risks in requirements §9, not claimed as covered.
  - [x] Guard counts equal baseline; both contract strings found verbatim. **FAIL input:** renaming one `.licence` field access drops the count below baseline.
  - [x] Full jest suite green (same disqualifier as T-1).
  - [x] HITL diff review completed at the execute-phase pause; outcome recorded.
  - [x] Commit per convention — `a32779ef2` `🎨 style(client) [SPEC:changes/american-english-copy]: Standardize rendered copy to American English (program, license, center)`.

## 4. Dependency graph

```
AEC-T-1 (sweep + tests)
   └── AEC-T-2 (audit + guard + HITL)
```

No parallel branches; no cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `AEC-TEST-1` | unit (client, updated pins) | AEC-R-1 Reported label · Licence display copy · AEC-R-3 | `reporting-program-band.component.spec.ts` + every spec surfaced by T-1's classification (e.g. `programme-results.service.spec.ts:138`) |
| `AEC-TEST-2` | scripted audit + guard | AEC-R-1 sweep · AEC-R-2 | T-2 grep procedure (commands recorded in `execution.md`) |

Client coverage thresholds (50/60/60/60) unaffected — no logic changes.

## 6. Rollout & verification

- [ ] Single PR against `qa-development-2026` — ~70–110 LOC, under the ~400 LOC split threshold; no chaining.
- [ ] CI green (lint, tests, build, SonarCloud).
- [ ] Manual spot-check on staging: dashboard-lab reporting heading, portfolio-overview column header, programme-results error state, bilateral SP selector, KP review drawer "License:" heading, results-list export filter label.

## 7. Cleanup & follow-ups

- If QA finds British spellings in DB-driven labels, notification templates, or words outside the stem list, open a separate follow-up spec (requirements §9 residual risks).
