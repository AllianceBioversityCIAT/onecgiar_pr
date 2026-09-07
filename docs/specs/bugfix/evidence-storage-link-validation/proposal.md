# Proposal: Server-side rejection of file-storage evidence links

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/evidence-storage-link-validation` |
| Slug derivation | Argument was a Jira URL (`https://cgiarmel.atlassian.net/browse/P2-3345`), not a slug — resolved via Jira MCP to ticket P2-3345 and derived a kebab-case slug from its summary. |
| Ticket | [P2-3345](https://cgiarmel.atlassian.net/browse/P2-3345) — "Evidence section is marked complete even when its only evidence has a link the tool does not accept" |
| Type | **Bug** |
| Priority | High (per Jira) |
| Approval Mode | `gated` (default) |
| Author | AKILI Propose (auto), on behalf of the requesting user |
| Date | 2026-09-07 |

## 2. Intent

Make the server evidence-link validator agree with what the UI already tells the user: links to SharePoint, OneDrive, Google Drive, and Dropbox are not acceptable evidence, so the Evidence section's "complete" state and the submission gate should not pass on one of those links.

## 3. Problem / Current Behavior

`resultValidationRepository.validateResultById` (and its per-section helper) validate an evidence link with a **generic well-formed-URL regex**:

```ts
// onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.ts:27-29
private _regex = new RegExp(
  /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/\S*)?$/i,
);
```

used at line 866 (`multiplePerField = allEvidences.some((e) => e.link && this._regex.test(e.link.trim()))`) and elsewhere in the same file to decide whether the Evidence section passes. This regex has no notion of forbidden file-storage domains, so a SharePoint/OneDrive/Google Drive/Dropbox link passes it just like any other public link.

Meanwhile the client already states the rule and already has a working detector:

- Rule text shown to the user: `rd-evidences.component.ts:75` — *"Links to SharePoint, One Drive, Google Drive, DropBox and other file storage platforms are not allowed."*
- Working client-side pattern (used for **file-upload** evidence classification, not for blocking manually-typed links in the Evidence section list validity): `rd-evidences.component.ts:476` and `evidence-item.component.ts:109`:

  ```ts
  /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i
  ```

Net effect: a result whose only evidence is e.g. a `cgiar.sharepoint.com` document link gets a green check on Evidence in the left menu and can be submitted, even though the stated rule says it shouldn't be usable evidence at all.

**Confirmed root cause:** the server's evidence-section validity check tests only "is this a well-formed URL," never "is this URL on a disallowed file-storage host." The UI-stated rule exists only in the browser; nothing on the server enforces it, so the green check and the submission gate both disagree with the rule shown to the user.

## 4. Proposed Outcome

The Evidence section only reports "valid"/green-check when its evidence links (added or edited from now on — see §9 Fix Strategy) are not SharePoint/OneDrive/Google Drive/Dropbox links, matching what the UI already tells the user. The submission gate agrees with the green check (same source of truth).

## 5. Scope

- `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.ts` — extend/replace the link-acceptability check used to compute Evidence section validity (the `_regex` test at line 27 and its usage at line 866, plus any other evidence-link validity check in this file) to also reject the forbidden file-storage hosts.
- No client change in scope — the client-side copy and detector (`rd-evidences.component.ts`, `evidence-item.component.ts`) already state and detect the rule correctly for file-upload classification; this bug is server-only.

## 6. Non-Goals

- Not retroactively invalidating evidence already saved before this fix ships (see §9 — confirmed with the user: apply only to evidence added or edited from now on).
- Not changing the client-side messaging, the client-side file-vs-link classification regex, or the SharePoint upload flow.
- Not building a general "URL category" service — a targeted denylist check is sufficient for this ticket.

## 7. Affected Users, Systems, And Specs

- **Systems:** `onecgiar-pr-server` → `api/results/results-validation-module` (Evidence section validity + submission gate for all typed results).
- **Users:** Any user creating/editing evidence on a result still in `Editing` status.
- **Related specs:** none found under `docs/specs/results/` for this module yet — this will be the first.
- **Related ticket:** P2-3321 (Other Output flow validation, where this was originally found on result 8842).

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend-only fix; no UI surface changes. The UI copy already states the rule correctly.

## 9. Bug Diagnosis

### Observed Symptom

A result whose only evidence is a link to a disallowed file-storage platform (SharePoint, OneDrive, Google Drive, Dropbox) still shows a green check on the Evidence section in the left menu, and the result can be submitted — even though the section's own guidance text says those links aren't allowed.

### Reproduction Steps

1. Open a result in portfolio P25, phase Reporting 2026, status `Editing`, and go to Evidence.
2. Add one piece of evidence and paste a SharePoint link (e.g. a `cgiar.sharepoint.com` document link).
3. Save, then check the Evidence section indicator in the left menu.
4. Observed: green check (section reported valid). Expected: section should not be marked complete while its only evidence is an unusable link.

### Root Cause (confirmed)

`results-validation-module.repository.ts:27` defines a generic well-formed-URL regex with no denylist for file-storage hosts; it's applied at line 866 (and reachable from the same section-validity computation used across result types) to decide evidence-section validity. Verified against the exact pattern: a SharePoint link, a Google Drive link, and a plain public link are all accepted. The UI's stated rule (SharePoint/OneDrive/Google Drive/Dropbox not allowed) is therefore enforced only in the browser copy, never on the server that computes the green check and gates submission.

### Impact & Scope

- Affects the Evidence section validity computation for **every result type**, since `results-validation-module.repository.ts` is the shared validator (all callers of `validateResultById` / the per-section evidence check).
- Also affects the submission gate: because the same check marks the section valid, nothing currently stops a result whose only evidence is an unusable link from being submitted.
- Existing data: some already-reported results may currently carry file-storage-platform evidence links and are, under the current server rule, "valid." Per user decision (§ below), the fix does not retroactively flip those to invalid.

### Fix Strategy

**Decision (confirmed with the user):** apply the new rule only to evidence added or edited from now on. Evidence already saved before the fix ships keeps its current valid status — no currently-valid result becomes invalid retroactively.

Smallest safe correction: extend the evidence-link acceptability check in `results-validation-module.repository.ts` to also reject the known file-storage hosts (SharePoint, OneDrive, Google Drive, Dropbox), reusing the same host list the client already uses (`drive.google.com`, `docs.google.com`, `onedrive.live.com`, `1drv.ms`, `dropbox.com`, `*.sharepoint.com`) so client and server agree on exactly what's disallowed. Because the "new/edited only" scoping can't be expressed as a pure link-format check (format checks don't know evidence history), the design phase needs to work out where that scoping hooks in — e.g. bypassing the new host check for evidence rows whose `created_date`/`last_updated_date` predate the fix's rollout, or another mechanism `/akili-specify` should evaluate against how evidence create/update timestamps are actually tracked.

This has logic and a data-scoping decision, not a copy-only tweak — routes to `/akili-specify bugfix/evidence-storage-link-validation` in **Bug Mode**, which requires a regression test (red before the fix: SharePoint link accepted; green after: SharePoint link rejected, plain link still accepted, pre-existing evidence unaffected).

## 10. Approach Options

**Option A — Denylist check on the same regex-based validator (Recommended).** Add a host-denylist test (shared list with the client) inside `results-validation-module.repository.ts`, applied wherever the current `_regex` test gates evidence-section validity. Smallest, most localized change; keeps validation logic where it already lives.

- *Trade-off:* the "new/edited only" scoping still needs a place to hook in (see Fix Strategy); this option doesn't solve that by itself, but it's the natural home for it.

**Option B — Move link-format + host validation into a shared utility used by both DTO-level `class-validator` and the section validator.** Cleaner long-term (single source of truth for "is this an acceptable evidence link"), but touches more surface (DTO validation, possibly the evidence create/update path) for a bug whose reported symptom is specifically the green-check/submission-gate mismatch.

- *Trade-off:* larger blast radius than the ticket asks for; better suited to a follow-up hardening ticket if DTO-level validation is later found to have the same gap.

**Recommendation:** Option A. It directly targets the confirmed root cause (the section-validity check, not evidence creation itself), matches the ticket's own diagnosis pointing at this exact file/lines, and keeps the change reviewable and small.

## 11. Recommended Approach

Option A: extend the evidence-link check in `results-validation-module.repository.ts` with a file-storage host denylist (shared list with the client's existing regex), scoped to evidence added/edited after the fix ships. Full requirements/design/tasks — including exactly how the "new/edited only" scoping is implemented — go through `/akili-specify` in Bug Mode.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** if the "new/edited only" scoping is implemented incorrectly (e.g. keyed off the wrong timestamp), it could either retroactively invalidate old evidence (violating the confirmed decision) or fail to catch edits to old evidence rows. `/akili-specify` must nail this down as an explicit design decision with a scenario-level test.
- **Dependency:** none outside this file — the host list can be inlined or shared via a new constant; no migration expected since this is validation logic, not schema.
- **Open question (non-blocking):** should the denylist constant be centralized somewhere both client and server can reference (to prevent future drift between the two lists), or is duplicating it acceptable for now? Recommend duplicating for this fix and noting it as a small tech-debt item — not blocking.

## 13. Success Criteria

- A result whose only evidence (added/edited after the fix ships) is a SharePoint/OneDrive/Google Drive/Dropbox link no longer shows a green check on Evidence and cannot be submitted on that basis alone.
- A result whose evidence is a plain, non-file-storage link continues to validate exactly as before (no regression).
- Evidence rows that existed before the fix shipped keep their current validity status (not retroactively flipped).
- A regression test exists that is red before the fix (SharePoint link wrongly accepted) and green after.

## 14. Next Step

```text
/akili-specify bugfix/evidence-storage-link-validation
```

Bug Mode: convert the confirmed root cause above into a fix plan and a mandatory regression test.
