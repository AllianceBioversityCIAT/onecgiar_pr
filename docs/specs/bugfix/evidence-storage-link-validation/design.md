# Module Spec — `design.md`

> Depth: **Lite** (Bug Mode). Implementable from this document alone; template sections kept but terse — the change is localized to one repository file plus one new constant.

Linked: `docs/specs/bugfix/evidence-storage-link-validation/requirements.md`. Project docs: `docs/prd.md` (`AC-1`, `AC-6`), `docs/trd/trd.md` (`api/results/results-validation-module`, workflow `W2`).

---

## 1. Summary

Tighten the single evidence-link acceptability check inside `resultValidationRepository` so a SharePoint/OneDrive/Google Drive/Dropbox link no longer counts as acceptable evidence for Evidence-section validity (and therefore the submission gate, which reads the same computation). The rejection applies only to evidence rows last written on/after a fix-effective cutoff date, so no already-valid result flips to invalid. Biggest trade-off: the cutoff is a fixed date decided at merge time (mirrors the existing `env.PREVIOUS_PHASE_DATE` pattern in the same file), not a dynamically-computed "deploy instant" — see `EVL-DD-1`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server module touched:** `onecgiar-pr-server/src/api/results/results-validation-module/` — only `results-validation-module.repository.ts`.
- **Client modules touched:** *(updated by Pivot, 2026-09-07)* `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` — see §6.
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

No new flow — this changes the internals of an existing computation:

```
[Any evidence-section validity read: page load, save, submit attempt]
  └── ResultsValidationModuleService.validateResultById(resultId)
        └── resultValidationRepository.evidencesValidation(resultId)   # name approximate; see file
              ├── query all active evidence for the result
              ├── multiplePerField = evidence.some(e => isAcceptableEvidenceLink(e))   # CHANGED
              │     └── isAcceptableEvidenceLink now also rejects a forbidden-host
              │         link, UNLESS e.last_updated_date < EVIDENCE_LINK_RULE_EFFECTIVE_DATE
              └── section validation = otherSqlValidation AND multiplePerField
```

The submission gate is not a separate check — it reads the same `evidences` section validity, so `EVL-R-3` is satisfied by construction (no second call site to keep in sync).

---

## 3. Data Model Changes

### 3.1 Entities

None. `Evidence.last_updated_date` (`api/results/evidences/entities/evidence.entity.ts:229-232`) already exists and is written by the standard save path — reused as-is, not added.

### 3.2 Migrations

None — no schema change.

### 3.3 CLARISA / external-data implications

None.

---

## 4. API Surface

### 4.1 New / changed endpoints

None. No controller, DTO, or route changes — the fix is inside the repository method that already backs the existing validation endpoints/flows. No new request/response shape.

### 4.2 Bilateral / platform-report impact

None — this module is not part of the bilateral/platform-report payload surface.

---

## 5. Server Workflow / Business Rules

- **Repository responsibility (all the change lives here):** `resultValidationRepository` currently derives `multiplePerField` from `allEvidences.some((e) => e.link && this._regex.test(e.link.trim()))` at line 866. Replace the inline `_regex.test(...)` predicate with a small private helper, e.g. `_isAcceptableEvidenceLink(evidence: Evidence): boolean`, that:
  1. Returns `false` if the link isn't a well-formed URL per the existing `_regex` (unchanged behavior).
  2. Returns `true` if the link's host is not in the file-storage denylist (unchanged behavior for ordinary links).
  3. If the host **is** in the denylist: returns `true` when `evidence.last_updated_date < EVIDENCE_LINK_RULE_EFFECTIVE_DATE` (grandfathered — pre-fix evidence keeps validating as before), otherwise `false`.
- **Denylist:** a new private readonly regex mirroring the client's list (`rd-evidences.component.ts:476`): `/^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i`.
- **Effective-date constant:** see `EVL-DD-1`.
- **Transactions / concurrency:** unaffected — this is a read-only validity computation, no writes.
- **No cross-module side effects** — no notifications, no audit rows; this only changes what counts as "valid" when the existing flows read it.

