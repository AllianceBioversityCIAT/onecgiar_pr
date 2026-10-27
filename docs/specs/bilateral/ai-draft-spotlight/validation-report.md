# Validation Report — Bilateral AI Draft Results: Spotlight the Run's Drafts

**Verdict: WARN. The implementation conforms: 0 FAIL, 0 BLOCKED, 3 WARN.**

- **Update 2026-10-27:** ADS-T-3 is closed. The user approved it ("approve ADS-T-3"), and `execution.md:440-460` (`## REVIEW_WAIVED: ADS-T-3` and `### ADS-T-3 — closure`) records the approval, with `tasks.md:237` set to `[x]`. The auditor checked both blocks at the source (§3). The earlier BLOCKED result is withdrawn.
- Every requirement, scenario and `BUT` / `AND IT MUST` clause has code evidence and test or HITL evidence, with one exception. The AC-7a clause "no horizontal page scroll" is unmet at 375 px because of a horizontal scroll that already existed (WARN-1).
- The other two WARNs are drift in the spec's own documents, not in the code.
- **Not ready to archive yet:** 3 required remediation items remain (R-2..R-4 in §11). All three are document edits or a ticket, not code changes.

| Result | Count |
|---|---|
| PASS | 13 |
| WARN | 3 |
| FAIL | 0 |
| BLOCKED | 0 |

