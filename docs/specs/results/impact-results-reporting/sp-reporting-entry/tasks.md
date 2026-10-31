# Tasks — Impact Results: SP Reporting Entry

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `results` — Impact results card + Report result entry (child 2/3 of [`../family.md`](../family.md)) |
| Linked spec | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Baseline | `docs/prd.md` US-S1 · `docs/ux-ui/design.md` §7 tokens, §8 components · `docs/trd/trd.md` (client) |
| Ticket | P2-3901 |
| Owner | Santiago Sanchez |
| Status | approved (2026-10-30) — ready for `/akili-execute` |
| Approval Mode | gated |
| Budget (design §10) | 6 tasks · ~650 LOC · ≤ 8 review rounds |

**Base path:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/` unless the path starts with `src/` (client root).

**Test rules (machine + user policy):** every Jest run uses `--maxWorkers=2` (`--runInBand` if free RAM < 4 GB), scoped to touched files, one run at a time, never the full suite; `--findRelatedTests <changed files>` before push. Cypress CT never runs alongside Jest. Browser checks hit the shared prdb — never click a write button outside the IRE-T-6 test create.

**Skills (from the Skill Map):** `angular-developer` (all code tasks), `spartan` + `tailwind-design-system` (IRE-T-2, IRE-T-3 UI), `tdd` (IRE-T-1).

---

## 2. Pre-flight checklist

- [x] Child #1 `server-foundation` = `done` (E1 + E6 live on PRTest, IRS-T-9).
- [x] `requirements.md` approved (2026-10-30).
- [x] `design.md` approved (2026-10-30).
- [ ] Decision 1 (reject ToC contributors on impact create) is provisional until Nicoleta answers — does not block: the impact body never sends that key.

---

## 3. Task list

### IRE-T-1 — Impact area constant, counts API method, impact payload builder — `[x]`

- **Type:** client (shared)
- **Description:** New `shared/report-result/impact-areas.constant.ts` (5 entries: id, CLARISA name, `assets/impact_areas/<id>.png`). New `GET_impactLevelCounts(initiativeId, versionId)` in `src/app/shared/services/api/results-api.service.ts` (E6). New `buildImpactCreateResultPayload` in `shared/report-result/create-result-payload.util.ts` returning only `{ result: { result_level_id: 1, result_type_id: 9, initiative_id, result_name, handler: '', impact_area_id } }`; existing builder untouched.
- **Implements:** design §4, §5, IRE-DD-2, IRE-DD-5; IRE-R-6 (body), IRE-R-7
- **Files (expected):** the three files above + their specs
- **Depends on:** —
- **Blocks:** IRE-T-2, IRE-T-3
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** impact body contains any key besides the six in `result` (e.g. `indicators`, `contributing_indicator`, `toc_result_id`); an existing builder case gains `impact_area_id` or changes any value; constant order ≠ 1..5 or a name differs from design §4; E6 URL lacks either query param.
  - **Red run:** `npx jest --maxWorkers=2 --findRelatedTests src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts src/app/shared/services/api/results-api.service.ts`
  - **Disqualifier:** existing builder specs must be edited to stay green → R-7 broken, stop.
  - **Consumers:** every caller of `buildCreateResultPayload` (unchanged by construction — verify no diff in it).
- **Definition of done:** exact-keys test + existing builder specs green unedited; lint clean on touched files.

### IRE-T-2 — `app-impact-results-card` component — `[x]`

- **Type:** client (UI)
- **Description:** New standalone component `pages/dashboard-lab/components/impact-results-card/` per design §6.1: header (tag `IMPACT`, title, "5 Impact Areas · no targets", `NEW` chip, total from E6 `total`), 5 rows (decorative icon, wrapping name, count, Report result button with accessible name "Report result for <area>"), states loading skeleton / error "—" (`aria-label` "Count unavailable") / success, reactive request keyed on (`initiativeId`, `versionId`) with no request while either is null, buttons disabled when `!canReport`, output `reportArea(areaId)`. Reuse the table card's container/tag/button tokens; Spartan for new primitives. No progress bar, ratio, %, By AOW, chevron.
- **Implements:** IRE-R-1 (anatomy), IRE-R-2, IRE-R-4, IRE-NFR-1, NFR-3, NFR-5; IRE-DD-3
- **Files (expected):** `impact-results-card.component.{ts,html,spec.ts}`, folder `CLAUDE.md` (new, stamped)
- **Depends on:** IRE-T-1
- **Blocks:** IRE-T-4, IRE-T-5
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** total shown = sum of rows when E6 `total` differs; 0 rendered as "—"; a request fires with a null id; enabled button when `canReport=false`; button name lacks the area; any ratio/% element present; error state shows 0 instead of "—".
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=impact-results-card`
  - **Disqualifier:** the table's tag/card styles are not reusable without editing `reporting-aow-table` → stop, ask (would touch R-7 surface).
  - **Consumers:** none (new component).
