# Execution — KP related: strongest first (`KRS`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-strongest-first/` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated |
| Started | 2026-10-22 |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` · Reviewer `akili-reviewer` |

**Pre-flight notes.**
- The KRR archive is still staged and not committed. It only moves docs, while KRS edits code, so the files do not collide. Nothing is committed without the user's go-ahead.
- T-1 and T-2 ran one after the other for testing: only one Jest run at a time on this machine. T-2's implementation started while the T-1 Reviewer, which is read-only, was auditing.

## Task Execution History

### KRS-T-1 — Server: related-only filter, request-wide gate, echo

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-22 |
| Requirements | R-2 (server), R-3, NFR-1, NFR-2, NFR-3 |
| Skills | `nestjs-expert`, `api-design-principles`, `tdd` (Leader selection = task list) |
| Effort | high |

**Attempt 1: Implementer**

Files changed, all under `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/` (+376/-6; about 118 prod LOC including comments, about 263 test LOC):

| File | Change |
|---|---|
| `project-relevance.ts` | `RelevanceBlockMode`; `buildRelevanceBlock(..., mode='boost')`. `'filter'` emits the same clauses without the `*:* OR` arm |
| `repositories.config.ts` | `buildFilterQuery` builds the full, untrimmed block, or `null` when it encodes to 2000 or more. `composeScopedQuery` returns `{query, ranked, filtered}`. `resolveProjectScope.relatedOnly = requested ∧ ranked ∧ every KP_REPOSITORY_VALUES adapter has a filtered query`. `translateParams` sends the filter form with no `sort` when `relatedOnly`; otherwise the KRR branch is unchanged |
| `cgspace-discovery.service.ts` | Echo `projectScope.relatedOnly`; `projectRelatedOnly` added to the search cache key |
| `dto/cgspace-search-query.dto.ts` | Optional `projectRelatedOnly` with `@Transform` (`'true'`/`true` → true, other text → false, absent → undefined), `@IsBoolean` and Swagger |
| `dto/cgspace-item.dto.ts` | `CgspaceProjectScopeDto.relatedOnly` with Swagger |
| `*.spec.ts` (4 files) | Filter-form literal; text, type, affiliation and year filters kept; byte-identical to KRR when the param is absent or false (related, linked, non-project, all 3 adapters); linked unaffected; DD-4 fixture that fits trimmed but not untrimmed; multi-byte plain fallback; DTO coverage; NFR-1 call count and distinct cache keys; existing echo `toEqual`s gain `relatedOnly:false`; the g4 cache-key literal is updated for the new key shape |

Verification:

| Check | Result |
|---|---|
| `npx jest --maxWorkers=2 --silent --testPathPattern="repositories.config\|project-relevance\|cgspace-discovery\|cgspace-search-query"` | 8 suites / 307 tests passed. The first run failed one test, the g4 cache-key literal, which was updated for the key shape |
| `npx jest --maxWorkers=2 --silent --findRelatedTests <5 prod files>` | 17 suites / 340 tests passed |
| eslint `--quiet` (touched files) | clean |
| `npx tsc --noEmit` | clean |

Live GET probe: year 2026, the real `translateParams`/`resolveProjectScope`, raw upstream Discovery, no PRMS DB. On every row the echo is `relatedOnly=true`, the query has no `*:* OR` arm, and no `sort` is sent.

| Project | Host | Unfiltered related | Filtered related | Linked total | Linked ∩ filtered page 1 | `none` tier on filtered page 1 |
|---|---|---|---|---|---|---|
| P-1486 | CGSpace | 3466 | 494 | 0 | 0 | 0/10 |
| P-1486 | MELSpace | 238 | 21 | 0 | 0 | 1/10 |
| P-1486 | WorldFish | 119 | 5 | 0 | 0 | 0/5 |
| iSPARK | CGSpace | 3464 | 1073 | 2 | 0 (2 linked handles checked) | 0/10 |
| iSPARK | MELSpace | 238 | 34 | 0 | 0 | 0/10 |
| iSPARK | WorldFish | 119 | 14 | 0 | 0 | 2/10 |

- Every filtered total is strictly below its unfiltered total.
- The `none` share is 3 of 55, the accepted residual from design §10 (stemming).
- CGSpace P-1486 unfiltered is 3466 here against 3464 in KRR because the corpus moved.

**Attempt 1: Reviewer: `STATUS: PASS`.** Every T-1 Scope item, test and "Fails if" check is met. So are the §5 rows T-1 owns, R-2 (server), R-3, NFR-1..3, §7.1–§7.3, DD-3 and DD-4. The gate uses the full untrimmed block on every adapter. Toggle-off is byte-identical. The g4 cache-key literal change is justified because it is the in-process key, not the upstream request.

**ADVISORY (4R, non-gating):**
- Readability: `RelevanceBlockMode` sits between `buildRelevanceBlock`'s JSDoc and the function, so the doc comment attaches to the type. Move the type above the JSDoc.
- Readability: `composeScopedQuery` computes the weights expression twice. Reuse `weights`.
- Traceability: the literal filter-form test uses the `aidProject` fixture (T-PJ-003942), not P-1486. All required substrings are asserted, and the live probe covers P-1486.
- Risk (low): toggle-off responses now always carry `relatedOnly:false`. Design §5 and NFR-3 allow this additive field, so T-3 and T-4 should not read it as drift.
- Reliability (minor): `resolveProjectScope` builds filter queries for all 3 adapters even when the param is unset. It is only string work. It could short-circuit on `!dto.projectRelatedOnly`.

**Decisions and assumptions:**
- "Fails if: filter form contains `*:*`" is read as the `*:* OR` arm. With no text, the base `*:* AND NOT (...)` prefix stays, as in KRR, which keeps toggle-off byte-identical.
- An absent param stays `undefined`, and non-`'true'` text becomes `false`, never rejected.
- Probe inputs approximate the projects from the KRR notes (titles, centers, keywords) and are not read from the PRMS DB. The MEL and WorldFish base URLs are inferred from `itemHost` and the `/server/api` suffix; both returned 200.

**Issues:**
- TDD: the tests were written after the code, so there is no red run on record.
- The first test run caught the g4 literal.

**Final verification:** green, lint clean, probe recorded.

### KRS-T-2 — Client: tier ordering per loaded page, SP soft-sort scoped out, "N of 3" suffix

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-22 |
| Requirements | R-1, R-4 |
| Skills | `angular-developer`, `spartan`, `tdd` (Leader selection = task list) |
| Effort | medium |
| Gate | The user said "Continua hasta que termines" (2026-10-22), so the run continues to T-3/T-4 without a pause |

**Attempt 1: Implementer.** Files are under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/` (+136/-9):

