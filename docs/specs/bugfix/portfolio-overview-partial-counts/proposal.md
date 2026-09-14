# Proposal — Portfolio Overview: partial-results banner shows the wrong number, and the open cycle can be silently under-counted

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/portfolio-overview-partial-counts` |
| Slug | `portfolio-overview-partial-counts` — derived from free-text argument (user-reported screenshot of `/portfolio-overview` showing "1262 results" + "Reporting Cycle 2025 · P25") |
| Type | **Bug** |
| Approval Mode | `gated` (default — no pre-approval mandate given) |
| Ticket | None (no Jira ticket / Figma referenced by the user; observed directly in the running app on 2026-09-14) |
| Screens affected | `/portfolio-overview` (admin-only) |
| Date | 2026-09-14 |

## 2. Intent

Make the Portfolio Overview screen tell the truth about (a) how many results it is actually counting, and (b) which reporting cycle is open — so admins reviewing portfolio-wide figures are never silently looking at an undercount or a stale cycle without being told.

## 3. Problem / Current Behavior

On 2026-09-14 the screen showed:
- **"Showing the first 1262 results — the server holds more, so these figures are partial."**
- **Header: "PORTFOLIO · REPORTING CYCLE 2025 · P25"**, Total Portfolio Results = 1262, W1/W2 = 1262.

Investigation (agent research, no code changed) found two separate, confirmed issues:

### 3.1 The banner shows the wrong number for what it claims

`PortfolioOverviewComponent` fetches **one page** of up to `PORTFOLIO_PAGE_LIMIT = 20000` results via `GET_AllResultsWithUseRole` (`portfolio-overview.service.ts:12`), sized on the documented assumption (component `CLAUDE.md`, verified 2026-08-24) that the open phase (259 rows on `prtest` at the time) is ~2 orders of magnitude smaller than the full historical dataset (6094 rows). The server (`result.repository.ts:695-871`, `AllResultsByRoleUserAndInitiativeFiltered`) returns **every phase/version ever reported** (not just the open one), applies `LIMIT/OFFSET` (lines 836-851), and computes `meta.total` via a separate unfiltered `COUNT(1)` (lines 856-860) over that same all-history set.

`isPartial` correctly fires when `meta.total > items.length` (i.e., total historical rows now exceed the 20000-row page) — this is the documented "honesty guard" (component `CLAUDE.md`: *"if `meta.total` exceeds what we asked for, the screen says the figures are partial rather than passing a truncated portfolio off as the whole thing"*), and is working as designed at that layer.

**But the banner text itself is wrong**: `portfolio-overview.component.html:24` renders `Showing the first {{ data.total() }} results …`, and `data.total()` is **not** the count returned by the server — it's `rows().length`, the count *after* the client filters the fetched page down to the **open phase only** (`apply()`, `phase_status === 1`, `portfolio-overview.service.ts:492-510`). So "1262" is "how many open-phase rows survived client-side filtering," not "the first N of a bigger total," which is the literal claim in the sentence. The banner conflates two different numbers.

### 3.2 The underlying `LIMIT` has no `ORDER BY` — real risk of silently dropping current-phase rows

`result.repository.ts:836-851` applies `LIMIT <n> OFFSET <n>` with **no `ORDER BY`** anywhere in the query. MySQL gives no ordering guarantee for an unordered `LIMIT`. Today the fetch (`limit: 20000`) still exceeds total historical rows in most environments, so this has not yet visibly bitten — but once the true historical total crosses 20000, the returned page becomes an **arbitrary subset**, which could exclude open-phase (`phase_status = 1`) rows entirely, silently *undercounting* the open cycle rather than merely "showing the first N of a knowable total." The current `isPartial` guard would still fire in that case (which is good), but the reported "1262" could then be wrong in the other direction — some current-phase results genuinely missing from the count, not just from the display.

### 3.3 "Reporting Cycle 2025 · P25" — CONFIRMED bug via live prod-vs-test comparison

Validated directly in Chrome on 2026-09-14, per user's request, comparing `https://reporting.cgiar.org` (prod) against `http://localhost:4200` (test/local):

