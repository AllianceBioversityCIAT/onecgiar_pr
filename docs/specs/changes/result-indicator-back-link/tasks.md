# Tasks — Clickable Area of Work on Result Detail

## 1. Scope of this task list

- **Module / feature:** `results` Result Detail chrome (`app-result-header`)
- **Linked spec:** `docs/specs/changes/result-indicator-back-link/requirements.md` + `design.md`
- **Depth:** Standard (budget 2 tasks · ~120 LOC · 1 review — `design.md` §14)
- **Status:** in-progress — RIBL-T-1 PASS
- **Judgment:** none yet
- **Pre-flight:** OQ-1..4 locked; no Jira; Submitter already shipped on the same header — do not retarget it

## 2. Task list

### RIBL-T-1 — Add the red Jest cases: Area of Work is missing on the strip `[x]`

- **Type:** `tests`
- **Size:** S
- **Status:** done
- **Depends on:** none
- **Blocks:** RIBL-T-2
- **Skills:** `tdd`, `angular-developer`
- **Description:** In `result-header.component.spec.ts`, add a `describe('area of work')` that mocks `GET_ContributorsPartners` to return a planned submitter mapping whose WP code is `AOW01` (official code fixture stays `SP04`). Assert `[data-testid="result-header-aow"]` shows `AOW01` (or `AOW01 - {name}` if the mock includes a name), that `href` contains `/result-framework-reporting/entity-details/SP04`, `tocView=byAow`, and `tocAow=AOW01`, that there is no `target="_blank"`, and that `aria-label` contains `Area of Work` and `AOW01`. On current HEAD these MUST fail (no AOW node). Do not edit the header template or class. Do not rewrite existing Submitter cases. Do not add only absence cases — those would pass on HEAD.
- **Implements:**
  - RIBL-R-1 THEN `AOW01` without ⓘ; AND “Area of Work” cue
  - RIBL-R-2 THEN `entity-details/SP04` + `tocView=byAow` + `tocAow=AOW01`; AND IT MUST NOT new window
  - RIBL-R-6 AND name contains Area of Work + AOW code; BUT MUST NOT be name-only `AOW01`
  - RIBL-AC-1, RIBL-AC-2, RIBL-AC-6 (name clause)
