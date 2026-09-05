# Design — Persistent emerging-result CTA that opens the Reporting aside

**Shape of the solution:** client-only. Add a distinct outline **Report emerging result** control to `reporting-program-band`. Overview and Reporting open the existing `indicator-drawer` in a new **emerging mode**. Results and My results hop to the dashboard-lab host with `?reportEmerging=true&returnTab=…` (same pattern as *Where to report*). The hub emerging card calls the same open path. The legacy centered dialog is unhooked from these entries, not deleted.

## 1. Summary

| Field | Value |
|---|---|
| Spec Path | `changes/emerging-result-cta-placement` · Prefix `ERC` |
| Type / Depth | Change · **Standard** |
| Approval Mode | `gated` |
| Requirements | `./requirements.md` `ERC-R-1`…`R-7`, `R-10`…`R-12`, `R-20`, `ERC-AC-1`…`AC-9` |
| Visual reference | Four chat screenshots (hub CTA, band cluster, legacy dialog, Reporting aside) |
| **Budget** | **5 tasks · ~700 LOC (client ~440 product + ~240 spec, docs ~20) · ≤ 1 Reviewer round per task** — execute stops and escalates past any of these |
| Reversion challenge (§2.3) | Three reversions challenged; all addressed in `ERC-DD-3`, `ERC-DD-4`, `ERC-DD-5` |
| Kaizen applied | **KZ-REH-2** (no native `[disabled]` on gated CTAs) · **KZ-MRF-2** (existing `--pr-*` only) |

This design accomplishes `ERC-R-1`…`R-7` by reusing the Reporting aside instead of building a third creator. The trade-off: Results / My results **change tab briefly** to host the aside (`ERC-R-10` allowed hop). One drawer owner, no dual-host drift.

Links: `./requirements.md` · `docs/prd.md` `G1` / `US-S1` · `docs/ux-ui/design.md` §7 §10 · `docs/trd/trd.md` `W1`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** none.
- **Client modules touched:** `pages/result-framework-reporting` — `reporting-program-band`, `dashboard-lab`, `indicator-drawer`, `lab-report-form` (emerging-mode contract + Output/Outcome chooser), `programme-results`, `my-work-board`.
- **External integrations touched:** none new. Create still uses the existing results-framework-reporting create path inside `lab-report-form`.

```
reporting-program-band
  whereToReport ──────────► host openWhereToReport (unchanged)
  reportEmerging ─────────► host openEmergingReport
                                │
                                ├─ dashboard-lab (Overview / Reporting)
                                │     primeEntityAowContext
                                │     managed = { emerging: true, indicator: null }
                                │     app-indicator-drawer mode=emerging
                                │           └── app-lab-report-form (emergingMode, then Output/Outcome + category)
                                │
                                └─ programme-results / my-work-board
                                      navigate entity-details/:code
                                        ?reportEmerging=true&returnTab=results|my-work
                                      dashboard-lab consumes param → same open path
```

### 2.2 Sequence / interaction diagram

**Band on Overview / Reporting**

```
[Submitter] clicks Report emerging result
  └── reporting-program-band emits reportEmerging only
        └── DashboardLab.openEmergingReport()
              ├── refuse if !canReportEmerging()   // host-bound helper; input defaults false
              ├── primeEntityAowContext()
              ├── manageTab = 'report'
              └── managed = emerging sentinel (no KPI)
                    └── indicator-drawer (emerging)
                          └── lab-report-form (emergingMode=true, emergingCategory=null)
                                ├── user chooses Output / Outcome (new local level)
                                ├── then category (existing picker)
                                └── existing POST create (emerging payload)
                                      └── result detail (Smart Back = this tab’s URL)
```

**Band on Results / My results**

```
[Submitter] clicks Report emerging result
  └── hop helper
        ├── rememberResultDetailOrigin(current Results/My results URL + query)  // BEFORE navigate
        └── navigate …/entity-details/:code?reportEmerging=true&returnTab=results|my-work
              └── dashboard-lab on init / query consume
                    └── openEmergingReport()
                          ├── on aside close without create
                          │     └── navigate back to returnTab (drop the two hop keys)
                          └── on successful create
                                └── result detail; MUST NOT overwrite the origin written at hop time
```

**Hub card**

```
[Submitter] clicks hub Report emerging result
  └── onHubReportEmerging()
        ├── close Where to report (clear whereToReport query if present)
        └── openEmergingReport()   // NOT openReportModal()
```