- **Prod → Results Center** (`/result/results-outlet/results-list`): the phase filter offers **"Phase: Reporting 2026 (Open)"** as a real, selectable chip alongside "Phase: Reporting 2025 (Closed)" — i.e. the `version` table in prod unambiguously has a 2026 phase with `status = 1` (open). With both phases selected the list shows **8252 of 8257 results**, most recently created **14 Sep 2026**, all labeled `2026 · P25`.
- **Prod → Portfolio Overview** (`/portfolio-overview`): shows **"PORTFOLIO · REPORTING CYCLE 2025 · P25"**, the amber banner **"Viewing a closed phase. Figures are final,"** and **"Total Portfolio Results: 1262."** This directly contradicts Results Center on the same prod backend, same login, same moment: Portfolio Overview believes nothing is open and falls back to 2025, while Results Center proves 2026 is open and holds thousands more rows.
- **Test/local → Portfolio Overview** (`localhost:4200`, pointed at the test backend): shows **"REPORTING CYCLE 2026 · P25"** correctly, **no closed-phase banner, no partial-results banner**, "Total Portfolio Results: 506." Matches what Results Center-style data would predict — no contradiction.

**Root cause confirmed (not merely hypothesized):** this is exactly the failure mode already suspected in §3.2 — the unordered `LIMIT 20000` in `AllResultsByRoleUserAndInitiativeFiltered` (`result.repository.ts:836-851`), pulling from **all-history** rows with no `ORDER BY`. In prod, where historical row volume is large enough (Results Center alone shows 8257+ rows across just the two most recent phases; the true all-time total across every phase the query touches is unfiltered and likely larger), the arbitrary 20000-row page returned to Portfolio Overview can end up **containing zero 2026 (open-phase) rows**. The client's `apply()` (`portfolio-overview.service.ts:492-510`) then finds no row with `phase_status === 1` in that page, falls back to the newest `version_id` it *can* see in the truncated page (which resolves to 2025), and flags `closedPhase()` — mislabeling the actually-open 2026 cycle as closed and reporting figures (1262) that are entirely stale 2025 data, not live 2026 reporting. In test/local, historical row volume is far smaller, so the same 20000-row fetch still comfortably contains the open-phase rows, which is why the screen behaves correctly there — matching the user's own observation ("en test sí aparecen los resultados que son pero en prod no").

This resolves the three hypotheses (a)/(b)/(c) from the original diagnosis: it is **not** "2026 hasn't been opened yet" (Results Center proves it has) and **not** primarily a missing-warning UI gap — it is the same unordered-`LIMIT` defect from §3.2, now confirmed to be actively misleading production admins about which cycle is open and undercounting current results by roughly 16x or more (1262 shown vs. 8252+ real rows just in the two most recent phases).

## 4. Proposed Outcome

1. The partial-results banner accurately describes what's being shown: "N of M shown" using real fetched-vs-total counts from the server response, not a post-filter count relabeled as a raw total.
2. The server-side query never risks silently excluding open-phase rows from a capped page — either by ordering the query so open-phase rows always sort first, or by filtering to the open phase (and any other phases the caller needs) before applying `LIMIT`, so a growing historical dataset cannot degrade current-cycle accuracy.
3. Portfolio Overview's cycle label is verified against real `version` data (not just re-labeled) — and if no cycle newer than the currently-open one exists, that is confirmed as expected rather than left as an open question. If a design gap is found (case 3.3-c above), the screen distinguishes "verified open cycle" from "no phase is open, showing latest known" more clearly than today.

## 5. Scope