- **Definition of done:** one test per falsifier row; lint clean.

### IRE-T-3 — Drawer + report form impact mode — `[x]`

- **Type:** client (UI + logic)
- **Description:** `indicator-drawer`: new input `impactArea`, header "Report impact result", pass it to the form. `lab-report-form`: new input `impactArea`, `isImpact`; read-only block "Impact result · <icon> <area>"; title with the existing rule (required, ≤ 30 words); hide indicator, target, contribution-to-target, ToC/PT tab, category/level choice, contributors, innovation link; `missingFields` = title rule only; Save → `buildImpactCreateResultPayload` → existing `POST_createResult` → existing success (`showCreatedAlert` + navigate with `phase`) / error (`reportResultError`, drawer stays open) branch; confirm the in-flight flag disables Save in impact mode (add if not).
- **Implements:** IRE-R-5, IRE-R-6 (Scenarios 6.1–6.3), IRE-R-7 (non-impact form unchanged); IRE-DD-4, IRE-DD-6
- **Files (expected):** `pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.{ts,html}`, `pages/dashboard-lab/components/lab-report-form/lab-report-form.component.{ts,html}`, specs `<component>.impact-mode.spec.ts`, both folder `CLAUDE.md` (re-stamp)
- **Depends on:** IRE-T-1
- **Blocks:** IRE-T-4
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** in impact mode any hidden block renders or Save stays disabled with a valid title; a 31-word title saves; Save calls the standard builder; success URL lacks `?phase=`; a 400 closes the drawer or hides the message; two quick clicks send two requests; with `impactArea=null` the form renders or saves differently from today (existing specs edited to pass).
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="(lab-report-form|indicator-drawer)"`
  - **Disqualifier:** the form's save path cannot take a different body without restructuring `createResult()` → stop, amend IRE-DD-6.
  - **Consumers:** every host of `app-lab-report-form` / `app-indicator-drawer` (inputs are optional → no change; verify with `--findRelatedTests`).
- **Definition of done:** impact-mode specs green; existing form/drawer specs green unedited; lint clean.

### IRE-T-4 — Host wiring in `dashboard-lab` — `[x]`

- **Type:** client (integration)
- **Description:** Mount `<app-impact-results-card>` right after `<app-reporting-aow-table>` only when `reportingViewMode() === 'grouped'`; inputs `initiativeId`, `versionId = effectiveVersionId()`, `canReport = entityAowService.canReportResults()`; no filter/search signal passed. `openImpactReport(areaId)`: `primeEntityAowContext()`, `managed.set({ indicator: null, node: null, emerging: false, impactArea })`, open the drawer; drawer binding passes `impactArea`.
- **Implements:** IRE-R-1 (placement, Scenario 1.2 flat view), IRE-R-3, IRE-R-4 (gate), IRE-R-7 (table inputs unchanged), IRE-NFR-4
- **Files (expected):** `pages/dashboard-lab/dashboard-lab.component.{ts,html}`, `dashboard-lab.impact-card.spec.ts`, `dashboard-lab/CLAUDE.md` (re-stamp)
- **Depends on:** IRE-T-2, IRE-T-3
- **Blocks:** IRE-T-5, IRE-T-6
- **Estimate:** S
- **Review:** full
- **Verification:**
  - **Falsifier:** card rendered in flat view or before the table; with search text / Only pending / Favorites / PT on, the card disappears; `<app-reporting-aow-table>` bindings differ from today; `openImpactReport` uses `canReportEmerging` or leaves `emerging=true`; more than one E6 call per (program, phase).
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=dashboard-lab.impact-card`
  - **Disqualifier:** the host has no reliable initiative id signal for the selected program → stop, ask.
  - **Consumers:** `dashboard-lab` existing specs — run `--findRelatedTests dashboard-lab.component.ts` (must stay green unedited).
- **Definition of done:** new spec green; related existing specs green unedited; lint clean.

### IRE-T-5 — Cypress CT layout + guide sync — `[x]`

- **Type:** client (tests + docs)
- **Description:** `impact-results-card.cy.ts`: render with mocked counts at 1280 and 900 px; assert no horizontal overflow, names wrap, count and button visible on every row, disabled state. Update and re-stamp `Verified:` in the folder guides touched by T-2..T-4 plus `reporting-aow-table/CLAUDE.md` (sibling note) and `shared/report-result/CLAUDE.md` (impact builder).
- **Implements:** IRE-NFR-2; guide upkeep
- **Files (expected):** `impact-results-card.component.cy.ts`, the five folder `CLAUDE.md`
- **Depends on:** IRE-T-4
- **Blocks:** IRE-T-6
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** `scrollWidth > clientWidth` on the card at 900 px; a button clipped; a guide still says the reporting page has only 3 card kinds.
  - **Red run:** `npm run test:ct:batch -- --spec "**/impact-results-card*.cy.ts"` (no Jest running)
  - **Cannot prove:** visual fidelity to the guide image (not extractable) → IRE-T-6.
  - **Consumers:** none.
