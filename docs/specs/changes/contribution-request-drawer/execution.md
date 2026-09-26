# Contribution Request Drawer — Execution Log

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/contribution-request-drawer/` |
| Branch | `qa-development-2026-ss` |
| Started | 2026-09-25 |
| Approval Mode | gated (inherited from `proposal.md`) |
| Leader model | `opus` (claude-opus-5-5) |
| Budget (design §14) | 6 tasks · ~ +650 / −260 LOC · ≤ 2 review rounds per task |
| CodeGraph | `.codegraph/` absent in this checkout — workers explore by file |

## Active Lessons (from kaizen-log, if any)

*(none loaded — `docs/specs/kaizen-log.md` not present)*

---

## Task Execution History

<!-- Entries appended per task, oldest first. -->

### `CRD-T-3` — `notification-item`: drawer state and decision logic (additive)

| Field | Value |
|---|---|
| **Final status** | **PASS** |
| Date | 2026-09-25 |
| Implementer attempts | 1 |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers: author ≠ auditor holds |
| Effort | `high` (task touches the P2-3187 decision path) |
| Skills assigned | `angular-developer`, `tdd` (as listed in the task) |
| Wave | wave 1, ran at the same time as `CRD-T-1` (different files, `tasks.md` §4) |
| Review input | the diff was frozen to a scratchpad file (`t3.diff`, 852 lines) and the Reviewer read it with `Read`, instead of the diff being pasted into the brief. It was the same frozen artifact, so nothing was regenerated and the Reviewer saw exactly what the Implementer handed over |

**Requirements covered:** CRD-R-2 (same requester/responder resolution, builder), CRD-R-3 (close before a bilateral navigation), CRD-R-4 (builder: values, dash fallback, several entries, typology), CRD-R-5 (switching, Clear mapping), CRD-R-6 (all four scenarios), CRD-R-8 (Blocked reason builder, Outcome closes the drawer), CRD-R-9 (closing records nothing), CRD-R-10 (logic). NFR Compatibility (`isP25Request` routing kept).

#### Attempt 1 — PASS

- **Files changed (2, +726 / −10):**
  - `NI/notification-item.component.ts` (+237 / −10):
    - new state: `drawerOpen`, `drawerMode`, `drawerFocusAlign`, `isPending`, `isTocMappingTouched()`, private `tocHydrated`;
    - new methods: `openDrawer`, `closeDrawer`, `onDrawerAccept`, `clearTocMapping`, `onDrawerResult`;
    - new builders: `drawerHeader`, `drawerReviewTables` (+ private `buildDrawerReviewRow`), `drawerBlockedReason`, `drawerAcceptHelper`;
    - `seedTocInitiative()` extracted from `openTocMappingStep()`;
    - changed: `onTocPlannedResultChange` (hydrates on the first answer), `onAcceptContribution` (bilateral branch → `openDrawer('align')`), `acceptOrReject` (only `closeDrawer()` added, first line of `finalize`).
  - `NI/notification-item.component.spec.ts` (+473 / −10): new `describe('CRD — drawer logic')` with one case per falsifier. The L512 test and the NOTIF-T-7 L854 test were updated to the drawer expectation.
- **Verification:**
  - Red: with the `.ts` stashed, `npx jest --testPathPattern="notification-item.component.spec"` → 30 failed / 70 passed.
  - Green: 3 suites / 100 tests passed.
  - Scope command `notification-item|contribution-request-drawer` → 5 suites / 112 passed.
  - `npx ng lint --quiet` → All files pass linting.
- **Implementer `Not Done / Assumptions` (verbatim):**
  > - The copy file `contribution-request-drawer.copy.ts` and the `contribution-request-drawer/` component appeared mid-task (parallel worker). I did not edit either; I only added an import to the existing copy file, as the brief's fallback instructions allowed.
  > - Updated one test beyond the literally-named L512 one (see above) — necessary for "the rest of the existing suite stays green," which the task itself required.
  > - `drawerHeader()`'s fixed English ("has asked", "to contribute to result", "Center", "has reported a contribution", "to result") is not in the CRD copy file (design §6.3's i18n inventory doesn't list header-sentence words), so I kept it as local constants mirroring the existing row template's own hardcoded sentence — flagging in case CRD-T-4/T-5 wants it centralized later.
  > - Did not touch `.html`, `.scss`, `.module.ts`, or the `contribution-request-drawer/**` folder, per scope.

  **Leader adjudication:** none of these items is T-3 scope left undone. Items 1, 2 and 4 are disclosures, and the Reviewer accepted item 2. Item 3 is a gap in the spec's copy inventory (design §6.3 against the NFR i18n rule in requirements §7). It is recorded below as a forward pointer. It is not an unfinished T-3 deliverable.
- **Reviewer verdict: `STATUS: PASS`.** The CRD-R-6 decision table, the DD-3 deferred hydration and the DD-6 close-first ordering are all added without touching the P2-3187 payload contract. Each of the seven falsifiers is backed by a real case that would fail if the behaviour broke, and the change stays inside the declared file scope. The DoD holds: the only change in `acceptOrReject` is `closeDrawer()` first in `finalize`, and `buildTocMappingPayload`, `isTocMappingComplete` and `invalidateRequest` are untouched. The Reviewer accepted the extraction of `seedTocInitiative()` and the update to the L854 test.
- **ADVISORY (4R, non-gating):**
  1. RISK (NFR): the `DRAWER_HEADER_COPY` words break the literal NFR i18n rule ("Every new string comes from `src/app/internationalization/`"). This is a spec gap, since design §6.3's inventory leaves them out. Suggested fix: add a `header` block to `CONTRIBUTION_REQUEST_DRAWER_COPY`.
  2. READABILITY: the comment at `.ts` diff L544-546 names a `DRAWER_COPY` constant that does not exist and contradicts the comment at L564-569. The two should be merged.
  3. RELIABILITY: no NI case yet proves that decline Cancel sends nothing (CRD-R-7). Design §10 names it as an NI Jest case.
  4. RELIABILITY: `clearTocMapping()` resets `tocHydrated`, so the next answer hydrates again. It does no harm (the values are the same) but it is not needed. The `setTimeout` remount is not cleared on destroy, which was already true before this task.
  5. RISK (convention): the folder `CLAUDE.md` is now stale. T-5 owns the update. Bundle T-3 to T-5 before committing.
- **Forward pointers (carry into the named briefs):**
  - → **CRD-T-2**: advisory 1 falls inside T-2's ownership of the copy file and the header render (NFR i18n is listed under T-1/T-2). T-2 should add the header sentence words to `CONTRIBUTION_REQUEST_DRAWER_COPY`. T-4 then switches `drawerHeader()` to import them and fixes the stale comment from advisory 2. *Leader note: this was flagged to the user as a spec-inventory gap and needs the user's confirmation before either brief carries it.*
  - → **CRD-T-4**: add the NI case "decline Cancel (`declineCancelled`) sends no PATCH" when wiring `declineConfirmed` / `declineCancelled` (advisory 3; design §10 already names this case). The NOTIF-T-7 L854 test has already been rewritten, so T-4 must not rewrite it again.
  - → **CRD-T-5**: the folder `CLAUDE.md` is stale (advisory 5).
- **Budget note:** this task alone is +726 / −10, against a whole-spec budget of ~ +650 / −260 (tests: +473 against ~ +300 for all tasks). See the budget tripwire block after wave 1.
- **Decisions:** skills as listed in the task, with no deviation.

### `CRD-T-1` — Drawer shell on `hlm-sheet` + copy file (spike) — **PASS on attempt 2** (2026-09-25)

| Field | Value |
|---|---|
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Effort | attempt 1 `high` → attempt 2 `xhigh` (one level up after a FAIL) |
| Skills assigned | `angular-developer`, `spartan`, `tailwind-design-system` (as listed in the task), plus the Spartan MCP |
| Wave | wave 1, ran at the same time as `CRD-T-3` |

#### Attempt 1 — FAIL

- **Files changed:**
  - new `contribution-request-drawer.copy.ts` (46)
  - new `CRD/contribution-request-drawer.component.{ts,html,scss,spec.ts}` (34 / 20 / 3 / 141)
  - `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (+~90, additive; this file is not in the task list)
  - `design.md` §1A (P-3, P-4, P-9)
- **Verification (Implementer):**
  - `npx jest --testPathPattern="contribution-request-drawer"`: red before (NG0311), 7/7 green after.
  - `npx ng lint --quiet`: clean.
  - `.html` grep: no hex, no quoted English.
  - Mock regression over 8 spartan-consuming specs: 348 tests green.
  - The Disqualifier did not fire.
- **Implementer `Not Done / Assumptions` (verbatim):**
  > - Header only shows a static title (`copy.title`) plus a `<ng-content select="[crdDescription]">` slot for the sentence — design's `headerParts` input is explicitly T-2 scope; judgment call to leave the sentence as a projection placeholder rather than invent an untested input now. T-2 may replace this with a bound `headerParts` input instead — non-breaking either way, flagging for the Leader/T-2 implementer to confirm.
  > - `hlm-sheet-content`'s own `data-state` attribute always reads `'closed'` under Jest (shared generic `injectExposesStateProvider` stub, out of this task's one-file scope, cosmetic only — not asserted by any test here).
  > - CRD-P-5 untouched (Align section doesn't exist until T-2/T-3, ledger left `assumed`, note updated to say why).
- **Reviewer verdict: `STATUS: FAIL`** (verbatim):
  > 1. **Discovered Issue:** The design §1A ledger overstates two premises. CRD-P-3 and CRD-P-4 both read `verified`, and their "If false" column was changed to "n/a — confirmed working". The properties the spec actually made falsifiable were not exercised:
  >    - P-4: the falsifier requires the projected node in a `document.body` portal. The spec only queries `fixture.nativeElement`, and the global brain mock renders the content inline.
  >    - P-3: focus trap and focus restore were not tested. CRD-DD-2's disqualifier names focus restore explicitly.
  >    Reading the real source is useful supporting evidence, but it is not verification. Setting "If false" to n/a also removes the fallback that CRD-T-6 would need if the portal or focus behaviour fails. The ledger also leaves out a real-contract fact found in `spartan-ng-brain-dialog.mjs` L349-378: the real `closed` output also fires on *programmatic* close (`[state]`→closed), asynchronously after the close animation. The mock does neither.
  >    * **Violated Rule:** tasks.md CRD-T-1 Verification (Falsifier "not found in `document.body`"; Disqualifier "projection does not render inside its portal"); design.md §12 CRD-DD-2 Consequences; reviewer contract ("a claim resting on [a harness that cannot evaluate it] ... never a pass").
  >    * **Remediation Suggestion:** Change P-3 and P-4 to `partially verified — jsdom half proven; portal / focus trap+restore assumed, gate = CRD-T-6`. Restore the original If-false fallbacks (hand-rolled shell; DD-1 alt B). Add "portal into document.body" to CRD-T-6's must-check list. In P-3, record the programmatic-close `closed` emission. This fixes the docs only; no code change is needed.
  > 2. **Discovered Issue:** T-1 lists NFR Motion under Implements, but the diff has no reduced-motion handling. `hlm-sheet-content` ships `transition duration-200`, `animate-in/out` and slide classes. The repo has no global reduced-motion reset; the pattern is per-component `motion-reduce:` utilities, as used in the bilateral and my-work-board templates.
  >    * **Violated Rule:** requirements.md §7 NFR "Motion: Respects `prefers-reduced-motion` (hard rule #6)"; design.md §6.3 A11y ("`prefers-reduced-motion` → sheet animation durations to 1ms"); client CLAUDE.md §5 hard rule #6.
  >    * **Remediation Suggestion:** Add `motion-reduce:` overrides to the `hlm-sheet-content` class, and to the overlay if it animates, so durations go to 1ms or animations are off. Record that the visual effect is checked in CRD-T-6, because a class-presence test cannot prove it.
- **Reviewer adjudications:**
  - The mock file is in-scope enabling work, not a scope violation: it is test-only, and the new state gate defaults to closed, so the `hlm-sidebar` consumers are unaffected. The task's "Consumers: none (no shared symbol changed)" is now inaccurate. **Corrected here:** the consumer is `tests/mocks/spartanBrainMock.ts`, the global `@spartan-ng/brain` Jest mock (its `BrnSheet*` stubs were extended).
  - The header placeholder is acceptable for T-1.
  - The DoD greps pass.
  - P-9 `verified` is acceptable.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the real `closed` fires late on a close driven by the parent. So once T-4 wires `(closed)` → `closeDrawer()`, `closeDrawer()` runs a second time after `finalize` / `requestEvent`. Under `track $index` reuse (DD-6) that could wipe state for the next notification. The fix is to make it idempotent or to guard the handler.
  - READABILITY: `copy.closeAriaLabel` is unused. `hlm-sheet-content` hard-codes `<span class="sr-only">Close</span>`. T-2 should use `showCloseButton=false` with its own `hlmSheetClose`.
  - READABILITY: P-9's text says the base classes are "present alongside", but the spec does not assert it. The real base classes are `data-[side=right]:w-3/4 data-[side=right]:sm:max-w-sm`.
  - RISK: in T-2, replace the `[crdDescription]` slot with `headerParts`. Do not keep both.
- **Forward pointers:**
  - → **CRD-T-2**: the header placeholder becomes `headerParts` and the `[crdDescription]` slot is removed. The close aria label comes from copy (`showCloseButton=false` + own `hlmSheetClose`).
  - → **CRD-T-4**: guard `(closed)` → `closeDrawer()` against the late programmatic-close emission (instance reuse under `track $index`).
  - → **CRD-T-6**: portal into `document.body`, focus trap and restore, and the visual effect of reduced motion.

#### Attempt 2 — PASS

- **Files changed:**
  - `design.md` §1A: P-3 and P-4 now read `partially verified — jsdom half proven; portal / focus trap+restore assumed, gate = CRD-T-6`. The If-false fallbacks are restored, and P-3 records the programmatic-close `closed` emission (`spartan-ng-brain-dialog.mjs` L349-378).
  - `tasks.md` CRD-T-6: added one checklist bullet (the projected Align slot renders inside the sheet portal in `document.body`, not inline).
  - `CRD/*.html`: added `motion-reduce:transition-none motion-reduce:animate-none` to `hlm-sheet-content`.
  - `CRD/*.spec.ts`: added a class-presence case for `motion-reduce:`, labelled as not proving the visual effect.
- **Verification:**
  - `npx jest --testPathPattern="contribution-request-drawer" --silent --reporters=summary --no-coverage` → 8/8 green.
  - `npx ng lint --quiet` → clean.
- **Implementer `Not Done / Assumptions` (verbatim):** "none beyond the overlay-class limitation above". The scrim (`hlm-sheet-overlay`, `duration-100`) is rendered by `<hlm-sheet>`'s fixed template with no class passthrough, so this component cannot override it.
- **Reviewer verdict: `STATUS: PASS`.** Both FAIL issues from attempt 1 are fixed. The overlay limitation was checked at the source (`hlm-sheet.ts` has a fixed `<hlm-sheet-overlay />`, and BrnDialog has no backdrop-class input). Fixing it would mean editing the shared `src/app/spartan/` primitive, which is outside T-1's files. What remains is a 100ms opacity fade with no movement, and it is covered by the CRD-T-6 reduced-motion check. **Accepted as a known deviation.**
- **ADVISORY (4R, non-gating):**
  - RISK: CRD-T-6 must check the scrim specifically, not only the panel. If it fails there, the fix is a new task, outside this spec, to add `motion-reduce:` classes to `hlm-sheet-overlay.ts`. That task would touch a shared primitive and also affect the sidebar's mobile sheet.
  - RELIABILITY: whether `motion-reduce:animate-none` wins over `data-open:animate-in` depends on the order Tailwind emits the variants. jsdom cannot check this; confirm it in T-6 with DevTools emulating reduced motion.
- **Forward pointers (added):** → **CRD-T-6**: check the scrim fade under reduced motion, and check variant order with DevTools emulation.

**Requirements covered:** CRD-R-9 (✕, scrim and Escape emit `closed`, tested in jsdom); NFR Layout (the width override class; the real width is checked in T-6), NFR i18n (the copy file), NFR Motion (on the content; the scrim is a known gap handed to T-6). Premises: P-9 is `verified`; P-3 and P-4 are `partially verified`, and the remaining half is checked in CRD-T-6.

**Decisions:**
- The disqualifier did not fire, so the `hlm-sheet` approach holds (CRD-DD-2) and no fallback shell was used.
- The shared test mock `tests/mocks/spartanBrainMock.ts` was extended. It is an enabling edit outside the file list, and the Reviewer accepted it (348-test regression green).
- Effort went up to `xhigh` for attempt 2.

---

## Budget Tripwire — after wave 1 (CRD-T-1 + CRD-T-3)

| Measure | Budget (design §14) | Actual after 2 of 6 tasks |
|---|---|---|
| LOC | ~ +650 / −260 total (prod ~ +300 / −180 · tests ~ +300 / −80 · docs ~ +50) | **~ +1081 / −15** (tracked files +820 / −15, plus 261 new lines in the drawer component and copy file). Tests alone: ~ +720 (NI spec +473, drawer spec 158, mock +~90) |
| Review rounds | ≤ 2 per task | T-3: 1 · T-1: 2 (within budget) |
| Tasks | 6 | 6 (no new tasks) |

**Cause:**
1. Test volume. T-3 wrote one or more cases per falsifier plus builder coverage, which alone is 1.6× the whole-spec test budget.
2. The shared Spartan brain mock needed extending (not foreseen: this is the first declarative Sheet consumer).
3. Deletions have not happened yet. The −260 lands in T-4, when the popups and the inline block are removed.

Production code is roughly on track: NI `.ts` +237, component ~ +80.

**Status:** the Leader stopped and escalated to the user. T-2 does not start until the user decides.

**User decision (2026-09-25):** "continua". Execution continues with the overrun accepted; the working ceiling is ~ +1400 LOC total, mostly tests. The header-sentence copy question was left without an explicit answer, so the Leader applied its stated recommendation: T-2 moves the header words into `CONTRIBUTION_REQUEST_DRAWER_COPY`, and T-4 switches `drawerHeader()` to import them. Both stay inside the files the two tasks already own, and this satisfies NFR i18n.

---

### `CRD-T-2` — Drawer content: header, Result card, "Where it contributes", footer states — **PASS on attempt 2** (2026-09-25)

| Field | Value |
|---|---|
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Effort | attempt 1 `medium` → attempt 2 `high` |
| Skills assigned | `angular-developer`, `spartan`, `tailwind-design-system` (as listed in the task) |
| Forward pointers carried | the `headerParts` input replaces the slot; the close aria label comes from copy; the header block goes into copy; the T-1 motion and width classes stay untouched |

#### Attempt 1 — FAIL

- **Files changed:**
  - `CRD/*.ts`: 207 LOC total.
  - `CRD/*.html`: 165 LOC total.
  - `CRD/*.spec.ts`: 523 LOC total, 24 new cases.
  - `CRD/*.scss`: untouched.
  - `contribution-request-drawer.copy.ts`: new `header` block.
- **Verification:**
  - Jest `contribution-request-drawer`: red 5 of 29, then green 29/29.
  - `npx ng lint --quiet`: clean.
  - `.html` grep for hex and quoted English: none found.
- **Implementer `Not Done / Assumptions` (summary, disclosures):**
  - The shared mock lacks `BrnButton`'s `[attr.disabled]` host binding. Disabled guards were added to the click handlers, and the tests assert the emission count.
  - "from" was kept as a literal connector in the template.
  - The clamp threshold is 180 chars, a heuristic.
  - Scope was respected: no changes to notification-item, the spartan primitives or the mock.
- **Reviewer verdict: `STATUS: FAIL`** (verbatim):
  > 1. **Discovered Issue:** When `blockedReason` is null, the component still renders an empty `<p data-testid="crd-blocked-reason">` (made `sr-only`). The spec test "DISQUALIFIER falsifier: blockedReason = null still renders an empty reason element" then asserts that this element exists (`not.toBeNull()`). The test certifies the falsifier instead of guarding against it. The helper line has the same always-rendered pattern.
  >    * **Violated Rule:** tasks.md CRD-T-2 Falsifier: "`blockedReason = null` still renders an empty reason element". requirements.md CRD-R-8 Blocked: "the footer shows one reason line" only when blocked.
  >    * **Remediation Suggestion:** Wrap the reason `<p>` in `@if (blockedReason())` and the helper `<p>` in `@if (acceptHelper())`, and drop the `sr-only` toggles. `acceptDescribedBy()`/`declineDescribedBy()` already return null in that case, so no dangling id refs. Flip the test to `expect(reason).toBeNull()` and add the same null case for the helper. If an always-present live region is wanted, that is a spec amendment for the Leader, not an implementation choice.
  > 2. **Discovered Issue:** The template hardcodes the English word `from` (html L89: `{{ h.lead }} from <span ...>`). Ruling on the disclosure: "exactly these 5 values" governs the values of the 5 keys. It does not forbid a connector that the R-2 sentence needs. The DoD rule wins.
  >    * **Violated Rule:** tasks.md CRD-T-2 DoD: "Every visible string comes from the copy file". requirements.md D-8: "Hardcoded English".
  >    * **Remediation Suggestion:** Add `header.from: 'from'` (or `connector`) to `CONTRIBUTION_REQUEST_DRAWER_COPY` and render `{{ copy.header.from }}`. The sentence tests import it and stay green.
  > 3. **Discovered Issue:** The clamp and its toggle are driven by different conditions. `line-clamp-3` applies to every value (`!isExpanded`), but "Show more" only appears above 180 chars. A value that wraps past 3 lines but is under 180 chars gets truncated with no toggle, so the text can't be reached. This is likely under 640px (single column, about 45 chars per line) and possible at 720px (value column about 436px, about 62 chars per line, so 3 lines is about 186 chars).
  >    * **Violated Rule:** requirements.md CRD-R-4 Long text: "clamped to 3 lines with an inline 'Show more'". Client CLAUDE.md hard rule #16: "clamped, never broken".
  >    * **Remediation Suggestion:** Minimum fix: apply the clamp only when the toggle exists, i.e. `[class.line-clamp-3]="needsMore(field.value) && !isExpanded(...)"`. Hidden text then always has a toggle. Preferred fix: decide the toggle from measured overflow (`scrollHeight > clientHeight`, checked after render or with a ResizeObserver) so the 180 guess goes away. Either way, record it for T-6 to check at 375px and 720px. The 180 value itself is acceptable as an unspecified heuristic once it can no longer hide text.
- **Reviewer rulings:**
  - Disabled guard plus emission-count falsifier: valid. It proves the behaviour, and the mock gap was confirmed at `spartanBrainMock.ts` L4-6.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: assert `BrnButton.disabled === true` through `DebugElement.injector`. T-6 should check the native `disabled` and `aria-disabled` attributes in a real browser.
  - READABILITY: the tested bilateral sentence reads "Center CIAT from SP06 has reported a contribution SP01 to result 9377", with the responder code in an awkward position. The wording comes from T-3's `drawerHeader()`. Confirm it against the mockup before T-4.
  - READABILITY: under 640px, value cells with rowIndex > 0 get `border-t`, which puts a divider between a label and its own value. Consider `min-[640px]:border-t`. design §6.3 lists `gap-4`, and the diff uses padding only. Check in T-6.
- **Forward pointers:**
  - → **CRD-T-4**: confirm or fix the bilateral header sentence built by `drawerHeader()` against requirement CRD-R-2 "Bilateral sentence" and the mockup.
  - → **CRD-T-6**: native `disabled`/`aria-disabled`, the clamp at 375px and 720px, and the divider under 640px.
- **Leader decision for the rework:** apply the minimum clamp fix (clamp only when the toggle exists). The measured-overflow option is not required. Issues 1 and 2 are applied as the Reviewer remediated them.

#### Attempt 2 — PASS

- **Files changed** (the attempt-1 → attempt-2 delta is 101 diff lines):
  - `CRD/*.html`:
    - `@if` around the reason and helper lines, with `sr-only` removed;
    - `{{ copy.header.from }}` replaces the literal "from";
    - the clamp is bound to `needsMore(...) && !isExpanded(...)`.
  - `CRD/*.spec.ts`:
    - the null reason test flipped to `toBeNull()`;
    - a new null case for the helper;
    - a check that `aria-describedby` is absent when neither line applies;
    - a new parity case for clamp and toggle.
  - `contribution-request-drawer.copy.ts`: added `header.from`.
- **Verification:**
  - Jest `contribution-request-drawer`: 31/31 green.
  - `npx ng lint --quiet`: clean.
  - `.html` grep: no hex, no literal "from", no `sr-only`.
- **Implementer `Not Done / Assumptions`:** none.
- **Reviewer verdict: `STATUS: PASS`.** All three FAIL issues from attempt 1 are fixed, and nothing else changed. The width and motion-reduce classes, the header wiring and the disabled guards are unchanged.
- **ADVISORY (4R, non-gating):** RELIABILITY: text over 3 lines but under 180 chars now shows in full, with no clamp. Nothing is hidden, but CRD-R-4 "Long text" is only partly met for those values. Check it in T-6. A measured-overflow check could follow if needed. This is recorded only and does not become a task.

**Requirements covered:**
- CRD-R-2 (render of both sentence variants, codes in mono);
- CRD-R-3 (`resultActivated` output);
- CRD-R-4 (dash table, several tables, clamp and Show more);
- CRD-R-6 "Incomplete mapping" (helper render);
- CRD-R-7 (the `decide` and `confirm-decline` footers, Cancel emits `declineCancelled`);
- CRD-R-8 Busy and Blocked (render);
- CRD-R-10 (`focusAlign` scroll);
- NFRs: Tokens, a11y (`aria-describedby`, focus rings, close label from copy), i18n (`header` block including `from`).

**Decisions:**
- Disabled state: the component guards its own click handlers, and the tests assert the emission count. This is because the shared mock does not host-bind `disabled`. The Reviewer accepted it.
- The "from" connector is centralised in copy.
- The clamp threshold of 180 chars is a heuristic, and T-6 checks it.

---

## Budget Tripwire #2 — after CRD-T-2

| Measure | Ceiling accepted by the user | Actual after 3 of 6 tasks |
|---|---|---|
| LOC | ~ +1400 | **~ +1790 / −15**: tracked +820 / −15, plus 970 lines in new files. The drawer spec alone is 548 lines |
| Review rounds | ≤ 2 per task | T-1: 2, T-2: 2, T-3: 1. All within budget |

**Cause:** the same as tripwire #1. Test volume is the driver: the drawer spec has 31 cases, one or more per falsifier and per Implements bullet. Production code is ~ +500. T-4 (size L) is still ahead, with its deletions (~ −260) and the rewrite of the P2-3187 block.

**Status:** the Leader stopped and escalated to the user.

**User decision (2026-09-25):** "continua hasta que termines todas las tareas".

---

### `CRD-T-4` — Wire the drawer into the row; delete the popups and the inline block; rewrite coupled tests — **PASS on attempt 2** (2026-09-25)

| Field | Value |
|---|---|
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Effort | attempt 1 `high` → attempt 2 `xhigh` |
| Skills assigned | `angular-developer`, `spartan`, `tailwind-design-system` (as listed in the task) |
| Forward pointers carried | 7 (copy import and comment merge, decline Cancel/Confirm case, do not re-rewrite L854, guard late `closed`, bilateral sentence, finalize cleanup, pending-only interactivity) |

#### Attempt 1 — FAIL

- **Files changed:**
  - NI `.ts` +273/−24, `.html` +68/−182, `.scss` +16/−117, `.module.ts` +16/−4, `.spec.ts` +~750/−24.
  - CRD `.html` +9/−1 (bilateral `@if`), CRD `.ts` +4/−1 (build fix), CRD `.spec.ts` +6/−4.
  - copy +9/−2 (bilateral verb/tail).
- **Removed:** `showConfirmRejectDialog`, `showTocPromptDialog`, `showTocMappingDialog`, `openTocMappingStep()` and `DRAWER_HEADER_COPY`; also the 3 `<app-pr-dialog>`s, the inline `toc_review` block, the dead SCSS, and `PrDialogComponent` from the module.
- **Verification:**
  - Red with T-3's state stashed: 40 failed / 69 passed. Green: 5 suites, 152 tests.
  - Lint clean. `npm run build` OK.
  - `app-pr-dialog` count = 0.
  - Coverage 88 / 90 / 92 / 90.
- **Implementer `Not Done / Assumptions` (summary):**
  - Fixed the pre-existing TS2347 build error in the CRD `.ts` (`querySelector<HTMLElement>` → cast). This is outside the pre-authorised exception.
  - The mock was not touched.
- **Reviewer verdict: `STATUS: FAIL`** (verbatim issues):
  > 1. **Discovered Issue:** Forward pointer 1 is only half done. The comments in `notification-item.component.ts` were not merged, and several now describe behaviour T-4 removed:
  >    - the `DrawerHeaderParts` comment still says "Every fixed English word lives in DRAWER_COPY below so the eventual copy-file swap (CRD-T-4) is a one-line import change", but `DRAWER_COPY` does not exist;
  >    - a separate, loose "CRD-T-1 landed the centralized copy file…" comment sits above `@Component`;
  >    - the `drawerOpen` docstring still says "the three popups above stay in place until CRD-T-4 deletes them";
  >    - the `openDrawer` docstring still says "Nothing here reaches the three popups".
  >    * **Violated Rule:** the Leader's binding forward pointer 1 ("comments are merged"), and the reviewer contract's Stability & Integrity check (no stale or misleading comments).
  >    * **Remediation Suggestion:** Merge the two copy comments into one accurate note next to `drawerHeader()` or the interfaces. Delete the `DRAWER_COPY` sentence. Rewrite the `drawerOpen` and `openDrawer` docstrings as present-tense facts with no popup references. This is comments only.
  > 2. **Discovered Issue:** The projected Clear mapping button (`<button hlmBtn … (click)="clearTocMapping()">`) has no disabled binding. While an accept or decline PATCH is in flight it stays clickable and re-seeds `tocInitiative`.
  >    * **Violated Rule:** `requirements.md` CRD-R-8 "Busy": "both actions **and Clear mapping** are disabled". T-4 wrote this control, and no other task can disable projected content.
  >    * **Remediation Suggestion:** Add `[disabled]="requestingAccept || requestingReject"` to the button. Add one NI spec case: with `requestingAccept = true`, the rendered Clear mapping button is disabled.
- **Reviewer rulings:**
  - Build fix in the CRD `.ts`: **accepted as a scope exception**. It is a type-only cast, it is disclosed, and the DoD requires `npm run build` to pass.
  - Copy rewording: accepted (needed for forward pointer 5).
  - Test rewrites: no named guarantee was weakened, so the DISQUALIFIER did not fire. AC1/AC3/AC4/AC5/AC6, portfolio routing, "never opens share-request modal", "closing records nothing", and the closed-platform and phase blocks (L727/L738) are all still present.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: Enter or Space on the focused result link bubbles to the row's key handlers, so it opens a new tab and the drawer.
  - RELIABILITY: a residual race remains. A late `closed` event can arrive after a quick reopen, within the exit-animation window. Check it in T-6.
  - RISK: `updates.component.spec.ts` imports `NotificationItemModule`, but the task's test pattern does not match it.
  - READABILITY: when the center acronym is missing, the sentence falls back to "Center has reported…".
  - READABILITY: use `relative z-[1]` rather than the inline style; the NO_ERRORS_SCHEMA comment still lists `app-pr-dialog`; typing `ElementRef<HTMLElement>` would remove the cast.
- **Leader adjudication for the rework:**
  - Advisory 1 (keyboard on the result link) falls under CRD-R-1 "BUT a click on the row's result link … must NOT also open the drawer through the row handler". Keyboard activation of a link counts as that click. The row handler is T-4's own deliverable, so this does not widen the task, and it is carried in attempt 2.
  - Advisory 3 (run `updates.component.spec`) is a verification step on T-4's listed consumers, so it is also carried in attempt 2.
  - The other advisories are recorded only.

#### Attempt 2 — PASS

- **Files changed** (NI only; the attempt-1 → attempt-2 delta is 248 diff lines):
  - The comments are merged and no longer stale.
  - Clear mapping has `[disabled]="requestingAccept || requestingReject"` and an `onClearTocMappingActivate()` busy guard.
  - The row's Enter/Space handlers now act only when `target === currentTarget`.
  - The stale `app-pr-dialog` comment is removed from the spec.
  - Two spec cases were added: Clear mapping is disabled while busy (asserted through `BrnButton`, using the real `HlmButtonImports`), and Enter on the result link does not open the drawer.
  - The Clear mapping button got a `data-testid`.
- **Verification:**
  - Red, with the fixes reverted in place: 2 failed / 121 passed.
  - Green: `notification-item|contribution-request-drawer|updates.component`, 6 suites / 155 tests.
  - `npx ng lint --quiet` is clean and `npm run build` passes.
  - The `app-pr-dialog` count in the NI `.html` is 0.
  - Coverage on the touched files: 93.4 / 89.1 / 92.5 / 95.9, above the 50/60/60/60 gate.
- **Implementer `Not Done / Assumptions`:** `HlmButtonImports` was added to the spec TestBed (test-only), and a `data-testid` was added. Neither leaves scope undone.
- **Runtime event:** the Implementer's task reported background work still running after hand-back, so the Leader stopped it with `TaskStop`. The tree was verified clean afterwards: the stash list was unchanged, and the CRD folder and mock were unchanged in this attempt.
- **Reviewer verdict: `STATUS: PASS`.** Both FAIL issues from attempt 1 and both Leader additions are closed, and nothing else changed.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the Space-key target guard has no dedicated test case. Check it in T-6.
  - READABILITY: the `onClearTocMappingActivate` docstring describes the Jest stub; one line would do.

**Requirements covered:**
- CRD-R-1: all three scenarios, including the stopPropagation and keyboard guards.
- CRD-R-2: the bilateral sentence.
- CRD-R-5: section visibility, and no section for other kinds.
- CRD-R-7: no dialog, and Cancel/Confirm are wired.
- CRD-R-8: Busy, for Clear mapping.
- CRD-R-10: the wiring.
- CRD-R-11: both clauses.

**Decisions:**
- The build fix in the CRD `.ts` (TS2347) was accepted as a scope exception.
- The copy file's `bilateralVerb`/`bilateralTail` were reworded to "has reported a contribution to" / "for result".
- The late `closed` event is guarded by `onDrawerClosedSignal()`.
- `PrDialogComponent` was dropped from `NotificationItemModule`.

**Forward pointers → CRD-T-6:**
- the Space key on the result link;
- the residual reopen race on `closed`;
- native `disabled`/`aria-disabled`;
- the lead text when the center acronym is missing ("Center has reported…").

## Pivot Record: CRD-T-5

- **Date:** 2026-09-25. **Trigger:** a product-owner decision, not an implementation finding. After CRD-T-4 passed, the user said: *"la verdad es que no me gustaría que se removieran los pop-ups para mantener ese flujo como la gente ya sabe, si entra al drawer pues se seguirá el flujo del drawer, sino pues seguimos con los pop-ups"*. Asked via AskUserQuestion, the user chose: **the row buttons keep the old popups** (Recommended) and **keep the inline ToC block** (Recommended).
- **Task in flight:** CRD-T-5 (docs) was running and was stopped with `TaskStop` before it wrote anything. The tree was checked: no `CLAUDE.md` or `DESIGN-DEVIATIONS.md` edits exist. CRD-T-5 stays `[ ]`, because it never produced output.
- **What is wrong in the approved spec:** CRD-R-10 (row buttons route into the drawer), CRD-R-11 (the popups and the inline block are removed), CRD-DD-7, CRD-DD-9, and the CRD-T-4 deliverable that deleted them.
- **Alternatives considered:**
  - (a) Revert T-4 entirely. Rejected: the row-body entry to the drawer is still wanted.
  - (b) Keep drawer-only. Rejected by the user.
  - (c) **Chosen:** a coexistence flow (CRD-DD-10). Row buttons go to the popups; the row body goes to the drawer; they are never both visible.
- **Revised direction:** new task **CRD-T-7** restores the popups, their signals, `openTocMappingStep()`, the `PrDialogComponent` import, the SCSS and the inline block from `HEAD`. It keeps every drawer-flow piece, and restores the popup-path P2-3187 tests. CRD-T-5 and CRD-T-6 now depend on T-7. Their scopes are amended: the docs describe both flows, and the browser check adds the coexistence items.
- **ADR impact:** none. No TRD ADR is affected; this is a UX flow decision inside one component.
- **Spec amended:**
  - `requirements.md`: pivot banner, §3 In scope, CRD-R-10 and R-11 rewritten, AC-12 and AC-13, §10 index.
  - `design.md`: pivot banner, §2.2 row-buttons flow, §6.2 changed/removed members and row-template paragraph, CRD-DD-7 and DD-9 marked SUPERSEDED, new CRD-DD-10.
  - `tasks.md`: pivot banner, new CRD-T-7, T-5 description and falsifier, T-6 checklist, T-5 and T-6 dependencies, §4 graph.
- **Correction Closure sweep:** grepped `openDrawer('align')`, `openDrawer('confirm-decline')`, "delete(s) the", "removing the three", "no longer render", "Removal of" across the four spec documents.
  - Forward: the residual live claim at `design.md` §6.2 L134 was struck through and superseded. The hits in the T-3 and T-4 task bodies are executed history, covered by the tasks.md banner. `requirements.md` L5 and the DD-9 body are covered by their banners.
  - Backward: the §5 coverage table in tasks.md still maps R-10 and R-11 to T-4. It is read with T-7 as the new owner; there is no further edit.
- **Status:** CRD-T-7 is `[ ]`. Execution is **paused for the user's approval of the pivot**.
- **Approval:** the user wrote "apruebo" (2026-09-25). Execution resumes with CRD-T-7, and the earlier "continue until done" mode applies again.

### `CRD-T-7` — Pivot: restore the row popups and the inline ToC block (drawer and popups coexist) — **PASS on attempt 1** (2026-09-25)

| Field | Value |
|---|---|
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Effort | `high` |
| Skills assigned | `angular-developer`, `tdd` |
| Review input | NI folder diffed against **HEAD** (`t7-ni-vs-head.diff`, 1655 lines). The Reviewer looked specifically for any drift in the restored popup areas |

**Requirements covered:** CRD-R-10 (amended), CRD-R-11 (amended), CRD-R-4 (the inline block is kept), with CRD-R-1 unchanged.

#### Attempt 1 — PASS

- **Files changed** (delta from the T-4 state):
  - NI `.ts` +33
  - `.html` +195
  - `.scss` +110
  - `.module.ts` +4
  - `.spec.ts` +90 net
  - Against HEAD, the NI folder is now +1321 / −44.
- **Restored from HEAD:**
  - the 3 `<app-pr-dialog>` elements and their signals;
  - `openTocMappingStep()`, which now uses `seedTocInitiative()` and hydrates on open;
  - `PrDialogComponent`, the SCSS, and the inline `toc_review` block;
  - `onAcceptContribution()`, whose bilateral branch opens the prompt again;
  - row Decline, which opens the reject dialog again.
- **Changed for coexistence:**
  - `openDrawer()` clears all three dialog signals.
  - `finalize` runs `closeDrawer()` and then the HEAD resets.
- **Verification:**
  - Red, against the T-4 state: 50 failed / 71 passed.
  - Green: 6 suites / 158 tests (`notification-item|contribution-request-drawer|updates.component`).
  - Lint clean; `npm run build` OK.
  - Coverage on the NI `.ts`: 92.6 / 89.6 / 90.2 / 95.3.
  - `toc_review` is present.
- **Implementer `Not Done / Assumptions`:** `grep -c app-pr-dialog` returns 6, not 3, because the opening and closing tags sit on separate lines. The DebugElement count is asserted at 3. The Reviewer ruled the DoD met in substance.
- **Reviewer verdict: `STATUS: PASS`.** All six gate checks and every T-7 falsifier are met. The four protected members do not appear in the diff at all. The HEAD popup tests show no removed lines, and the L512 and L854 tests are back at their HEAD expectations, each with a stricter `drawerOpen()` false check. The Disqualifier was not triggered.
- **ADVISORY (4R, non-gating):**
  - READABILITY: stale code comments still say the popups were removed. They sit in the P2-3187 block of the `.ts`, the drawer-state block ("row's single overlay…", "row Accept on a bilateral request, CRD-R-10"), the `.html` comment above the drawer, and the spec describe title "CRD-T-4 — row interactivity & popup removal". CRD-T-5's grep covers only the folder guides.
  - READABILITY: `design.md` §6.2 L135 says finalize "drops the three dialog `set(false)` calls". **The Leader fixed this spec text** and marked it superseded.
  - RELIABILITY: the "nothing reachable from the drawer sets a dialog signal" test calls `drawerMode.set` directly. It does not emit the drawer outputs.
  - RISK: `closeDrawer()` in `finalize` also nulls `tocInitiative` after a PATCH from the popup path. This is harmless because a refetch follows, but it is a small change from HEAD. Watch it in T-6.
  - READABILITY: the `'align'` entry and `drawerFocusAlign` are now reached only from specs. They are dormant.
- **Leader note:** the stale-comment advisory is recorded and is not turned into scope, per the rule that advisories never become tasks. It is surfaced to the user in the final summary as a recommended quick follow-up.

### `CRD-T-5` — Docs: folder guides and design deviation — *in progress*

| Field | Value |
|---|---|
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Effort | attempt 1 `medium` → attempt 2 `high` |
| Skills assigned | `cognitive-doc-design` |

#### Attempt 1 — FAIL

- **Files changed:**
  - `NI/CLAUDE.md`: rewritten, 140 lines.
  - `CRD/CLAUDE.md`: new, 73 lines.
  - `DESIGN-DEVIATIONS.md`: new §17, §18 and §19.
  - `src/CLAUDE.md` §3.3: one pointer line.
- **Reviewer verdict: `STATUS: FAIL`.** Summary of the 5 issues (full text in the Reviewer report):
  1. `NI/CLAUDE.md` is 140 lines, above the 120 hard cap in COMPONENT-DOCS §4. It also has a duplicate `Verified:` stamp at L3.
  2. False claim: "the popup path never touches `drawerOpen`/`drawerMode`". In fact the `finalize` → `closeDrawer()` call resets both.
  3. Stale claim: `requestEvent` "destroys this instance". It contradicts DD-6, where the instance is reused.
  4. The `CRD/CLAUDE.md` width rationale is false:
     - Helm `hlm()` does run `twMerge`.
     - The base classes are `data-[side=right]:w-3/4 data-[side=right]:sm:max-w-sm`.
     - The override needs `!` because of variant specificity, not because the classes are concatenated.
  5. "both spinner icons" should be three, and the clamp is a `[class.line-clamp-3]` binding, not `@if`.
- **Reviewer passed:**
  - `finalize` order, `onDrawerClosedSignal`, hydration timing, key guards, the 13 inputs and 6 outputs, the scrim gap;
  - DESIGN-DEVIATIONS §17–§19;
  - the `src/CLAUDE.md` pointer;
  - L132 is correctly placed under History.
- **ADVISORY:**
  - The stale "removed" code comments in NI `.ts` L82-98 and `.html` L448-451. This repeats the T-7 advisory.
  - The popup path hydrates twice, because `openTocMappingStep` does not set `tocHydrated`. This is harmless.
  - The stamps lack the short sha from COMPONENT-DOCS §5.
- **Leader correction to the spec (spec-doc error surfaced by issue 4):**
  - design.md §1A **CRD-P-9** says Helm classes "are concatenated, not merged". That rationale is wrong; the conclusion (the `!` override is needed) still holds. The Leader amended the P-9 row.
  - `onecgiar-pr-client/src/CLAUDE.md` §21.7, which P-9 cites, may carry the same wrong claim. It is a shared guide outside this spec's deliverables, so it is recorded as **pending for `/akili-archive`** and not edited here.

#### Attempt 2 — FAIL (CRD-T-5)

- **Changes made:**
  - `NI/CLAUDE.md` cut to 115 lines, with one `Verified:` stamp on the last line.
  - Issues 2–5 from attempt 1 reworded.
  - Short sha `485847996` added to both stamps.
  - A double-hydration line added.
  - `CRD/CLAUDE.md` is 76 lines.
- **Reviewer verdict: `STATUS: FAIL`** (two issues, summarised):
  1. The reworded late-`closed` line in `NI/CLAUDE.md` claims the guard stops a late event from re-closing a drawer that has been reassigned. The code does not do that. `onDrawerClosedSignal()` returns early only when `drawerOpen()` is already false, so a reopened drawer *is* closed by a late event. Remediation: describe only what the guard does, or list the reopen race as a known gap.
  2. In `CRD/CLAUDE.md`, "The override here matches the variant" is wrong. The override has no `data-[side=right]:` variant; it wins through `!important`. Remediation: "beats it with `!important`".
- **Reviewer confirmed fixed:**
  - the line counts and the single stamp;
  - the mutual-exclusion wording;
  - "may rebind";
  - the double-hydration claim;
  - the three spinners;
  - the `[class.line-clamp-3]` binding;
  - `PATCH_updateRequest(body, isP25Request)`;
  - the sha stamps.
- **ADVISORY:** re-stamp the sha in the commit that ships the code, because the documented code is not committed yet.
- **Attempt 3 effort:** `xhigh`.

#### Attempt 3 — PASS (CRD-T-5 final status: **PASS on attempt 3**, 2026-09-25)

- **Changes:**
  - NI L126-129: the late-`closed` line now states only what the guard does, and adds a known-gap sentence about the reopen race, to be checked in T-6.
  - CRD L315: "beats it with `!important`".
- **Verification:**
  - NI is 116 lines and CRD is 76 lines.
  - Each file has one `Verified:` line, and it is the last line.
  - `DESIGN-DEVIATIONS.md` names CRD-DD-3, DD-5 and DD-10.
- **Reviewer verdict: `STATUS: PASS`.** Both FAIL issues from attempt 2 are fixed, and the fixes match the code. The "tie" at L314 sits inside a negation.
- **ADVISORY:** re-stamp the sha in the commit that ships the code.
- **Requirements covered:** the consequences of CRD-DD-3, DD-5 and DD-10, and the client folder-doc convention.
- **Budget note:** this task needed 3 review rounds, against a budget of ≤ 2. It is recorded but not escalated, because the user lifted budget stops. The cause both times was docs over-claiming what the code does.

### `CRD-T-6` — Real-browser verification (visual and focus) — *blocked (environment)*, 2026-09-25

- **Assumption to test:** "T-6 cannot run without a connected browser and a signed-in session."
- **Probes run:**
  1. `curl localhost:4200` returned 200. A dev server is listening on `[::1]:4200` (PID 52380), and it is not owned by this session. Port 4500 is free.
  2. `tabs_context_mcp` returned "Browser extension is not connected".
- **Result:**
  - The browser automation route is **unavailable** in this session.
  - The served bundle on :4200 cannot be confirmed fresh without a browser. Under the task's disqualifier, screenshots from it would not count as evidence anyway.
  - No decision was made on real data.
- **Options offered to the user:**
  - (a) Connect the Claude Chrome extension and sign in as admin. The Leader then starts its own server on :4500 and runs the checklist without deciding any request.
  - (b) Run T-6 manually at the `/akili-validate` HITL pause.
  - (c) A throwaway harness page that renders the drawer with plain props (no login). It covers width, sticky regions, clamp, the portal and focus, but not the real ToC widget or the popup coexistence.
- **Status:** `[~]` blocked, waiting for the user's choice.
- **Resolution (2026-09-25): PASS by user HITL.** The user tested the feature manually in the browser and approved it: "ya he probado y funciona bien todo por ahora … apruebo las pruebas". Recorded as a manual T6 visual review done by the product owner. **No agent screenshots were captured**, so `evidence/` is empty. The individual checklist items were not recorded one by one. The Leader-flagged items still worth a deliberate look are listed below. They are not verified by agent evidence:
  - scrim fade under reduced motion;
  - Space key on the result link;
  - reopen within the exit-animation window;
  - lead text with no center acronym;
  - Clear mapping `disabled` in the real DOM.

---

## Summary

- **Tasks:** 7 of 7 closed.
  - T-1: PASS in 2 attempts.
  - T-2: PASS in 2 attempts.
  - T-3: PASS in 1 attempt.
  - T-4: PASS in 2 attempts.
  - T-7 (pivot): PASS in 1 attempt.
  - T-5: PASS in 3 attempts.
  - T-6: PASS by user HITL.
- **Pivot:** 1, CRD-DD-10. The popups and the inline block were kept alongside the drawer.
- **Size:** ~ +1561 / −149 in tracked files, plus the new drawer folder and copy file. The budget was exceeded, and the user explicitly lifted it.
- **Final verification:** `notification-item|contribution-request-drawer|updates.component` passes, 6 suites and 158 tests. `ng lint` is clean and `npm run build` passes.

## Pending for `/akili-archive`

- `onecgiar-pr-client/src/CLAUDE.md` §21.7 may claim that Helm classes are "concatenated, not merged". That is wrong: `hlm()` runs twMerge (see the CRD-P-9 correction). It is a shared guide outside this spec's deliverables.
- The CodeGraph re-index is pending (`.codegraph/` is absent).
- The stale "removed" code comments in NI `.ts` L82-98, NI `.html` L448-451 and the spec describe title are from the T-7 and T-5 advisories. They were surfaced to the user as a recommended quick follow-up.

## Constitution Impact: CRD-T-4

- **Module reshaped:** `NotificationItemModule` now imports the standalone `ContributionRequestDrawerComponent`. It also dropped `PrDialogComponent`, but CRD-T-7 restores that import (pivot).
- **New folder:** `components/contribution-request-drawer/` needs its own `CLAUDE.md`, which CRD-T-5 writes. The guide in `notification-item/CLAUDE.md` is stale, and CRD-T-5 updates it.
- **Parent index:** `onecgiar-pr-client/src/CLAUDE.md` §3.3 needs a pointer line for results-notifications, which CRD-T-5 adds.
- **CodeGraph:** re-index pending; `.codegraph/` is absent in this checkout, so this is recommended at `/akili-archive`. The LOC ceiling is lifted for the rest of the spec. Routine PASS gates now auto-continue, which amounts to pre-approved from here on. A HALT, a Pivot or a FATAL_FAIL still stops for the user.