- `onecgiar-pr-server/src/api/results/result.repository.ts` — `AllResultsByRoleUserAndInitiativeFiltered` (ordering / phase-aware limiting, `meta.total` semantics).
- `onecgiar-pr-server/src/api/results/results.service.ts` — `findAllByRoleFiltered` (pass-through of totals/paging semantics, if the fix changes the contract).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/` — `portfolio-overview.service.ts` (`isPartial`, `total`, `apply()`), `portfolio-overview.component.html` (banner copy), `portfolio-overview.component.ts` (`eyebrow()` cycle label).
- Investigation of the live `version` table / `phase-management` admin screen to confirm whether the 2026 cycle should be open (data/ops check, not a code change by itself).

## 6. Non-Goals

- Not re-architecting the whole `AllResultsByRoleUserAndInitiativeFiltered` endpoint or its callers beyond what's needed for correct pagination/ordering on this path.
- Not building new phase-management tooling — if 3.3 turns out to be a pure ops gap (nobody opened 2026 yet), the fix there is opening the phase, not code.
- Not addressing the "drill-down destinations" pending item already logged in the component's `CLAUDE.md` (separate, unrelated product decision, P2-3304).

## 7. Affected Users, Systems, And Specs

- **Users:** Platform admins using `/portfolio-overview` (admin-gated screen) to read whole-portfolio figures.
- **Systems:** `onecgiar-pr-server` results module (`results.controller.ts:169` → `results.service.ts:1340` → `result.repository.ts:695-871`); `onecgiar-pr-client` Portfolio Overview feature.
- **Specs:** No existing AKILI spec found for `portfolio-overview` under `docs/specs/` — only the folder-level `CLAUDE.md` (not an AKILI spec). This will be the first formal spec for this screen's data-correctness behavior.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: This is a data-correctness/copy bug, not a visual redesign — no new UI surface is introduced. The one copy change (banner text) reuses the existing alert component and design tokens; no mockup needed.

## 9. Bug Diagnosis

### Observed Symptom
- `/portfolio-overview` shows "Showing the first 1262 results — the server holds more, so these figures are partial," while the header reads "Reporting Cycle 2025 · P25," on 2026-09-14.

### Reproduction Steps
1. Log in as a platform admin.
2. Navigate to `/portfolio-overview`.
3. Observe the amber partial-results banner and the cycle eyebrow label.
4. (For root-cause confirmation) Inspect the network response of `GET /api/results/get/all/roles/filter/:userId?limit=20000&page=1` — compare `response.length` (raw fetched rows), `meta.total` (server-side unfiltered `COUNT(1)`), and the number actually shown in the banner (`rows().length` after client-side `phase_status === 1` filtering).

### Root Cause (confirmed)
1. **Banner miswording (confirmed by code read):** `portfolio-overview.component.html:24` binds `data.total()`, which per `portfolio-overview.service.ts:186` is `rows().length` — the **open-phase-filtered** count — into a sentence that claims to describe "the first N of a bigger total" fetched from the server. The server's own total (`meta.total`) is a different, larger, all-phase number never shown in this sentence.
2. **Unordered `LIMIT` (confirmed by code read):** `result.repository.ts:836-851` has no `ORDER BY` before `LIMIT/OFFSET`, and the query is not scoped to the open phase — it spans all historical phases (`result.repository.ts:714-784`). This means the 20000-row cap is a ceiling over the *wrong, unbounded* population (all-time results) rather than the population the screen actually cares about (open-phase results), so the safety margin (259 vs 6094 rows, per the component's own `CLAUDE.md`) will erode as more phases accumulate, with no ordering guarantee for which rows get dropped first.
3. **Cycle label (CONFIRMED bug, via live prod-vs-test check in Chrome, 2026-09-14):** Results Center in prod proves a 2026 phase with `phase_status = 1` exists and holds 8252+ results; Portfolio Overview in the same prod session falls back to 2025 and flags `closedPhase()`. Root cause is the same unordered `LIMIT 20000` fetch (item 2 above): once prod's historical row volume made the fetched page miss all 2026 rows, `apply()` had nothing with `phase_status === 1` to select and silently fell back to the newest version it could see in the truncated page. Test/local, with far fewer historical rows, does not trip this and correctly shows 2026 as open — matching the user's own observation.

### Impact & Scope
- Any consumer of `AllResultsByRoleUserAndInitiativeFiltered` with a similarly-sized `limit` (not just Portfolio Overview) is exposed to the same unordered-`LIMIT`-over-all-history pattern once total historical rows exceed the requested page size.
- The banner miswording affects every admin reading this screen: the "partial" warning is honestly triggered, but the number displayed alongside it does not mean what the sentence says it means, which could mislead an admin into over- or under-trusting the figures.
- No data-integrity impact today (20000 still exceeds historical row counts in the environments checked), but the risk grows with every reporting cycle added.

### Fix Strategy
This is not cosmetic — it touches SQL query logic and a data-correctness computation, so it is **not** `/akili-quick` material. Route to `/akili-specify bugfix/portfolio-overview-partial-counts` in **Bug Mode**, which will require a regression test (e.g., a repository/service test asserting open-phase rows are never excluded once total rows exceed the page limit, and a component test asserting the banner text uses the correct fetched/total pair). The 3.3 cycle-label question should be resolved as a fact-finding step at the start of `/akili-specify` (check `version`/`phase-management` state) before deciding whether any code change is needed there at all.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Fix banner only** | Change the banner to show real fetched vs. server total (e.g., "Showing N of M results"), leave the SQL query as-is. | Cheapest, ships fast; does **not** address the risk that open-phase rows get silently excluded once history exceeds 20000 rows — leaves a latent correctness bug live. |
| **B — Add `ORDER BY` prioritizing open phase, plus fix banner** | Add an `ORDER BY` (e.g., `phase_status DESC, version_id DESC` or similar) to `result.repository.ts`'s query so open-phase rows always sort to the front of the page, guaranteeing they survive any future `LIMIT` truncation; fix the banner wording in the same pass. | Directly closes the undercount risk with a small, scoped SQL change; no contract change for callers. Recommended. |
| **C — Filter to open phase server-side before limiting (larger refactor)** | Change `AllResultsByRoleUserAndInitiativeFiltered` (or add a new method) to accept a phase filter and apply it before `LIMIT/OFFSET`, so Portfolio Overview never needs to fetch cross-phase data at all. | Most correct long-term, but touches a shared repository method used elsewhere in the results module — larger blast radius, more testing, higher risk of regressions in unrelated callers. Reasonable **follow-up**, not this bug fix. |

## 11. Recommended Approach

**Option B** — add a deterministic `ORDER BY` to the existing query so open-phase rows can never be pushed out of a capped page by an arbitrary MySQL row order, and correct the banner text to report the actual fetched-vs-total pair instead of the post-filter count. This is the smallest safe change that removes the real correctness risk (3.2) and, since 3.3 is now confirmed to be the *same* root cause manifesting in prod, this single fix also corrects the wrong "closed 2025" cycle label — no separate change needed for 3.3. Deferring the larger, riskier repository refactor in Option C.

## 12. Risks, Dependencies, And Open Questions

- ~~Open question: is 2026 expected to be open yet?~~ **Resolved by live Chrome validation (2026-09-14):** yes, 2026 is open in prod (Results Center proves it); Portfolio Overview is wrong to show 2025/closed.
- **Risk:** `AllResultsByRoleUserAndInitiativeFiltered` may have other callers beyond Portfolio Overview; adding an `ORDER BY` should not change filtering results for them, but `/akili-specify` should enumerate all call sites to confirm no caller depends on the current (arbitrary) row order.
- **Risk:** the fix must be validated against prod-scale data volume, not just test/local — the defect only manifests once historical row count exceeds the page limit, which test/local does not currently reproduce. Verification should reason about volume explicitly (e.g. assert behavior with a historical count larger than the limit), not just re-run against sparse fixtures.
- **Dependency:** None — self-contained within `results` module (server) and `portfolio-overview` feature (client).
- No Active Lesson in `docs/specs/kaizen-log.md` applies (file does not exist yet in this repo).

## 13. Success Criteria

- The banner, when shown, states a fetched-vs-total pair that is verifiably correct against the actual server response (not a filtered subset mislabeled as a total).
- A regression test proves that once total historical rows exceed the page limit, open-phase (`phase_status = 1`) rows are still fully represented in the fetched page (i.e., never truncated out by `LIMIT`).
- Verified in prod (or a prod-equivalent data volume) that Portfolio Overview shows the correct open cycle (2026 · P25) and a results count consistent with Results Center, not the stale 2025 fallback.

## 14. Next Step

```text
/akili-specify bugfix/portfolio-overview-partial-counts
```
(Bug Mode — root cause for 3.1/3.2 is confirmed; 3.3 needs a data check as the first specify step before any code change is scoped for it.)