No new workflow id — this sits inside the existing submission-gate read path (`docs/trd/trd.md` `W2`).

---

## 6. Frontend Plan

*(Added by Pivot, 2026-09-07 — see `execution.md` "Pivot Record: EVL-T-2 post-QA". Originally "Not applicable — no client change in scope"; superseded.)*

- **Component touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` only.
- **What changes:** the `draftValid` getter (currently lines 417-423) gates the modal's "Add evidence"/"Save changes" button (bound via `[ngClass]="{ globalDisabled: !draftValid }"` in `rd-evidences.component.html:137`). Today it only checks that a link or file is present:
  ```ts
  get draftValid(): boolean {
    const e = this.draftEvidence;
    if (!e) return false;
    if (e.is_sharepoint) return Boolean(e.file || e.link);
    return Boolean(e.link);
  }
  ```
  It must also reject a denylisted link, reusing the **exact same regex already defined** at `rd-evidences.component.ts:475-476` (currently local to the `validateButtonDisabled` getter):
  ```ts
  private readonly _fileStorageDenylistRegex =
    /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i;

  get draftValid(): boolean {
    const e = this.draftEvidence;
    if (!e) return false;
    if (e.is_sharepoint) return Boolean(e.file || e.link);
    if (!e.link) return false;
    return !this._fileStorageDenylistRegex.test(e.link);
  }
  ```
  Promoting the regex to a `private readonly` class field (instead of leaving it locally declared inside `validateButtonDisabled`) lets both getters share one definition — replace the local declaration inside `validateButtonDisabled` with a reference to the new field; do not keep two copies of the same pattern.
- **No new host list.** This reuses the regex that already exists in this file (byte-identical to the server-side denylist added by `EVL-T-2`) — no new client-side denylist definition, per `requirements.md` §3's updated Out-of-scope note.
- **No server call.** Purely a client-side UI gate — the button's disabled state, nothing else. Does not touch `POST /api/evidences/create/:resultId` or any other endpoint.
- **Scope boundary:** only the modal's Add/Save button. The already-existing section-level `validateButtonDisabled` (whole-section "Validate"/save gate) is unchanged — it already covers the case of a bad link that somehow ends up in the list (e.g. legacy data), and continues to do so.

---

## 7. Security & Authorization

- No change to JWT/role posture — this method is reached through the same authenticated endpoints as today.
- No new external input — the denylist and cutoff are server-internal constants, not user-supplied.
- No secrets involved.

---

## 8. Performance & Capacity

- No new query — the fix operates on the same `allEvidences` array already loaded at line 861-864 (`select * from evidence ... where result_id = ?`). The added host check is a single regex test per evidence row, same order of magnitude as the existing `_regex.test`.
- No index or query-plan impact.

---

## 9. Observability

- No new logging required (matches `requirements.md` §7 — this is a pure validity computation, not a new failure-prone code path).

---

## 10. Testing Plan (forward-looking)

- **Unit test (repository):** new/updated `results-validation-module.repository.spec.ts` cases:
  - A SharePoint-only evidence with `last_updated_date` today (>= effective date) → section invalid. **Red before the fix** (current code marks it valid), **green after**.
  - A plain-link-only evidence → section valid (no regression).
  - A SharePoint-only evidence with `last_updated_date` before the effective date → section valid (grandfathered).
  - Google Drive, OneDrive, Dropbox variants of the first case, to cover the full denylist (`EVL-R-1`'s host set), at least as parameterized cases of the same test.
- Coverage target: server thresholds (branches 5% / functions 20% / lines 35% / statements 40%) are already met project-wide; this file's existing spec suite just needs the new cases added — no separate uplift target for a change this size.

---

## 11. Backwards Compatibility & Migration Plan

- **API contract:** unaffected — no request/response shape change.
- **Data backfill:** explicitly none — `EVL-R-2` requires NOT touching pre-existing evidence rows; the grandfather clause is the backfill-avoidance mechanism.
- **Feature flag:** none — the fix is unconditional past its effective date; no rollout toggle needed for a bug fix of this size.
- **Rollback:** revert the PR. No migration to reverse (§3.2 — none exists).

---

## 12. Design Decisions (ADRs)

### `EVL-DD-1` — Effective-date cutoff is a fixed constant, not a dynamic "deploy instant"

- **Context:** `EVL-R-2` requires that evidence untouched since before the fix keeps validating under the old rule. The exact moment "the fix went live" isn't observable from inside the application (no deploy-timestamp table), and per this project's `CLAUDE.md` §"MySQL + TypeORM", migrations/config land through the Jenkins pipeline, not a value the app can introspect.
- **Decision:** hardcode a private constant, `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`, in `results-validation-module.repository.ts`, following the existing `env.PREVIOUS_PHASE_DATE` precedent already used six times in the same file — but as a plain constant with an env-var override (`env.EVIDENCE_LINK_RULE_EFFECTIVE_DATE ?? '<merge-day-date>'`) rather than a required env var, so the fix works correctly even if no one provisions the env var in every environment. **The literal default date must be set to the actual planned rollout date at merge time** (task `EVL-T-1` — see `tasks.md`), not left at a placeholder.
- **Alternatives considered:**
  1. *Required env var only (no code default).* Rejected — if unset in any environment, the comparison (`new Date(undefined)`) is `Invalid Date`, and every comparison degrades to `false`, silently disabling the fix instead of failing loudly. A required-with-no-default is worse than a defaulted-with-override for a bug fix that must not silently regress.
  2. *A dedicated "migration marker" row inserted by a schema migration, compared against `evidence.last_updated_date`.* More correct in principle (ties the cutoff to actual deploy time) but adds a migration for a Lite bug fix and a new read on every validity check; overkill for the size of this change.
- **Consequences:** the cutoff date lives in application code and must be set correctly once at merge time; if the PR merges later than planned, the constant needs a one-line update before merge (not a follow-up ticket — it's part of `EVL-T-1`'s done criteria).

---

## 13. Open Gaps & Follow-ups

- The shared-denylist-constant follow-up already noted in `proposal.md` §12 (avoid client/server list drift) remains deferred, not blocking this fix.
- `EVL-DD-1`'s literal default date must be confirmed/updated immediately before merge to match actual rollout timing (see `tasks.md` `EVL-T-1` done criteria).

---

## Budget (Step 2.4)

- **Expected tasks:** 2 (`EVL-T-1` fix + constant, `EVL-T-2` regression tests — see `tasks.md`).
- **Expected LOC:** ~40-60 (helper method + constant + denylist regex in the repository file, ~15-25 test-file lines per case × ~5 cases).
- **Expected review rounds:** 1.

These numbers match **Lite** depth — no upgrade or downgrade indicated.

**(Added by Pivot, 2026-09-07)** Revised budget after `EVL-T-3`:

- **Expected tasks:** 3 (adds `EVL-T-3`, client-side modal gate — see `tasks.md`).
- **Expected LOC:** +~15-25 (regex promoted to a class field + one new conditional branch in `draftValid` + ~2-5 new/updated Jest cases).
- **Expected review rounds:** 1 (unchanged — `EVL-T-3` is small and self-contained).

Still within **Lite** depth.

---

## Required cross-references

- `docs/specs/bugfix/evidence-storage-link-validation/requirements.md` (same folder).
- `docs/prd.md` (`AC-1`, `AC-6`), `docs/trd/trd.md` (`api/results/results-validation-module`, `W2`).
- `docs/specs/bugfix/evidence-storage-link-validation/proposal.md` (confirmed root cause, retroactivity decision).
