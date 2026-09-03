# Execution Log — `changes/result-indicator-back-link`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-indicator-back-link` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Budget | 2 tasks · ~120 LOC · 1 review (`design.md` §14) |
| Started | 2026-09-03 |
| Status | in progress — RIBL-T-1 PASS; RIBL-T-2 `[~]` (Jest PASS; HITL found missing AOW — Pivot) |

## 2. Task Execution History

### RIBL-T-1 — Add the red Jest cases: Area of Work is missing on the strip

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-09-03 |
| Attempts | 1 |
| Requirements | RIBL-R-1 (THEN/AND cue), RIBL-R-2 (THEN/AND no new window), RIBL-R-6 (name), RIBL-AC-1, AC-2, AC-6 (name clause) |
| Design | RIBL-DD-3 |

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts`
- **Implementer** (`claude-sonnet-5-thinking-high`): added `describe('area of work')` with three presence cases. Mocks `apiMock.resultsSE.GET_ContributorsPartners` with a planned submitter mapping (`result_toc_result.result_toc_results[0].work_package_code = 'AOW01'`; official code fixture stays `SP04`). Queries `[data-testid="result-header-aow"]`. Production `.html` / `.ts` untouched.
- **Verification:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - 32 existing cases: PASS
  - 3 new Area of Work cases: FAIL — `TypeError: Cannot read properties of null` (no `[data-testid="result-header-aow"]` node)
- **Reviewer** (`claude-opus-5-thinking-high`, author ≠ auditor): `STATUS: PASS` — three AOW01 presence cases fail for the intended missing node; text, same-tab By AOW query, no `target`, accessible name asserted; production untouched; Submitter cases byte-identical.
- **ADVISORY** (recorded, does not gate, does not mint a task):
  - RELIABILITY: default `apiMock.resultsSE` has `currentResultCode` but no `currentResultId`. T-2 keys the GET by result id — add `currentResultId` to the fixture in T-2 so the T-1 cases can go green against a correct guard.
  - READABILITY: red cases fail via null dereference. A leading `expect(q(...)).toBeTruthy()` in T-2 would make later regressions self-describing.

#### Decisions

- Skills kept as specified: `tdd`, `angular-developer`. Effort `medium`.
- No `@akili-spec` on production — test-only.
- **Forward pointer for RIBL-T-2:** add `currentResultId` to `apiMock.resultsSE` (and keep the T-1 GET mock) so the fetch keyed by result id can resolve.

#### Issues

None.

#### Final verification

Red regression is in place. RIBL-T-2 may now paint the strip, own the GET, and turn these cases green.

### RIBL-T-2 — Paint Area of Work, turn the cases green, HITL wrap

| Field | Value |
|---|---|
| Final status | **[~] blocked on HITL** — code Reviewer PASS on attempt 2; RIBL-R-7 / AC-7 not closed |
| Date | 2026-09-03 |
| Attempts | 2 |
| Requirements | RIBL-R-1..R-6, R-10, R-11, AC-1..AC-6, AC-8 closed by Jest. RIBL-R-7 / AC-7 HITL outstanding |
| Design | RIBL-DD-1, DD-2, DD-3 (Jest half) |

#### Attempt 1

- **Files changed:** `result-header.component.{html,ts,spec.ts}`
- **Implementer** (`claude-sonnet-5-thinking-high`): strip item after Submitter; `GET_ContributorsPartners` via `ngDoCheck` keyed by `currentResultId`; `mapAowFromContributorsPartners` per §5; 51 Jest green. HITL Not Done.
- **Verification:** `Tests: 51 passed, 51 total`. Lint clean.
- **Reviewer** (`claude-opus-5-thinking-high`): `STATUS: FAIL`

**FAIL issues (verbatim):**

1. **Discovered Issue:** No test exercises the multi-row / multi-HLO path. The spec helper `plannedAowMapping` builds `result_toc_results: [row]` — a single-element array — in every one of the 19 cases, so nothing proves that the first planned row wins when several exist, and nothing proves a `contributors_result_toc_result` array is ignored. The production code does implement both (`rows.find(r => resolveAowRowCode(r))`, and `contributors_result_toc_result` is never dereferenced), but the behaviour is ungated: swapping `.find` for `.at(-1)`, or adding a `contributors_result_toc_result` fallback, leaves all 51 cases green.
    *   **Violated Rule:** `docs/specs/changes/result-indicator-back-link/tasks.md` §3 Clause coverage — `| RIBL-R-1 multi-HLO → first planned submitter row | T-2 Jest (two rows; first wins; contributor array ignored) |`, plus the closing line "A gap may not be closed by citing a different requirement." Source requirement: `requirements.md` RIBL-R-1 — "When several planned mappings exist, it MUST use the primary / first planned mapping of the submitter Science Program — not a Center-contributor mapping", and `design.md` §5 — "**Mapping (submitter SP only):** read `result_toc_result.result_toc_results[]`. Ignore `contributors_result_toc_result`. First planned row whose WP field is non-empty wins."
    *   **Remediation Suggestion:** Add two cases to the `area of work` describe. (a) Mock `result_toc_results: [{ work_package_code: 'AOW01' }, { work_package_code: 'AOW09' }]` and assert the rendered value and `tocAow` are `AOW01`, not `AOW09`. (b) Mock a response carrying both `result_toc_result.result_toc_results: [{ work_package_code: 'AOW01' }]` and a `contributors_result_toc_result` array whose row has a different code (e.g. `AOW07`), and assert the href still says `tocAow=AOW01` and never `AOW07`. Widen `plannedAowMapping` to accept a row array (or add a sibling helper) rather than reshaping the existing single-row calls.

2. **Discovered Issue:** The `{code} - {name}` display rule has no test. Every mock omits the name field, so `aowValue` is only ever exercised on the code-only branch; the name-present branch — and the `work_package_name ?? aow_name` field guess behind it — is dead as far as the gate is concerned. The Implementer recorded the field-name guess as an assumption, but the *rendering* rule is a stated design rule that jsdom can absolutely evaluate.
    *   **Violated Rule:** `design.md` §5 display-rules table — `| WP code present, short name present | {code} - {name} |` and `| WP code present, name missing | {code} only |`. Also `requirements.md` RIBL-R-1 THEN — "shows `AOW01` (or `AOW01 - {name}` if a short name is already on the mapping)".
    *   **Remediation Suggestion:** Add one case mocking `{ work_package_code: 'AOW01', work_package_name: 'Multifunctional Landscapes' }` and assert the testid text is `AOW01 - Multifunctional Landscapes` while `tocAow` stays the bare `AOW01` (the name must not leak into the query). Keep the existing code-only case as the "no fabricated name" counterpart. The field-name guess itself is a live-shape question — leave it as the recorded `execution.md` note for HITL, since Jest cannot settle it either way.

- **ADVISORY** (does not gate): kpi case should also assert `tocAow=AOW01`; `looksLikeAowCode` is broader than the §5 docstring.

#### Attempt 2

- **Files changed:** `result-header.component.spec.ts` only (production unchanged)
- **Implementer** (`claude-sonnet-5-thinking-high`, effort `high`): added three discriminating cases — multi-HLO first-wins (`AOW01` vs `AOW09`), ignore `contributors_result_toc_result` (`AOW07`), `{code} - {name}` display without leaking the name into `tocAow`. Also added advisory `tocAow=AOW01` on the `kpi=42` case. Mutation-checked each new case then restored production.
- **Verification:** `Tests: 54 passed, 54 total`
- **Reviewer** (`claude-opus-5-thinking-high`, author ≠ auditor): `STATUS: PASS` — the three attempt-1 gaps are gated by exact-value assertions a plausible mapping mutation would break. Production still matches §5 / R-1 / R-2 / R-11. R-7 remains Leader-owned HITL.
- **ADVISORY** (does not gate, does not mint a task): the name-leak negative `not.toContain('tocAow=AOW01 - Multifunctional Landscapes')` is weak against URL-encoding; parse `searchParams` if tightening later.

#### HITL probe (RIBL-R-7)

- Assumption tested: “HITL cannot run because there is no authenticated Result Detail session.”
- Probe: `:4200` is listening; `GET /` returns the PRMS SPA shell (200). `playwright-cli` is not installed in this session. No logged-in Result Detail URL was available to this agent.
- Result: **blocker confirmed**. Jest green is not wrap proof. Same class as RSBL-T-2.

#### Budget tripwire

| Signal | Budget | Actual |
|---|---|---|
| Tasks | 2 | 2 |
| LOC | ~120 (tripwire ~240) | **+318 / −9** on the three header files (most of the overrun is Jest) |
| Review rounds | 1 | **2** (attempt 1 FAIL + attempt 2 PASS) |

Exceeded review-round and LOC tripwires. Cause: attempt 1 omitted the clause-coverage Jest that `tasks.md` §3 already named. No third task minted.

#### Decisions

- Skills kept as specified: `angular-developer`, `ui-ux-pro-max` (attempt 1); `tdd` + `angular-developer` on rework. Effort `medium` then `high`.
- T-1 forward pointer applied: `currentResultId: 1234` on `apiMock.resultsSE`.
- Task stays `[~]` until HITL at 900px and ~1100px vs `visual/result-detail-with-submitter.jpg`, or the owner closes the gate the same way as RSBL-T-2.
- Name-field guess (`work_package_name ?? aow_name`) remains a live-GET question — hide if the row has no WP field §5 can see; do not invent from the HLO title.

#### Issues

HITL outstanding. Budget exceeded (reviews + LOC).

#### Final verification

Scoped Jest 54/54 green. Lint clean on the touched files (attempt 1). Submitter href unchanged. R-7 not evidenced.

#### HITL 2026-09-03 — result 8989 (owner screenshot)

- **URL:** `/result/result-detail/8989/general-information?phase=36` (`visual/hitl-8989-submitter-no-aow.jpg`)
- **Viewport:** desktop with sidebar open (wider than 1100px). Not a 900px wrap check.
- **Observed:** **Back to results** present. **Submitter:** `SP04 - Multifunctional Landscapes` (primary link). Status **Submitted**. **No Area of Work node** on the identity strip.
- **Expected (RIBL-R-1):** this result’s Contributors HLO is **AOW01** / OP 1.2.6 (`visual/result-toc-hlo-aow01.jpg`).
- **Cause (code + live payload, not a guess):** `GET /v2/api/contributors-partners/:id` → `getTocByResultV2` serializes each `result_toc_results[]` row as `toc_result_id` (numeric), `toc_level_id`, `indicators[]`. It does **not** emit `work_package_code`, `aow_code`, or a string `work_package_id`. Parent `result_toc_result.official_code` is the **Science Program** (`SP04`), not the AOW. `mapAowFromContributorsPartners` therefore returns `null` and the control hides — which is what `design.md` §13 said to do until HITL found a planned AOW01 result with no link. This is that finding.
- **R-7 wrap:** not evaluated; the control is absent.

## Pivot Record: RIBL-T-2

| Field | Value |
|---|---|
| Trigger | HITL on result 8989: planned HLO AOW01 is visible in Contributors; header hides Area of Work |
| Spec that is wrong | `design.md` §5 WP field order assumes the Contributors GET row carries `work_package_code` / `aow_code` / code-like `work_package_id`. Live V2 ToC mapping does not. |
| Not a mapping typo | Inventing AOW from the HLO title string is still forbidden (RIBL-R-1). |

**Alternatives**

| | Direction | Cost |
|---|---|---|
| **P1** | After the GET, resolve `toc_result_id` through an **existing** ToC / work-package catalog the Contributors form already uses (`GET_tocLevelsByconfig` / output list `extraInformation` / `title` that already paints **AOW01**). Keep hide if the catalog has no AOW-shaped code. No new endpoint. | One extra existing GET, keyed by result + initiative. Spec §5 field order gains `toc_result_id → catalog code`. |
| **P2** | Enrich `GET_ContributorsPartners` / `getTocByResultV2` to include `work_package_code` on each row. | Server + payload. Out of this slice’s original Non-Goals unless the owner widens. |
| **P3** | Accept hide on 8989 and close R-7 as “no AOW node to wrap.” | Honest to §13 as written; fails the user’s intent and RIBL-R-1 on the live result they reported from. |

**Recommended:** **P1** — still no new endpoint; still no title-guess; still fail-soft. Requires owner approval, then a two-direction spec sweep and a T-2 rework (effort `high`).

Stopped. No production change until the pivot is approved.
