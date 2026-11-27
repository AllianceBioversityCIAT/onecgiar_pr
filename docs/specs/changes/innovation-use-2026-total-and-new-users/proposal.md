# Proposal — Innovation Use 2026: total use per category + "Of which NEW users"

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-2026-total-and-new-users` |
| Slug | `innovation-use-2026-total-and-new-users` — given by the user |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated — v1 approved by Santiago Sánchez 2026-11-24 (conditional on the Claude Design mockup: done). **v2 (this version, after Nicoleta's review) approved by Santiago Sánchez 2026-11-25** ("apruebo") |
| Ticket | Freshservice **INC-169264** "Adjustments to Innov use data fields & flow" (Nicoleta Trifa, 2026-11-24, after review with Marc Schut) |
| Requirement source | Ticket description (2026-11-24) · our email of 2026-11-24 · **Nicoleta's reply of 2026-11-25** (answers in red in the email + 15 comments on the mockup PDF "Innovation Use 2026 mockup (2) (1).pdf") |
| Visual source | Claude Design canvas, **v2** (artifact version 13, 2026-11-25), see §8 |
| Related specs | archive `2026-11-03-changes--innovation-use-farmer-count-nature` (P2-4048, `count_unit`) · archive `2026-11-23-changes--innovation-use-nature-all-actors` (INA, `use_nature`) · archive `2026-11-12-changes--innovation-use-w3-hide-2030` (IWH) · archive `2026-11-12-bugfix--innovation-use-youth-required` (IUY) · `bilateral/innovation-use-actor-follow-up` (P2-4106) · P2-3537 / P2-3985 (Current Use Update block) |
| Depends on | none |
| Parallel-safe | no — touches the shared `innovation-use-form`, phase replication, the bilateral form and IPSR step 3 |
| HITL owners | Nicoleta Trifa (product: OQ-1..OQ-4 answered 2026-11-25) · Santiago Sánchez (scope decisions D-1..D-20, PROD data steps) |
| Author / date | Claude (T1) with Santiago Sánchez · v1 2026-11-24 · v2 2026-11-25 |

## 2. Intent

From the 2026 phase, Innovation Use stops being a **cumulative** count ("previous + new users added") and becomes **the total use in 2026, supported by 2026 evidence**. It is reported per row and totalled per category. On pooled-funding results and IPSR step 3, each row also gets an optional "Of which NEW" figure. Earlier figures are shown for reference only and are never copied in.

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| C-1 | Results reported before show a "Current Use Update" block: Previous reported use, **New users added during this reporting period** (typed, required), **Total cumulative current use to date** (= previous + new), the narrative "Brief narrative on how the use expanded" (100 words), and a mismatch error when the actor rows do not add up to the cumulative total | `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html:28-82` · copy `internationalization/current-use-update.copy.ts` · rules `shared/utils/current-use-update.util.ts` |
| C-2 | The same block renders in the W3/bilateral full metadata, and its 4th screen-MDS item `use-current-update` requires new users + narrative and blocks on the mismatch | `pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.ts:304-349, 956, 1032-1047` |
| C-3 | "Previous reported use" is **actors only**, from the immediately previous phase; `null` (block absent) when there is no previous phase or it had no actors | `onecgiar-pr-server/src/api/results/summary/utils/previous-phase-current-use.util.ts` · `summary.service.ts:463, 499-523` · `results-framework-reporting/innovation-use/innovation-use.service.ts:938-964` |
| C-4 | The top question reads "Current core innovation use in number of users that can be supported by evidence (within the reporting year)", with a "This is yet to be determined" option and an info alert below it: "Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected." The Current Use Update renders **below** this question. No total per category is calculated | `innovation-use-form.component.html:1-29` · `fields-manager.service.ts:318-324` (`[innovation-use-form]-core-innovation`) |
| C-5 | Phase replication **copies** actors, Innovation Use measures and organization rows into the new phase, so a 2026 result opens pre-filled (decision of 2026-10-14). IPSR step 3 rows are copied too | `onecgiar-pr-server/src/api/versioning/versioning.service.ts:358-374` (case 2), `:743-749`, IPSR `:799-801` · change log `onecgiar-pr-server/docs/bilateral-result-summaries.en.md:778` |
| C-6 | PROD 2026-11-24 (read query run by Santiago): replicated Innovation Use 2026 results with copied actor rows = W1/W2 Editing **175** (6 edited after copy), W1/W2 status 4 **1**, W3 Editing **48** (0 edited) | Query + DBeaver screenshot in the session; actors only, "edited" = `last_updated_date > created_date + 1 min` (approximate) |
| C-7 | Actor rows have "How many" (single total) or Women/Men + Youth (disaggregated); organizations "How many"; measures "Unit of measure" + "Quantity". There is no "new users" field per row | `innovation-use-form.component.html:261,339,375,384` · entity `results-innovations-use-measures.entity.ts:31-51` |
| C-8 | The bilateral API never accepted `new_users_added` / `use_expansion_narrative`, and `/api/bilateral/*` does not return `current_use_previous` | `create-bilateral.dto.ts` (no hit) · grep of `onecgiar-pr-server/src/api/bilateral` and the contract doc (no hit) |
| C-9 | The green-check function does not read `new_users_added` or the narrative | `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/innovation-use.ts:11-15, 546-572` ("documented gap") |
| C-10 | IPSR step 1 reuses the shared form with `isIpsr=true` (2030 ambition; the Current Use Update is fenced `!isIpsr`). IPSR step 3 "Current use of the core innovation" is a separate component with its own tables, no Farmers follow-up questions and no previous-use block | `step-n1.component.html:30` · `step-n3/components/step-n3-current-use/step-n3-current-use.component.html:4` |
| C-11 | The actor description says "please specify the **expected** innovation use at organizational level or other use" in the current-use section of W1/W2 and IPSR step 3 | `innovation-use-form.component.ts:765, 785` · `step-n3-current-use.component.ts:179` |
| C-12 | W3 reads the previous-use figure from the internal endpoint `results/summary` (the same one W1/W2 uses), not from `/api/bilateral/*` | `summary.service.ts:463` · `type-innovation-use.component.ts:299-331` |

## 4. Proposed Outcome

For a result with `phase_year >= 2026`:

**W1/W2 Innovation Use (pooled funding)**
1. The cumulative block is gone: no "New users added", no "Total cumulative current use to date", no mismatch error.
2. The **Current Use Update** moves **up**, just before the 2026 question. It holds:
   - **Previous reported use (reference only)**, from the previous phase: Actors (one total), Organizations, and "Other quantitative measures" with one line per unit (e.g. Hectares 4,100);
   - the narrative **"Brief narrative on how use changed in 2026"** (required, 100 words).

   The block shows only when the previous phase reported something.
3. The top question reads **"Innovation use in 2026 supported by evidence (calculated from the categories below)"**. "This is yet to be determined" stays. The "Depending on the innovation…" alert is removed.
4. Below the question, read-only totals per category:
   - **Actors - individuals**;
   - **Households** (Farmers rows answered "Households");
   - **Organizations**;
   - **Other quantitative measures**, with one line per unit underneath.

   Each total shows "of which new: N" or "not available". The "Calculated from the rows below…" sentence is not shown.
5. Rows: **"How many – total"** (measures: "Quantity – total") plus an optional NEW figure:
   - actors: "Of which NEW users";
   - organizations and measures: "Of which NEW".

   It is **one number per row**, with no sex/age split, and it can never be higher than the row total.
6. The ticket's guidance text is shown. The field name inside it is aligned to the real label ("Of which NEW users"). The word "expected" is removed from the actor description.
7. New phase copies start with **empty** current-use rows. The never-edited copied rows of the existing 2026 results are cleared, after a backup (OQ-1 = yes).

**W3/Bilateral full metadata**
8. Same as 1–4 and 6–7, but **no NEW fields and no "of which new" line** in the totals. The guidance drops the NEW sentence. The screen-MDS item `use-current-update` requires only the narrative. The totals and the previous use are worked out on screen from data PRMS already holds, so `/api/bilateral/*` input, output and API MDS stay **unchanged** (C-8, C-12).

**IPSR step 3 "Current use of the core innovation"**
9. Reworded question + totals (Actors - individuals, Organizations, Other quantitative measures), "How many – total", one "Of which NEW" per row, "expected" removed, previous use as reference (because rows start empty), and rows stop being copied at phase change. No narrative and no Households total (step 3 has no Farmers questions).

**Unchanged:** IPSR step 1, the 2030 Use Projection block (no "of which new"), and every result from 2025 or earlier.

## 5. Scope

| In | Out |
|---|---|
| W1/W2 Innovation Use form (`innovation-use-form`, `innovation-use-info`) | IPSR step 1 (stays as is; new UI fenced `!isIpsr`) |
| W3/bilateral full-metadata form (`type-innovation-use`): screen changes, no NEW | NEW fields on W3/Bilateral, in the UI or the API (Nicoleta: not part of the MDS) |
| IPSR step 3 current use (items 3, 5, 6 + empty start) | The 2030 Use Projection block |
| Server: previous use per category (W1/W2/W3 and IPSR); read/write of NEW (W1/W2 + IPSR) | Narrative and Households total on IPSR |
| Migration: one nullable NEW column on actors, organizations and measures (+ the IPSR equivalents) | Excel export changes (only if asked) |
| Phase replication: stop copying current-use rows (W1/W2, W3, IPSR step 3) | Deleting `new_users_added` / narrative data |
| QA field catalog + result PDF | |
| One-off cleanup of the 217 copied results (backup first) | |

## 6. Non-Goals

- No change to the use level ladder, investment tables or follow-up questions (count_unit / use_nature).
- No change to green-check SQL functions, unless specify finds one reads a removed field (today none does, C-9).
- No new submit gate on NEW: it stays optional.
- No `/api/bilateral/*` input or output field change. The only contract entry is behavioural (§12 R-6).

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Reporters (W1/W2, centre W3 editors, IPSR) | New layout and copy; 2026 copies open empty |
| QA reviewers, PMU | "Of which new" figures in the review drawer / PDF (pooled + IPSR) |
| Client | `shared/components/innovation-use-form/*`, `shared/utils/current-use-update.util.ts`, `internationalization/current-use-update.copy.ts`, `fields-manager.service.ts`, bilateral `type-innovation-use`, IPSR `step-n3-current-use`, result-review drawer `innovation-use-content` |
| Server | `previous-phase-current-use.util.ts`, `summary.service.ts`, `innovation-use.service.ts` (v2), IPSR step 3 read/save, entities and DTOs of actors, organizations and measures (+ IPSR), `versioning.service.ts`, `qa-catalog/definitions/sections/innovation-use.ts`, PDF summary |
| DB | Migration adding nullable NEW columns; one-off cleanup with a backup table |
| Bilateral contract / Fetcher | No field change. Change-log entry for `POST /api/bilateral/version`: current-use rows are no longer copied. Notice to the Fetcher owner (Juanda) |
| Folder docs | `innovation-use-form/CLAUDE.md`, bilateral `type-innovation-use/CLAUDE.md`, IPSR step 3 folder doc if any |

## 8. Visual Reference

- Source: **Generated mockup (Claude Design — Design canvas)**, PRMS design system, styles copied from the live app (`colors.scss`, `field-card.scss`, live PRTest screens 10150/10176/10127/9733). v2 keeps exactly the same CSS as v1: only content changed.
- Location: https://claude.ai/artifact/JbnfFXKHq5GRwUyrSNTveL (version 13; private until shared from its Share menu).
- Markers: violet = ticket item; **teal = changed after Nicoleta's review (25 Nov)**.
- Artboards:
  - `Main` v2 — W1/W2:
    - Current Use Update moved up, with previous use by category ("Other quantitative measures: Hectares");
    - reworded question and totals: Actors - individuals / Households / Organizations / Other quantitative measures with Hectares + Trees planted;
    - guidance, with the "Depending…" sentence struck out;
    - "expected" removed;
    - Farmers Households, Farmers individuals (disaggregated + one NEW total) and a single-total row;
    - an organization with "Of which NEW" and two measure rows.
  - `Today` — the current block, unchanged artboard.
  - `States` v2:
    - first report;
    - empty start after the copy (and after the cleanup);
    - NEW > total (single field);
    - "yet to be determined", with the Current Use Update still visible above;
    - 2025 results unchanged.
  - `W3` v2 — no NEW anywhere, Current Use Update moved up, totals without "of which new", a note that the API is unchanged, and the screen-MDS note.
  - `IPSR` v2 — what applies per step, plus step 3 with previous use, totals, one NEW per row and no narrative.
- Status: v1 reviewed by Nicoleta on 2026-11-25; v2 carries every one of her 15 comments (§12.1).

## 9. Requirement Delta Preview

### ADDED
- Per-row optional NEW figure (one number) on actors, organizations and measures, validated ≤ row total. W1/W2 + IPSR step 3 only.
- Read-only 2026 totals per category under the top question (W1/W2, W3, IPSR step 3). "Of which new" is shown, or "not available", on W1/W2 and IPSR only.
- Previous reported use per category: Actors / Organizations / Other quantitative measures per unit (W1/W2, W3, and IPSR step 3 as a new block).
- Guidance text from the ticket (W3 without the NEW sentence).

### MODIFIED
- Top question copy (C-4); Current Use Update moved above it; "How many" → "How many – total"; "Quantity" → "Quantity – total"; narrative label (C-1); actor description without "expected" (C-11). All only for `phase_year >= 2026`.
- W3 screen-MDS item `use-current-update`: narrative only, no mismatch (C-2).
- Phase replication: current-use actors, organizations and measures no longer copied (C-5), including IPSR step 3. 2030 rows keep today's behaviour.

### REMOVED (UI only, data kept)
- "New users added during this reporting period", "Total cumulative current use to date", the mismatch error (C-1) and the "Depending on the innovation…" alert (C-4), for phase ≥ 2026. The alert stays in the 2030 copy.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. One spec, two PRs** (recommended) | PR-1 screen + stop copy + cleanup; PR-2 NEW + IPSR step 3 + QA catalog/PDF | One contract and one review; PR-1 needs no migration and meets the date for most of the ticket | Two release windows |
| B. Family of 3 children | (1) UI, (2) NEW, (3) IPSR | Smaller PRs | Same files in all three; more merge friction |
| C. Everything in one PR by Friday | — | One release | Does not fit 2–3 days (§10.1); high risk on the PROD cleanup |

### 10.1 Effort estimate (re-validated against the code, 2026-11-25)

The simplifications (one NEW number, no sex/age on NEW, no NEW on W3, no API change) cut the NEW work by about half. IPSR step 3 comes into scope.

| Item | What it takes | Difficulty | Estimate | PR |
|---|---|---|---|---|
| 1–2 Remove "Total cumulative" + "New users added" + mismatch (W1/W2 + W3) | Hide in both forms, drop the mismatch rule, relax W3 `use-current-update` to narrative-only | Easy | 0.5 d | 1 |
| 4 + copy edits | Narrative label, "expected", "Depending…" (phase-gated), labels "– total", guidance | Easy | 0.5 d | 1 |
| Move the Current Use Update above the question | Template reorder in both forms; TBD rule D-14 | Easy | 0.25 d | 1 |
| 3 Previous use by category | Add organizations + measures per unit in `previous-phase-current-use.util.ts` (both reads, W3 included); show the block when any category has data | Medium | 1 d | 1 |
| 5 Totals per category (W1/W2 + W3) | Client-side calculation; Households from Farmers `count_unit`; measures grouped per unit | Medium | 1 d | 1 |
| 6 Rows start empty (W1/W2 + W3) | `versioning.service.ts` + contract change-log entry for `/version` + Fetcher notice | Easy code, medium risk | 0.5 d | 1 |
| Cleanup of the 217 copied results | SQL with a backup table, comparing each row with its 2025 origin; run in PROD by Santiago **after** the stop-copy is live | Medium | 0.5 d | 1 |
| Tests + PRTest (PR-1) | Scoped Jest + manual W1/W2, W3, IPSR step 1 unchanged, 2025 unchanged | — | 1 d | 1 |
| **PR-1 total** | | | **≈ 5 d** | |
| 6 "Of which NEW" (W1/W2) | Migration (3 nullable columns), entities, DTOs, v2 save + read, UI, ≤ total validation, "of which new" in totals + guidance sentence | Medium | 1.5 d | 2 |
| IPSR step 3 | Copy + totals + NEW (3 IPSR columns) + previous use from the previous package + stop copy at `:799-801` | Medium | 2–2.5 d | 2 |
| QA catalog + review drawer + PDF (pdf-viewer repo) | NEW figures; removed fields hidden for 2026 | Medium | 1 d | 2 |
| Tests + PRTest (PR-2) | | — | 1 d | 2 |
| **PR-2 total** | | | **≈ 5.5–6 d** | |

### 10.2 Delivery split and the Friday date

Nicoleta asked for **"ideally by end of this week"** (Friday 2026-11-27). Today is Wednesday.

| PR | Content | Migration | Target |
|---|---|---|---|
| **PR-1 Screen + clean start** | Items 1–5 on W1/W2 and W3, the Current Use Update moved up, copy edits, the W3 screen-MDS change, stop copying rows (W1/W2 + W3), the cleanup script | No | Friday 27-Nov **only if** specify is approved today and execution starts tomorrow. **Cut line** if Friday slips: totals per category (item 5) move to PR-2, and everything else in PR-1 still ships |
| **PR-2 NEW + IPSR** | "Of which NEW" on W1/W2, IPSR step 3, QA catalog / drawer / PDF | Yes | Week of 30-Nov |

In PR-1 the totals show no "of which new" line and the guidance omits the NEW sentence, because the field does not exist yet (D-17). Both arrive with PR-2.

## 11. Recommended Approach

**Option A, delivered as the two PRs of §10.2.** PR-1 removes the cumulative confusion and gives reporters an empty 2026 start before the reporting rush, with no migration and no API field change. PR-2 adds NEW and IPSR step 3 on top of the same code.

## 12. Risks, Dependencies, And Open Questions

### 12.1 Nicoleta's answers (2026-11-25) and where each one lands

| # | Her comment | Where |
|---|---|---|
| N-1 | Q1 clear the copied rows: **yes**, 2025 data stays in the result history | §4.7, cleanup in PR-1 |
| N-2 | Q2 W3 bulk NEW: **don't apply to bilaterals yet**, not part of the MDS. PDF W3: "don't add the NEW aspect for w3/bilat … apply the changes for pooled only" | §4.8, D-15 |
| N-3 | Q3 date: **ideally by end of this week** | §10.2 |
| N-4 | "And to innov use updated from previous phases… is it possible?" | Yes: those are the 2026 copies (the 224), the main case of this spec (Previous reported use is shown for them) |
| N-5 | IPSR: apply to the correct section (current use), **not** the 2030 target | §4.9, IPSR step 3 in scope (D-2) |
| N-6 | 2030 projected use: not needed | D-3 |
| N-7 | Previous use: Actors as one total (mix of individuals and households) | D-6 |
| N-8 | Totals: "Actors - individuals"; "Households" | §4.4 |
| N-9 | "Other quantitative measures" as the category title, with whatever is reported (Hectares etc.) listed under it, in the totals and in the previous use | §4.2, §4.4, D-7 |
| N-10 | Remove the "Calculated from the rows below…" sentence | §4.4 |
| N-11 | Move the Current Use Update up, just before "Innovation use in 2026 supported by evidence" | §4.2, D-14 |
| N-12 | Remove the "Depending on the innovation…" sentence | §4.3, D-18 |
| N-13 | Remove "expected" (current use, not expected) | §4.6, C-11 |
| N-14 | Organizations: "Of which NEW", without "users" | §4.5 |
| N-15 | NEW: keep the total only, no gender/youth split (W1/W2 and IPSR) | §4.5, D-8 |
| N-16 | W3 totals and previous use: "if this impacts the API, pls do not add" | Checked: no API impact (C-8, C-12); they are added as screen-only (D-16) |
| N-17 | NEW optional ≤ total, "not available"; narrative mandatory, 100 words, when reported before: correct | D-8, D-10 |

### 12.2 Open questions

None left for Nicoleta. D-14, D-16, D-17, D-19 and D-20 are our own decisions. They go in the reply to her as "how we apply it", so she can object, but they do not block.

### 12.3 Risks

| # | Risk | Mitigation / owner |
|---|---|---|
| R-1 | The shared form also renders IPSR step 1 | Fence every new element `!isIpsr` (folder trap, `innovation-use-form/CLAUDE.md`) |
| R-2 | The phase gate must use `phase_year`, never the portfolio | Reuse `isPhaseYearAtLeast(2026)` (P2-3558 lesson) |
| R-3 | Explicit column lists in `ResultActorRepository.replicable/replicate`; the replication spec helper guards them | NEW columns are **not** replicated; update the guard spec deliberately |
| R-4 | Actors may be replicated twice for Innovation Use (case 2 at `versioning.service.ts:372` and generic at `:749`), and the `replicable` SELECT does not list `section_id` although the case-2 comment says it is carried | `UNVERIFIED — confirm at source in /akili-specify Premise Ledger`; the stop-copy change touches exactly these calls |
| R-5 | The Actor model that types the template is `Ipsr-step-1-body.model.ts` (TS2339 trap) | Declare the NEW field in both models; run `npm run build` |
| R-6 | W3 form ↔ API ↔ Fetcher rule | No field change (C-8, C-12): the PR says "payload unchanged". The stop-copy changes `POST /api/bilateral/version` behaviour → change-log entry + notice to Juanda in PR-1 |
| R-7 | The 2025 household / individual split is impossible (no `count_unit` in 2025) | 2025 actors shown as one total (D-6, N-7) |
| R-8 | Downstream readers of `new_users_added` (PDF, AI QA payload, review drawer) | Check at specify; hide for 2026 in PR-2 at the latest |
| R-9 | Cleanup runs while replications still copy rows | Run the cleanup only after the stop-copy is live in PROD; count before/after |
| R-10 | IPSR previous use needs the previous package's step 3 rows | `UNVERIFIED — confirm in the Premise Ledger` how a 2026 package finds its 2025 version (`result_code` + previous phase, as the IU util does) |
| R-11 | Friday date | Cut line in §10.2; tell Nicoleta the two-step plan in the reply |

### 12.4 Decisions

- D-1 Scope: W1/W2 + W3 (screen) + IPSR step 3.
- D-2 IPSR: step 3 in; step 1 untouched.
- D-3 2030 untouched.
- D-4 Previous use = previous phase only.
- D-5 Per category.
- D-6 2025 actors as one total.
- D-7 Measures under "Other quantitative measures", totalled per unit. A unit is matched by trimmed, case-insensitive text, and different units are never added together.
- D-8 NEW optional, one number per row, ≤ row total; youth-required rule not applied.
- D-9 NEW on actors, organizations and measures (W1/W2 + IPSR).
- D-10 Narrative required, 100 words, only when a previous figure exists. W1/W2 + W3 only, not IPSR.
- D-11 Removed fields hidden only.
- D-12 Cleanup of the 217 with a backup table, after the stop-copy is live.
- D-13 Two PRs, PR-1 with no migration.
- D-14 The Current Use Update sits above the question and **stays visible when "This is yet to be determined" is selected**: the narrative then explains why 2026 use is unknown. Everything below the question hides, as today.
- D-15 No NEW on W3 in any layer.
- D-16 W3 totals and previous use are screen-only (internal endpoint), API unchanged.
- D-17 In PR-1, totals have no "of which new" line and the guidance omits the NEW sentence; PR-2 adds both.
- D-18 "Depending on the innovation…" removed only from the 2026 current-use section; the 2030 copy keeps it.
- D-19 IPSR step 3: no Households total and no narrative.
- D-20 The Current Use Update shows when the previous phase reported **any** category (actors, organizations or measures), not only actors as today.

## 13. Success Criteria

- On PRTest:
  - a 2026 W1/W2 result and a 2026 W3 result match the v2 artboards;
  - IPSR step 1, the 2030 block and 2025 results look unchanged.
- A new phase copy opens with empty current-use rows, and Previous reported use still shows the 2025 figures per category.
- After the cleanup, the 217 results open empty; the 6 edited ones and the discontinued one are untouched; the backup table has the removed rows.
- The totals per category match the rows; NEW > total is blocked.
- W3 submits with the narrative only (no "new users added"). `/api/bilateral/*` payloads are byte-identical except for the documented `/version` behaviour.
- PR-2: IPSR step 3 2026 packages show the new layout and start empty.

## 14. Next Step

1. Santiago approves this v2.
2. Reply to Nicoleta with the two-step plan (PR-1 this week, PR-2 the week of 30-Nov) and decisions D-14, D-16, D-17, D-19, D-20.
3. Run:

```text
/akili-specify changes/innovation-use-2026-total-and-new-users
```
