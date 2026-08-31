# Judgment Day — `changes/mass-reporting-flow` (spec review)

| Field | Value |
|---|---|
| Target | `requirements.md` + `design.md` + `tasks.md` (snapshot 2026-08-29, pre-fix) |
| Mode | judgment_day, one round, fix-only (owner mandate; re-judgment waived) |
| Judges | A, B — opus, blind, identical scope (author claude-fable-5) |
| Result | **JUDGMENT: APPROVED ✅ (after fix round 1)** |

## Counts

| | Judge A | Judge B | Confirmed clusters (both) | Single-judge severe (verified by orchestrator) | INFO |
|---|---|---|---|---|---|
| SEVERE | 10 | 8 | **7** | 1 (A-S6 composite id — evidence cited, accepted) | — |
| WARNING | 8 | 10 | — | — | 18 |
| SUGGESTION | 8 | 8 | — | — | 16 |

## Frozen ledger — confirmed severe → fixed

| ID | A/B | Finding | Fix applied |
|---|---|---|---|
| C-1 | A-S1/B-S1 | `complete(messages, jsonSchema)` requires a JSON schema (json_object mode hardcoded); `init(tier, onProgress)` has required args | Narrative = schema completion `{narrative: string}` + `JSON.parse` with unparseable-output fallback state; signatures stated; T-7 tests the unparseable path. |
| C-2 | A-S3+A-W8/B-S2 | Engine has no status machine; `classifyEngineError` yields error kinds only; three docs disagreed on the state list | Panel owns its state enum `idle·checking·needs-optin·downloading·generating·ready·error·unsupported`; sources named: `DeviceCapabilityService.detect()` + `engine.isModelCached()` (needs-optin/unsupported), `init` progress (downloading), `classifyEngineError` (error kinds). One list across all three docs. |
| C-3 | A-S2/B-S3+B-S4 | Nobody calls `init()`; assistant launcher commented out; `environment.prod.aiAssistant.enabled=false` — AC-8 unreachable, "no release" promise false in prod | Panel owns the opt-in: Generate on a cold cache shows an explicit "download model" consent step and then calls `init(tier, onProgress)` itself (design §8 rewritten — downloads only after in-panel user opt-in). Control gated on `environment.aiAssistant.enabled && ai_narrative_enabled` (R-8, AC-7, T-7 DOM assertions). Honest note: prod currently ships `aiAssistant.enabled=false` — enabling there is an env change + deploy; recorded in requirements §7 Cost row and design §1 (admin promise holds per-environment). |
| C-4 | A-S4+A-S5/B-S5 | Grouped header ALREADY renders `Reported x/y` via `ratioOf` (pinned by 4+ tests, deliberately unfiltered) | T-5 reframed: rewire `ratioOf` to delegate to the shared helper (zero-target rule) — no second chip; ratio stays UNFILTERED (pinned contract kept); the pinned tests whose values change under the new denominator are listed as expected-to-change. R-1 scoped: the filter recomputes visible-card counts and group KPI-count labels, never the header ratio. |
| C-5 | A-S10+A-S9/B-S7 | Zero-target KPIs: visible-vs-counted contradiction; three more live re-implementations of the done/total rule un-owned (`overviewAowProgress`, `overviewXcutProgress`, toc-map `isAchieved`) | Precedence fixed: zero-target KPIs are hidden by Only-pending AND excluded from counts (visible == counted), pinned as a T-1 fixture. Rule scope stated in R-7: **Reporting-tab surfaces only** (banner, ratioOf, burndown counts, tiles); Overview tab + toc-map keep today's rule — recorded as an explicit accepted divergence + follow-up. |
| C-6 | A-S7/B-S6 | `migration:check` red-by-construction when the file lands; AC-11 unsatisfiable both directions; no runnable owner | T-6 gate = `npx tsc --noEmit` + Reviewer read of `down()`; AC-11 reworded (run→green+rows; revert→rows gone, check legitimately pending); run/revert round-trip on a **disposable local DB** added to T-8 manual rows. |
| C-7 | A-S8/B-S8 | Seed category never named; client bootstrap reads ONLY `gpc.name='platform_global_variables'` (and strips `pgv_`); PUT matches the full stored name | Design §3: `INSERT … (SELECT id FROM global_parameter_categories WHERE name='platform_global_variables')`; row names exactly `ai_narrative_enabled`/`ai_narrative_prompt` (unprefixed, `kp_mqap_institutions_confidence` precedent); placeholder-presence check in T-6 DoD. |
| C-8 | A-S6 (verified) | `indicator_id` is not unique across AoWs (composited with `__aowCode` everywhere) | Deep link = `kpi=<id>` **always with** `tocView=byAow&tocAow=<owning AoW>` (copy from grouped rows emits the row's `__aowCode`); restore resolves within that AoW; MRF-TEST-3 asserts the composite + cold-load ordering (B-W7). |

## Warnings & suggestions applied in the same pass

`buildAowBannerStats` signature change + new expected fixture values (A-W2/B-W1/B-W8) · toc cache key = reported row's AoW captured at `openLegacyReportModal` (B-W2) · `force` skips both guards without deleting the entry (B-W3) · T-7 Depends-on += T-3, T-5 (A-W5/B-W4) · a11y assertions in T-7 + keyboard/focus row in T-8 (B-W5) · supersede-on-AoW-switch test (B-W6) · Reported (achieved>0) vs Complete (achieved≥target) defined (A-W3) · audit wording "timestamp only, no actor" (A-W4) · controls live inside the `showToolbar` block, reporting mode only (A-W6) · §2 "nothing new" dropped (A-W1) · proposal drift + LOC re-baseline notes (B-W9/B-W10) · CDK `Clipboard` prescribed (A-G4/B-G2) · storage = two scalar `pr.burndown.*` keys (A-G5) · admin route before the `**` catch-all (A-G6) · task split "1 db+client, 6 client, 1 verification" (A-G8) · `pgv_` note (B-G3) · T-6 spec path (B-G4) · disposable DB (B-G6) · dropped proposal items added to Out (B-G7: Read-more, "M pending" wording kept ambiguous-free, per-grouped-header narrative) · naming note vs `global-narratives` module (A-G7) · template sections restored (A-G3/B-G8) · cites fixed (A-G2/B-G1) · proposal superseded-note (A-G1).

**Not applied (recorded):** A-W7/full-coverage run in T-8 — conflicts with the owner's standing "never the full client suite" rule; coverage stays CI's gate, recorded as accepted risk in tasks §6.

## Terminal state

Re-judgment waived by owner. Orchestrator sweep of superseded values (`tile chip`, `plain-text complete`, `needs-optin from classifyEngineError`, `migration:check green` as T-6 gate, uncategorised INSERT) — zero residual hits after the fix pass.

**JUDGMENT: APPROVED ✅**
