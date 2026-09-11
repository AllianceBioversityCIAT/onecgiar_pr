# Proposal: KP Report Modal — Auto-create on KP selection

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `changes/kp-report-modal-auto-create` |
| **Proposal File** | `docs/specs/changes/kp-report-modal-auto-create/proposal.md` |
| **Slug** | `kp-report-modal-auto-create` — derived from free-text: "skip the intermediate form when a KP is selected and always set contribution_to_indicator_target=1 for KP" |
| **Type** | Change |
| **Approval Mode** | gated |
| **Author** | Antigravity (Gemini / Claude Sonnet 4.6 Thinking) with j.cadavid@cgiar.org |
| **Date** | 2026-08-31 |
| **Requirement source** | Chat + 3 screenshots: (1) Report button on a "Number of knowledge products" KPI row, (2) "Report result" modal with Browse CGSpace / Manual entry tabs, (3) form after KP selection showing `contribution_to_indicator_target = 0` with arrows pointing to it and "Create and continue". No Jira ticket. |
| **Target surface** | `AowHloCreateModalComponent` (`aow-hlo-create-modal.component.{ts,html}`), `create-result-payload.util.ts` |
| **Depends on** | none (builds on shipped `changes/reporting-entry-hub` and `changes/mass-reporting-flow` surfaces) |
| **Parallel-safe** | yes (client-only; no shared contracts, no new endpoint, no migration) |

---

## 2. Intent

When a user on the **Result Framework Reporting** view (`/result-framework-reporting/entity-details/:code?tocView=aows`) presses **Report** on a KPI indicator of type *Number of knowledge products*, then selects a KP (CGSpace browse or Manual Entry + Sync), the system should **immediately trigger result creation** without requiring manual form interaction. The `contribution_to_indicator_target` field must always be **1** for Knowledge Products (one KP = one unit), never exposed for editing.

---

## 3. Problem / Current Behavior

After a KP is selected and MQAP metadata is retrieved, the modal presents the full form:

1. **Title retrieved from CGSpace** — auto-populated, read-only ✅  
2. **Contribution to indicator target** — defaults to `0`; the footer shows "1 field left before you can create"; user must set it manually ❌  
3. **Contributing CGIAR Centers** — pre-populated from ToC, optional ✅  
4. **Contributing Science Programs/Accelerators** — pre-populated from ToC, optional ✅  
5. **Contributing W3/bilateral projects** — optional ✅  
6. **Create and continue** button — user must click ❌  

The user incurs **two unnecessary interactions** (fix the numeric field → click the button). For a KP the contribution is always exactly 1, and no optional field is required before creation.

---

## 4. Proposed Outcome

| # | Behaviour |
|---|---|
| 1 | **Auto-set contribution to 1** — when the resolved `result_type_id` is 6 (KP), `contribution_to_indicator_target` is set to **1** automatically. The field is read-only or hidden in the modal. |
| 2 | **Auto-create on successful MQAP resolution** — as soon as the MQAP response is received with a valid title (both CGSpace browse and Manual Entry paths), `createResult()` is called automatically. The modal closes and navigates to result-detail exactly as clicking the button does today. |
| 3 | **Loading state during auto-create** — the selected-item card shows a spinner while the create request is in flight so the navigation does not feel like a bug. |

---

## 5. Scope

- **Client only**: `aow-hlo-create-modal.component.ts`, `aow-hlo-create-modal.component.html`, `create-result-payload.util.ts`.
- Initialize `contribution_to_indicator_target` to `1` when `currentResultIsKnowledgeProduct()`.
- Hide / read-only the `Contribution to indicator target` input block when `currentResultIsKnowledgeProduct()`.
- At the end of `onCgspaceItemSelected()` and `GET_mqapValidation()` success handlers, if `currentResultIsKnowledgeProduct()`, call `createResult()`.
- No new endpoint, no migration, no server change.

## 6. Non-Goals

- Changing the Manual Entry tab for non-KP result types.
- Modifying optional Contributing Centers / Science Programs / Bilateral Projects fields.
- Changing the MQAP validation endpoint or payload contract.
- Changing the redirect target after creation.
- Changing behaviour in the `result-creator` page KP flow (separate surface).

---

## 7. Affected Users, Systems, And Specs

| Persona | Impact |
|---|---|
| **Result submitter (AoW lead / PI)** | Primary beneficiary: removes 2 friction steps when reporting a KP from the entity-detail reporting view. |
| **QA reviewer / PMU** | Indirect: results always carry `contributing_indicator = 1`, the correct value — reduces bad data. |

**Code areas:**
- `aow-hlo-create-modal.component.ts` — `onCgspaceItemSelected()`, `GET_mqapValidation()` success, `createResult()`, `cleanModal()`
- `aow-hlo-create-modal.component.html` — `Contribution to indicator target` input block
- `create-result-payload.util.ts` — document/enforce the KP-always-1 contract

