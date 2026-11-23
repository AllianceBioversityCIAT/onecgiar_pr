# Proposal — Bilateral External partners back in the MDS, in section 2

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-partners-mds` |
| Slug | `bilateral-partners-mds` — derived from free-text argument |
| Type | Change (requirement change; reverses P2-3821) |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Email from Nicoleta Trifa, 2026-11-16, "W3/bilat results reporting via Ai screening", point 2: *"This is IMPORTANT: how come there is no section on external partners? This is part of the MDS, pls ensure the data field is in section 2"*. No Jira ticket yet: confirm with the user |
| Supersedes | `bilateral/contributors-partners-optional` (P2-3821, PO decision by Juan David Delgado, 2026-09-28) |
| Branch | `qa-development-2026-ss` |
| Depends on | none |
| Parallel-safe | no — touches `section-contributors`, `bilateral-center.service` submit guards and the MDS PDF, which other open bilateral specs also edit |
| Status | Proposed — 2026-11-18 |

## 2. Intent

External partners becomes a **minimum data standard (MDS)** field of bilateral results again. It sits in the main body of section 2 (Contributors & partners), not behind "Complete full metadata". The answer is *at least one partner* **or** *"This result has no external partners"*. The centre user cannot submit for review without it.

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P1 | The partners block renders only when "Complete full metadata" is expanded | `section-contributors.component.html:303` (`@if (showFullMetadata())`), `section-contributors.component.ts:714` |
| P2 | The block is explicitly optional: no tracker item, no required mark | `section-contributors.component.html:308-311` (P2-3821 comment), `:349-360` (`[required]="false"`) |
| P3 | The server submit gate does not check partners. It checks only status, permission, owner SP and, for Innovation Use, the persisted MDS | `bilateral-center.service.ts:2685-2775` (`assertSubmittable`) |
| P4 | `POST /create` does not require partners, and has no field to declare "no partners". `no_applicable_partner` is written only by the centre form | `create-bilateral.dto.ts` (no `no_applicable_partner` / `no_external_partners`, grep run 2026-11-18); P2-3821 proposal §3 citing `bilateral-center.service.ts:1836-1837` |
| P5 | The Fetcher schema does not list `contributing_partners` in `required` | P2-3821 proposal §3 citing `onecgiar_result_functions/.../common_fields.json:313-331` — `UNVERIFIED — confirm at source before relying on it` (other repo, not re-read) |
| P6 | The MDS-only PDF removes the non-KP Partners table, because partners were not MDS | `docs/specs/changes/bilateral-pdf-mds-only/requirements.md:45` |
| P7 | The AI promote path already writes the partners the AI found | `bilateral.service.ts:5633-5641` (`contributing_partners` → `handleInstitutions`) |
| P8 | P2-3821 was a fix: ingested results born in Pending Review (read-only) listed "External partners" as missing forever (#9503) | `docs/specs/bilateral/contributors-partners-optional/proposal.md` §3 |

**Net:** the users Nicoleta trains (IFPRI PIs) don't see a partners field unless they expand full metadata, so results get submitted with no partner data.

## 4. Proposed Outcome

- In section 2, the External partners block (the checkbox plus the multi-select) renders in the main body for **every** result type, with no toggle.
- It is required: either at least one partner, or the checkbox ticked. The section lists it as missing until it is answered, and Submit waits on it.
- `submit-for-review` and the AI quality check refuse a result without persisted partner data, with a clear 400.
- Results the centre cannot edit (Pending Review, Approved…) never show partners as missing, so the #9503 dead end does not come back.
- AI drafts that found partners arrive with the field already answered.
- The MDS-only PDF prints the Partners table again.

## 5. Scope

- **Client** `section-contributors` (`.html`, `.ts`, specs): move the partners block out of Full metadata into the main body, restore the required marks and hint, and restore the `external-partners` MDS tracker item, scoped to editable results. Remove partners from `hiddenFieldsWithValues`.
- **Server** `bilateral-center.service.ts`: add a persisted-partners check to `assertSubmittable`. It passes on an active `results_by_institution` row with role 2 or 8, **or** on `result.no_applicable_partner = 1`. It applies to every non-KP type.
- **MDS PDF** (`bilateral-pdf-mds-only`): restore the non-KP Partners table.
- **Docs**: supersede P2-3821 (`BIL-R-1`, `BIL-R-2`) and P2-3368 AC5's "optional" row, update the comments that cite P2-3821, and add a note to the module `CLAUDE.md`.

## 6. Non-Goals

- No change to Knowledge Products: their partners come from CGSpace (`kp_partner_data`).
- No partner type or nature attributes. They stay out of scope for bilateral, as in P2-3821.
- No change to W1/W2 or IPSR partner forms.
- No change to the AI prompts or the AI service.
- No data backfill (see OQ-3).
- `POST /create` is **not** made to require partners in this spec (see Option B and OQ-2).

## 7. Affected Users, Systems, And Specs

| Affected | Effect |
|---|---|
| Centre reporters (Editing / Draft / Rejected) | See partners up front; must answer before Submit |
| Reviewers / read-only viewers | See partners without expanding anything; never a "missing" flag |
| Ingested results (Fetcher / `POST /create`) | Unchanged on ingest. Once rejected and back in editing, the centre must answer partners before resubmitting |
| AI draft promotion | Unchanged; partners it found pre-fill the field |
| Specs | Supersedes `bilateral/contributors-partners-optional`; amends `changes/bilateral-pdf-mds-only` (BPM partners row) and P2-3368 AC5 |
| PRD | AC-2 (submission gate gains one field); AC-4 untouched if Option A |

## 8. Visual Reference

- Source: None.
- Notes: no new UI. The existing partners block moves from the Full metadata container into the main body of section 2, above the "minimum data standards" banner (`section-contributors.component.html:272-278`), and gets back its pre-P2-3821 required styling.

## 9. Requirement Delta Preview

### MODIFIED Requirements

- `BIL-R-1` (P2-3821) Placement → External partners renders in the main body of section 2 for every non-KP type. It no longer depends on Full metadata.
- `BIL-R-2` (P2-3821) Optional → External partners is required: at least one partner, or "no external partners" ticked.
- `BIL-R-4` (P2-3821) Hidden-fields note → the partner block no longer counts, because it is never hidden.
- BPM Partners row (`bilateral-pdf-mds-only`) → the non-KP Partners table is kept in the MDS PDF.

### ADDED Requirements

- The MDS tracker lists "External partners" as missing **only while the result is editable by the centre**.
- `submit-for-review` and the AI quality check reject a non-KP bilateral result without persisted partner data, with a 400 that names the field.

### REMOVED Requirements

- None. The P2-3821 behaviour is replaced, not just removed.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Form MDS + server submit gate, ingest unchanged** | Move the block, require it in the tracker (editable only) and in `assertSubmittable` | Satisfies "part of the MDS" wherever a human submits. No `/api/bilateral/*` contract break. Ingested results are checked by the SP review instead |
| B. A + required on `POST /create` | Add a `no_external_partners` input and a preflight 400 when neither is sent; Fetcher schema change in `onecgiar_result_functions` | Full rule parity. But it breaks existing producers (not additive, needs coordination or a `v2`) and touches another repo |
| C. Move only, keep optional | Place the block in section 2 without requiring it | Smallest diff. Fixes visibility but not "MDS", which is what Nicoleta asked for |

## 11. Recommended Approach

**Option A.** It is the smallest change that makes partners a real MDS field for every human submission. It also leaves the external contract untouched. Points for `/akili-specify`:

1. **Avoid the #9503 trap.** P2-3821 existed because the tracker flagged partners on read-only, ingested results. The tracker item is registered only when `readOnly()` is false (`section-contributors.component.ts:89`). Read-only results show the answer, or "No partners reported", and never a red hint.
2. **Server gate mirrors the client.** It reads persisted rows only: `results_by_institution` active rows with `institution_roles_id IN (2,8)`, or `result.no_applicable_partner = 1`. It runs from `assertSubmittable`, so submit, the AI quality check and the field-revision audit all apply it together. Skip it for Knowledge Products.
3. **Keep the payload invariants** from P2-3821 (`partnersHydrated()` guard, `is_lead_by_partner` always sent). The `validation_partners_*` functions depend on them (module `CLAUDE.md` §7.3.1).
4. **The rule changed, so the reason has to be on record.** P2-3821 was a PO decision. Cite this proposal, and the PO confirmation (OQ-1), in every comment that P2-3821 left, so nobody "restores" it the other way.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| OQ-1 | **This reverses a PO decision** (Juan David Delgado, P2-3821, 2026-09-28) on Nicoleta's request | **Resolved 2026-11-18:** Angel Jarrin confirms the field must be mandatory (relayed by the user). Ticket still TBD |
| OQ-2 | Should `POST /create` / the Fetcher also require partners (Option B)? | Default **no**. If yes, a separate spec with producer coordination |
| OQ-3 | Results already submitted or in Editing without partners | Editing ones will simply ask for it. Default: no backfill and no notice. Confirm with PO |
| R1 | `validation_partners_*` green checks may already gate bilateral elsewhere (results list, QA) | `UNVERIFIED — confirm at source before relying on it`. Check during specify; ask for `SHOW CREATE FUNCTION` if needed (procedures are applied by hand) |
| R2 | Open bilateral specs editing the same files (`section-contributors`, `bilateral-center.service`) | Check `docs/specs/` for active specs before execute; rebase |
| R3 | Spec files assert P2-3821's optional behaviour (`section-contributors.component.spec.ts`, `.readonly.spec.ts`) | Update in the same change |
| R4 | The AI may return no partners, leaving AI drafts with one more open field | Acceptable: that is the MDS working. The user ticks the box or picks partners |

## 13. Success Criteria

- An Editing non-KP bilateral result with no partners and the box unticked: section 2 lists "External partners" as missing, and Submit is disabled.
- The same result through the API: `submit-for-review` returns a 400 naming External partners.
- Pick one partner, or tick the box: the section reads "Section complete" and submit succeeds.
- A Pending Review ingested result without partners, read-only: no missing flag (no #9503 regression).
- The partners block is visible without expanding "Complete full metadata", for every non-KP type.
- The MDS PDF of a non-KP result prints its Partners table.

## 14. Next Step

After approval, and after OQ-1 is settled:

```text
/akili-specify changes/bilateral-partners-mds
```
