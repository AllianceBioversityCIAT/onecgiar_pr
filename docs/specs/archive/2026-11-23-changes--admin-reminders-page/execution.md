# Execution — Admin › Reminders page (move + redesign)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-reminders-page` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (base `2ffb3e887`) |
| Started | 2026-11-17 |
| Leader | Claude Code session, `opus` (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (T2 `sonnet`) / `.claude/agents/akili-reviewer.md` (T3 `opus`) |
| Budget (design §13) | 5 tasks · ≈1,450 LOC · 10 review rounds (revised 2026-11-17; was ≈850 / 7) |
| Persona drift | `akili doctor --agents` 2026-11-17: only `leader.md › primary-instructions` OUTDATED (matched 2.36.0); implementer/reviewer CURRENT. Not fixed on this branch (shared-file write discipline) — pending for staging |

## Pre-flight

- Branch `qa-development-2026-ss`, HEAD `2ffb3e887` (RCF code committed). Other sessions' changes (`AGENTS.md`, `onecgiar-pr-client/src/CLAUDE.md`, `bilateral-pdf-mds-only/*`, `portfolio-export-rejection-reason/`) left untouched.

## Task Execution History

### ARP-T-1: Move components, new route, sidebar link, page shell with tabs — in progress

**Attempt 1 (2026-11-17)** — Implementer `akili-implementer` (sonnet), effort medium; skills: angular-developer, spartan, tailwind-design-system, impeccable-bridge.

- Files changed: `git mv` of `phase-management/components/replicated-innovation-reminders/**` → `reminders/components/replicated-innovation-reminders/**` and its nested `center-focal-points/` → `reminders/components/center-focal-points/`; `replicated-innovation-reminders.component.{ts,html}` (focal-points child + import removed, `fixFocalPoints` output); `center-focal-points.component.{ts,spec.ts}` (`missingCount` output + 3 tests); new `reminders/reminders-page.component.{ts,html,spec.ts}`; `shared/routing/routing-data.ts`; new `shared/routing/admin-reminders-routing.spec.ts`; `reporting-nav-sidebar.component.{ts,spec.ts}`; `reporting.component.{html,spec.ts}`, `reporting.module.ts`; `internationalization/replicated-innovation-reminders.copy.ts`.
- **P-12 settled — true:** `BrnTabsContent` only binds host `'hidden': '_isSelected() === false'` (`node_modules/@spartan-ng/brain/fesm2022/spartan-ng-brain-tabs.mjs:93`); content never destroyed (only `BrnTabsContentLazy` defers). Jest mock `tests/mocks/spartanBrainMock.ts:427-436` maps `'[hidden]': '!selected'`. → `hlmTabsContent` used; DD-3 fallback not needed.
- **P-13 settled — confirmed:** active state = `isSubLinkActive(path)` → `router.url.startsWith(path)` (`reporting-nav-sidebar.component.ts` ~571; html :377 expanded, :541 flyout). No new rule.
- Red run: no separate pre-implementation red; falsifiers used as red evidence (accepted by Reviewer).
- Falsifiers (executed, reverted): F1 route after `**` → `expect(idx('reminders')).toBeLessThan(idx('**'))` Received 8 (< 7 expected); F2 `@if (missingCount() !== null)` → 3 page tests red, pill "0" rendered; F3 element back in `reporting.component.html` → `Expected substring: not "app-replicated-innovation-reminders"`.
- Implementer verification: Jest `--maxWorkers=2 --testPathPattern="admin-section/pages/(reminders|phase-management)|reporting-nav-sidebar|routing/admin-reminders"` → 12 suites / 202 tests passed; `ng build --configuration development` green; old-path grep 0.
- Not Done / Assumptions (verbatim summary of report): tasks.md grep gate is weak (old import was relative; real guards are the reporting spec + build); ESLint not run — `npx eslint` fails, no flat config (ESLint 9); page spec swaps focal-points imports via `TestBed.overrideComponent` with a role=checkbox stand-in because `jest.mock('@spartan/checkbox')` did not take effect in this folder; real-children spec calls `detectChanges()` twice (sync mocked emission); reminders component keeps its own title/description (T-2/T-3 visual decision); `p-6` padding and pill size are judgement calls. → assumptions only, no owed item, no continuation.
- Evidence re-run (Leader inline): same Jest pattern → 12/202 passed; `ng build --configuration development` → no errors; grep → 0. **VERIFIED**.
- Reviewer (`akili-reviewer`, opus): **FAIL** —
  1. Discovered Issue: all 7 new page test ids use `reminders-*` (`reminders-page`, `reminders-tab-reminders`, `reminders-tab-focal-points`, `reminders-missing-pill`, `reminders-missing-text`, `reminders-panel-reminders`, `reminders-panel-focal-points`), none `arp-*`. Violated Rule: requirements.md §6 ARP-NFR-4 "new elements get `arp-*` test ids". Remediation: rename to `arp-*`, update `reminders-page.component.spec.ts`, re-run scoped Jest; do not rename moved `rir-*`/`cfp-*`.
- ADVISORY (4R): RISK — `h1` uses `secondary-500`, design §6.4 maps primary text to `secondary-400` (check at HITL). RELIABILITY — `load()` retry does not reset the page count, so a stale count can remain during reload/after failure (design §2.2 says hidden on error); candidate for T-4. READABILITY — active-tab `primary-400` underline (design §6.4) not applied yet; T-2/T-3 or visual review. READABILITY — `overrideComponent` stand-in list can go stale silently; add a pointer comment. Lint not run (no flat config) — recorded gap.

**Attempt 2 (2026-11-17)** — Implementer `akili-implementer` (sonnet), effort **high** (bumped one level after the attempt-1 FAIL); skills: angular-developer, spartan (tailwind-design-system and impeccable-bridge dropped: the rework is a test-id rename with no styling).

- Files changed: **none**. On entry, the template and the page spec already used `arp-page`, `arp-tab-reminders`, `arp-tab-focal-points`, `arp-missing-pill`, `arp-missing-text`, `arp-panel-reminders`, `arp-panel-focal-points`. The moved `rir-*`/`cfp-*` ids are unchanged. It is most likely that attempt 1's Reviewer saw a snapshot from before the last rename. Either way, the 202-test baseline is the same.
- Implementer verification: Jest `--maxWorkers=2 --testPathPattern="admin-section/pages/(reminders|phase-management)|reporting-nav-sidebar|routing/admin-reminders"` → 12 suites / 202 tests passed. Test-id sweep `grep -rn "data-testid=\"reminders-\|'reminders-\(page\|tab\|missing\|panel\)" src cypress` → 0. `ng build --configuration development` → exit 0, no errors (11 existing Sass deprecation warnings).
- Falsifier: changed `arp-missing-pill` back to `reminders-missing-pill` → `reminders/reminders-page` 2 failed / 11 passed. The first failing assertion was `expect(q(fixture, 'arp-missing-pill')?.textContent?.trim()).toBe('1')` at spec :98 (Expected "1", Received undefined). The second was the pill "3" test at :157. The change was then restored.
- Not Done / Assumptions (from the report, verbatim summary): the FAIL was already satisfied by the working tree; it is unknown whether attempt 1's report or the Reviewer saw a stale snapshot. → assumption only. Nothing is owed and no continuation was needed.
- Evidence re-run (Leader inline, non-author): the same Jest command gave 12/202 passed, the sweep gave 0, the `grep` of the template ids listed the 7 `arp-*` ids, and `ng build --configuration development` exited 0 with 0 errors. Result: **VERIFIED**.
- Reviewer (`akili-reviewer`, opus), override (e) rework: **PASS**. The attempt-1 FAIL is resolved and ARP-NFR-4 is met. ARP-R-1, R-2, R-3, R-10, NFR-3, DD-2 and the outputs were checked against the spec text, and the Disqualifier is met (the real page template is rendered with the real focal-points component, and in a second describe with stub children that expose the outputs). It also withdrew the attempt-1 `load()` stale-count advisory: `load()` runs only from `ngOnInit` and from the error-state Retry, and on error the count is already `null`.
- ADVISORY (4R, not gating):
  - RISK: the `h1` uses `--pr-color-secondary-500`, but design §6.4 and ux-ui §7 name `secondary-400` for headers. Fix it with T-2's §6.4 mapping, before T-5.
  - READABILITY / visual: the `primary-400` underline on the active tab is not applied, and `text-[13px]` on the breadcrumb and tab triggers is off the type scale (20/14/12). Fix in T-2 or check at T-5 HITL.
  - RELIABILITY: the page spec's `overrideComponent` import list copies `CenterFocalPointsComponent`'s imports by hand, so it will drift when T-4 adds the search input and switch. → Forward pointer for T-4.
  - READABILITY: `setTab(tab: string)` falls back to `'reminders'` for any unknown value. Consider typing it as `RemindersTab`.
- Recorded gap: ESLint 9 flat config is missing, so lint was not run on the touched files.
- spawns: Implementer a1 not recorded in this session · Reviewer a1 not recorded in this session · Implementer a2 11 calls, 110,881 tokens, ended complete · Reviewer a2 11 calls, 75,188 tokens, ended complete.
- Requirements covered: ARP-R-1, ARP-R-2, ARP-R-3, ARP-R-10, ARP-NFR-3, ARP-NFR-4; DD-1, DD-2, DD-3.
- Running totals vs budget (design §13): tasks 1/5 · LOC ≈ +330/−15 (task diff incl. new files) of ≈850 · review rounds 2/7. Within budget.

### ARP-T-1 closed `[x]` — PASS (attempt 2, 2026-11-17)

## Constitution Impact: ARP-T-1

- Reshaped: the reminders and Center focal points components moved out of `admin-section/pages/phase-management/components/` into a new `admin-section/pages/reminders/` page, which has its own `loadComponent` route `/admin-module/reminders`. Phase management › Reporting no longer hosts them.
- Child guide: none needed. `onecgiar-pr-client/src/AGENTS.md`/`CLAUDE.md` should list the admin-module sub-pages if they enumerate them; check this at archive.
- Module Guides index: no change (no new package).
- CodeGraph re-index pending (`codegraph sync`). The local `docs/architecture/modules/` note for admin-section is stale on this edge.

### ARP-T-2: Reminders tab — summary cards, history, delivery bar, row actions — in progress

**Approval:** the user said "CONTINUA HASTA QUE TERMINES" (2026-11-17), so routine continue gates auto-pass. HALT, Pivot, tripwire and FATAL_FAIL still stop. **Order:** T-2 → T-3 → T-4 run one after another, not T-4 in parallel. Reason: the global rule allows one Jest run at a time on the machine, and all three tasks write the shared copy file.

**Attempt 1 (2026-11-17)**: Implementer `akili-implementer` (sonnet), effort medium. Skills as listed in the task (angular-developer, spartan, tailwind-design-system, impeccable-bridge).

- **Files changed:** `reminders/components/replicated-innovation-reminders/replicated-innovation-reminders.component.{html,ts,spec.ts}`, new `delivery-bar/delivery-bar.component.{ts,spec.ts}`, `internationalization/replicated-innovation-reminders.copy.ts` (`cards`, `history`, `delivery` blocks).
- **Red run against the T-1 template:** 16 failed.
  - Status table: PENDING `Expected 1 / Received 0` (more button), FAILED `Expected 0 / Received 2`, SENDING `Received 6`, SENT free `Received 4`, SENT open `Received 7`.
  - Sent-before-schedule, "earlier": `Expected true / Received false`.
  - Delivery text: `Received undefined`.
  - **Deviation:** the busy spec was *not* red against T-1, because T-1 already rendered disabled buttons. It is observed red only through falsifier 4. DeliveryBar is greenfield.
- **Falsifiers** (each reverted and checked with `cmp`):
  - (1) SENT rendered through `showPreviewOrSend` → 2 red.
  - (2) `<=` for sent-before-schedule → the "equal" case is red.
  - (3) no zero filter → 5 red (`"16 sent · 4 unreachable · 0 skipped · 0 failed"`).
  - (4) visibility gated on `!busy()` → the busy spec is red (`Received: null`).
- **Implementer verification:** reminders component pattern 73 passed. `admin-section/pages/reminders` 6 suites / 101 passed. `ng build` exit 0. Hex grep 0.
- **Not Done / Assumptions** (verbatim summary). None is owed, so no continuation:
  - Lint gap.
  - The Jest popover stub renders inline, so overlay hide/show needs a browser.
  - Judgment calls:
    - DeliveryBar takes a 5th input, `dispatched`.
    - Card 3 reuses the row handlers ("Change date" opens the row's inline edit).
    - `rir-subtitle` and the `rir-metric-*` chips are removed, and the `h2` is sr-only.
- **Evidence re-run** (Leader inline): the page pattern gave 6/101 passed, the hex grep 0, and `ng build` exited 0 with 0 errors. Result: **VERIFIED**.
- **Reviewer** (`akili-reviewer`, opus): **FAIL**. Verbatim:
  1. Discovered Issue: The new elements T-2 adds use `rir-*` test ids, not `arp-*`. Affected: `rir-card-pending`, `rir-card-unreachable`, `rir-card-next`, `rir-next-*` (card action prefix), `rir-next-relative`, `rir-next-empty`, `rir-fix-focal-btn`, `rir-zone-line`, `rir-sent-early-<id>`, `rir-delivery-text`, `rir-delivery-seg-*`, `rir-more-btn`. T-1 followed the convention (`arp-page`, `arp-tab-*`, `arp-missing-*`), so T-2 is the one that drifts. Violated Rule: requirements.md §6 ARP-NFR-4: "Existing `data-testid`s are kept wherever the element still exists; new elements get `arp-*` test ids". Remediation Suggestion: Rename only the new ids to `arp-*`: card prefix `'arp-next'`, `arp-more-btn`, `arp-card-*`, `arp-zone-line`, `arp-sent-early-<id>`, `arp-delivery-text`, `arp-delivery-seg-*`, `arp-fix-focal-btn`, and so on. Keep the ids that already existed: `rir-section`, `rir-row-*`, `rir-status`, `rir-sent-at`, `rir-delivery` (root), `rir-table`, `rir-empty`, `rir-loading`, `rir-load-error`, and the row `rir-send-btn` / `rir-preview-btn` / `rir-edit-btn` / `rir-cancel-btn` / `rir-send-again-btn`. Because the row's `more` button is new, `actionIds()` needs a selector that covers both prefixes, for example `[data-testid$="-btn"]` still works if the more button is `arp-more-btn` inside the row. Update both specs, re-run the reminders pattern, and re-run falsifier 1 so the status table is shown to still go red.
  2. Discovered Issue: The PENDING overflow menu sets `[autoFocus]="false"` on `hlm-popover`. The brain popover defaults to `autoFocus: true` (`@spartan-ng/brain/fesm2022/spartan-ng-brain-popover.mjs:20`), and its content renders in a body-level CDK overlay through `*hlmPopoverPortal`. With autoFocus off, opening the menu leaves focus on the trigger, and Tab moves to the next control in the page, not into the overlay. Keyboard users then likely cannot reach Preview, Change date or Cancel on a PENDING row or on card 3. Jest's inline popover stub cannot show this, and the Implementer deferred only the overlay show/hide check to T-5, not keyboard reachability. Violated Rule: requirements.md §6 ARP-NFR-1: "tabs, chips, switch and menus keyboard-operable with visible focus". Also ARP-R-10, since Cancel and Change date must still work as before. Remediation Suggestion: Remove `[autoFocus]="false"`, or set it to move focus to the first menuitem, so focus enters the menu on open and returns to the trigger on close. Add an Escape-closes / focus-returns item to the T-5 browser checklist, and record keyboard reachability there as a real-browser check. A jsdom spec cannot prove it.
- **ADVISORY (4R):**
  - RELIABILITY: the red-run premise for busy was wrong (deviation recorded above).
  - READABILITY: `dispatched` is a 5th input; sync design §6.3 at archive.
  - READABILITY: "Send now" uses the filled variant, not the §6.4 ghost; confirm at T-5.
  - RESILIENCE: card-3 "Change date" opens a row that may be off-screen; consider scrolling to or focusing it.
  - READABILITY: removing `rir-subtitle` and `rir-metric-*` is allowed by NFR-4, since those elements are gone.
  - RISK: lint gap.
- **Decision (Leader):** the keyboard-reachability check (open, Tab into the menu, Escape returns focus) is carried into T-5 step 5 as a read-only browser check. Opening the menu sends nothing. This narrows how NFR-1 is verified; it adds no new obligation.
- **spawns:** Implementer a1 42 calls, 224,669 tokens, ended partial (assumptions only) · Reviewer a1 tokens not recorded at write time, ended complete.

**Attempt 2 (2026-11-17)**: Implementer `akili-implementer` (sonnet), effort **high** (bumped after the FAIL). Skills: angular-developer and spartan (tailwind-design-system and impeccable-bridge dropped, because the change is test-id renames plus one attribute).

- **Files changed:** `replicated-innovation-reminders.component.{html,spec.ts}`, `delivery-bar/delivery-bar.component.{ts,spec.ts}`.
- **New ids renamed to `arp-*`:**
  - Cards: `arp-card-pending|unreachable|next`, `arp-next-relative`, `arp-next-empty`.
  - Other new elements: `arp-fix-focal-btn`, `arp-zone-line`, `arp-sent-early-<id>`.
  - Card-3 actions use the prefix `arp-next-*`, and the row's more button is `arp-more-btn`.
  - DeliveryBar: `arp-delivery-text`, `arp-delivery-seg-*`.
- **Ids kept:** pre-existing `rir-delivery`, `rir-row-*`, `rir-status` and the row `rir-*-btn` ids.
- **Popover:** `[autoFocus]="false"` removed, so the brain default `autoFocus: true` applies.
- **Implementer verification:**
  - Sweep for the old new-ids → 0. `autoFocus` in the template → 0.
  - `admin-section/pages/reminders` → 6 suites / 101 passed.
  - Falsifier 1 re-run → 2 red (SENT free and SENT open, `Received + "rir-preview-btn","rir-send-btn"`). Falsifier `arp-zone-line` → `rir-zone-line` → 1 red. Both reverted.
  - `ng build` exit 0. Hex grep 0.
- **Not Done / Assumptions:**
  - Focus entering the overlay cannot be verified in jsdom; this is covered by T-5.
  - The card-3 more button is `arp-next-more-btn`.
  - Nothing is owed.
- **Evidence re-run** (Leader inline): 6/101 passed, sweep 0, `autoFocus` 0, `ng build --configuration development` exit 0. Result: **VERIFIED**.
- **Reviewer** (`akili-reviewer`, opus), override (e): **PASS**.
  - Both attempt-1 items are resolved, and the pre-existing ids were checked against the baseline.
  - The colour bar is `aria-hidden` and the status is carried by text (NFR-1). No ADVISORY (the delta is under 50 lines).
- **spawns:** Implementer a2 18 calls, 135,142 tokens, ended complete · Reviewer a1 11 calls, 75,598 tokens, ended complete · Reviewer a2 7 calls, 76,548 tokens, ended complete.
- **Requirements covered:** ARP-R-4, R-5, R-6, R-10, R-11, ARP-NFR-1 (keyboard entry into the menu checked in a browser at T-5), ARP-NFR-4; DD-6, DD-7.
- **Running totals vs budget** (design §13):

  | Measure | Used | Budget |
  |---|---|---|
  | Tasks | 2/5 | 5 |
  | LOC | ≈ +907 / −193 (T-1 +330/−15; T-2 +577/−178: html 228, ts 75, spec 132, copy 34, delivery-bar 108) | ≈ 850 |
  | Review rounds | 4/7 | 7 |

  **LOC is over budget after 2 of the 4 code tasks → BUDGET TRIPWIRE** (block below).

### ARP-T-2 closed `[x]`: PASS (attempt 2, 2026-11-17)

## 🛑 BUDGET TRIPWIRE: escalated to the user after ARP-T-2 (2026-11-17)

- **Delta:**
  - LOC: ≈ 907 inserted against a total budget of ≈ 850, with T-3 (S) and T-4 (M) still to do. Projected total ≈ 1,300 to 1,450.
  - Review rounds: 4 of 7 are used, and 3 tasks still need at least 2 rounds. If T-3 or T-4 needs one rework, the rounds go over budget too.
- **Cause:**
  1. T-2 rewrote most of the reminders template (+228/−151), not the targeted additions the estimate assumed.
  2. The tests run larger than the ≈ 400 LOC estimate (T-1 page spec + routes spec; T-2 status table + DeliveryBar spec).
  3. Both T-1 and T-2 needed one rework round for the same `arp-*` test-id rule (ARP-NFR-4).
- **Rule:** "No mandate widens pre-approval: an owner brief that says "never stop" or "treat every gate as approved" pre-approves routine gates only. The exceptions in `/akili-propose` Step 1 *Approval Mode* (HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG`, destructive actions) still stop, and the stop message quotes this sentence."
- **State:** T-1 and T-2 are `[x]`, uncommitted, and the tree is green. T-3 and T-4 have not started.
- **User decision (2026-11-17, AskUserQuestion):** "Raise budget, continue". The new budget is ≈ 1,450 LOC and 10 review rounds, recorded in design.md §13, tasks.md and the Document Control above. Execution resumes with ARP-T-3 and then ARP-T-4. T-5 still waits for the user's push.

### ARP-T-3: Reminders tab — single scheduler with UTC hint — PASS (attempt 1, 2026-11-17)

- Implementer `akili-implementer` (sonnet), effort medium. Skills: angular-developer, spartan, tailwind-design-system, impeccable-bridge (impeccable engine gate not run; no detector requested). The brief carried this spec's `arp-*` and keep-focus lessons from T-1 and T-2.
- **Files changed:**
  - `replicated-innovation-reminders.component.{html,ts,spec.ts}`: the scheduler block, plus `HlmNativeSelectImports`, a `scheduleKind` linkedSignal, `onKindChange` and `utcHintFor`; `sendAgain` now sets `scheduleKind`.
  - `reminder-time.util.{ts,spec.ts}`: new `utcClock(iso)`.
  - Copy file: `sendsAtUtc(time)` and `allOpen`.
- **Test ids:**
  - New: `arp-schedule-kind`, `arp-utc-hint`, `arp-schedule-full`.
  - Kept: `rir-schedule` (now the `<form>` itself), `rir-draft-<kind>`, `rir-submit-<kind>`, `rir-tz-hint-<kind>`, `rir-send-again-hint-<kind>`.
  - Removed: `rir-schedule-<kind>`. Its element is gone and the consumer specs were trimmed, as DD-5 expects.
- **Red run against the T-2 template:** 12 failed / 41 passed.
  - Both kinds missing: `kindOptions()` `Expected - 4 / Received + 1` (:150).
  - One kind open: `Expected - 3 / Received + 1` (:307).
  - Both open: the `arp-schedule-full` note is missing (:317).
  - Hint: `arp-utc-hint` "Sends at 14:00 UTC", `Received undefined` (:432).
  - DST: "Sends at 08:00 UTC" (:625).
- **Falsifiers** (all reverted):
  - (1) Hint built with today's offset → `Expected "Sends at 08:00 UTC" Received "Sends at 07:00 UTC"`.
  - (2) Select lists all KINDS → 5 or more red, `Expected - 0 / Received + 1`.
  - (3) `schedule()` called on Send again → **the first run stayed green**, because an empty draft never POSTs. The spec was strengthened to type a valid Q4 draft first, then it went red: `expect(component.sendAgainKind()).toBe('Q4_NOTICE') Received: null`.
- **Disqualifier met:** the Rome fixture uses −120 before 2026-10-25T01:00Z and −60 after.
- **Implementer verification:**
  - Task pattern: 4 suites / 78 passed.
  - `admin-section/pages/reminders`: 6 suites / 106 passed.
  - Hex grep 0, `ng build` complete. Lint gap (no ESLint 9 flat config).
- **Not Done / Assumptions** (verbatim summary). None is owed:
  - The hint shows the UTC time only.
  - The hint is two spans.
  - The "server runs in UTC" copy is left as it was.
  - No browser check (T-5).
- **Evidence re-run** (Leader inline): 6 suites / 106 passed, hex grep 0, `ng build --configuration development` exit 0. Result: **VERIFIED**.
- **Reviewer** (`akili-reviewer`, opus): **PASS**.
  - ARP-R-7 checked scenario by scenario, including the BUT clause, which the strengthened spec now proves.
  - Also checked: R-10, R-11, NFR-1 (a real `<label for>`), NFR-4 and DD-5.
- **ADVISORY (4R):**
  - RELIABILITY: the UTC hint gives no warning when the time rolls to the next UTC day.
  - READABILITY: "The server runs in UTC." and "Sends at … UTC" both appear. Check at T-5.
  - READABILITY: design §6.4 describes the scheduler as an `accents-1` footer strip, but it is a separate bordered block. Check at T-5.
  - RELIABILITY: `sendAgainKind` stays set after the admin switches kind. Low risk, because the hint is gated.
- **spawns:** Implementer 34 calls, 205,837 tokens, ended partial (assumptions only) · Reviewer not recorded at write time, ended complete.
- **Requirements covered:** ARP-R-7, R-10, R-11, NFR-1, NFR-4; DD-5.
- **Running totals vs revised budget:**

  | Measure | Used | Budget |
  |---|---|---|
  | Tasks | 3/5 | 5 |
  | LOC | ≈ +1,075 / −250 (T-3 ≈ +165/−60, after taking out the T-2 a2 renames carried in its diff) | ≈ 1,450 |
  | Review rounds | 5/10 | 10 |

  Within the revised budget.

### ARP-T-4: Center focal points tab — search, chips, rows, switch — PASS (attempt 1, 2026-11-17)

- Implementer `akili-implementer` (sonnet), effort medium. Skills: angular-developer, spartan, tailwind-design-system, impeccable-bridge. The brief carried the `arp-*`, keep-focus and RCF-T-4 overflow lessons, plus the T-1 forward pointer about the page spec's `overrideComponent` list.
- **runtime events:** provider death ×1 (ENOTFOUND, "Can't reach the API server"). Recovered at rung 3 (resume by message; the worker's context survived). Tree probe before resuming: +289/−88 partial edits in the focal-points html/ts/spec and the copy file, all kept. The attempt counter did not change.
- **Files changed:** `center-focal-points.component.{html,ts,spec.ts}`; `reminders-page.component.spec.ts` (Consumer: `overrideComponent` import list synced, `CheckboxStubComponent` and unused imports removed); copy file (13 contiguous keys).
- **Test ids:**
  - New: `arp-fp-*` (search, chip-*, count-*, no-match, add-<code>, missing-<code>, contact-<id>, initials-<id>, switch-text-<code>, live, toolbar).
  - Kept: the `cfp-*` ids. `cfp-optin-<code>` is now on the switch.
- **Switch:** `HlmCheckbox` is replaced by a native `button role="switch"` with `aria-checked`, On/Off text and a polite live region (DD-4). The RCF-T-4 overflow fix is kept.
- **Red run:** run against a *reconstructed* T-1-like template (the new template without the toolbar, and `role="checkbox"`), because the literal T-1 file needs the checkbox Jest mock this task removes. 5 failed / 19:
  - Chips: `TypeError … reading 'textContent'`.
  - Missing chip: `… reading 'click'`.
  - Search, and search + chip: null elements.
  - Switch: `Expected "switch" Received "checkbox"`.
  - The Reviewer accepted it: the null elements are the expected "no toolbar" red, not a setup fault.
- **Falsifiers** (one combined run, then reverted): 6 failed / 18.
  - `contacts.length === 0` → the chips, missing-chip and missingCount 2→1 specs go red.
  - No lowercase on the query → the case-insensitive search spec goes red.
  - Rollback removed → `Expected false Received true`, and `aria-checked` `Expected "false" Received "true"`.
- **Disqualifier met:** Center C (inactive contact only) is in the fixture.
- **Implementer verification:**
  - center-focal-points pattern: 24 passed.
  - `admin-section/pages/reminders`: 6 suites / 115 passed.
  - `ng build` exit 0, hex grep 0. Lint gap.
- **Not Done / Assumptions** (verbatim summary). None is owed:
  - Search also matches inactive contacts' name and email.
  - `emitMissing()` runs again, redundantly, after an opt-in success.
  - The switch is disabled while `busy()`.
  - The red run was reconstructed.
  - No browser check (T-5).
- **Evidence re-run** (Leader inline): 6 suites / 115 passed, hex grep 0, the `min-w-[14rem]` overflow fix is present, no `autoFocus`, `ng build --configuration development` exit 0. Result: **VERIFIED**.
- **Reviewer** (`akili-reviewer`, opus): **PASS**.
  - ARP-R-8 and R-9 (DD-4, optimistic change + rollback) are met.
  - Also met: R-2 (emission points), R-10, R-11/DD-7 tokens and NFR-4.
  - Contrast and the 1280 px layout are left to T-5 as a recorded gap.
- **ADVISORY (4R):**
  - RELIABILITY: the same `liveMessage` set twice in a row is not announced again; clear it before setting.
  - RISK (a11y, WCAG 2.5.3): the "Add contact" `aria-label` does not contain its visible text. Suggestion: "Add contact for X".
  - READABILITY: search matching inactive contacts needs a one-line product decision at T-5 or from the user.
  - READABILITY: the page spec's `overrideComponent` now equals the real imports, so it does nothing. Remove it or comment it.
  - RELIABILITY: the dialog's contact flows don't announce in the live region. Check at T-5.
  - RESILIENCE: one global `busy()` disables every switch and every Add button (as it did before T-4).
- **spawns:** Implementer (spawn + 1 resume) ≈ 209,680 tokens reported, ended complete after the resume · Reviewer not recorded at write time, ended complete.
- **Requirements covered:** ARP-R-2 (count source), R-8, R-9, R-10, R-11, NFR-1, NFR-2 (wrap kept; visual check at T-5), NFR-4; DD-4, DD-7.
- **Running totals vs revised budget:**

  | Measure | Used | Budget |
  |---|---|---|
  | Tasks | 4/5 (all code tasks done) | 5 |
  | LOC | ≈ +1,370 / −340 | ≈ 1,450 |
  | Review rounds | 6/10 | 10 |

  Within the revised budget.

### Pre-push gate (2026-11-17)

- `npx jest --maxWorkers=2 --silent --no-coverage --findRelatedTests <27 changed client files>` → 28 suites / 878 tests passed.
- T-5 (PRTest HITL) is waiting for the user to commit and push to perf. Agents do not push.

## ARP-T-5: PRTest visual + behaviour check (HITL) — 2026-11-18

- **Type:** manual, read-only, Leader inline (claude-in-chrome, Browser 2). No code changed.
  - Review: skip-eligible. REVIEW_SKIPPED, because the predicate held: manual check, no diff.
- **Bundle:** commit 262dfcf38 is on performance-refactor; the user confirmed the deploy.
  - The served page has the new route and 105 `arp-*` test ids.
  - Disqualifier "old bundle" ruled out.
- **Step 1, sidebar: PASS.**
  - Admin module flyout order: Tickets dashboard · Phase management · **Reminders** (bell icon) · Knowledge products · User management · AI narrative.
  - Reminders is highlighted as active on `/admin-module/reminders`.
  - Breadcrumb: Admin module › Reminders.
- **Step 2, Reporting: PASS.**
  - `/admin-module/phase-management/reporting` headings: Reporting phases, Configured phases, Phase operations, Result innovations, Innovation use.
  - Zero `rir-*`/`cfp-*` nodes; no "reminder" text.
  - Side note, not this change: bare `/admin-module/phase-management` loaded directly redirects to `/`.
- **Step 3, layout: PASS at both widths.**
  - Fonts: `document.fonts.check` true for Poppins and "Material Icons Round". Icons render as glyphs (`expand_more` 18 px wide).

  | Viewport (CSS px) | Tab | page scrollWidth / clientWidth | Card or table L–R | Action cells max right | Notes |
  |---|---|---|---|---|---|
  | 1280 (screen 1920 @ dpr 1.5) | Reminders | 1265 / 1265 | card 100–1229 | 1228 | table wrapper 1127/1127 |
  | 1280 | Focal points | 1265 / 1265 | table 113–1216 | all `cfp-edit-*` inside | CIAT long name wraps (cell 62 px tall); no inner scrollers |
  | 1568 (same-origin iframe, see below) | Reminders | 1553 / 1553 | table 446–1475 | 1475 | expanded sidebar shown at this width |
  | 1568 | Focal points | 1553 / 1553 | table 458–1463 | all inside | long names still wrap |

  - The 1568 px reading used a same-origin iframe exactly 1568 CSS px wide, because the physical screen is only 1280 CSS px.
    - Media queries follow the iframe viewport.
    - The iframe was removed afterwards. Page storage was not touched.
- **Step 4, visual review: PASS with known advisories.**
  - Matches the preview: cards, status badges (Cancelled grey, Sent green), delivery bar with green/amber segments, "Sent manually, before schedule" sub-line.
  - Advisories carried from review, still visible and not blocking:
    - the scheduler is a separate block, not the accents-1 strip;
    - "The server runs in UTC" repeats the hint;
    - `h1` colour and the active-tab underline.
- **Step 5, read-only actions: PASS, with one deferral.**
  - Tabs: click and keyboard. ArrowLeft from Focal points moves focus and selection to Reminders, and its panel shows.
  - Search: "cortesini" leaves 2 rows (CENTER-02, CENTER-03). "zzzz" leaves 0 rows plus "No Centers match". Clearing restores the list.
  - Chip "No focal point": 4 rows (CENTER-04, -08, OFF-01, CENTER-17), equal to the chip count and the tab pill. `aria-pressed` toggles. Restored to All.
  - **DEFERRED: preview drawer and the `more_vert` keyboard check.**
    - Both render only for PENDING/scheduled campaigns (`showPreviewOrSend`).
    - PRTest has none: 5 Sent, 2 Cancelled.
    - Creating one would be a write on the shared DB and mailer, which is not allowed.
    - Covered by the ARP-T-2 Jest specs. Live check owed when a pending campaign exists.
  - Not clicked: Send again, Schedule, opt-in switches, Edit contacts, Add contact.
  - Console: one `ERROR undefined` from main.js at 9:15:22. It coincides with the phase-management redirect; not triaged.
- **Step 6, campaign 12: NOT cancelled. It was sent.**
  - `rir-row-12`: Final reminder · scheduled Nov 18, 2026, 6:56 AM · **Sent** Nov 18, 2026, 7:00 AM · 16 sent · 4 unreachable.
  - Reported to the user; nothing done by the agent.
- **Evidence (local screenshots, not committed):**
  - `screenshot-1795011300887-0.jpg` (focal 1280)
  - `screenshot-1795011348703-1.jpg` (focal 1568)
  - `screenshot-1795011429024-2.jpg` (history + scheduler 1280)

## REVIEW_SKIPPED: ARP-T-5

- Manual HITL check with no diff. The skip-eligible predicate held and no override applied.

## User decision 2026-11-18 (after ARP-T-5)

- Question asked during T-5: "Should Nicoleta enter the time in UTC?" Answer: yes.
  - The scheduler takes UTC input.
  - A note says "Please note that the selected time is in UTC".
  - A line shows the local equivalent, so the admin never converts by hand.
  - History is shown in UTC.
- ARP-R-6 and ARP-R-7 are amended at the end of `requirements.md`.
- New task ARP-T-6 is added to `tasks.md`.

## ARP-T-6: Scheduler and history in UTC, with the local equivalent — 2026-11-18

### Attempt 1

- **Implementer** (akili-implementer, sonnet, medium): STATUS DONE.
- **Files:**
  - `replicated-innovation-reminders.component.{ts,html,spec.ts}`
  - `replicated-innovation-reminders.copy.ts`
- **What changed:**
  - `validate`, `startEdit` and the edit save use `UTC_OFFSET = () => 0`.
  - `localEquivalentFor()` uses the offset of the entered instant.
  - `displayDate` shows UTC plus a " UTC" suffix.
  - The zone line copy is updated.
  - Removed: `timeZoneHintFor`, `utcHintFor` and the testids `rir-tz-hint-*` and `arp-utc-hint`. Their elements are deleted by step 3; nothing in Cypress references them.
  - New testids: `arp-utc-note-{kind}`, `arp-local-equivalent-{kind}`, `arp-edit-utc-note`, `arp-edit-local-equivalent`.
- **Implementer evidence:**
  - Scoped run: 6 suites / 119 tests passed.
  - `--findRelatedTests` on 4 files: 25 suites / 854 tests passed.
  - ESLint: no flat config (known gap).
  - No red-first run.
- **Leader non-author re-run:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="pages/admin-section/pages/reminders"` gave 6 suites, 119 tests passed. Result: **VERIFIED**.
- **Reviewer** (akili-reviewer, opus): **PASS**.
  - UTC input is checked in schedule, edit prefill and edit save. The falsifier (UTC+1, 09:00 gives 09:00Z) is covered by `it.each`.
  - The local line is DST-aware and shows the date.
  - Display is UTC everywhere in the component.
  - Removing the testid is justified: NFR-4 applies "wherever the element still exists".
- **Reviewer advisories (not blocking):**
  - a11y: add `aria-describedby` from the input to the note and the local line, and an always-rendered `aria-live="polite"` wrapper.
  - The regex `/Nov 20, 2026.*4:00/` would also match 14:00. Anchor it.
  - No test pins the UTC suffix on "Scheduled for" or the Next send card.
  - `utcClock` is now dead code in `reminder-time.util.ts`.
  - The tests assume an en-US locale.
- **Running totals:**
  - Tasks: 6/6.
  - Review rounds: 7/10.
  - LOC: within the revised budget (one small task).

## PRTest check after ARP-T-6 deploy — 2026-11-23

Deploy: `performance-refactor` `733ff4c5e` (commits `0da2380e4`, `41b83c774` on qa-dev). Leader in Chrome, read-only, `/admin-module/reminders`:
- Zone line: "Times are shown in UTC. Your local time zone: America/Bogota (UTC-05:00)."
- History: every scheduled/sent time with a `UTC` suffix (e.g. "Nov 18, 2026, 11:56 AM UTC", sent "12:00 PM UTC").
- Scheduler: label "Date and time (UTC)" and note "Please note that the selected time is in UTC.". Typing 2026-12-01 15:00 showed "= Dec 1, 2026, 10:00 AM in your local time (America/Bogota, UTC-05:00)" (correct, UTC-5); field cleared, Schedule not clicked.
- Old copy ("The server runs in UTC", "Times are shown in your local time zone") gone.
- Still deferred: preview drawer and `more_vert` keyboard check on a PENDING campaign — PRTest still has none (all Sent/Cancelled). Carried to the archive as a follow-up.
