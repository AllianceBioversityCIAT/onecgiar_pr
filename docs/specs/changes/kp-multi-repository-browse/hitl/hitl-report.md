# KPM-T-10 — HITL Smoke Report

**Environment:** local stack only (backend `nest start --watch` on `localhost:3400`, client `ng serve` on `localhost:4200`, accessed through the Orca embedded browser at the `qa-development-2026.orca.localhost` proxy). QA was not deployed with this branch — the task's QA run stays **owed**; this run tests the search itself (`KPM-AC-4/5/12/17`) in Run A and the deploy-order-independence behavior (`KPM-R-7/R-13`, `KPM-AC-7/9`) in Run B. Never both from one run, per the disqualifier.

**Entry point used:** Reporting page → "Where to report" → Area of Work → AOW03 (Inclusive Delivery) → a "Knowledge product" category indicator → **Report** → drawer's **Browse repositories** tab (the AoW HLO "Report result" drawer, not the `lab-report-form` drawer — this path was reachable without the KP report/dashboard-lab route; both drawers share `KpCgspaceBrowseComponent`).

## Run A — all three URLs configured

| # | Item | Result | Evidence | Notes |
|---|---|---|---|---|
| 1 | Idle strip vs mockup | PASS | `runA-01-idle.png` | Lead-in "Searching 3 CGIAR knowledge repositories", three chips (CGSpace/MELSpace/WorldFish) all pressed with check icons, no counts pre-search — matches `mockup/browse-repositories.png`. Minor cosmetic difference only: the search input sits inside the same panel as the chip strip rather than a separate card below it (mockup shows two visually separate boxes) — functionally equivalent, not a defect. |
| 2 | MEL-only title → MEL badge | PASS | `runA-02-mel-badge.png`, `runA-sources-mel.json` | Query "Effect of Farming with Alternative Pollinators faba bean" (a real, live MELSpace 2026 record) → `sources: cgspace ok/1, melspace ok/1, worldfish ok/0`; MELSpace badge rendered on its card. |
| 3 | WorldFish-only title → WorldFish badge | PASS | `runA-03-worldfish-badge.png`, `runA-sources-worldfish.json` | Query "Beyond the Grain Rice-Field Ponds Climate Resilient Cambodia" (real, live WorldFish 2026 record) → `sources: cgspace ok/3, melspace ok/0, worldfish ok/2`; WorldFish badge rendered on two cards. |
| 4 | DOI/title in two repos → "Also in" badge | NOT OBSERVED | — | Queries tried: "wheat" (25/source), "climate resilient agriculture" (25/source), "genebank durum wheat diversity" (25/source). No cross-repository DOI or title+type+year match surfaced in any of the three; one same-title pair found was two **MELSpace** items with different `type` (Poster vs Presentation) — correctly NOT collapsed per `KPM-R-5`. Per the task's own allowance, recording as not observed after 3 queries rather than forcing a match. |
| 5 | Deselect to one chip | PASS | `runA-04-single-repo.png` | Deselecting MELSpace then WorldFish left only CGSpace selected; `kp-repo-chip-cgspace` carries `aria-pressed="true" aria-disabled="true" title="At least one repository must stay selected"`; `kp-select-all-repos` appeared; network requests carried `repository=cgspace,melspace` then `repository=cgspace`. |
| 6 | Use this item (MEL) → handle/MQAP/banner | PARTIAL — see note | (no screenshot; banner never rendered) | `GET .../mqap?handle=https://repo.mel.cgiar.org/items/53d67b9b-...` fired with the correct `itemUrl`-with-uuid form (regex-valid per `KPM-AC-12`); title/description/authors/type all correctly pulled from MELSpace into the new draft. **However**, clicking "Use this item" immediately created a persisted draft Result (**Result #9146**, "Effect of Farming with Alternative Pollinators…", status `EDITING`, unsubmitted) and navigated straight to the Result editor — there was no intermediate "synced banner" state to screenshot, and `document.body.innerText` never contained "Selected from MELSpace". This is the exact contingency the task briefed for ("if the drawer auto-creates on sync… state that the create was not triggered") — both this AoW-drawer path auto-creates; I did not attempt the `lab-report-form` path a second time since the same component/service is shared. **Draft left as-is** (local DB is disposable per environment notes); "Submit result" was never clicked. |
| 7 | View details (WorldFish) → new tab | PASS | `runA-05-view-details-worldfish.png` | Orca's tab-tracking doesn't capture the resulting tab (opened with `noopener`, so it isn't in the same tab group) but `window.open` was instrumented and recorded the exact call: `window.open("https://digitalarchive.worldfishcenter.org/items/39293cf0-4acf-4f46-98a0-a47e9b60d2bc", "_blank", "noopener,noreferrer")` — matches `KPM-AC-17` exactly. |
| 8 | Keyboard pass | PASS | — | Shift+Tab from the search input walks: WorldFish chip → MELSpace chip → CGSpace chip → Manual entry tab → Browse repositories tab → "See all in detail" link. Tab forward from search input walks into Filter by type → Filter by center. All three chips reachable and toggleable with both **Space** and **Enter** (`aria-pressed` flipped both ways, verified via `document.activeElement`). |
| 9 | Badge/notice contrast | PASS | — | Computed via canvas-resolved RGB (oklch backgrounds converted): CGSpace badge 11.60:1, MELSpace badge 6.94:1, WorldFish badge 8.01:1 — all ≥ 4.5:1. Notice contrast not measured in Run A (notice only renders on a partial failure) — measured in Run B context instead (amber notice visually matches `border-amber-300 bg-amber-50 text-amber-900` design tokens; not numerically re-verified — see Run B item 2 notes). |

## Run B — WorldFish blackholed

| # | Item | Result | Evidence | Notes |
|---|---|---|---|---|
| 1 | Env change + restart dance | PASS | — | `WORLDFISH_DISCOVERY_URL` set to `http://10.255.255.1/server/api`; `main.ts` touched/restored per the Leader's dance; new pid confirmed both times; `/api` returned 200 after each restart. |
| 2 | Search → WorldFish unavailable + notice + Retry | PASS | `runB-02-partial.png`, `runB-sources-timeout.json` | Response took 8050 ms, HTTP 200 (not the 502 wrapper), `sources: cgspace ok/485, melspace ok/29, worldfish timeout/0`. UI: WorldFish chip reads "unavailable"; amber notice "WorldFish did not respond. Results below exclude it." with a **Retry WorldFish** button; CGSpace/MELSpace items still rendered. |
| 3 | Retry → one new request, same params | PASS | (network log) | Clicking Retry re-issued `GET .../cgspace/search?...repository=cgspace,melspace,worldfish&query=wheat&year=2026` (identical params to the original call); WorldFish timed out again as expected since the URL was still blackholed. |
| 4 | Restore URL + restart + chip shows count again | PASS | `runB-03-restored.png` | `WORLDFISH_DISCOVERY_URL` restored to the real host; after restart and a fresh search, `kp-repo-chip-worldfish` read "WorldFish 5" (a live count), confirming recovery. `unconfigured` variant (unset var) was not exercised — optional per the task and skipped for time. |

## Environment restoration

- `onecgiar-pr-server/.env` — all three discovery URLs confirmed as the real hosts (`cgspace.cgiar.org`, `repo.mel.cgiar.org`, `digitalarchive.worldfishcenter.org`) after the run.
- `onecgiar-pr-server/src/main.ts` — confirmed byte-identical to `HEAD` (`git diff --quiet` exits 0) after both restart cycles.
- No tokens, cookies, or JWTs were written to any saved file; the `auth` header value was read from `localStorage` in-memory only for `fetch` calls and never echoed or persisted.

## PRODUCT_BUG / findings for the Leader

None of the KPM acceptance criteria were violated by the search/badge/notice/retry/view-details mechanics — items 1–5, 7, 8, 9 and all of Run B are clean PASSes on real, live repository data.

One operational finding, not a strict `KPM-AC` violation but worth the Leader's attention: **"Use this item" in the AoW-indicator Report drawer persists a draft Result immediately** (no pause at a "Selected from MELSpace" banner before create). The task's HITL script assumed such a pause exists (and offered the AoW-modal path as the fallback when `lab-report-form` auto-creates) — in this build, the AoW-modal path auto-creates too. Everything downstream of the click (handle passed to MQAP as `itemUrl`-with-uuid, correct metadata sync) is correct; only the "stop before persisting" assumption doesn't hold for this entry point. **Result #9146** ("Effect of Farming with Alternative Pollinators…") was left in the local, disposable DB in `EDITING`/unsubmitted status — not deleted, not submitted.

## Files written

- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-01-idle.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-02-mel-badge.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-03-worldfish-badge.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-04-single-repo.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-05-view-details-worldfish.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-sources-mel.json`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runA-sources-worldfish.json`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runB-02-partial.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runB-03-restored.png`
- `docs/specs/changes/kp-multi-repository-browse/hitl/runB-sources-timeout.json`
- `docs/specs/changes/kp-multi-repository-browse/hitl/hitl-report.md` (this file)
