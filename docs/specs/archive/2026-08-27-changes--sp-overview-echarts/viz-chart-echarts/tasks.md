# `changes/sp-overview-echarts/viz-chart-echarts` — Tasks

## 1. Scope of this task list

- **Module / feature:** `shared/components/pr-viz-chart` + `shared/utils/chart-tokens.util` + `echarts` dependency (client only)
- **Linked spec:** `requirements.md` (VCE-R-1..5) + `design.md` (VCE-DD-1..6)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** done — VCE-T-1 + VCE-T-2 PASS (2026-08-27, executed in worktree by peer session); rollout §6 pending
- **Depth:** Lite · **Budget:** 2 tasks / ~280 LOC / 1 review round (design.md §1)
- **Family:** `../family.md` row #2 · `Parallel-safe: yes` · may run in a worktree concurrently with #1

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1 gate 2026-08-27)
- [x] `design.md` approved (Phase 2 gate 2026-08-27)
- [x] Reference source available: `~/Development/alliance-research-indicators-main` @ `831388cd` (`git show 831388cd:client/research-indicators/src/app/shared/components/viz-chart/…`)
- [x] No migrations, no backend
- [x] Record `npx ng build` initial-chunk sizes **before** any change (baseline for VCE-AC-1)
- [x] No other in-flight spec editing `package.json`

## 3. Task list

### `VCE-T-1` — Install `echarts` and port the wrapper as `app-pr-viz-chart`