### 2.3 Reversion challenges (shipped behavior this spec changes)

Three live reversions. Hop (`ERC-DD-2`) is additive, not a reversion.

| # | Shipped behavior | Decision that changes it | Challenge |
|---|---|---|---|
| 1 | `onWhereToReportClick` emits **both** `whereToReport` and `reportEmerging`. Both dashboard-lab bands bind `(reportEmerging)="openWhereToReportModal()"`. | `ERC-DD-3` | Split is the feature. Hosts must rebind emerging to `openEmergingReport` / hop. Jest: *Where to report* click no longer opens emerging; emerging click no longer opens the hub. |
| 2 | Hub **Report emerging result** → `openReportModal()` (legacy centered dialog). | `ERC-DD-4` | Hub specs that assert `showReportModal` rewrite to emerging `managed`. No persisted mid-dialog state. |
| 3 | `innovation-link-surfaces.spec.ts` treats dashboard-lab’s `app-report-result-form` as the live P2-3569 host. | `ERC-DD-5` | Retarget the lock to `lab-report-form` `showsInnovationLink`. A leftover dead tag that stays green is the same defect class. |

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| — | — | No change |

### 3.2 Migrations

None.

### 3.3 CLARISA / external-data implications

None. Category catalogue stays `ResultLevelService` inside `lab-report-form`.

---

## 4. API Surface

### 4.1 New / changed endpoints

None. Existing create used by `lab-report-form` / `buildCreateResultPayload` (emerging: null ToC indicator).

### 4.2 Bilateral / platform-report impact

None. `AC-4` untouched.

---

## 5. Server Workflow / Business Rules

No server work. Create remains `W1` (Editing) via the current client create call. Authorization stays on the existing create endpoint (`AC-3`). AVISA hide is client UX only (`ERC-R-5`); the server must keep refusing create for that programme if it already does.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No new route. Consume two query keys on the dashboard-lab entity-details URL (Reporting host):

| Key | Values | Role |
|---|---|---|
| `reportEmerging` | `true` | Open emerging aside once, then drop the key |
| `returnTab` | `results` \| `my-work` | After cancel / hub-style close, navigate back |

`whereToReport` / `returnTab` for the hub stay as they are. Do not reuse `whereToReport` for emerging.

Hop **query keys do not carry the start-tab query string**. Before navigate, the Results / My results hop helper MUST call `rememberResultDetailOrigin(currentUrl)` so create Smart Back is that tab + its filters (`ERC-R-4`). `returnTab` is only the cancel restore.

### 6.2 Components & services

| Piece | Change |
|---|---|
| `reporting-program-band` | New outline button (expanded + collapsed). `onWhereToReportClick` emits **only** `whereToReport`. New `onReportEmergingClick` emits **only** `reportEmerging`. **Decision:** add `canReportEmerging` input (**default `false`** — fail-closed, same class as form `canReport`). Hosts that may create bind the shared AVISA helper. Results/My results keep `[canReport]="true"` for *Where to report* independently. A forgotten emerging binding hides the CTA (`ERC-R-5`). |
| `dashboard-lab` | `openEmergingReport()`, bind `(reportEmerging)`, consume `?reportEmerging=`. `onHubReportEmerging` calls it. `managed` gains an emerging sentinel. `closeManage` honors `returnTab` when the session was an emerging hop. After a hop create, do **not** call `rememberResultDetailOrigin()` with the dashboard-lab URL. Bind `[canReportEmerging]` from the existing helper (do not rely on the input default). |
| `indicator-drawer` | Optional `emerging` input (or `managed.emerging`). When true: `indicator` / `tocNode` may be null; skip existing-contributors GET; hide `info` and `results` tabs; header copy “Report emerging result”; pass `emergingMode=true` and `emergingCategory=null` into the form. |
| `lab-report-form` | **Contract change (not pass-through).** Today `isEmerging = !!emergingCategory()`, the arming effect returns if both `indicator` and `emergingCategory` are null, and `resultLevelId` is never user-chosen — so `emergingCategory=null` leaves the form unarmed and `categoryUnavailable` true. Add `emergingMode` input (boolean, default false). When `emergingMode` is true: treat as emerging even with null category; run the arming effect; `needsCategoryChoice` stays true. Add an Output/Outcome chooser (same levels the legacy dialog’s `app-result-level-cards` already lists from `ResultLevelService`) that writes a local `chosenResultLevelId`. `resultLevelId` becomes `indicator ?? tocNode ?? emergingCategory.levelId ?? chosenResultLevelId`. Existing category picker then has a level. Do not preselect a type (`ERC-R-3`). Innovation-use link still uses `showsInnovationLinkQuestion()` once `resolvedResultTypeId` is the picked category (phase year ≥ 2026). Planned Report path must not show the level chooser. |
| `programme-results` / `my-work-board` | Bind `(reportEmerging)` to a hop helper: `rememberResultDetailOrigin()` with the **current** tab URL (path + query), then navigate with `reportEmerging=true&returnTab=…`. Bind `[canReportEmerging]` from the same AVISA check dashboard-lab uses (share the helper, do not fork a third `isAvisa` copy). |
| Legacy `showReportModal` | Leave in the tree. No hub/band caller. `innovation-link-surfaces.spec.ts` must be retargeted (`ERC-DD-5`). |

