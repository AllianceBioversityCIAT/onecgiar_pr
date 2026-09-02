# Tasks — Clickable Submitter on Result Detail

## 1. Scope of this task list

- **Module / feature:** `results` Result Detail chrome (`app-result-header`)
- **Linked spec:** `docs/specs/changes/result-submitter-back-link/requirements.md` + `design.md`
- **Depth:** Standard (budget still 2 tasks · ~80 LOC · 1 review — `design.md` §14)
- **Status:** in progress — RSBL-T-1 done; RSBL-T-2 Reviewer PASS, HITL outstanding
- **Judgment:** Fix only applied; no re-judge (`judgment.md`)
- **Pre-flight:** OQ-1/2/4 locked; OQ-3 no Jira; no other active spec edits `result-header`

## 2. Task list

### RSBL-T-1 — Add the red Jest cases: Submitter is missing on the strip `[x]`

- **Type:** `tests`
- **Size:** S
- **Status:** done
- **Depends on:** none
- **Blocks:** RSBL-T-2
- **Skills:** `tdd`, `angular-developer`
- **Description:** In `result-header.component.spec.ts`, add cases that use the existing fixture (`initiative_official_code: 'SP04'`, `initiative_name: 'Multifunctional Landscapes'`) and assert a Submitter node (`data-testid="result-header-submitter"`) shows `SP04 - Multifunctional Landscapes`, that its `routerLink` / `href` is `/result-framework-reporting/entity-details/SP04` with no `target="_blank"`, and that `aria-label` contains `Submitter` and `SP04`. On current HEAD these MUST fail (the strip has no Submitter). Do not edit the header template or class. Do not add only “absent when no code” cases — those already pass.
- **Implements:**
  - RSBL-R-1 THEN `SP04 - Multifunctional Landscapes` without ⓘ; AND visible Submitter cue (`aria-label` or text)
  - RSBL-R-2 THEN `/result-framework-reporting/entity-details/SP04`; AND IT MUST NOT open a new window (`target`)
  - RSBL-R-6 AND accessible name contains Submitter + official code; BUT MUST NOT be name-only `SP04`
  - RSBL-AC-1, RSBL-AC-2, RSBL-AC-6 (name clause)