**Related specs:** `changes/mass-reporting-flow` (owns the modal; this is additive), `changes/reporting-entry-hub` (surface context).

---

## 8. Visual Reference

- **Source:** 3 screenshots provided by j.cadavid@cgiar.org in chat (2026-08-31).
- **Location:** Temp paths only (not persisted). Key screen: modal after CGSpace item selected shows `Contribution to indicator target = 0` (red arrow) + "1 field left before you can create" + "Create and continue" button (red arrow).
- **Notes:** No Figma link. The change is a behaviour/UX simplification with no new screens needed; mockup not required.

---

## 9. Requirement Delta Preview

### ADDED Requirements

- When `result_type_id = 6` (KP), `contribution_to_indicator_target` is always **1** (enforced in the component and in `buildCreateResultPayload`).
- After successful MQAP resolution (`onCgspaceItemSelected` browse path and `GET_mqapValidation` manual path), if `currentResultIsKnowledgeProduct()`, automatically call `createResult()`.
- A spinner/loading state on the selected-item card is shown while auto-create is in flight.

### MODIFIED Requirements

- `createResultBody.contribution_to_indicator_target` initialization: `null` → `1` when indicator resolves to KP.
- `Contribution to indicator target` input block: hidden or read-only when `currentResultIsKnowledgeProduct()`.
- `onCgspaceItemSelected()` and `GET_mqapValidation()` success: call `createResult()` at the end for KP.

### REMOVED Requirements

- User obligation to manually set `Contribution to indicator target` and click "Create and continue" for KP results.

---

## 10. Approach Options

| | A — Immediate auto-create after MQAP success (**Recommended**) | B — Auto-create with countdown + Cancel | C — Auto-set field to 1; user still clicks button |
|---|---|---|---|
| Friction removed | Maximum — zero extra clicks | Medium — user waits for countdown | Low — removes only field friction |
| Risk | Low; MQAP must succeed first (existing validation gate) | Adds countdown UI complexity | Lowest code risk but misses the owner's intent |
| Size | ~5-10 LOC in `.ts` + 1 template block change | ~30-50 LOC (countdown signal + UI) | ~3 LOC |
| Aligns with owner's wording | ✅ "como si se presionara el botón de create and continue" | ✅ | ❌ |

**Recommended Approach A.** On successful MQAP response, if the result type is KP, set `contribution_to_indicator_target = 1` and immediately call `createResult()`. The only risk (R1 below) is async preselection timing and is resolvable in specify.

---

## 11. Risks, Dependencies, And Open Questions

**Risks**

- **R1 (Main risk)** `preselectTocCenters()` is async (`centersSE.getData()` is a Promise). If auto-create fires before it resolves, the payload carries an empty contributors list. **Mitigation:** await the preselection promise inside `onCgspaceItemSelected` / `GET_mqapValidation` success before calling `createResult()`, or chain the auto-create inside the preselection callback. Confirm the exact async sequencing in specify.
- **R2** Manual Entry: after Sync auto-creates, there is no confirmation step if the user typed the wrong handle. **Mitigation:** the existing regex + MQAP validity check is the gate; the result detail page is always editable. Acceptable risk.
- **R3** `canCreateResult()` interaction: if `showsInnovationLink()` is somehow true on a KP (result_type_id=6), the auto-create would silently skip. In practice KP and Innovation Use are mutually exclusive indicator types — confirm in specify.

**Open Questions**

- **OQ-1** Hide the `Contribution to indicator target` field entirely, or show it read-only with value = 1? *Recommendation: read-only and visible (consistent with the read-only KP title pattern; transparent to the user).*
- **OQ-2** Manual Entry tab: does auto-create fire when the user clicks "Sync" and the MQAP call succeeds? The owner confirmed both paths should behave identically ("desde CGSPACE o con el Manual Entry").
- **OQ-3** Is the existing redirect target (`result-detail/:code/general-information?phase=:versionId`) sufficient, or should the auto-create redirect also carry any context from the originating KPI (AoW, indicator)?

---

## 12. Success Criteria

- Clicking "Report" on a KP indicator, selecting a CGSpace item (or successfully syncing a manual handle), navigates the user to the result detail page **with zero additional manual interactions**.
- The POST body always contains `contributing_indicator: 1` for a KP result created through this flow.
- All existing unit tests for `AowHloCreateModalComponent` and `create-result-payload.util` remain green.
- Non-KP reporting flows (Innovation use, Capacity sharing, etc.) are completely unaffected.
- No regression in `aow-hlo-table` pinned tests.

---

## 13. Next Step

```text
/akili-specify changes/kp-report-modal-auto-create
```
