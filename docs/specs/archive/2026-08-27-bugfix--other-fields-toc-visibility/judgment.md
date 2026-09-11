# Judgment Day — `design.md` review (round 1)

**Target:** `docs/specs/bugfix/other-fields-toc-visibility/design.md`
**Context:** `requirements.md`, `proposal.md`, and the real source files under `onecgiar-pr-client/src/app/pages/...`
**Protocol:** two blind, independent, read-only judges (model: opus; author model: sonnet)

## Totals

| | Judge A | Judge B |
|---|---|---|
| SEVERE | 3 | 4 |
| WARNING | 7 | 6 |
| SUGGESTION | 4 | 4 |

## Confirmed by BOTH judges — SEVERE (candidates for round-one correction)

### C-1 — Relabeling in place produces a duplicated/stacked label in the empty-ToC branch

Both components already render an `app-pr-field-header` (or `<p>` heading) carrying the *primary* field's label **inside the same `@else` branch**, before the auto-activated dropdown. Changing only the dropdown's `label=` (as §6.2 prescribes) does not remove or reconcile that pre-existing header — the user sees the same label twice, stacked, with the orange note in between. Confirmed independently against the actual template *and* the committed Jest snapshot (`aow-hlo-create-modal.component.spec.ts.snap`, which literally renders both labels back-to-back).

- Judge A: W-1 (rated WARNING)
- Judge B: S3 (rated SEVERE)
- **Verdict:** same defect, found independently by both from real code before either saw the other's output — genuine corroboration. Taking the more cautious severity: **SEVERE** (design as written ships a visibly broken UI, defeating the ticket's own intent).
- Sites: `rd-contributors-and-partners.component.html:119`+`165`, `:319`+`340`; `aow-hlo-create-modal.component.html:214`+`238`, `:265-269`+`312-327`.

### C-2 — The aow "Science Programs" empty-state target is not an `app-pr-multi-select` with a `label` attribute

§6.2 tells the implementer to change a `label=` on an `app-pr-multi-select`, for both the Centers and Science branches of `aow-hlo-create-modal`. That's correct for Centers (`:238`). For Science, the string lives on a **separate `app-pr-field-header`** (`:313-317`) and the picker itself is **`app-pr-filter-multiselect`** (`:319-327`), which has no `label` input at all — only `placeholder`. The instruction is not executable as written for this branch, and §6.3's a11y claim ("the `label` attribute continues to provide the programmatic label") is false for this control.

- Judge A: S-2 (SEVERE)
- Judge B: S2 (SEVERE)
- **Verdict:** CONFIRMED SEVERE — identical finding, same evidence (both cite the same snapshot line).

### C-3 — `lab-report-form.component.spec.ts` already exists; the design's premise is false

§10 states the spec "does not exist" and frames the regression test as "new … first coverage for this branch." In reality the file exists (~300+ lines, ~26-30 tests across 9 `describe` blocks), and already has tests directly adjacent to the code path being changed (e.g. a test asserting what happens when the "Other(s)" sentinel is deselected). The task is to **extend** an existing suite — including checking for collisions with existing assertions — not author a new one.

- Judge A: S-3 (SEVERE)
- Judge B: S1 (SEVERE)
- **Verdict:** CONFIRMED SEVERE — identical finding, independently verified via directory listing + grep.

## Single-judge — SUSPECT (recorded, not auto-fixed; surfaced for explicit decision)

### SP-1 (Judge A only) — Relabeling breaks the `OTV-AC-7` regression guard for the non-empty-ToC opt-in case

In both `rd-contributors-and-partners` and `aow-hlo-create-modal`, **one single element** (one `@if` block, one `app-pr-multi-select`) serves *both* branches of the disjunction `showOtherCenters() || !hasReferenceCenters()` — the auto-activated empty-ToC case AND the user-opted-in "Other(s)" case when the ToC *did* return centers. §6.2's instruction to change the static `label=` attribute relabels **both** cases identically, since there is no conditional in the design. That means after this fix, a user who manually opts into "Other(s)" on a ToC-populated node would see the relabeled (non-"Other(s)") text too — directly violating `OTV-AC-7`, which requires the non-empty-ToC opt-in flow to stay **unchanged**.

