# Proposal — The section bottom bar reads "Section complete" while a ToC tab that is not on screen is still empty

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3542-section-bar-toc-tabs` |
| Slug | `p2-3542-section-bar-toc-tabs` — derived from the free-text argument (a paragraph, not a slug), routed to `bugfix/` per the Bug Track taxonomy |
| Type | Bug |
| Approval Mode | gated |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-25 |
| Jira | **P2-3542** (QA-Bug, `To Be Improved`, assignee Juan David Delgado) under epic **P2-3512** — *TOC User Feedback*. Reopened by QA 2026-09-22, re-confirmed by the PO 2026-09-25 |
| Branch base | `performance-refactor` @ `9354317d4` — every citation below read at this SHA |
| Depends on | none |
| Parallel-safe | **yes** — the surface is `SectionBottomBarComponent` + `DataControlService`'s scan + one ToC child component; no migration, no API contract, no server code |
| Related | `archive/2026-09-08-changes--realtime-section-completion` (the spec whose `RSC-1` reverted the original P2-3542 fix — this proposal corrects one premise of that spec, it does not undo it) |
| Model note | Registry pins T1 → `opus`; this session runs Opus 5. No downgrade needed |

## 2. Intent

The section bottom bar and the sections rail must never disagree about whether a section is complete. That single line was the acceptance criterion of the original P2-3542 fix, and it is the one this proposal restores — **without giving up the live, as-you-type pill that `RSC-1` shipped afterwards.**

## 3. Problem / Current Behavior

On `/result/result-detail/<code>/contributor-partners?phase=36` with **two or more ToC tabs**, filling tab 1 and leaving tab 2's *Contribution to indicator target* empty leaves the bottom bar green ("Section complete") while the rail is red. QA reproduced it after a full page reload and after navigating away and back (P2-3542 comment, 2026-09-22); the PO re-confirmed it on 2026-09-25 with a Jam recording.

Why the bar cannot see it:

- The bar's pill is `isComplete = computed(() => this.missingFields().length === 0)` — a pure DOM scan, no server signal (`section-bottom-bar.component.ts:220`, read at `9354317d4`).
- `missingFields()` is `DataControlService.fieldFeedbackList()` (`section-bottom-bar.component.ts:126`), filled by `someMandatoryFieldIncompleteResultDetail('.section_container')` (`data-control.service.ts:256`), which only ever reads elements present in the document (`data-control.service.ts:267,283`).
- Contributors & Partners mounts **one** ToC tab: `multiple-wps.component.html:41-44` passes a single `[activeTab]` to `app-multiple-wps-content`. Every other tab's mandatory fields are not in the DOM, so the scan cannot count them.
- The rail reads the server's green check instead — `ResultSectionsService.currentSectionIsDone()` = `!!currentSection()?.validation` (`result-sections.service.ts:183`) — which grades **all** `result_toc_result_indicator_id` rows. Hence the disagreement.

This is a **regression by design decision, not a defect in `RSC-1`'s code.** `RSC-1` (commit `f76e99ca1`, 2026-09-08, `[SPEC:changes/realtime-section-completion]`) deliberately reverted the original P2-3542 fix (`4a81cf419`) so the pill would update while typing, and recorded that it had checked the two reasons P2-3542 existed. Its own archive states the check verbatim:

> "(1) `rd-theory-of-change` (the only section with hidden tabs) is P22-only, out of scope for this pill"
> — `docs/specs/archive/2026-09-08-changes--realtime-section-completion/execution.md:123`

**That premise is false.** `rd-theory-of-change` is not the only section with hidden ToC tabs; `rd-contributors-and-partners` — P25, and the exact section P2-3542 was filed against — has them too, through the same `app-cp-multiple-wps` child. The same clause's second half *is* still true: the Contributing CGIAR Centers rule does carry a `appFeedbackValidation` marker today, so that half of P2-3542 has not regressed, and QA's 2026-09-22 comment confirms it live ("it correctly shows 'X fields missing' and now even **names** the specific missing fields").

**One correction to the reported diagnosis, because it moves where the fix goes.** QA's follow-up (2026-09-22, 21:19) read `isComplete()` as a `computed()` frozen on a stale value of `currentSectionIsDone()`, and recommended checking whether `ResultSectionsService` is properly signal-backed. The measurements are right — `currentSectionIsDone()` really is `false` while `isComplete()` is `true` — but the cause is simpler: **`isComplete` no longer reads `currentSectionIsDone()` at all.** The `computed()` quoted in that comment is the code as it stood on `4a81cf419`; it was replaced on 2026-09-08. `ResultSectionsService` is fine and needs no change.

## 4. Proposed Outcome

On a section with several ToC tabs, the bottom bar reports the gaps on the tabs that are **not** on screen as well as the ones that are — so it never reads "Section complete" while the rail is red — and it keeps reacting as the user types, on both.

## 5. Scope

| In | Out |
|---|---|
| `SectionBottomBarComponent`'s completeness pill and its "still missing" popover | The sections rail, Submit gating, `GreenChecksService`, `ResultSectionsService` — all correct today, none touched |
| `DataControlService`'s mandatory-field scan, as the single place the bar's list is assembled | `validation_contributor_partner_P25` and every other server-side green check — correct today (measured in the 2026-09-01 comment: both test results returned `0`/red) |
| The ToC-tab child (`app-cp-multiple-wps`) as the publisher of what it renders off screen | `RSC-1`'s live-typing behaviour — preserved, not reverted |
| A regression test that fails before the fix and passes after, for the 2-tab case | The three follow-up defects in the live function body listed in the 2026-09-01 comment (false reds on `number_target`, the `COUNT`/`SUM` NULL false green) — separate tickets |

## 6. Non-Goals

- Re-opening the P2-3542 vs `RSC-1` argument. Both asks are legitimate and this proposal satisfies both; it does not pick a winner.
- Making the pill agree with the green check on rules the client cannot know. A save can still surface a server rule the client has never heard of; the bar converging on the next save is accepted, as `RSC-1` accepted it.
- Anything in the bilateral module, IPSR or the result creator beyond what the Blast Radius names.

## 7. Affected Users, Systems, And Specs

| | |
|---|---|
| **Users** | Result submitters on P25 with a result mapped to 2+ ToC tabs — the common case the original ticket was filed on |
| **Code** | `section-bottom-bar.component.ts` · `data-control.service.ts` · `multiple-wps.component.ts` (all `onecgiar-pr-client`) |
| **Specs** | Corrects one premise recorded in `archive/2026-09-08-changes--realtime-section-completion`; that spec's outcome stands |
| **Docs** | `result-detail/CLAUDE.md` and `rd-contributors-and-partners/CLAUDE.md` both describe the bar; per the folder-doc convention they get re-stamped in the same commit |

## 8. Visual Reference

- **Source:** None — no new UI surface. The change is which inputs feed an existing pill and an existing list.
- **Location:** n/a.
- **Notes:** The PO attached a Jam recording (`jam.dev/c/539ddd37-acbf-45bd-ad65-3139705fd0cb`, P2-3542 comment 2026-09-25). `UNVERIFIED — confirm at source before relying on it`: it was not opened in this session. It is not load-bearing — QA's console measurements of 2026-09-22 establish the same mechanism independently, and the code path is confirmed by reading.

## 9. Bug Diagnosis

### Observed Symptom

Result 8954, Contributors & Partners, two ToC tabs (Outcome N~1 / AOW01, Outcome N~2 / AOW02). Tab 2's *Contribution to indicator target* is empty and saved. Standing on tab 1, the bottom bar reads **"Section complete"** (green) while the sections rail is red. Standing on tab 2, the same bar correctly reads "1 field missing".

### Reproduction Steps

1. Open `/result/result-detail/8954/contributor-partners?phase=36` on TEST as a user who can edit.
2. Complete tab 1 in full (contribution = `0` is valid), plus a contributing centre, a lead centre and the partner block.
3. Switch to tab 2, clear *Contribution to indicator target*, **Save draft**.
4. Reload the page (tab 1 is the tab that loads).
5. **Expected:** bar red, naming the gap — the rail is red. **Actual:** bar green, "Section complete".

Measured live by QA on the same result (2026-09-22, 21:19), on the rendered component instance:

```
comp.sectionsSE.hasCurrentSection()      // true
comp.sectionsSE.currentSectionIsDone()   // false   ← the rail, correct
comp.missingFields()                     // []      ← the scan, blind to tab 2
comp.isComplete()                        // true    ← what paints the pill
```

### Root Cause (confirmed)

`SectionBottomBarComponent.isComplete` decides completeness from a DOM scan that structurally cannot see a ToC tab that is not rendered.

- `isComplete = computed(() => this.missingFields().length === 0)` — `section-bottom-bar.component.ts:220`
- `missingFields = computed(() => this.dataControlSE.fieldFeedbackList())` — `section-bottom-bar.component.ts:126`
- The list is built only from elements found under `.section_container` — `data-control.service.ts:267,283`
- One tab is rendered: `[activeTab]="activeTab"` — `multiple-wps.component.html:43`, inside the single `<app-multiple-wps-content>` at `:41`

Introduced by `f76e99ca1` (2026-09-08), which reverted `4a81cf419` (the original P2-3542 fix) on a premise its own archive records and which is false for this section — see §3.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline --grep="P2-3542"` → `4a81cf419` only (plus `0522802d0`, a local stash from this session, not history). `git log --all --oneline -- …/section-bottom-bar.component.ts` → 16 commits, latest `99577e1a5` (scroll behaviour), with `f76e99ca1` the last to touch `isComplete` | **No.** No commit on any branch restores the guarantee. The spec is needed |
| **Live path?** | `ResultDetailComponent.ngDoCheck` (`result-detail.component.ts:265`) → throttled rAF `runFeedbackScan()` (`:286`) → `someMandatoryFieldIncompleteResultDetail('.section_container')` (`:297`, → `data-control.service.ts:256`) → `fieldFeedbackList` (`:34`) → `missingFields()` (`section-bottom-bar.component.ts:126`) → `isComplete()` (`:220`) → the pill (`section-bottom-bar.component.html:60`) | **On path.** Every hop is the one the reproduction travels, and QA's console reads confirm the end of the chain on the live page |
| **Siblings on the same state** | `app-cp-multiple-wps` renders in 5 other places (grep over `*.html`): `ipsr-contributors.component.html` (IPSR — **does** run the same scan, `innovation-package-detail.component.ts:99`, and shows `app-save-button`'s "N alerts" chip); `share-request-modal.component.html` (inside result-detail, so its `.section_container` joins the union); `notification-item.component.html` and `result-review-drawer.component.html` (no bottom bar, and the drawer only writes the signals per its own `AGENTS.md:233`) | IPSR is the one real sibling. Its symptom is softer — an under-count in a chip, not a false "complete" — so it is named in scope as a decision, not assumed |
| **Downstream consumers** | `fieldFeedbackList` / `mandatoryFieldsTotal` are read by: the bar's pill, ring denominator, popover list and `goToField` (`section-bottom-bar.component.ts:126,133,339`); `save-button.component.html:29,36,47` (IPSR, result creator, links-to-results); specs `data-control.service.spec.ts`, `section-bottom-bar.component.spec.ts`, `rd-contributors-and-partners.zoneless.spec.ts:456`, `cap-dev-info.component.spec.ts:612`; Cypress contracts `save-button.contract.cy.ts:190-211`, `pr-input.contract.cy.ts:147`, `pr-textarea.contract.cy.ts:142` | **`fieldFeedbackList` must stay a writable signal** — `save-button.contract.cy.ts` calls `.set([...])` on it. Any design that turns it into a `computed` breaks those contracts |

### Fix Strategy

Not cosmetic — it changes what the pill decides on. Route: **`/akili-specify` (Lite) in Bug Mode**, with a regression test that is red before and green after on the 2-tab case.

The smallest safe correction is to let the section tell the scan what it owns but does not render, rather than to change who the bar trusts. The data is already in memory and already correct: `completnessStatusValidation(tab)` (`multiple-wps.component.ts:199-213`) is what paints each tab's own red/green check icon, including the 2026 contribution rule, for **every** tab — rendered or not.

## 10. Approach Options

| | Option A — the section publishes its off-screen gaps | Option B — the pill goes back to the green check | Option C — render every tab, hidden |
|---|---|---|---|
| **Shape** | `DataControlService` gains a small registry of "gap sources"; a mounted section registers a function returning the labels it knows are missing off screen and drops it on destroy. The scan folds them into the same `fieldFeedbackList`. `app-cp-multiple-wps` registers one, built from the `completnessStatusValidation` it already computes per tab | Revert `isComplete` to `currentSectionIsDone()`, i.e. re-apply `4a81cf419` | Mount all tabs, keep only the active one visible with CSS, so the scan sees everything |
| **Fixes the bug** | Yes | Yes | Yes |
| **Keeps `RSC-1`'s live pill** | Yes — the source is read on the scan's own 150 ms cadence, so a value typed on either tab lands without a save | **No** — the green check only refreshes on save (`general-interceptor.service.ts`), which is the complaint `RSC-1` exists to fix | Yes |
| **Names the missing field** | Yes, per tab ("Outcome N~2: Contribution to indicator target") | No — the green check cannot say *what*; the popover falls back to "Section incomplete" | Yes |
| **Risk** | One new extension point in a hot path; a publisher that forgets to unregister leaks its gaps into the next section (mitigated by making the contract explicit and testing destroy) | Re-opens the exact argument `RSC-1` settled; two reverts in a row on the same line | High — `multiple-wps-content` runs per-tab HTTP (`getIndicatorsList`) and writes into the bound rows; mounting N of them multiplies requests and re-opens the child-mutation bug class the unsaved-changes spec hit 5+ times |
| **Blast** | Bar + IPSR chip improve together; everything else unchanged | Bar only; IPSR unchanged (still blind) | Every consumer of the ToC tabs, including the dirty-tracker |

## 11. Recommended Approach

**Option A.** It is the only one that satisfies both tickets at once: the rail and the bar agree again (P2-3542), and the pill still moves as the user types (`RSC-1`). It also keeps the server as the only authority on server rules — the client never re-implements `validation_contributor_partner_P25`, it only reports a gap it can already see in its own memory.

Two properties make it cheap: the per-tab truth already exists and is already trusted (it paints the tab icons), and the scan already runs on a cadence, so nothing new has to be wired to change detection.

## 12. Risks, Dependencies, And Open Questions

| | |
|---|---|
| **R1** | A registered source that is not removed on destroy reports another section's gaps. Mitigation: the contract states the publisher owns removal, and the regression suite asserts it. |
| **R2** | The ring denominator (`mandatoryFieldsTotal`) will count off-screen fields that are *missing* but not off-screen fields that are *complete*, so it can read "5 of 6" on a section that has 8. Direction is safe — it can never read full while something is missing. Call it out in `/akili-specify` and decide whether to accept it. |
| **R3** | `fieldFeedbackList` must remain writable — `save-button.contract.cy.ts` sets it directly. Constrains the design, not a risk if respected. |
| **OQ-1** | **Is IPSR in scope?** `ipsr-contributors` has the same blind spot with a softer symptom. Option A fixes it for free if the publisher lives in the shared child; excluding it means gating the publisher. Recommend including it — the same component, the same bug. |
| **OQ-2** | **Is the "Section incomplete" wording still wanted?** The original P2-3542 fix introduced it for the case where nothing nameable is missing. With Option A that case shrinks but does not vanish. Keep or drop — a one-line call for the PO. |
| **OQ-3** | Should `/akili-specify` also cover the **share-request modal**, whose `app-cp-multiple-wps` sits inside result-detail's `.section_container` union while open? Pre-existing, unreported, and arguably out of this ticket. |
| **D1** | None. No server change, no migration, no coordination with Yeck or Cristian. |

## 13. Success Criteria

1. On result 8954 with tab 1 complete and tab 2's contribution empty, the bottom bar reads red and names the gap **while standing on tab 1**, after a full reload — the case the 2026-09-22 re-test failed.
2. `SELECT validation_contributor_partner_P25(<result_id>)` and the on-screen bar never disagree in direction: `0` ⇒ the bar is not green.
3. Clearing the contribution on the tab that **is** on screen still turns the bar red without saving (`RSC-1` preserved).
4. A normal single-tab section (General information) still counts and names its fields exactly as today — no regression in the popover.
5. A regression test covering (1) fails on `9354317d4` and passes after the fix.

## 14. Next Step

```text
/akili-specify bugfix/p2-3542-section-bar-toc-tabs
```

Bug Mode — the confirmed root cause becomes a fix plan plus the mandatory regression test.
