# `changes/overview-toc-map` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/changes/overview-toc-map/` |
| **Approval mode** | gated — user launched `/akili-execute … fast and efficient`: Leader proceeds through routine PASS gates, stops at TCM-T-4 HITL (precedent: overview-chart-view-toggle run) |
| **Branch** | `qa-development-2026` @ base `e62586480` (includes the parallel session's radar/KPI/tabs commit) |
| **Triad** | Leader: session model (T1) · Implementer: `akili-implementer` (T2) · Reviewer: `akili-reviewer` (T3, read-only) |
| **Budget (design §1)** | 4 tasks · ~430 LOC · 1 review round per task |
| **Kaizen applied** | KZ-CVT-1 (pathspec-only commits — shared worktree), KZ-CVT-2 (briefs name the return channel) |

## 2. Task Execution History

## TCM-T-1 — Wrapper registration + pure `buildTocMapModel`

### Attempt 1 — Reviewer FAIL (2026-08-28)

- **Files:** `pr-viz-chart.component.ts` (+3-edit TreeChart registration) + `.spec.ts` (13→14 count, cited), new `dashboard-lab.toc-map.ts` (284) + `.spec.ts` (255, 12 cases).
- **Implementer verification:** FULL suite 483/6934 green; lint clean; `ng build` exit 0.
- **Runtime note:** Reviewer's first session dropped mid-response (API connection lost); resumed via nudge — no attempt consumed by the runtime failure.
- **Reviewer verdict: STATUS: FAIL** — one gating issue:
  1. **Discovered Issue:** AoW branch `done/total` computed over `is_aow === true` output-tier nodes only; `overviewAowProgress` (`dashboard-lab.component.ts:944-962` via `indicatorsByAow`/`fromTier` :1636-1649) filters by TIER ONLY — no `is_aow` filter. On output-tier nodes with `is_aow: false`/absent (real per the repo's own pinned spec `dashboard-lab.component.spec.ts:180-204` and the folder guide's "Trampa nueva 2026-08-26"), map says 0/0 while the card says 0/2. Fixture blind on this axis (all outputs `is_aow: true`) → agreement test green by accident.
  2. **Violated Rule:** TCM-R-3 scenario "the two cards can never disagree — one shared derivation"; requirements §9 defect-class row 2; TCM-DD-4 "exact AoW-card counting rule".
  3. **Remediation:** restrict the Program-level dedupe partition to the OUTCOME tier (matching `:1646`'s definition of shared-ness); all output-tier nodes stay on their AoW branch; add fixture output nodes with `is_aow: false` and `is_aow` absent (≥1 achieved + 1 unachieved indicator) — current code goes red on them; fix the docblocks/comments claiming "exact overviewAowProgress rule".
- **Reviewer adjudications accepted by Leader:** dedupe mechanism itself PASS; no-truncation-in-model PASS (correct layering; **forward pointer → TCM-T-2:** truncated-title fallback for null-code leaves is now UNOWNED — TCM-T-2 must own it as a label/tooltip assertion or TCM-R-2's final AND-clause ships unproven); purity + label constants PASS; wrapper registration PASS (union typecheck genuinely exercised only when T-2 writes a tree option — close there).
- **Leader decision (spec-clause conflict):** TCM-R-2's "per-AoW branches contain only `is_aow: true` nodes" read literally conflicts with TCM-R-3's absolute on this input class. Resolved in favor of TCM-R-3 (the outcome-tier-only partition satisfies both; the literal both-tier reading violates a MUST). One-line clarification added to TCM-R-2's clause citing this entry — recorded amendment, not silent rewrite.
- **Leader inclusion under the same issue (not advisory creep):** the `done` predicate must use `Number(value ?? 0) > 0` semantics (card-exact), not `parseFloat` — TCM-DD-4 demands the EXACT rule; coercion is part of exactness.
- **ADVISORY (recorded, non-gating, die here):** silent drop of key-less shared nodes (pin or comment deliberately); `a.code.localeCompare` throws on absent code (`String(a.code ?? '')` would uniformize no-throw); `outcomes2030Label` override untested.

### Attempt 2 — Reviewer PASS (2026-08-28)

- **Status: PASS** (attempt 2 of 3) · rework effort: high
- **Remediation applied:** output-tier `is_aow` filter removed (all HLOs stay on their AoW branch; branch `done/total` ≡ `overviewAowProgress` by construction); outcome-tier partition unchanged; `done` predicate now card-exact `Number(value ?? 0) > 0` (`isAchieved`), `parseFloat` confined to Σ sums; docblocks corrected (the ownedOutcomeNodes comment now cites the codebase's sharedness definition, TCM-R-3, and why attempt 1 was wrong).
- **Fixture hole closed:** AOW01 outputs += `A4` (`is_aow: false`) + `A5` (`is_aow` not-strictly-true), each with achieved+unachieved indicators; agreement values now AOW01 2/6, AOW02 3/7. **Red→green experiment run in-file:** reintroducing the attempt-1 partition turned 3 tests red exactly on the new axis; Reviewer independently confirmed by hand re-derivation (2/6 both sides; old code 1/3 vs 2/6 red).
- **Verification:** FULL suite 483 suites / 6934 tests green; lint clean. (`ng build` green from attempt 1; union typecheck genuinely exercised at TCM-T-2.)
- **Reviewer:** STATUS: PASS — all 5 DoD items green; scope/static clean.
- **Forward pointers → TCM-T-2 (carry into its brief):** (1) truncated-title fallback for null-code leaves is UNOWNED — TCM-T-2 must own it as a label/tooltip assertion or TCM-R-2's final AND-clause ships unproven; (2) the wrapper union typecheck is only exercised when T-2 writes a real tree option — `ng build` there closes it.
- **ADVISORY (recorded, die here):** key-less shared nodes silently dropped (pin or comment); `a.code.localeCompare` throws on absent code; outcome-tier absent-`is_aow` fixture line would complete tier symmetry; `outcomes2030Label` override untested; `programNodesByKey` comment one-line touch-up.

## TCM-T-2 — Pure chart builders: `tocMapOption` + `tocMapTable` + `tocMapAowFromClick`

- **Status:** PASS (attempt 1) · 2026-08-28 · Implementer: `impl-tcm-t1` (chained) · Reviewer: `rev-tcm-t1`
- **Files:** `program-overview.charts.ts` (+295), `.spec.ts` (+372, 18 new `it` blocks).
- **What:** `tocMapOption` (tree/radial/expand-all/no-roam; symbolSize 48>30>14 asserted as ordering; root+branch labels on, leaf off; quartile→ramp by `>=` top-down — boundary 25/50/75 land HIGHER, pinned by dedicated boundary test; root fill `tokens.primary`, structural `tokens.bilateralMuted` — both existing tokens, adjudicated; custom `tocMapPayload` channel, ECharts-safe, read defensively); tooltip per TCM-R-4 incl. the requirement's exact worked example; `tocMapTable` (row parity vs an independent recursive walk of the produced option); `tocMapAowFromClick` (full-AoW parity loop + null for root/every-leaf/3 branch kinds/4 malformed modes).
- **Forward pointers closed:** (1) truncated-title fallback owned — `truncateTocMapTitle` on null-code leaves in tooltip AND node name, both branches spec-gated; (2) `TreeSeriesOption` union genuinely exercised → `ng build` exit 0 (closes TCM-T-1's deferred gap; `as EChartsOption` idiom matches every builder in the file).
- **Verification:** FULL suite 483 suites / **6955 tests** green; lint clean; `ng build` exit 0. (Reviewer note: +21 delta includes ~3 tests from the concurrent `programme-results` session — reconcile at TCM-T-4's static gate.)
- **Reviewer:** **STATUS: PASS** — all 6 DoD items green; 6/6 judgment calls accepted (quartile reading, token choices, display names, truncation, union closure, payload channel).
- **Issues:** one transient lost Edit (import block didn't persist — concurrent session touching the tree; re-applied, confirmed via git diff). No attempt consumed.
- **Forward pointers → TCM-T-3:** (1) null guard is load-bearing — builders take non-nullable `TocMapModel`, `buildTocMapModel` returns `| null`; the computeds are the ONLY guard; (2) HITL look-at: AoW tooltip shows all-tier indicator count next to output-tier-only progress (e.g. "7 indicators … 2/6") — correct by design, possibly confusing; wording fix at builder if HITL wants it.
- **ADVISORY (recorded, die here):** tooltip fixtures can't distinguish `indicators` vs `total` (all coincide — a branch fixture with an outcome-tier leaf would); root table row cells unasserted (one `toEqual` on `rows[0]`); suite-delta bookkeeping.

## TCM-T-3 — Card wiring: model computed, bindings, navigation, heading +1

- **Status:** PASS (attempt 1, after diff re-cut) · 2026-08-28 · Implementer: `impl-tcm-t1` · Reviewer: `rev-tcm-t1`
- **Reviewer verdict:** **STATUS: FAIL → adjudicated environmental, no rework attempt consumed.** The single gating issue was FOREIGN work interleaved in the same files (concurrent session's bilateral phase-awareness: 'editing' status slot, `col-span-2` tile restyle, `GET_ResultToReview(..., 'all')`, phase-preferring `latestVersion`, `OverviewLink.phase`) — violating TCM-R-1's no-restyle BUT-clause and the §8 "purely additive" roll-back claim if shipped in this spec's PR. Reviewer: "TCM-T-3's own hunks need no change; I found nothing wrong with them… if concurrent session's, re-cut the diff and the rest of this audit is a clean pass."
- **Leader remediation (re-cut):** authorship established (implementer's report lists its changes; the 5 hunks are absent from it; the concurrent `bilateral-visual-improvements` session was idle with uncommitted work). Foreign hunks backed up to scratchpad, temporarily stripped from the 3 affected files, isolated tree verified green (FULL suite **483 suites / 6962 tests**, lint, `ng build` — identical test count confirms the foreign hunks carried zero assertions here), ToC-map hunks committed alone, foreign hunks restored verbatim to the working tree for their owner session.
- **What (TCM-T-3 proper):** `overviewTocMap` computed (reads only `selected()`/`aows()`/`tocByKey()` + `splitGroupTitle` — zero HTTP, key format `SP::code` matches `loadToc`, existing bucket constants reused); `overviewTocMapLoading` + `tocMapLoading` input (adjudicated legitimate: minimum mechanism separating "loading" from "settled-empty", both required by TCM-R-1); `onOpenAow` → `['/result-framework-reporting/entity-details', spCode, 'aow', code]` (verified against `routing-data.ts` "Entity AOW" route + live usage in `entity-aow-card`; no-op without SP; exact-args + no-op specs); `tocMap` input, null-safe option/table computeds (the load-bearing guard — verified sole gate between `| null` model and non-nullable builders); `onTocMapClick` emits only non-null resolver results (emission-absence asserted); card 9 full-width below "Progress by AoW", inside the same `aow` section-filter gate (adjudicated: defensible gap-fill, pinned in 4 filter states, surface at HITL); heading assertion 7→8 cited; host-count baseline corrected 4→5 (DoD's "5→6" was stale vs the parallel radar commit — Reviewer verified 4 is the true baseline).
- **Verification (isolated tree):** FULL suite 483/6962 green; lint clean; `ng build` exit 0.
- **Forward pointers → TCM-T-4 (HITL):** (1) section-filter behavior of the map card (hidden under W1/W2·Bilateral filters) — owner sees it live; (2) AoW tooltip "N indicators (all tiers)" vs output-tier progress denominator wording; (3) root fill = brand primary (design named no token for the hub); (4) reconcile the ±1 foreign test count at the static gate.
- **ADVISORY (recorded, die here):** loading-gap tick between AoW settle and `loadAllTocs` fire (empty-state flash); permanent-loading if `loadToc`'s error path ever leaves a key dangling (pre-existing trap); empty-state string hard-coded English (matches siblings).

## TCM-T-4 — Closure: gates + HITL layout decision

- **Status:** `[~]` in progress — automated gates (a)+(b) green; awaiting owner HITL (TCM-AC-3) · 2026-08-28

### (a) Full re-run — isolated ToC-map tree (= the committed tree, foreign hunks excluded)
- FULL suite → **483 suites / 6962 tests / 1 snapshot green** (74.7s); `ng lint --quiet` clean; `ng build` exit 0.
- Test-count reconciliation (T-2/T-3 Reviewer note): the isolated tree count equals the combined-tree count → the concurrent session's hunks carry zero tests in the spec's files; the earlier ±1 discrepancies live in `programme-results/**`, outside this spec's scope. Reconciled.

### (b) Static gates (spec commits `66abcb0be`, `cab43109e`, `d233f85f5`)
- Scope: exactly `pr-viz-chart` (registration + count assertion) + `dashboard-lab/**` (12 files) — TCM-AC-2 boundary. ✅
- New hex: **0**. `package.json`: **0 diff**. ✅

### (c) HITL — PENDING OWNER (TCM-AC-3, SP02 @ 1280/1024px)
1. Radial legible (labels/espaciado, 5+ AoWs × ~6–10 hojas); decidir **radial kept** vs **fallback circular** (TCM-R-7) + OQ-1 (labels de hojas off) con el render vivo.
2. Encoding de progreso legible (cuartiles del ramp violeta; hub = primary — el design no nombró token para el root, confirmarlo).
3. Tooltips correctos; look-at: nodo AoW muestra "N indicators" (todas las tiers) junto a progreso done/total (solo output tier) — correcto por diseño, ¿confunde?
4. Click en AoW aterriza en su página entity-aow.
5. Comportamiento con el filtro de secciones: el mapa vive dentro del gate `aow` (se oculta al filtrar W1/W2·Bilateral) — decisión de gap-fill del Implementer, confirmar en vivo.