Not independently confirmed by Judge B (Judge B's equivalent checks — the `@if` line-number/condition verification — passed without flagging this consequence).

**This is flagged as a likely-real, high-impact issue despite being single-judge** — it directly contradicts a MUST-unchanged requirement (`OTV-AC-7`) and the mechanism (one element, one static label serving two branches) is a plain reading of the same code both judges reviewed. Recommend treating as if confirmed pending explicit user sign-off, since leaving it unaddressed would ship a regression the spec explicitly guards against.

### SP-2 (Judge B only) — `lab-report-form` has no ToC-reference reconciliation effect; async resolution can leave orphaned "Other(s)" selections submitted silently

`tocCenters()` / `tocSciencePrograms()` populate asynchronously (`.then()` / `subscribe()`). Until they resolve, the new `hasReferenceCenters()`/`hasReferenceScience()` are transiently `false`, so the new auto-activated dropdown renders even for indicators that do have ToC matches; when the async data lands and flips the computed to `true`, the auto-activated dropdown unmounts but nothing clears `otherCentersSelected()`/`otherScienceSelected()`, and those stale values still flow into the save payload. `rd-contributors-and-partners` has explicit reconciliation effects (`preselectCentersEffect`, `preselectScienceEffect`) for exactly this kind of drift; `lab-report-form` has no equivalent, and design.md's "No change" row for `lab-report-form.component.ts` forecloses adding one.

Not independently confirmed by Judge A (Judge A checked a related but distinct scenario — the *static* empty-ToC state — and correctly found no wipe there; Judge A did not examine the async transition).

**Recorded as suspect.** Real risk if true, but scoped to a race condition that may or may not be reachable within one drawer session depending on how fast the two async calls resolve relative to first paint — needs a decision on whether to address now or accept as a known gap.

## Confirmed by BOTH judges — WARNING (info; not auto-fixed per protocol, but should inform round-one correction and/or tasks.md)

- **W-A — Label-string drift for "Science" across the three components** violates the `Consistency` NFR (`requirements.md` OTV-R- "Consistency" row): real primary labels differ verbatim per component ("Contributing Science Program/Accelerator" vs "…Programs/Accelerators" vs "Contributing Science Programs"), and `OTV-DD-2` only commits to one string without resolving the other two. *(A: W-3, B: W2)*
- **W-B — `noCentersNote`/`noScienceProgramsNote` (and the two info-note strings) already exist in `lab-report-form.component.ts`.** §6.2's "Add" instruction is a false premise — only the two `hasReference*` computeds and the template branches are actually missing. *(A: W-2, B: W1)*
- **W-C — Jest snapshot filename is wrong in two places** (`design.md:101,134`): the folder is `aow-hlo-table-create-modal/`, but the file is `aow-hlo-create-modal.component.spec.ts.snap` (no "table-"). The substance of the claim (needs regeneration, contains both old labels) is correct — only the filename string is wrong. *(A: W-6, B: W6)*
- **W-D — Budget is under-estimated** given C-1/C-2/C-3 (and SP-1/SP-2 if in scope): realistic LOC is materially above the stated ~60-90, and "1 review round" is optimistic. *(A: W-7, B: W5)*

## Single-judge — WARNING (info only)

- Judge A only: selector collision risk after renaming (`zoneless.spec.ts:174` vs the existing `:265` `dropdown1()` selector would become identical strings post-relabel if the same primary-label string is reused) (W-4); placeholders still say "Other…" even after label fix (W-5).
- Judge B only: a11y "no change" claim is over-broad specifically for `lab-report-form`, where DOM presence/absence genuinely changes in the empty-ToC state (W4); adding `label=` to `lab-report-form`'s dropdown reverses that component's own documented "no label chrome" convention without an ADR (W3, overlaps with C-1's mechanism).

## Suggestions (info only, from either judge)

CLAUDE.md re-stamp scope is "two of three" not "each" (aow modal folder has no CLAUDE.md); the `optionValue` risk called out in design.md §13 is moot (no new dropdown is created in `lab-report-form`, only re-gated); `design.md`'s Science "was" label under-states the real aow string (has "/Accelerator(s)" suffix); a dangling cross-reference to "OTV-R-" NFR row with no number; `showOtherCenters`/`showOtherScience` in `rd-contributors-and-partners` are getters (no `()` needed in templates), not computeds as design.md's diagram implies; `OTV-AC-1`'s scenario names `app-pr-multi-select` generically but the aow Science control is `app-pr-filter-multiselect`.

## Decision needed

Per protocol: **both judges confirmed C-1, C-2, C-3 as SEVERE** → round-one correction is warranted, pending your go-ahead. **SP-1 is single-judge but directly contradicts a MUST-unchanged requirement** (`OTV-AC-7`) and is recommended for inclusion in the same correction pass. SP-2 is a real but more speculative risk (timing-dependent) — recommend explicit accept-as-gap-or-fix-now decision rather than silent inclusion or silent drop.

## Round 1 correction — applied (user approved: "Sí, inicie la ronda de corrección")

`design.md` was corrected in place (not re-authored from scratch) — §1, §2.2, §6.2, §6.3, §10, §12 (`OTV-DD-1`, `OTV-DD-2`), §13, and the Budget section. Disposition per finding:

| Finding | Outcome |
|---|---|
| C-1 (duplicate/stacked label) | **fixed** — redundant `app-pr-field-header` removed from both components' `@else` branches; the auto-activated control now carries the label itself (conditionally). |
| C-2 (aow Science target is field-header + unlabeled filter-multiselect, not a labeled multi-select) | **fixed** — mechanism corrected to wrap the field-header itself in `@if (hasReferenceScience())`, not a nonexistent `label` on `app-pr-filter-multiselect`. |
| C-3 (`lab-report-form.component.spec.ts` already exists) | **fixed** — §10 rewritten to "extend existing suite," names the specific existing test (sentinel-deselection, near `removable chips`) to re-check for collision. |
| SP-1 (static relabel breaks `OTV-AC-7` opt-in case) | **fixed** — folded into the C-1/C-2 conditional-binding mechanism: label/header now resolves to "Other(s)…" exactly when `hasReferenceCenters()`/`hasReferenceScience()` is `true` (the genuine opt-in case), preserving `OTV-AC-7` by construction. |
| SP-2 (lab-report-form async ToC-resolution race) | **not fixed — recorded as an explicit accepted risk** in §13, per the "accept-as-gap" option (user did not request a fix; default taken given it is speculative/timing-dependent and would require new reconciliation logic beyond Lite-depth scope). |
| W-A / W2 (Science label drift across 3 components) | **resolved by decision, not by unifying strings** — `OTV-DD-2` revised to scope the "Consistency" NFR as per-component (empty-state matches that component's own primary label), explicitly not a forced cross-component string; documented as intentional, with unification recorded as a separate out-of-scope follow-up. |
| W-B / W1 (note constants already exist in lab-report-form) | **fixed** — §6.2 row rewritten as "Do NOT add," reuse existing constants. |
| W-C / W6 (snapshot filename typo) | **fixed** — corrected to `aow-hlo-table-create-modal/__snapshots__/aow-hlo-create-modal.component.spec.ts.snap` throughout. |
| W-D / W5 (budget under-estimated) | **fixed** — Budget section revised to 5 tasks / ~130-170 LOC / 1-2 review rounds, with an explicit note that this is near the Lite/Standard boundary. |
| Judge A W-4 (selector collision risk after rename) | **addressed as a non-issue, with reasoning recorded** — §10 now explains why `zoneless.spec.ts:174`'s new selector does not collide with `dropdown1()` (mutually exclusive DOM states), rather than silently dropping the concern. |
| Judge B W3 / part of C-1 (adding `label=` to lab-report-form reverses its documented no-label convention) | **fixed** — design now explicitly does NOT add a `label` to `lab-report-form`'s controls; only `placeholder` becomes conditional. |
| Judge B W4 (a11y "no change" claim over-broad) | **fixed** — §6.3 a11y claim now scoped per component instead of one blanket statement. |
| Suggestions (G1-G4, both judges) | **info only, not individually re-verified in round 1** — folded implicitly where the same edits already touch them (e.g. the corrected control-type references in §6.2/§6.3 resolve the `app-pr-multi-select`-vs-`app-pr-filter-multiselect` suggestion); CLAUDE.md re-stamp scope note ("two of three, verify at task time") added to `OTV-DD-1` consequences. |

**Next step:** scoped re-judgment — both judges review only the frozen ledger above plus this fix delta (not the full `design.md` again), per protocol.

## Round 2 — scoped re-judgment (max 2 rounds total; this is the 2nd)

| | Judge A | Judge B |
|---|---|---|
| SEVERE | 0 | 2 |
| WARNING | 6 | 3 |
| SUGGESTION | 4 | 4 |

Both judges independently traced the corrected mechanism end-to-end (empty-ToC render for all 4 fields, both components) and confirmed: no duplicate label renders, no control goes orphaned/unreachable, `OTV-AC-7` (opt-in case preserved) holds by construction, `lab-report-form`'s existing spec/constants claims are accurate, and the snapshot-path correction is accurate. **The core round-1 fix mechanism is sound.**

### Judge B SEVERE (single-judge — not confirmed by Judge A, but high-confidence and evidence-backed; not auto-fixed per protocol, presented for decision)

- **RB-S1 — Angular property binding (`[label]="…"`) does not reflect as an HTML attribute; the prescribed test-selector fix (`app-pr-multi-select[label="…"]`) will never match once §6.2's static-`label`→bound-`[label]` change lands, regardless of the string used.** Evidence: the committed snapshot shows a static `label="…"` renders as a literal DOM attribute on the host element, while the same value delivered as a resolved property only appears as text inside a nested `.pr_label` div — no attribute. This affects `zoneless.spec.ts:174` (design's own prescribed fix for it) AND the new §10 assertions ("no duplicate `app-pr-field-header` is present" — Judge B's W2 notes this specific assertion is also mis-shaped, since `app-pr-multi-select` always nests its own `app-pr-field-header`). **Not found by Judge A** — Judge A traced the *value* the conditional expression resolves to (confirmed correct) but did not check whether that value reaches the DOM as a matchable attribute.
- **RB-S2 — `design.md`'s own §6.3 prose mis-describes `hasReferenceCenters`/`hasReferenceScience` in `rd-contributors-and-partners` as parenthesis-less getters ("template calls them without `()`") when they are actually `computed()`s requiring `()`** (only `showOtherCenters`/`showOtherScience` are the parenthesis-less getters — round 1's correction over-generalized a suggestion that was originally scoped correctly). This self-contradicts other rows in the same document (§6.2 rows correctly use `hasReferenceCenters()`). An implementer trusting the mis-stated row over the correct rows could write `[label]="hasReferenceCenters ? … : …"` (a function reference, always truthy) — a silent no-op that ships `OTV-R-1`/`OTV-R-2` unfixed. **Not found by Judge A** — Judge A used the correct parenthesized form throughout its own trace (checkpoint 4) without flagging that `design.md:75`'s prose contradicts it.

### Confirmed-by-both WARNING (info; both judges independently found the same substance)

- Removing the `@else` field-header in the Centers branches (both components) **does** remove a DOM element, which W-1(A)/W2(B, partial) both note conflicts with §6.3's blanket "DOM presence unchanged" a11y claim for that specific sub-case (the claim was already scoped correctly for aow Science in round 1, but the same scoping was not extended to the Centers header-removal).
- `OTV-DD-2`'s per-component reuse decision leaves `lab-report-form`'s placeholder strings (`'Select center(s)'`, `'Select Science Program/Accelerator'`) **invented from `rd-contributors-and-partners`'s vocabulary**, not `lab-report-form`'s own ("Add another center…" / "Add another programme…") — both judges independently flag this as contradicting `OTV-DD-2`'s own stated rejection of "a distinct fourth label invented for the empty case." (A: W-5; B: G2)
- `requirements.md`'s NFR/scenario text (`OTV-R-10`, the Accessibility NFR row, `OTV-AC-1`'s literal "`app-pr-multi-select`… shown" wording) was never amended to reflect that the corrected mechanism produces genuinely different empty-state affordances per component (labeled dropdown / no-label-at-all / placeholder-only) — both judges flag this as a requirements↔design sync gap, not just a design internal-consistency issue. (A: W-6; B: W1/W3)

### Decision needed (round 2 is the last permitted scoped re-judgment; one more bounded fix round is still allowed before final verification)

RB-S1 and RB-S2 are single-judge but both are concrete, evidence-backed, low-risk-to-fix documentation/mechanism corrections (not design reversals) — RB-S1 needs the test-selector strategy changed to something that survives property binding (e.g. add a `data-testid`, or select on `.pr_label` text), and RB-S2 is a one-line prose fix (remove `hasReferenceCenters`/`hasReferenceScience` from the "getters, no parens" parenthetical — they were never getters). Recommend folding both into one final bounded correction, then closing with independent final verification rather than a third full judge pair (protocol caps re-judgment at 2 rounds).

## Round 2 correction — applied (final bounded fix round, 2nd of max 2; no further re-judgment per protocol)

| Finding | Outcome |
|---|---|
| RB-S1 (`[label]` binding doesn't reflect as a DOM attribute; label-attribute test selectors can't work) | **fixed** — added `data-testid="toc-other-centers"` / `"toc-other-science-header"` hooks (§6.2) purely for test selection; `zoneless.spec.ts:174`'s fix instruction (§10, §12 `OTV-DD-1`) rewritten to select on the testid, not the label attribute; `aow-hlo-create-modal.component.spec.ts`'s new assertions (§10) rewritten to the same strategy, with the "no duplicate header" assertion reshaped per Judge B's W2 (an `app-pr-multi-select` always nests its own internal header — the correct check is "no sibling header outside the testid'd element"). |
| RB-S2 (`design.md` self-contradicts on whether `hasReferenceCenters`/`hasReferenceScience` need `()`) | **fixed** — §6.2's `rd-contributors-and-partners.component.ts` row now states precisely that only `showOtherCenters`/`showOtherScience` are parenthesis-less getters; `hasReferenceCenters`/`hasReferenceScience` are `computed()`s requiring `()`, matching every other row's usage. |
| Confirmed-both WARNING: Centers `@else` header removal not reflected in the a11y "unchanged" claim | **fixed** — §6.3's Centers bullet corrected to acknowledge the removed header, matching the treatment already given to the aow-Science case. |
| Confirmed-both WARNING: `lab-report-form` placeholder fallback strings invented from `rd-contributors-and-partners`' vocabulary, contradicting `OTV-DD-2`'s own "no invented copy" stance | **fixed** — §6.2's two `lab-report-form` rows now reuse this component's own existing placeholder text ("Add another center…" / "Add another programme…") as the empty-case fallback, instead of borrowed strings. |
| Confirmed-both WARNING: `requirements.md` (`OTV-R-10`, Accessibility NFR, `OTV-AC-1`/`AC-4` literal control-type wording) not amended to reflect the corrected per-component mechanism | **fixed** — `requirements.md` amended: `OTV-R-10` gained an amendment note: `OTV-AC-4` rewritten to name the correct control (`app-pr-filter-multiselect`, no `label`) instead of implying `app-pr-multi-select`; Consistency and Accessibility NFR rows rescoped to match `OTV-DD-2`. |
| Judge A's misquoted `CLAUDE.md` citation (S-1/suggestion) | **fixed in passing** — §6.2's `lab-report-form` Centers row no longer cites the `selectedLabel` line as the reason for no `label`; states the real reason (duplicates the `<p>` heading). |
| New accepted gap surfaced by the correction itself: `lab-report-form.component.spec.ts` renders no DOM (template overridden to `''`) and has no Cypress spec — no automated DOM-level check exists for its empty-state branch, before or after this fix | **recorded, not fixed** — added to §10 as an explicit pre-existing gap this fix inherits, not introduces. Manual/browser verification is the only DOM-level check available for this one component. |
| Judge B's remaining round-2 SUGGESTIONs (G1 scope-of-SP2 note re: aow having the same async-race shape; G3 reading-order change; G4b DOM-presence nuance) | **left as info** — genuinely minor/cosmetic per protocol ("WARNING/SUGGESTION rows remain info"); not blocking. |

## Terminal verification (independent, post round-2 fix — no third judge pair, per the 2-round cap)

Re-read the full corrected `design.md` end-to-end for internal consistency after all round-1 and round-2 edits: §1 Summary, §2.2 diagram, §6.2 table, §6.3 a11y, §10 testing plan, §12 DDs, §13 gaps, and the Budget all now describe the **same** mechanism (conditional label/header binding + `data-testid` test hooks + component-native placeholder fallbacks) with no remaining internal contradiction found. `requirements.md` amended to match. Both confirmed-severe finding sets (round 1: C-1/C-2/C-3; round 2: RB-S1/RB-S2) are addressed; all confirmed-both WARNINGs from both rounds are addressed; remaining items are single-judge SUGGESTIONs or the one explicitly accepted risk (SP-2, lab-report-form async race — documented, not fixed, by deliberate decision).

**JUDGMENT: APPROVED ✅**

- Target: `docs/specs/bugfix/other-fields-toc-visibility/design.md` (+ `requirements.md` amendment)
- Rounds: 2 of 2 max (both used)
- Confirmed SEVERE (both judges): 3 (round 1: C-1, C-2, C-3) — all fixed
- Suspect SEVERE (single judge, fixed anyway on evidence strength): 3 (round 1: SP-1 — fixed; round 2: RB-S1, RB-S2 — fixed)
- Accepted risk (single judge, deliberately not fixed): 1 (SP-2)
- Confirmed WARNING (both judges, addressed): 7 across both rounds
- Contradictions between judges: none — both judges agreed on every checkpoint they both examined; differences were coverage (one judge checking something the other didn't), never disagreement on a shared claim.
