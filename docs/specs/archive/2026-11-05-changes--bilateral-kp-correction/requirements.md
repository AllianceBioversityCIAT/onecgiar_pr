# Requirements — A reporting platform corrects a Rejected or Editing Knowledge Product

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-kp-correction` |
| Module | `bilateral` (sub-feature: KP correction through `create`) |
| Type | **Change** · Depth **Full** (payload contract, all-or-nothing write, external DSpace dependency) |
| Deliverable | software |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-11-05 (Phase 1 gate; `KPC-R-8` amended at Phase 2) |
| Date | 2026-11-05 |
| Owner | Juan David Delgado |
| Jira | [P2-4065](https://cgiarmel.atlassian.net/browse/P2-4065) (epic P2-3094) |
| Proposal | `proposal.md`, same folder. Open items `KPC-OQ-1..4` taken with their **proposed defaults**: the user ran `/akili-specify` without changing them (2026-11-05). They are still confirmed at this Phase 1 gate |
| Builds on | `bilateral/resubmit-rejected-result` (`RSB`, archived `docs/specs/archive/2026-10-06-bilateral--resubmit-rejected-result/`), `bilateral/rejected-result-correction` (`RRC`), `bilateral/resubmit-followups` (`RSF`), `changes/bilateral-create-upsert-by-code` (`UBC`) |
| Amends | `RSB-R-7` (KP excluded) → `versioned` branch only. `RSB-R-2` (Rejected only) → gains a KP exception. See §10 |
| Baseline | `docs/prd.md` US-D1, `AC-4`, `AC-8`, `AC-9`; `docs/trd/trd.md` bilateral module; contract `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` ("Resubmitting a rejected result", Rejections table) |

## 2. Executive Summary

A producer platform (STAR, MEL, TIP) sends the same `POST /api/bilateral/create` with the `result_code` of a **Knowledge Product** that is **Rejected** or **Editing** in the open phase. PRMS:

1. takes the fields the centre owns from the payload (contacts, centres, projects, partners, ToC);
2. re-reads everything else from DSpace by the stored handle, and ignores the payload values for those fields;
3. returns the KP to review (or keeps it in Editing when asked), on the same record.

| The platform sends `result_code` of… | PRMS answers |
|---|---|
| a KP in Rejected, open phase, same platform, same handle | `updated` · Pending Review |
| a KP in Editing, open phase, same platform, same handle | `updated` · Pending Review, or Editing when `keep_editing: true` |
| a KP in any other status | `409` naming the code and the status |
| another platform's KP | `403` |
| a KP with a different handle in the payload | `409` |
| a KP whose DSpace record cannot be read | `502` |
| a KP whose DSpace year no longer fits the reporting cycle | `422` |
| a KP from an earlier phase (carry-forward) | `409`, as today |

**Every refusal leaves the stored KP unchanged.** Non-KP results behave exactly as today.

## 3. Glossary

| Term | Meaning |
|---|---|
| **KP** | A result with `result_type_id = 6` (Knowledge Product) |
| **Correction** | A `create` carrying the `result_code` of an open-phase KP in Rejected or Editing. The KP counterpart of the RSB *resubmission* |
| **Payload-owned field** | A field the centre authors in its platform, taken from the payload on a correction (§6, `KPC-R-4`) |
| **DSpace-owned field** | A field PRMS reads from DSpace / CGSpace (through MQAP) by handle. The payload never writes it (§6, `KPC-R-5`) |
| **Stored handle** | The handle recorded on the KP when it was created |
| **Open phase** | The active reporting phase, as in `RSB` |
| **Refusal** | Any 4xx or 5xx answer to a correction |

## 4. System Context & Scope

### Today

| Behavior | Evidence |
|---|---|
| Any `result_code` of an open-phase KP is refused with 409, whatever its status | `src/api/bilateral/bilateral.service.ts:4611` (`assertNotKnowledgeProduct` in the `updated` branch) |
| The `updated` branch accepts Rejected only, for every type | `bilateral.service.ts:4681-4691` |
| The carry-forward (`versioned`) branch refuses KPs separately | `src/api/bilateral/versioning-rules/bilateral-versioning-rules.service.ts:106` |
| The contract documents "Knowledge Product → 409, checked on both paths" | `docs/bilateral-result-summaries.en.md:463` |
| A KP can be born in Editing (`keep_editing: true`) | `src/api/bilateral/constants/initial-status.constants.ts` `resolveInitialStatusId`, used by `handlers/knowledge-product.handler.ts` |
| KP title, description, geography and evidence come from DSpace on create; the payload's are not used | `bilateral.service.ts:547-616`; `handlers/knowledge-product.handler.ts` (`populateKPFromCGSpace`) |
| Last year KPs could be corrected by the platforms | Partner statement in P2-4065: UNVERIFIED — confirm at source before relying on it |

### In scope

- The KP path inside `POST /api/bilateral/create` when `result_code` matches an open-phase KP.
- The allowed statuses, the handle check and the DSpace re-sync.
- The resulting status, the review history, the response.
- The contract doc (`bilateral-result-summaries.en.md`): the KP rules and a change-log row.

### Out of scope

- Editing correction for any type other than KP (`RSB-R-2` stays for them).
- Carrying a KP into a new phase (`versioned`).
- Changing a KP's handle or its type.
- The Fetcher validator and the Fetcher docs (repo `onecgiar_result_functions`; P2-4065 AC 1–2, 9–10). Listed in §9 as a dependency.
- Reporting Tool UI.
- PATCH or partial updates.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| **Producer platform** (STAR, MEL, TIP; US-D1) | Can correct a rejected or in-progress KP without retyping it in PRMS |
| **SP reviewer** | Gets the corrected KP back in its queue, with the rejection history intact |
| **Centre user in PRMS** | An Editing KP may be overwritten by its platform. Last write wins; the overwrite is in the history |
| **Platform admin** | Can audit each correction in the review history |

User story: **`KPC-US-1`** — As a producer platform, I want to send a correction for a Knowledge Product that is Rejected or still in Editing, so that the centre fixes the fields it owns where the result was authored. Refines US-D1.

## 6. Functional Requirements

### MUST

#### Requirement `KPC-R-1`: Allowed statuses (BR1, P2-4065 AC 3, AC 6)

When `result_code` matches a KP in the open phase, the system MUST accept the correction **only** when the KP is **Rejected (7)** or **Editing (1)**. For Quality Assessed (2), Submitted (3), Discontinued (4), Pending Review (5), Approved (6) and Draft (8) it MUST answer **409** with a message naming the `result_code` and the status name. The status is checked again under the per-result lock, as in `RSB`.

##### Scenario: an approved KP
- GIVEN KP `31500` is Approved in the open phase
- WHEN its platform sends `create` with `result_code: "31500"`
- THEN the answer is 409 and the message contains `31500` and `approved`
- AND IT MUST leave the KP unchanged (`KPC-R-10`)

##### Scenario: a KP under review
- GIVEN KP `31500` is Pending Review
- WHEN its platform sends a correction
- THEN the answer is 409 naming `pending review`

##### Scenario: the status changes between the check and the lock
- GIVEN KP `31500` is Rejected when the request arrives
- AND a concurrent request moves it to Pending Review before this one takes the lock
- WHEN this request takes the lock
- THEN the answer is 409
- AND nothing from this request is written

##### Scenario: Editing stays refused for other types
- GIVEN a policy change `28565` in Editing in the open phase
- WHEN its platform sends `create` with `result_code: "28565"`
- THEN the answer is 409, exactly as today (`RSB-R-2`)

#### Requirement `KPC-R-2`: Same record, `updated` response (P2-4065 AC 3; RSB-R-3, RSB-R-17)

A successful correction MUST keep the KP's internal id and `result_code`, MUST NOT create another result, and MUST answer `operation: "updated"` with the `result_code`, the resulting `status_id` and its status name.

##### Scenario: correction of a rejected KP
- GIVEN Rejected KP `31500` with id `40001`
- WHEN its platform sends a valid correction
- THEN the outcome row has `operation: "updated"`, `result_code: 31500` and the status of `KPC-R-7`
- AND the result with id `40001` is the one updated
- BUT it must NOT create a second result for the handle

#### Requirement `KPC-R-3`: Ownership and type (BR3, P2-4065 AC 7)

The system MUST refuse with **403** a correction from a platform other than the one that reported the KP, and with **409** a payload whose `result_type_id` is not Knowledge Product (`RSB-R-6`, `RSB-R-22`).

##### Scenario: another platform
- GIVEN KP `31500` reported by MEL
- WHEN STAR sends a correction for `31500`
- THEN the answer is 403
- AND the KP is unchanged

#### Requirement `KPC-R-4`: Payload-owned fields replace the stored ones (P2-4065 AC 3; RSB-R-4; `KPC-OQ-2`)

A successful correction MUST store exactly what the payload sends for these fields, replacing the stored values (sections not sent are cleared, as in `RSB-R-4`):

| Field | Payload key |
|---|---|
| Lead contact person | `lead_contact_person` |
| Result level | `result_level_id` |
| External submitter, date, comment | `submitted_by` |
| Lead centre | `lead_center` |
| Contributing centres | `contributing_center` |
| Contributing bilateral projects, with the lead | `contributing_bilateral_projects` |
| Contributing partners | `contributing_partners` |
| ToC mapping (primary SP) and contributing SPs | `toc_mapping`, `contributing_programs` |

##### Scenario: partners replaced
- GIVEN Rejected KP `31500` with payload partners A and B
- WHEN it is corrected with partner C only
- THEN its active payload partners are exactly {C}
- BUT it must NOT keep A or B active
- AND IT MUST keep the institutions DSpace contributed (`KPC-R-5`)

#### Requirement `KPC-R-5`: DSpace-owned fields come from DSpace (BR2, P2-4065 AC 4)

On every successful correction the system MUST re-read the KP from DSpace by its **stored handle** and store DSpace's values for: title, description, authors, issue year, DOI, licence, keywords, CG metadata, FAIR scores, altmetrics, the institutions DSpace contributes, countries, regions and the handle evidence. Payload values for these fields MUST be ignored, whether present or not.

##### Scenario: payload title ignored
- GIVEN Rejected KP `31500` whose DSpace title is "Soil carbon in Kenya"
- WHEN the correction sends `title: "Edited title"` and a `geo_focus` with Peru
- THEN the KP's title is "Soil carbon in Kenya"
- AND its countries are DSpace's
- BUT it must NOT store "Edited title" or Peru

##### Scenario: metadata changed in DSpace since the KP was created
- GIVEN the DSpace record of KP `31500` gained a new author after the KP was created
- WHEN the platform sends a correction
- THEN the KP lists the new author

##### Scenario: journal article
- GIVEN KP `31500` is a Journal Article
- WHEN its platform sends a valid correction
- THEN the DSpace re-sync runs and the correction succeeds
- BUT it must NOT be refused because the platform's user is not a PRMS admin

#### Requirement `KPC-R-6`: The handle cannot change (BR4)

When the payload's `knowledge_product.handle`, normalised the way the create path normalises it, differs from the stored handle, the system MUST answer **409** naming the `result_code`, and MUST leave the KP unchanged. A payload with no handle MUST be refused with **400**.

##### Scenario: different handle
- GIVEN Rejected KP `31500` with handle `10568/175322`
- WHEN the correction sends `https://hdl.handle.net/10568/999999`
- THEN the answer is 409
- AND the KP is unchanged

