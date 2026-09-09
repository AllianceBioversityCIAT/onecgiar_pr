# Archive Summary — Evidence Storage Link Validation

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `EVL` |
| Original spec path | `docs/specs/bugfix/evidence-storage-link-validation/` |
| Type | Bug · Depth: Lite |
| Ticket | [P2-3345](https://cgiarmel.atlassian.net/browse/P2-3345) |
| Archive date | 2026-09-08 |
| Branch | `qa-development-2026-ss` (spec branch — default is `master`) |
| Final status | **Shipped — client-only.** Commit `4343f19b1` 🔧 `fix(rd-evidences) P2-3345 [SPEC:bugfix/evidence-storage-link-validation]: block adding SharePoint/OneDrive/Drive/Dropbox links in the evidence modal`. **Final scope is narrower than the original design**: `EVL-T-1`/`EVL-T-2` (server-side) were fully implemented, Reviewer-PASSed, then explicitly reverted by the user before merge — see §6. Only `EVL-T-3` (client-side modal gate) shipped. |

## 2. Requirements Delivered

| ID | Statement | Delivered by | Status |
|---|---|---|---|
| `EVL-R-11` | Add/Edit Evidence modal's "Add evidence"/"Save changes" button MUST be disabled for a file-storage-host link | `EVL-T-3` | ✅ Shipped, manually confirmed by the user in a live browser |
| `EVL-AC-5` / `EVL-AC-6` | Denylisted host → button disabled; plain link → button stays enabled | `EVL-T-3` | ✅ Shipped |
| `EVL-R-1`/`R-2`/`R-3`/`R-10` (server-side denylist + grandfather cutoff) | — | `EVL-T-1`/`T-2` (reverted) | ❌ **Not shipped — deliberately reverted, see §6** |

## 3. Files Changed Summary (final, post-revert)

| File | Nature |
|---|---|
| `onecgiar-pr-client/.../rd-evidences/rd-evidences.component.ts` | promoted the file-storage denylist regex to a shared `private readonly` field; `draftValid` getter now returns `false` for any of the 4 denylisted host families (SharePoint, OneDrive/`1drv.ms`, Google Drive/Docs, Dropbox); `validateButtonDisabled` refactored to reference the same shared field (no duplicate regex literal) |
| `rd-evidences.component.spec.ts` | new `describe('draftValid', ...)` block — 5 cases (4 denylisted host families + regression guards for plain links, empty link, and file-source drafts) |

**Explicitly reverted, not part of the shipped commit** (confirmed against the current repo — the file has neither `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` nor `_isAcceptableEvidenceLink`, and the new spec file was deleted, not merely left uncommitted):
- `onecgiar-pr-server/.../results-validation-module.repository.ts` — would have added `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`, `_isAcceptableEvidenceLink()`, and a denylist+grandfather-cutoff check in `multiplePerField`.
- `onecgiar-pr-server/.../results-validation-module.repository.spec.ts` — new file, deleted (not just reverted) since it never existed before this session.

No migration, no API surface change, no bilateral/platform-report impact — in either the shipped or the reverted portion.

## 4. Test Evidence Summary

No separate `test-report.md` — evidence embedded in `execution.md`.

| Check (final, `EVL-T-3` only) | Result |
|---|---|
| `npx jest --testPathPattern="rd-evidences.component.spec" --silent` | 86/86 passed |
| `npx ng lint --quiet` | clean |
| Manual smoke (live browser, result `#9075`) | Confirmed by the user: pasting a `cgiar.sharepoint.com` link grays out "Add evidence"; a plain link re-enables it |

`EVL-T-1`/`EVL-T-2`'s server-side test evidence (10/10 Jest passing, red→green demonstrated, Reviewer PASS) is historically real but no longer applicable — that code and its spec file were reverted.

## 5. Validation Summary

Both Reviewer-cycled tasks that were attempted (`EVL-T-1`→`EVL-T-2` as one server-side unit, `EVL-T-3` client-side) got **PASS on first attempt**, with only non-blocking ADVISORY notes (see `execution.md` for the full 4R-lens breakdown — reliability notes on NULL-date grandfathering, a whitespace-trim inconsistency between three sibling denylist checks, and a phase-replication edge case). No FAIL, no HALT. The scope change was driven entirely by a **Pivot** (user-initiated, post-QA) and a subsequent **explicit scope-reduction decision** (user-initiated, post-Pivot) — not by a Reviewer or Implementer defect.

## 6. Accepted Warnings / Follow-Ups — why the server-side half was reverted

This is the load-bearing history for this archive, condensed from `execution.md`'s three sequential sections ("Pivot Record", "Investigated and explicitly declined: SQL-side fix", "Scope Reduction"):

1. **Manual QA on the shipped-and-PASSed `EVL-T-2`** revealed the fix had no visible effect for the user's actual test case (result in portfolio P25) — not because the code was wrong, but because `.some()` semantics meant one still-acceptable evidence among several was enough to keep the whole section "valid," which is exactly what `EVL-R-1`/`EVL-AC-1` (as approved) asked for. This triggered a **Pivot**: the user's real intent was a client-side entry gate (block *adding* a bad link at all), which became `EVL-T-3`.
2. **A deeper investigation** (Leader-inline, tracing the live request path end-to-end) then found that `EVL-T-2`'s patched `evidenceValidation()` method is only reachable via the **v1** green-checks API route — and the client only calls v1 for **non-P25** results (`green-checks.service.ts:55`, `fieldsManagerSE.isP25()` branch). P25 results (which is what the user's manual QA, and their actual scope, was about) go through a **v2** route into a MySQL stored function (`validation_evidences_P25`, migration `1762528725798-createValidtionP25.ts`) that has no host/denylist logic at all and was never touched by this spec. So `EVL-T-2` was not dead code in the abstract, but it had **zero effect** for the exact case the user cared about.
3. Presented with the choice of (a) also patching the P25 SQL function, or (b) leaving it untouched and relying solely on the client-side gate (`EVL-T-3`), **the user explicitly and repeatedly chose (b)** — "no toques la base de datos, mi alcance nunca fue P22, solo P25, y la única protección real que quiero es que no se pueda AÑADIR un link malo." Given that P25 never reaches `EVL-T-2` regardless of what's inside it, the user then ordered the entire server-side change **reverted** (`git checkout` on the repository file, deletion of the new spec file) rather than left in as inert code.

