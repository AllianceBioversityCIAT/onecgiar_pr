# Overview ToC-Scope Filter — Tasks

Ten tasks, three PRs. **`OSF-T-1` runs first and produces no production code** — it measures the two layout defects and the reconciliation gap, because three later tasks are sized by numbers nobody has yet.

> **Pivot applied 2026-09-01.** `OSF-T-1` ran and refuted the design's root cause: 99.8% of the horizontal overflow and 882 of 914px of dead space come from `sr-only` on a `<table>` inside the shared `app-pr-viz-chart`, not from the AoW row. `OSF-T-2` was rewritten; the old scope survives as the gated `OSF-T-2b`. Evidence: `execution.md` §2–§3.

## 1. Scope & Metadata

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/overview-aow-cross-filter/` |
| **Requirements** | [`requirements.md`](./requirements.md) |
| **Design** | [`design.md`](./design.md) |
| **Judgment** | [`judgment.md`](./judgment.md) — `APPROVED ✅`, 3 severes resolved |
| **Visual reference** | [`mockup/Main.dc.html`](./mockup/Main.dc.html) |
| **Depth** | Standard · **Approval Mode** `pre-approved` (owner, 2026-09-01 — "adelante") |
| **Budget tripwire** | 10 tasks · **~900 LOC** · ≤1 review round per task *(pivot + `OSF-T-2c`, 2026-09-01)* |

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` written; `OSF-OQ-1..4` resolved (owner + design judgment).
- [x] `design.md` written and passed Judgment Day (`Fix only`, 3 severes resolved).
- [x] Mockup approved.
- [x] No migration. No new endpoint. No CLARISA dependency change.
- [x] **A runnable app with a real Science Program** — satisfied throughout: the local stack (client `:4200`, server `:3400`) served every browser measurement in `OSF-T-1`, `OSF-T-2c`, `OSF-T-8`, `OSF-T-2b`, `OSF-T-9`, `OSF-T-10`, `OSF-T-11` and `OSF-T-12` against SP01.

---

## 3. Task List

### `OSF-T-1` — Reproduce and measure, before anything is built [x]

> **`[~]` — measurement complete and decisive; held open because it triggered a Pivot.** See `execution.md` §2 (evidence) and §3 (Pivot Record). Two sub-items remain: the five-width sweep (deferred to `OSF-T-8`, the root cause proved width-independent) and the reconciliation-gap query (unaffected by the pivot).

- **Type:** `tests` (evidence only — **zero production LOC**)
- **Description:** Reproduce both layout defects at measured viewports, and measure the scope partition against real data. Three later tasks are currently sized by arithmetic, not observation; this task replaces the arithmetic with numbers.
- **Implements:** preconditions of `OSF-R-8`, `OSF-R-9`; risks `R7`, `R8`; assumption `OSF-A-1`
- **Design ref:** `OSF-DD-14` (the cause this task found) · originally briefed against `OSF-DD-10`/`OSF-DD-11`/`OSF-DD-8`, all of which it refuted or resolved
- **Files:** `execution.md` only
- **Depends on:** — · **Blocks:** `OSF-T-2`, `OSF-T-3`
- **Estimate:** `S` · **Skills:** `systematic-debugging`, `playwright-cli` (only if installed)
- **Definition of done:**
  - [x] Horizontal overflow **reproduced at 1138px: 1470px** — and the predicted cause **refuted** (AoW row contributes nothing). Five-width sweep deferred to `OSF-T-8`: the cause proved width-independent, so sweeping four more widths against a dead hypothesis buys nothing.
  - [x] Dead vertical space measured: **914px**, of which **882px** is the `sr-only` tables. ToC map reserves 460px and renders no `<canvas>`. `OSF-DD-11` step 2 (shared shell) **resolved: not needed** — `min-height` 1137.6px vs actual 4134px.
  - [x] Reconciliation gap measured on a real program — done later than this task's own run and recorded in `execution.md` §2 ("Reconciliation measurement, owner-approved 2026-09-01, read-only queries, dev DB"), which is why this box lagged the work.
  - [x] `OSF-A-1` measured — `execution.md` §2: **8 of 219 results (3.7%)** touch more than one AoW (5 touch 2, 3 touch 3) and are collapsed by `MAX(twp.acronym)`. Small but non-zero, so the rule is stated rather than inherited.
- **Verification:** browser measurement + one read-only SQL query. **What disqualifies the evidence:** a viewport measured without the app sidebar in its normal expanded state is not the real container — record the sidebar state with every number. A stale dev bundle invalidates every measurement (`onecgiar-pr-client/CLAUDE.md` §9 trap — confirm via `window.ng.getComponent(...)` before trusting anything). **If the app or a real program cannot be reached, this task reports BLOCKED — it must never report estimates as measurements.**
- **Input that would make it fail:** a viewport at 1100px whose `scrollWidth` equals `clientWidth` refutes §3.2's predicted failure band and forces `OSF-T-2` to be re-scoped rather than applied.

---

### `OSF-T-2` — Stop `sr-only` from inflating the page (the real fix) [x]

> **Rewritten by the 2026-09-01 pivot.** The previous scope — a per-breakpoint ladder on the AoW row — targeted a cause `OSF-T-1` refuted. See `execution.md` §3 and `OSF-DD-14`.

- **Type:** `client`
- **Description:** Wrap `app-pr-viz-chart`'s accessibility table in a `<div class="sr-only">` so the table stops expanding the document's scroll area, and drop the ToC map's unused fixed height. Ships as its own PR: it fixes two live bugs across **every charted page in the app**.
- **Implements:** `OSF-R-8`, `OSF-R-9`; `OSF-AC-9`, `OSF-AC-11`
- **Design ref:** `OSF-DD-14`, `OSF-DD-11` (step 1 only)
- **Files:** `onecgiar-pr-client/src/app/shared/components/pr-viz-chart/pr-viz-chart.component.html` · `.spec.ts` · `program-overview.component.html` (ToC map height only)
- **Depends on:** `OSF-T-1` · **Blocks:** `OSF-T-8`
- **Estimate:** `S` (~15 LOC + test) · **Skills:** `angular-developer`, `systematic-debugging`
- **Definition of done:**
  - [ ] The `<table>` is wrapped in a `<div class="sr-only">`; `sr-only` is **removed from the `<table>` itself**.
  - [ ] **BUT it must NOT** set `display:block`, `display:none`, `visibility:hidden` or `aria-hidden` on the table — each clips the box **and** strips or hides the semantics from assistive technology, breaking the users the table exists for. The wrapper clips; the table stays a table.
  - [ ] **AND IT MUST** keep the table reachable to screen readers: it retains `role`/`aria-label`, is not removed from the accessibility tree, and its caption/headers survive.
  - [ ] ToC map: the unused `height="460px"` becomes a `min-height` floor (`OSF-DD-11` step 1) — the chart renders no `<canvas>`, so it currently reserves 460px for nothing. **BUT it must NOT** leave the height unset (ECharts renders 0px without a resolved height — the reversion challenge).
  - [ ] **`dashboard-lab.component.html` is NOT touched** — `min-h-screen` was measured innocent (floor 1137.6px vs actual 4134px). The Reporting tab is not put at risk.
  - [ ] A regression test in `pr-viz-chart.component.spec.ts` asserting the wrapper exists and carries `sr-only`, and that the table does not.
