# Module Spec — `requirements.md`

> Depth: **Lite** (Bug Mode). Bounded server-only fix in one repository file; brevity preferred over template boilerplate.

---

## 1. Module / Feature

- **Module:** `results` → `results-validation-module`
- **Sub-feature:** Evidence-section link validation (file-storage host denylist)
- **Owner:** AKILI Specify (auto)
- **Status:** draft
- **Ticket(s):** [P2-3345](https://cgiarmel.atlassian.net/browse/P2-3345)

---

## 2. Context

`resultValidationRepository` (`onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.ts`) computes the green-check state of the Evidence section and gates submission. Its evidence-link check (`_regex` at line 27, applied at line 866) accepts any well-formed URL, including links to SharePoint, OneDrive, Google Drive, and Dropbox — even though the Evidence section's own UI copy (`rd-evidences.component.ts:75`) states those platforms are not allowed. The server and the UI copy disagree, so a result whose only evidence is an unusable file-storage link is wrongly marked complete and can be submitted.

PRD: `docs/prd.md` `AC-1` (typed result integrity), `AC-6` (evidence alignment at submit). TRD: `docs/trd/trd.md` workflow `W2`/submission gate, `api/results/results-validation-module`. Confirmed root cause and reproduction: `proposal.md` §9 (this folder).

---

## 3. In Scope / Out of Scope

### In scope (final, post-scope-reduction, 2026-09-07)

- **(Added by Pivot, 2026-09-07 — see `execution.md` "Pivot Record: EVL-T-2 post-QA")** Client-side: disable the "Add evidence" button inside the Add/Edit New Evidence modal (`rd-evidences.component.ts`) when the entered link matches the file-storage denylist, so a user cannot add such a link to the evidence list at all (not upload-in-place — via the existing "Upload file" option instead). **This is now the spec's entire deliverable** — see below.
- A regression test proving the bug is fixed, scoped to the client-side gate above (Jest, `rd-evidences.component.spec.ts`).

### Out of scope

- ~~Reject SharePoint/OneDrive/Google Drive/Dropbox links in the server-side evidence-link check that drives Evidence-section validity and the submission gate~~ **(REVERTED, 2026-09-07 — see `execution.md` "Scope Reduction: `EVL-T-1`/`EVL-T-2` reverted").** Originally in scope and shipped as `EVL-T-1`/`EVL-T-2`, then explicitly reverted: the patched method (`evidenceValidation()`) is only reachable via the server's v1 API route, which the client calls exclusively for **non-P25** results — the user's actual, stated scope was always P25 only ("Reporting 2026" and the current portfolio), where this code has zero effect regardless of its internal logic. The user ordered the server-side change removed rather than left in place doing nothing for the case that mattered.
- ~~Scope the rejection to evidence added or edited after the fix's effective date (`EVIDENCE_LINK_RULE_EFFECTIVE_DATE`)~~ **(REVERTED along with the above — moot without the server-side check it gated.)**
- Any client-side change beyond the modal's "Add evidence" button gate above. The client already showed the rule as static copy and already gated the whole-section "Validate" button (`validateButtonDisabled`) against the same denylist before this spec; those were untouched (`validateButtonDisabled` was only refactored to share one regex field with the new modal gate, no behavior change).
- Retroactively re-validating evidence untouched since before the fix.
- **(Confirmed out of scope, 2026-09-07 — see `execution.md` "Investigated and explicitly declined: SQL-side fix for `validation_evidences_P25`")** Any change to `validation_evidences_P25`, `validation_evidences_P22`, `validate_sections_mapped_batch`, or any other MySQL stored procedure/function. These compute the P25 (and P22) green check independently of anything this spec touches, and do not host-validate evidence links at all — the gap is real, but the user made an explicit, informed, twice-repeated decision not to touch it: already-saved evidence must never be retroactively affected by this ticket, regardless of host or phase, in either portfolio. `EVL-T-3` (client-side modal gate) is the sole enforcement mechanism, for both P22 and P25, by final design.
- A shared/centralized denylist constant used by both client and server (noted as future tech debt in `proposal.md` §12 — not blocking). The one remaining task (`EVL-T-3`) reuses the **existing** client regex already at `rd-evidences.component.ts:476` (used by `validateButtonDisabled`) — it does not introduce a new denylist definition.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Adding/editing a file-storage-platform evidence link after the fix no longer green-checks the Evidence section or lets the result submit on that evidence alone. |

---

## 5. User Stories

- **`EVL-US-1`** — As a result submitter, I want the Evidence section to only show complete when my evidence links are actually acceptable, so that I don't submit a result the tool will later reject the evidence of.

Refines `AC-1`, `AC-6`.

---

## 6. Functional Requirements

> **`EVL-R-1`, `EVL-R-2`, `EVL-R-3`, `EVL-R-10` below and `EVL-AC-1..4` in §8 describe the REVERTED server-side work (`EVL-T-1`/`EVL-T-2`) — kept for historical traceability, no longer implemented.** See `execution.md` "Scope Reduction". The only live requirement is `EVL-R-11` (§ below, added by Pivot) and its acceptance criteria `EVL-AC-5`/`EVL-AC-6`.

### Required (MUST) — reverted, kept for history

- ~~**`EVL-R-1`** When computing Evidence-section validity, the system MUST treat a link to SharePoint (`*.sharepoint.com`), OneDrive (`onedrive.live.com`, `1drv.ms`), Google Drive (`drive.google.com`, `docs.google.com`), or Dropbox (`dropbox.com`) as **not acceptable evidence**, using the same host set the client already uses (`rd-evidences.component.ts:476`).~~
- ~~**`EVL-R-2`** The file-storage-host rejection MUST apply only to an evidence row whose `last_updated_date` is on or after the fix's effective date. An evidence row last written before that date MUST keep evaluating under the pre-fix rule (well-formed-URL only), regardless of its host.~~
- ~~**`EVL-R-3`** The submission gate MUST derive from the same Evidence-section validity computation as `EVL-R-1`/`EVL-R-2` — no separate, disagreeing check.~~

- **`EVL-R-11`** *(Added by Pivot, 2026-09-07)* In the Add/Edit New Evidence modal, when the "Link" source is selected and the entered link matches the file-storage denylist (`EVL-R-1`'s host set), the "Add evidence" / "Save changes" button MUST be disabled (grayed out) — the evidence MUST NOT be addable to the list with that link. This is independent of `EVL-R-1`/`EVL-R-2`/`EVL-R-3` (server-side validity computation, with grandfather cutoff): the modal gate is a **client-side, unconditional** block at entry time — it has no grandfather cutoff, because it only ever applies to evidence being added or edited *now*, in this session.

### Should (SHOULD) — reverted, kept for history

- ~~**`EVL-R-10`** The effective-date cutoff SHOULD be configurable (env-var or constant), following the existing `env.PREVIOUS_PHASE_DATE` precedent in the same repository file, so it can be set at deploy time rather than requiring a code change to know the exact rollout instant.~~

---

## 7. Non-Functional Requirements

*(The row below described the reverted server-side work; the client-side `EVL-R-11` gate has no comparable backwards-compatibility surface — it only affects new modal submissions, never existing data.)*

| Dimension | Target |
|---|---|
| ~~**Backwards compatibility**~~ | ~~MUST NOT flip any evidence row last written before the effective date from valid to invalid (`EVL-R-2`).~~ *(N/A post-revert — no server-side validity computation remains in this spec.)* |
| **Security** | No new external input surface; no secrets involved. |
| **Observability** | No new logging required — this is a pure validity computation, not a new code path with failure modes to trace. |

---

## 8. Acceptance Criteria

**`EVL-AC-1..4` below describe the reverted server-side work — kept for history, not implemented. `EVL-AC-5`/`EVL-AC-6` (below the table) are the live acceptance criteria.**

| ID | Given | When | Then |
|---|---|---|---|
| ~~`EVL-AC-1`~~ | ~~A result whose only evidence is a SharePoint link (`https://cgiar.sharepoint.com/...`) saved after the fix's effective date~~ | ~~The Evidence section validity is computed~~ | ~~The section is reported invalid (not a green check)~~ |
| ~~`EVL-AC-2`~~ | ~~Same as `EVL-AC-1`~~ | ~~The user attempts to submit the result on that evidence alone~~ | ~~Submission is blocked (same computation as `EVL-AC-1`, `EVL-R-3`)~~ |
| ~~`EVL-AC-3`~~ | ~~A result whose only evidence is a plain public link (e.g. `https://example.org/report.pdf`)~~ | ~~The Evidence section validity is computed~~ | ~~The section is reported valid (no regression vs. current behavior)~~ |
| ~~`EVL-AC-4`~~ | ~~A result whose only evidence is a SharePoint link with `last_updated_date` before the fix's effective date~~ | ~~The Evidence section validity is computed~~ | ~~The section is reported valid (unchanged — `EVL-R-2`)~~ |
| `EVL-AC-5` *(Pivot)* | The Add/Edit New Evidence modal is open, "Link" source selected | The user types a SharePoint/OneDrive/Google Drive/Dropbox link into the Link field | The "Add evidence" ("Save changes" when editing) button is disabled/grayed out — clicking it does nothing |
| `EVL-AC-6` *(Pivot)* | Same modal state as `EVL-AC-5` | The user replaces the link with a plain public link (e.g. `https://www.cgiar.org/evidence-1`) | The button re-enables (no regression vs. current modal behavior for acceptable links) |

Cross-cutting: `AC-1` (typed result integrity), `AC-6` (evidence + ToC alignment at submit).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- None new. Reuses `Evidence` entity's existing `last_updated_date` column (`api/results/evidences/entities/evidence.entity.ts:229-232`).

### Downstream consumers

- Every caller of `resultValidationRepository.validateResultById` / the Evidence-section check (all result types) and the submission-gate flow that reads its output.

### Assumptions

- The client's existing host list (`rd-evidences.component.ts:476`, `evidence-item.component.ts:109`) is the correct, complete denylist to mirror server-side — no additional platforms are in scope for this ticket.
- "Effective date" can be a fixed constant set at merge/deploy time (design decides the exact mechanism — see `design.md` `EVL-DD-1`).

---

## 9b. Defect Classes & Verification Gates

| Defect class | Example failure | Catching gate |
|---|---|---|
| Wrong host classification | Denylist regex misses a variant (e.g. matches `sharepoint.com` but not a `xyz.sharepoint.com` subdomain) or over-matches a legitimate domain | `EVL-TEST-1`, `EVL-TEST-5` (unit, one case per host) |
| Grandfather-cutoff regression | Pre-existing evidence incorrectly flips from valid to invalid, or new evidence incorrectly stays valid | `EVL-TEST-3` (no-regression baseline), `EVL-TEST-4` (grandfather case) |
| Submission-gate drift | Gate and Evidence-section green check disagree | `EVL-TEST-2`; also structurally prevented by design (`design.md` §2.2 — one computation, no second call site) |
| **Effective-date constant left at a placeholder / wrong date at merge** | `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`'s literal default is not updated to the real rollout date | **No automated check possible** — this is a single hardcoded value a test cannot know the "correct" answer to. Substitute: human verification, enforced as an explicit `EVL-T-2` done-criterion checked at PR review (`tasks.md` §3). Recorded here as an accepted, mitigated risk, not an automated gate. |

---

## 10. Open Questions

None blocking — the one open item from `proposal.md` (§12, shared denylist constant) is explicitly deferred, not blocking.

---

## 11. Out-of-Band Notes

None.

---

## Required cross-references

- `docs/prd.md` — `AC-1`, `AC-6`.
- `docs/trd/trd.md` — `api/results/results-validation-module`, workflow `W2` (submission).
- `docs/specs/bugfix/evidence-storage-link-validation/proposal.md` — confirmed root cause, Bug Diagnosis, retroactivity decision.
