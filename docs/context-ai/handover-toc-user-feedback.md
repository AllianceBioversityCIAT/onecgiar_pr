# Handover — TOC User Feedback (P2-3512) child tickets

**Written:** 2026-08-27 · branch `performance-refactor`
**Hands over:** P2-3235 · P2-3306 · P2-3307 · P2-3308 · P2-3309 · P2-3336
**From:** Yecksin Zuñiga · **To:** Juan David Delgado

> Agreed between them on Slack, 27 Aug 15:23 — *"Yo tomo ToC / Y vos SIDS"*.

This lives in the repo and not in Jira because of **rule 15** of `reporting/CLAUDE.md`:
a first-level activity is created only to document a bug or a development. A handover is
context, and context with no owning activity belongs in `docs/context-ai/`.

Each of the six tickets carries a short comment pointing here; this is the detail behind it.

---

Reference material for the development team. No action needed from business or QA.

Six children of P2-3512 move from Yecksin Zuniga to Juan David Delgado. Everything we learned is here, so nothing has to be reconstructed. Branch for all of it: performance-refactor, all pushed. Client only - no server code changed for any of these tickets.

## 0. State of each ticket

- P2-3235 (QA - Enhancement, Open) - NOT STARTED. The requirement is a question, not a spec. See section 5.
- P2-3306 (Bug, In Progress) - DOES NOT REPRODUCE. Question posted to business 26 Aug, still unanswered.
- P2-3307 (Bug, In Progress) - FIXED (232e509d1), in the build prtest serves. Not yet clicked on screen after deployment.
- P2-3308 (Bug, In Progress) - FIXED (232e509d1), same caveat.
- P2-3309 (Bug, In Progress) - DOES NOT REPRODUCE. Question posted to business 26 Aug, still unanswered.
- P2-3336 (Enhancement, In Progress) - APP WORK DONE. What remains is documentation, not code.

> 🛑 **The two "does not reproduce" verdicts are the single most valuable item here. P2-3306 and P2-3309 were NOT fixed - the reported behaviour could not be made to happen. Read them as "not reproduced", never as "resolved". If someone reads them as resolved and the fault later appears, the ticket is lying.**

---

## 1. THE MAP YOU NEED FIRST - two screens, two components

> ⚠️ Most likely way to waste a day: the "Contributing ..." fields exist on TWO different screens backed by TWO different components with different code. They look identical to the reporter.

Screen A - Result detail, Contributors and Partners (rd-contributors-and-partners.component.html). Every field is app-pr-multi-select:

```
Contributing CGIAR Centers (from ToC)        :104 and :127
Other(s) Contributing CGIAR Centers          :163
Contributing W3 and/or bilateral projects    :191
Contributing Science Program/Accelerator     :305
Other(s) Science Program(s)                  :338
```

Screen B - Results Framework Reporting, Science Program, Area of Work, "Report result" modal (aow-hlo-table-create-modal/aow-hlo-create-modal.component.html). MIXED:

```
Contributing CGIAR Centers            app-pr-multi-select       :200
Other(s) Contributing CGIAR Centers   app-pr-multi-select       :236
Contributing Science Programs/Accel   app-pr-FILTER-multiselect :275
Other(s) Science Program(s)           app-pr-FILTER-multiselect :319
Contributing W3 and/or bilateral      app-pr-FILTER-multiselect :351
```

> 🛑 **Consequence: the 232e509d1 fix (P2-3307 / P2-3308) applies ONLY to Screen B. Screen A's equivalents run on the other component, which never had the bug. If a reporter says the fault is still there, FIRST ask which of the two screens.**

The two components are deliberately different - see the note at pr-filter-multiselect.component.ts:4-13.

---

## 2. Commits and what each one did

### 232e509d1 - fix(pr-filter-multiselect) P2-3307 P2-3308: compare by value, not identity

The real root cause of the "loses / toggles selections" reports.

- pr-filter-multiselect.component.ts:85 (isSelected) and :90 (toggle) compared model entries with item === v.
- When the consumer does NOT pass optionValue, the model holds whole option objects (valueOf() at :63). Identity only matched when the preselected entries were the very same instances as those in options.
- A consumer preloading its selection from a different response (an equal object, not the same instance) got every entry rendered UNSELECTED, and clicking one APPENDED A DUPLICATE instead of removing it. That is exactly "loses or toggles selections".
- Origin: regression from the PrimeNG removal, commit 8fea5077b (14 Jul). p-multiselect compared with ObjectUtils.equals; the replacement lost that.
- Fix: private sameValue() at pr-filter-multiselect.component.ts:78 - shallow object compare, falling back to === for primitives.
- Tests: 7 new cases; 3 of them FAIL against the old === and pass now. 99 suites / 1831 tests green across every consumer.