- **Verification:** re-run `OSF-T-1`'s browser measurement — expected `scrollWidth − clientWidth ≤ 3px` and `scrollHeight ≈ 4260`. **What disqualifies it:** a Jest test asserting `scrollWidth`/`clientWidth` — jsdom performs no layout and returns `0`, so it passes on a broken page and is **not evidence**. The unit test can only prove the wrapper's *presence*; only the browser number proves the *effect*.
- **Input that would make it fail:** a chart whose `tableModel` has many columns (the ToC map's is 2297px wide) — if the wrapper does not clip, that one alone reproduces the full defect.

---

### `OSF-T-2c` — Close the residual 16px in the program band [x]

> **Added 2026-09-01 by owner decision**, after `OSF-T-2`'s measurement revealed it. Not absorbed into `OSF-T-2` — that task met its DoD and its Reviewer gate; this is a distinct, pre-existing defect in a different component.

- **Type:** `client`
- **Description:** Stop the collapsed program band's action group from overflowing its container, closing the last of `OSF-R-8`.
- **Implements:** `OSF-R-8`, `OSF-R-10`; completes `OSF-AC-9`
- **Design ref:** `OSF-DD-15`
- **Files:** `…/dashboard-lab/components/reporting-program-band/reporting-program-band.component.html` (+ its spec)
- **Depends on:** `OSF-T-2` · **Blocks:** `OSF-T-8`
- **Estimate:** `S` · **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] The action group at `:195` and its two `shrink-0` children (`:198`, `:211`) no longer overflow their parent at any width in `OSF-NFR-Responsive`.
  - [ ] `OSF-DD-15`'s option 1 attempted first; if the nav's other items cannot absorb the squeeze, fall back to option 2 and **record which option was used and why** in `execution.md`.
  - [ ] **BUT it must NOT** clip the band with `overflow-x: hidden` — the CTA's tooltip is a real overlay that must escape the band when shown.
  - [ ] **BUT it must NOT** remove or hide either button — both are reachable actions, and the CTA is the band's primary action.
  - [ ] **AND IT MUST** be verified on **both** the Overview and the **Reporting** tab: `reporting-program-band` is shared, and a fix that suits one surface may crowd the other.
  - [ ] The `opacity-0` tooltip is left functionally intact (it is not the cause — `OSF-DD-15`).
- **Verification:** browser measurement at the five widths — `scrollWidth === clientWidth` on both tabs. **What disqualifies it:** a Jest test asserting box metrics (jsdom has none), or measuring only the Overview — the defect lives in a shared component, so a single-surface pass proves nothing about the other.
- **Input that would make it fail:** the Reporting tab at 1138px, where the same band renders alongside a wider toolbar; and a long program name, which grows the identity block competing for the same row.

---

### `OSF-T-2b` — AoW row hardening *(gate OPEN — approach approved by owner 2026-09-02)* [x]

- **Type:** `client`
- **Description:** The per-breakpoint ladder from `OSF-DD-8`. **Not** a bug fix any more: `OSF-T-1` measured the AoW row contributing nothing to the overflow. The rigid `max-content` tracks are still real and will bite at some width.
- **Implements:** `OSF-R-10`, `OSF-R-11`; `OSF-AC-10`
- **Design ref:** `OSF-DD-8`
- **Files:** `program-overview.component.html`
- **Depends on:** `OSF-T-8` (the width sweep decides whether this is needed at all) · **Blocks:** —
- **Estimate:** `M` · **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Gate: OPEN — resolved by `OSF-T-8`, 2026-09-02.** `execution.md` §13 measured the AoW identity column at **0px (1100px)**, **14.3px (768px)** and 82–101px rendering 1–4 characters (900px); the name's visible `clientWidth` is **0** at both 1100 and 768. Stable across 3 reads per cell, zero spread.
  - **Read the gate as intent, not literal wording.** Its original text says "exceeding its container", and the row does **not** overflow — `OSF-AC-9` is clean at every width. The mechanism is the opposite: the bar track sits near its 240px ceiling and three rigid `max-content` tracks (~293px combined) consume the row, starving `minmax(0,1fr)` to nothing. `OSF-AC-10` forbids the *collapse*, not only an overflow, so the gate is substantively open. Recorded so nobody later reads this task as "the row overflowed".
  - **Owner decision, 2026-09-02: build `OSF-DD-8`'s ladder.** The two alternatives `OSF-DD-10` allows were considered and rejected — dropping a column below 1280px loses function at exactly the widths where it is hardest to recover, and a card-level scroller trades a collapsed name for horizontal scroll, the defect class `OSF-AC-9` exists to prevent.
- **Definition of done:** as `OSF-DD-8` §8.2 — per-breakpoint templates on **both** row sites, achievement track removed below 1100px, row stacked below 900px, `Report` never icon-only, `max-[<px>]:` variants never rem-based. Additionally:
  - [ ] **The identity track is already `minmax(0,1fr)` at both sites (`:503`, `:552`) — do NOT "fix" it by converting tracks.** `KZ-OAH-1`'s standardization was already applied here. `minmax(0,1fr)` collapses to zero *by design* when its siblings do not fit; the `0` min is the permission to collapse. The cause is the **sum of the rigid siblings**: at 1100px the tracks resolve to `0px 222.741px 54px 127.303px 112.013px` + 4×16px gaps ≈ 580px against ~581px of content box. Removing rigid tracks at narrow widths — `OSF-DD-8`'s ladder — is the remedy.
  - [ ] **BUT IT MUST NOT** be "fixed" by raising the identity min (`minmax(200px,1fr)` or similar). That converts a starved column into horizontal overflow, trading an `OSF-AC-10` failure for an `OSF-AC-9` one — the bug this spec already spent two tasks removing.
  - [ ] **AND IT MUST NOT** reintroduce horizontal overflow: `OSF-AC-9` is currently clean (`scrollWidth === clientWidth`) at all five widths, both filter states — that is the baseline this task must not spend.
  - [ ] Re-measured identity-column width **> 0 and rendering the full or ellipsised name** at all five widths, recorded as numbers.
- **Verification:** the browser sweep that opened the gate, re-run at all five widths via the `OSF-T-8` recipe in `execution.md` §13 (Orca `set viewport W H`, request `W = target / 1.2`). **What disqualifies it:** a jsdom-only pass — no automated gate in this repo can see this defect class, which is precisely how it reached the branch.

---

### `OSF-T-3` — Server: scope bucket query and additive payload [x]

- **Type:** `server`
- **Description:** Rework `getResultsCountByUnitAndStatus` into a bucket×status query over the W1/W2 population, and extend the `clarisa-global-units` payload additively with `byStatus` and `scopeBuckets`.
- **Implements:** `OSF-R-2`, `OSF-R-4`; `OSF-AC-3`, `OSF-AC-5`, `OSF-AC-12`
- **Design ref:** `OSF-DD-1`, `OSF-DD-2`, **`OSF-DD-2b`/`2c`/`2d`**, `OSF-DD-3`
- **Files:** `results-framework-reporting.service.ts` · `results-framework-reporting.service.spec.ts`
- **Depends on:** `OSF-T-1` · **Blocks:** `OSF-T-4`
- **Estimate:** `M` · **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Definition of done:**
  - [ ] LEFT JOINs to `toc_results` / `toc_work_packages`; `status_id` narrowing removed; bucket resolved by CASE.
  - [ ] **`r.source IN ('Result')` present, single-homed** as one exported constant shared with the progress endpoint's filter — the FIND-01 fix. **AND IT MUST** be impossible to change one population without the other.
  - [ ] `UNTAGGED` computed as a residual, never counted directly; a negative residual clamps to 0 **and logs a warning naming bucket and status**.
  - [ ] `resultsCount.editing` and `resultsCount.submitted` keep their names and values (`OSF-AC-12`).
  - [ ] Still **one query, one round trip**.
  - [ ] **Reconciliation test — the keystone:** on a fixture containing at least one AoW-tagged, one outcome-tagged and one untagged result, `Σ(buckets) === programTotal` per status **and** overall.
  - [ ] A test proving a **bilateral** result does not enter the buckets (the exact FIND-01 regression).
- **Verification:** `npx jest --silent --reporters=summary --forceExit <spec path>` **plus one execution of the real query against a dev DB**, compared to `OSF-T-1`'s measured counts. **What disqualifies it:** unit tests alone. Fixtures prove the assembly logic, never that the SQL selects the right rows — a wrong JOIN passes every fixture. If the DB is unreachable, the SQL is **unverified** and must be reported as such, not as a pass.
- **Input that would make it fail:** a program with a bilateral result tagged to an AoW — without the `r.source` predicate the residual goes negative, and the reconciliation test fails loudly.

---

### `OSF-T-4` — Host: scope state, W1/W2 partition, URL sync [x]