##### Scenario: same handle in another form
- GIVEN KP `31500` with handle `10568/175322`
- WHEN the correction sends `https://cgspace.cgiar.org/handle/10568/175322`
- THEN the handle is accepted as the same

#### Requirement `KPC-R-7`: Resulting status (P2-4065 AC 5; `KPC-OQ-1`)

| KP status before | `keep_editing` | Status after |
|---|---|---|
| Rejected | any value | Pending Review |
| Editing | `true` | Editing |
| Editing | `false` or absent | Pending Review |

A KP that ends in Pending Review MUST appear in its primary SP's review queue with the ordinary "result submitted" notice, as `RSB-R-14` does. A KP that stays in Editing MUST NOT be announced.

##### Scenario: rejected KP back to review
- GIVEN Rejected KP `31500`, rejected by SP01
- WHEN its platform sends a valid correction with `keep_editing: true`
- THEN the KP is Pending Review in SP01's queue

#### Requirement `KPC-R-8`: DSpace unavailable (`KPC-OQ-3`)

When DSpace cannot be read for the stored handle, or its answer is not a success, the system MUST answer **502** naming the `result_code` and saying the DSpace record could not be read, and MUST leave the KP unchanged.

**One exception (amended at Phase 2, 2026-11-05).** When DSpace answers but the KP no longer meets the reporting-cycle year rule that KP creation applies, the system MUST answer **422** with that rule's message, and MUST leave the KP unchanged. That answer comes from the repository data, not from an outage, so it is not a 502.