> ⚠️ The commit calls this "latent rather than live in the Report result popup", because preselectTocSciencePrograms there shares instances. It bites any consumer preloading from another endpoint. The fix is correct and proven by test, but it was NOT confirmed on screen. Treat on-screen confirmation as still pending.

### 28c47dcb6 - test(pr-multi-select) P2-3306 P2-3309: pin the behaviour that does NOT reproduce

344 lines added, NO production code. Details in section 3.

### a10fe744f - fix(entity-aow-unplanned) P2-3336: say these IOs appear under every AoW

- Old text said these entries appear "within the Areas of Work to which they are mapped". These nodes are precisely the ones with NO wp_id - mapped to no Area of Work - so read literally it pointed at an empty set.
- New text (entity-aow-unplanned.component.html:9-15): they belong to the Science Program as a whole and appear under EVERY Area of Work, tagged there as not exclusive.
- 3 spec cases guard the wording itself (entity-aow-unplanned.component.spec.ts:89-114), because the note IS the deliverable. Mutation-checked.

### e75788e4c - docs(context-ai) P2-3336: record the AoW/IO model

docs/context-ai/conceptos.md:116-145. Read before touching anything AoW/IO. Written in Spanish.

### a052044e7 - chore(pr-multi-select): remove debug console.log

Test-file hygiene, author JuanCode. THE ONLY ONE OF THE FIVE NOT IN THE BUILD PRTEST SERVES. No user-visible effect.

### Related and already live: 0c153a116 (3 Aug)

Where the three P2-3336 rules were actually implemented. a10fe744f only corrected its wording. Backend flag is_aow shipped in 3620284f3.

---

## 3. P2-3306 and P2-3309 - what was tried, and why nothing changed

> 🛑 **Neither ticket reproduced on this branch. No production code was written for either.**

What was exercised (recorded in pr-multi-select.selection.cy.ts:9-21): the real screen with real data from the test backend - Results Framework Reporting, entity-details/SP02, an Area of Work, the "Report result" window. Result: a center that arrived preloaded stayed ticked; three clicks in a row added three centers; nothing was lost and nothing switched itself off; the choices appeared as chips under all three Contributing fields.

What was locked so a refactor cannot silently reintroduce it - custom-fields/pr-multi-select/pr-multi-select.selection.cy.ts, Cypress COMPONENT tests (npm run test:ct, not cypress:run):

- Three clicks accumulate - 4 variants: checkbox vs label click, times two-way ngModel array (Screen A shape) vs signal + one-way ngModel + .set() (Screen B shape). :60-106
- P2-3306 specific: preloaded center + picking the Other(s) sentinel row - the preloaded center stays checked. :108-129
- P2-3309 specific: one chip per selected value when selectedOptionLabel is bound. :131-146

These are Cypress CT and not Jest on purpose: they cover the two things jsdom never lays out - the :focus-within dropdown panel and the CDK virtual-scroll viewport.

> ⚠️ Naming caveat: repro-p2-3308.spec.ts is named for P2-3308 but exercises pr-multi-select, which is NOT the component behind the W3/Bilateral field on Screen B (that one is pr-filter-multiselect, :351). No commit records why it was named that way. Read it as a guard on pr-multi-select - Screen A's version of the field - NOT as a reproduction of P2-3308.

### The one candidate change for P2-3309, and why it was rejected

The obvious "fix" would be removing the chip gate at pr-multi-select.component.html:61 - *ngIf="selectedOptionLabel()" - so chips always render.

> 🛑 **That would be a regression. Of the 80 instances of the component, 10 pass selectedLabel WITHOUT selectedOptionLabel, and each paints its own chip strip below the field (aow-hlo-create-modal.component.html:220-231, :298-309, :360-385). Dropping the gate would render every chip TWICE in those 10 places. Locked as a passing test at pr-multi-select.selection.cy.ts:148-153. Any future change has to clean up those consumers first.**

### What is actually blocking both

Both wait on a business answer, posted 26 Aug, unanswered as of 27 Aug:

