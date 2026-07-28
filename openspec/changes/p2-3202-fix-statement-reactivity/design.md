## Context

Ticket **P2-3063**, epic **P2-2928 ToC Improvements**. Frontend-only.

`multiple-wps-content` is the ToC detail block of Contributors & Partners (P25). In the 2026 Yes scenario it renders three stacked fields: **Level** (`toc_level_id`), the **node dropdown** (`toc_result_id`, labelled per level: `High Level Output` / `Intermediate Outcome` / `2030 Outcome`), and — added by `p2-3063-hlo-outcome-statement` — a **read-only statement box** showing the selected node's `outcome_statement`.

### Data flow (API → template)

```
GET /v2/toc/result/{resultId}/initiative/{initId}/level/{1|2|3}?planned=true
        │  each node carries: toc_result_id, title, outcome_statement,
        │                     description, indicators[], toc_partners[]
        ▼
 parent: rd-contributors-and-partners  →  outputList() / outcomeList() / eoiList()   [WritableSignal<any[]>]
        │
        ├── @Input()  outcomeList / outputList / eoiList   (signals — notify on .set())
        ├── @Input()  activeTab                            (PLAIN OBJECT — mutated in place by ngModel)
        └── @Input()  activeTabSignal                      (signal holding a SNAPSHOT of the tab)
        ▼
 multiple-wps-content
        selectedTocNode = computed(() => find node by toc_result_id in list for toc_level_id)
        hloStatementValue = computed(() => node.outcome_statement ?? node.description ?? '')
        ▼
 template: <app-pr-field-header [label]="hloStatementLabel()" [description]="hloStatementValue()" ...>
           gated by @if (isCP2026() && !isUnplanned && activeTab?.toc_result_id && hloStatementValue())
```

### Current state — where reactivity breaks

`selectedTocNode`'s reactive dependency set is `{ activeTabSignal, outputList, outcomeList, eoiList }`. Signal `computed()` only recomputes when one of those **notifies**.

```
 Level dropdown                       Node dropdown (HLO / Outcome / EOI)
 ─────────────                        ──────────────────────────────────
 [(ngModel)]="activeTab.toc_level_id" [(ngModel)]="activeTab.toc_result_id"
 (ngModelChange)=                     (ngModelChange)=
   setActiveTabSignal()  ← .set({…})    markUserTocSelection()
   tocResultChanged.emit()              getIndicatorsList()      ← bumps selectionVersion
                                        tocResultChanged.emit()
        │                                        │
        ▼                                        ▼
  activeTabSignal NOTIFIES                 nothing in the computed's
  → selectedTocNode recomputes             dependency set notifies
  → label follows the level  ✅            → cached node kept  ❌
                                                 │
                                                 ▼
                                     on save the parent re-sets the lists
                                     → outcomeList NOTIFIES → recompute
                                     → statement finally correct (too late)
```

`activeTab` is a plain `@Input()` object; `[(ngModel)]` writes `toc_result_id` **into that same object**. Reading `activeTabSignal()?.toc_result_id` inside the computed therefore returns the fresh id *when it runs* — but nothing ever schedules a run. The value the template shows is the memoised one.

### Constraints

- `activeTab` is mutated in place by ngModel across the **whole** Contributors & Partners form, and the same component is reused by IPSR, bilateral and share-request. Changing its identity model is not local.
- `activeTabSignal.set({...currentTab, …})` produces a **new snapshot object** each time; it is deliberately not the same reference as `activeTab`. Anything added to that snapshot immediately starts drifting from what ngModel keeps writing to `activeTab`.
- The component is excluded from the client Jest coverage set, so the safety net is build + scripted browser verification, not unit tests.

### Consumers of the same data (must keep working)

- `secondFieldLabel()` / `hloStatementLabel()` — read `activeTabSignal()?.toc_level_id` via `tocResultListFiltered()`.
- `getIndicatorsList()` / `updateSelectedIndicatorData()` — imperative, switch on `activeTabSignal()?.toc_level_id`, write `indicatorsList` and `selectedIndicatorData` with `.set()`.
- `indicatorTypologyValue()` — reads `selectedIndicatorData()`; already reactive, unaffected.
- `syncTocReferenceIds` effect (P2-2998 / P2-2929) — already depends on `selectionVersion()`, the same signal this change reuses. It feeds the parent's centers / science-programs reference sets.
- The duplicated `multiple-wps-content` under `rd-theory-of-change/.../toc-initiative-out/multiple-wps/` — does **not** render the statement field; untouched.

## Goals / Non-Goals

**Goals:**
- Changing the node dropdown updates the read-only statement immediately, with no save.
- Zero behaviour change for: the No scenario, phase 2025, IPSR / bilateral / share-request reuses, the field's visibility gate, its label, its tooltip and its data source.
- Reuse the mechanism the file already established for this exact failure mode instead of introducing a second one.

**Non-Goals:**
- Making `activeTab` a real signal (`model()` / `signal()`) and removing in-place mutation across the form — the architectural root, deliberately deferred (see Open Questions).
- Touching the statement's placement, copy, gating or the `Indicator Tipology` field.
- Any server change. `outcome_statement` already ships in the payload.

## Decisions

### D1 — Subscribe `selectedTocNode` to `selectionVersion` (chosen)

Read `this.selectionVersion();` as the first statement of the computed, so a bump invalidates the memo.

```
private selectedTocNode = computed(() => {
  this.selectionVersion();          // reactive trigger: in-place node selection
  const id = this.activeTabSignal()?.toc_result_id ?? this.activeTab?.toc_result_id;
  …unchanged…
});
```