- **Type:** `client`
- **Description:** `npm i echarts@^6` in `onecgiar-pr-client` (the family's only `package.json` touch). Create `shared/components/pr-viz-chart/pr-viz-chart.component.{ts,html,scss,spec.ts}` ported from Alliance per design §2.2: module-level `use([...])` with the closed registration list (VCE-DD-4); inputs/outputs; init with `{renderer:'svg'}`; `ResizeObserver`; a11y gate (`requireTable && !tableModel` → `clear()` + `role="alert"`); reduced-motion shallow-copy `animation:false`; `p-skeleton` loading overlay with `aria-hidden` on the chart host; Tailwind `sr-only` table with `<caption>`, `<th scope="col">`, `<th scope="row">`; `ngOnDestroy` disconnect + dispose. SCSS is `:host{display:block}` only. Spec mocks `echarts/core` (`use`, `init` → mock instance), `ResizeObserver`, `matchMedia`.
- **Implements:**
  - `VCE-R-1` — *Render and resize* (SVG init; resize on observer callback; **BUT NOT** leak → `dispose()` + `disconnect()` on destroy; **AND IT MUST** register only declared modules → spec asserts the `use()` call's array length/members equal the design list, and no import from `'echarts'` root — grep gate)
  - `VCE-R-2` — *Chart without table* (`setOption` not called + alert rendered; **BUT NOT** throw; **AND IT MUST** render when `requireTable=false`) · *Table content* (caption, col headers, row headers in DOM)
  - `VCE-R-3` — *Click propagation* (captured `on('click')` handler → `chartClick` emits the same object) · *Reduced motion* (`setOption` arg has `animation:false`; **BUT NOT** mutate input → original object has no `animation` key after apply)
  - `VCE-R-5` — loading → skeleton present, chart host `aria-hidden="true"`
- **Files (expected):** `package.json`, `package-lock.json`, `shared/components/pr-viz-chart/*` (4 files)
- **Depends on:** — · **Blocks:** VCE-T-2 (util is independent in code but the spec for T-2 is cheapest once the component exists to smoke-import it — soft ordering)
- **Estimate:** M (~200 LOC incl. spec)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] All spec cases in design §10 row 1 green. **FAIL inputs:** remove the `requireTable` guard → "setOption not called" case red; drop `ngOnDestroy` → dispose/disconnect case red; spread `animation:false` into the same reference → "input untouched" case red; remove `on('click')` → emit case red.
  - [x] Registration gate: `grep -rn "from 'echarts'" onecgiar-pr-client/src/app` returns 0 hits (only `echarts/core|charts|components|renderers|features` allowed). **FAIL input:** `import * as echarts from 'echarts'`. **What this cannot prove:** that tree-shaking actually happened — that is the bundle gate below.
  - [x] Bundle gate: `npx ng build` **before and after on the same base commit**; record both initial-chunk sizes (raw + gz) in `execution.md`. Guideline delta < ~350 kB raw / ~110 kB gz. **Disqualifier:** a single post-change reading with no same-base baseline is not a delta — report "inconclusive", not a pass. **FAIL input:** root `echarts` import → delta roughly doubles.
  - [x] Full suite: `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage` green; `npx ng lint --quiet` clean; `npx ng build` succeeds. **If the suite fails on ESM transform of `echarts`/`zrender` despite the mock**, add `transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$|echarts|zrender))"]` to the `package.json` jest block and record it in `execution.md` — otherwise leave Jest config untouched. **Disqualifier:** narrowing with `--testPathPattern`.
  - [x] `git diff --stat` limited to `package.json`, `package-lock.json`, `shared/components/pr-viz-chart/**` (VCE-AC-4 minus the util, which is T-2).

### `VCE-T-2` — Token resolver util (`chart-tokens.util.ts`) with status tokens fenced

- **Type:** `client`
- **Description:** Create `shared/utils/chart-tokens.util.ts` exporting `CHART_TOKEN_NAMES` / `STATUS_TOKEN_NAMES` (`as const`), `resolveChartTokens()` → `{ ramp[4], primary, primaryStrong, bilateralMuted, textSecondary, border }` and `resolveStatusTokens()` → `--pr-status-*-fg/bg` pairs, both via `getComputedStyle(document.documentElement).getPropertyValue(...).trim()` and returning `''` for undefined tokens (VCE-DD-3/5). Doc-comment the fence: status tokens are for status-keyed widgets only, never chart series (colors.scss rule). Add `chart-tokens.util.spec.ts`.
- **Implements:**
  - `VCE-R-4` — *Token resolution* (ramp order + muted series returned; **BUT NOT** expose `--pr-status-*` in the chart set → spec asserts set disjointness; **AND IT MUST** return `''` for undefined → spec with a stubbed `getComputedStyle` returning `''` for one name)
- **Files (expected):** `shared/utils/chart-tokens.util.ts`, `shared/utils/chart-tokens.util.spec.ts`
- **Depends on:** — (soft: after VCE-T-1) · **Blocks:** —
- **Estimate:** S (~80 LOC incl. spec)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Spec asserts the **requested name set** equals `CHART_TOKEN_NAMES` (spy on `getPropertyValue`) — jsdom returns `''` for custom props, so value assertions would be tautological (Alliance KZ-017). **FAIL input:** add `--pr-status-approved-fg` to the chart list → disjointness assertion red.
  - [x] Spec: undefined token → `''`, never a hex string. **FAIL input:** add a `|| '#6b46e5'` fallback → red.
  - [x] Hex gate: `grep -nE "#[0-9a-fA-F]{3,8}\b" onecgiar-pr-client/src/app/shared/utils/chart-tokens.util.ts onecgiar-pr-client/src/app/shared/components/pr-viz-chart/*.ts` → 0 hits (VCE-AC-3). **What this cannot prove:** that the *resolved* colors are right at runtime — rendered correctness is sibling #3's HITL/T6 gate (explicit gap, requirements §9).
  - [x] Full suite + lint green (same disqualifier as T-1).

## 4. Dependency graph

```
VCE-T-1 (echarts + pr-viz-chart)
   └── (soft) VCE-T-2 (chart-tokens.util)
```

No cycles. Both can be implemented in one session.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `VCE-TEST-1` | unit (component, engine mocked) | VCE-R-1 · VCE-R-2 · VCE-R-3 · VCE-R-5 | `pr-viz-chart.component.spec.ts` |
| `VCE-TEST-2` | unit (util, `getComputedStyle` spied) | VCE-R-4 | `chart-tokens.util.spec.ts` |
| `VCE-TEST-3` | static gates | registration grep · hex grep · diff scope | shell, recorded in `execution.md` |
| `VCE-TEST-4` | measured | bundle delta (before/after, same base) | `npx ng build`, recorded in `execution.md` |
| — | **not covered here** | rendered visual correctness | sibling #3 HITL / T6 |

Client coverage thresholds (50/60/60/60) unaffected (new files come with specs).

## 6. Rollout & verification

- [ ] Single PR against `qa-development-2026` — ~280 LOC + lockfile churn, under the ~400 LOC threshold. PR description: review `pr-viz-chart.component.ts` registration list + a11y gate first; lockfile diff is noise; out of scope: any consumer, `chart.js` removal.
- [ ] CI green (lint, tests, build, SonarCloud).
- [ ] No manual UI check possible (no consumer) — say so in the PR.

## 7. Cleanup & follow-ups

- Flip `../family.md` row #2 to `done` at archive; register `app-pr-viz-chart` in `docs/ux-ui/design.md §8` (pending item — spec branch).
- `chart.js` retirement + dead `pages/entity-details/` cleanup → separate spec.

## 8. Roll-back plan

Revert the PR (removes dependency + files). Nothing else references the component until #3.