| File | Change |
|---|---|
| `kp-cgspace-browse.component.ts` (+36/-5) | `KP_BROWSE_COPY.tierCount = '{n} of 3'`. `matchTierLabel` returns `<label> · <n> of 3`, where n = `factors.length`; `none` has no count. Private `sortPageByTier` is a stable sort (strong 0, partial 1, weak 2, none/missing 3). `applyScopeOutcome` calls it only when scope=related and echo `ranked===true`, on the incoming page, before the append. `displayItems` skips SP-first while `relatedRanked()` is true. `@akili-spec` tags added |
| `kp-cgspace-browse.component.spec.ts` (+100/-4) | 4 KRR label asserts updated to the suffix strings. New `KRS-T-2` describe with 6 tests: iSPARK vector; append; ranked related not SP-first while "matches only" still filters; unranked SP-first; linked SP-first with no tier order; labels with no `%` and with `tabindex` 0 |
| `.html` | Unchanged. The badge already prints `tierLabel`, and the tooltip and `tabindex` are intact |

Verification:

| Check | Result |
|---|---|
| `npx jest --maxWorkers=2 --no-coverage --testPathPattern=kp-cgspace-browse.component.spec` | 1 suite / 120 tests passed |
| `npx jest --maxWorkers=2 --no-coverage --findRelatedTests <component ts + spec>` | 58 suites / 2625 tests passed |
| `npx ng lint --quiet --lint-file-patterns <touched>` | All files pass linting |
| `npm run build:dev` | OK (Sass `@import` deprecation warnings only) |