Why this one:
- `selectionVersion` exists **for this exact reason** — P2-2998 added it with the comment *"in-place mutations … don't notify the effect"* — and `getIndicatorsList()` already bumps it. All three node dropdowns already call `getIndicatorsList()` from `ngModelChange`, so the trigger already fires on every genuine selection. Nothing new to wire in the template.
- One reactive trigger for one class of bug: `syncTocReferenceIds` and `selectedTocNode` now invalidate off the same signal, so the two stay consistent by construction instead of by coincidence.
- Blast radius is a single expression in a single memo. Nothing else reads `selectedTocNode`.

Cost, stated honestly: a version counter is an escape hatch, not real reactivity. It is the right call **here** because the file already standardised on it and because the alternative that would be conceptually cleaner is measurably riskier (D2).

**Alternatives considered:**

- **D1-alt-a — extend `setActiveTabSignal()` with `toc_result_id` and call it from the three node dropdowns.** Conceptually the "proper" fix: make the signal the source of truth for the selection. Rejected for now: `.set({...currentTab, toc_result_id})` writes a *snapshot*, so from that moment `activeTabSignal().toc_result_id` and `activeTab.toc_result_id` are two values that only agree until the next ngModel write. `getIndicatorsList()`, `updateSelectedIndicatorData()` and `syncTocReferenceIds` all read a mix of both today; introducing a second authoritative copy of the selected id invites a subtle divergence in an epic that has no release yet. It also requires editing three `ngModelChange` bindings in the template.
- **D1-alt-b — drop the memo: make the statement a plain method called from the template.** Would recompute on every change-detection pass and always be correct, but it re-runs a `find()` over the node list on every tick and walks back the signals-based design the file is converging on.
- **D1-alt-c — `effect()` writing a `statementValue` signal.** Adds a second state holder to keep in sync with the very object that is already the problem. More moving parts for the same result.

### D2 — Defer the architectural fix, do not smuggle it in

Turning `activeTab` into a real signal is the actual root of this bug class (`selectionVersion` is the symptom of it). It touches every `ngModel` in the Contributors & Partners form plus three reuse sites, so it belongs in its own ticket with its own QA pass — not inside a bug fix on an unreleased epic. Recorded as OQ2 so it does not evaporate.

### D3 — Verification: scripted Playwright, before **and** after

The component has no unit-test coverage, and the failure is a caching effect invisible to a static read — so the fix has to be proven in a browser. The same script proves both states, driven by `EXPECT_FIXED`:

```
EXPECT_FIXED=0  (run on the UNPATCHED build — must PASS, documents the bug)
   read statement → change node dropdown → assert statement UNCHANGED
   → click save   → assert statement CHANGED

EXPECT_FIXED=1  (run on the PATCHED build — must PASS, proves the fix)
   read statement → change node dropdown → assert statement CHANGED IMMEDIATELY (no save)
```

Details:
- Playwright is already installed globally (`~/.nvm/.../bin/playwright`, chromium in `~/Library/Caches/ms-playwright`). **Nothing is installed into the repo and no dependency is committed** — same approach the epic used for `p2-3063-hlo-outcome-statement` and `p2-2998-centers-from-toc-split`.
- The script lives **outside the repo** (session scratchpad); only its screenshots land in the gitignored `.local-screenshots/`. The repo stays clean.
- Login is bypassed by seeding `localStorage` keys `token` and `user` (see `auth.service.ts:20`) from `USER_TOKEN` in the monorepo `.env`. **The token is never printed, echoed or written to any file** (`.cursorrules`).
- Reference fixture: result **8562** (P25, phase 2026, ToC = Yes) — the same one the epic used for this field. The node dropdown must have ≥2 selectable outcomes for the test to mean anything; if it does not, pick another 2026 result rather than weakening the assertion.

## Risks / Trade-offs

- **[The `EXPECT_FIXED=0` run passes for the wrong reason]** — e.g. both outcomes happen to share the same statement text, so "unchanged" is trivially true → Mitigation: the script asserts the two candidate nodes have **different** statements before it starts, and fails loudly otherwise.
- **[Version-counter reactivity is opaque]** — a future reader can add a dependency to the computed and not realise the invalidation comes from a counter → Mitigation: one-line comment naming P2-3063 + P2-2998 and why the trigger is there; OQ2 tracks the real fix.
- **[`getIndicatorsList()` also runs on load via the `onChangesActiveTab` effect]** — so `selectionVersion` bumps on cold load too → Mitigation: harmless. An extra invalidation of a `find()` over an in-memory list; it recomputes to the same value. Note the deliberate contrast with `markUserTocSelection()`, which is template-only *precisely* because it must distinguish user action from load — this computed has no such need.
- **[Statement lingers after switching Level]** — changing Level keeps the previous `toc_result_id`, which does not exist in the new level's list → `selectedTocNode` resolves to `null`, `hloStatementValue()` returns `''`, and the `@if` hides the box. Correct behaviour, worth confirming in QA rather than assuming.
- **[No unit test guards the regression]** — component is outside the Jest coverage set → Mitigation: the Playwright script is kept and referenced in `tasks.md` so QA can re-run it; adding coverage for this component is out of scope here.

## Migration Plan

Pure client-side behaviour fix. No migration, no feature flag, no data backfill. Rollback = revert the one-line commit; the field returns to its current (stale) behaviour and nothing else moves.

## Open Questions

- **OQ1:** Should the statement box also render in the read-only / review surfaces (PDF export, review drawer) for 2026? Inherited from `p2-3063-hlo-outcome-statement` OQ1, still unanswered, still out of scope here.
- **OQ2:** Follow-up ticket to convert `activeTab` into a real signal (`model()`) and retire `selectionVersion` across the component. Needs its own estimate and QA pass — **to be raised with Santi**, not folded into this fix.