##### Scenario: the publication year changed in DSpace
- GIVEN Rejected KP `31500`, reported in the 2026 cycle, whose DSpace record now says 2024
- WHEN its platform sends a valid correction
- THEN the answer is 422 with the reporting-cycle message
- AND the KP is unchanged

##### Scenario: DSpace down
- GIVEN Rejected KP `31500` and DSpace not answering
- WHEN its platform sends a valid correction
- THEN the answer is 502
- AND IT MUST leave no row created, modified or deactivated for the KP

#### Requirement `KPC-R-9`: The same preflight rules as a resubmission

A correction MUST pass the same refusals as an `RSB` resubmission before anything is written: a primary SP is named (`RSB-R-13`), it is allocated to the lead project (`RSB-R-12`), the payload yields exactly one lead project (`RSB-R-23`, `RSF-R-6`), and the lead centre resolves (`RSF-R-5`). It MUST NOT require `geo_focus`, and MUST NOT run the duplicate-title check (the title comes from DSpace).

##### Scenario: no geo_focus
- GIVEN Rejected KP `31500`
- WHEN the correction carries no `geo_focus`
- THEN it is accepted

#### Requirement `KPC-R-10`: A refusal changes nothing (BR5)

On any refusal under this spec (`KPC-R-1`, `R-3`, `R-6`, `R-8`, `R-9`, a payload validation, a busy lock) the stored KP MUST stay identical: header, status, every section, the DSpace-owned rows, its share requests and its history. No partial write.