State: emerging open flag lives on dashboard-lab `managed` only. Results/My results hold no drawer state.

### 6.3 Design system usage

- No new PrimeNG / Spartan primitives. Buttons are the same Tailwind + `material-icons-round` family as Tour / Where to report.
- Tokens: `--pr-color-primary-*`, `--pr-border`, `--pr-surface-card`, `--pr-text-secondary` (KZ-MRF-2).
- **Visual:** emerging = Tour treatment (outline, 32/36px). *Where to report* stays filled brand (UI-RULES: one brand button).
- Icon: `add_circle` (create), not a second `explore`.
- Label: **Report emerging result**. Below the same breakpoint *Where to report* hides text (`min-[480px]`), emerging is icon-only with `aria-label`. Collapsed bar: `truncate` + `min-w-0` (OSF-T-10). `ERC-R-20` MAY shorten visible collapsed text to **Emerging**.
- Tab order: Tour → Emerging → Where to report (`ERC-R-11`).
- Focus ring: existing `focus-visible:ring-2` on primary-300.
- Motion: aside already respects `prefers-reduced-motion`.
- i18n: match hub English for this spec; do not invent a new term key unless specify-time copy already has one.

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

- JWT via existing interceptor. No new endpoints.
- Client: band `canReportEmerging` input **defaults false**. Hosts bind `canReportEmerging()` / the shared AVISA helper to show the CTA (`ERC-R-5`). Form submit still uses `canReport` → `entityAowService.canReportResults()` (default false if a host forgets — keep that). Same fail-closed class for both create controls.
- AVISA: hide, do not native-`[disabled]` (KZ-REH-2).
- No tokens in logs (`AC-9`).

---

## 8. Performance & Capacity

- No new list fetch. Emerging mode MUST NOT call existing-result-contributors (`ERC` NFR).
- `primeEntityAowContext()` already runs on dashboard-lab selection; hop from Results reuses it.
- Bundle: no new dependency.

---

## 9. Observability

- No new structured logs.
- Metric moved: `M1.2` (time to first submission) by removing a click — not measured in this spec.

---

## 10. Testing Plan (forward-looking)

| Layer | What |
|---|---|
| Jest band | Button present only when host sets `canReportEmerging=true`; **absent when the input is unset** (default false) and when false; collapsed + expanded; `whereToReport` click does not emit `reportEmerging`; emerging click does not emit `whereToReport` |
| Jest dashboard-lab / hub | `onHubReportEmerging` does not set `showReportModal`; sets emerging `managed`; planned row Report still not emerging |
| Jest drawer | Emerging: no contributor GET; no info/results tabs; form `emergingMode` |
| Jest lab-report-form | `emergingMode=true` + null category **arms** the form; Output/Outcome then category; `categoryUnavailable` false after a level is chosen; `isEmerging` true; planned path (no `emergingMode`) still has no level chooser |
| Jest Results / My results | Hop URL keys; hop calls `rememberResultDetailOrigin` with the start URL **before** navigate; AVISA does not hop |
| Jest close path | `returnTab` navigates back on cancel; create leaves the hop-persisted origin in place (does not remember dashboard-lab) |
| P2-3569 lock | `innovation-link-surfaces.spec.ts` no longer requires dashboard-lab to host `app-report-result-form`. New lock: live emerging path is `lab-report-form` `showsInnovationLink` (already unit-tested there). If dashboard-lab drops the legacy host, the old “live modal asks it” example MUST be rewritten or deleted — leaving it green against a dead tag is P2-3569 again |
| Visual HITL | 375px and ≥900px collapsed bar: no overflow (jsdom-blind) |
| Out of suite | Full client Jest. Cypress E2E not required for this spec |