---

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/ai-draft-spotlight/` (P2-4029) |
| Branch / HEAD | `qa-development-2026-mc-2` at `ce95635f2` (clean tree) |
| Range audited | `edcf190f0..ce95635f2`: `ff4a2d63e` (T-1), `a7cc290f5` (T-2), `74b26abce` (HITL docs and pivot), `ce95635f2` (T-4) |
| Date | 2026-10-27 |
| Auditor | Claude Code, `opus` (T3), independent. The Implementers were `sonnet`, so author ≠ auditor holds. The auditor did not write or supervise this code |
| Inputs | `proposal.md`, `requirements.md`, `design.md` (rev. 4), `tasks.md`, `execution.md`, `judgment.md`, `hitl/*.png`, the git diff, and `node_modules/driver.js/dist/driver.js.mjs` (1.8.0) |
| Baseline consulted | `CLAUDE.md` / `AGENTS.md`, `docs/ux-ui/design.md` §10, `docs/trd/trd.md` (`bilateral` row, `:192`), `onecgiar-pr-client/CLAUDE.md` |
| Not present | `test-report.md` (`/akili-test` has not run), so coverage was verified directly (§9) |
| Auditor's own runs | Read-only `git` / `grep`, plus one targeted Jest run of the 5 changed spec files: **5 suites, 249 tests passed**. No build, browser or server was run; the build figures in §5 come from the Leader's run |

## 2. Summary

| # | Area | Result | Note |
|---|---|---|---|
| 1 | Task completion: T-1, T-2 and T-4 closing records | PASS | Each has execution notes, first reds, falsifiers, a Leader evidence re-run (VERIFIED) and a Reviewer PASS |
| 2 | Task completion: ADS-T-3 HITL approval | PASS | User approved on 2026-10-27; `REVIEW_WAIVED` (inline) and the closure are recorded (`execution.md:440-460`). Was BLOCKED in the first issue of this report |
| 3 | Task tracking hygiene | **WARN-2** | Done-criteria boxes unticked (including ADS-T-3's, `tasks.md:272-273`); stale status lines |
| 4 | File existence | PASS | Every planned file changed, and nothing unplanned |
| 5 | Build integrity | PASS | Full Jest, `tsc`, lint and dev build all exit 0 |
| 6 | Requirement coverage (R-1..R-8, 19 scenarios, every clause) | PASS | Except row 7 |
| 7 | ADS-AC-7a "no horizontal page scroll" at 375 px | **WARN-1** | The scroll already existed (HITL-O1); the spotlight does not add it |
| 8 | NFR-1..NFR-6 | PASS | — |
| 9 | Negative constraints (every `BUT` / `MUST NOT`) | PASS | — |
| 10 | Security (DD-7 XSS, `.cursorrules`) | PASS | — |
| 11 | Code quality (4R) | PASS | Advisory only, 19 notes |
| 12 | Design conformance (DD-1..DD-11, §2.2, §6.2–6.4, §7) | PASS | — |
| 13 | Cross-document figures and open gaps | **WARN-3** | `UNVERIFIED` markers and open gaps already settled; one review-round miscount |
| 14 | Agent guides / Constitution Impact | PASS | — |
| 15 | Proposal alignment (intent, non-goals) | PASS | — |
| 16 | HITL evidence adequacy (simulated job completion) | PASS | Justified in §6.3 |

---

## 3. Task Completion

| Task | Status | Execution notes | Verification evidence | Closing record | Result |
|---|---|---|---|---|---|
| `ADS-T-1` service request and URL rule | `[x]` | `execution.md:20-104` | First reds quoted (`:39-50`); falsifiers F1–F5 (`:51-56`); Leader re-run VERIFIED (`:57-61`) | Reviewer PASS (`:62-68`) | PASS |
| `ADS-T-2` `DraftSpotlightService` and page | `[x]` | `execution.md:107-247` | First reds (`:128-134`); 10 falsifiers (`:137-148`); re-run VERIFIED, no existing expectation edited (`:150-154`) | Lens A PASS and lens B PASS (`:155-171`) | PASS |
| `ADS-T-3` HITL | `[x]` (`tasks.md:237`) | `execution.md:250-311` (first run) and `:421-438` (re-run) | H-1..H-10 PASS at both widths except H-6 at 375 (`:281-292`). After T-4, H-6 (both scroll directions) and W-1 PASS at 375 and 1280 (`:428-433`). Screenshots: 34 PNGs in `hitl/` | User HITL approval, 2026-10-27 ("approve ADS-T-3"). `## REVIEW_WAIVED: ADS-T-3` (`execution.md:440-448`) and `### ADS-T-3 — closure` (`:450-460`). Checked at the source: (1) The waiver cause honestly states that the `skip-eligible` claim was not earned (`hitl/` screenshots) and names what stood in for the missing Reviewer. (2) Its description of this audit is accurate: simulated poll judged adequate (§6.3), O1 raised as WARN-1. (3) The carried open items, O1 → WARN-1 and O2 `UNVERIFIED`, match §6.1 and R-4. For a no-code HITL task, the human approval is the gate, so a waived Reviewer is not a finding | PASS |
| `ADS-T-4` pivot fixes | `[x]` | `execution.md:344-419` | First reds (`:362-366`); 5 falsifiers (`:369-375`); re-run VERIFIED (`:378-382`); DD-10 element settled at source (`:377`) | Reviewer PASS (`:383-389`) | PASS |
| Done-criteria checklists | `[ ]` everywhere | `tasks.md:96-100`, `:229-233`, `:272-273`, `:327-331` | The evidence exists in `execution.md`, but no box is ticked, including on the three `[x]` tasks | — | **WARN-2** |

The ADS-T-3 review-intensity claim "no file changes outside `execution.md`" was not met as written: screenshots were added under `hitl/`. The Leader disclosed this (`execution.md:309-311`). They are evidence files, not code, so it is not a finding.

## 4. File Existence

`git diff --stat edcf190f0..HEAD`: 55 files. The client part is +1 332 / −62 lines (production 370, tests 911, folder guides 51).

| File (`onecgiar-pr-client/src/app/…`) | Planned by | Changed |
|---|---|---|
| `pages/bilateral/services/bilateral-ai.service.ts` (+ spec) | T-1 | Yes |
| `pages/bilateral/components/ai-processes-drawer/ai-processes-drawer-host.component.ts` (+ spec) | T-1 | Yes |
| `pages/bilateral/components/ai-processes-drawer/CLAUDE.md` | T-1 continuation (client `CLAUDE.md` §10) | Yes |
| `pages/bilateral/services/draft-spotlight.service.ts` (+ spec), new | T-2, T-4 | Yes |
| `pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,html}` (+ spec) | T-2, T-4 | Yes |
| `pages/bilateral/services/bilateral-tour.service.ts` (+ spec) | T-2 | Yes |
| `internationalization/bilateral-ai-processes.copy.ts` | T-2 | Yes |
| `pages/bilateral/pages/my-draft-results/CLAUDE.md` | T-2, T-4 | Yes |
| `docs/specs/bilateral/ai-draft-spotlight/*` and `hitl/*.png` | spec and T-3 | Yes |

No server, migration, DTO or `/api/bilateral/*` file changed, which matches design §3–§5 and proposal §5. `bilateral-result-summaries.en.md` is untouched, and no `window.__ai`-style debug hook is in the source (`grep -rn "__ai" src` → 0 hits).

## 5. Build Integrity

These commands were run by the Leader on 2026-10-27 at HEAD `ce95635f2`, and are copied here as evidence. The auditor re-ran only the targeted Jest command in the last row.

| Command (from `onecgiar-pr-client/`) | Result |
|---|---|
| `npx jest --silent --reporters=summary --no-coverage` (full client) | 677 suites and 14 584 tests passed, exit 0 |
| Coverage, restricted to the 5 changed production files | Lines 94.5 % (791/837) · Functions 88.18 % (194/220) |
| `npx tsc -p tsconfig.app.json --noEmit` | exit 0 |
| `npx ng lint --quiet` | exit 0 |
| `npx ng build --configuration development` | exit 0 |
| Local stack for HITL | Server `:3400` (`GET /api` → 200); Leader's client `:4500`, bundle freshness confirmed (`execution.md:262`, `:425`) |
| Auditor: `npx jest <5 changed spec files> --silent --reporters=summary --no-coverage` | **5 suites, 249 tests passed** |

---

## 6. Requirement Coverage

The code paths in this section are relative to `onecgiar-pr-client/src/app/pages/bilateral/`. Abbreviations:
- **SVC** = `services/bilateral-ai.service.ts`
- **HOST** = `components/ai-processes-drawer/ai-processes-drawer-host.component.ts`
- **DSS** = `services/draft-spotlight.service.ts`
- **MDR** = `pages/my-draft-results/my-draft-results.component.ts`
- **TOUR** = `services/bilateral-tour.service.ts`

Test numbers refer to the `it()` names in each spec file.

### 6.1 Functional requirements, at scenario and clause level

| Clause (quoted) | Task | Code evidence | Test / HITL evidence | Result |
|---|---|---|---|---|
| **AC-1a** "the page scrolls to J's group and the spotlight starts on it" | T-1, T-2 | SVC `:509-520` (`?job=`, request); MDR `:271` and `:305` (settle), `:431-445` (show) | SVC spec 1; MDR spec 7; **HITL H-1** PASS (879 ms / 842 ms) | PASS |
| AC-1a BUT "must NOT require a reload or a second click" | T-1 | SVC `:516` (same-URL skip keeps the request) | SVC spec 2; H-1 (already on Draft Results) | PASS |
| **AC-1b** "land on Draft Results of J's center with J targeted, and the spotlight starts once J's group is rendered" | T-1, T-2 | SVC `:509-520`; MDR gates `:383-386` | SVC spec 1; MDR spec 9 and 10b; **H-2** PASS from `/bilateral/CIP/overview` | PASS |
| **AC-1c** "the scroll and the spotlight run again" | T-1, T-2 | MDR `:406-418` (re-arm via `highlightRearmSeq`) | MDR spec 8 (`draftList` untouched, 2 more scroll passes, second `show`); **H-3** same-URL re-click | PASS |
| AC-1c AND IT MUST "NOT be ignored because the URL already names J" | T-1, T-2 | SVC `:516`, HOST `:113`; MDR `:271` | SVC spec 2; HOST spec "on the target URL does not navigate and keeps the request"; MDR spec 8 | PASS |
| **AC-1d** "the drawer closes and the spotlight starts on J's group" | T-1, T-2 | HOST `:104-117` | HOST spec "requests a spotlight … before closing the drawer and navigating"; **H-3** drawer (SO, center switch) | PASS |
| **AC-2a** "every element except J's group is under the overlay … J's group (header and all its draft rows) is lit" | T-2 | DSS `:72-81` (`element: card`, the whole `#mdr-session-<id>`) | MDR spec 7 (`show` on the session card); **H-1** pixel samples (`execution.md:276`) | PASS |
| AC-2a "popover … title naming the run … body stating N and what to do next" | T-2 | copy `bilateral-ai-processes.copy.ts:73-78`; MDR `:436-442` | MDR spec 7 (title holds N and label); H-1 title "2 new drafts from P-1502-…" | PASS |
| AC-2a "a **Got it** button" | T-2 | DSS `:77-79` (`showButtons: ['next']` in the step popover, P-17) | DSS spec 1; **H-4** (only visible button, focused) | PASS |
| AC-2a BUT "the drafts of any other job MUST NOT be lit" | T-2 | DSS `:73`: one element, J's card | MDR spec 7; H-1 `lit = mdr-session-4e0beadc…` only | PASS |
| **AC-2b** "starts only after the scroll to J's group has settled" | T-2 | MDR `:305` (settled only while still the URL job), `:420-421` | MDR spec 7, 9 and 11 | PASS |
| AC-2b AND IT MUST "NOT show a lit cut-out that is offset" | T-2 | DSS `:84-87` (container listener → `refresh`, DD-9) | DSS spec 5; **H-7**: hole = card − 6 px (`stagePadding`) after container scroll and resize | PASS |
| **AC-2c** "the group's header is on screen and the popover is visible without scrolling" | T-4 | DSS `:53-55` (scroll-margin-top = `.app-shell-header` bottom + 8, before `highlight()`), `:100` (restore), `:108-112` | DSS spec T4-2, T4-3, T4-3b; **H-6 re-run** down and up at 375 and 1280 (`execution.md:430-432`); screenshot `H-6-rerun-down-375.png` shows the header below the app chrome and the popover in view | PASS |
| **AC-3a** "clicks Got it, OR presses Esc, OR clicks the dimmed area → the overlay and popover are removed" | T-2 | DSS `:66`, `:79`, `:92-105` | DSS spec 2 and 2b; **H-4** (Esc), **H-5** (overlay), H-1/H-3 (Got it) | PASS |
| AC-3a "keyboard focus moves to J's group" | T-2 | MDR `:443`; template `tabindex="-1"` | MDR spec 18; H-4 and H-5 (focus on `mdr-session-4e0beadc…`) | PASS |
| AC-3a "J's ring and 'New' badge remain as before" | T-2 | By construction: no close path writes `highlightedSessionId` or `freshDraftJobIds` | No explicit post-dismiss assertion. Indirect: the existing ring/ADN suites are unchanged and green, and `H-4-after-esc-1280.png` shows the ring still on the card. The New badge was not exercised in the HITL (simulated completion) | PASS (see advisory N-2) |
| AC-3a BUT "MUST NOT keep a scroll lock, a leftover overlay, or an inert region" | T-2 | DSS `:103` (`destroy()`) | DSS spec 2 and 3; **H-5**: `body.className === ""`, no `driver-active` / `driver-no-scroll`; H-4: classes cleared | PASS |
| **AC-3b** "the spotlight is removed and nothing of it remains on the next page" | T-2 | MDR `:1029` (`ngOnDestroy`), `:334` (center change) | MDR spec 17 ("ngOnDestroy closes the spotlight", "a center change closes …"). Unit-only: the overlay blocks in-page navigation, so the HITL did not exercise it | PASS |
| **AC-4a** "the group is scrolled to and ringed as today" | T-2 | URL path unchanged apart from additive reads | MDR spec 12; existing `?job=` suite unchanged; **H-9** ring present | PASS |
| AC-4a BUT "the spotlight MUST NOT appear" (reload or new tab) | T-2 | MDR `:377-380`: no request → return; the URL never creates one | MDR spec 12; **H-9** PASS at both widths | PASS |
| **AC-4b** "the request is dropped" | T-1 | SVC `:48`, `:157-176` (10 s timer, nonce-matched consume) | SVC spec 4, 5 and 6; MDR spec 14 | PASS |
| AC-4b AND IT MUST "NOT fire later on an unrelated visit" | T-1, T-2 | SVC timer; MDR center gate `:383-384` | SVC spec 5 (newer request survives the old timer); MDR spec 14 and 15 | PASS |
| **AC-5a** "the filters are cleared, J's group appears, and the spotlight starts" | T-2 | MDR `:388-404` (cancel debounce, `clearFilters()` once per nonce). `clearAll()` resets every filter dimension that exists (projects, search, created-by; `my-draft-results-filter.service.ts:203-207`). The page has no status filter | MDR spec 13 and 13b; **H-10** (search filter) PASS | PASS |
| **AC-5b** "no overlay appears and no error is shown … the page behaves as today" | T-2 | MDR `:398-403` (absent → wait, the timer drops it), `:432-433` (`!card` → return) | MDR spec 14 | PASS |
| **AC-6a** "the spotlight waits until that layer is closed, or is dropped" | T-2 | MDR `:423-430` (layer wait, tour poll 1 s), timer drop | MDR spec 16 (each layer, and the tour poll) | PASS |
| AC-6a BUT "two dimming layers MUST NOT be shown at the same time" | T-2, T-4 | Start guard MDR `:423-430`; reverse tour guard TOUR `:67`; **DD-11** effect MDR `:348-360` | TOUR spec "does not create a driver instance while the draft spotlight is active"; MDR spec 21 (4 layers × close / no-close); **W-1** PASS at 375 and 1280 (after a first-run FAIL that was fixed) | PASS |
| **AC-6b** "the spotlight closes first and the action proceeds normally" | T-2 | MDR `:973`, `:982`, `:1003` | MDR spec 17; **H-8** (Review panel opens with focus inside it) | PASS |
| **AC-7a** "the lit area matches J's group bounds and the popover sits fully inside the viewport" | T-2, T-4 | DSS as above | **H-1**, **H-6 re-run** at 375 and 1280 | PASS |
| AC-7a "… with no horizontal page scroll" | — | Nothing in this diff adds width: the overlay is `position: fixed`, and the template change is only `tabindex` / `outline-none` | **HITL-O1**: `hscroll: true` at 375 px with and without the spotlight, and on a plain reload (`execution.md:306`). Not compared at `edcf190f0` | **WARN-1** |
| **AC-7b** "the lit area follows the group" | T-2 | DSS `:84-87`, `:114-116`; MDR `:339-346` (`refresh` on a `sessionGroups()` change) | DSS spec 5 and 5b; MDR spec 19; **H-7** resize at both widths | PASS |
| **R-8** "SHALL NOT create, update or delete … SHALL NOT change any draft status" | T-1, T-2 | No write call in the diff | SVC spec 7; MDR spec 20 | PASS |

**AC-7a judgment (WARN-1, not FAIL and not PASS).** The clause is a `THEN` of the spotlight scenario, and at 375 px it is literally false. The Leader observed the horizontal scroll with the spotlight closed and on a plain reload, and this diff adds no width. So the defect is not caused by this spec, and the spotlight's own geometry (cut-out and popover in the viewport) passes.
- It is not PASS, because a reviewer reading AC-7a would see it unmet at 375.
- It is not FAIL, because the remedy lies outside this spec's scope and its approved files.
- **Follow-up owed:** a separate ticket for the 375 px horizontal scroll on Draft Results, and confirmation at `edcf190f0` that O1 already existed there (it is currently asserted, not measured, at baseline). Record the ticket in the archive summary.

### 6.2 Non-functional requirements

| NFR | Evidence | Result |
|---|---|---|
| NFR-1, about 1 s | H-1 879 / 842 ms · H-2 828 / 813 ms · H-3 845 ms · H-10 857 / 854 ms | PASS |
| NFR-2, a11y | Accessible name and description: driver.js 1.8.0 sets `role="dialog"`, `aria-labelledby="driver-popover-title"` and `aria-describedby="driver-popover-description"` on the popover (verified in `dist/driver.js.mjs`). Got it focused on open, Esc closes, focus returns: **H-4** at both widths, MDR spec 18. Focus is not moved on a programmatic close: DSS spec 3 | PASS |
| NFR-3, tour look | DSS `:57-64`: `pr-guide`, `#1e202f`, 0.65, `stagePadding` 6, equal to TOUR `:229-233`. DSS spec 1 and T4-1 | PASS |
| NFR-4, copy | `bilateral-ai-processes.copy.ts:73-78`, American English, matches design §6.3 exactly | PASS |
| NFR-5, no new dependency | `package.json` is not in the diff; `driver.js` was already present | PASS |
| NFR-6, gates | §5: full Jest, lint, `tsc` and build all green; changed-file coverage 94.5 % lines (gate 60 %) | PASS |

### 6.3 Is the simulated job completion adequate evidence for AC-1a and AC-1b?

**Yes.** The HITL called `announceTerminalJob(...)` directly instead of waiting for the external AI service (`execution.md:269`). The poll calls the same function: SVC `:442` → `announceTerminalJobs` `:461` → `announceTerminalJob` `:476`.
- What it bypasses is only the poll diff and the "more than 2 jobs" grouping. Neither is changed by this spec, and both are covered by the existing `AIQ` suites.
- Everything this spec changes was exercised with real UI: the toast's `action.run`, `openDraftsForJob`, the router, the request effect and driver.js.
- Residual gap (advisory): the grouped toast's **View** opens the drawer, not drafts, so it does not spotlight. That is in scope per requirements §3.4 (a toast whose action opens the drawer), and the drawer's "View N drafts" then spotlights (AC-1d).

### 6.4 Negative constraints

Every `BUT` / `MUST NOT` / `AND IT MUST NOT` in §6.1 is implemented and verified: AC-1a, 1c, 2a, 2b, 3a, 4a, 4b and 6a. The AC-6a BUT is the one that failed in the first HITL run (WARN-2 of the T-2 lens B review, which became HITL-F2). It is now closed by DD-11, with unit tests and W-1.

---

## 7. Linting & Code Quality

Lint and `tsc` are clean (§5). Architecture, signals idiom, a11y, responsive behavior and security all PASS:
- **Architecture:** one root wrapper service over driver.js; the existing `?job=` effect stays the only scroller; no new module.
- **Signals:** every effect reads its signals before returning. Writes run inside `untracked`. No effect loop was found (DD-11 closes inside `untracked`; the request effect's writes are idempotent per nonce).
- **Security:** see below.

**XSS (DD-7).** driver.js writes the popover title, description and button text with `innerHTML` (P-11, confirmed in the dist source).
- DSS `:75` escapes the whole title and `:78` escapes the button text. `escapeHtml` (`:19-26`) covers `& < > " '`.
- The description is static copy only (`copy.ts:75`), and the code never passes dynamic data into it (MDR `:441`).
- The label comes from user-entered `projectName`, from `programCode`, or from the job id, and each goes through the title.
- DSS spec 6 and 6b verify it.
- No `console.*`, `localStorage`, `bypassSecurity*` or secret was added.

**PASS.**

### 7.1 4R advisory sweep (advisory; does not affect the verdict)

| ID | 4R | Source | Note | Status |
|---|---|---|---|---|
| T1-a | Readability | T-1 Reviewer | AC-1d "Implements" wording says the drawer closes first; the code requests first. The order is not observable | Carried: fix the wording at archive |
| T1-b | Reliability | T-1 Reviewer | `navigate(...).then` has no rejection handler; the request then lingers until the 10 s expiry | Carried |
| T1-c | Risk | T-1 Reviewer | SVC spec 7 checks writes on the `bilateralApi` stub only, not `ResultsApiService` | Carried: for `/akili-test` |
| T1-d | Readability | T-1 Reviewer | The URL rule is duplicated in SVC and HOST | Carried (justified) |
| T2-A1 | Readability | Lens A | `layerOpen` short-circuits with `\|\|` (MDR `:373-374`), which reads against the "read every signal first" comment. The behavior is correct | Carried |
| T2-A2 | Readability | Lens A | MDR spec 11 deliberately reuses a held request. **Do not "fix" it** | Carried (keep) |
| T2-A3 | Readability | Lens A | The programmatic half of MDR spec 18 is weak (stubbed close); DSS spec 3 is the real proof | Carried |
| T2-A4 | Readability | Lens A | The `my-draft-results/CLAUDE.md` condensation dropped 3 facts (ring token, `PrmsRouteReuseStrategy` scope, `queryParamMap` re-emit) | Carried: restore at archive if space allows |
| T2-A5 | Readability | Lens A | The `escapeHtml` comment says "label and count"; the code escapes the whole title | Carried |
| T2-B1 | Risk | Lens B | The XSS test proves the escaped string, not `querySelector('img') === null` | Carried: for `/akili-test` |
| T2-B2 | Reliability | Lens B | If `driver()` or `highlight()` throws after consume, `driver-active` may stay on `body` | Carried |
| T2-B3 | Resilience | Lens B | R-6 enforced only at show time | **Resolved** by T-4 (DD-11), W-1 PASS |
| T2-B4 | Resilience | Lens B | Esc may also reach a page-level handler | **Resolved**: watched in H-4, not observed |
| T2-B5 | Readability | Lens B | `escapeHtml` could move to `shared/` if reused | Carried |
| T4-a | Reliability | T-4 Reviewer | Header fold state at measure time | **Resolved**: H-6 checked in both scroll directions |
| T4-b | Reliability | T-4 Reviewer | A throw after the margin is set leaves `scrollMarginTop` on the card (`close()` returns early with no instance) | Carried (low; the same fix as T2-B2) |
| T4-c | Readability | T-4 Reviewer | Spec test "21" sits before "20" | Carried |
| N-1 | Reliability | Auditor | `onDismiss` calls `focus()` without `{ preventScroll: true }` (MDR `:443`). The card is already in view, so the impact is negligible | New |
| N-2 | Risk | Auditor | No unit assertion that the ring and the New badge survive a dismiss (AC-3a). It holds by construction and in the H-4 screenshot | New: for `/akili-test` |
| N-3 | Reliability | Auditor | When the card is missing from the DOM at show time (MDR `:432-433`), the effect returns and waits for the next signal change or the 10 s expiry (Implementer assumption 4). Acceptable | New, informational |

---

## 8. Design Conformance

| Design element | Code | Result |
|---|---|---|
| DD-1 both entry points use `?job=` and request | SVC `:509-520`, HOST `:104-117` | PASS |
| DD-2 one-shot nonce signal, not a URL flag | SVC `:98`, `:157-176`; no `?spotlight` anywhere | PASS |
| DD-3 the `?job=` effect owns the scroll; settle and re-arm | MDR `:271`, `:300-307`, `:406-421`, `:577` | PASS |
| DD-4 thin service, one close path, step-popover buttons, no `onDestroyed` | DSS `:48-105` | PASS |
| DD-5 clear filters once, cancel the debounce | MDR `:388-404` | PASS |
| DD-6 navigate only on a URL change; TTL; case-insensitive center gate | SVC `:516`, HOST `:113`, SVC `:48`, MDR `:384` | PASS |
| DD-7 escaping | DSS `:19-26`, `:75`, `:78` | PASS |
| DD-8 close on in-card actions, center change and destroy; focus only on dismiss; tour poll and reverse guard | MDR `:973/982/1003/1029/334`, `:443`, `:533-549`; TOUR `:67` | PASS |
| DD-9 container `refresh` and list-change `refresh` | DSS `:84-87`, MDR `:339-346` | PASS |
| DD-10 (rev. 4) scroll-margin below the measured top chrome, restored on close | DSS `:53-55`, `:100`, `:108-112`; element `.app-shell-header` (`app.component.html:17`, `app.component.scss:39`) | PASS |
| DD-11 (rev. 4) close when a layer opens while active | MDR `:348-360` | PASS |
| §2.2 sequence (gate order 1–8) | MDR `:365-446`, numbered comments match the sequence step for step | PASS |
| §6.2–6.4 rows | All rows mapped above; the copy matches §6.3 verbatim | PASS |
| §7 security | §7 above | PASS |
| §11 backwards compatibility: the existing `?job=` and ADN tests unchanged | `execution.md:154`, `:382` (no existing expectation edited); auditor's targeted run green | PASS |

### 8.1 Cross-document figure check

| Figure | Where asserted | Contradiction? |
|---|---|---|
| `SCROLL_SETTLE_MS` 600 ms · TTL 10 s · tour poll 1 s | req NFR-1, design §6.2/§6.4, code (MDR `:238`, SVC `:48`, MDR `:253`) | None |
| Overlay 0.65, `stagePadding` 6, `#1e202f` | design §6.2, TOUR `:229-231`, DSS `:59-62` | None |
| LOC about 1 340 against a 600 tripwire, accepted by the user | design §Budget note, `tasks.md:12`, `execution.md:231`, `:418` | Consistent with git (+1 332 client lines). **The user accepted it on 2026-10-27, and that is recorded** (`execution.md:231`: "accept the overrun and continue", logged as a user decision) |
| Tasks: 4 | design rev. 4 note, `tasks.md:12` | **Stale**: the design §Budget table (`design.md:301`) says 3, and `execution.md:13` says "3 tasks · ≈ 530 LOC · 4 review rounds". The rev. 4 note sits above the design table, so it is readable; the `execution.md` header is simply stale → WARN-3 |
| Review rounds: "4 verdict rounds (5 Reviewer verdicts)" | `execution.md:419` | **Arithmetic mismatch**: the recorded verdicts are T-1 (1), T-2 (lens A and B, 1 round), and T-4 (1), which makes 3 rounds and 4 verdicts. `execution.md:239` correctly says 2 rounds and 3 verdicts after T-2. It is within the tripwire either way → WARN-3 |
| DD-10 top-chrome element `UNVERIFIED` | `design.md:264`, `:291` (§13), `tasks.md:283` | **Settled** by T-4 (`execution.md:377`, Reviewer confirmed at source) but not closed in `design.md` → WARN-3 |
| §13 open gaps "tall-card popover placement" and "`refresh()` on container scroll" | `design.md:288-289` | Settled by H-6 re-run and H-7; not marked closed → WARN-3 |
| `tasks.md` Document Control "rev. 3" / "not started"; ADS-T-3 status "1 fail at 375 px + 1 spec gap; awaiting user decision" | `tasks.md:8`, `:11`, `:237` | **Stale** against design rev. 4 and the re-run (`execution.md:421-438`) → WARN-2 |
| `execution.md` ADS-T-3 status "one requirement fails at 375 px and one spec gap" | `execution.md:252` | Superseded by `:437-438` lower in the same file; the header was not updated → WARN-2 |
| Premise ledger "18 verified, 0 `UNVERIFIED`" | `design.md:35` | Rev. 4 added a new `UNVERIFIED` (DD-10) outside the ledger. It is now settled, so no defect remains, but the ledger and §13 should say so → WARN-3 |

### 8.2 ADS-T-2 task text still showing the rev. 3 config (`tasks.md:110`, `:145`)

**Acceptable, and not a finding.** The Pivot Record (`execution.md:336`) leaves the T-2 text unchanged on purpose: it records what was approved and built at that time. The superseding change is a separate, executed task (ADS-T-4) whose text names the exact delta (`overlayColor`, DD-10). Rewriting closed-task text would erase the audit trail.

The one risk is that a reader of T-2 alone copies the old config. A one-line "superseded by ADS-T-4" pointer at those two lines fixes that without rewriting history (optional item R-5).

### 8.3 Proposal alignment

| Proposal item | Outcome |
|---|---|
| Intent §1 / Outcome §3.1–3.3 | Met (§6.1) |
| §3.4 "Nothing changes in draft data, status or the API" | Met (R-8) |
| OQ-1 (drawer also spotlights) → D-1 yes | Met (AC-1d) |
| OQ-2 (clear filters) → D-2 | Met (AC-5a) |
| R-4 tall groups, "anchor to the group header" | Met via DD-10 (header visible) rather than anchoring the popover; the popover uses driver's auto placement, judged acceptable on screen at H-6 |
| Non-goals (server, bell/email links, ADN badge, `?job=` ring, multi-step tour, row-level spotlight) | None violated: the diff touches no server, notification, badge-logic or ring-logic code beyond additive reads |

---

## 9. Test Evidence Summary

| Defect class | Automated | HITL | Status |
|---|---|---|---|
| ADS-D1 navigation contract | SVC spec 1–4; HOST spec (3 tests) | H-1, H-2, H-3 | Covered |
| ADS-D2 one-shot logic | SVC spec 5–6; MDR spec 7–12, 14 | H-3, H-9 | Covered |
| ADS-D3 filter fallback | MDR spec 13, 13b, 14 | H-10 | Covered |
| ADS-D4 cleanup | DSS spec 2–5c, T4-3/3b; MDR spec 17 | H-4, H-5 | Covered |
| ADS-D5 geometry and timing | (jsdom cannot cover this) | H-1, H-6 (+ re-run), H-7 at 375 and 1280; 34 screenshots | Covered |
| ADS-D6 overlay clash | MDR spec 16, 21; TOUR spec (2) | H-8, W-1 | Covered |
| ADS-D7 a11y | MDR spec 18; DSS spec 3 | H-4 keyboard pass | Covered |
| ADS-D8 type contract | `tsc` exit 0; T-1 F5 and T-2 `close('cancel')` falsifiers | — | Covered |
| XSS | DSS spec 6, 6b | — | Covered (string-level; T2-B1) |

- **Falsifiers:** 20 recorded across T-1, T-2 and T-4, each observed red and reverted.
- **First reds:** quoted verbatim for every greenfield test the tasks named.
- **Changed-file coverage:** 94.5 % lines and 88.18 % functions.
- **`/akili-test`:** not run (no `test-report.md`). Coverage is already strong. If run, it should target N-2, T1-c and T2-B1.

## 10. Agent Guide / Constitution Impact

| Item | Check | Result |
|---|---|---|
| `execution.md` → `## Constitution Impact: ADS-T-2` (`:241-246`) | New root service recorded; child guide updated; no parent `## Module Guides` change; CodeGraph sync deferred to archive. Accurate | PASS |
| `my-draft-results/CLAUDE.md` | 111 lines (≤ 120). `Verified:` re-stamped for ADS-T-4. Covers the spotlight contract (`:25-32`), DD-10 (`:33`) and DD-11 (`:34`), and the P-12/P-14/P-15/P-17/P-18 traps. Current | PASS (advisory T2-A4) |
| `ai-processes-drawer/CLAUDE.md` | 120 lines (at the cap). `Verified:` stamped ADS-T-1. Documents `viewDrafts` → `requestDraftSpotlight` and the `false`-navigation consume (`:49-54`). Current (T-4 did not touch the drawer) | PASS |
| `pages/bilateral/services/` folder guide | None exists; for one thin wrapper the Constitution Impact note judges none needed. Agreed | PASS |
| `docs/trd/trd.md` `bilateral` client row (`:192`) | Coarse row ("creator, overview, review hierarchy"); a client-only presentation service does not change it. Under shared-file discipline any TRD sync is an archive-time pending item | PASS |
| Pending at archive | `codegraph sync`; Kaizen: (a) the design premise P-10 relied on driver's `block: 'start'` without accounting for the sticky app chrome; (b) a clash guard must cover layers opening **after** the start, not only before it | Recorded for `/akili-archive` |

---

## 11. Remediation

| # | Severity | Item | Owner |
|---|---|---|---|
| R-1 | ~~BLOCKING~~ **DONE** 2026-10-27 | The user reviews ADS-T-3 and approves or rejects at the HITL pause. **Done:** the user approved ("approve ADS-T-3"); `tasks.md:237` is `[x]`; closure is at `execution.md:440-460`. Ticking the boxes at `tasks.md:272-273` is still open and moves to R-2 | User, then Leader |
| R-2 | WARN-2 | Tick the done criteria for T-1, T-2, T-3 and T-4 (`tasks.md:96-100`, `:229-233`, `:272-273`, `:327-331`); update `tasks.md:8` (rev. 4), `:11` (status), `:237` (T-3 status) and `execution.md:13` (budget header), `:252` (T-3 first-run status → "superseded by re-run, `:421`") | Leader / `/akili-archive` |
| R-3 | WARN-3 | `design.md`: close the DD-10 `UNVERIFIED` marker (`:264`) and §13 rows `:288-289`, `:291` with the settled evidence (`.app-shell-header`, `app.component.scss:39`; H-6 re-run; H-7); mark the §Budget table as superseded by the rev. 4 note; fix `execution.md:419` to "3 verdict rounds (4 Reviewer verdicts)" | Leader / `/akili-archive` |
| R-4 | WARN-1 | Open a follow-up ticket for the 375 px horizontal page scroll on Draft Results (HITL-O1) and for the `?job=` reload not scrolling at 375 px (HITL-O2). Measure both at `edcf190f0` to confirm they already existed. Cite the ticket in the archive summary | User / PMU |
| R-5 | Optional | Add a one-line "superseded by ADS-T-4" pointer at `tasks.md:110` and `:145` (§8.2) | `/akili-archive` |
| R-6 | Optional (advisory) | If `/akili-test` runs: assert that the ring and the New badge survive a dismiss (N-2), write checks on `ResultsApiService` (T1-c), and a jsdom `querySelector('img') === null` (T2-B1); consider the try/catch hardening (T2-B2, T4-b) | `/akili-test` |

Required: **4** (R-1..R-4), of which **1 is done** (R-1) and **3 remain** (R-2..R-4). Optional: 2.

## 12. Archive Readiness Recommendation

**Ready to archive once R-2..R-4 are done.** No gate blocks it any more.

1. **R-1 is done.** The user approved ADS-T-3 on 2026-10-27, and the closure was verified at the source (§3).
2. Apply R-2 and R-3. They are document-only edits and can be done in the `/akili-archive` pass.
3. File R-4's ticket before archiving, so that the AC-7a WARN carries a tracked follow-up.
4. `/akili-test` is optional. Coverage and falsifier evidence are already strong; run it only to close the R-6 test gaps.
5. With R-2..R-4 done, the expected outcome is **PASS with 1 accepted WARN (AC-7a, pre-existing, ticketed)**, and the spec is ready for `/akili-archive bilateral/ai-draft-spotlight`.
