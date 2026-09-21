# Kaizen Entry — bilateral/review-list-source-and-reporter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/review-list-source-and-reporter` |
| Date | 2026-09-21 |
| Branch | `qa-development-2026` |
| Branch Context | **spec** (≠ `staging` integration pin, ≠ `master` default pin) — nothing outside this file was written |
| Archive Run | 1 |
| Approval Mode | pre-approved |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 / 6 `[x]` | `tasks.md` |
| Reviewer FAIL rework attempts | **4** — T-1 ×1, T-5 ×2, T-6 ×1 | `execution.md` task entries |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` (no `## Pivot Record`) |
| Runtime events | **1** — provider-limit death (T-6 Implementer, `sonnet` 429); recovered at ladder **rung 4** via model rotation to `fable`; **no attempt consumed** | `execution.md` — *Runtime event* |
| Budget tripwire | **fired** — 1804 LOC vs ~680 estimated (+166 %); review rounds **8** vs **2** | `execution.md` — *Budget tripwire*; `design.md` §12A |
| Production vs test split | production **464**, tests **1340** — **74 %** test share vs §12A's predicted 60 % | `git diff --numstat 7533b66e9..HEAD -- */src` |
| PRODUCT_BUGs | n/a — `/akili-test` not run | — |
| Judgment-day severe findings (specify time) | 5 MAJOR, 4 MINOR, 0 BLOCKER — all applied in one fix round | `design.md` Document Control |
| Validation FAIL / WARN | n/a — `/akili-validate` not run | — |
| Tasks closed under `REVIEW_WAIVED` | **0** | `execution.md` |
| Tasks closed under `REVIEW_SKIPPED` | **0** | `execution.md` |
| Escaped defects (§3) | **0** — no `REVIEW_SKIPPED` record exists to escape against | — |
| Drift attributable to this spec | none recorded — `docs/specs/audits/` holds only a scaffolded `README.md`; no legacy `drift-report.md` | — |
| **Spec-document defects found at execute time** | **5** (see KZ-…-1) | `execution.md` — four execute-time spec-edit sections |

**Archive readiness note:** `test-report.md` and `validation-report.md` are both **absent** — `/akili-test` and `/akili-validate` were not run. The user was asked and **explicitly accepted the absence** (2026-09-21), citing the execute-phase gate evidence and the live HITL pass in their place. Recorded here because two of the Measure table's rows are consequently blank by decision, not by oversight.

---

## Lessons

- **KZ-bilateral--review-list-source-and-reporter-1 — A numeric gate written at specify time and never executed is not a gate: five of this spec's stated numbers were wrong, and each was caught only when execution ran them.** (Product + Methodology, **High**)
  - Root cause (5W1H — *why did five wrong numbers survive a judgment-day round that caught 5 MAJOR findings?*): every one of them was **computed** in the spec and never **run** against the artifact it described. Review reads arithmetic for plausibility; it does not execute it. The five:
    1. **D7's gate was unsatisfiable.** `requirements.md` §8 demanded `grep -rn "Generated with AI assistance" onecgiar-pr-client/src` return **exactly 1**; the pre-spec baseline is **7** (1 constant + 1 pre-existing production duplicate + 5 spec assertions). `BSR-T-3` would have failed its own DoD however well it was implemented.
    2. **DD-2's widths were self-contradictory.** It specified Alignment at 192px while projecting Title at "~184px @1000 — still the widest at both". 184 < 192, so the hard NFR `BSR-AC-9` would have failed. CT measured Title at exactly **184.5px**.
    3. **DD-2's "≈88px" AI badge is 79px** — so its "two guards, both required" necessity claim is false at the shipped 116px column, and the 104px rejection's AI-badge leg does not hold.
    4. **DD-3's slack arithmetic** used a computed 1.25 line-height (`15 + 13.75 ≈ 28.75 → 3.1px`) instead of the **pinned** `leading-[13px]` (`15 + 13 = 28 → 3.875px`).
    5. **`BSR-T-6`'s falsifier is geometrically impossible** — a 200px chip at 375px reaches x≈356 inside a ~293px source row and cannot overflow the document even with every clip guard removed.
  - What caught each: (1) the Leader verifying the gate before briefing anyone against it; (2) the task's own *"re-measure the baseline before the change"* instruction; (3) and (5) Implementers executing named falsifiers and reporting honestly that they would not go red; (4) a Reviewer recomputing the arithmetic. **In every case the catching mechanism was execution, never reading.**
  - Evidence: `execution.md` — *Execute-time spec edit — D7's gate arithmetic*; `BSR-T-4` entry (baseline 530.5/250.5, post-change 472.5/192.5, badge 79px); `BSR-T-6` entry (falsifier injection chain); `design.md` DD-2 ⚠️ correction block, DD-3 correction, §13.
  - Note the generalization: this is not about widths or greps. It is about **any number a spec states as a gate** — a count, a sum, a threshold, a projected measurement. The cheapest possible prevention is running it once at specify time and recording the observed value beside the expected one.
  - Standardization → **P1** (local), **P2** (upstream).