- **Design:** RIBL-DD-3 (Jest owns text/href); fixture lock SP04 + AOW01
- **Files:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts`
- **Verification:**
  - Command: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - Pass: new AOW-present cases **fail**; existing Submitter / identity / back-link cases still pass.
  - Disqualify: new cases pass on unfixed HEAD; `it.todo`; asserting a testid that is never queried; rewriting Submitter cases to drop href checks.
  - Input that would FAIL this check: current `result-header.component.html` with no Area of Work node — the new cases must fail on that input.
- **Done criteria:** failing cases committed; production header untouched; no secrets in fixtures.

### RIBL-T-2 — Paint Area of Work, turn the cases green, HITL wrap `[ ]`

- **Type:** `client | tests`
- **Size:** S
- **Status:** not-started
- **Depends on:** RIBL-T-1
- **Blocks:** none
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** After Submitter and before status: muted “Area of Work” + primary `routerLink` to `['/result-framework-reporting/entity-details', officialCode]` with `queryParams` `{ tocView: 'byAow', tocAow, kpi? }` (RIBL-DD-1, DD-2). When `officialCode` is non-empty, call `GET_ContributorsPartners` once per result id; map first planned submitter row per `design.md` §5; fail-soft. Do not call `RdContributorsAndPartnersService.getSectionInformation`. Do not edit `LabReportFormComponent`. Do not add `tocAow` to Submitter. Keep Default CD + a signal/field for the async mapping. `aria-label="Area of Work: {value}"`. `data-testid="result-header-aow"`. Extend the spec: missing / empty / whitespace official code (no AOW node, no `entity-details/undefined`); missing / empty / whitespace WP; unmapped (`planned_result === false`); Intermediate / 2030 sentinels; GET error → no node and no `tocAow=undefined`; code-only name; Submitter href still program home without `tocAow`; back-link unchanged; `kpi` only when exactly one indicator id. Then HITL at 900px and ~1100px vs `visual/result-detail-with-submitter.jpg`.
- **Implements:** RIBL-R-1 (remaining clauses), RIBL-R-2 (all), RIBL-R-3 (all), RIBL-R-4 (all), RIBL-R-5 (loaded mapping, no referrer), RIBL-R-6 (Tab + ring via HITL), RIBL-R-7 (HITL), RIBL-R-10, RIBL-R-11, RIBL-AC-1..AC-8
- **Design:** RIBL-DD-1, DD-2, DD-3
- **Files:**
  - `result-header.component.html`
  - `result-header.component.ts`
  - `result-header.component.spec.ts` (keep T-1 cases; add absence / kpi / Submitter-unchanged)
- **Verification (Jest):**
  - Command: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - Pass: T-1 cases green; absence (missing official code, missing WP, empty, whitespace, unmapped, Intermediate, 2030, GET error); no `tocAow=undefined`; no `entity-details/undefined`; Submitter href has no `tocAow`; back-link unchanged; one kpi id → `kpi=42`; 0 and 2+ omit `kpi`; no `target="_blank"`; no guessed `q`/`typ`/`st` on the AOW href.
  - Disqualify: hardcoded `AOW01` in production (not from the GET mock); presence-only class assert; rewriting T-1 to drop `tocAow`; calling `getSectionInformation` from the header.
  - Input that would FAIL: remove the AOW node — T-1 cases red again. Mock GET with `planned_result: false` — AOW must disappear. Submitter fixture unchanged — Submitter href must still lack `tocAow`.
- **Verification (HITL — RIBL-R-7 / AC-7; jsdom cannot):**
  - Open Result Detail at 900px and ~1100px (sidebar open). Confirm Area of Work readable and clickable; no overlap with title / PDF / ⋮; Tab reaches it after Submitter; focus ring visible; click lands on By AOW; Submitter still lands on program home.
  - Pass: wrap OK; both clicks work; Back to results still goes to the list.
  - Disqualify: one desktop screenshot; Jest green treated as wrap proof.
  - Input that would FAIL: long Submitter + long AOW — if the strip overflows or covers PDF, R-7 fails.
- **What Jest cannot prove:** wrap, overlap, focus-ring paint, contrast, live GET shape. HITL owns R-6 ring and R-7. If the live GET row has no WP field §5 can see, the control stays hidden — record that in `execution.md`; do not invent a code from the HLO title.
- **Done criteria:** strip matches DD-2; all scoped Jest green; HITL note recorded; lint clean on touched files; no aside / new endpoint / Submitter href change; commit `✨ feat(result-header): link Area of Work to By AOW`.

## 3. Clause coverage (not ID-level)

| Requirement clause | Owner |
|---|---|
| RIBL-R-1 THEN `AOW01` without ⓘ | T-1 red, T-2 green |
| RIBL-R-1 AND Area of Work cue | T-1, T-2 |
| RIBL-R-1 BUT no fabricated name if only code | T-2 Jest (code-only mock) |
| RIBL-R-1 AND IT MUST stored spelling | T-2 (AOW01 stays AOW01) |
| RIBL-R-1 multi-HLO → first planned submitter row | T-2 Jest (two rows; first wins; contributor array ignored) |
| RIBL-R-2 THEN By AOW query same tab | T-1 red, T-2 green |
| RIBL-R-2 AND IT MUST NOT new window | T-1 / T-2 (`target`) |
| RIBL-R-2 BUT no guessed filters | T-2 Jest href |
| RIBL-R-3 THEN no node when official code missing / empty / whitespace | T-2 Jest |
| RIBL-R-3 THEN no node when WP missing / empty / whitespace / unmapped / sentinel | T-2 Jest |
| RIBL-R-3 AND no `tocAow=undefined` / `entity-details/undefined` | T-2 Jest |
| RIBL-R-3 BUT rest of header still renders | T-2 + existing identity / Submitter cases |
| RIBL-R-4 THEN / BUT Submitter without `tocAow`; Back to results unchanged | T-2 Jest |
| RIBL-R-5 THEN / BUT / AND IT MUST not referrer-only | T-2 uses GET mock only; no `from` mock |
| RIBL-R-6 THEN Tab after Submitter | T-2 HITL (Jest: focusable link after Submitter in template) |
| RIBL-R-6 AND name contains Area of Work + code | T-1, T-2 |
| RIBL-R-6 BUT not name-only | T-1, T-2 |
| RIBL-R-7 THEN / BUT / AND wrap at 900 / ~1100 | T-2 HITL only |
| RIBL-R-10 SHOULD `kpi` when exactly one id; MUST omit when 0 or 2+ | T-2 Jest |
| RIBL-R-11 inline primary link, not chips | T-2 template review (no chip classes); HITL |

A gap may not be closed by citing a different requirement.

## 4. Dependency graph

```
RIBL-T-1 (red Jest — production untouched)
   └── RIBL-T-2 (GET + strip + green Jest + HITL)
```

No parallel branch. Do not start T-2 until T-1 is red on HEAD.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| RIBL-TEST-1 | unit (client) | R-1 THEN/AND, R-2 THEN/AND, R-6 name, AC-1, AC-2, AC-6 | `result-header.component.spec.ts` (T-1 then T-2) |
| RIBL-TEST-2 | unit (client) | R-3 all, R-1 code-only + first-row, R-2 no filters, R-4, R-5, R-10 | same file, T-2 |
| RIBL-TEST-3 | HITL | R-6 focus ring, R-7, R-11, AC-7 | 900px + ~1100px vs `visual/result-detail-with-submitter.jpg` |

Scoped command only: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`. Full client Jest forbidden unless the user asks.

## 6. Rollout & verification

- [ ] PR / commit: `✨ feat(result-header): link Area of Work to By AOW`
- [ ] Scoped Jest green; lint on touched files
- [ ] HITL note in `execution.md` for R-7
- [ ] No migration, no bilateral changelog
- [ ] Submitter href still program home

## 7. Cleanup & follow-ups

- [ ] Spec → shipped on archive
- [ ] Deferred: filter restore; scroll without `kpi`; Center-contributor ToC; i18n if the header leaves hardcoded English

## 8. Roll-back plan

1. Revert the header commit (template + GET subscribe + spec cases).
2. No migration to revert.
3. Confirm Submitter and **Back to results** match pre-change.

## 9. Estimated LOC and PR strategy

| | Estimate |
|---|---|
| LOC | ~120 (mapping + signal + template + spec) — matches `design.md` §14 |
| PRs | **One.** Under 400 LOC; single component. |

First task to run: **RIBL-T-1**.
