# Validation Report — ToC KPI dropdown readability

> **Verdict: PASS with 5 WARN, 0 FAIL.** The code matches every requirement and scenario, and its tests prove them. The one gate that cannot be closed locally is the PRTest look at real SP09 data on #953, which needs a deploy. **Archive after that check**, or archive now and accept WARN-1 as a follow-up.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-kpi-option-readability` |
| Validated | 2026-11-19 |
| Branch / base | `qa-development-2026-ss` @ `262dfcf38` + uncommitted spec changes |
| Auditor | Claude Code `opus`. During execute this model ran only as Leader; Implementers ran on `akili-implementer` (T2) |
| Inputs | proposal, requirements, design, tasks, execution (no `test-report.md`; `/akili-test` was not run) |
| Visual Reference | None (`proposal.md` §8) |

## 2. Summary

| Area | Result |
|---|---|
| Tasks | PASS — 3/3 `[x]`, each with Reviewer PASS + VERIFIED evidence re-run |
| Files | PASS — every path in `design.md` §4 exists or changed as stated |
| Build (ngc) | PASS — exit 0 |
| Lint | PASS — 12 touched files, exit 0 |
| Requirements | PASS — 9/9 scenarios, every `AND IT MUST` / `BUT` clause has code + a test |
| Design conformance | PASS, with 1 doc WARN |
| Real-data check (PRTest #953) | **WARN — pending deploy** |
| UI design review | WARN — not run (no browser pass) |

## 3. Task Completion

| Task | Status | Attempts | Reviewer | Re-run | Result |
|---|---|---|---|---|---|
| TKR-T-1 `app-pr-select` `wrapOptions` | `[x]` | 1 | PASS | VERIFIED (Jest 10/10; CT 20/1/1 and 19/3, same reds as the baseline) | PASS |
| TKR-T-2 `app-clamped-text` | `[x]` | 2 (FAIL → PASS) | PASS | VERIFIED (Jest 4/4; CT 4/4) | PASS |
| TKR-T-3 KPI select wiring | `[x]` | 1 | PASS | VERIFIED (ngc 0; related Jest 22 suites / 793) | PASS |

## 4. File Existence

| `design.md` §4 path | State |
|---|---|
| `custom-fields/pr-select/pr-select.component.ts` | modified (+`wrapOptions`, item size) |
| `custom-fields/pr-select/pr-select.component.html` | modified (`options_wrap` class, row height) |
| `custom-fields/custom-fields.scss` | modified (rules only under `.options_wrap`) |
| `custom-fields/pr-select/pr-select.cy.ts` | modified (appended describe, existing cases untouched) |
| `shared/components/clamped-text/` (`.ts`, `.html`, `.spec.ts`, `.cy.ts`) | new |
| `internationalization/clamped-text.copy.ts` | new |
| `multiple-wps-content.component.{ts,html}` (C&P) | modified |
| `cpmultiple-wps-content.component.spec.ts` | modified |
| `rd-contributors-and-partners.module.ts` | modified (not in §4 table; needed to import the standalone component, recorded in execution T-3) |
| `rd-contributors-and-partners/CLAUDE.md` | modified (Verified stamp + `## TKR-T-3`) |
| client `src/CLAUDE.md` "if needed" | not changed (see §10) |

## 5. Build Integrity

| Check | Command | Result |
|---|---|---|
| Template compile | `npx ngc -p tsconfig.app.json --noEmit` | PASS, exit 0, no errors (Leader re-run during execute; pre-existing NG8112/NG8113 warnings in other files) |
| Lint | `ESLINT_USE_FLAT_CONFIG=false npx eslint <12 touched files> --quiet` | PASS, exit 0. Covers `pr-select.cy.ts`, which execute had left unlinted |
| Env boot smoke | — | not run: there is no server change, and a local browser check writes to the shared prdb |

Tooling gap: ESLint 9 finds no flat config here, so `ESLINT_USE_FLAT_CONFIG=false` is needed. Recorded as a follow-up, not a defect of this spec.

## 6. Requirement Coverage

Coverage is checked at clause level. Evidence is from `execution.md`, re-checked against the final code.

| Clause | Code | Test evidence | Result |
|---|---|---|---|
| S-1.1 at most 2 lines, starts with its own first words | `.options_wrap .option .label` `-webkit-line-clamp: 2` | T-1 CT case 1, `clientHeight ≤ 37`, both widths | PASS |
| S-1.1 "ending in …" (R-1 text) | produced by `-webkit-line-clamp` | **not asserted** | WARN-3 |
| S-1.1 no horizontal scrollbar / no overflow | `overflow-x: hidden`, `min-width: 0`, `overflow-wrap: anywhere` | case 1 (label + viewport `scrollWidth`, computed `overflow-x`); falsifiers (a)(b) observed red | PASS |
| S-1.1 AND IT MUST fixed row height (virtual scroll) | `virtualOptionItemSize` and row style both use `extraInformation() \|\| wrapOptions()` | case 2: 40 options, `scrollHeight ≥ 1999`; falsifier (c) red `expected 1200 to be at least 1999` | PASS |
| S-1.1 BUT full text stays in the DOM | CSS-only clamp | case 3, `innerText` equals the source string (settles P-12) | PASS |
| S-1.2 short option whole | — | case 1, short label | PASS |
| S-1.3 search beyond line 2 | filter on the full `optionLabel` (unchanged) | case 4 | PASS |
| S-1.4 disabled prefix, not selectable | unchanged concat | case 5 | PASS |
| S-2.1 clamped to 3 lines, above Unit/Target | `<app-clamped-text [lines]="3">` before Unit, inside the year gate | T-2 CT (a) height red `expected 288 to be at most 55` when unclamped; T-3 Jest (a) placement | PASS |
| S-2.1 Show more / Show less toggle | `toggle()`, copy from `CLAMPED_TEXT_COPY` | T-2 Jest + CT (a) | PASS |
| S-2.1 AND IT MUST keyboard, focus visible, announce state | real `<button type="button">`, `focus-visible` ring `--pr-focus-ring`, `[attr.aria-expanded]` | T-2 CT (c) Tab + Enter; Jest aria | PASS |
| S-2.1 BUT no `partnersBody` / payload / dirty change | state only in `ClampedTextComponent.expanded`. Dirty = `dirtySnapshotValue()` (`partnersBody` + lead fields, `rd-contributors-and-partners.component.ts:1109`), which the component never touches | T-3 Jest (d) deep-equal before and after render + toggle; falsifier F3 red | PASS |
| S-2.2 no control for short text | `showToggle = overflows() \|\| expanded()`, measured | T-2 CT (b); falsifier red | PASS |
| S-2.3 KPI change → B's text, collapsed | `linkedSignal` on `text` | T-2 Jest + CT (d), falsifier red; T-3 Jest (c) text switch | PASS |
| S-2.4 pre-2026 absent | inside `@if (isCP2026() && …)` | T-3 Jest (b); F1 red | PASS |
| S-3.1 default select unchanged, BUT no clamp/wrap/scroll change | all rules under `.options_wrap`; input defaults to `false` | T-1 case 6 (30 px, `nowrap`, `overflow-x: scroll`); baseline CT unchanged | PASS |
| NFR-1 copy via internationalization | `clamped-text.copy.ts` | Reviewer T-2/T-3 | PASS |
| NFR-2 Tailwind; SCSS only in `custom-fields.scss` | yes | Reviewer T-1/T-2 | PASS |
| NFR-3 no server/API/payload change; PR note | client-only diff | PR note pending (carry into the PR) | PASS (note owed at PR) |
| NFR-4 ngc + scoped Jest + batched CT, never in parallel | yes | §5; serialized by a lock | PASS |
| §8 "Real data look (SP09 #953)" | — | **human PRTest check not done** | WARN-1 |

## 7. Linting & Code Quality

Lint is clean (§5). Architecture:
- The new shared component is standalone and OnPush.
- The opt-in input on the shared control defaults to off.
- No new dependency.

**4R advisory (non-gating), carried from execution plus this audit:**

| Lens | Finding |
|---|---|
| Reliability | No test asserts the clamp's "…": a `max-height` swap would pass (see WARN-3). Guard: `webkitLineClamp === '2'` plus `scrollHeight > clientHeight` |
| Reliability | T-2 CT (a) checks the post-click height with a one-shot `.then`. CT (b) `not.exist` could follow a height assertion |
| Reliability | T-3 (c) does not assert "collapsed" at the host (covered by T-2's `linkedSignal`). T-3 (e) proves the binding only (`NO_ERRORS_SCHEMA`) |
| Readability | `line-height: 18px` duplicates the inherited `.pr-body-2`; prefer `inherit`, or a comment pointing to `fonts.scss:89-95` |
| Readability | "KPI statement:" sits on its own line, while Unit and Target are inline. Check visually at PRTest |
| Readability | `standalone: true` is redundant on Angular 21. The button could take `aria-controls` → body |
| Risk | `clamped-text` uses `text-[12px]` and `var(--pr-color-primary-300/400)` arbitrary values instead of named theme utilities. This is acceptable under NFR-2 but worth aligning if `@theme` tokens exist |
| Risk | `npm run test:ct -- <filter>` matches nothing on Windows; `test:ct:changed` would pick about 52 custom-fields specs |

## 8. Design Conformance

| Decision | Conformance |
|---|---|
| DD-1 opt-in, not global | PASS |
| DD-2 fixed 50 px + 2-line clamp, virtual scroll kept | PASS |
| DD-3 no hover tooltip | PASS (none added) |
| DD-4 no code parsing | PASS |
| DD-5 overflow measured in a standalone component | PASS (`afterRenderEffect` + `ResizeObserver`, disconnected on cleanup) |
| DD-6 full text in the existing selected-KPI block | PASS |
| Premise P-12 (the only UNVERIFIED one) | settled TRUE by T-1 case 3; no `aria-label` needed |

**Cross-document figure check:**
- WARN-2: `requirements.md` §2 says the KPI options are "1,000–3,969 characters long". §4 of the same file cites the SP09 CSV with lengths "954–3,644", and S-1.1 says "1,000+". The 954 minimum contradicts the 1,000 lower bound. This is doc-only, with no effect on behaviour, because the clamp does not depend on length.
- The "273" and "10,251" figures agree between `requirements.md` §4 and design DD-4.
- Budget: design §12 has ~180 LOC; actual is ≈ 480 (tests). The user accepted it at the tripwire (WARN-4).

## 9. Test Evidence Summary

| Suite | Result |
|---|---|
| `pr-select.cy.ts` | 20 passing / 1 failing / 1 pending. The red is the pre-existing NG0100 "clears the selection reactively", also present in the baseline. The 12 new cases pass at 1280 and 900 px |
| `pr-select.contract.cy.ts` | 19 / 3, the same 3 pre-existing "model synchronisation" timeouts as the baseline |
| `pr-select.component.spec.ts` | 10/10 |
| `clamped-text.component.spec.ts` / `.cy.ts` | 4/4 and 4/4 |
| `cpmultiple-wps-content` + consumers | 10 suites / 424 (baseline 419) |
| `--findRelatedTests` T-3 files | 22 suites / 793 |
| Falsifiers | 9 of 9 observed red, all reverted |
| Manual PRTest #953 | **pending** |

There is no `test-report.md`; `/akili-test` was not run. Execute evidence was used directly.

## 10. Agent Guide / Constitution Impact

| Item | State |
|---|---|
| `rd-contributors-and-partners/CLAUDE.md` | updated (stamp "262dfcf38 + uncommitted"; refresh the hash at commit) |
| New shared component `shared/components/clamped-text/` | not listed in client `src/CLAUDE.md` (0 hits) — **WARN-5**, pending for `/akili-archive` |
| `custom-fields` `wrapOptions` input | no folder guide exists; optional line in client `src/CLAUDE.md` |
| CodeGraph | re-index pending (`codegraph sync`) |
| `.agents/leader.md` | `primary-instructions` OUTDATED per `akili doctor` (unrelated to the spec; fix with `akili doctor --agents --fix` on the apply-capable branch) |

## 11. Remediation

| # | Finding | Severity | Action | Owner |
|---|---|---|---|---|
| WARN-1 | PRTest #953 real-data check not done | WARN | After deploy: open the KPI list (2 lines, no sideways scroll), pick a KPI (full text + Show more), confirm the Save draft payload is unchanged in DevTools, and check the label line. Never click write buttons beyond what the check needs | user |
| WARN-2 | `requirements.md` "1,000–3,969" vs data "954" | WARN (doc) | Change to "~950–3,969" in §2 and S-1.1 ("950+"); then grep the folder for `1,000` | archive or now |
| WARN-3 | "…" ellipsis untested | WARN | Optional CT assertion `webkitLineClamp === '2'` on the long label | follow-up |
| WARN-4 | LOC ≈ 480 vs 180 budget | WARN (accepted) | Kaizen note: CT at two widths with falsifier-proof assertions costs about 2× the estimate | archive kaizen |
| WARN-5 | `clamped-text` not in client `src/CLAUDE.md`; CodeGraph stale | WARN | Add at archive (Constitution & Graph Sync) | `/akili-archive` |
| — | UI design review (impeccable) not run | WARN | Folded into WARN-1: the PRTest look is the visual check for this small in-place change | user |
| — | PR note | required | The PR description says "W3/bilateral payload: no impact (view-only)" | commit/PR |

## 12. Archive Readiness Recommendation

**Ready once WARN-1 is done.**
- All tasks are `[x]` and there are no FAILs.
- The code, the tests and the clause-level coverage hold.
- WARN-2 to WARN-5 are documentation and bookkeeping that `/akili-archive` handles.

Order: commit → push qa-dev → merge to performance-refactor → PRTest check on #953 → `/akili-archive changes/toc-kpi-option-readability`.
