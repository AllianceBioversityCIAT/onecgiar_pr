# Proposal — Innovation Use: unit of counting and nature of the number for Farmers actors

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-farmer-count-nature` |
| Slug | `innovation-use-farmer-count-nature` (derived from the free-text argument) |
| Type | Change |
| Ticket | P2-4048 (`[167167-6]`, Marc Schut feedback, epic P2-3094) |
| Approval Mode | gated |
| Depends on | none (it coordinates with 167167-11 IPSR and 167167-15 QA view; see §12) |
| Parallel-safe | no: it touches `result_actors`, which IPSR, versioning and bilateral share |
| Date | 2026-11-03 |
| Author | Santiago Sanchez (with Claude) |

## 2. Intent

When an Innovation Use result reports **Farmers/(agro)pastoralists/herders/fishers** as users, the form asks two more things **before** the number grid:

1. **What was counted**: households or individuals.
2. **What the number means**: actors who *received* information, advice or inputs, or actors who *applied* the innovation.

The goal is that farmer numbers can be added up and compared, and that people who were only informed are not counted as users.

## 3. Problem / Current Behavior

- In *Innovation Use info* → *Innovation users*, picking the Farmers actor type opens the Women/Men × Youth/Non-youth grid right away (`innovation-use-form`).
- `result_actors` has no field for the unit or for the nature of the number. A row with 500 can mean 500 households (about 2,000–3,000 people) or 500 people, and it can mean 500 who heard a radio advisory or 500 who planted a variety.
- The agreement for 2026 came from an email thread (Trifa, Place, Hammond, Colomer, Schut, 15 Sep–23 Oct 2026): *ask what the actors did* instead of defining reach/use/adoption.
- **This is not a bug and not an existing rule.** Nothing in the code or the DB covers it today, so it is new functionality.

## 4. Proposed Outcome

| # | Behavior |
|---|---|
| O1 | For actor type **Farmers** (`actor_type_id` = 1, to be confirmed per environment), on a **phase ≥ 2026 W1/W2** Innovation Use result (`result.source <> 'API'`), two required single-choice questions appear before the number grid, in **both** blocks: current use (`section_id = 1`) and 2030 projection (`section_id = 2`). Decided by Santiago on 2026-11-03. |
| O2 | (a) *"Do the numbers refer to households or individual actors?"* → Households / Individuals. |
| O3 | (b) *"What best characterises the nature of this innovation use number?"* → A *"Actors who received information, advice or inputs"* / B *"Actors who applied the innovation"*, plus helper text telling the user to add the actor type twice when both groups exist. |
| O4 | Stored as neutral codes: `households` / `individuals` and `information_received` / `innovation_applied`. |
| O5 | The section (green check) and Submit are blocked until both are answered on every Farmers row of a 2026+ result. |
| O6 | Farmers can be added more than once per block, each row with its own answers. **Correction (found during specify, 2026-11-03): today this does NOT work.** The select disables actor types already chosen (`removeOther`, all except "Other"), and the server save (`innovation-use.service.ts` ~L470-490) reuses an existing active row with the same result + section + actor type for any row without an id, so a second Farmers row overwrites the first. Both have to change. |
| O7 | The words *reach*, *use* and *adoption* do not appear in these labels or options. The 0–9 innovation use level is not touched. |
| O8 | 2025 results and other actor types behave exactly as today. |

## 5. Scope

- **Client:** `shared/components/innovation-use-form` (Innovation Use detail), **hidden when `isIpsr`**.
- **Server:** two nullable columns on `result_actors` (migration), the entity, Innovation Use DTO + save/read (`results-framework-reporting/innovation-use`), and the **replicate SQL** in `result-actors.repository.ts`, which has explicit column lists.
- **DB validation:** `validation_innovation_use_P25` (body received 2026-11-03). It already resolves `result_phase_year` (P2-3494). Add a Farmers check inside the two existing actor blocks (`section_id = 1` and `= 2`), gated `result_phase_year >= 2026 AND source <> 'API'`. Everything else stays byte-for-byte.
- **QA catalog (parametrized for QA):** two new subfields of the actor rows in **both** `usageLists` blocks of `qa-catalog/definitions/sections/innovation-use.ts`, with `visible_when`/`required_when` on `actor_type = Farmers`, two **closed control lists** (`closed-control-lists.ts`) for the four codes, a revision bump in `versions.ts` (2026 rev 32 → 33), and `docs/qa-catalog.en.md`. The `qa_catalog_*` tables are filled by `QaCatalogSyncService` at bootstrap from these definitions, so **no catalog migration is needed**. The only migration is the two `result_actors` columns.

## 6. Non-Goals

- **IPSR** Step 1 (shares the component; hidden via `isIpsr`) and Step 3 (`step-n3-current-use`): these go with **167167-11**.
- **QA assessor view** next to the evidence: that is **167167-15**.
- **Everything bilateral (W3, `source = 'API'`):** the creation form (`type-innovation-use`), ingestion (`create-bilateral.dto.ts`), the read payload / QA payload builder and the review drawer. Decided by Santiago on 2026-11-03: W1/W2 only for now. The validation and the form must explicitly skip `source = 'API'` results.
- Public Results Dashboard: nothing is added there.
- Converting households to people, or changing how totals are summed. The number stays as typed (see R-3).
- Innovation Development: the actors section there was removed from 2026 (P2-3263).

## 7. Affected Users, Systems, And Specs

| Area | Impact | Must validate |
|---|---|---|
| Innovation Use form (`innovation-use-form`) | New questions for Farmers | Questions show only for Farmers and only on 2026+ results |
| **IPSR Step 1** (same component, `isIpsr`) | Must **not** show them | IPSR Step 1 unchanged, visually and on save |
| IPSR Step 3 / IPSR validation (`results-innovation-packages-validation-module`) | Same table, untouched columns | IPSR green checks unchanged |
| `result_actors` (shared by Innovation Use, IPSR, ID ≤2025, bilateral) | +2 nullable columns | `migration:check`; existing rows stay NULL |
| **Phase replication** (`versioning.service` → `ResultActorRepository.replicate`, explicit column lists) | New columns must be copied or they are lost on duplicate | Duplicate a 2026 result and check that the answers survive |
| Innovation Use validation function (DB) | New check, gated ≥2026 | 2025 results keep the same green/red; 2026 rows without answers turn red |
| Previous-phase current-use summary (`previous-phase-current-use.util`) and v2 sum (`InnovationUseService.getActorsData`) | Counting is not changed | Totals are identical before and after |
| ToC achieved-value comparison (`achieved-value-derivation.ts`) | Not wired yet; its PO question about "which figure an Innovation Use actor row compares against" now gets a new dimension | Record it, do not change it |
| Bilateral read payload + QA payload builder (`bilateral-quality-payload.builder`, `type-specific.mapper`) | Optional additive fields | Payload fixture tests, contract change log |
| Bilateral review drawer (`innovation-use-content`) | Read-only; can show the codes later | No visual change required |
| QA catalog | Two new keys | Catalog specs green (golden bindings) |
| Delete/recover (`delete-recover-data`) | Copies rows | Recover keeps the answers |

## 8. Visual Reference

- Source: Marc's mock-up, provided by Santiago on 2026-11-03 (approved wording), plus a screenshot of the placement.
- Location: `mockup/farmer-follow-up-questions.png` (wording and layout), `mockup/placement-under-actor-type.png` (where it goes).
- **Placement:** in the actor row's **left column, right under the "Actor type" select** (the empty space below it), before the number grid. Shown only while the type is Farmers.
- **Approved wording (verbatim, set by Santiago on 2026-11-03; this replaces the recommendation in OQ-2):**
  - Block title: *Follow-up questions for actor type Farmers/(agro)pastoralists/herders/fishers*
  - Q-a (required): *Do the reported numbers refer to households or individual actors?* → **Households** / **Individual actors** (`households` / `individuals`), on one line.
  - Q-b (required): *What best characterises the nature of this innovation use number?*
    - **Actors who received information, advice or inputs** (`information_received`). Description: *Advisories delivered face-to-face, by SMS, radio/media or a digital platform; climate advisories; market information; dietary guidelines; starter kits, vouchers or other incentives. Receipt is documented; application of the innovation is not confirmed.*
    - **Actors who applied the innovation** (`innovation_applied`). Description: *Grew a variety, applied a practice, actively used a digital tool or service, took up a product. Application is supported by the attached evidence (survey, plot observation, purchase records, platform logs).*
  - Italic helper below: *If your numbers include both groups, add the actor type a second time and report each group separately. Receiving and applying are not the same as benefiting; benefit is reported as impact evidence.*
  - The mock-up's last line ("Single choice. Stored as … do not appear on screen") is a **developer note, not on-screen text**.
- Note: the approved Q-b label and the option B description contain the word "use"/"used". That conflicts with the ticket's AC5. The product owner's verbatim text wins, and AC5 is read as "the options are not labelled reach / use / adoption".

## 9. Requirement Delta Preview

### ADDED Requirements
- Two required single-choice questions for Farmers rows on 2026+ Innovation Use results (O1–O4).
- Validation blocks the section until they are answered (O5).
- Phase replication and recovery carry the two answers.
- The QA catalog and the read payload expose the two codes.

### MODIFIED Requirements
- The Innovation Use validation function gets a phase-gated (≥2026) check for Farmers rows.
- `result_actors` replicate SQL adds two columns.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Two nullable columns on `result_actors`** | `count_unit` and `use_nature`, as `VARCHAR` codes or small enums | Simple, one row = one answer set, duplicates work as is, cheap to read in payloads | Touches the replicate SQL; the codes are free text unless constrained |
| B — Reuse `result_questions` / `result_answers` | Model the two questions as P25 questions | No schema change on `result_actors` | Answers are per **result**, not per actor row, so it breaks "same actor type twice with different answers" (AC3). Ruled out |
| C — Separate table `result_actor_qualifiers` | 1:1 with `result_actors` | Keeps `result_actors` untouched | An extra join everywhere plus its own replicate/recover path, for two fields |

## 11. Recommended Approach

**Option A**: two nullable columns with a `CHECK`, or validation in the DTO, limiting them to the four codes. Show and require them only for `actor_type_id = Farmers` on phase ≥ 2026, and hide them when `isIpsr`. Add the columns to the replicate SQL in the same change. It is the smallest change that meets AC3 (per-row answers), because Option B cannot.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| **R-1** | **Replicated 2026 innovations already have Farmers rows** (bulk duplication of every innovation except Editing/Rejected). The ticket says "none reported as of 23 Oct", but replicated rows exist. If the check applies to them, those sections go **red**. Measure the count first (query below) and decide: require it on all 2026 rows, or only on rows created or edited after go-live. |
| **R-2** | **Timing:** the ticket says it must be live **before** 2026 Innovation Use results are entered. Every day that passes adds rows without answers. |
| R-3 | Households vs individuals is stored, **not converted**. Totals that sum farmer rows (previous-phase current use, v2 sum, KPI comparisons) will still mix both units until someone decides how to aggregate. That is out of scope, but should be stated to Marc. |
| R-4 | `actor_type_id` for Farmers comes from an old migration (`1679588387039`) with no fixed id. Verify it per environment, or resolve it by name like the stage questions. |
| R-5 | The validation function lives only in the DB. Get the current body (`SHOW CREATE FUNCTION validation_innovation_use_P25`) before designing, and verify it against real rows (memory: verify SQL fixes against real data). |
| R-6 | `innovation-use-form` is shared with IPSR Step 1. A missing `isIpsr` guard would ship the questions into IPSR before 167167-11. |
| ~~OQ-1~~ | **Resolved 2026-11-03:** both current use and 2030 projection. |
| ~~OQ-2~~ | **Resolved 2026-11-03:** wording and placement per Marc's mock-up (§8). Default: the **same text** in the 2030 projection block, unless Santiago asks for a future-tense variant. |
| ~~OQ-3~~ | **Resolved 2026-11-03:** W1/W2 only; bilateral untouched. |
| ~~OQ-5~~ | **Resolved 2026-11-03** (Santiago: "si hazlo", accepting both recommendations): Households → the Women/Men × Youth grid is replaced by a single total (`how_many`, the same path as "disaggregation does not apply"); Individuals → the grid stays as today. The 2030 block uses the same text as current use. |
| R-7 | The validation function is shared by W3 results of type 2. The new check must carry `source <> 'API'`, or bilateral sections could turn red with no form to fix them. |
| OQ-4 | Order with 167167-11 (IPSR) and 167167-15 (QA view): ship this one first and the others reuse the columns? |

Query for R-1 (confirm the Farmers id first):
```sql
SELECT ra.section_id,                       -- 1 = current use, 2 = 2030 projection
       COUNT(DISTINCT ra.result_id) AS results_2026_with_farmers,
       COUNT(*) AS farmer_rows
FROM result_actors ra
JOIN result r  ON r.id = ra.result_id AND r.is_active = 1
JOIN version v ON v.id = r.version_id
WHERE ra.is_active = 1 AND ra.actor_type_id = 1
  AND v.phase_year = 2026 AND r.result_type_id = 2
  AND COALESCE(r.source, 'Result') <> 'API'  -- W1/W2 only
GROUP BY ra.section_id;
```

## 13. Success Criteria

1. On a 2026 Innovation Use result, adding Farmers shows both questions before the grid. Other actor types and 2025 results do not.
2. The section cannot turn green, and the result cannot be submitted, while a 2026 Farmers row lacks either answer.
3. Two Farmers rows with different answers save and reload correctly.
4. The DB stores only `households`/`individuals` and `information_received`/`innovation_applied`.
5. IPSR Step 1/3, 2025 results and every existing total behave exactly as before.
6. Duplicating or recovering a result keeps the answers.
7. The words reach, use and adoption do not appear in the new labels or options.

## 14. Next Step

```text
/akili-specify changes/innovation-use-farmer-count-nature
```

Before specifying: run the R-1 query, get `SHOW CREATE FUNCTION validation_innovation_use_P25`, and answer OQ-1/OQ-2 (ideally with Angel).