- **Definition of done:** CT green at both widths; guides updated.

### IRE-T-6 — PRTest verification (HITL / T6) — `[ ]`

- **Type:** rollout / visual
- **Description:** After user go-ahead → commit, push to `qa-development-2026-ss`, merge into `performance-refactor` (user's checkout), deploy (~30 min). User (or agent by screenshot, read-only) checks on SP01, Reporting 2026 (initiative 50, version 36): card after 2030 outcomes in grouped view, absent in flat view; counts equal E6 and the user-run SQL; keyboard order header → rows → buttons; visual vs User Guide v2 step 1; one real create from a card (test result accepted on PRTest) lands on the detail page with the area at Principal.
- **Implements:** IRE-R-1, R-2, R-6 (live), NFR-1, NFR-2 (visual)
- **Files (expected):** `execution.md` (evidence only)
- **Depends on:** IRE-T-5
- **Blocks:** child #3 start (soft), family row #2 → `done`
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any count ≠ SQL; card visible in flat view; created result not type 9 / wrong area at 3; navigation without `phase`.
  - **Red run:** n/a (live)
  - **Disqualifier:** checks run on a bundle that is not the deployed commit (verify the served build first).
- **Definition of done:** evidence table in `execution.md`; `family.md` row 2 → `done`.

---

## 4. Dependency graph

```
IRE-T-1 (constant + API + builder)
 ├── IRE-T-2 (card)          ┐ parallel-safe (different folders)
 └── IRE-T-3 (drawer + form) ┘
            └── IRE-T-4 (host wiring)
                  └── IRE-T-5 (CT + guides)
                        └── IRE-T-6 (PRTest HITL)
```

Only one Jest run at a time even when T-2 and T-3 run in parallel; CT (T-5) runs alone.

---

## 5. Test plan & clause coverage

| Requirement clause | Owning task | Test |
|---|---|---|
| R-1 anatomy (tag, title, line, NEW, total, 5 rows, no bar/ratio/%) | T-2 | card spec |
| R-1 placement after table + hidden in flat view (S1.2) | T-4 (+ T-6 live) | host spec |
| R-2 counts from E6, total not summed, loading, error "—" | T-2 (+ T-6 SQL) | card spec |
| R-3 independent of filters | T-4 | host spec |
| R-4 same permission + accessible name with area | T-2, T-4 | card + host spec |
| R-5 impact form: read-only area, title rule, hidden blocks | T-3 | form spec |
| R-6 exact body | T-1 | util spec |
| R-6 S6.1 success → toast + navigate with phase | T-3 (+ T-6 live) | form spec |
| R-6 S6.2 400 → drawer open + message | T-3 | form spec |
| R-6 S6.3 double submit blocked | T-3 | form spec |
| R-7 other bodies / table / form unchanged | T-1, T-3, T-4 | existing specs green unedited |
| NFR-1 a11y (names, decorative icons, keyboard) | T-2 (+ T-6 keyboard) | card spec + manual |
| NFR-2 layout 1280/900 | T-5 (+ T-6 visual) | CT + manual |
| NFR-3 tokens + Spartan | T-2, T-3 | review |
| NFR-4 one E6 call | T-2, T-4 | card + host spec |
| NFR-5 copy | T-2, T-3 | specs assert strings |

No clause is cleared by citing another requirement.

---

## 6. PR strategy & rollout

- One branch: `qa-development-2026-ss`; one commit per code task (T-1..T-5), convention `✨ feat(impact-level) [P2-3901]: …` (no apostrophes in the subject — Jenkins), test/docs-only as `🧪`/`📝` where it fits.
- Commit and push **only on user go-ahead**; then merge into `performance-refactor` in the user's checkout for PRTest.
- Before push: `--findRelatedTests` on every changed file (scoped, `--maxWorkers=2`).
- CI green: lint, client Jest, SonarCloud.

## 7. Cleanup & follow-ups

- [ ] Child #3 `result-detail-impact` may reuse `impact-areas.constant.ts` for the header label.
- [ ] Nicoleta answer on decision 1 (server side only; client body unaffected).
- [ ] `codegraph sync` after merge.

## 8. Roll-back plan

1. Revert the IRE commits in reverse order — client only, no data or server change.
2. Impact results already created stay valid (server child #1 owns them); they remain reachable from the results list.
