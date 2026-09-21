# Requirements — W3 bilateral in Editing opens center editor, not review drawer

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** open-result routing from programme/platform lists
- **Owner:** Juan Carlos Cadavid
- **Status:** shipped
- **Depth:** Lite · **Mode:** Bug · **Approval Mode:** gated (inherited from `proposal.md`)
- **Proposal:** `./proposal.md` (root cause confirmed)

## 2. Context

Center staff create and edit W3/Bilateral contributions in the **center bilateral result editor** (`/bilateral/{leadCenter}/result/{code}?phase=`). Programme reviewers use the **Bilateral review** drawer for results awaiting a programme decision.

A routing bug sends **every** W3/Bilateral row (except AVISA and Approved) to the review drawer when opened from **Programme Results** or **Results Center**. **Editing** rows belong in the center editor — the same surface the bilateral center Results tab already uses.

Root cause: `usesBilateralReviewFlow()` never excludes `status_id = 1` (Editing). See `proposal.md` § Bug Diagnosis.

Baseline:

- `docs/prd.md` — **US-S1** (result submitter reports and edits results), **AC-3** (authorization enforced server-side; client routing is UX)
- `docs/trd/trd.md` — **W3** bilateral workflow; client module split under `pages/bilateral/` and `pages/result-framework-reporting/`
- `docs/ux-ui/design.md` — center editor section rail (reference screenshots in `./reference/`)

## 3. In Scope / Out of Scope

### In scope

- Three-way open-result routing for W3/Bilateral rows: center editor · review drawer · Result Detail
- Shared client helper consumed by `programme-results` and `results-list`
- Regression tests (red before fix, green after)
- Copy-link parity with open-result

### Out of scope

- Bilateral review tab table "See" action for Editing rows (`BIL-OQ-3`)
- Backend / `/api/bilateral/*` payload changes
- Smart Back / rail alignment (archived separately)
- Notification producers audit beyond what shares the same route helper (`BIL-R-5` covers copy-link on programme-results and results-list only)

## 4. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter (center staff) | Editing W3 rows opened from Programme Results or Results Center land in the center editor |
| QA reviewer / programme lead | Non-Editing W3 rows still open the review drawer — unchanged |
| Platform admin | No change |

## 5. User Stories

- **`BIL-US-1`** — As a center submitter, I want my W3 result in Editing to open in the bilateral editor, so that I can continue filling sections. *Refines `US-S1`.*

## 6. Functional Requirements

### Required (MUST)

- **`BIL-R-1`** When a row is W3/Bilateral (not AVISA) and its status is **Editing** (`status_id = 1` or `status_name = 'Editing'`), **Open result** and row click MUST navigate to `/bilateral/{lead_center}/result/{result_code}?phase={version_id}` and MUST NOT mount the bilateral review drawer.
- **`BIL-R-2`** When a row is W3/Bilateral (not AVISA), not Approved, and **not** Editing (or Draft per `BIL-R-6`), **Open result** MUST keep opening the programme **bilateral-review** deep link with `reviewResult` / `reviewResultId` query params and MUST preload the review drawer state — unchanged from today.
- **`BIL-R-3`** W1/W2 rows, W3 **Approved** rows, and W3 **AVISA** (`SGP-02` / `SGP02`) rows MUST keep opening Result Detail with `?phase=` — unchanged.
- **`BIL-R-4`** **Copy link** on Programme Results and Results Center MUST produce the same absolute URL that **Open result** would navigate to (center editor URL for Editing W3; review deep link for in-review W3; Result Detail otherwise).
- **`BIL-R-5`** **`canUpdateResult`** eligibility MUST NOT regress: W3 bilateral carry-forward rules MUST still use the bilateral update path for non-AVISA W3 rows regardless of Editing vs review-drawer routing.

### Should

- **`BIL-R-6`** W3 **Draft** (`status_id = 8`) SHOULD route to the center editor the same way as Editing unless product rejects (`BIL-OQ-1`).

#### Scenario: Editing W3 opens center editor (primary defect)

- GIVEN a W3/Bilateral result with `status_name = 'Editing'`, `lead_center = 'AfricaRice'`, `result_code = '9368'`, `version_id = '36'`
- WHEN the user opens it from Programme Results or Results Center
- THEN the app navigates to `/bilateral/AfricaRice/result/9368?phase=36`
- AND the bilateral review drawer is NOT shown (`showReviewDrawer` remains false; `currentResultToReview` is not set)
- BUT it must NOT open the Review External Result modal

#### Scenario: Submitted W3 still opens review drawer

