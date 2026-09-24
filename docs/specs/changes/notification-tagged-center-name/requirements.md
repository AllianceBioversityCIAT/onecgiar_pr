# Requirements — Name the tagged Center in the project-tagged notification

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/notification-tagged-center-name` |
| Depth | **Lite** (one server line + tests + spec text) |
| Type | Change · Approval Mode: gated |
| Proposal | `proposal.md` — Option A approved 2026-09-24 |
| Amends | `notifications/bilateral-contributor-tagging` → BCT-R-7, AC35 / D-4 |
| Baseline | `docs/trd/trd.md` notifications module; no PRD/UX change (copy only) |

## 2. Summary

The `Result Bilateral Project Tagged` text names the tagged project but not the Center it belongs to. It gains the owner Center's acronym so multi-Center users know which Center was tagged.

## 3. Requirements

| ID | Requirement |
|---|---|
| **NTC-R-1** | The project-tagged notification text SHALL read `The result <code> - <title> reported by <reporting Center> has tagged the <project name> of your center (<owner Center acronym>). Click to see the result.` |
| **NTC-R-2** | `<owner Center acronym>` SHALL be the owner Center's institution acronym; if it is missing, the Center `code`. The parenthesis MUST NOT be empty or omitted. |
| **NTC-R-3** | The Center-tagged text (BCT-R-8), the lead-in wording, recipients, dedup (BCT-R-9) and all non-bilateral texts (BCT-R-12) SHALL NOT change. |

### Scenarios

**S1 — Acronym present (NTC-R-1, R-2)**
- GIVEN a CIMMYT bilateral result with a non-lead project `S-YAU44` owned by ICRISAT (institution acronym `ICRISAT`)
- WHEN the result reaches Pending Review
- THEN ICRISAT Center Users receive `…reported by CIMMYT has tagged the S-YAU44 of your center (ICRISAT). Click to see the result.`
- BUT the text MUST NOT name any other Center the recipient also belongs to.

**S2 — Acronym missing (NTC-R-2)**
- GIVEN the owner Center has no institution acronym (code `AR-CODE-Z`)
- WHEN the notification is built
- THEN the text ends `…of your center (AR-CODE-Z). Click…`
- AND IT MUST NOT render `()` or drop the parenthesis.

**S3 — Derived + project Center (BCT-R-9 unchanged)**
- GIVEN a Center is both a derived contributing Center and a project owner
- WHEN the result is submitted
- THEN its users get one notification, with the NTC-R-1 text.

**S4 — Several tagged Centers, one user (accepted edge)**
- GIVEN a user is Center User of two Centers that each own a tagged project
- WHEN the result is submitted
- THEN the user receives one notification (BCT-R-9) naming the Center of the first project target.
- AND IT MUST NOT be a new notification or a list of Centers.

**S5 — Untouched texts (NTC-R-3)**
- GIVEN a Center-tagged (scenario 6) or non-bilateral tagged notification
- WHEN built
- THEN the text is byte-identical to today.

## 4. Non-Functional

- **NTC-NFR-1:** No extra queries per project; the acronym comes from the Center index already loaded once per call (BCT-NFR-5).
- **NTC-NFR-2:** No log line adds Center or user data beyond what exists today.

## 5. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong/missing acronym text; empty `()` | Jest exact-string assertions (S1, S2) |
| Other texts changed by accident | Existing exact-string specs stay green (S5) |
| Extra query per project | `centerRepo.find` call-count assertion (existing, stays 1) |
| Real DB row has no `clarisa_institution` link for a Center | **No automated check** — accepted risk; falls back to `code` (S2), so text stays valid |

## 6. ID Index

NTC-R-1..3, NTC-NFR-1..2 · Scenarios S1–S5.
