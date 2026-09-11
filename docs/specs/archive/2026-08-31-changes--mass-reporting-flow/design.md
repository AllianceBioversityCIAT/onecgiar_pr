# Module Spec — Mass Reporting Flow — Design

> Depth: **Standard**. Approval Mode: **pre-approved** (gate logged auto-approved, 2026-08-29). Judgment-day: one pass, fix-only.

## 1. Summary

Client-heavy change over the reporting views shipped by `reporting-entry-hub`: burn-down state (filter/sort/next-pending/session counter) as pure helpers + `computed`s in `DashboardLabComponent`; `?kpi=` deep links completing the URL chain; one shared stat helper closing the zero-target rule everywhere; and an **AI narrative** generated **in-browser** through the existing `ASSISTANT_ENGINE` (WebLLM), governed by two `global_parameters` rows (seed migration) and a small admin card. **Trade-off accepted:** v1 narrative quality is small-model quality — mitigated by default-OFF, admin-editable prompt, mandatory "AI-generated draft" caption, Regenerate; a server LLM later is an engine-swap behind the same DI token, parameters unchanged (the engine contract names that seam). **Environment honesty:** prod ships `environment.aiAssistant.enabled: false` (the app's AI kill-switch; the assistant launcher is commented out) — the narrative respects that gate, so first prod enablement is an env change + deploy; per-environment administration afterwards is parameter-only.

Links: `requirements.md`, `proposal.md` (competitor findings), `docs/ux-ui/design.md` §7/§10, `docs/trd/trd.md` §2.

## 2. Architecture Overview

- **Server touched:** one reversible **seed migration** (two `global_parameters` rows). No endpoint, no service, no entity change.
- **Client touched:** `dashboard-lab.component.{ts,html}` (+ a new `reporting-burndown.ts` pure-helper file and `narrative-panel` component under `dashboard-lab/components/`), `reporting-aow-table.component.*` (header tiles + copy-link/next-pending hooks on rows), `reporting-program-band.component.*` (Only pending + sort controls), `results-api.service.ts` (one generic `PUT_updateGlobalVariable({name, value})` for the admin card; the narrative itself makes no API call), `admin-section` (new `ai-narrative` card), `shared/services/global-variables.service.ts` (2 typed fields), `shared/components/ai-assistant/engine/*` (consumed via DI only, unchanged).

### 2.1 Flows

```
Burn-down: buildIndicatorCardMeta (existing) → burndown helpers (filter/sort/counts, zero-target rule central)
  → plannedByAowSections + reportingGroups consume the SAME helper outputs → band controls write two persisted signals (sessionStorage).
Next pending: openLegacyReportModal(row) records lastReportKpiId
  → effect: showReportResultModal true→false ⇒ force-refresh loadToc(program, activeAow) (cache bypass)
  → achieved delta ⇒ sessionReported++ ; card of lastReportKpiId shows "Next pending" → scroll+highlight next per filter/sort.
?kpi=: Copy link copies (CDK Clipboard) a URL carrying tocView=byAow & tocAow=<owning __aowCode> & kpi=<indicator_id> (id is NOT unique across AoWs). On restore (queryParamMap read, same site as tocAow):
  set pendingKpi → after toc load: expand owning group (byAow sections are open; grouped view uses tocView=byAow of the owning AoW), scroll+highlight.
Narrative: banner button (double gate: environment.aiAssistant.enabled && globalVariablesSE.get.ai_narrative_enabled)
  → NarrativePanelComponent state machine: checking (DeviceCapabilityService.detect + engine.isModelCached)
     → unsupported | needs-optin (explicit in-panel consent: "download the on-device model") → downloading (init(tier, onProgress), progress bar)
     → generating: facts from plannedAowBanner()+plannedByAowSections() → interpolate ai_narrative_prompt ({{aow}},{{stats}},{{hlos}})
     → engine.complete(messages, {type:'object',properties:{narrative:{type:'string'}},required:['narrative']}) → JSON.parse
     → ready (caption, Copy via CDK Clipboard, Regenerate=interrupt-first, Data used) | error (classifyEngineError kinds; unparseable JSON ⇒ error state, never raw JSON).
Admin: admin-section card → PUT api/global-parameters/update/variable per parameter (existing, admin-gated) → update globalVariablesSE.get locally.
```

## 3. Data Model Changes

None structural. **Migration** `<timestamp>-MRF-seed-ai-narrative-parameters.ts`: `up()` INSERTs `ai_narrative_enabled` (`'0'`, description) and `ai_narrative_prompt` (default template ≤2000 chars, MUST contain the placeholders `{{aow}} {{stats}} {{hlos}}`) with `global_parameter_category_id = (SELECT id FROM global_parameter_categories WHERE name = 'platform_global_variables')` — the client bootstrap reads ONLY that category (`global-parameter.repository.ts` filters `gpc.name='platform_global_variables'` and strips a leading `pgv_`); row names are stored UNPREFIXED (`kp_mqap_institutions_confidence` precedent; the `pgv_` prefix is not used), and `PUT update/variable` matches the full stored name. `down()` DELETEs exactly those two names. Reversible; task-time gate `npx tsc --noEmit` + reviewed `down()` (see MRF-AC-11 for the manual run/revert round-trip).

## 4. API Surface

No new/changed endpoints. Reused as-is: `GET api/global-parameters/platform/global/variables` (bootstrap), `PUT api/global-parameters/update/variable` (admin-gated server-side). AC-4 untouched.

## 5. Server Workflow

Migration only. (Follow-up seam, not built: a server narrative endpoint would follow the `bilateral-ai-text-mining.service.ts` HttpService+X-API-Key+timeout template — recorded for the future engine swap; note its verbose payload logging is NOT to be copied, AC-9.)

## 6. Frontend Plan

| Piece | Path | Notes |
|---|---|---|
| `reporting-burndown.ts` (pure) | `dashboard-lab/` | Exports: `applyZeroTargetRule(inds)` → `{counted, zeroTarget}`; `pendingOf(inds)`; `sortRemainingFirst(inds)`; `groupPendingCount(group)`; `nextPendingAfter(kpiId, orderedInds)`; session-counter diff `countNewlyReported(prev, next)`. **Single home of the zero-target rule** — `buildAowBannerStats` and the tiles delegate to it (MRF-R-7). All unit-tested with fixtures where lexical/order/zero-target mistakes fail. |
| Band controls | `reporting-program-band` | `Only pending` toggle + `Sort` segmented — INSIDE the `showToolbar` block only (the band has three hosts; Overview and Programme-results render it with `showToolbar=false`), visible in both reporting modes; new inputs/outputs, same style recipes. |
| Dashboard-lab state | `dashboard-lab.component.ts` | `onlyPending` + `burndownSort` persisted as two scalar keys `sessionStorage 'pr.burndown.onlyPending' / 'pr.burndown.sort'` (setItem/getItem in try/catch, repo convention); `sessionReported` signal; `lastReportKpiId`; `pendingKpi` (from `?kpi=`); effect on `entityAowService.showReportResultModal` false-edge → force `loadToc(program, <AoW of the reported row — captured with lastReportKpiId in openLegacyReportModal>)`; `force` skips BOTH early-out guards (`tocByKey.has` and `loadingTocKeys.has`) WITHOUT deleting the cache entry (deleting flips the view into its skeleton — overwrite on arrival instead). Feeds filtered/sorted data into BOTH `plannedByAowSections` and `reportingGroups` paths via the helpers. |
| Copy link + Read more | indicator cards (By-AOW) + `reporting-aow-table` rows | Icon button; **CDK `@angular/cdk/clipboard` `Clipboard`** (repo precedent `pdf-export.service.ts`); URL = `tocView=byAow&tocAow=<owning __aowCode>&kpi=<id>` composite. `?kpi=` restore beside the `tocAow` restore, with `pendingKpi` surviving until the owning ToC resolves (cold-load/new-tab), then consumed; highlight = temporary class + `outline` (not colour-only) + `scrollIntoView` respecting reduced motion. Read more toggles the description clamp in place (MRF-R-5.1). |
| Grouped header ratio | `reporting-aow-table` | The EXISTING `ratioOf()` (already rendering `x of y` + % in the header, deliberately over the unfiltered set) is rewired to delegate to the shared helper — no second chip. Pinned tests expected to change where the new denominator changes values (`describe('AoW ratio')` cases + the header-content case); the "unfiltered" and "no divide-by-zero" contracts stay pinned as-is. |
| `NarrativePanelComponent` | `dashboard-lab/components/narrative-panel/` | Standalone; inputs: `aow`, `stats`, `hlos`, `promptTemplate`; injects `ASSISTANT_ENGINE` + `DeviceCapabilityService`. **Own state enum** `idle·checking·needs-optin·downloading·generating·ready·error·unsupported` — needs-optin/unsupported from `detect()`+`isModelCached()`; downloading from `init(tier, onProgress)` (called ONLY after the in-panel consent step — the panel is the opt-in owner); error kinds from `classifyEngineError`; unparseable completion ⇒ error state. Completion = `complete(messages, {narrative:string} schema)` + `JSON.parse`. Caption + Copy (CDK `Clipboard`) + Regenerate (`interrupt()` first) + collapsible "Data used" (MRF-R-12); `interrupt()` on AoW switch/close/destroy; `aria-live` on completion, labelled region. Copy map `narrative-copy.ts`. Double gate lives in the host (control absent from DOM when either gate is off — MRF-AC-7). |
| Admin card | `admin-section/pages/ai-narrative/` (routed like `knowledge-products`; **inserted BEFORE the `**` catch-all** in `adminModuleRouting`) | Toggle + textarea + Save; one `PUT_updateGlobalVariable({name, value})` per changed parameter (value as `'1'/'0'` string for the flag); updates `globalVariablesSE.get` in place (MRF-R-11.1). |
| `GlobalVariables` typing | `global-variables.service.ts` | `+ ai_narrative_enabled?: boolean; ai_narrative_prompt?: string;` |

Design tokens: reuse the `reporting-entry-hub` recipes verbatim (§6.3 of that spec); no new hex; `@akili-spec changes/mass-reporting-flow` markers.

## 7. Security & Authorization

Narrative input = aggregate numbers + indicator titles already rendered to this user; generation is local (WebLLM) — nothing leaves the browser; no persistence. Admin writes ride the existing `isUserAdmin` gate; the client card never gates alone (AC-3). Prompt template is data, rendered as text only — never interpolated into HTML (`textContent` binding), never executed.

## 8. Performance

Helpers are O(n) computeds on in-memory arrays (≤ ~250 inds/AoW). Force-refresh on modal close = one existing `GET toc-results` call per close. Narrative runs in the existing worker; the model downloads ONLY after the panel's own explicit consent step (MRF-R-9.4) — never on load, never silently; `unsupported` renders a terminal state.

## 9. Observability

None added (client-local features). Admin edits update `last_updated_date` only — the service sets no actor (`last_updated_by` unpopulated); recorded as-is, actor audit is an out-of-scope follow-up.

## 10. Testing Plan

Server: migration up/down test not practical in unit jest → gate = `migration:check` + code review of down(). Client unit (targeted): `reporting-burndown.spec.ts` (pure, exhaustive); band controls; dashboard-lab burndown/`?kpi=`/session-counter effects (new focused spec file, pattern `dashboard-lab.hub.spec.ts`); `narrative-panel.component.spec.ts` with a **mock engine** (ready/unsupported/error + no-API-call assertion + interrupt-on-regenerate); admin card spec (PUT args + local store update); `reporting-aow-table` additive tiles (existing suite stays green). Manual checklist (execution.md): highlight/scroll, narrative panel look, real WebLLM generation on a capable device, admin round-trip on a running stack.

## 11. Rollback

Revert PR + `migration:revert` (removes the two rows). Flag default-off means the AI surface ships dark.

## 12. Design Decisions

- **MRF-DD-1 — Narrative runs on the existing in-browser engine, not a new server endpoint.** Context: zero server LLM exists (verified); the engine ships with status machinery and a documented server-swap seam. Alternatives: new server module wrapping a not-yet-existing microservice (dead in every env); calling the result-QA Lambda (undocumented contract, different purpose). Consequences: small-model drafts (mitigations in §1); offline-capable; zero cost; swap later behind `ASSISTANT_ENGINE`.
- **MRF-DD-2 — Administration = two global parameters + a thin admin card.** Context: US-A5; `PUT update/variable` + admin gate exist; only per-feature admin screens exist (KP confidence pattern). Alternatives: env vars (needs deploys — fails the owner constraint); a new generic parameters CRUD (bigger, out of scope). Consequence: server cache service (`global-parameter-cache.service`) is NOT used for these (client reads bootstrap values; note its no-expiry pitfall for any future server read).
- **MRF-DD-3 — Next-pending is card-level on modal close, not modal-integrated.** Context: verified — `EntityAowService` exposes only `onCloseReportResultModal()`; close ≠ save; the legacy modal has no outputs. Save detection = achieved delta after a forced toc refresh. Alternatives: patching the legacy modal (out of scope by requirement); no refresh (counter blind). Consequence: one extra `toc-results` call per modal close; "Save and next" inside the modal recorded as follow-up.
- **MRF-DD-4 — Sort default stays Catalogue.** Reversion-check (Step 2.3): changing the default order would silently alter an already-shipped view for every user; the switch makes burn-down order opt-in. Nothing breaks; no test asserts order defaults today (verified: table tests pin headings, not row order).
- **MRF-DD-5 — Zero-target rule centralised in `reporting-burndown.ts`, Reporting-tab scope.** `buildAowBannerStats` gains `target_value_sum` in its parameter type (signature change; all call sites updated) and delegates; its existing fixture (`[{3},{0},{'2'},{null}]` with NO targets → today `{4,2,50%}`) becomes `{total:2, done:2, pct:100, zeroTarget:2}` under the new rule — stated here so T-1 pins the intended values, not an accident. `ratioOf` delegates too. Overview surfaces (`overviewAowProgress`, `overviewXcutProgress`, toc-map `isAchieved`) intentionally keep today's rule (accepted divergence; follow-up to unify). Sweep: banner, ratio, burn-down counters.

## 13. Open Gaps & Follow-ups

Modal-integrated Save-and-next (needs modal outputs); server LLM engine implementation (text-mining service template, minus its payload logging); per-HLO narratives; narrative i18n once the dashboard adopts i18n.

## 14. Budget

| Measure | Estimate |
|---|---|
| Tasks | **8** (1 db+client, 6 client, 1 verification) |
| Non-test LOC | ~700 logic + **~350 template** (state-rich panels/controls counted separately — KZ-REH-1) ≈ **1 050** |
| Test LOC | ~600 |
| Review rounds | ≤ 1 per task (owner rule; 2nd FAIL escalates) |
| Tripwire | > 10 tasks or > 1 500 total non-test LOC → stop and escalate |
| Re-baseline note | The approved proposal sized Option A at ~300–400 LOC; the owner's AI addition (2026-08-29) re-baselined to this table — the tripwire reads against the new figure, recorded per judgment C-cluster B-W10 |

Gate: auto-approved (pre-approved mode), 2026-08-29.