- **Type:** `client`
- **Description:** Add `overviewScope` to `DashboardLabComponent` with its options, buckets, breakdown, reset effect and URL sync, and filter the W1/W2 surfaces from it. All derivation lives here; `program-overview` stays presentational.
- **Implements:** `OSF-R-1`, `OSF-R-2`, `OSF-R-4`, `OSF-R-7`, `OSF-R-11`; `OSF-AC-1`, `OSF-AC-3`, `OSF-AC-5`, `OSF-AC-8`
- **Design ref:** `OSF-DD-4`, `OSF-DD-5`, `OSF-DD-6`, `OSF-DD-12`
- **Files:** `dashboard-lab.component.ts` · `dashboard-lab.component.html` · a new pure helper for the filter rule · `dashboard-lab.scope.spec.ts`
- **Depends on:** `OSF-T-3` · **Blocks:** `OSF-T-6`, `OSF-T-7`
- **Estimate:** `M` · **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [ ] `overviewScope` signal; default `null` reproduces today's figures exactly (`OSF-AC-1`).
  - [ ] Filter rule is **one exported pure function**, not inline in a computed and not duplicated (`OSF-DD-6`).
  - [ ] Reset to `null` inside the existing program-change effect (`OSF-DD-5`).
  - [ ] `scope` query param: written with `replaceUrl: true`, read once on init.
  - [ ] **BUT it must NOT** add a scope entry to `OverviewLink` or `PROGRAMME_RESULTS_QUERY_PARAM_MAP` — propagation is deferred behind P2-3399 (`OSF-DD-12`); a test asserts those two stay untouched.
  - [ ] `program-overview` receives inputs only — **AND IT MUST NOT** gain any derivation beyond the documented `richStats` exception.
  - [ ] Client-side reconciliation test: the breakdown handed to the child sums to the unfiltered total.
- **Verification:** `npx jest --silent --reporters=summary --no-coverage <spec path>`. **What disqualifies it:** a test that asserts a computed's output using the same helper the computed uses — it cannot fail. Assert against literal expected values.
- **Input that would make it fail:** switching programs with a scope selected must clear it; a `?scope=AOW99` for an AoW absent from this program must fall back to "All", not render an empty page.

---

### `OSF-T-5` — W3/Bilateral partition and card filtering [x]

- **Type:** `client`
- **Description:** Partition `bilateralRows()` by `row.acronym` and filter the three bilateral cards. Client-only — the data is already on the wire.
- **Implements:** `OSF-R-3`; `OSF-AC-4`
- **Design ref:** `OSF-DD-3b`, `OSF-DD-6`
- **Files:** `dashboard-lab.component.ts` · the shared helper · `dashboard-lab.scope.spec.ts`
- **Depends on:** `OSF-T-4` · **Blocks:** `OSF-T-7`
- **Estimate:** `S` · **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [ ] Categories, contributing centers and bilateral status all filter from the **same** helper as `OSF-T-4` — one rule, one home.
  - [ ] Rows with `null`/empty `acronym` land in `UNTAGGED`; **BUT it must NOT** drop them silently from every bucket.
  - [ ] **All four** cards — categories, centers, status **and the bilateral heatmap** — reconcile with each other under any scope (`OSF-AC-4`). *(Heatmap added by Leader adjudication 2026-09-01: it reads the same `bilateralRows()` and is rendered on the same surface, so leaving it unfiltered beside three filtered siblings would be the `OSF-R-5` failure.)*
  - [ ] `initiative_role_id` comparisons stay `String(...)` — the folder doc's documented string/number trap.
- **Verification:** `npx jest` on the spec. **What disqualifies it:** asserting only the happy path. The partition claim requires a fixture with a `null` acronym, or the untagged branch is untested.
- **Input that would make it fail:** a bilateral row whose ToC link exists but whose work package is missing for the phase — `acronym` is `null` and it must still be counted.

---

### `OSF-T-6` — The scope control (Spartan listbox + ARIA) [x]

- **Type:** `client`
- **Description:** Build the grouped, single-select scope control on a Spartan/Helm popover + listbox, with the ARIA and keyboard contract from `OSF-DD-13`, and the responsive placement from `OSF-DD-7`.
- **Implements:** `OSF-R-1`, `OSF-R-10`, `OSF-R-12`, `OSF-R-14`; `OSF-AC-2`, `OSF-AC-9`
- **Design ref:** `OSF-DD-7`, `OSF-DD-13`
- **Files:** `program-overview.component.{ts,html}` · `program-overview.scope.spec.ts`
- **Depends on:** `OSF-T-4` · **Blocks:** `OSF-T-7`
- **Estimate:** `M` · **Skills:** `angular-developer`, `spartan`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] **Spartan MCP consulted for the component contract before writing markup** — the client guide's standing mandate; no hand-authored Spartan from memory.
  - [ ] **BUT it must NOT** be a bare native `<select>`, and **must NOT** be `app-pr-select` (its flat contract carries no group headers or subtext).
  - [ ] Options grouped in the order `Areas of work` → `Strategic outcomes` → `Outside the Theory of Change` (`OSF-AC-2`).
  - [ ] Full ARIA per `OSF-DD-13`: `combobox`/`listbox`/`group`/`option`, `aria-expanded`, `aria-selected`; **AND IT MUST** keep group headers out of the tab and arrow order.
  - [ ] `Escape` closes and returns focus to the trigger.
  - [ ] Responsive placement per `OSF-DD-7`, including the drop to its own row below 900px.
  - [ ] Copy that differs between P22 and P25 goes through `src/app/internationalization/`; portfolio-invariant copy may be hardcoded, single-homed (`src/CLAUDE.md` §11 — see the `OSF-T-6` judgment). Icons from `@ng-icons/lucide`; no hardcoded hex.
- **Verification:** `npx jest` for structure and keyboard handlers; `npx ng lint --quiet`. **What disqualifies it:** a passing test that only asserts the ARIA attributes **exist**. Presence is not behaviour — it does not prove arrow keys skip headers or that focus returns on `Escape`. Those need simulated key events, and rendered contrast needs `OSF-T-7`.
- **Input that would make it fail:** pressing `↓` from the last option of a group must land on the next group's first *option*, never on its header.

---

### `OSF-T-7` — Overview states: program-wide, no-plan, breakdown [x]

- **Type:** `client`
- **Description:** Render the three honest states — the `Program-wide` declaration on non-filterable cards, the no-plan hero treatment, and the per-scope breakdown with its reconciliation sentence.
- **Implements:** `OSF-R-5`, `OSF-R-6`, `OSF-R-13`; `OSF-AC-6`, `OSF-AC-7`
- **Design ref:** `OSF-DD-9`, `OSF-DD-3`
- **Files:** `program-overview.component.{ts,html}` · `program-overview.scope.spec.ts`
- **Depends on:** `OSF-T-2`, `OSF-T-4`, `OSF-T-5`, `OSF-T-6` · **Blocks:** `OSF-T-8`
- **Estimate:** `M` · **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] `Program-wide` pill + explanatory sentence on the category×status card whenever a scope is active; neutral styling, not brand-coloured.
  - [ ] No-plan hero: em-dash and a sentence; **BUT it must NOT** render `0%`, `0 of 0`, or an empty ring (`OSF-AC-7`).
  - [ ] Unfiltered breakdown with group headers, AoW subtotal, `All scopes` total and the reconciliation sentence (`OSF-R-13`).
  - [ ] Breakdown rows are clickable and select that scope.
  - [ ] `Not tagged to a ToC area` used verbatim as the label (`OSF-DD-1` label table).
- **Verification:** `npx jest` DOM assertions. **What disqualifies it:** asserting the pill renders proves **presence, not effect** — it cannot show that the figures beside it are the program-wide ones. `OSF-T-8` owns that proof; this task's green is not sufficient for `OSF-AC-6`.
- **Input that would make it fail:** selecting a scope whose bucket total is 0 must still render the breakdown row, not hide it.

---

### `OSF-T-8` — Browser verification pass [x]

