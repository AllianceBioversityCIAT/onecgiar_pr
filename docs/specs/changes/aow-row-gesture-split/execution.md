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
- **The scoped run is a temporary concession, not a standing excuse.** Recorded at the `RGS-T-1` Reviewer's own insistence: scoping was defensible *only* because this component is purely presentational and no host binding changed. **The full `dashboard-lab` suite must be green again before `RGS-T-4` and before archive** — the other session's `link.origin: 'W1/W2'` failures are to be re-checked once that session lands, never carried forward as permanently excused. If a later task narrows its verification the same way, it must re-earn the concession rather than inherit it.

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
| Review rounds | **1** | **3** on `RGS-T-1`, **1** on `RGS-T-2` | ❌ **exceeded on `T-1`; `T-2` was clean** |
| LOC | ~230 total (≈130 prod / ≈100 tests) | **~443 insertions / 60 deletions** after 2 of 4 tasks | ❌ **~192% of budget, `RGS-T-3` (largest remaining) unstarted** |
| Tasks | 4 | 2 complete | on track |

**Cause, honestly attributed:** round 2 was a real defect the budget should have anticipated (an a11y task tripping an a11y rule the same file already documents). Round 3 was **process-inflicted** — a Leader-relayed advisory that had not been examined. Only round 2 is evidence the spec was mis-sized.

On LOC: this component's house style is densely commented and the Reviewer treated the rationale comments as required, not padding; a meaningful share of the 196 is comment and test, not production logic. Production insertions are ~79, of which roughly half are comments.

**Escalated to the user at the `RGS-T-1` gate rather than absorbed; the owner elected to continue.** Re-confirmed at the `RGS-T-2` gate as a second data point: `RGS-T-2` itself was clean (1 attempt, 0 reworks), so the overrun is **size, not rework churn**. The LOC estimate, not the execution, is what was wrong — and `RGS-T-3` is the largest remaining task.

---

### `RGS-T-2` — Split the gestures, and render the selected state — **PASS**

| Field | Value |
|---|---|
| Date | 2026-09-02 |
| Status | **PASS** (Reviewer, attempt 1 — no rework) |
| Implementer attempts | **1** |
| Skills assigned | `angular-developer` |
| Effort | `high` |
| Requirements covered | `RGS-R-1`, `RGS-R-2`, `RGS-R-4` · Design `RGS-DD-2`, `RGS-DD-4`, `RGS-DD-6` · `RGS-AC-1`, `RGS-AC-2`, `RGS-AC-4` |
| Files changed | `program-overview.component.html` (+35/−4) · `.component.ts` (+25/−7) · `.scope.spec.ts` (+158/−?) · `.oah-hero.spec.ts` (+56/−21) · `.component.spec.ts` (+12/−1) — **+247/−39** |
| Tests | 206 → **213** |

#### What was built

Row body `(click)` reverted from `openAow.emit(row.code)` to `selectScope(row.code)`; the identity button gained its own `(click)="onSelectAowRow(row, $event)"` and `[attr.aria-pressed]`. Selected state is a `[class]` toggle carrying `border-2` in **both** branches (`--pr-color-primary-300` ↔ `transparent`). One new method, `onSelectAowRow` — `stopPropagation()` then `selectScope`.

**Leader pre-check before the audit:** diffed `.component.ts` with comments filtered out. The only logic addition is `onSelectAowRow`; `onOpenAowRowAction` and `onReportAowRow` bodies are untouched, so DoD 2's "guards preserved, not rewritten" holds literally. The Reviewer independently confirmed at `:455-458` and `:671-675`.

#### The disqualifier, discharged