- **KZ-bilateral--review-list-source-and-reporter-2 — A geometry or paint assertion aimed at a `:host { display: contents }` component measures a box that does not exist, and passes.** (Product, **High**)
  - Root cause (5W1H — *why did the same component produce two gates that measured nothing?*): `AiProvenanceNoticeComponent` sets `:host { display: contents }`, so the host generates **no box and paints nothing** — while the module's convention puts the `data-testid` on that host. A gate that resolves the testid and then reads geometry or colour gets `offsetHeight === 0` and `backgroundColor === rgba(0,0,0,0)`, which are *valid-looking* values, so the assertion passes or yields a plausible-but-meaningless number. Twice:
    - `BSR-T-4`'s chip-fit gate measured `offsetHeight` on the host — always 0, so "the badge renders on one line" was true by construction.
    - `BSR-T-6`'s D9 contrast gate computed a ratio against transparent black and returned **`1.46:1`** — a number that looks like a contrast failure but measures nothing at all.
  - The third occurrence is the counter-example that proves the rule: `BSR-T-3`'s deliberate use of `display: contents` on the chip host is **correct**, because it lets the table cell's own `truncate` wrapper become the pill's containing block. The property is not a bug — reading geometry *off it* is.
  - Evidence: `execution.md` — `BSR-T-4` entry (the Implementer found and fixed its own vacuous assertion), `BSR-T-6` entry (inherited gate red at `1.46:1`, retargeted to `[data-testid="ai-provenance-badge"]` with an `alpha === 255` precondition), `BSR-T-3` Reviewer item 6.
  - Standardization → **P3**.

- **KZ-bilateral--review-list-source-and-reporter-3 — The brief contract requires a source for third-party facts but not for the Leader's own derived ones, so two Leader-derived errors were executed faithfully into Implementer work.** (Methodology, **Medium**)
  - Root cause (5W1H — *why did an Implementer write a factually inverted comment?*): `/akili-execute` Step 2.2's **Brief contract clause (c)** — *"Every infrastructure or third-party fact the brief states … cites a source the worker can read … or carries the marker `UNVERIFIED`"* — scopes the obligation to **infrastructure or third-party** facts. A fact the *Leader itself derived* (from a sample, a measurement, or an inference) falls outside it, so it enters the brief bare and the Implementer, per clause (a), executes it faithfully. Twice in this run:
    - A single-program DB probe (`SP06`/v34, all `EXTERNAL` with null platform codes) was generalised into the population claim *"only the `Via API` branch is observable on TEST data"* and carried into the `BSR-T-3` and `BSR-T-6` briefs. The real distribution has **six of seven** `BSR-R-4` rows live, including the trap row 19× on one page.
    - The `BSR-T-5` attempt-2 brief stated that `BSR-T-2`'s stamp *grows* the affected `UNKNOWN` class. It shrinks it. The Implementer wrote the inversion into two docblocks and the attempt FAILed — **one of that task's three attempts was spent on a defect the Leader introduced.**
  - Evidence: `execution.md` — `BSR-T-5` entry, *"The inverted framing originated in the Leader's brief"* and *Decisions* 1; `BSR-T-1` entry, *"Carried forward — a real limit on what the HITL pass can witness"* vs the `BSR-T-5` full-population re-probe.
  - Why Methodology and not Product: nothing about it is stack-, domain-, or project-specific. The clause has the same hole in any project.
  - Standardization → **P4** (upstream only).

## Noted, not a lesson