KPAM specs: none broke. The existing SP-first test runs with `relatedRanked=false`, so it remains the unranked-path assertion. Linked SP-first is asserted again.

**Attempt 1: Reviewer: `STATUS: PASS`.** R-1, R-4, design §8, DD-1, DD-2, DD-6 and §11 are met.
- The sort runs on a copy of the incoming page, then the page is appended, so earlier pages never move.
- The append test feeds page 2 as [None, Strong]. The task wrote [Strong, None]. The rendered DOM is still exactly Strong, Weak, Strong, None, so it meets the literal expectation. It is also stronger: it proves page 2 is sorted, and a whole-list re-sort would fail it.

**ADVISORY (4R, non-gating):**
- Readability: the " · " separator is hard-coded in `matchTierLabel` rather than in `KP_BROWSE_COPY`.
- Reliability: `displayItems` turns off SP-first on `relatedRanked()` without checking the scope. That is safe today because only related responses set it and `resetResults` clears it. **Forward pointer to T-3:** keep resetting `relatedRanked` wherever the browse leaves project scope.

**Decisions:** the visual grouping is left to T-4 (jsdom cannot prove it). Cypress CT was not touched, because it has no tier asserts.

**Issues:** no red run on record (code and tests were written together).

**Final verification:** green, lint and build pass, KPAM coverage kept for the unranked and linked paths.

