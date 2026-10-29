# Proposal — Let Centers pick the 2026 project and P/A on replicated innovations

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/project-and-pa-assignment/` |
| Parent Spec | `docs/specs/bilateral/replicated-innovations-2026-pa/` (`family.md`, child #1) |
| Slug | `project-and-pa-assignment`, derived from the free-text argument |
| Type | **Change** |
| Status | **draft**, awaiting owner approval |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Date | 2026-10-16 |
| Ticket | Freshdesk INC-164073 (due Sat 24-Oct-2026); no Jira yet (`PAA-OQ-1`) |
| Depends on | none |
| Parallel-safe | yes |
| Requirement prefix (proposed) | `PAA` |

## 2. Intent

Nicoleta's red comments on 15-Oct-2026:

> *"During update of innovations by users please allow change in P/A, so that Centers can select a P/A different from 2025 if this is the case."*
>
> *"In these 63 cases too, pls allow change in P/A and add of Center w3/bilateral project from a drop-down (optionally)."*

The decision behind them is that the data is **not aligned by SQL**. Each Center decides for itself, inside the result editor.

## 3. Problem / Current Behavior

**Most of the mechanism already exists.** Section 0 of the bilateral editor (`section-zero-dashboard`) lets a Center change the **lead project and the primary program together**. It saves through `PATCH /api/bilateral/center/primary-assignment/:resultId` (P2-3283, PSR, RRC). The server:

- accepts only projects from the lead Center's catalogue (`bilateral-center.service.ts:211-221`);
- accepts only a primary program allocated to that project (`:223-232`);
- transfers the new P/A **directly** (no acceptance round, product decision 2026-10-07; corrected in specify);
- clears the ToC mapping of the previous P/A.

The gaps by group:

| Group (13-Oct Excel) | Results | What the Center can do today | Gap |
|---|---|---|---|
| **A. P/A ≠ the project's 2026 Programs** | 30 (16 single-program + 14 two-program) | In Section 0 the Program picker lists the project's SPs, so it can switch from SP09 to SP06 and similar. *Not yet checked on a replicated result in the browser.* | 1. Nobody knows the option exists: Contributors says *"Assigned from the project's mapping; it cannot be changed here."* (`section-contributors.component.html:37`) and points nowhere. 2. The flow is not yet verified on a replicated result whose current P/A is outside the project. |
| **B. No 2026 project** | 63 | Nothing. Section 0 shows *"No project linked"* with no picker (`section-zero-dashboard.component.html` `@else` branch, `bp-empty-hint`). Contributors shows the lead project as read-only and only allows *contributing* projects, which do not feed the default ToC block. | **There is no way to link a 2026 lead project.** |
| C. Project with no ToC node | 4 | Yes/No question + free ToC choice | None: already what Nicoleta asked for (point 4) |

**Data to verify:** 28634 (IITA) appears in group A with no `Lead project 2026` (SP01 vs SP13). It probably has the project as a contributor only. See `PAA-OQ-4`.

## 4. Proposed Outcome

1. **Group B:** when a replicated innovation (or any editable bilateral result) has **no lead project**, Section 0 shows the same project picker it already shows when a project exists. The picker uses the lead Center's catalogue for the active year. Choosing a project and its P/A saves through the **existing** `primary-assignment` endpoint, and from then on the result shows the default ToC block, exactly like a linked result. Picking a project stays **optional**: if the Center picks nothing, the result keeps its 2025 P/A and the Yes/No ToC question.
2. **Group A:** verify end to end that a replicated result whose P/A is outside the project can switch to one of the project's SPs, and fix whatever breaks.
3. **Discoverability:** the helper text in Contributors stops saying "cannot be changed" and points to where it can be changed (Section 0, *Project information*). The copy goes in `internationalization/`.

## 5. Scope

- Client: `section-zero-dashboard` (no-project branch → `app-bilateral-project-selector` + Program picker), the helper copy in `section-contributors`, and the folder `CLAUDE.md` files.
- Server: **in principle none**. `updatePrimaryAssignment` already validates the project against the catalogue and the P/A against the project. Premise `PAA-P-1` (the endpoint creates the lead `results_by_projects` row when none exists) was **confirmed** in specify.
- Tests: Jest for `section-zero-dashboard` (no-project branch) and `section-contributors` (copy).

## 6. Non-Goals

- **Do not align the P/A by SQL** for the 30 (Nicoleta's decision).
- **Do not remap L-CIA023 → C-D514** or add L-CIA023 for 2026. The 24 ILRI results follow the general rule: the Center picks a project if one exists.
- Do not change the P2-3283 rule (P/A ∈ project's Programs) or the P/A transfer flow.
- Do not change the default ToC block logic (BIL-TOC).
- Do not fix the versioning debt (`results_by_projects` is not replicated on a phase change). That is a separate spec; see Risks.

## 7. Affected Users, Systems, And Specs

| Type | Item |
|---|---|
| Users | Center Users / admins editing 2026 W3 innovations; SP reviewers (they receive results under the P/A the Center chose) |
| Client | `pages/bilateral/components/section-zero-dashboard/`, `pages/bilateral/components/section-contributors/`, `internationalization/bilateral-primary-assignment.copy.ts` |
| Server (verify only) | `api/bilateral/services/bilateral-center.service.ts` `updatePrimaryAssignment`; `share-result-request/services/primary-program-request.service.ts` |
| Related specs | archive `2026-09-18-bilateral--toc-default-linkage` (BIL-TOC), `2026-10-02-bilateral--lead-project-not-in-contributors` (LPC), `rejected-result-correction` (RRC), `bilateral-primary-sp-request` (PSR), `bilateral/replicated-innovation-annual-updating` (BIL-RAU) |
| Baseline | `docs/prd.md` G3 / US-D1 · `docs/ux-ui/design.md` §8 · `docs/trd/trd.md` bilateral module |

## 8. Visual Reference

- Source: **None, by design.** The change reuses the Section 0 project picker and Program picker that already exist when a project is linked.
- Notes: only the empty state *"No project linked"* changes (it becomes the picker) along with one helper line in Contributors.

## 9. Requirement Delta Preview

### ADDED Requirements
- `PAA-R-1`: An editable bilateral result **with no lead project** shows the project picker (lead Center's catalogue) and the P/A picker in Section 0. Saving links the lead project and the P/A in one operation.
- `PAA-R-2`: Picking a project is optional. If none is picked, the result keeps its current P/A and the Yes/No ToC question, and is not blocked from submission for that reason.
- `PAA-R-3`: Once a project is linked, the ToC section shows the default block whenever the project has nodes under the chosen P/A (existing BIL-TOC behaviour).

### MODIFIED Requirements
- Contributors helper text: from *"cannot be changed here"* to a pointer to Project information (Section 0).
- `PAA-R-4` (verification): a replicated result whose P/A is outside the project's Programs can choose one of the project's Programs in Section 0. The choice transfers the P/A directly.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **A. Reuse Section 0 + `primary-assignment` (recommended)** | Opens the existing picker in the no-project state and fixes the copy | Smallest change; the server already validates catalogue, allocation and alignment; one source of truth for project + P/A | The Center has to find Section 0 (mitigated by the copy) |
| B. Editable lead project + P/A in Contributors | New pickers in Contributors | It is where Nicoleta "sees" the P/A | Duplicates Section 0; P2-3283 forbids saving project + P/A through Contributors (sync-replace, never touches role 1) |
| C. Free P/A change without a project (any P25 SP) | Allows a P/A without a project | Covers "change P/A" literally for the 63 even with no project | Breaks the P2-3283/P-7 rule (P/A ∈ project); without a project there is no default ToC block anyway, so the result gains nothing; needs a new endpoint |

## 11. Recommended Approach

**Option A.** It is the smallest safe path: almost all of it is client-side, the endpoint and its validations already exist and are tested, and it keeps the project → P/A → ToC chain that Nicoleta described in her 12-Oct email.

## 12. Risks, Dependencies, And Open Questions

| ID | Type | Description | Recommendation |
|---|---|---|---|
| `PAA-OQ-1` | Ticket | No Jira ticket; commits will carry `[SPEC:...]` | Create a Jira ticket or use INC-164073 in the commit |
| `PAA-OQ-2` | Product | Does "allow change in P/A" for the 63 mean **without** a project? (Option C) | **No.** P/A changes through picking a project. With no project, keep the 2025 P/A + Yes/No. Confirm with Nicoleta in the reply |
| `PAA-OQ-3` | Scope | Only replicated innovations (7/2), or any editable bilateral result with no lead project? | Any editable bilateral result: it is the same empty state and restricting it adds a condition with no value |
| `PAA-OQ-4` | Data | 28634 has no lead project 2026 but has a project linked | Check `results_by_projects` (lead vs contributor) in specify |
| `PAA-P-1` | Premise | `updatePrimaryAssignment` creates the lead row when the result has none | ✅ Confirmed in specify (2026-10-16) |
| ~~`PAA-R-RISK-1`~~ | Governance | **Void (specify, 2026-10-16):** since 2026-10-07 the P/A change is a **direct transfer**, not a request. See `requirements.md` §11 | — |
| `PAA-R-RISK-2` | Data | Changing the P/A clears the previous P/A's ToC mapping (P2-3283) | Existing and expected behaviour; say so in the copy if it helps |
| `PAA-R-RISK-3` | Debt | Versioning still does not replicate `results_by_projects`; next year it happens again | Separate spec (out of scope) |
| `PAA-R-RISK-4` | Shared data | The local stack writes to the shared prdb | Browser checks without clicking save; save only on a test result |

## 13. Success Criteria

- A replicated innovation from the "Without 2026 project" sheet (e.g. 27270) can choose a 2026 project from its Center plus a P/A in Section 0, and after saving it shows the default ToC block (or Yes/No if the project has no nodes under that P/A).
- A result from group A (e.g. 28073, A-AG10156 SP06/SP07) can switch its P/A from SP09 to SP06 or SP07 in Section 0.
- Contributors no longer says "cannot be changed" without pointing to where it can be changed.
- Jest for `section-zero-dashboard` and `section-contributors` green with `--maxWorkers=2`; `ng lint` clean on the touched files.

## 14. Next Step

```text
/akili-specify bilateral/replicated-innovations-2026-pa/project-and-pa-assignment
```
