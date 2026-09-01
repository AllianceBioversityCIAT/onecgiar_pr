# Judgment Day — `changes/overview-aow-progress-hero` (spec review)

| Field | Value |
|---|---|
| Target | requirements + design + tasks (snapshot `93f9f19f7`) + mockup |
| Mode | judgment_day, one round, fix-only (owner mandate; re-judgment waived) |
| Judges | A, B — opus, blind, identical scope (author claude-fable-5) |
| Result | **JUDGMENT: APPROVED ✅ (after fix round 1)** |

## Counts

Judge A: 6 SEVERE / 10 WARNING / 5 SUGGESTION · Judge B: 7 SEVERE / 8 WARNING / 6 SUGGESTION.

## Frozen ledger — severe clusters → fixes applied

| ID | A/B | Finding | Fix |
|---|---|---|---|
| C-1 | A-1/B-1 (+B-7) | Overview↔Reporting are separate ROUTES (`rfrView` is route-derived, read-only; component destroyed on switch) — "glue = signal composition, no new routing" was false; bare `onlyPending.set()` would be lost across the navigation | Design §3 rewritten: all cross-tab actions are ROUTER navigations with query params (the mechanism §8 already uses). CTA = `setOnlyPending(true)` (sessionStorage-backed) THEN navigate to the reporting route with `?tocView=aows`. No signal-glue methods. |
| C-2 | A-3/B-5 | Glossary did not partition the counted set: `target=0 && achieved>0` fell in NO bucket; design §5 invariant provably violable; taxonomy drifted across proposal/mockup/requirements (A-10/B-20) | Glossary now adopts the helper's own `stateOf` partition: **Complete / In progress (`achieved>0 && !complete` — covers the orphan) / Not started**; "Partial" deleted everywhere; one label set (mockup updated to match). |
| C-3 | A-2/B-8 | "Rail MUST equal the Reporting tab's grouped totals" had no decidable referent (per-group ratios only; buckets included there, excluded here; tiers differ) | Clause replaced by an internal-coherence contract: rail = sum of its own rows; each row = `buildRatio` over its HLO-tier set. Cross-surface difference (Reporting cards include the outcome tier) recorded as a documented divergence, not a gate. |
| C-4 | A-4/B-9 (+A-20) | Four PINNED existing tests break (8-heading order `toEqual`, `headings.length===8` + adjacency, single-emission row, `canReportW1W2`) and no task owned editing them — red run + risk of an Implementer "fixing" by reverting the move | New task OAH-T-2 (section move) OWNS the expected-to-change test list, enumerated file:line, with the deliberate-edit note; R-2 wording de-confused (the map IS §9; its index shifts). |
| C-5 | B-2/A-7 (+A-8) | R-4's premise was false: §8's rows ALREADY navigate to the focused By-AOW view via `onOpenAow` (REH-R-10); the legacy handler is unbound; the "legacy spy" gates could never fire; `openAowReporting` duplicated working code | R-4 reframed: KEEP `onOpenAow` as the single action path (no new glue); un-fireable gates deleted; real gate = destination query params asserted. |
| C-6 | B-3 | `program-overview` has no `reportAow` output; `openAow` is shared with the ToC map (TCM-R-5) | Rows keep emitting the existing `openAow` output (its destination is already the required one); ToC-map contract untouched; no new output. |
| C-7 | B-4 | Rebuild dropped the delivered, test-pinned `canReportW1W2` permission gate (disabled Report + exact tooltip, keyboard-reachable) | New R-4 AND-clause preserves the gate verbatim; T-4 owns the assertions (existing pinned test kept green). |
| C-8 | B-6 (+A-19) | DD-1 fed rich rows through the shared input, shifting KPI card 4 / tab badge / `aowStats` (outside §8, pinned test) — or two cards disagreeing silently | DD-4 revised: NEW `richRows` input for §8 only; thin `aowProgress` keeps feeding card 4/badge/hub unchanged. The same-screen denominator difference is DISCLOSED via the zero-target `title` (MRF precedent) and recorded as accepted in DD-1; hub-vs-hero order difference accepted note added. |
| C-9 | A-5 (+A-11) | Mockup rail splits arithmetically impossible under the rule (2 reported but "In progress 6 · Not started 384"); RowStates subline contradicted its own figures (16/137 → "136 remaining") | Mockup corrected (rail: Complete 0 · In progress 2 · Not started 390; RowStates: 121 remaining; labels unified) and canvas republished. |
| C-10 | A-6 | `.pr-row-action` is component-scoped SCSS — unstyled cross-component (phantom-token failure class) | Design §6 prescribes the INLINED utility recipe (repo precedent `dashboard-lab.component.html:1741`); no cross-component class reference remains. |
| C-11 | A-15 | §8's `activeSection()` gate (shared with the aow filter view) unmentioned — the move could silently break the "aow" filter | R-2 AND-clause + T-2 test own preserving the gate. |

## Warnings/suggestions applied

B-10 anchor assertion demoted to presence-only + R-2 visual check routed to T-6 live row · B-11 complete-state live row = check dev data first, else explicit NOT-RUN (unit stays the owner; "simulate via signal" deleted as non-executable) · B-12/A-9 CTA pins `?tocView=aows` (`plannedBrowseView`); `reportingViewMode` untouched · B-13/A-12 orphan clauses owned (focus/no-reload → T-3 test + T-6 live; empty program → T-3 test) · B-14 T-5 owns the `reporting-burndown.ts` scope-docstring amendment · B-15 `var(--pr-color-green-500)`, never hex · B-16 reuse existing loading flags (no new aggregate) · A-13 grid rationale corrected (mockup tracks, NOT the table's) · A-14/B-17 false "one brand button" claim deleted · A-16 rows STAY click-targets (no removal; buttons add, not replace) · A-17 token snap noted · A-18 T-6 tolerance note (computed widths vs mockup's rounded ints) · A-21 T-2 split out (move = its own S task; 6 tasks total, budget updated) · B-18 tier phrased as `__tier !== 'outcome'` · B-19 disqualifiers replaced with fireable ones · B-21 recorded.

## Terminal state

Re-judgment waived by owner. Orchestrator sweep of superseded values (Partial, openAowReporting, equality gate, one-brand-button, #19ae58, .pr-row-action reference) — zero residual hits after the fix pass.

**JUDGMENT: APPROVED ✅**