### KRS-T-3 — Client: "Only related KPs" toggle, param, unavailable state, proxy note

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 of 3) |
| Date | 2026-10-22 |
| Requirements | R-2 (client), R-3 (client), R-5, NFR-3, NFR-4 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` (Leader selection = task list) |
| Effort | medium (attempt 1) → high (attempt 2) |
| Forward pointer honored | T-2 Reviewer: reset `relatedRanked` wherever the browse leaves project scope → `resetRelatedRanking()` |

**Attempt 1: Implementer.** Same component folder as T-2.

| File | Change |
|---|---|
| `.ts` (~+45) | `KpProjectScopeEcho.relatedOnly?` |
| | Copy: `relatedOnlyLabel`, `relatedOnlyUnavailable`, `relatedOnlyApplied`; `proxyNoteRanked` set to the design §8 copy |
| | Signals `relatedOnly` and `relatedOnlyEcho`; computeds `relatedOnlyUnavailable` and `relatedOnlyApplied` |
| | `toggleRelatedOnly()` reruns the related search from page 0 |
| | `buildSearchParams` adds `projectRelatedOnly=true` only when the toggle is on and the scope is set |
| | `resetRelatedRanking()` resets all three signals. It is called from the error path, an unranked echo, `resetResults`, and the project/context effect. `onYearSelect` also resets the toggle |
| `.html` (+21) | Toggle in the related section header, shown when `relatedRanked()`. It uses the same classes and `aria-pressed` as "Show matches only" and sits in a `[hlmTooltip]` span |
| | An "applied" line |
| `.spec.ts` (~+130) | `KRS-T-3` describe with 8 tests. The ranked proxy-note assertion is updated and still checks "not tagged with this project" |

Verification:
- Scoped spec: 128 passed.
- `--findRelatedTests`: 58 suites / 2633 passed.
- Lint passes; `build:dev` OK.

**Attempt 1: Reviewer: `STATUS: FAIL`.** Rulings on the Implementer's assumptions:
- Accepted: placement in the related header ("placed in the related header" per §8, same style).
- Accepted: the toggle stays on and disabled when the echo is false (§8 "shown disabled"; the server already falls back to KRR).
- Accepted: an echo without `relatedOnly` counts as not applied, and `ranked=false` resets the toggle.

Issues (verbatim):
1. **Discovered Issue:** `KP_BROWSE_COPY.relatedOnlyApplied` adds new user-visible copy that no spec defines: "Only KPs with a matching subject, Center or Science Program are listed." It also claims more than the spec allows. R-2 only guarantees tier ≥ Weak "whenever the tier rules can confirm the match (accepted stemming residual, design §10)", and T-4 step 4 expects to count "No direct match" cards on the filtered list. **Violated Rule:** `design.md` §8 copy contract (label, tooltip and ranked note only; the Counts row adds no applied wording); KRS-R-2 accepted-residual clause; `tasks.md` §3 KRS-T-3 scope. **Remediation:** remove the copy key, the html block and the computed; assert state (`aria-pressed`, `disabled`) instead. An applied indicator needs a design §8 amendment.
2. **Discovered Issue:** the unranked note is checked by substrings, not the full KRR quick copy. **Violated Rule:** `tasks.md` §3 KRS-T-3 Tests, "note copy is exact for both paths"; §5 R-5. **Remediation:** assert the full `proxyNote` string, written literally.

**Attempt 2: Implementer** (Reviewer report relayed verbatim; Leader rulings 1, 2 and 4 kept).
- Removed the `relatedOnlyApplied` copy key, the computed and the html block.
- The toggle-on test now asserts `aria-pressed="true"` and `disabled === false`.
- The unranked note is asserted with the full literal string.

Verification:
- Scoped spec: 128 passed.
- `--findRelatedTests`: 58 suites / 2633 passed.
- Lint passes; `build:dev` OK.

**Attempt 2: Reviewer: `STATUS: PASS`.** Both issues are resolved. The rest of the T-3 code and the T-2 hunks are unchanged, and the forward pointer still holds.

**ADVISORY (4R, non-gating):**
- Reliability / NFR-4: the "Not available for this search" tooltip sits on a non-focusable `<span>` around a disabled button, so keyboard users cannot reach it. **Carried to T-4 step 5**; if it matters, use `aria-disabled` plus a click guard.
- Readability: `onYearSelect` resets `relatedOnly`/`relatedOnlyEcho` inline and deliberately leaves `relatedRanked` alone. A one-line comment would stop a future "fix".

**Decisions:** the toggle sits in the related header and is visible whenever the list is ranked, independent of `matchCount`. It stays on and disabled when the filter is unavailable; a year, project or context change resets it.

**Final verification:** green, lint and build pass.

## Budget check (after T-3)

| Metric | Budget (design §12) | Actual |
|---|---|---|
| Tasks | 4 | 4 (T-1..T-3 done, T-4 pending) |
| LOC (prod + tests) | ~500 (server ~180, client ~320) | ~710: server +376/-6, client ~+330 |
| Review rounds | 1–2 per task | T-1: 1, T-2: 1, T-3: 2 |

**Tripwire: LOC is about 40% over budget.**
- **Cause:** tests, not production code. Server tests are about 263 LOC against the ~110 estimate. They cover the byte-identity loop over related, linked and non-project on 3 adapters, plus the DD-4 fixture. Production code is close to the estimate: server about 118 LOC including comments, client about 85.
- **Leader assessment:** the overrun adds no scope. Escalated to the user at the end of the run.

## Promotion (2026-10-23)

The user authorized the three steps ("Si dale a los 3 pasos").
- Pre-push checks: server `--findRelatedTests` 17 suites, 340/340; client 58 suites, 2633/2633 (`--maxWorkers=2`).
- Commits on `qa-development-2026-ss`:
  - 806b3739b: KRR archive, which was staged before this run;
  - fd483d517: server (T-1);
  - 4863c1088: client (T-2 + T-3);
  - 3c749e6e9: spec docs.
- `qa-development-2026-ss` was pushed. `performance-refactor` was fast-forwarded to 3c749e6e9 in the user's checkout and pushed.

### KRS-T-4 — PRTest acceptance

| Field | Value |
|---|---|
| Final status | **PASS**: browser check by the Leader on 2026-10-23, at the user's request ("Ya lo puedes hacer") |
| Bundle | Current. The served UI shows "Only related KPs", "Strong match · 3 of 3" and the design §8 ranked proxy note |
| Path | Centers → CIP → P-1486-GCDT and Centers → IITA → iSPARK (T-PJ-003936) → Create result → Complete the form manually → Output → Knowledge Product |
| Read-only | "Use this item" and "Create and continue" were never clicked. The modal was discarded when the tab closed |

| # | Check | Evidence | Result |
|---|---|---|---|
| 1 | Bundle current | New copy rendered (toggle label, "· N of 3", ranked note) | ✅ |
| 2 | Tier order and load more (P-1486) | Page 1 (30 cards) is in non-increasing order: 1 Strong, 9 Partial, 11 Weak, 9 None. After "Load more" the page-1 ids are in the same positions. Page 2 is ordered S P×6 W×12 N×11 | ✅ |
| 3 | Labels | Strong match · 3 of 3, Partial match · 2 of 3, Weak match · 1 of 3, No direct match. No `%` in the related section | ✅ |
| 4 | Toggle on (P-1486) | 3849 → **468** (CGSpace 444, MELSpace 22, WorldFish 2). 1 of 22 cards on page 1 is "No direct match" (accepted residual, design §10). Linked stays 0 | ✅ |
| 5 | Keyboard | Focus on the toggle, then Space turns it on and `aria-pressed` becomes "true". Enter turns it off and `aria-pressed` becomes "false". Focus stays on the toggle | ✅ |
| 6 | Toggle off (P-1486) | Total returns to 3850 (CGSpace grew by 1 during the check). The first 30 ids are identical to the pre-toggle page | ✅ |
| 7 | iSPARK | Linked has 2 KPs, no tier badge (ISRA metrics; climate-smart irrigation advisory). Related is 3848 unfiltered, first card Strong, page monotonic. Toggle on gives **1489** (CGSpace 1419, MELSpace 50, WorldFish 20), first card Strong, 3 of 30 "No direct match", 0 linked titles in related. Toggle off returns to 3848 | ✅ |

Notes:
- The iSPARK form needed a primary Science Program, so "Sustainable Farming" was picked in the UI only. Nothing was saved.
- The live filtered totals differ from the T-1 probe (494 → 444, 1073 → 1419) because the probe approximated the project inputs, while PRTest uses the real CLARISA and project data.
- **Not exercised:** the "Not available for this search" state. It needs a search text that forces trimming. The T-3 advisory (the tooltip on a non-focusable wrapper around the disabled toggle) is still open as a follow-up candidate, outside this spec.
- **Ordering incident:** the `tasks.md` `[x]` for T-4 was written a moment before this entry, because the first write of this entry failed (a Python escape error). The entry was written right after, so the evidence was never missing at rest.

Screenshot (local): `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-5R2In7\screenshot-1792753172045-6.jpg` (P-1486 with the toggle on, 468).

## Summary

All 4 tasks passed:

| Task | Attempts |
|---|---|
| T-1 | 1 |
| T-2 | 1 |
| T-3 | 2 |
| T-4 | 1 |

- **Budget:** LOC was about 40% over, all of it in tests (see Budget check). Review rounds stayed in range.
- **INC-166020 gaps closed:**
  - strongest-first per page;
  - an opt-in related-only filter with real counts (P-1486 3849 → 468);
  - a numeric "N of 3" cue with no percentage.
- **Open follow-ups, outside this spec:**
  - keyboard reach of the "Not available" tooltip;
  - the readability advisories from T-1 and T-2.

## Post-archive check: long search text on PRTest (2026-10-23)

At the user's request ("puedes hacer la prueba?"), the Leader tried to reach the "Not available for this search" state on P-1486 by lengthening the search text. Read-only.

| Text | Result |
|---|---|
| No text, toggle on | 468 (filter applied) |
| "potato" ×20 / ×28, toggle on | 175 (filter applied); toggle enabled |
| "potato" ×29 and longer | Response is **unranked**: the toggle is **hidden**, the unranked KRR note is shown, and the toggle resets to off |
| Back to ×20 | Unfiltered 432, toggle off (reset kept), no "filtered" wording |
| 8+ distinct keywords | 0–3 results; the section stays ranked |

**Finding:** for P-1486, the request goes straight from "filter fits" to "unranked". There is no text length at which the boost fits trimmed but the filter does not fit untrimmed, so the disabled state could not be reached live. The behavior matches R-3 (hidden when unranked, no param effect, no "filtered" wording), and the disabled path stays covered by the T-3 Jest tests. The tooltip keyboard advisory therefore has low practical exposure.
