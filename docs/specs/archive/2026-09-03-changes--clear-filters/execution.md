# Execution Log — One visible way to clear the Overview's filters

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/clear-filters` · Prefix `CF` |
| Depth | Lite · **Approval Mode:** `pre-approved` |
| Started | 2026-09-02 |
| Leader | Opus 5 (T1) · Implementer Sonnet (T2) · Reviewer Opus (T3) — spawned on the 4th attempt, see §3 |
| Budget (design.md §6) | 1 task · ~140 LOC · 1 review round |
| Branch | `qa-development-2026` (base `45c6a12af`) |

## 2. Task Execution History

### `CF-T-1` — Add the Clear filters control — **PASS**

| Field | Value |
|---|---|
| Date | 2026-09-02 |
| Status | **PASS** (Reviewer, attempt 1 — no rework). Audited after a 4-attempt spawn blocker; the code was committed as *pending audit* in the interim (`477fa4054`) and the checkbox withheld until the PASS existed |
| Implementer attempts | 1 |
| Skills | `angular-developer`, `ui-ux-pro-max` · Effort `medium` |
| Files changed | `program-overview.component.html` (+19) · `.component.ts` (+38) · `.scope.spec.ts` (+200) — **+257/−0**, only the three named files; host untouched (Leader-verified via `git status`) |
| Tests | 221 → **235** (17 new) |

**What was built:** a `showClearFilters` computed, an `allSectionsTabRef` viewChild, and a `clearFilters()` handler; the control renders under `@if (showClearFilters())` in the filter bar, sets `activeSection` directly to `'all'`, emits `scopeChange` with `null`, and moves focus to the "All Sections" tab.

**Verification:** `npx jest …/components/program-overview` → **235/235 passed**. `npx ng lint --quiet` → clean. *(Targeted per the run's fast mode; `build:dev` deliberately not run.)*

**Implementer's `Not Done / Assumptions`, carried verbatim as owed context:**
- D4 (focus ring paints) and D5 (no overflow at the five widths) are `tasks.md` §4's HITL browser check by design — not attempted, no jest gate exists for them.
- Judgment call: `[class.ml-auto]="activeSection() === 'all'"` on the new button only, so it right-aligns whether or not "Show all sections" is also rendering, avoiding two competing `ml-auto` margins. Cosmetic; no DoD item depends on it.
- Judgment call: styled to mimic the scope-trigger chip (bordered, `h-[30px]`, `rounded-[8px]`) rather than the plain-text "Show all sections" link, because that link has **no focus-visible class at all** and copying it verbatim would fail `CF-R-3`.

### A factual error in this spec's own evidence — found during execution, authored by the Leader

`proposal.md` §3 and `requirements.md` §2 both state: *"no clear/reset button exists — verified by enumerating every `<button>` and matching `clear|reset|all`, zero matches."* **This is false.**

A pre-existing conditional control sits at `program-overview.component.html:364-369`:

```
@if (activeSection() !== 'all') { <button (click)="setActiveSection('all')">Show all sections</button> }
```

The Leader's live-page sweep used the pattern `clear|reset|limpiar|all scopes|todos` — `all scopes`, not bare `all` — so "Show all sections" never matched. It was reported to the owner as "cero coincidencias", which it was not.

**What survives the correction:** that control clears the **section axis only**, and only appears when a section is already filtered. The **scope** axis still had no visible reset — the asymmetry that motivated the spec is unchanged, and the new control is a strict superset.

**What the correction opens:** the bar now carries **three** partially-overlapping affordances — the "All Sections" tab, "Show all sections", and the new "Clear filters". `OQ-2` settled precedence between the first two only, because the third was not known to exist when the question was put to the owner. Whether that arrangement is coherent is **for the Reviewer to rule on and, if it is a gap, for the owner to settle** — it is not the Leader's to wave through, having authored the error.

**A latent defect surfaced by the same finding:** the pre-existing "Show all sections" button carries **no `focus-visible` class** (verified: zero matches in its markup) — a `CF-R-3`-class accessibility gap in code this task did not author. Recorded, not fixed here.

## 3. Reviewer spawn failure — runtime blocker, escalated

**Three consecutive attempts to spawn the `akili-reviewer` teammate failed** with `Failed to create teammate pane: Timed out waiting for the Orca runtime to respond.`

Diagnosis performed before escalating:
- `orca status --json` → app running, runtime `ready`, `reachable: true` — the runtime itself is healthy.
- `impl-cf-t1` was alive and responsive throughout, so the failure is specific to creating **new** panes.
- The Implementer pane was stopped to free capacity in case of a pane limit; the third spawn failed anyway.

This is an **environment blocker, not a work FAIL** — the diff has never been audited, so it is neither passing nor failing.

**The Leader did not review it.** `/akili-execute`'s runtime-failure table is explicit for this role: *"Reviewer — **never inline**. The Leader reviewing work it supervised breaks `author ≠ auditor`, and a runtime failure does not suspend a correctness constraint."* That constraint binds harder than usual here: the Leader authored the factual error above, so it is exactly the wrong party to rule on whether the error changes the task's validity.

Options put to the owner: a different Reviewer model, a cross-host dispatch, human review of the diff (+257, three files), or an explicit recorded waiver.

**`CF-T-1` stays `[ ]` in `tasks.md`** — the evidence is recorded, the checkbox is not earned.


## 4. Reviewer verdict — `STATUS: PASS`

Spawned successfully on the fourth attempt; the pane blocker in §3 cleared on its own. **No rework round consumed.**

> All nine DoD items verified individually against the diff and the live template — the visibility `computed()` is correct in all four state combinations, the section reset is direct and spy-locked, nothing outside the three declared files is touched, and DoD #8's synchronous `.focus()` is sound because the "All Sections" tab is provably unconditional (no control-flow block, `*ngIf`, `@defer` or `ng-template` encloses it). The Leader's factual error is confined to one evidence sentence and invalidates no requirement; the remaining findings are pre-existing, out-of-scope a11y gaps recorded as advisories.

**Nine DoD items, each verified individually rather than by summary:** the four-state predicate (plus a fifth "not in the button list" assertion); `activeSection.set('all')` + `scopeChange.emit(null)` with negative assertions on `openResults`/`openAow`; the direct-`.set()` rule locked by `jest.spyOn(setActiveSection)` + `not.toHaveBeenCalled()` — a real lock, not a comment; zero occurrences of `PROGRAMME_RESULTS_QUERY_PARAM_MAP`/`OverviewLink`/`?scope=`/any host file, and **no new imports**, so nothing hides outside the hunk; both axes' re-click behaviour asserted unchanged (`OQ-3`); native `<button type="button">`; `shadow-[…]` with negative assertions on **both** `ring-[var(--pr-focus-ring)]` and `ring-2`; DoD #8 confirmed independently; no `w-[…]`, `basis-`, or `grid-cols`, asserted negatively.

**No disqualifier triggered.** The jsdom limit is named in the suite header *and* inline; four states tested, not one; the focus destination asserted, not just the clear.

### Adjudications

**1. Does the Leader's factual error invalidate `CF-T-1`? — No.** `CF-R-1` requires *both* axes cleared in one activation and `CF-R-2` requires the control to appear when *either* is filtered; the pre-existing `Show all sections` satisfies neither. The new control is a **strict superset in every state where the old one renders**. The error is confined to one evidence sentence in `requirements.md` §2 / `proposal.md` §3 and touches no requirement, AC or DoD item — **a docs fix at archive, not `CF-T-1` rework.**

**2. Three affordances — redundant, not harmful.** No state produces an ambiguous or destructive outcome; all three are non-destructive and idempotent. But the Reviewer surfaced the precise shape, **which `OQ-2` never saw**: `showClearFilters()` is true *whenever* `activeSection() !== 'all'` — the identical predicate that gates `Show all sections`. So **"Show all sections" now never renders without "Clear filters" beside it**, and in the section-only state the two are *behaviourally identical* — two adjacent buttons, different vocabularies, same effect. They diverge only when a scope is also active. That makes `Show all sections` a subset control justifying itself in **one of four states**. *"Recording the redundancy is defensible; the cheap future fix is retiring `Show all sections`, not adding a fourth rule."*

**3. `Show all sections` has no `focus-visible` — flag-only.** §3 puts the existing controls out of scope and `CF-R-3` binds the control this task authored, which conforms. WCAG 2.4.7 is evaluated per component, so the new control's conformance is not made meaningless.

**Judgment calls — both approved.** `[class.ml-auto]="activeSection() === 'all'"` is *logically exact, not merely convenient*: it is the **negation of the same predicate** gating `Show all sections`, so the two can never drift into competing auto-margins. The chip styling lifts every value from the scope trigger at `html:281`, differentiated only by weight/size/colour appropriate to a secondary action; copying the ringless link would indeed have failed `CF-R-3`.

### `ADVISORY` (recorded, non-gating — none is a `CF-T-1` defect)

- **RELIABILITY / RISK — the focus target paints no focus indicator.** `CF-DD-5` hands focus to the "All Sections" tab, which carries `focus-visible:outline-none` (`html:205`) with **no ring replacement**. `CF-AC-4` is met *literally* — `activeElement` is the tab, not `<body>` — but after a **keyboard** clear the browser matches `:focus-visible` there and paints nothing: the user's place is preserved in the a11y tree and invisible on screen. **That is the exact harm `CF-DD-5`'s own rationale names, half-delivered.** Pre-existing and out of scope per §3. **Concrete consequence for the pending check: §4's D4 must read computed `boxShadow`/`outline` on the *tab* after an Enter-driven clear, not only on the Clear button — otherwise D4 closes green over a blind hand-off.**
- **READABILITY / RISK — ordering below 900px.** `Show all sections` is `max-[899px]:order-2` and the scope block `max-[899px]:order-3`; the new button has no `order-*`, so it defaults to `0` and joins the tabs on the first line, landing *before* `Show all sections` at 900/768. `CF-R-4` speaks to the ladder and overflow, not ordering — not a violation, but the D5 sweep should eyeball order, not only `scrollWidth === clientWidth`.
- **`CF-AC-3` rests on a structural guarantee, not the keyboard test.** The dispatched `keydown` events assert nothing (jsdom performs no default action) and the suite says so plainly. What carries the requirement is the native `<button type="button">` + `(click)` + `tabIndex !== -1`, which *is* asserted. Clears the disqualifier — but the recorded reason `CF-AC-3` passes is the element type, not the dispatch.
- **Convention miss, non-blocking:** `components/program-overview/CLAUDE.md` not updated or re-stamped (still `Verified: 2026-09-02 · 167cd2244`), which `onecgiar-pr-client/CLAUDE.md` §10 and `src/CLAUDE.md` §22 ask for in the same commit. Fold the new invariant (Clear filters, its predicate, the focus hand-off) plus the re-stamp into the close-out commit.
- **Not covered, by design:** the scenario clause *"the control disappears, because nothing is filtered any more"* is never asserted end-to-end, because `selectedScope` is a host-owned input the test never resets after the emit. That round-trip is the host's, which §3 puts out of scope; the four-state predicate test makes the disappearance follow deterministically. Recorded, not a gap worth closing.

## 5. Closing browser check (`tasks.md` §4) — **INCONCLUSIVE, reported as such**

Run by the Leader on the live app (`…/SP04/overview?scope=AOW01`, 5 real rows, `skeletons=0`). The new control is confirmed **live and correct in the DOM**: `Clear filters` present with a scope active, `Show all sections` correctly absent (section is `'all'`), the "All Sections" tab present.

**Neither D4 nor D5 could be measured in this environment. Per `tasks.md` §4 and `requirements.md` §8, that is a legitimate outcome and is recorded rather than converted into a pass.**

### D4 — focus ring: INCONCLUSIVE (paint not measurable)

| Attempt | Result |
|---|---|
| JS `.focus()` then read computed style | `:focus` **and** `:focus-visible` both `false` — the eval context does not hold page focus, so `.focus()` had no effect. Readings invalid, discarded |
| `orca keypress --key Tab` × 6 to walk to the button | Focus never moved; `activeElement` stayed on the seed element every time |
| Tab first (to set keyboard modality), then `.focus()` | Still `:focus-visible: false` |
| `orca focus --element @e29` (typed command, refs from `snapshot`) | **Focus moved correctly** (`activeElement` = "Clear filters", then the tab) — but `:focus-visible` remained `false`: programmatic focus does not satisfy the pseudo-class without keyboard modality |

The class contract is verified statically (`focus-visible:shadow-[var(--pr-focus-ring)]` present, `ring-[…]` and `ring-2` both absent, asserted negatively in jest). **What remains unproven is the paint** — exactly the gap `requirements.md` §8 D4 exists to close, and it stays open.

**The Reviewer's sharpened instruction also stands unexecuted:** D4 must read computed `boxShadow`/`outline` **on the "All Sections" tab after an Enter-driven clear**, not only on the Clear button — otherwise it closes green over a blind focus hand-off. Static reading of the tab is consistent with the advisory (`outline-style: none`, box-shadow fully transparent `rgba(0,0,0,0)`), which **supports but does not prove** that the hand-off lands on an element painting no indicator.

### D5 — layout at five widths: INCONCLUSIVE (viewport did not change)

First sweep called `orca viewport --width <n>` without `--height`; the command **failed silently** (`invalid_argument: Missing required --height`) and every reading came back at `innerWidth 1653`. Five identical readings dressed as five widths — caught before reporting, and **discarded rather than published**, because presenting them as a five-width pass would have been fabricated evidence of exactly the kind `requirements.md` §8 was written against.

Re-run with `--width <n> --height 900`: the command is accepted, but `innerWidth` **stays 1653** at every request. The tab appears bound to the Orca pane size in this session.

Conclusive from the run: at `innerWidth 1653`, `scrollWidth === clientWidth === 1635`, no overflow, control present. **That is one width, not five** — and the widths that matter (1280/1100/900, where the AoW identity column already starves) were never actually visited.

**This is achievable, not impossible:** `RGS-T-4`'s implementer successfully calibrated this same control (1333→1599, 1067→1280, 917→1100, 750→900, 640→768). The capability exists; this session could not reproduce it.

### Consequences — carried, not closed

| Item | Status |
|---|---|
| D4 paint on the Clear button | **Open** — re-run with real keyboard focus |
| D4 paint on the tab after an Enter-driven clear (Reviewer's addition) | **Open** — the check that would catch a blind hand-off |
| D5 at 1280 / 1100 / 900 / 768 | **Open** — never measured |
| Ordering below 900px (Reviewer advisory: the new button defaults to `order: 0` and lands *before* `Show all sections`, which is `max-[899px]:order-2`) | **Open** — needs the same sweep |

**`CF-T-1` is `[x]` on its Reviewer PASS, which is what the checkbox certifies.** These four items are the spec's own acknowledged blind spots, recorded here so no later reader mistakes a green jest run for coverage of them — the precise failure `requirements.md` §8 was written to prevent, and the one `changes/aow-row-gesture-split` demonstrated when jest, lint and build were all green over a live three-width layout defect.