- P2-3306 - asked Nicoleta through Angel: when the selections disappeared, did the boxes look EMPTY, or did the closed dropdown just read "3 selected" instead of listing the names? Two different problems, only one is a bug.
- P2-3309 - asked Nicoleta through Angel: should the closed dropdown list the names again (it did until July), or is the row of chips below enough? A UI preference with a real cost - listing names grows the field and pushes the form down.

> ✅ Recommendation: do not write code for either until that answer arrives. The behaviour they describe is not present, so any change made now is a guess at what to change.

---

## 4. P2-3336 - done and left

The three agreed rules (Nicoleta Trifa / CGIAR System Organization) are all reflected in the tool. Nothing about how IOs relate to AoWs had to change - the model already did the right thing; what was missing was the message telling users when an IO is shared.

- Rule 1 (IOs outside an AoW): their own Intermediate Outcomes page in the Science Program menu. Component entity-aow-unplanned/.
- Rule 2 (IOs inside an AoW but not unique to it): on the AoW Outcomes tab, shared IOs are split below the main table under "Intermediate Outcomes not exclusive to this Area of Work", with an info message and a "Not exclusive to this AoW" tag. Informational only. Delivered by 0c153a116.
- Rule 3 (IOs unique to an AoW): unchanged.

### The model that decides all three

Written up in docs/context-ai/conceptos.md:116-145 (Spanish). Short version:

- toc_results.wp_id is a SINGLE-column FK: an IO belongs to ONE Area of Work, or to NONE. There is no many-to-many.
- wp_id IS NULL means the node belongs to the Science Program as a whole, and the server returns it under EVERY AoW on purpose - aow-bilateral.repository.ts:482, predicate AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL).
- (wp.toc_id IS NOT NULL) AS is_aow (same repository, ~:400) is the flag the client splits on: false = shared. A missing flag is treated as exclusive, so the page degrades safely against an old payload.

> ⚠️ programId on /toc-results/intermediate-outcomes is the program CODE (SP05), NOT the numeric initiativeId. A number returns an empty list that looks like an empty database. This cost several queries on 25 Aug.

> ⚠️ On that endpoint is_aow comes back false on EVERY row, because the SQL emits NULL there. Do not read it as meaningful in that response.

> ⚠️ Outputs carry the same is_aow and have NO split. The story only speaks about IOs - do not extend it.

Payload verification, real prtest data, 25 Aug: on SP05, toc_result_id 7208 and 7258 come back is_aow: false in all six AoW, every other Outcome comes back true in exactly one AoW, no missing flags; and /toc-results/intermediate-outcomes?programId=SP05 returns exactly those two ids. The two sets match.

### What is left, and it is not code

The ticket also asks for the three rules to be written into the system guidance documentation, with examples. That is not part of the application, and the ticket does not say where that documentation lives or who writes it. Left un-guessed on purpose. It needs an owner and a location - a decision, not development.

Context subtask with fuller detail: P2-3457, currently Open.

Why it was left In Progress rather than moved on for testing: on 25 Aug the three rules had been on prtest since early August and were testable, but the wording correction was not yet in the build served there. Version tell: if the note on the Intermediate Outcomes page still ends with "the Areas of Work to which they are mapped", the correction is not deployed; if it says the entries appear under EVERY Area of Work, it is.

---

## 5. P2-3235 - untouched, and why

Nothing has been done. Zero comments on the ticket. No audit, no pre-plan, no branch.

The requirement itself is a question, not a specification. Verbatim: "Check whether the Intermediate Outcomes selected in the Results Framework module should also be reflected/shown in this Section 2 of the result details, in order to keep both parts of the form consistent." Source: a Slack thread in #dev-prms-pr from Hector Tobon, with a screenshot attached there.

Per the project rule on unspecified requirements, this needs a product decision - should they be reflected, yes or no, and reflected how: preselected, read-only, or merely displayed - before any code is written.

Starting points if the answer is yes:

- "Section 2" here is the Contributors and Partners section of the result detail - the question "Can this result be mapped to a ToC KPI?" is built at rd-contributors-and-partners.component.ts:105.
- The "HLO N-1 / HLO N-2" tabs with a Level selector live in multiple-wps/. Level dropdown: multiple-wps-content.component.html:4-15. Node dropdown for Level = Intermediate Outcome (toc_level_id === 2): multiple-wps-content.component.html:34-47, options bound to outcomeList().
- outcomeList is an @Input() WritableSignal (multiple-wps-content.component.ts:41), populated by the parent at multiple-wps.component.ts:131-152 via GET_tocLevelsByconfig(resultId, initiativeId, 2, isP25, isPlanned).
- The Level catalogue comes from toc-initiative-outcome-lists.service.ts:18 - GET_AllTocLevels(isP25).
- The Results Framework side reads them via entity-aow.service.ts:267 getIntermediateOutcomes(entityId).