- **Type:** `tests`
- **Description:** The gate for every defect class no command in this repo can see (`requirements.md` §9: D4, D5, D6). Measured numbers and screenshots, recorded in `execution.md`.
- **Implements:** verification of `OSF-AC-6`, `OSF-AC-9`, `OSF-AC-10`, `OSF-AC-11`; `OSF-R-10`
- **Design ref:** §12 Testing Strategy
- **Files:** `execution.md` only
- **Depends on:** `OSF-T-7` · **Blocks:** —
- **Estimate:** `S` · **Skills:** `playwright-cli` (only if installed)
- **Definition of done:**
  - [ ] At **1600 / 1280 / 1100 / 900 / 768**, filter on and off: `scrollWidth === clientWidth` recorded as numbers (`OSF-AC-9`).
  - [ ] AoW name readable at every width, with the measured identity-column width (`OSF-AC-10`).
  - [ ] No dead space below the last card at every width (`OSF-AC-11`).
  - [ ] **`OSF-AC-6` proved by effect:** with a scope active, the category card's figures are read from the DOM and compared to the unfiltered figures — they must be **equal**, which is what "program-wide" claims and what `OSF-T-7`'s presence assertion cannot show.
  - [ ] Screenshots captured and reviewed on a **T6 Multimodal** model for contrast and focus visibility (D6).
- **Verification:** the recorded numbers themselves. **What disqualifies them:** any measurement taken against a stale bundle, or at a viewport whose sidebar state is unrecorded. Three runs that disagree by more than a pixel or two mean the page is unstable — report the spread, do **not** commit a single reading. An inconclusive result is a legitimate outcome and must be reported as one, never rounded up to a pass.
- **Input that would make it fail:** 1100px is the width most likely to still overflow after `OSF-T-2`; if it does, `OSF-DD-10`'s fallback fires and the decision returns to the owner.

---

### `OSF-T-9` — Accessibility conformance of the scope control *(added 2026-09-02 by owner decision)* [x]

- **Type:** `client`
- **Provenance:** **Not** in the original approved plan. Added after `OSF-T-8` measured three WCAG 2.1 AA failures on the control `OSF-DD-13` introduces — none of which any automated gate in this repo can see (jest, `ng lint` and `ng build` were green throughout). Approved by the owner on 2026-09-02 as one task covering all three.
- **Description:** Close the three measured conformance failures. All three are token/utility choices, not design decisions — the correct precedent for each already exists in the same file or stylesheet.
- **Implements:** `OSF-NFR Accessibility` (its explicit MUST), `OSF-R-10`; closes `requirements.md` §9 D6
- **Design ref:** `OSF-DD-13` · **Evidence:** `execution.md` §13 (measured ratios, sampled tokens, screenshots)
- **Files:** `program-overview.component.html` · `onecgiar-pr-client/src/styles/colors.scss` (only if a token value changes) · `program-overview.scope.spec.ts`
- **Depends on:** `OSF-T-8` (its measurements are the work order) · **Blocks:** —
- **Estimate:** `S` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high` (correctness-critical: conformance, and a token edit has blast radius beyond this control)
- **Definition of done:**
  - [ ] **Focus ring (WCAG 2.4.7).** `program-overview.component.html:280` uses `focus-visible:ring-[var(--pr-focus-ring)]`; `--pr-focus-ring` (`colors.scss:311`) is a **box-shadow value** (`0 0 0 3px rgb(107 70 229 / 0.28)`), so `ring-[…]` feeds an invalid `--tw-ring-color` and paints nothing. Change to `focus-visible:shadow-[var(--pr-focus-ring)]`, matching the existing correct usage at `:944`/`:956`/`:968`/`:1152`/`:1164`/`:1176`. Drop the now-redundant `ring-2`.
  - [ ] **AND IT MUST** carry a regression guard that would actually have failed against the broken code. jsdom loads no Tailwind CSS, so it cannot compute `box-shadow` from a class — the *effect* is proved only by the browser re-measurement below. The jest guard therefore asserts the **correct utility is present AND the broken one is absent** (`focus-visible:shadow-[var(--pr-focus-ring)]` present, `ring-[var(--pr-focus-ring)]` absent). A bare "some focus class exists" assertion would have passed against the bug and is worthless here; the negative half is what gives it teeth.
  - [ ] **Active-option highlight (WCAG 1.4.11, non-text UI, ≥3:1).** Measured **1.09:1** — `--pr-surface-band` `#f7f4fd` on the popover's white. Background alone cannot carry this indicator at that token. Fix in the control, not by repainting `--pr-surface-band` globally: **BUT IT MUST NOT** change `--pr-surface-band`'s value, which is the program band's own surface (`colors.scss:183`, "the one tinted content surface") and is used elsewhere — a global darken to satisfy this listbox is blast radius nobody asked for. Prefer a border, ring, or a context-scoped surface on the active option.
  - [ ] **Group headers (WCAG 1.4.3, normal text, ≥4.5:1).** Measured **3.04:1** — `--pr-text-subtle` `#9691a8` on white at 10px. 10px bold does **not** qualify as large text. Use a darker existing token (e.g. the `--pr-text-muted` already measured at 5.53:1 on the same surface) rather than minting a new one.
  - [ ] Ratios **re-measured in-browser after the fix** and recorded in `execution.md`, using `OSF-T-8`'s method — `getComputedStyle` on the live control with the listbox open, ratios by the WCAG relative-luminance formula. jsdom cannot evaluate contrast; a green jest run is not evidence here.
  - [ ] `aria-selected` / `aria-activedescendant` semantics left intact — this is a **visual** conformance gap, not a screen-reader one (`OSF-T-8` confirmed AT already receives the state correctly).
- **Verification:** `npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/dashboard-lab` and `npx ng lint --quiet`, **plus** the re-measured ratios. **What disqualifies it:** any claim of conformance backed only by a passing jest run, or a token edit whose blast radius outside this control was not checked.
- **Input that would make it fail:** darkening a shared token to fix one surface. If the only way to reach 3:1 is changing `--pr-surface-band` itself, stop and return the decision to the owner — that is a design-system change, not a bug fix.

---
### `OSF-T-10` — Close the 768px collapsed-band overflow *(added 2026-09-02 by owner decision)* [x]