Coverage: do not lower client 50/60/60/60. Scoped patterns only.

---

## 11. Backwards Compatibility & Migration Plan

- Additive UI. No flag. No migration. No consumer comms.
- Legacy dialog file remains for unrouted / dormant callers (`entity-details` retired). Do not delete in this spec.
- Hub tests that expect `showReportModal === true` after `onHubReportEmerging` **must change** — that is the behavior change, not a flaky test.

---

## 12. Design Decisions (ADRs)

### `ERC-DD-1` — Extend `indicator-drawer` with emerging mode

- **Context:** The drawer still requires an indicator and fetches contributors. `lab-report-form` has an `emergingCategory` input, but null does **not** arm emerging mode (see `ERC-DD-7`).
- **Decision:** one optional emerging mode on the existing drawer. No second aside component. Drawer passes `emergingMode=true` into the form.
- **Alternatives considered:** new `emerging-report-drawer` (duplicate chrome, dirty-close, width). Open `lab-report-form` in a dialog (rejects `ERC-R-3` / Image 4).
- **Consequences:** drawer contract changes (`indicator` optional when emerging). Planned Report path must keep requiring an indicator.

### `ERC-DD-2` — Single aside host; Results / My results hop

- **Context:** `ERC-R-10` prefers in-place; proposal warned two hosts drift. Drawer today has one host (`dashboard-lab`).
- **Decision:** hop with `?reportEmerging=true&returnTab=results|my-work`. Overview/Reporting open in place. **Smart Back:** the hop helper persists the start-tab URL via `rememberResultDetailOrigin` **before** navigate. Create MUST NOT overwrite that origin with the dashboard-lab URL. Cancel uses `returnTab` only.
- **Alternatives considered:** mount the drawer on Results and My results (true Option B; more LOC, two priming sites). Lift drawer to a parent router outlet (no such parent exists). Encode the full origin in the query (ugly; filters already live on `rememberResultDetailOrigin`).
- **Consequences:** user sees Reporting (or entity-details default) while the aside is open, then returns on cancel. After create, result-detail Back is Results / My results with the filters they had. Overrule this DD if the owner wants zero tab change.
- **Reversion challenge:** N/A (additive hop). Not counted in §2.3. Smart Back is a new-path risk, closed by persist-before-navigate.

### `ERC-DD-3` — Split band outputs; outline emerging button

- **Context:** `onWhereToReportClick` emits both outputs. There is no emerging button. Live alias: both dashboard-lab bands bind `(reportEmerging)="openWhereToReportModal()"`.
- **Decision:** two click handlers, two outputs. Emerging uses Tour outline chrome; *Where to report* stays brand fill. New `canReportEmerging` input (**default false**) so *Where to report* can stay visible when emerging must hide, and a forgotten binding cannot expose create on AVISA.
- **Alternatives considered:** one button that opens a menu (extra click, rejects “también esté”). Two brand buttons (breaks UI-RULES). Default `true` (fail-open — rejected after Judgment Day C3).
- **Consequences:** every host that should show the CTA must bind `(reportEmerging)` **and** `[canReportEmerging]="true"` from the shared helper, or the button stays hidden. Results/My results bind the hop.
- **Reversion challenge — what does splitting the emit break?** (1) The two dashboard-lab `(reportEmerging)="openWhereToReportModal()"` aliases — rebind to `openEmergingReport()`. (2) Any test that treats one *Where to report* click as also opening emerging. (3) Users who currently reach the hub via the unused `reportEmerging` output — none; that output is only an alias today. See §2.3 row 1.

### `ERC-DD-4` — Unhook legacy modal from hub and band; do not delete it

- **Context:** `onHubReportEmerging` → `openReportModal()` is the live emerging path. Tests and P2-3569 lock that path.
- **Decision:** those two entries call `openEmergingReport()` only. Leave `showReportModal` / `app-report-result-form` in the template unused from hub/band.
- **Alternatives considered:** delete the dialog now (out of scope; other files still mention it). Keep both surfaces (rejects `ERC-R-3`).
- **Consequences:** hub.spec rewrite. Folder `dashboard-lab/CLAUDE.md` note about “six entries keep the modal” must be updated in the implementation commit.
- **Reversion challenge — what does removing this break?** (1) Hub tests that assert `showReportModal`. Rewrite them to assert emerging `managed`. (2) Users mid-flow in the old dialog — none persisted. (3) P2-3569 question on the legacy host — see `ERC-DD-5`. No other live listener of `reportEmerging` except the alias to the hub.