**Consequence, by explicit user decision, not an oversight:** already-saved evidence links of any denylisted host, in any phase, in either portfolio, continue to compute exactly as they always did — the green check is untouched. The only enforcement is at entry time (`EVL-T-3`), preventing a **new** bad link from being added going forward.

**Still-open, non-blocking follow-up:** three now-independent copies of the same denylist regex exist (server `results-validation-module.repository.ts` — reverted, so this is now moot — client `rd-evidences.component.ts`, client `evidence-item.component.ts`). A shared-constant follow-up ticket was recommended in `proposal.md`/`design.md` but not filed.

## 7. Historical Notes

- **`execution.md` §5 ("Spec status (post-Pivot, final)") is internally contradictory and should not be trusted at face value.** It states "All three tasks (`EVL-T-1`, `EVL-T-2`, `EVL-T-3`) are `[x]`" — but the section immediately above it ("Scope Reduction") explicitly describes `EVL-T-1`/`EVL-T-2` being reverted via `git checkout`/file deletion. §5 was written before the final scope-reduction and never updated after. **`tasks.md` is the authoritative source for final scope** — its own header (line 12) correctly reads "shipped (client-only) — `EVL-T-1`/`EVL-T-2` reverted 2026-09-07, `EVL-T-3` is the sole deliverable," and its task list marks `EVL-T-1`/`EVL-T-2` with an explicit `[REVERTED]` tag rather than `[x]` or `[ ]`. Verified directly against the current repo: neither `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` nor `_isAcceptableEvidenceLink` exist in `results-validation-module.repository.ts`, and the new spec file for it does not exist.
- `execution.md` §5 also says "Commits + PR not yet created — Leader does not auto-commit per standing user instruction; awaiting explicit go-ahead" — this too is stale: `git log` confirms commit `4343f19b1` already landed on `qa-development-2026-ss` by the time this archive ran.
- This is the **second** time in this session's batch of archives that a spec's `execution.md` narrative diverged from what actually persisted in the codebase (the first being `bugfix/innovation-dev-p25-save-500`, superseded entirely by a teammate's independent fix). Unlike that case, this divergence is fully explained and intentional — a deliberate, user-driven scope reduction, not an uncoordinated collision — but it reinforces the same practical lesson: **verify `execution.md`'s final-state claims against the actual repository before trusting them**, especially in any spec whose folder contains a `Pivot Record` or `Scope Reduction` section. See the Kaizen entry for the standardization this produced.