- **Type:** `client`
- **Provenance:** **Not** in the original approved plan. Found by `OSF-T-2b`'s Implementer, reproduced and traced by the Leader on 2026-09-02. `OSF-T-2c` was believed to have closed this; it did not, at this width and in this band state. Approved by the owner as its own task.
- **Description:** `OSF-AC-9` genuinely fails at 768px whenever the program band is **collapsed**. Page overflows horizontally by **47px**, stable (not a transient).
- **Implements:** `OSF-R-8`, `OSF-R-10`; completes `OSF-AC-9` at 768px · **Design ref:** `OSF-DD-15`, `OSF-DD-14`
- **Files:** `reporting-program-band.component.html` · `reporting-program-band.component.spec.ts`
- **Depends on:** — · **Blocks:** —
- **Estimate:** `S` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`

#### Measured evidence (Leader, 2026-09-02, live authenticated app)

| Condition | `clientWidth` | `scrollWidth` | Overflow |
|---|---|---|---|
| 768px, band **expanded** (`scrollY 0`) | 750 | 750 | **0** — clean |
| 768px, band **collapsed** (`scrollY 600`) | 750 | **797** | **47px** |
| 768px, Reporting tab, collapsed | 750 | 798 | 47px — **both surfaces** |

Offender identified by a `getBoundingClientRect` sweep with ancestor-clip filtering:

```
div.ml-auto.flex.items-center.gap-[8px].self-center   :195   right 798, width 307
  └ button.pr-band-fade … min-w-0                     :219   right 798
      └ span.min-w-0.truncate                         (T-2c's own fix)  right 786
```

#### Why two verification passes missed it — read this before measuring anything

**`OSF-T-2c` and `OSF-T-8` both measured `overflowsParent`, and both correctly got 0.** That reading is true and irrelevant: the action group does **not** overflow its parent, because `ml-auto` lets the parent be as wide as its content. It overflows the **page**. And `OSF-T-8`'s page-level `OSF-AC-9` readings were taken with the band **expanded**, where the defect does not exist.

Neither pass ever ran *page-level measurement while the band was collapsed* — the only combination that sees it. `OSF-T-8` filed it as a "one-frame transient after scope toggle"; that characterisation is **wrong** and is corrected here: the trigger is band collapse, and it is stable.

**AND IT MUST NOT** be verified by `overflowsParent` again. The metric that closes this task is `document.documentElement.scrollWidth === clientWidth` **with `[data-testid=program-band-back-btn-collapsed]` asserted present**.

#### Definition of done

- [ ] At 768px with the band collapsed, on **both** the Overview and the Reporting tab: `scrollWidth === clientWidth`, recorded as numbers, 3 runs, spread reported.
- [ ] Re-confirmed at the other four widths (1600/1280/1100/900), band collapsed, both tabs — `OSF-T-2c`'s clean result must survive, and this is the state it was never checked in.
- [ ] **BUT IT MUST NOT** clip the band with `overflow-x: hidden` — `OSF-DD-15` forbids it; the CTA's tooltip is a real overlay that must escape the band.
- [ ] **BUT IT MUST NOT** remove or hide either button — both are reachable actions and the CTA is the band's primary action (`OSF-T-2c`'s constraint, unchanged).
- [ ] `OSF-T-2c`'s existing `min-w-0` / `truncate` / `shrink-0` chain on the CTA is preserved or deliberately superseded — if superseded, say why in `execution.md`.
- [ ] The AoW row work from `OSF-T-2b` and the scope control from `OSF-T-6`/`T-9` are untouched — different component, no shared file.

#### Leading hypothesis (verify or refute; do NOT implement on faith)

`OSF-T-2c` gave the CTA at `:219` `min-w-0` + `truncate`, but the **action group at `:195` has no `min-w-0` of its own** and the Back button at `:198` keeps `shrink-0`. A flex item cannot shrink below its content unless `min-width: 0` is set on the shrinking ancestor chain — so the group's min-content width stays at the sum of its children and `ml-auto` pushes the overflow onto the page. If that holds, the fix is `min-w-0` on the group (and any ancestor that also lacks it), which lets the CTA's existing truncation finally take effect.

**Refuting this is a perfectly good outcome** — `OSF-T-2c` already attempted its `OSF-DD-15` option 1 and rejected it on measured evidence that the nav's other children could not absorb the squeeze. Read `execution.md` §5 before assuming this hypothesis is new.

- **Verification:** the recorded page-level numbers with band state asserted, plus `npx jest … reporting-program-band` and `npx ng lint --quiet`. **What disqualifies it:** any `overflowsParent` reading offered as proof, any measurement whose band state is unrecorded, or a fix verified only at 768px without re-confirming the other four.
- **Input that would make it fail:** a fix that closes 768px by making the band unusable at 1600px. The band is shared by the Overview and Reporting tabs — a change that suits one surface can crowd the other, which is why both are in the DoD.

---
### `OSF-T-11` — Breakdown code column collides with long keys *(added 2026-09-02; approach SUPERSEDED by `OSF-T-14`)* [x]

- **Type:** `client`
- **Provenance:** **Not** in the original plan. Reported by the owner from the live app on 2026-09-02 with a screenshot: the `INTERMEDIATE` code chip paints over the "Intermediate outcomes" label in the `BY SCOPE` breakdown.
- **Implements:** `OSF-R-13`, `OSF-R-10`; `OSF-AC-10`'s no-loss-of-information principle applied to the breakdown · **Design ref:** `OSF-DD-9`, `OSF-DD-1` (label table)
- **Files:** `program-overview.component.html` · `program-overview.scope.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `S` · **Skills:** `angular-developer` · **Effort:** `medium`

#### Root cause (Leader, static analysis)

The breakdown row at `:968` uses `grid-cols-[62px_minmax(0,1fr)_46px]` — the code column is a **fixed 62px** — and the code span carries no `truncate` and no `min-w-0`:

```html
<span class="pr-code text-[11px] font-bold" [class]="row.kind === 'aow' ? … : …">{{ row.key }}</span>
```

`AOW01` (5 chars) fits. `INTERMEDIATE` (12 chars, monospace `pr-code` at 11px ≈ 79px) does not — it overflows its own grid track and paints over the name column. `EOI_2030` (8) and `UNTAGGED` (8) sit near the edge.

**This is the third occurrence of `KZ-OAH-1`** — a px track sized on the common case that breaks on the outlier — in the same component. Its standardization is still `pending` on the default branch.

#### Owner decision, 2026-09-02: do not render a code for non-AoW rows

`INTERMEDIATE` / `EOI_2030` / `UNTAGGED` are **internal enum keys**, not codes a user recognises — unlike `AOW01`, which is a real, user-facing Area-of-Work code. The template already branches on `row.kind === 'aow'` (it uses it to pick the chip colour), so the distinction is established; this extends it to visibility. Rejected alternatives: widening to `max-content` (steals width from the name column — the exact mechanism `OSF-T-2b` just fixed) and truncating (`INTERMEDI…` is not a usable identifier).

#### Definition of done

- [ ] Non-AoW rows render **no code chip**; the cell stays present so the grid's column alignment is preserved (same reasoning the achievement cell documents at `:684-690` — an omitted grid item shifts every later column).
- [ ] AoW rows are **unchanged** — `AOW01`…`AOW05` still render in `--pr-color-primary-600`.
- [ ] The name column gains the freed width; verify `INTERMEDIATE`'s row no longer overlaps at the widths in `OSF-NFR-Responsive`.
- [ ] **BUT IT MUST NOT** change `row.key`'s value or the `PROGRAMME_RESULTS_QUERY_PARAM_MAP` / `selectScope(row.key)` wiring — this is display only. The key still drives selection.
- [ ] **AND IT MUST NOT** regress `OSF-R-13`'s reconciliation sentence or the `All scopes` total row.
- [ ] A test asserting a non-AoW row renders no code text **and** an AoW row still does — the negative half is what gives it teeth.
- [ ] Verified visually in the browser at 1600 and 1100, with a screenshot; jsdom cannot see an overlap.

- **Verification:** `npx jest … dashboard-lab`, `npx ng lint --quiet`, `npx ng build`, plus the browser screenshot. **What disqualifies it:** a fix verified only by a green jest run — the defect is a visual overlap, which is exactly the class jsdom cannot see.

---
### `OSF-T-12` — Reporting AoW table row-action overflow at 768px *(added 2026-09-02, Leader-measured)* [x]

- **Type:** `client`
- **Provenance:** **Not** in the original plan. Surfaced by `OSF-T-10`: fixing the band's 47px overflow revealed a **second, independent** 48px offender that the first was masking. Isolated by the `OSF-T-10` Implementer (hide/restore experiment) and **independently confirmed by the Leader** before this task was minted.
- **Implements:** completes `OSF-AC-9` on the Reporting tab at 768px · **Design ref:** `OSF-DD-14`, `OSF-DD-15` (same defect class, different component)
- **Files:** `reporting-aow-table.component.html` · `reporting-aow-table.component.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `S` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`

#### Measured evidence (Leader, 2026-09-02, Reporting tab, band collapsed)

| Signal | Value |
|---|---|
| `clientWidth` / `scrollWidth` | 750 / **798** — **48px over** |
| `collapsed` | `true` (testid asserted) |
| **Band action group `right`** | **718** — *inside* the viewport; `OSF-T-10`'s fix holds, the band is NOT the cause |
| Offender | `span.inline-flex.h-[30px].shrink-0.cursor-pointer…`, `right: 796`, width 93 |

Class signature resolves to `reporting-aow-table.component.html` (grep). The `OSF-T-10` Implementer reached the same conclusion independently by hiding those ~5 row-action spans: `scrollWidth` 798 → **exactly 750**, and back to 798 on restore.

#### Why this hid for two verification passes — the lesson, not the bug

The two defects were **nearly the same magnitude**: 47px (band) and 48px (table). Any page-level reading saw *one* number and attributed it to *one* cause. `OSF-T-2c` and `OSF-T-8` both did exactly that. A single aggregate measurement cannot distinguish two co-located offenders of similar size — only element-level isolation can, and only after the dominant one is removed.

**AND IT MUST NOT** be closed by a page-level number alone. Isolate at element level and name the offending element, as the evidence above does.

#### Definition of done

- [ ] Reporting tab @768px, band collapsed **and** expanded: `scrollWidth === clientWidth`, recorded as numbers, 3 runs, spread reported.
- [ ] Re-confirmed at 900/1100/1280/1600 on **both** tabs — `OSF-T-10`'s clean result must survive.
- [ ] The offending element named and its post-fix `right` recorded — proof by isolation, not by an aggregate number.
- [ ] **BUT IT MUST NOT** clip with `overflow-x: hidden` (`OSF-DD-15`'s standing constraint across this spec).
- [ ] **BUT IT MUST NOT** remove or hide the `Report` action — it is a reachable action, the same constraint `OSF-T-2c` and `OSF-T-2b` both held to.
- [ ] `OSF-T-10`'s `min-w-0` on the band group, and everything in `program-overview.component.html` (`OSF-T-2b`/`T-9`/`T-11`), stay untouched — different file, no overlap.

#### Leading hypothesis (verify or refute; do NOT implement on faith)

The offender carries `shrink-0` on a 93px element inside a row that has no width to give. That is the same family as `OSF-T-2c`'s CTA (rigid child in a constrained row) and `OSF-T-10`'s group (missing `min-w-0` on the shrinking ancestor). Check the ancestor chain for a missing `min-w-0` **before** reaching for a responsive rule — `OSF-T-10` showed that the truncation machinery can already be present and simply unable to engage.

- **Verification:** the recorded element-level numbers plus `npx jest … reporting-aow-table` and `npx ng lint --quiet`. **What disqualifies it:** an aggregate page reading offered as proof of *which* element was fixed, or a fix verified on one tab only.

---
### `OSF-T-13` — Restore the breakdown's status bar column *(added 2026-09-02, mockup drift)* [x]

- **Type:** `client`
- **Provenance:** Owner-reported 2026-09-02 with a side-by-side of the approved mockup versus the live app. **`OSF-T-7` built the breakdown row with three columns; the approved mockup has four.** The 150px status-bar track was never implemented.
- **Implements:** `OSF-R-13`, `OSF-R-5` · **Design ref:** `OSF-DD-9`, and **the approved mockup** `mockup/Main.dc.html` (the authority here — see below)
- **Files:** `program-overview.component.html` · `program-overview.component.ts` (segment width helpers, if needed) · `program-overview.scope.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `M` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`

#### The drift, exactly

`mockup/Main.dc.html:410` — the breakdown option row, subtotal row and `All scopes` total row **all three** use:
```
grid-template-columns: 62px minmax(0,1fr) 150px 46px;
```
The third track is a segmented status bar:
```html
<span style="display:flex; height:8px; overflow:hidden; border-radius:999px; background:#eeeef1;">
  <span style="{{ b.editingStyle }}"></span>
  <span style="{{ b.submittedStyle }}"></span>
  <span style="{{ b.qaStyle }}"></span>
</span>
```
Three segments — **editing / submitted / QA** — from the mockup's own per-row data (`editing`, `submitted`, `inQa`, plus `approved`/`discontinued`). Shipped code uses `grid-cols-[62px_minmax(0,1fr)_46px]` at all three sites: the bar track is absent.

#### Why the written spec did not catch this — the finding worth more than the fix

`OSF-DD-9` describes the breakdown but **never enumerates its columns**, and no task DoD said "match the mockup's column set". The pre-flight checklist records *Mockup approved*, yet the mockup was never made a **gate**. So `OSF-T-7` shipped three columns and its Reviewer passed it — correctly, because it audited against the DD text, which the diff satisfied. An approved mockup that no DoD references cannot fail anything.

#### Definition of done

- [ ] All three row shapes (option row, subtotal, `All scopes` total) carry the 4-track template with the 150px bar column, matching the mockup.
- [ ] The bar renders three segments — editing / submitted / QA — with **widths computed in TS, never template arithmetic** (`OAH-R-3` "honest at 1%", the standing rule for the AoW row bar at `:660`).
- [ ] Segment data comes from the **existing** `scopeBuckets[].byStatus` payload `OSF-T-3` already ships. **BUT IT MUST NOT** add a server field or a new endpoint — if the needed counts are not already in the payload, STOP and report rather than extending the contract.
- [ ] `role="img"` plus an `aria-label` naming the counts — a roleless `<span>` is not announced (`OAH-N-1`, the precedent at `:665`).
- [ ] Subtotal and total rows leave the bar cell **empty but present** (the mockup does exactly this) so the grid stays aligned.
- [ ] **AND IT MUST NOT** regress `OSF-AC-9`: adding a 150px fixed track to a row that already has a `minmax(0,1fr)` name column is precisely the `KZ-OAH-1` mechanism this spec hit three times. Re-measure the name column at 1600/1280/1100/900/768 and confirm it does not starve.
- [ ] Reconciliation sentence and all counts unchanged (`OSF-R-13`).
- [ ] Verified in the browser with a screenshot compared against the mockup, at 1600 and 1100.

- **Verification:** `npx jest … dashboard-lab`, `npx ng lint --quiet`, `npx ng build`, plus the browser measurements and the mockup comparison. **What disqualifies it:** a green jest run alone — the defect is "a column is missing", which jsdom will happily not notice.
- **Input that would make it fail:** starving the name column to fit the bar. If 150px cannot be found at a width, the bar drops on a responsive rule (`max-[Npx]:hidden`, exclusive boundary) rather than the name shrinking to nothing.

---
### `OSF-T-14` — Short display codes for non-AoW scopes *(added 2026-09-02; supersedes `OSF-T-11`'s approach)* [x]

- **Type:** `client`
- **Provenance:** Owner-reported mockup drift, 2026-09-02. **This partially supersedes `OSF-T-11`.** `OSF-T-11` solved the `INTERMEDIATE`-over-name collision by hiding the code on non-AoW rows — a decision the owner made from a Leader-authored option list **that did not contain the approved design's own answer**, because the Leader diagnosed statically and never opened the mockup. The mockup's answer is short display codes.
- **Implements:** `OSF-R-13`, `OSF-R-10` · **Design ref:** `OSF-DD-1`, `OSF-DD-9`, and the approved mockup `mockup/Main.dc.html`
- **Files:** `program-overview.component.html` · `program-overview.component.ts` · `program-overview.scope.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `S` · **Skills:** `angular-developer` · **Effort:** `medium`

#### The mockup's own data — this is the authority

```js
{ kind: 'outcome',  code: 'INT',  name: 'Intermediate outcomes' }
{ kind: 'outcome',  code: '2030', name: '2030 outcomes' }
{ kind: 'untagged', code: '—',    name: 'Not tagged to a ToC area' }
```

`INT` is 3 characters and fits the 62px track with room to spare, so it closes the same collision `OSF-T-11` closed — while **keeping** the information rather than removing it.

#### Definition of done

- [ ] A display-code mapping renders `INT` / `2030` / `—` for `INTERMEDIATE` / `EOI_2030` / `UNTAGGED`. AoW rows keep `AOW01`…`AOW05` unchanged.
- [ ] The mapping is **one exported pure function or constant, single-homed** — the same discipline `OSF-DD-6` imposed on the scope filter. It will be needed by the trigger too (see below); a second copy is how the two drift apart.
- [ ] **BUT IT MUST NOT** change `row.key`, `selectScope(row.key)`, `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink`, or the `?scope=` value. This is **display only** — the raw key still drives selection and URL round-trip, exactly as `OSF-T-11` preserved it. A test must prove the round-trip still works.
- [ ] `OSF-T-11`'s `@if` gate is replaced, not layered on top — the cell renders the short code, so the "no code at all" branch goes away. Its test is updated in place, not left asserting the superseded behaviour.
- [ ] **Also fixes the `§17` trigger inconsistency:** `scopeTriggerCode()` (`program-overview.component.ts:850`) returns the raw `selectedScopeOption()?.key`, so the trigger paints `INTERMEDIATE` at 900–1099px. Route it through the same mapping. This is why the mapping is single-homed.
- [ ] Verify no overlap remains at 1600 and 1100 — `INT` in the 62px track, measured, not assumed.
- [ ] `—` for untagged is an em-dash, and **AND IT MUST** carry an accessible treatment: an em-dash alone is not a name. Either `aria-hidden` on the glyph with the row's name carrying the meaning, or an `sr-only` label. Do not ship a bare `—` to assistive tech.

- **Verification:** `npx jest … dashboard-lab`, `npx ng lint --quiet`, `npx ng build`, plus browser measurement at 1600/1100 and a live `selectScope` round-trip on a non-AoW row. **What disqualifies it:** changing the underlying key, or a second copy of the mapping.

---
### `OSF-T-15` — Complete `OSF-T-10` at 900px *(added 2026-09-02, Leader-measured)* [x]

- **Type:** `client`
- **Provenance:** Surfaced by the `OSF-T-13`/`T-14` Implementer as an out-of-scope observation, then **measured and attributed by the Leader**. `OSF-T-10` reported 900px collapsed as clean on both tabs; it is not. This completes it.
- **Implements:** completes `OSF-AC-9` at 900px · **Design ref:** `OSF-DD-15`
- **Files:** `reporting-program-band.component.html` · `reporting-program-band.component.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `S` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`

#### Measured evidence (Leader, 2026-09-02, Overview, after `OSF-T-10` and `OSF-T-12` both landed)

| Width | Band expanded | Band **collapsed** |
|---|---|---|
| 768 | clean | **750/750 clean** (`OSF-T-10` + `OSF-T-12`) |
| **900** | 882/882 clean | **882/980 — 98px over** |
| 1100 | clean | 1082/1082 clean |
| 1280 | clean | 1262/1262 clean |
| 1600 | clean | 1581/1581 clean |

Offenders at 900 collapsed, by ancestor-clip-aware element sweep:

```
button.pr-band-fade.flex.h-[32px].shrink-0…   right 944, width 193   ← Back button, shrink-0
button.pr-band-fade.group.relative…min-w-0    right 976, width  24   ← CTA, already truncated to icon
ng-icon.shrink-0.text-[16px]                  right 980, width  16
```

The CTA is **already truncated to 24px** — `OSF-T-10`'s `min-w-0` on the group is working. The remaining pressure is the **Back button at 193px with `shrink-0`**, which cannot give.

#### Why 900px and not 768px — the counter-intuitive part

900 is **wider** than 768 yet **more constrained**, so a fix verified at 768 does not imply 900. At 768 the sidebar is `hidden md:block` (fully hidden) and the band's identity block drops too, freeing width. At 900 the 64px sidebar rail renders **and** the identity block renders, so the band row has less room than at 768. From 1100 up there is slack again.

**900px is therefore the squeeze band** — the worst case sits between "things hide" and "there is room", not at the narrowest viewport. Any width sweep that reasons "if the narrowest passes, the rest pass" is wrong on this surface.

#### The measurement trap — FOURTH occurrence, and the reason this task exists

`OSF-T-2c`, `OSF-T-8` and now `OSF-T-10` each reported a band width clean that was not. Every time the cause was the same shape: **the right number measured in the wrong condition.**

- `OSF-T-2c` and `OSF-T-8` measured `overflowsParent` (true, and irrelevant — the group overflows the *page*, not its parent).
- `OSF-T-10` measured page-level correctly but its 900px reading did not have the band collapsed — its 768px cell did.

**AND IT MUST NOT** be closed by any reading whose band state is not asserted in the same breath as the number. Poll for `[data-testid=program-band-back-btn-collapsed]` before every measurement — `window.scrollTo` does not dispatch `scroll` synchronously, and that race already produced one false reading in `OSF-T-8`.

#### Definition of done

- [ ] 900px, band **collapsed**, both Overview and Reporting: `scrollWidth === clientWidth`, 3 runs, spread reported, band state asserted per reading.
- [ ] All five widths × both band states × both tabs re-confirmed — `OSF-T-10`'s and `OSF-T-12`'s results must survive. **This is the first sweep in this spec to cover both band states at every width**; earlier sweeps covered one or the other.
- [ ] The offending element named with its `right` before and after — not an aggregate page number (`OSF-T-12`'s rule: two co-located offenders of similar size are invisible to an aggregate).
- [ ] **BUT IT MUST NOT** clip with `overflow-x: hidden` (`OSF-DD-15`), nor remove or hide either button.
- [ ] `OSF-T-10`'s `min-w-0` on the action group is preserved — it is working; the CTA is already down to 24px.
- [ ] `OSF-T-12`'s `reporting-aow-table` fix and everything in `program-overview.component.html` stay untouched — different files.

#### Leading hypothesis (verify or refute; do NOT implement on faith)

The Back button (`:198`-ish, `shrink-0`, 193px) is now the binding constraint. `OSF-T-2c` deliberately kept it `shrink-0` while making the CTA the one that truncates. At 900 that allocation no longer suffices. Candidates, in order of preference: let the Back button truncate its own label the way the CTA already does (`min-w-0` + `truncate`, mirroring `OSF-T-2c`'s CTA chain); or collapse it to icon-only below a breakpoint **with `title` + unconditional `aria-label`**, which is exactly the shape `OSF-T-12` used and the Reviewer accepted for the "By AOW" control — reuse that precedent rather than inventing one.

- **Verification:** the element-level numbers with band state asserted, plus `npx jest … reporting-program-band` and `npx ng lint --quiet`. **What disqualifies it:** any measurement whose band state is unrecorded, an `overflowsParent` reading offered as proof, or a fix verified at 900 alone without re-confirming the other four widths in both band states.

---
### `OSF-T-16` — Complete `OSF-T-12` at 900px *(added 2026-09-02, Leader-measured)* [x]

- **Type:** `client`
- **Provenance:** Surfaced by `OSF-T-15`, **independently confirmed by the Leader**. `OSF-T-12` closed the Reporting AoW table's overflow at 768px; at 900px it is still 177px over. Exactly the shape `OSF-T-15` is to `OSF-T-10`.
- **Implements:** completes `OSF-AC-9` at 900px on the Reporting tab · **Design ref:** `OSF-DD-14`, `OSF-DD-15`
- **Files:** `reporting-aow-table.component.html` · `reporting-aow-table.component.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `S` · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`

#### Measured evidence (Leader, 2026-09-02, fresh page load, Reporting tab)

| Band state | `clientWidth` / `scrollWidth` | Overflow |
|---|---|---|
| **Expanded** | 882 / **1059** | **177px** |
| **Collapsed** | 882 / **1059** | **177px** |

**Identical in both band states — that is the proof it is not the band.** `OSF-T-15` left the band's own elements fully contained at 900 (Back `right 794.56`, CTA `right 850`, both inside `cw 882`).

Offenders, ancestor-clip-aware sweep:
```
div.flex.shrink-0.items-center.gap-[12px]              right 952, width 444   ← ratio/achievement group, RIGID
div.flex.w-[168px].shrink-0.flex-col.items-end         right 952, width 168   ← achievement block
span.inline-flex.h-[30px].shrink-0…                    right ~1055, width 93  ← the "By AOW" control (×5)
span.max-[900px]:hidden                                right ~1046, width 46  (×3)
```

#### Why `OSF-T-12` was not wrong — and why 900 still fails

`OSF-T-12` correctly identified that the row had no width to give and shed the **"By AOW" label** (93px → 30px). That was enough at 768. It is not enough at 900, and the reason is the **squeeze band** already documented in `OSF-T-15`: at 768 the sidebar is `hidden md:block` and the identity block drops; at 900 the 64px rail renders, so the row has *less* room despite the wider viewport.

`OSF-T-12`'s own ancestor analysis already named the dominant contributor: **the 444px ratio/achievement group, `shrink-0`**. It shed the 93px control because that was inside its remit; the 444px group is the real mass.

#### The pattern this is the FIFTH instance of

`OSF-T-2c`, `OSF-T-8`, `OSF-T-10`, `OSF-T-12` and now this: a band/table width fix **verified at 768 and inferred for the rest**. Every time, 900 was the width that failed, and every time the reasoning was "the narrowest passes, so the wider ones pass."

**On this surface that inference is invalid.** 900 is more constrained than 768 because the sidebar rail and identity block render there and not at 768. **AND IT MUST NOT** be closed by verifying 900 alone either — the same reasoning that made 768 insufficient makes any single width insufficient.

#### Definition of done

- [ ] Reporting @900, **both band states**: `scrollWidth === clientWidth`, 3 runs, spread reported, measured on **fresh page loads** (see methodology note below).
- [ ] All five widths × both band states × both tabs re-confirmed — `OSF-T-10`, `OSF-T-12` and `OSF-T-15` results must all survive.
- [ ] The offending element named with its `right` before and after, plus a post-fix ancestor-clip-aware sweep showing zero remaining offenders.
- [ ] `OSF-DD-8`'s ladder is the sanctioned precedent for shedding the **achievement block** — it ranks that block first. `OSF-T-12` deliberately did not reach for it because a smaller shed sufficed at 768; at 900 it may be the honest answer. If you shed it, **carry the treatment**: `title` + unconditional `aria-label`, the shape `OSF-T-12` used and its Reviewer accepted (§18). Its content already has a `prTooltip`.
- [ ] **BUT IT MUST NOT** clip with `overflow-x: hidden`, remove the `Report` action, or undo `OSF-T-12`'s icon-only collapse.
- [ ] **Twice in this spec a task fixed an a11y defect and introduced another** (§14, §19). If anything is hidden or shortened, the treatment goes with it.

#### Methodology note — carried from `OSF-T-15`, and it applies to the Leader too

`OSF-T-15` found that **several `set viewport` calls in sequence on one page load** produced a non-reproducible false positive (768 Reporting briefly reading 245px over) that did not reproduce on fresh isolated loads. It excluded that reading and re-measured every width via fresh loads — correct practice. **Measure each width on a fresh `goto` + `set viewport`, not by resizing through a sequence.** Several Leader spot-checks in this spec used the sequential method; readings taken that way should be treated as indicative, not as record.

- **Verification:** element-level numbers with band state asserted, per-width fresh loads, plus `npx jest … reporting-aow-table` and `npx ng lint --quiet`. **What disqualifies it:** a resize-sequence measurement, an aggregate page number offered as proof of which element was fixed, or a fix verified at one width.

---
## 4. Dependency Graph

```
OSF-T-1 (measure — blocks everything sized by numbers)
   ├── OSF-T-2 (sr-only wrapper — the real fix) ───┐
   └── OSF-T-3 (server buckets)                    │
         └── OSF-T-4 (host state + URL)            │
               ├── OSF-T-5 (W3 partition)          │
               └── OSF-T-6 (scope control)         │
                     └── OSF-T-7 (states) ◄────────┘
                           └── OSF-T-8 (browser verification) ✅ gate resolved
                                 ├── OSF-T-2b (row hardening — GATE OPEN, DD-8 ladder approved)
                                 └── OSF-T-9 (a11y conformance — added from T-8's findings)

OSF-T-2 ──► OSF-T-2c (program-band overflow — closes the residual 16px) ──► OSF-T-8
                                                                                └── OSF-T-10 (768px collapsed-band
                                                                                    overflow — T-2c incomplete,
                                                                                    found during T-2b)
```

`OSF-T-2` and `OSF-T-3` are **parallel-safe** — different packages, no shared file.

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `OSF-TEST-1` | unit (server) | `OSF-AC-3` **keystone reconciliation**, `OSF-AC-12` | `results-framework-reporting.service.spec.ts` |
| `OSF-TEST-2` | executed query (server) | `OSF-AC-3`, `OSF-AC-5` — the SQL itself | dev DB, recorded in `execution.md` |
| `OSF-TEST-3` | unit (client) | `OSF-AC-1`, `OSF-AC-3`, `OSF-AC-8` | `dashboard-lab.scope.spec.ts` |
| `OSF-TEST-4` | unit (client) | `OSF-AC-4` incl. the `null`-acronym branch | `dashboard-lab.scope.spec.ts` |
| `OSF-TEST-5` | unit (client) | `OSF-AC-2`, keyboard/ARIA behaviour | `program-overview.scope.spec.ts` |
| `OSF-TEST-6` | unit (client) | `OSF-AC-6` *(presence)*, `OSF-AC-7` | `program-overview.scope.spec.ts` |
| `OSF-TEST-7` | **browser measurement** | `OSF-AC-6` *(effect)*, `OSF-AC-9`, `OSF-AC-10`, `OSF-AC-11` | `execution.md` |

Client coverage stays ≥ 50/60/60/60; server ≥ 5/20/35/40. Run **only the touched specs**, never the full client suite.

---

## 6. Clause Coverage

Every scenario and every `BUT`/`AND IT MUST` clause, mapped to its owning task.

| Clause | Owner |
|---|---|
| AC-1 unfiltered figures unchanged | `OSF-T-4` |
| AC-2 grouped option order | `OSF-T-6` |
| AC-3 buckets sum to total | `OSF-T-3` (server), `OSF-T-4` (client) |
| AC-4 three W3 cards reconcile | `OSF-T-5` |
| AC-5 W1/W2 filters to scope | `OSF-T-3`, `OSF-T-4` |
| AC-6 `Program-wide` declared — *presence* | `OSF-T-7` |
| AC-6 `Program-wide` — ***BUT** not silent*, proved by effect | `OSF-T-8` |
| AC-7 no-plan — ***BUT** never `0%`/`0 of 0`/empty ring* | `OSF-T-7` |
| AC-8 URL restores scope | `OSF-T-4` |
| AC-8 ***BUT** no scope param on the Results deep-link* | `OSF-T-4` |
| AC-9 no horizontal scroll, 5 widths | `OSF-T-2` (1470px→16px), **`OSF-T-2c`** (the last 16px), `OSF-T-8` (proof) |
| AC-9 **AND IT MUST** keep the a11y table in the accessibility tree | `OSF-T-2` |
| AC-10 ***BUT** name never collapses or widens the row* | `OSF-T-8` (measure) → `OSF-T-2b` (fix, only if needed) |
| AC-11 no dead vertical space | `OSF-T-2` (fix), `OSF-T-8` (proof) |
| AC-12 ***AND IT MUST** need no consumer change* | `OSF-T-3` |
| R-3 `AND IT MUST` single-homed filter rule | `OSF-T-4`, `OSF-T-5` |
| R-13 reconciliation stated in words | `OSF-T-7` |
| R-14 `Not tagged` selectable | `OSF-T-6` |

---

## 7. PR Strategy

~880 LOC estimated — above the ~400 single-PR threshold. **Three PRs**, each independently reviewable. **Updated 2026-09-02:** `OSF-T-2b`'s gate is now OPEN and `OSF-T-9` was added from `OSF-T-8`'s findings, so PR 3 carries both — a **budget overrun against the original estimate**, disclosed rather than absorbed. Nothing is committed yet; all of `OSF-T-2`..`OSF-T-8` is still in the working tree.

| PR | Tasks | ~LOC | Why it stands alone |
|---|---|---|---|
| **PR 1 — `sr-only` layout fix** | `OSF-T-1`, `OSF-T-2` | ~20 | Fixes two live bugs across **every charted page in the app**. Ships whether or not the rest lands |
| **PR 2 — Scope buckets (server)** | `OSF-T-3` | ~200 | Purely additive payload. No client depends on it until PR 3 |
| **PR 3 — The scope filter (client)** | `OSF-T-4`..`OSF-T-8`, **+ `OSF-T-2b`**, **+ `OSF-T-9`** | ~660 + `T-2b`/`T-9` | The feature |
| **PR 1 (amended)** | **+ `OSF-T-10`** — belongs with the layout PR, not the feature: it fixes `reporting-program-band`, shares no file with PR 3, and like `OSF-T-2` it fixes a live bug on a **shared** component that ships independently of the scope filter | ~10 | Layout fix |

**PR 3 is not split further on purpose.** A control with nothing to filter, or filtering with no control, are each worse than neither — a half-landed filter is the lying-filter failure this spec exists to prevent. Review it in task order: state → W3 → control → states → verification, with `OSF-T-8`'s measured numbers as the review's evidence. Per `cognitive-doc-design`, each PR description links the previous and names what is out of scope.

---

## 8. Next Step

```text
/akili-execute changes/overview-aow-cross-filter
```

**Updated 2026-09-02 (second revision).** `OSF-T-2b` and `OSF-T-9` are now `[x]` — see `execution.md` §14 and §15. **One task remains:**

1. `OSF-T-10` — the 768px collapsed-band overflow (`reporting-program-band`, different component, no shared file with anything already done)

`OSF-T-1` stays `[~]` as bookkeeping only: its two unchecked bullets (reconciliation gap, `OSF-A-1`) were both measured later and recorded in `execution.md` §2. Nothing is owed by it; it can be flipped to `[x]` at archive time.

`OSF-T-10` cannot be verified by jest, and — the trap that let it survive two verification passes — it cannot be verified by `overflowsParent` either. It closes only on page-level `scrollWidth === clientWidth` **with the band's collapsed state asserted**, on both the Overview and the Reporting tab.
