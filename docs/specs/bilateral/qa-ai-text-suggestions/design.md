# Design — QA AI: edit Title/Description in the verdict drawer, with optional AI suggestions (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` · `qa-ai-text-suggestions` · **`BIL-QTS`** |
| Depth | **Standard** (re-checked against this design in §Budget) |
| Status | **approved** 2026-09-29 (Phase 2) |
| Owner | Juan David Delgado |
| Date | 2026-09-29 |
| Verified at | `f70d25801` |
| Requirements | `requirements.md` (this folder), Phase 1 approved 2026-09-29 |
| Parent designs | `bilateral/qa-ai-traffic-light/design.md` §4.5, §5, DD-3 · `bilateral/qa-ai-verdict-drawer/design.md` |
| Kaizen lessons | No `docs/specs/kaizen-log.md` in this checkout. Lessons cited inline are from the Step 2.2 rules (KZ-004 stated-empty) |

## 1. Summary

The feature has three layers, none of which adds a migration or an endpoint.

1. **Contract:** an optional `suggestions` object inside `general_information` of the AI response. `contract_version` stays `0.2`.
2. **Server (AI client):** section objects are rebuilt from an explicit allow-list. A pure normalizer keeps a suggestion only when it passes the `R-8` rules and drops it otherwise. The same stateless normalizer also runs on read, so a stored row can never serve an unsanitized suggestion.
3. **Client:** the drawer's GI card gains two editable fields and optional suggestion blocks. It saves **through the editor's existing autosave/manual-save machinery**, so there is no second writer that could race the form. It gains a **Check again** action that reuses the rail's Submit-for-review path, which runs the check and never submits.

## 1A. Premise Ledger