- **Design:** RSBL-DD-3 (Jest owns text/href); fixture lock C-1 (`SP04`, not screenshot SP09)
- **Files:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts`
- **Verification:**
  - Command: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - Pass: new Submitter-present cases **fail**; existing identity / back-link cases still pass.
  - Disqualify: new cases pass on unfixed HEAD; only a comment or skipped `it.todo`; asserting a testid that is not queried. Presence of the spec file with no run log is not evidence.
  - Input that would FAIL this check: current `result-header.component.html` with no Submitter node — the new cases must fail on that input. If they pass, they are not exercising the strip.
- **Done criteria:** failing cases committed; production header untouched; no secrets in fixtures.

### RSBL-T-2 — Paint Submitter, turn the cases green, HITL wrap `[~]`

- **Type:** `client | tests`
- **Size:** S
- **Status:** in-progress
- **Depends on:** RSBL-T-1
- **Blocks:** none
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** Add the identity-strip item after funding and before status: muted “Submitter” + primary `routerLink` to `['/result-framework-reporting/entity-details', officialCode]` (RSBL-DD-1, DD-2). Render only when official code is non-empty after trim. Value is `{code} - {name}` or code alone. `aria-label="Submitter: {value}"`. Hardcode “Submitter” like “Back to results”. Keep Default change detection. Do not edit `LabReportFormComponent`, do not add query params, do not replace **Back to results**. Extend the spec: missing / empty / whitespace-only → no node and no `entity-details/undefined`; code-only (no name) → `SP04` without a fabricated name; `SGP-02` stays `SGP-02` in the path; existing back-link still `/result/results-outlet/results-list`. Then HITL at 900px and ~1100px (sidebar open) against `visual/current-header-no-submitter.jpg`.
- **Implements:** RSBL-R-1 (all remaining clauses), RSBL-R-2 (all), RSBL-R-3 (all), RSBL-R-4 (all), RSBL-R-5 (currentResult only), RSBL-R-6 (Tab order + focus ring via HITL), RSBL-R-7 (HITL), RSBL-R-10, RSBL-AC-1..AC-7
- **Design:** RSBL-DD-1, RSBL-DD-2, RSBL-DD-3
- **Files:**
  - `result-header.component.html`
  - `result-header.component.ts`
  - `result-header.component.spec.ts` (keep T-1 cases; add absence / hyphen / code-only)
- **Verification (Jest):**
  - Command: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - Pass: T-1 cases green; absence (missing, empty, whitespace-only); no `entity-details/undefined`; back-link unchanged; `SGP-02` path uses stored spelling; no `target="_blank"`; no extra query on the Submitter `href`.
  - Disqualify: green cases with a hardcoded `SP04` in production (not from `currentResult`); a presence-only assert that a class name exists; rewriting T-1 to drop the href check.
  - Input that would FAIL: remove the Submitter node — T-1 cases must go red again. Set official code to `'   '` — Submitter must disappear.
- **Verification (HITL — RSBL-R-7 / AC-7; jsdom cannot):**
  - Open Result Detail at 900px and ~1100px. Confirm Submitter readable and clickable; no overlap with title / PDF / ⋮; Tab reaches it after Back to results and title-row actions; focus ring visible; click lands on program home.
  - Pass: wrap OK; click works; Back to results still goes to the list.
  - Disqualify: one desktop screenshot; Jest green treated as wrap proof.
  - Input that would FAIL: a name long enough to wrap — if the strip overflows or covers PDF, R-7 fails.
- **What Jest cannot prove:** wrap, overlap, focus-ring paint, contrast, full-page refresh. HITL is the behavioral proof for R-6 ring and R-7. R-5 refresh is implied by `currentResult`-only (no referrer); HITL refresh is optional confirmation.
- **Done criteria:** strip matches DD-2; all scoped Jest green; HITL note recorded (two widths, click, Tab); lint clean on touched files; no aside / API / query change; commit `✨ feat(result-header): show clickable submitter SP`.

## 3. Clause coverage (not ID-level)

| Requirement clause | Owner |
|---|---|
| RSBL-R-1 THEN `SP04 - Multifunctional Landscapes` without ⓘ | T-1 red, T-2 green |
| RSBL-R-1 AND Submitter cue (text or aria) | T-1, T-2 |
| RSBL-R-1 BUT no fabricated name if only code | T-2 Jest (code-only fixture) |
| RSBL-R-1 AND IT MUST keep stored spelling (`SGP-02`) | T-2 Jest |
| RSBL-R-2 THEN `entity-details/SP04` same tab | T-1 red, T-2 green |
| RSBL-R-2 AND IT MUST NOT new window | T-1 / T-2 (`target`) |
| RSBL-R-2 BUT no AOW / `tocView` / return query | T-2 Jest href |
| RSBL-R-3 THEN no Submitter when missing / empty / whitespace | T-2 Jest (would pass on HEAD; not T-1) |
| RSBL-R-3 AND no `entity-details/undefined` | T-2 Jest |
| RSBL-R-3 BUT rest of header still renders | T-2 + existing identity cases |
| RSBL-R-4 THEN / BUT Back to results unchanged | T-2 Jest (existing assertion kept) |
| RSBL-R-5 THEN / BUT / AND IT MUST not referrer-only | T-2 Jest uses `currentResult` only; no `from` mock |
| RSBL-R-6 THEN Tab after Back to results + title actions | T-2 HITL (Jest: node is a focusable link after those nodes in the template) |
| RSBL-R-6 AND name contains Submitter + code | T-1, T-2 |
| RSBL-R-6 BUT not name-only | T-1, T-2 |
| RSBL-R-7 THEN / BUT / AND wrap at 900 / ~1100 | T-2 HITL only |
| RSBL-R-10 inline primary link, not chips | T-2 review of template (no chip classes); HITL |

A gap may not be closed by citing a different requirement.

## 4. Dependency graph

```
RSBL-T-1 (red Jest — production untouched)
   └── RSBL-T-2 (strip + green Jest + HITL)
```

No parallel branch. Do not start T-2 until T-1 is red on HEAD.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| RSBL-TEST-1 | unit (client) | R-1 THEN/AND, R-2 THEN/AND, R-6 name, AC-1, AC-2, AC-6 | `result-header.component.spec.ts` (T-1 then T-2) |
| RSBL-TEST-2 | unit (client) | R-3 all, R-1 code-only + hyphen, R-2 no query, R-4, R-5 | same file, T-2 |
| RSBL-TEST-3 | HITL | R-6 focus ring, R-7, R-10, AC-7 | 900px + ~1100px vs `visual/current-header-no-submitter.jpg` |

Scoped command only: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`. Full client Jest forbidden unless the user asks.

## 6. Rollout & verification

- [ ] PR / commit: `✨ feat(result-header): show clickable submitter SP`
- [ ] Scoped Jest green; lint on touched files
- [ ] HITL note in `execution.md` for R-7
- [ ] No migration, no bilateral changelog

## 7. Cleanup & follow-ups

- [ ] Spec → shipped on archive
- [ ] Deferred: Option C (exact AOW), Center-as-submitter, i18n if header later leaves hardcoded English

## 8. Roll-back plan

1. Revert the header commit (template + getters + spec cases).
2. No migration to revert.
3. Confirm **Back to results** and identity strip match pre-change.

## 9. Estimated LOC and PR strategy

| | Estimate |
|---|---|
| LOC | ~80 (template + getters + spec) — matches `design.md` §14 |
| PRs | **One.** Under 400 LOC; single component. |

First task to run: **RSBL-T-1**.