#### Requirement `KPC-R-11`: Review history (P2-4065 AC 8; RSB-R-9, RSB-R-18; `KPC-OQ-4`)

A successful correction MUST append one `RESUBMIT` entry with its date, user and the payload's primary SP, **whether the KP was Rejected or Editing**. Earlier entries, including the rejection and its justification, MUST stay unchanged.

##### Scenario: rejection kept
- GIVEN KP `31500` rejected by SP01 with justification "wrong project"
- WHEN it is corrected
- THEN the history reads REJECT("wrong project", SP01), then RESUBMIT

#### Requirement `KPC-R-12`: KPs stay out of carry-forward

A `result_code` of a KP that exists only in an earlier phase MUST still be refused with 409 (`UBC-R-6`).

##### Scenario: approved KP from 2025
- GIVEN KP `20100` Approved in the 2025 phase and absent from the open phase
- WHEN its platform sends `create` with `result_code: "20100"`
- THEN the answer is 409 naming Knowledge Products

#### Requirement `KPC-R-13`: Non-KP behaviour unchanged

For every result type other than KP, `create` with or without `result_code` MUST behave exactly as before this spec: same statuses, same messages, same writes.

#### Requirement `KPC-R-14`: Contract

`onecgiar-pr-server/docs/bilateral-result-summaries.en.md` MUST describe the KP correction (statuses, payload-owned vs DSpace-owned fields, the handle rule, 502 and 422), MUST limit the "Knowledge Product → 409" row to carry-forward, and MUST carry a change-log row.

### SHOULD

#### Requirement `KPC-R-15`: Observability

Each correction SHOULD log one line with the `result_code`, the operation, the platform and the outcome (accepted or the refusal status), and never the payload, emails or keys (`RSB-R-21`, `.cursorrules`).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Atomicity | Every refusal happens before the first write (`KPC-R-10`). After the first write, a failure leaves the KP in its previous status, retryable, as `RSB-DD-3` |
| Concurrency | One correction per result at a time; a second concurrent one gets 409 (`RSB` lock) |
| Backwards compatibility | Additive on the contract (`AC-4`): no field removed or renamed; non-KP responses unchanged |
| Security | No new endpoint, no auth change; ownership check unchanged (`AC-9`) |
| Privacy | No payload, email or key in logs or error bodies |
| Performance | One DSpace round-trip per correction, as on KP create. No target beyond the create path's |

### Defect classes and their gates

