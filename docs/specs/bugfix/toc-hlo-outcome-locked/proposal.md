# Proposal — ToC HLO/Outcome selector appears "locked" in Contributors & Partners

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-hlo-outcome-locked` |
| Slug derivation | `toc-hlo-outcome-locked` — literal first token of the `/akili-quick` argument, reused as-is (already kebab-case, ≤4 words) |
| Type | **Bug** (reported: field becomes non-editable after a prior ToC selection) |
| Approval Mode | `gated` (default — no pre-approval mandate given) |
| Reporter | Angel Jarrin (per screenshot), via santiago.sanchez@cgiar.org |
| Reported on | Result `#28923`, phase 8, route `result/result-detail/28923/contributor-partners?phase=8` |
| Date | 2026-09-11 |

## 2. Intent

Understand why the "Level" / "High Level Output" (and Outcome/Output) selectors in the
Contributors & Partners section stop accepting changes once a value has been picked, and decide
whether that is a defect to fix or a known, intentional behavior that needs a different kind of fix
(discoverability, not code).

## 3. Problem / Current Behavior

On the screenshot (result 28923, phase 8), after "Can this result be mapped to a ToC KPI?" = Yes
and a High Level Output (`AOW01`) is already selected, the **Level** and **High Level Output**
fields render greyed out and cannot be changed — no dropdown opens, no clear/change affordance is
visible.

## 4. Bug Diagnosis (`systematic-debugging` — root cause confirmed, not guessed)

### Observed Symptom
"Level" and "High Level Output" (and, by the same code path, Intermediate/2030 Outcome and Output)
render read-only/disabled once both a level and a node are already selected. There is no visible
way in this section to pick a different HLO/Outcome/Output.

### Reproduction Steps
1. Open a **2026-phase** result's Contributors & Partners section that is already ToC-mapped
   (`toc_level_id` and `toc_result_id` both set) and **planned** (not "Unplanned").
2. Look at the "Level" select and the node select below it (HLO / Intermediate Outcome / 2030
   Outcome / Output, depending on level).
3. Both render disabled — confirmed exactly in the screenshot's grayed "AOW01" box.