**Count:** 14 rows, 14 verified, 0 `UNVERIFIED` (0 High, 0 Low).
**Blast-radius triggers:** `live-path` (user actions Save / Apply / Check again), `shared-state` (the GI title/description state and the GI autosave group are shared by the form and the drawer), `consumer` (stored and served `sections` shape; the client `BilateralQualityAssessmentView` interface).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Form title/description state lives in `BilateralCreationService.resultTitle` / `resultDescription`. The GI section hydrates its local signals from them by effect | shared-state | `section-general-info.component.ts:221-226` (hydration effects) · `:391-398` (`onTitleChange` writes back to `creationService.resultTitle`) | f70d25801 | DD-3 changes: the drawer would need its own refresh path. **High** | — |
| P-2 | The form never PATCHes on keystroke: fields are staged in `BilateralAutoSaveService` and sent only by `flush()` from the explicit Save draft | shared-state | `bilateral-auto-save.service.ts:30-33` (header comment) · `:153-161` (`updateField`/`notifyBlur` only stage) · `:207-243` (`flush`) | f70d25801 | DD-3 changes. A direct PATCH would suffice if staging did not exist. **High** | — |
| P-3 | `flush(['generalInfo'])` sends **every** staged GI field (title, description, lead contact, 5 DAC tags), not a single field | shared-state | `bilateral-auto-save.service.ts:50-60` (`FIELD_ENDPOINT_KEYS`, all → `generalInfo`) · `:214-235` (filter by endpoint, not by field) | f70d25801 | DD-3's side effect (also saving other staged GI edits) disappears. **Low** | — |
| P-4 | Manual save settles via `waitForSectionSave` + `hasErrorFor` + `lastErrorMessageFor`, with a 15 s cap | location | `bilateral-result-creator.component.ts:900-963` (`triggerManualSave`, `MANUAL_SAVE_TIMEOUT_MS`) | f70d25801 | T-5 builds its own settle logic. **Low** | — |
| P-5 | The rail's Submit for review (`submitResult`) runs the guards (read-only, unsaved sections, invalid fields) and then `qualityAssessment.run()`. It does **not** submit. Submitting is `submitAfterQualityDecision` | live-path | Rail button → `submitResult()` `bilateral-result-creator.component.ts:786-835` (read-only guard :792, unsaved :794-806, invalid :813-822, `run` :825) · submit = `submitAfterQualityDecision` :837-851 | f70d25801 | DD-4 (Check again = `submitResult`) is wrong and would submit. **High** | — |
| P-6 | A stale assessment already hides the submit button and shows the stale notice, but offers no re-run | existence | `bilateral-quality-assessment-dialog.component.html:74-75` (notice), `:169` (`@if (!stale())` around submit), footer `:166-184` (no other action) · `stale` = `is_current === false` `…component.ts:93` | f70d25801 | R-4's hide-submit half is already done. Only Check again is new. **Low** | — |
| P-7 | The server refuses a submit against a stale assessment | existence | `bilateral-center.service.ts:2298-2305` | f70d25801 | Client-only stale handling would be unsafe; a server guard would be needed. **High** | — |
| P-8 | Only these keys exist on a section today: `verdict, score, comments, strengths, issues, fields`. Everything else passes through `...rest` into the `json` column | data-env | `bilateral-quality-rules.ts:26-43` · `bilateral-quality-assessment.client.ts:433-438` · entity `bilateral-quality-assessment.entity.ts:132-135` | f70d25801 | DD-2's allow-list would need more keys. **Low** | — |
| P-9 | `assess()` has the outbound payload in hand, so novelty can be checked against the sent title/description without new plumbing. `applyGreyRule` rewrites only evidence items, never the GI verdict | location | `bilateral-quality-assessment.client.ts:488-491` (`assess(payload, ctx)`) · `bilateral-quality-rules.ts:180-220` (grey rule loops evidence items) · orchestrator `bilateral-quality-assessment.service.ts:368-380` | f70d25801 | The normalizer moves to the service after `applyGreyRule`. **Low** | — |
| P-10 | The form counts words with `WordCounterService.counter`: strip `<p>`/`&nbsp;`/tags, split on single spaces, skip `''`, `\n`, `\t` tokens | location | `onecgiar-pr-client/src/app/shared/services/word-counter.service.ts:9-20` · used by `pr-input.component.ts:87` | f70d25801 | Server and client limits could disagree on a borderline text (R-8 "counted the way the form counts"). **Low** | — |
| P-11 | No stored `bilateral_quality_assessments.sections` row in prtest/prod carries keys outside P-8's set, including `suggestions` | data-env | Query 1 (`JSON_TABLE` over `JSON_KEYS(sections)`, then per-section `JSON_KEYS`, grouped by section/inner key): only `verdict`/`score`/`comments`/`strengths`/`issues`/`fields` appear across the 5 section keys (`contributors_and_partners`, `evidence`, `general_information`, `geographic_location`, `type_specific`) — no `suggestions`, no unknown key · Query 2: 129 total rows, 0 null `sections` · Query 3 (`status` × `JSON_TYPE` × `JSON_LENGTH` of `sections`): `completed`/OBJECT/4 sections ×19 rows, `completed`/OBJECT/5 sections ×25, `skipped_kp_rule`/OBJECT/5 sections ×4, `unavailable`/OBJECT/0 sections (`{}`) ×81 — all 129 rows accounted for. Prod not run: owner decision 2026-09-29 to close P-11 on prtest evidence alone, bounded by P-13 (no code reader of section keys outside P-8's set) and because DD-2 only affects future writes — recorded as a decision, not a gap | prtest, 2026-09-29 (owner: Juan David; live DB query, not a commit citation) | DD-2 would drop a key someone relies on, and a raw `suggestions` could already exist (covered by DD-2's read-side normalizer either way). **High** | — |
| P-12 | A Knowledge Product never reaches GI edit in the drawer: KP rows are `status = skipped_kp_rule` | existence | `bilateral-quality-assessment.service.ts:324` (`status: 'skipped_kp_rule'`) · R-1 excludes that status | f70d25801 | A KP title could be edited from the drawer against CGSpace authority. **Low** (R-1 also excludes KP by type) | — |
| P-13 | Readers of `sections` are only the AI client (write), the orchestrator/DTO (serve verbatim), the dialog, the UI service and the field-quality flag. No server-side reader interprets section keys beyond `verdict` | consumer | `grep -rnE "\.sections\b\|sections\[\|sections:" onecgiar-pr-client/src onecgiar-pr-server/src --include='*.ts' --include='*.html'` (excluding `migrations/`, specs) → bilateral hits only at `bilateral-quality-assessment.client.ts:238,243,249,276` · `bilateral-quality-assessment.service.ts:268,331,380,434` · `bilateral-quality-assessment-dialog.component.ts:109-113` · `bilateral-quality-assessment-ui.service.ts:21,121,159` · `bilateral-field-quality-flag.component.ts:10`; `had_outstanding_flags` reads verdicts only (`bilateral-center.service.ts:2213-2220`) | f70d25801 | An unlisted reader would need the new field or would break on the allow-list. **High** | — |
| P-14 | Test files pinning the section shape or `general_information` | consumer | `grep -rln "general_information" onecgiar-pr-server/src onecgiar-pr-client/src onecgiar-pr-client/cypress` restricted to `spec`/`cy.ts` → bilateral: `bilateral-quality-assessment.client.spec.ts`, `bilateral-quality-assessment.service.spec.ts`, `bilateral-quality-payload.builder.spec.ts`, `bilateral-quality-rules.spec.ts`, `bilateral-quality-assessment-dialog.component.spec.ts`, `bilateral-quality-assessment-ui.service.spec.ts`, `bilateral-result-creator.component.spec.ts` | f70d25801 | Suites break unseen. Carried into each task's `Consumers` | — |

*(P-11 is `High` because a false P-11 means DD-2 silently drops data a reader needs. P-13 shows no such reader in code, which bounds it.)*

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Unit | Change |
|---|---|---|
| Contract | `docs/bilateral-module/integration-contracts.md` §Quality assessment | Response key + change log + *For the AI team* block |
| Server | `bilateral-quality-rules.ts` | `QualitySectionResult` gains optional `suggestions` + a pure `normalizeSuggestions` (shape rules) + word counter parity |
| Server | `bilateral-quality-assessment.client.ts` | Allow-list rebuild in `sanitizeScores`; novelty + shape normalization with the payload in hand |
| Server | `bilateral-quality-assessment.service.ts` | Read path (`toDto`, `:434`) runs the stateless shape normalizer |
| Client | `bilateral-quality-assessment-ui.service.ts` | View type gains `suggestions`; `markStale()` |
| Client | `bilateral-quality-assessment-dialog` | GI edit block, suggestion blocks, unsaved reminder, Check again |
| Client | `bilateral-result-creator.component` | Handles `giFieldSaveRequested` and `recheckRequested` outputs |

### 2.2 Flows

**Save from the drawer (R-2, R-4):**
1. The dialog emits `giFieldSaveRequested({ field: 'title' | 'description', value })`.
2. The creator writes `creationService.resultTitle/Description`, which hydrates the GI section (P-1), and stages the field with `autoSaveService.updateField`.
3. It then runs the P-4 settle sequence scoped to `general-info` (flush `generalInfo` → wait → error check).
4. On success the creator calls `qualityAssessment.markStale()` and shows the saved confirmation. On error it shows the server reason and **does not** mark stale.

**Apply (R-3):** local to the dialog. The field's draft value becomes the suggestion text, and nothing is emitted.

**Check again (R-4):** the dialog emits `recheckRequested` and the creator calls `submitResult()` (P-5). The existing guards, running state, polling, error alerts and the new verdict all come for free.

**AI response (R-6…R-9):** `assess()` → schema check (unchanged) → `sanitizeScores` rebuilds each section from the allow-list, with `suggestions` only on GI → `normalizeSuggestions(raw, verdict, sentGI)` → stored. **Read:** `toDto` → `normalizeSuggestions(stored, verdict)` without the novelty step → served.

## 3. Data Model

No entity or migration change. `suggestions` lives inside the existing `sections` JSON column (P-8), and the `QualitySectionResult` TypeScript type gains the optional field. Pre-change rows have no key, which reads as "no suggestion".

## 4. API Surface

| Endpoint | Change |
|---|---|
| `POST /api/bilateral/center/quality-assessment/:resultId` · `GET …/:resultId/latest` | Response `sections.general_information.suggestions?: { title?: string, description?: string }`, present only when a usable suggestion exists. Additive (AC-4) |
| `PATCH api/results/bilateral/general-info/:resultId` | Unchanged, reused |
| Outbound AI response | + optional `sections.general_information.suggestions` (requirements `R-7`; contract copy in T-1) |

No `/api/bilateral/*` consumer payload (`bilateral-result-summaries.en.md`) changes, so that change log gets no row.

## 5. Server Workflow / Business Rules

`normalizeSuggestions` is pure and has no I/O:

| Step | Rule (R-8) | Result |
|---|---|---|
| 1 | Section is not GI, or the value is not a plain object | no `suggestions` |
| 2 | GI verdict ∉ {amber, red} | no `suggestions` |
| 3 | Per key `title`/`description`: not a string, or empty after trim | that key dropped |
| 4 | Word count (P-10 algorithm, re-implemented server-side) > 30 / 300 | that key dropped |
| 5 | *(write only)* Trimmed text === trimmed value sent in the request | that key dropped |
| 6 | Any other key | ignored |
| 7 | Both dropped | `suggestions` omitted entirely (never `{}`) |

- Drops are counted, and the client logs one line per assessment with the count and `request_id`, never the text (W8).
- The allow-list rebuild keeps only `verdict, score, comments, strengths, issues, fields` (+ `suggestions` on GI), with the existing `normalizeFields` and `sanitizeScore` untouched.
- The schema check (`isValidAiResponse`) is **not** extended. That is what guarantees R-6.

## 6. Frontend Plan

### 6.1 Components & state

| Unit | Responsibility |
|---|---|
| Dialog inputs | `+ editable: boolean` (creator passes `!isFormReadOnly()` from the same computed that locks the form, `bilateral-result-creator.component.ts:452,478`) · `+ currentTitle`, `currentDescription` (from `creationService`) · `+ savingField: 'title' \| 'description' \| null` · `+ lastSaveResult: { field: 'title' \| 'description'; ok: boolean; seq: number } \| null` (set by the creator when each drawer save settles; `seq` increments per save so two equal outcomes still register) |
| Dialog outputs | `+ giFieldSaveRequested({field, value})` · `+ recheckRequested()` |
| Dialog local state | `draftTitle`, `draftDescription` signals, seeded from the inputs when the drawer opens or the saved value changes · `savedTitle`, `savedDescription` baselines, seeded with the drafts and moved **only** on `lastSaveResult.ok`, to the value that field's Save emitted (not the draft at settle time, so text typed while a save is in flight stays dirty — amended 2026-09-29, T-4 attempt 3, owner-approved) · `dirty(field)` = draft ≠ saved baseline (not ≠ `currentTitle`: the creator writes `creationService` before the flush, DD-3, so `current` already equals the draft when a save fails — execute-time correction 2026-09-29, T-4 attempt 1) · the outcome is announced in the `aria-live` region (NFR Accessibility) |
| `canEditGi` computed | `editable && status === 'completed' && GI verdict ∈ {amber, red} && !running && !submitting && resultType ≠ KP` |
| Validation | `WordCounterService` (P-10), limits 30/300. Title required and not the draft placeholder (`isPlaceholderTitle` logic in `section-general-info.component.ts:304`) |
| UI service | `suggestions` on the view type · `markStale()` sets `is_current = false` on the held view (server stays the authority, P-7) |

**Correction to `requirements.md` R-1:** the prefill is the value **the form currently holds** (`creationService`), not "saved". The two differ only when the drawer is reopened over unsaved form edits, and then showing the form's text is the only coherent choice. Applied to `requirements.md` R-1 in this phase (correction closure).

### 6.2 Layout inside the GI card (below the existing comments / feedback)

1. For each of Title, Description:
   - an eyebrow label;
   - an optional **AI suggestion** sub-block (lightbulb icon, text, **Apply** or *Applied*);
   - the field (`app-pr-input` for Title, `app-pr-textarea` for Description, the same components the form uses);
   - an inline word-count/limit message;
   - a right-aligned **Save** button (`hlmBtn` outline, disabled unless dirty and valid).
2. The unsaved reminder (`app-alert-status` warning, the W1/W2 copy) shows under a dirty field.
3. Footer when stale: **Check again** replaces the hidden submit button, in the same slot and style. **Make adjustments** stays.

Tokens: the existing `bqa-dialog__*` classes and the `--pr-*` vars; no new colours (DD-12, `docs/ux-ui/design.md` §7). Violet accent for Apply.

### 6.3 Unsaved-changes guard (R-5)

If a field is dirty, *Make adjustments*, *Go to…*, ✕, Escape, scrim click and **Check again** first show an inline confirm strip in the footer: *"You have unsaved changes to Title. Discard them?"* with **Discard** / **Keep editing**. A browser `confirm()` is ruled out, since the repo's UI rules forbid browser dialogs.

## 7. Security & Authorization

- The server remains the authority: the general-info PATCH enforces edit rights, and submit enforces freshness (P-7).
- The client `editable` input only hides UI.
- Suggestions render through Angular interpolation, with `white-space: pre-line` for `\n`. There is no `innerHTML` or markdown pipe.
- No suggestion text in logs (W8, AC-9).

## 8. Performance

- Zero extra requests on open.
- A drawer save costs one PATCH.
- Check again costs one AI call (existing bound, 60 s), and the hash short-circuit applies when nothing changed (`bilateral-quality-assessment.service.ts:103-106`).

## 9. Observability

One `Logger.log` line per assessment when suggestions were dropped: `request_id`, `dropped`, `kept`. No text.

## 10. Testing Plan

| Layer | Tests |
|---|---|
| Server unit | Table-driven `normalizeSuggestions` (every R-8 row, both keys, write vs read) · client spec: garbage `suggestions` → still `completed` (R-6) · unknown key in `evidence` removed (R-9) · `fields` still carried (existing test at `client.spec.ts:484-495` must stay green) |
| Type gate | Server `npx tsc --noEmit` · client `npx tsc -p tsconfig.app.json --noEmit` |
| Client unit | Dialog: `canEditGi` truth table (verdict × status × editable × running × KP) · suggestion present/absent/applied · Save disabled on invalid/over-limit · Check again only when stale · unsaved strip on each exit · creator: save path stages + flushes `generalInfo`, marks stale only on success, `recheckRequested` → `submitResult` and **never** `submitAfterQualityDecision` |
| Manual (HITL at execute) | prtest-like local run: amber GI → save title in drawer → GI section and header show it → Save draft on GI does not revert it → Check again → new verdict · layout at 520 px drawer and phone width |

## 11. Backwards Compatibility & Rollout

- Additive everywhere. Old rows render as before.
- With the AI sending nothing, only the edit + Check again half is visible.
- Rollback = revert. There is no data to undo, because suggestions only ever live inside assessment rows.

## 12. Design Decisions

### `BIL-QTS-DD-1` — Suggestions nested in the GI section, not a root key

The suggestion belongs to the section whose `issues` justify it, and it is gated by that section's verdict. A root `suggestions` map would need a section cross-reference and invites more fields. **Rejected:** flat `suggested_title` / `suggested_description` inside the section, because two sibling keys scale worse than one object with a closed key set.

### `BIL-QTS-DD-2` — Allow-list rebuild on write; stateless normalizer on read

Stops raw AI keys reaching the column (R-9). The read-side pass guarantees R-10 for any row, whatever wrote it, which also bounds P-11. **Rejected:** a deny-list, which fails open on the next unknown key.

**Reversion challenge (Step 2.3):** *What does removing the `...rest` pass-through break?* Answer, from P-13/P-14: no code reads a section key outside P-8's set. The only loss is future unknown AI keys disappearing from stored history, which is intended. The `fields` key is kept explicitly, and its existing test (`client.spec.ts:484-495`) stays as the guard. Outcome: **no design change**. P-11 (production rows) is settled by T-1 before T-2 builds on it.

### `BIL-QTS-DD-3` — The drawer saves through the editor's autosave machinery, never a direct PATCH

Because of P-2, a direct PATCH would leave a staged older `title` in the autosave map, and the next Save draft on GI would write it back. That is exactly R-2's `BUT`. Staging the value first overwrites any staged older value, and flushing `generalInfo` sends it.

- **Accepted side effect (P-3):** other GI fields the user had staged in the form (description, lead contact, DAC tags) are saved in the same request. That is the semantics of *Save draft — General information*, which the success toast will name.
- **Rejected:** adding a per-field flush to the autosave service. It is a new API on a load-bearing service for a case the existing semantics already cover.

### `BIL-QTS-DD-4` — Check again = `submitResult()`

It reuses the rail action that runs the guards and the check and never submits (P-5). The name misleads, so the dialog output is named `recheckRequested`, and the creator test pins that it never reaches `submitAfterQualityDecision`. **Rejected:** calling `qualityAssessment.run()` directly, which would skip the unsaved-sections and invalid-field guards.

### `BIL-QTS-DD-5` — Client marks stale optimistically after a successful drawer save

`is_current` comes from the server only on read, so without this the submit button would stay visible until the next reload, and pressing it would earn the server's stale 400 (P-7). **Rejected:** re-fetching `latest` after each save. It is an extra request for a fact the client already knows.

### `BIL-QTS-DD-6` — Suggestion shape validation lives on the server

The client renders what it receives. This keeps one rule set, the server's (R-8). The client only compares the suggestion to the current field value, for the *Applied* state.

## Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Tasks | **6** (contract doc · server normalizer + allow-list · client types/UI service · dialog GI block · creator wiring + unsaved guard · manual HITL check) |
| LOC | **≈ 420 production + ≈ 480 tests** (server ~120 / 220 · client ~260 / 260 · docs ~40) |
| Review rounds | **2** |

This matches **Standard**, and no depth change is needed.

## 13. Open Gaps & Follow-ups

- **GAP-1:** suggestion quality is the AI team's, and PRMS cannot test it (accepted risk, requirements §7).
- **GAP-2:** the reviewer-side rendering (`BIL-QAI-GAP-4`) will see `suggestions` in the served block when it is built. It should ignore them.
- **GAP-3:** if more fields are ever wanted, it needs a new agreement (owner, 2026-09-29), plus DD-1's closed key set.

## Required cross-references

`requirements.md` · `proposal.md` · `docs/prd.md` (US-S1, US-S4, AC-2, AC-4, AC-9) · `docs/ux-ui/design.md` §6, §7, §9, §10 · `docs/trd/trd.md` W1, W8 · `docs/bilateral-module/integration-contracts.md` · `docs/specs/bilateral/qa-ai-traffic-light/design.md` · `docs/specs/bilateral/qa-ai-verdict-drawer/design.md`