| Defect class | Gate | Gap |
|---|---|---|
| Wrong branch: a status, type, handle or platform accepted or refused wrongly | Jest: `bilateral.service.spec.ts`, `bilateral-resubmission.service.spec.ts` | — |
| Partial write on refusal | Jest with the closed-world / in-memory helpers RSB built (counts every write) | — |
| Non-KP regression (resubmission, versioning) | Scoped jest `--testPathPattern=bilateral` | — |
| Type error in a port or a writer | `npx tsc --noEmit` (jest does not type-check specs against entities) | — |
| DSpace / MQAP real behaviour (field mapping, Journal Article gate, real failures) | **No automated gate** (unit tests stub DSpace) | Substitute: live run on PRTest with one Rejected and one Editing KP, checked at the HITL pause |
| Contract doc drift | No automated gate | Substitute: the task's Reviewer cross-checks each contract sentence against a test name, as `RSB-T-6` did |

## 8. Requirement ID Index

| ID | Short name | Strength | P2-4065 | Source |
|---|---|---|---|---|
| `KPC-R-1` | Allowed statuses | MUST | BR1, AC 3, AC 6 | proposal §4 |
| `KPC-R-2` | Same record, `updated` | MUST | AC 3 | RSB-R-3, R-17 |
| `KPC-R-3` | Ownership and type | MUST | BR3, AC 7 | RSB-R-6, R-22 |
| `KPC-R-4` | Payload-owned fields | MUST | AC 3 | `KPC-OQ-2` |
| `KPC-R-5` | DSpace-owned fields | MUST | BR2, AC 4 | proposal §9 |
| `KPC-R-6` | Handle immutable | MUST | BR4 | proposal §9 |
| `KPC-R-7` | Resulting status | MUST | AC 5 | `KPC-OQ-1` |
| `KPC-R-8` | DSpace unavailable | MUST | BR5 | `KPC-OQ-3` |
| `KPC-R-9` | Resubmission preflight | MUST | BR3 | RSB-R-12, R-13, R-23; RSF-R-5, R-6 |
| `KPC-R-10` | No partial write | MUST | BR5, AC 6 | RSB-R-8 |
| `KPC-R-11` | Review history | MUST | AC 8 | `KPC-OQ-4` |
| `KPC-R-12` | No KP carry-forward | MUST | (versioning guard) | UBC-R-6 |
| `KPC-R-13` | Non-KP unchanged | MUST | — | brief constraints |
| `KPC-R-14` | Contract doc | MUST | (AC 9–10 are Fetcher docs) | CLAUDE.md bilateral rule |
| `KPC-R-15` | Observability | SHOULD | — | RSB-R-21 |

## 9. Dependencies & Assumptions

| Item | Kind | Note |
|---|---|---|
| Fetcher forwards `data.result_code` on `knowledge_product` payloads (P2-4065 AC 1–2) | Dependency, other repo | Until it ships, test by calling `create` directly |
| Fetcher docs (P2-4065 AC 9–10) | Dependency, other repo | Remove the "KPs always 409" rule there too |
| DSpace / MQAP reachable from PRTest | Dependency | For the live run |
| `ResultsKnowledgeProductsService` is the only DSpace client used | Constraint | No new CGSpace client |
| KP creation stores the handle the platform sent, normalised | Assumption | Verified in Phase 2 (Premise Ledger) |

## 10. Amendments to earlier specs

| Earlier requirement | Before | After |
|---|---|---|
| `RSB-R-7` | A `result_code` of a KP is refused, whatever its status, on both paths | Refused on the carry-forward path only (`KPC-R-12`). On the open-phase path, `KPC-R-1` applies |
| `RSB-R-2` | Only Rejected, every type | Unchanged for non-KP types. KPs: Rejected or Editing (`KPC-R-1`) |
| `RSB-R-4` | Every section replaced from the payload | For KPs, only the payload-owned fields (`KPC-R-4`); DSpace-owned fields from DSpace (`KPC-R-5`) |

## 11. Decisions taken from the proposal (confirm at this gate)

| ID | Decision |
|---|---|
| `KPC-OQ-1` | Editing allowed for KPs only. Rejected → Pending Review; Editing → `keep_editing` |
| `KPC-OQ-2` | The payload-owned list in `KPC-R-4` |
| `KPC-OQ-3` | DSpace failure → 502, nothing written. Amended at Phase 2: the reporting-cycle year rule → 422 (`KPC-R-8`) |
| `KPC-OQ-4` | An Editing correction also writes `RESUBMIT` |

## Required cross-references

- `docs/prd.md`: US-D1, `AC-4`, `AC-8`, `AC-9`.
- `docs/ux-ui/design.md`: none (no UI).
- `docs/trd/trd.md`: bilateral module, review workflow.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: "Resubmitting a rejected result", Rejections table (line 463).
