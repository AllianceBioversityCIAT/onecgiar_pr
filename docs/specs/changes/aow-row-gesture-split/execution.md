# Execution Log — Split the AoW row's two gestures

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/aow-row-gesture-split` · Prefix `RGS` |
| Depth | Standard · **Approval Mode:** `gated` |
| Started | 2026-09-02 |
| Leader | Opus 5 (T1) · Implementer Sonnet (T2) · Reviewer Opus (T3) — author ≠ auditor held |
| Budget (design.md §8) | 4 tasks · ~230 LOC (≈130 prod / ≈100 tests) · **1 review round** |
| Branch | `qa-development-2026` (base `ca39bcf32`) |

### Standing condition — concurrent session in this checkout

From partway through `RGS-T-1`, a **second session has been writing to this same working tree**: `dashboard-lab.component.ts` (still modified at the time of writing), `shared/components/footer/footer.component.spec.ts` (since cleared), and a new untracked `docs/specs/bugfix/overview-drilldown-filters/`. This breaks root `CLAUDE.md`'s concurrency rule (*one AKILI session per checkout; extra sessions on `git worktree`*).

Consequences, recorded because they change what the evidence in this log means:

- The full-directory command named in `tasks.md` (`npx jest … dashboard-lab`) produces **4 failures that are not this spec's** — `link.origin: 'W1/W2'` mismatches originating in the other session's `dashboard-lab.component.ts`. Verified by the Leader against `git status`, not taken on the Implementer's word.
- Verification for `RGS-T-1` was therefore run **scoped** to `…/components/program-overview` (206/206). The Reviewer independently ruled the scoped run sufficient for this task: the three touched files are confined to `program-overview/`, the component is purely presentational, and the diff changes no input/output surface, so the host binding at `dashboard-lab.component.html:1163` cannot be affected.
- Every diff handed to the Reviewer was **path-scoped** to `program-overview/`, so no foreign change entered the audit.
- **Any commit for this spec must stage its three paths explicitly.** A bare `git commit -a` here would sweep up the other session's work.

## 2. Task Execution History

### `RGS-T-1` — The AoW code+name becomes a real control — **PASS**

| Field | Value |
|---|---|
| Date | 2026-09-02 |
| Status | **PASS** (Reviewer, attempt 3) |
| Implementer attempts | **3** |
| Skills assigned | `angular-developer`, `ui-ux-pro-max` |
| Effort | attempt 1 `high` → attempt 2 `xhigh` → attempt 3 `xhigh` (held: a one-line restore does not earn `max`, and `max` on a T2 tier is forbidden — escalate the tier instead) |
| Requirements covered | `RGS-R-3`, `RGS-R-6` · Design `RGS-DD-1`, `RGS-DD-3`, `RGS-DD-5` |
| Files changed | `program-overview.component.html` (+66/−21 incl. rationale comments) · `program-overview.component.ts` (+13) · `program-overview.scope.spec.ts` (+138/−1) |

#### Attempt 1 — Reviewer `FAIL` (1 issue)

Implemented: native `<button type="button">` at both row sites; achievement glyph kept a sibling; `aowFilterAriaLabel(row)` helper; skeleton↔row parity guard extended to assert the skeleton also carries a `BUTTON`; 6 new tests. Two pre-existing tests retargeted because `identityBlock.querySelector('button')` began matching the new button first.

Verification: `npx jest … dashboard-lab` → 740/740 · `npx ng lint --quiet` clean · `npm run build:dev` clean.

Reviewer cleared **all eight named traps** (no `role="button"`, no role on the row, glyph not nested, `focus-visible:shadow-[…]` not `ring-[…]`, no fixed width, no "open" in the name, ladder untouched, no `RGS-T-2` scope creep) and verified **element-by-element** that the parity guard was extended, not bypassed: `button.max-[1101px]:inline-flex` resolves to the same element the original `querySelector('button')` resolved to, all original assertions survive verbatim, the skeleton test gained four assertions and lost none.

**FAIL — Issue 1 (WCAG 2.5.3 name-in-name).** The subline was kept inside the button *and* the button carried `[attr.aria-label]`, which **replaces** the content-based name. Composed name would have been `"Filter by Area of Work AOW02 — Accelerated Breeding"` while the control visibly contained `"3 KPIs remaining"` — silently dropping the row's only statement of remaining work from the screen-reader experience. An accessibility defect *introduced by an accessibility task* — the "fixed one defect, introduced another" failure `RGS-DD-1` cites twice — and it contradicts `requirements.md` §4, which promises the screen-reader persona a gain, not a trade. Violated rule: `requirements.md` §7 (2.5.3), compounded by the component's own documented convention at `program-overview.component.html:285-289`, established as a Reviewer finding in the immediately preceding spec: *"never `[attr.aria-label]`, which would REPLACE it and risk WCAG 2.5.3"*. The diff did the rejected thing, in the same file, without naming the departure.

**Three declared judgment calls, adjudicated:**

1. **Skeleton button carries `disabled`** — **approved.** The skeleton list is already `aria-hidden="true"`; a focusable button inside an `aria-hidden` subtree is literally the violation `RGS-DD-7` exists to avoid. Layout-bearing classes are byte-identical across both sites, so `RGS-DD-5` parity is served, not violated.
2. **"Enter and Space both activate" not literally tested** — **accepted as an honest substitute.** jsdom does not translate a button `keydown` into a `click` (no JS-level default action; verified empirically by the Implementer), and `RGS-T-1` deliberately wires no `(click)`. Enter/Space on a native `<button>` is a UA guarantee, not our code; the only ways this diff could defeat it are exactly what is asserted (`disabled`, `tabIndex`, swallowed click). The gap is named in the test title. Residue tracked as a forward pointer below.
3. **Subline kept inside the button** — **placement approved**, the `aria-label` on top of it was the defect (Issue 1).

#### Attempt 2 — Reviewer `FAIL` (1 issue)

Remediation applied exactly: `[attr.aria-label]` dropped; `<span class="sr-only">{{ aowFilterVerb }}</span>` added as the button's first child; `aowFilterAriaLabel(row)` retired for `readonly aowFilterVerb = 'Filter by Area of Work'`. Subline left in place.

Composed accessible name, verified: `"Filter by Area of Work AOW02 Accelerated Breeding 3 KPIs remaining"` — filter verb present, no "open", **every** visible string contained. Reviewer confirmed it is the `:291` house pattern proper and not an approximation, that the `sr-only` span is `position:absolute` so it adds no layout surface (no `KZ-OAH-1` exposure), and that nothing previously cleared regressed.

**FAIL — Issue 1 (a ladder guard silently weakened).** The tautology fold — applied on the Leader's relay of the Reviewer's own round-1 READABILITY advisory — removed **two** assertions where only one was tautological. `max-[1101px]:inline-flex` was genuinely redundant (the selector requires it). `hidden` was **not**: it is an independent class the selector does not require, and without it the fallback glyph renders at all widths while the achievement cell is simultaneously visible at ≥1101px — two hoverable tooltip hosts at once, the exact defect the surviving comment still claimed to guard. No other test covered it. Violated rule: `design.md` `RGS-DD-3` read with the `RGS-T-1` DoD "extended, not bypassed".

**Leader note, recorded rather than buried:** this round was **caused by the review process, not by the spec or the Implementer**. The Reviewer's round-1 advisory was imprecise and the Leader relayed it without examining whether both folded assertions were in fact redundant. The Reviewer identified and corrected its own error unprompted. The correct lesson is not "the Implementer over-applied" — it is that an `ADVISORY` relayed into a rework brief inherits none of the scrutiny a FAIL issue gets, and should.

#### Attempt 3 — Reviewer `PASS`

Restored `expect(fallback.className).toContain('hidden');` with a comment distinguishing it from the folded tautology. Nothing else touched — Reviewer confirmed via blob hashes that `.html` (`6ab47dfa2`) and `.ts` (`5eb605494`) are byte-identical to attempt 2, and that the restored line appears as **unmodified context**, i.e. the pre-existing assertion was preserved in place rather than deleted and re-added.

**Final verification:** `npx jest …/components/program-overview --silent --reporters=summary --no-coverage` → **Test Suites 4 passed / Tests 206 passed**. `npx ng lint --quiet` → clean. *(Scoped run — see the standing condition in §1.)*

**Reviewer summary:** *"`RGS-T-1` conforms: `RGS-R-3`/`RGS-R-6` met, `RGS-DD-1`/`DD-3`/`DD-5` honoured, the 2.5.3 name composes via the `:291` house pattern, and the `OSF-T-2b` ladder guard is extended rather than bypassed or weakened."*

#### `ADVISORY` findings (4R lens — recorded, non-gating)

- **RELIABILITY** — a third row-click test now exists and `RGS-T-2` must re-point it (forward pointer 1 below).
- **RELIABILITY** — the Enter/Space residue currently lands in no task's DoD (forward pointer 2 below).
- **READABILITY** — the tautology fold; escalated into attempt 2's FAIL and resolved there.
- **SCOPE / EVIDENCE** — the 206/206 scoped run is sufficient evidence for `RGS-T-1`; standing condition recorded in §1.

### Forward pointers — carry into `RGS-T-2`'s brief

Surfaced by the Reviewer during `RGS-T-1`. **These are obligations, not advisories to file and forget** — `RGS-T-2`'s own disqualifier is "a green suite whose row-click test was deleted rather than re-pointed", and the first item is a third instance of exactly that class, created by `RGS-T-1` itself:

1. **A third row-click test now exists.** `program-overview.scope.spec.ts`, in the new `RGS-T-1` describe block, asserts `component.openAow` emits `['AOW02']` when a click bubbles from the identity button to the row. `RGS-T-2` reverts that premise. `RGS-T-2`'s DoD names only `oah-hero.spec.ts:379-401` and `component.spec.ts:932`; this test must be **added to that obligation list and re-pointed, not deleted**.
2. **The Enter/Space residue lands nowhere as written.** `tasks.md` §5 assigns "keyboard user can operate the row" to `RGS-T-1` (jest) + `RGS-T-4` (**visible ring only**), and `RGS-T-4`'s DoD carries no bullet for a physical Enter/Space press. `RGS-T-2` closes it cheaply: once `(click)` is wired, `button.click()` in jsdom proves the handler a real Enter/Space would reach. State it in `RGS-T-2` explicitly rather than leaving it implied.

## 3. Budget Tripwire — **TRIPPED** after `RGS-T-1`

| Signal | Budget (design.md §8) | Actual after 1 of 4 tasks | Status |
|---|---|---|---|
| Review rounds | **1** | **3** (2 reworks) | ❌ **exceeded** |
| LOC | ~230 total (≈130 prod / ≈100 tests) | 196 insertions / 21 deletions — tests alone **138 vs ~100 budgeted for the whole spec** | ⚠️ 85% consumed, 3 tasks remain |
| Tasks | 4 | 1 complete | on track |

**Cause, honestly attributed:** round 2 was a real defect the budget should have anticipated (an a11y task tripping an a11y rule the same file already documents). Round 3 was **process-inflicted** — a Leader-relayed advisory that had not been examined. Only round 2 is evidence the spec was mis-sized.

On LOC: this component's house style is densely commented and the Reviewer treated the rationale comments as required, not padding; a meaningful share of the 196 is comment and test, not production logic. Production insertions are ~79, of which roughly half are comments.

**Escalated to the user at the `RGS-T-1` gate rather than absorbed.**
