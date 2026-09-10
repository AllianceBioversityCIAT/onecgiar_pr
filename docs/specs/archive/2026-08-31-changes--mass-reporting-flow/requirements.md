# Module Spec — Mass Reporting Flow — Requirements

> Depth: **Standard**. Approval Mode: **pre-approved** (proposal Document Control). Gates logged as `auto-approved (pre-approved mode)`.

## 1. Module / Feature

- **Module:** `results` (client `dashboard-lab` reporting views), server only for a data-seed migration
- **Sub-feature:** `mass-reporting-flow` · **Owner:** j.cadavid@cgiar.org · **Status:** `approved` (auto, 2026-08-29)
- **Proposal:** `proposal.md` (Change; competitor findings folded in)

## 2. Context

High-volume W1/W2 reporting (60+ KPIs per AoW) grinds through the grouped (`?tocView=aows`) and By-AOW (`?tocView=byAow`) views shipped by `changes/reporting-entry-hub`. This spec adds burn-down aids (filter, sort, next-pending, session counter), deep-linking parity with the competitor (`?kpi=`), stat-vocabulary coherence between both views, and an **admin-manageable AI narrative** per AoW. Verified against source: the app ships an in-browser LLM engine (`ASSISTANT_ENGINE` DI token, WebLLM impl; the status machine belongs to `AiAssistantService`, not the engine — the panel defines its own states) and an admin-gated global-parameters PUT (`PUT api/global-parameters/update/variable`, admin-only via `isUserAdmin`); there is **no server-side LLM** (grep: no LLM SDK; `api/ai` is audit-only). PRD: G1/M1.2, US-S1, US-A5 (admin tweaks without release), AC-3, AC-9.

## 3. In / Out of Scope