- GIVEN a W3/Bilateral result with `status_name = 'Submitted'` (or `Pending Review`)
- WHEN the user opens it from the same surfaces
- THEN the app navigates to `…/entity-details/{SP}/bilateral-review?reviewResult={code}&reviewResultId={id}`
- AND the review drawer is preloaded
- BUT it must NOT route to `/bilateral/…/result/…`

#### Scenario: Approved and AVISA unchanged

- GIVEN a W3/Bilateral result with `status_name = 'Approved'`, OR submitter `SGP-02`
- WHEN the user opens it
- THEN the app navigates to `/result/result-detail/{code}/general-information?phase={version_id}`
- AND IT MUST NOT mount the review drawer or the center editor route

#### Scenario: Copy link matches open destination

- GIVEN an Editing W3 row as in the primary scenario
- WHEN the user chooses **Copy link**
- THEN the clipboard receives an absolute URL whose path is `/bilateral/AfricaRice/result/9368?phase=36`
- AND IT MUST NOT contain `/bilateral-review`

#### Scenario: Missing lead center fails soft

- GIVEN an Editing W3 row with an empty or missing `lead_center`
- WHEN the user opens it
- THEN the app MUST NOT navigate to `/bilateral//result/…` or mount the review drawer
- AND IT MUST fall back to Result Detail with `?phase=` (same as W1/W2 open)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Consistency** | Programme Results and Results Center share one helper — no duplicated predicates |
| **Security** | No change to auth; routing only (`.cursorrules`) |
| **Performance** | No extra network calls |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-AC-1` | W3 Editing, `lead_center = AfricaRice` | Open from Programme Results | Center editor route; no review drawer |
| `BIL-AC-2` | W3 Submitted, not AVISA | Open from Results Center | Review drawer deep link; drawer preloaded |
| `BIL-AC-3` | W3 Approved or AVISA | Open | Result Detail — unchanged |
| `BIL-AC-4` | W3 Editing | Copy link (programme-results) | Absolute center-editor URL |
| `BIL-AC-5` | Regression suite on current code | Tests for `BIL-AC-1` run before fix | **Fail** (proves defect) |
| `BIL-AC-6` | After fix | Same tests + existing review-drawer tests | All green; no assertion weakened |

## 9. Defect Classes & Their Gates

| # | Defect class | Gate | Falsifying input |
|---|---|---|---|
| D1 | Editing W3 still opens review drawer | Jest: `resultRoute` / `getResultRoute` + `openResult` for Editing W3 (`BIL-AC-1`, `BIL-AC-5`) | Row with `status_name: 'Editing'` and `origin: 'W3/Bilaterals'` — must fail before fix |
| D2 | In-review W3 wrongly routed to center editor | Jest: Submitted/Pending W3 still review URL (`BIL-AC-2`) | Row with `status_name: 'Submitted'` — must NOT get `/bilateral/…/result/…` |
| D3 | Approved / AVISA regression | Jest: existing AC-3 cases unchanged (`BIL-AC-3`) | Approved or `SGP-02` row — must stay on Result Detail |
| D4 | Programme vs Results Center drift | Shared util spec + both component specs | Different predicates in two files — util test fails if branches diverge |
| D5 | Copy link diverges from open | Jest: `copyLink` / `resultLink` (`BIL-AC-4`) | Editing W3 copied URL containing `bilateral-review` |
| D6 | `canUpdateResult` regression | Existing update-eligibility tests stay green; spot-check Editing W3 still hides carry-forward | Editing W3 offered carry-forward when not Approved |

**Accepted risk:** No Cypress E2E in this spec — jsdom proves routing commands and service side effects, not rendered drawer DOM. HITL optional on test env with result `#9368`.

## 10. Open Questions

- **`BIL-OQ-1`** — Include Draft (`8`) in center-editor routing? **Default: yes** (`BIL-R-6`).
- **`BIL-OQ-2`** — Missing `lead_center`: fallback to Result Detail (specified in scenario).
- **`BIL-OQ-3`** — Bilateral review tab "See" on Editing rows: out of scope.

## 11. Requirement ID Index

| ID | Summary | ACs |
|---|---|---|
| `BIL-R-1` | Editing W3 → center editor | `BIL-AC-1`, `BIL-AC-5`, `BIL-AC-6` |
| `BIL-R-2` | In-review W3 → review drawer | `BIL-AC-2`, `BIL-AC-6` |
| `BIL-R-3` | Approved / AVISA / W1-W2 unchanged | `BIL-AC-3` |
| `BIL-R-4` | Copy link parity | `BIL-AC-4` |
| `BIL-R-5` | Update eligibility unchanged | D6 |
| `BIL-R-6` | Draft → center editor (SHOULD) | — |