- **The runtime-failure ladder worked exactly as written.** A provider session limit killed the `BSR-T-6` Implementer mid-edit. The mandated tree probe recovered 250 lines intact, rung 2 was skipped as futile (reset 98 minutes out), rung 3 was skipped because messaging the worker re-invokes the same limited model, and rung 4 recovered it on a different model — **no attempt consumed, no work lost**. The model choice mattered: rotating the *Implementer* to `fable` kept `opus` free so the Reviewer stayed at its registry T3 tier rather than producing a `degraded-pair`. Not a lesson — the mechanism already exists and performed; recorded as evidence that it does.
- **"Verify, don't trust" on inherited work paid immediately.** The continuation Implementer was told the dead worker's 250 lines were unproven rather than merely unfinished; they ran **51/53**, with two of the dead worker's own five gates red. A hand-off that assumed the partial work was good would have shipped both.
- **An imprecision knowingly left in the `AC-4` change log.** *"Rows ingested before this change keep `UNKNOWN`"* is over-broad — migration `1784921547596` backfilled `EXTERNAL` onto pre-existing `source='API'` rows, so only the window *between* that migration and this change reads `UNKNOWN`. The Reviewer scoped it out of rework because it **errs conservatively** (a consumer expects a weaker signal than it will find). Exact replacement recorded for the next edit of that row: *"Rows ingested between migration `1784921547596` and this change keep `UNKNOWN`."* Sub-threshold; feeds the recurrence check.
- **A Leader false alarm, recorded rather than dropped.** A live-page probe reported `srOnlyPresent: false` and looked like a `BSR-R-7` violation; the probe was wrong (it queried `.sr-only` as a *descendant* when it is a **sibling**). Not a lesson — but a false alarm quietly discarded is indistinguishable from one never checked, so it is in the record.
- **The module guide is 403 lines against `docs/COMPONENT-DOCS.md`'s 120-line cap** (358 before this spec, +45 from `BSR-T-6`). Pre-existing overflow, disclosed by the Implementer; a trim is a separate ticket per that document's own §4. Not this spec's root cause.
- **An open product gap, filed in `design.md` §13, not a kaizen lesson.** The drawer derives Source without `external_platform_code`, so it shows `Via API`/placeholder where the list shows `Via API · W3RU` — 84 legacy rows today **and every future ingestion whose API key resolves a CLARISA platform**. One server edit closes both classes. It is a product follow-up, not a process failure: two independent Reviewers took the literal reading of `BSR-R-9`.

## Pending Items

> **Branch Context is `spec`** (`qa-development-2026` is neither the `staging` integration pin nor the `master` default pin). Every item below was **composed but not written**; they await the apply phase on **`staging`**. No guide, template, persona, design doc, TRD, or digest was touched by this pass.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to the Design Impact checklist: "**Run every numeric gate once before approval.** Any count, sum, threshold or projected measurement a spec states as a gate must be executed against the current baseline at specify time, with the observed value recorded beside the expected one. A stated number that was never run is not a gate." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | `methodology` |
| Edit | `/akili-specify`: require that every numeric gate a spec states (grep count, width sum, falsifier threshold, projected measurement) be **executed once against the current baseline at specify time** and the observed value recorded beside the expected one. Review reads arithmetic for plausibility; only execution falsifies it. Evidence: five wrong numbers survived a judgment-day round that caught 5 MAJOR findings, and every one was caught later by running it. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` |
| Edit | Add to the testing gotchas: "**Never read geometry or paint off a `:host { display: contents }` component.** It generates no box, so `offsetHeight` is `0` and `backgroundColor` is `rgba(0,0,0,0)` — valid-looking values that make the gate pass measuring nothing. Target a painted inner element, and assert `alpha === 255` before computing any contrast ratio." |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | upstream |
| Target | `methodology` |
| Edit | `/akili-execute` Step 2.2, Brief contract clause (c): widen from *"infrastructure or third-party fact"* to **any fact the brief asserts, including ones the Leader derived itself**. A derived fact must state its evidential scope ("measured on `<sample>`") or carry `UNVERIFIED`; a population claim drawn from a single sample is neither sourced nor marked, and clause (a) guarantees the Implementer executes it faithfully. Evidence: two Leader-derived errors reached Implementer work, one costing a rework attempt. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--sp-shell-app-viewport-1` |
| Severity | High (raised from Medium) |
| Edit | Add `bilateral/review-list-source-and-reporter` as a source spec and note the recurrence: a review-round budget of **2** was set for a spec whose gates are almost entirely CT rendered-geometry; **8** rounds were actually consumed (4× the budget). This is the second spec to exhibit the exact pattern the lesson names — browser/CSS-shaped gates mis-sized by a spec-level round budget — which strengthens its "size review rounds per task" remedy. |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` |
| Severity | Medium (unchanged) |
| Edit | Add `bilateral/review-list-source-and-reporter` as a source spec, with a **distinct mechanism** worth recording beside the template one: here production code landed at **464 LOC against a ~460 implied estimate** — accurate — while **tests reached 1340 (74 % of the diff)** against §12A's predicted 60 %, taking the total to 1804 vs ~680. The under-count was in **gates, not templates**: twelve pinned test consumers to re-point plus three falsifier gates on one task. Suggests the budget multiplier should be driven by *pinned-consumer and falsifier count*, not by production LOC. |
| Status | pending |