> 🛑 **Before designing anything here, re-read the phase-vs-portfolio rule. This area mixes both axes: isP25() is PORTFOLIO, isCP2026() is PHASE YEAR. multiple-wps.component.ts:143 gates on isP25(); multiple-wps-content.component.html:3 gates on isCP2026(). If the requirement says "2026 onwards", the correct gate is the ReportingDesignYear threshold on phase_year, NOT isP25().**

---

## 6. Deployment status - and what could not be confirmed

```
232e509d1   in the build prtest serves (v12)   yes
28c47dcb6   in the build prtest serves (v12)   yes
a10fe744f   in the build prtest serves (v12)   yes
e75788e4c   in the build prtest serves (v12)   yes (docs only)
a052044e7   in the build prtest serves (v12)   NO - test cleanup, no user-visible effect
```

> ⚠️ Honest caveat on that table: it comes from a branch-versus-build ancestry check done on 27 Aug. An independent attempt to confirm it by downloading the 61 JS bundles reachable from prtest index.html and main.js and grepping for the new AoW wording was INCONCLUSIVE - the relevant lazy chunk was not among them. That neither confirms nor contradicts the table. The reliable field check is the wording tell in section 4, plus the APP_VERSION stamp in the sidebar.

### Not verified - stated rather than assumed

- P2-3307 / P2-3308: the fix has NOT been confirmed on screen after deployment. Proven by 7 unit cases (3 of which fail against the old code), and the commit itself calls the bug latent rather than live in that popup. Somebody should open Screen B on prtest and click through the Science Programs and W3/Bilateral dropdowns before these move to UAT.
- P2-3306 / P2-3309: the "does not reproduce" verdict rests on ONE session on SP02, one Area of Work, one browser, on 26 Aug. Not repeated on other programs, other browsers, or by a second person. Strong evidence, not proof.
- The Cypress CT suites were NOT re-run while preparing this handover. Run npm run test:ct to confirm they are still green.

### Commands

```
cd onecgiar-pr-client
npx jest src/app/shared/components/pr-filter-multiselect
npx jest src/app/custom-fields/pr-multi-select
npx jest src/app/pages/result-framework-reporting/pages/entity-aow
npm run test:ct
```

---

## 7. Traps, collected

- Two components back the same-looking fields, split across two screens. See section 1. Always establish which screen a report came from.
- pr-filter-multiselect holds whole objects in the model unless optionValue is set (:63). Any comparison against that model must be by value - sameValue() at :78. Do not "simplify" it back to ===.
- Do NOT remove the chip gate at pr-multi-select.component.html:61. 10 of 80 instances would render every chip twice.
- RolesService.readOnly defaults to TRUE, which hides the interactive trigger entirely. Any test mounting pr-multi-select must set it to false first, or the dropdown silently never opens (pr-multi-select.selection.cy.ts:36-40).
- jsdom lays out neither :focus-within panels nor CDK virtual scroll. Selection behaviour of these dropdowns cannot be tested in Jest through the DOM - drive the methods directly, or use Cypress CT.
- pr-multi-select emits no .pr-field.mandatory marker, so a required-but-empty instance is invisible to the "N fields missing" counter. Full measurement in custom-fields/pr-multi-select/CLAUDE.md (Spanish, trap 1). Do not "fix" without reading that first.
- pr-multi-select.contract.cy.ts:133 is RED ON PURPOSE - the red is the deliverable, documenting the trap above. Do not chase it as a broken test.
- programId on the intermediate-outcomes endpoint is the code (SP05), not the numeric id.
- Two reference docs are in Spanish: docs/context-ai/conceptos.md and custom-fields/pr-multi-select/CLAUDE.md.

---

## 8. Suggested order of attack

- 1. NOTHING on P2-3306 and P2-3309 until Nicoleta answers. Both are one-line answers that decide whether there is any work at all.
- 2. P2-3307 / P2-3308 - open Screen B on prtest, click through both dropdowns, and if it behaves, move them on for testing. Closest to done.
- 3. P2-3336 - get an owner and a location for the guidance documentation. No code involved.
- 4. P2-3235 - get a yes/no from business on whether the IOs should be reflected in Section 2 at all, and in what form. No code until then.