`RGS-T-2`'s named disqualifier is *"a green suite whose row-click test was deleted rather than re-pointed — the test count must be explained, never absorbed."* The Reviewer verified the arithmetic **independently** rather than accepting the report: `rg '^\s*it\('` across the four spec files returns 57 + 16 + 60 + 80 = **213**, against a 206 baseline; the new `RGS-T-2` describe contributes exactly **7**; every removed `it(` line has a matching added one — three renames, **zero deletions**.

Three row-click tests re-pointed, each with a **real negative half** (not merely asserting the new behaviour, but that the old one no longer fires):

| Test | Old premise | New premise |
|---|---|---|
| `oah-hero.spec.ts:379` | row click → `openAow(['AOW02'])` | row block asserts `openAow === []`; Report and `→` still assert `openAow === ['AOW02']`, each now also `scopeEmitted === []`. Net **+3 assertions, −1** (the deliberately reverted premise) |
| `scope.spec.ts` `RGS-T-1` Enter/Space | click bubbles to row → `openAow` | `scopeChange === ['AOW02']` **and** `openAow === []`, on a `detail: 0` MouseEvent |
| `component.spec.ts:932` | claimed a row-click guard | title/comment updated, premise flagged vacuous, `KZ-OAH-3` note names the surviving assertion (`expect(emitted).toEqual(['AOW02'])`); logic byte-identical |

**Both forward pointers from `RGS-T-1` discharged** — obligation 8 (the third row-click test re-pointed, not deleted) and obligation 9 (Enter/Space residue closed: `button.click()` now proves the wired handler a real Enter/Space would reach, and the test title says so). This is the mechanism working as intended: a pointer filed three tasks ago is carried by the brief or by nobody.

#### Risks the Leader flagged for audit, adjudicated

- **`[class]` clobbering the static class list** (`RGS-DD-3`'s ladder at stake) — **not a hazard, and not a novel technique.** Lines `:328`/`:347` of the same template already use the identical `[class]` pattern over a static list (the scope listbox options). Ladder survival proven *behaviourally*, not by inspection: `realRow()` selects by attribute-substring match on the serialized class list and the ladder tests at `:769-795` pass. Only `border border-[var(--pr-border)]` moved out — the intended toggle.
- **Lost resting `--pr-border` outline** — **spec-mandated, not a regression.** `RGS-DD-4` says "`border-2` toggling `--pr-color-primary-300` ↔ **transparent**, exactly as the listbox option does". Keeping `--pr-border` unselected would have been the deviation. See the standing advisory below.
- **Skeleton `border` → `border-2`** (declared judgment call, unnamed in the DoD) — **in scope, serves `RGS-DD-5`.** The colour mismatch at rest is forced by DD-4 regardless; width was the only part still fixable, and leaving it would have re-created the 1px skeleton→content shift `KZ-OAH-1` has recurred on three times.
- `RGS-DD-6` holds **in effect, not merely in emission**: the host binds `(scopeChange)="overviewScope.set($event)"`, and a signal `.set()` with an equal primitive is a no-op, so re-selecting the same key genuinely does nothing downstream. The test proves it never emits `null`.

**Verification:** scoped `…/components/program-overview` → **213/213**. Wider `…/dashboard-lab` → **749/749, fully green**. `npx ng lint --quiet` clean. `npm run build:dev` clean.

**Reviewer summary:** *"`RGS-T-2` conforms — the row body and identity button both call the existing `selectScope`/`scopeChange` path, `Report` and `→` navigate and only navigate through their preserved `stopPropagation()` guards, the selected state carries `border-2` in both branches. The 206 → 213 count is arithmetically explained: three row-click tests re-pointed with real negative halves, none deleted, seven added."*

#### `ADVISORY` findings (4R lens — recorded, non-gating)

- **READABILITY** — `program-overview.scope.spec.ts:834` is now stale: *"…does not ALSO **navigate** the row"*, with a `rowNavigated` variable. The assertion remains true and valuable (propagation is stopped), but the row no longer navigates. The one row-behaviour comment `RGS-T-2` did not update. One-line fix when `RGS-T-3` next opens this file.
- **READABILITY** — the rewritten Enter/Space test title is ~700 characters: honest and load-bearing, but jest output for this suite is now hard to scan. The reasoning would read better as the leading comment (where it is already duplicated) with a short title.
- **RISK / D6** — the row's border went 1px → 2px in *both* branches, adding 2px to its rendered box at every breakpoint. Given this component's overflow history (`OSF-AC-9`/`AC-10`, three tasks spent on it), **`RGS-T-4`'s 900px and 768px readings must be treated as a re-measure, not a formality.**
- **RISK — a genuine gap in `requirements.md` §9, not a task.** With the unselected border transparent, an unselected row's separation from the card rests entirely on `--pr-surface-ground` vs `--pr-surface-card`. `RGS-T-4` measures the *selected* indicator at ≥3:1 (D4); **no defect class covers "resting affordance lost"**. Per the Advisory-Never-Becomes-A-Task rule this is *not* being minted into `RGS-T-4`'s DoD — it is escalated to the owner as a possible spec gap at the `RGS-T-2` gate.
- **BUDGET** — second data point; see §3.

#### Standing condition discharged

§1 recorded that the full `dashboard-lab` suite had to be green again before `RGS-T-4`/archive. It is: **749/749** on this run. The concurrent session's `link.origin` failures are gone — that session's state moved on. No later task inherits the scoped-run concession.

## 4. Constitution Impact: `RGS-T-1`, `RGS-T-2`

No module created, no boundary moved, no new package. The component's **behavioural** public surface did change (an AoW row click now filters rather than navigates), but `…/components/program-overview/CLAUDE.md` never documented the row's click semantics, so it is **not actively misleading** and the sync defers to `/akili-archive` rather than being forced into this task's commit.

Pending for the archive sync:
- `program-overview/CLAUDE.md` — add the gesture split (row + identity button filter; `Report`/`→` navigate) and the `aria-pressed`/`border-2` selected state. Its line references `:510`/`:588` for the skeleton and real row are now stale.
- **CodeGraph re-index pending** — `program-overview.component.{html,ts}` changed substantially across both tasks.
- Carried from `design.md` §8, still not this spec's scope: `reporting-aow-table`'s collapse leaves 20 focusable buttons tabbable while collapsed and `aria-hidden`. Same fix (`inert`), different file — for the default-branch apply pass.