### Root Cause (confirmed — not a defect)
`CPMultipleWPsContentComponent.tocAlignmentReadOnly` (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts:199`) returns `true` whenever:

- the phase year is 2026+ (`isCP2026()`), **and**
- the result is not "Unplanned", **and**
- the active tab already has both `toc_level_id` and `toc_result_id` filled.

The template (`multiple-wps-content.component.html:1-70`) binds this computed to `[readOnly]` /
`[disabled]` / `[editable]` on the "Level" select and on all three per-level node selects
(HLO/Output, Intermediate Outcome, 2030 Outcome) — every branch of the `@switch`, by design
(comment at `.ts:187-190`).

**This is a deliberate, documented product decision — P2-3235, agreed with the PO (Ángel) on
28-Aug-2026** (see the docstring at `.ts:179-198` and the client's own
`rd-contributors-and-partners/CLAUDE.md` "LCD..." history section). The reasoning recorded in code:

> The Results Framework module (AOW screens) already writes `toc_result_id` **and**
> `toc_level_id` at result creation time. Section 2 (Contributors & Partners) was becoming a
> **second writer** for the same link, which could silently diverge from the Results Framework's
> own record. The agreed fix was: reflect the Results Framework's choice here, **read-only**, and
> correct it in the module that owns it (Results Framework / AOW) instead.

A tab with **no** node yet stays editable (`.ts:196-197`) — the lock only engages once there is
something to protect. This is not a bug in the traditional sense: the code does exactly what a
prior ticket asked it to do.

### Impact & Scope
- Affects every 2026-phase, planned, ToC-mapped result's Contributors & Partners section — i.e.
  potentially many results, not just `#28923`.
- The actual gap is **discoverability**, not logic: nothing in Section 2 tells the reporter *where*
  to go to change the HLO/Outcome/Output if the Results Framework's mapping is wrong or needs to
  change for this phase. The screenshot's confusion ("no me deja cambiar") is the expected
  symptom of a correct lock with no signposting.

### Fix Strategy
This is not a case for `/akili-quick` (behavior, not cosmetic) nor for a blind code fix (the
current behavior is intentional, confirmed in code comments and prior product sign-off). Two real
options, requiring a product decision before implementation:

- **Option A (recommended) — Add a discoverability affordance, keep the lock.** When
  `tocAlignmentReadOnly()` is true, show a short inline note next to the locked fields
  ("This mapping is set in the Results Framework module — go there to change it", linking to the
  matching `result-framework-reporting/entity-details/:entityId/aow/:aowId` screen for this
  result's initiative). Preserves the single-writer guarantee P2-3235 was written for; only adds a
  way out. Small, local (one component + template), no data/contract change → `/akili-specify`
  (Lite) is still recommended over `/akili-quick` because it touches read-only/behavioral computed
  logic (the note's visibility mirrors `tocAlignmentReadOnly()`), but it is low-risk.
- **Option B — Revert P2-3235, make it editable again here.** Reintroduces the double-writer risk
  the original ticket was raised to close (Section 2 and Results Framework could disagree on the
  same result). Not recommended without an explicit PO decision to accept that risk again.

## 5. Proposed Outcome

Reporters who need to change an already-mapped HLO/Outcome/Output are not blocked or confused —
either they can see clearly why the field is locked and where to go instead (Option A), or the
product explicitly decides to reopen edits here (Option B).

## 6. Scope

- `rd-contributors-and-partners` → `components/multiple-wps/components/multiple-wps-content/` only.
- No change to `tocAlignmentReadOnly()`'s locking condition under Option A.

## 7. Non-Goals

- Not re-litigating the Results Framework / Section 2 single-writer architecture.
- Not touching the Level/node selects' data contract or the PATCH payload.

## 8. Affected Users, Systems, And Specs

- P25 reporters on 2026-phase, planned, ToC-mapped results.
- Related history: `docs/specs` history in `rd-contributors-and-partners/CLAUDE.md` (P2-3235 section).
- Related module: `result-framework-reporting` (Results Framework / AOW), which owns the writable
  side of this mapping.

## 9. Visual Reference

- Source: None (bug report), plus the user's screenshot of result 28923 (Contributors & Partners,
  Level/HLO fields grayed out).
- Location: n/a (screenshot only, not persisted as a file).
- Notes: no new visual design needed for Option A — reuses existing `app-alert-status` / inline note
  patterns already used elsewhere in this file (e.g. `contributingScienceInfoNote`).

## 10. Approach Options

See **Fix Strategy** above (Option A recommended, Option B requires explicit re-approval of the
double-writer risk).

## 11. Recommended Approach

**Option B — decided by the user (santiago.sanchez@cgiar.org) on 2026-09-11, explicit override of
P2-3235's lock:** "Lo único que necesito es que ese campo puede seguir siendo un dropdown editable,
no más." The Level and HLO/Outcome/Output selects in Contributors & Partners go back to being
always-editable (subject to the existing `editable`/read-only-role gating that applies to every
other field in this section) — `tocAlignmentReadOnly()` stops gating `[readOnly]`/`[disabled]`/
`[editable]` on these controls.

🛑 **This knowingly reopens the double-writer risk P2-3235 was written to close** (Section 2 and
the Results Framework/AOW module can again independently set `toc_level_id`/`toc_result_id` for the
same result and disagree). The user was told this trade-off before choosing; recorded here so
`/akili-specify` inherits the decision without re-litigating it. `/akili-specify` should still
scope the actual code change precisely (which computed/bindings to remove, whether
`tocAlignmentReadOnly()` itself becomes dead code or is kept for a future re-enable) and add a
regression test asserting the fields are editable in the exact state that used to lock them
(2026 phase, planned, both `toc_level_id` and `toc_result_id` already set).

## 12. Risks, Dependencies, And Open Questions

- **Open question (needs PO confirmation):** should the note link directly to the specific AOW
  entity (`result-framework-reporting/entity-details/:entityId/aow/:aowId`) for this result's
  initiative, or just describe where to go in words? Depends on whether the current user's role has
  access to that module/initiative.
- **Open question:** is Angel (the reporter) actually trying to *correct a wrong mapping*, or does
  he just not know this is by design? The answer changes whether Option A is sufficient or whether
  the Results Framework's own mapping needs re-checking for result 28923 first.
- Depends on: none (self-contained client change).
- Parallel-safe: yes.

## 13. Success Criteria

- A user hitting the locked state understands why, and knows the exact next step to take.
- No regression to the P2-3235 single-writer guarantee.

## 14. Next Step

```text
/akili-specify bugfix/toc-hlo-outcome-locked
```

in **Bug Mode**, once the PO confirms Option A (or explicitly picks Option B).