**In:** pending-only filter; burn-down sort with catalogue fallback; post-save next-pending (fallback-first); session counter; per-KPI copy-link + `?kpi=` restore; Reported x/y tiles on grouped AoW headers; zero-target rule unified; AI narrative per AoW (client-side engine) + `ai_narrative_enabled`/`ai_narrative_prompt` global parameters (seed migration) + admin card to manage both.
**Out:** editable table entry; one-result-many-KPIs; CSV/AI prefill of values; report-modal internals; server LLM endpoint (follow-up — engine seam documented); AI assistant chat; per-HLO **and per-grouped-header** narratives (v1 = By-AOW banner only); duplicate-cards investigation (`bugfix/duplicate-kpi-cards`); unifying the zero-target rule on the **Overview tab** (`overviewAowProgress`/`overviewXcutProgress`/toc-map keep today's rule — accepted divergence, follow-up).

## 4. Personas

| Persona | Change |
|---|---|
| Result submitter | Burn-down session tools; guided-by-link reporting; narrative draft for their AoW reporting notes |
| SP Leader / PMU | Coherent numbers across views; narrative draft for reviews |
| Platform admin | Toggles/edits the AI narrative from the admin section, no release (US-A5) |

## 5. User Stories

- **MRF-US-1** As a submitter, I want to see only my pending KPIs, ordered by remaining work, so a session burns down instead of re-reading.
- **MRF-US-2** As a submitter, I want to jump to the next pending KPI after reporting one, so N reports take ~2 interactions each.
- **MRF-US-3** As a coordinator, I want to copy a link to one KPI, so "report this one" is a URL.
- **MRF-US-4** As any user, I want both reporting views to speak the same numbers, so drilling SP → AoW → HLO → KPI never changes meaning.
- **MRF-US-5** As a submitter/leader, I want a draft narrative of an AoW's progress, clearly marked AI-generated, so reporting notes start from something.
- **MRF-US-6** As an admin, I want to enable/disable the narrative and edit its prompt without a release.

## 6. Functional Requirements

### Burn-down aids
- **MRF-R-1** Both reporting views MUST offer an **Only pending** toggle that hides `complete` KPIs AND zero-target KPIs (`target=0 && achieved=0` — hidden and excluded from counts, so visible == counted); a group whose KPIs are all hidden is hidden; visible-card counts and group KPI-count labels recompute — **the AoW header ratio does not** (pinned unfiltered: "progress must not move when you search"). State persists in `sessionStorage` and is off by default. In-progress KPIs stay visible (OQ-3).
- **MRF-R-2** Both views MUST offer a sort switch `Remaining work | Catalogue` (default **Catalogue** — no silent default change; the switch persists with MRF-R-1's mechanism). Remaining-work order: KPIs `not-started` → `in-progress` → `complete` (stable within state); groups by pending count desc.
- **MRF-R-3** After a report is saved for a KPI, the user MUST be able to reach the **next pending KPI** of the same scope without returning to the list manually:
  - **MRF-R-3.1** v1 mechanism (fallback-first): the indicator card of the last-reported KPI shows a **Next pending** action once the modal closes; activating it scrolls to and highlights the next pending card (Only-pending and sort settings respected). Modal-integrated "Save and next" is in scope ONLY if `EntityAowService` exposes a save signal verified against source during design; otherwise it is recorded as a follow-up, not attempted.
- **MRF-R-4** The By-AOW banner and the grouped header strip MUST show a **session counter** `N reported this session` (in-memory, reset on reload), incremented when a KPI's `achieved` rises during the session.

### Deep link + coherence
- **MRF-R-5** Every KPI card/row MUST offer **Copy link** producing a URL that carries `tocView=byAow&tocAow=<owning AoW code>&kpi=<indicator_id>` — `indicator_id` is NOT unique across AoWs (the codebase composites it with `__aowCode` everywhere), so the AoW is part of the address; grouped-view rows emit their own `__aowCode`. On load, `?kpi=` MUST survive until the owning ToC resolves (cold-load/new-tab case), then expand the owning group, scroll to and visually highlight the KPI, and consume the param (OQ-6).
  - **MRF-R-5.1** KPI cards MUST offer **Read more** expanding the clamped description in place (restores the approved proposal item).
- **MRF-R-6** The grouped view's AoW header ratio (`ratioOf`, which ALREADY renders `x of y` + %) MUST be rewired to delegate to the shared helper so it and the By-AOW banner produce identical numbers under one rule — no second chip is added. The ratio stays computed over the UNFILTERED set (existing pinned contract). Vocabulary: **Reported** = `achieved > 0` (ratio/banner); **Complete** = `achieved >= target` (burn-down states) — two named predicates, never conflated.
- **MRF-R-7** Zero-target rule (OQ-5): KPIs with `target = 0` and `achieved = 0` are **excluded from % denominators and pending counts, and hidden by Only-pending** (visible == counted); every affected % surface states it in a `title` ("excludes N zero-target KPIs"). Scope: **Reporting-tab surfaces only** — By-AOW banner (`buildAowBannerStats`), the grouped header ratio (`ratioOf`, rewired), burn-down counters. The Overview tab (`overviewAowProgress`, `overviewXcutProgress`) and the ToC map keep today's rule — accepted divergence recorded in §3 Out.

### AI narrative (admin-manageable)
- **MRF-R-8** When `environment.aiAssistant.enabled === true` **AND** `ai_narrative_enabled` resolves true, the By-AOW banner MUST offer **Generate narrative**; otherwise the control is absent from the DOM (not disabled). Honesty note: production currently ships `aiAssistant.enabled: false`, so enabling there requires an environment change + deploy — the "no release" admin promise holds per environment where the env flag is on (§7).
- **MRF-R-9** Activating it MUST generate, **client-side via the existing `ASSISTANT_ENGINE`** (WebLLM), a narrative from ONLY structured facts already on the page (AoW code/name, KPIs/reported/progress with the MRF-R-7 rule, per-tier and per-HLO counts, top pending HLOs), interpolated into the `ai_narrative_prompt` template (placeholders `{{aow}}`, `{{stats}}`, `{{hlos}}`). Engine contract (verified): `complete(messages, jsonSchema)` — the schema is REQUIRED and the output is a JSON string; the panel passes `{type:'object',properties:{narrative:{type:'string'}},required:['narrative']}` and `JSON.parse`s it; an unparseable completion renders the error state, never raw JSON.
  - **MRF-R-9.1** Output renders in a dismissible panel with a mandatory caption "AI-generated draft — review before use", a **Copy** action, and a **Regenerate** action. Nothing is persisted anywhere.
  - **MRF-R-9.2** The panel owns its state enum — `idle · checking · needs-optin · downloading · generating · ready · error · unsupported` — sourced from `DeviceCapabilityService.detect()` + `engine.isModelCached()` (unsupported/needs-optin), `init(tier, onProgress)` progress (downloading), `classifyEngineError` kinds (error). Generation failure NEVER breaks the banner.
  - **MRF-R-9.4** On a cold cache, Generate MUST first show an explicit in-panel consent step ("download the on-device model") and only after the user accepts call `init(tier, onProgress)` with visible progress — the panel is the opt-in owner; nothing downloads without that consent.
  - **MRF-R-9.3** While generating, the action is disabled with a progress state; a second AoW's generation cancels/supersedes the first (`interrupt()`).
- **MRF-R-10** Two `global_parameters` rows MUST exist via a reversible seed migration: `ai_narrative_enabled` (value `'0'` default-off) and `ai_narrative_prompt` (a sensible default template, ≤ 2000 chars). Client reads them from the bootstrap `globalVariablesSE.get` (booleans already coerced by `getPlatformGlobalVariables()`).
- **MRF-R-11** The admin section MUST gain an **AI narrative** card (pattern: `knowledge-products.component`) with the enable toggle and a prompt textarea, saving via the existing `PUT api/global-parameters/update/variable` (admin-gated server-side — AC-3; the card is cosmetic gating only).
  - **MRF-R-11.1** After save, the local `globalVariablesSE.get` MUST reflect the new values without reload (same pattern as the KP confidence screen).

### SHOULD / MAY
- **MRF-R-12** The narrative panel SHOULD show which facts were fed to the model (collapsible "Data used") for trust.
- **MRF-R-13** The session counter MAY also show per-program totals.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | Filter/sort are `computed` over data already in memory — no new requests. Narrative generation runs in the existing Web Worker; UI stays responsive; no server call. |
| Security / privacy | Narrative input is only aggregate numbers + public indicator titles already rendered; nothing leaves the browser (WebLLM is local). No secrets in the prompt template path (AC-9). Admin write stays server-gated (`isUserAdmin`). |
| Cost administration | AI is default-OFF; within an environment whose `aiAssistant.enabled` is true, enabling/disabling/re-prompting are admin data edits (US-A5), zero deploys. **Prod ships the env flag false today** — first prod enablement is an env change + deploy (explicit dependency). Backend swap later = new `ASSISTANT_ENGINE` implementation, parameters unchanged. |
| Migrations | One reversible seed migration; gate at task time = `npx tsc --noEmit` + reviewed `down()` (adding the file makes `migration:check` red until run); run/revert round-trip verified manually on a disposable DB (MRF-AC-11). |
| Accessibility | New controls keyboard-reachable with visible focus; narrative panel is a labelled region, `aria-live` on completion; highlight of `?kpi=` target must not rely on colour alone (also outline/scroll). |
| i18n | Strings continue in the dashboard-lab copy-map convention (accepted deviation, as `hub-copy.ts`). |
| Backwards compat | No payload/endpoint changes; migration is additive rows. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| MRF-AC-1 | AOW with 6 KPIs (2 complete, 1 zero-target) | Only pending ON | 3 cards visible; counts read 3 (visible == counted); groups all-hidden disappear; toggle survives an in-tab reload (`sessionStorage`). **BUT** in-progress KPIs remain visible **AND IT MUST** hide the zero-target KPI. |
| MRF-AC-2 | Sort = Remaining work | View renders | KPIs ordered not-started → in-progress → complete, groups by pending desc; switching back to Catalogue restores today's order exactly. |
| MRF-AC-3 | User saves a report for KPI A (modal closes, achieved rises) | — | KPI A's card shows **Next pending**; activating scrolls to + highlights the next pending KPI honouring filter+sort; session counter incremented. **BUT** if no pending remains, it says so instead of pointing nowhere. |
| MRF-AC-4 | Any KPI card (either view) | Copy link | Clipboard holds a URL carrying `tocView=byAow`, `tocAow=<owning AoW>` and `kpi=<id>`; opening it IN A NEW TAB (cold load) restores the view, expands the owning group, scrolls to and highlights that KPI, then consumes `kpi`. **BUT** an unknown id is a silent no-op. |
| MRF-AC-5 | Grouped view | Renders | The existing header ratio (`ratioOf`) delegates to the same helper as the By-AOW banner — identical numbers for the same AoW under the zero-target rule; the ratio stays unfiltered while Only-pending is on. |
| MRF-AC-6 | AoW with 10 KPIs of which 3 have target 0 & achieved 0 | Any % surface | Denominators use 7; a `title` states "excludes 3 zero-target KPIs". **AND IT MUST** apply identically in banner, tiles and pending counts. |
| MRF-AC-7 | `ai_narrative_enabled='0'` (or missing) OR `environment.aiAssistant.enabled=false` | By-AOW view | No Generate narrative control exists in the DOM (both gates asserted independently). |
| MRF-AC-8 | Both gates on, model already cached (or consented + downloaded via MRF-R-9.4) | Generate narrative | Panel parses `{narrative}` from the schema completion and renders it + caption "AI-generated draft — review before use" + Copy + Regenerate; facts fed = the page's own stats. **BUT** nothing is persisted (no API write occurs) **AND IT MUST** render the error state (never raw JSON) on an unparseable completion. |
| MRF-AC-9 | Flag on, engine unsupported/erroring | Generate narrative | State-specific message; banner and view unaffected. |
| MRF-AC-10 | Admin opens the admin AI card | Toggles flag + edits prompt, saves | `PUT update/variable` called per parameter; local `globalVariablesSE.get` updated; a non-admin caller gets 403 from the existing server gate (no new server code). |
| MRF-AC-11 | Disposable local DB (`docs/infrastructure.md` §6 — never the shared dev instance) | `migration:run`, then later `migration:revert` | After run: the two rows exist (category `platform_global_variables`, names unprefixed) and `migration:check` is green; after revert: exactly those two rows are gone (SELECT) and `migration:check` legitimately reports 1 pending. |

Cross-cutting ACs (not restated): AC-3, AC-9.

### Defect classes → gates

| Class | Gate |
|---|---|
| Filter/sort logic wrong (state mapping, group hiding, order) | Client unit tests on pure helpers + component fixtures (MRF-AC-1/2) with fixtures where wrong order/hiding fails loudly. |
| Zero-target rule inconsistent across surfaces | One exported helper used everywhere + a test asserting the same numbers from banner and tiles for a shared fixture (MRF-AC-6). |
| `?kpi=` restore broken (no expand/scroll) | Unit test on the restore handler (navigation/state assertions); scroll itself is jsdom-blind → manual checklist item. |
| Narrative: flag not hiding, states not degrading, persistence leak | Component tests with a mocked `ASSISTANT_ENGINE` (ready/unsupported/error) + assertion that no API service method is called on generate (MRF-AC-7/8/9). |
| Narrative text quality | **No automated gate** (subjective LLM output) — accepted risk; mitigations: admin-editable prompt, mandatory caption, Regenerate. |
| Admin card writes | Unit test: PUT called with `{name, value}` per parameter; 403 path is the existing server test's concern. |
| Migration reversibility | `npx tsc --noEmit` + Reviewer read of `down()` at task time (adding the file makes `migration:check` red by construction until run); run/revert round-trip is a T-8 manual row on a disposable DB (MRF-AC-11). |
| Visual (highlight, panel layout, responsive) | Manual checklist (jsdom-blind), recorded in execution.md. |

## 9. Dependencies & Assumptions

- Client engine: `ASSISTANT_ENGINE` token + `WebLlmEngineService` (exists; `environment.aiAssistant.enabled`). Device capability service governs support states.
- Global parameters: entity/controller/service + admin gate exist; client bootstrap exists (`app.component.ts:135`).
- `EntityAowService` save-signal existence is UNKNOWN until design-time source check (MRF-R-3.1 fallback stands regardless).
- Assumption: WebLLM small-model output is acceptable for a *draft* with mandatory review caption; server LLM is a documented follow-up seam, not a dependency.

## 11. Out-of-Band Notes

- Scope delta vs the approved proposal, recorded: the proposal's Scope said "no migration"; the AI addition (owner, 2026-08-29 "metamos la AI") brings one seed migration and re-baselines the LOC budget (design §14).
- Naming: the server's existing `global-narratives` module (PMU narrative texts) is UNRELATED — this feature is the "AI progress summary" in copy; parameter names stay `ai_narrative_*`.

## 10. Open Questions

All closed: OQ-1→separate bugfix; OQ-2→design-time check with fallback; OQ-3→hide complete only; OQ-4→per-AoW + program MAY; OQ-5→exclude zero-target, stated in `title`; OQ-6→expand+scroll+highlight; OQ-7→no server LLM (verified); v1 client engine; OQ-8→per AoW only.

## Required cross-references

`docs/prd.md` (G1, US-S1, US-A5, AC-3, AC-9) · `docs/ux-ui/design.md` (§7 DD-12, §10) · `docs/trd/trd.md` (§2 modules) · `proposal.md`, `design.md`, `tasks.md` · archived `changes/reporting-entry-hub` (surfaces extended).