### `ERC-DD-5` — Innovation-link question rides `lab-report-form`, not the unhooked modal

- **Context:** P2-3569 shipped because the question was bound on a dead host. The live lock is `innovation-link-surfaces.spec.ts` requiring `[showInnovationLinkQuestion]="true"` on dashboard-lab’s `app-report-result-form`. `lab-report-form` already implements `showsInnovationLinkQuestion()` for Innovation use + phase year ≥ 2026.
- **Decision:** emerging aside is the live surface. Retarget the static lock so it does not treat a leftover (or removed) `app-report-result-form` tag on dashboard-lab as the shipped path. Do not add `showInnovationLinkQuestion` to `lab-report-form` — that form already owns the gate internally.
- **Alternatives considered:** keep the legacy modal mounted only to satisfy the lock (false green). Port the `@Input` onto the aside (duplicate gates).
- **Consequences:** if someone later re-hosts `app-report-result-form` on a live route, the existing walk-the-tree lock still applies to that tag.
- **Reversion challenge — what does removing the modal binding break?** The question would disappear **only if** `lab-report-form` lacked it. It does not. The lock test would go red if rewritten incorrectly — the rewrite is a named task, not an incidental edit.

### `ERC-DD-6` — Emerging hop query keys are not `whereToReport`

- **Context:** Results already hops with `whereToReport=true&returnTab=results`.
- **Decision:** separate `reportEmerging=true` so a shared `returnTab` cannot open the wrong overlay.
- **Alternatives considered:** reuse `whereToReport` plus a third key (easy to mis-open the hub).
- **Consequences:** dashboard-lab must consume both pairs independently.

### `ERC-DD-7` — Emerging mode is an explicit flag; user picks level then category

- **Context:** `ERC-R-3` requires Output/Outcome + category in the aside, same as the legacy dialog. Passing `emergingCategory=null` alone does **not** do that: `isEmerging` is false, the arming effect returns, `resultLevelId` stays null, `categoryUnavailable` is true, and the form comment says the level is never chosen by the user. “No new fields” was false.
- **Decision:** add `emergingMode` (boolean, default false). Emerging create sets `emergingMode=true` and leaves `emergingCategory=null` (no type preselect). The form grows an Output/Outcome chooser that sets local `chosenResultLevelId` from the same `ResultLevelService` Output/Outcome levels the legacy dialog already lists. Existing `resultTypes()` / category picker then resolve. `isEmerging` becomes `emergingMode() || !!emergingCategory()`. Planned Report does not set `emergingMode` and does not show the chooser.
- **Alternatives considered:** pass a dummy `emergingCategory` only to arm (would lock a type — rejects `ERC-R-3`). New fields on a second form (rejects one aside). Keep “no new fields” (unimplementable; Judgment Day C1).
- **Consequences:** `lab-report-form` contract and folder `CLAUDE.md` must change in the same commit. Innovation-link (`ERC-DD-5`) lights up only after the user picks Innovation use.

---

## 13. Open Gaps & Follow-ups

- **`ERC-OQ-3` locked as hop** in `ERC-DD-2`. Owner may flip to in-place before tasks; that raises the budget (~+180 LOC, +1 task → ~880 / 6).
- Visual overflow at 375px is a HITL/T6 gate, not Jest.
- Dormant `/emerging` sidebar and `openGuided('emerging')` stay as they are.
- Promoting the band cluster to `docs/ux-ui/design.md` §12 is optional after ship; not required to execute.

---

## Budget (Step 2.4)

| Signal | Number |
|---|---|
| Expected tasks | 5 |
| Expected LOC | ~700 (product ~440, tests ~240, docs ~20) |
| Expected review rounds | 1 per task (5 Reviewer passes) |

Depth **Standard** matches: more than a one-liner, not API/auth/migration Full. Not Lite (four hosts, drawer contract, P2-3569 lock).

---

## Required cross-references

- `./requirements.md`
- `./proposal.md`
- `docs/prd.md` `G1`, `US-S1`, `AC-3`, `AC-9`
- `docs/ux-ui/design.md` §7, §10
- `docs/trd/trd.md` `W1`
- P2-3569 / `innovation-link-surfaces.spec.ts`
- Archived `reporting-entry-hub` (hub card; destination owned here)
