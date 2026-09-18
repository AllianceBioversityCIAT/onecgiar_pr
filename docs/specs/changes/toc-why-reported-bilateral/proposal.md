# Proposal — Hide "Why Is This Result Being Reported?" When The Bilateral ToC Answer Is "No"

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/toc-why-reported-bilateral` |
| **Slug** | `toc-why-reported-bilateral` — given as a bare kebab-case name, resolved to `changes/<name>` per the command's path rule (precedent: `changes/bilateral-review-visual-polish`, `changes/multi-hlo-result-linking`) |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-09-18 |
| **Requester** | Verbal PO decision — **no Jira ticket yet** (see OQ-1) |
| **Depends on** | none |
| **Parallel-safe** | yes |
| **Escalated from** | `/akili-quick` (2026-09-18) — failed the triviality gate on *no behavior change* and *no data/contract change* |

## 2. Intent

In the bilateral result form, answering **"No"** to *"Can this result be mapped to a ToC KPI?"* should no longer ask the reporter for a written justification. The **"Why is this result being reported?"** textarea disappears from the bilateral flow; the Yes/No answer alone is enough.

Observed on `/bilateral/AfricaRice/result/9460?phase=36` → section **Contributors & partners**.

## 3. Problem / Current Behavior

The textarea is not a glitch — it is deliberate, mirrored from the non-bilateral form. What changes here is the product decision, not a defect.

| Aspect | Today (confirmed in code, 2026-09-18) |
|---|---|
| Visibility gate | `section-toc.component.ts:93` — `showWhyReported = !paWillCompleteTocMapping() && isPlanned() === false` |
| Rendering | `section-toc.component.html:33-45` — `@if (showWhyReported())` → `<app-pr-textarea label="Why is this result being reported?" [required]="true" [maxWords]="30">` |
| Input handling | `section-toc.component.ts:585-588` — `onWhyReportedInput()` + 1.5 s debounce → `saveTocDebounced()` |
| Payload | `section-toc.component.ts:448-449` — `toc_progressive_narrative: (isPlanned() === false ? whyReported() : narrative()) \|\| undefined` — **one column backs both textareas** |
| Hydration | `section-toc.component.ts:279-280` and `:320-327` — on load, `toc_progressive_narrative` goes to `whyReported` when `planned_result === false`, to `narrative` otherwise |
| Checklist | `section-toc.component.ts:617-625` — publishes the MDS item `toc-why-reported`, **`optional: true`** |
| Test coverage | `section-toc.component.spec.ts:694+` (unplanned justification block), `:914` (question label) |

**Why it exists:** the classic W1/W2 form states the rule verbatim — `rd-contributors-and-partners.component.ts:465`: *"If **No**, please provide a short justification explaining why this result is being reported outside the 2026 ToC KPI. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program's 2027 ToC."* Bilateral mirrors that wording on purpose (P2-3142), and `docs/specs/bilateral/toc-default-linkage/proposal.md:26` records the same contract (`No -> required "Why is this result being reported?" text`).

So this proposal is a **deliberate divergence** between the bilateral form and the classic one, approved verbally by the PO.

## 4. Proposed Outcome

- A bilateral reporter answers **"No"** and sees **nothing else** below the question — no textarea, no required asterisk, no validation friction.
- Answering **"Yes"** is completely unchanged (level → node → indicator → contribution → pathway narrative).
- The `I'm not sure, the P/A will complete the ToC mapping` checkbox is unchanged.
- **Justifications already stored stay stored.** Nothing is deleted, nulled, or migrated.

## 5. Scope

- `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/section-toc.component.html` — remove the `@if (showWhyReported())` block.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/section-toc.component.ts` — retire the `showWhyReported` gate, the `onWhyReportedInput` handler, its debounce timer, and the `toc-why-reported` MDS item; **keep** the `whyReported` signal and its hydration (see DD-1).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/section-toc.component.spec.ts` — update the specs that currently assert the opposite.
- Local CLAUDE.md note in `section-contributors/` if it documents the removed question.

## 6. Non-Goals

- **The classic W1/W2 form is untouched.** `rd-contributors-and-partners` keeps asking for the justification and keeps its info text at `:465`.
- No server change. No DTO change. No migration. No change to the `validation_*` green-check procedures.
- No deletion or cleanup of historical `toc_progressive_narrative` values.
- No change to the "Yes" branch, to the project-default linkage flow (`app-section-toc-default`), or to the P/A defer checkbox.

## 7. Affected Users, Systems, And Specs

| Surface | Impact |
|---|---|
| Bilateral reporters (centre users) | One less required field when a result is not ToC-mappable — the motivating outcome |
| Program / Accelerator teams | **Lose the adaptive-management input** the classic form promises for no-mapped results (bilateral only) |
| AI quality assessment | `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/contributors-and-partners.mapper.ts:190` feeds `toc_progressive_narrative` into the QA payload as `contribution`. New unplanned bilateral results arrive with it empty. (`why_reported` in that same mapper is already hardcoded `null`.) |
| Submit gate | **None.** `submitForReview` asks only for a lead centre the caller belongs to plus an assigned Science Program, and every `toc` MDS item is `optional: true` since the PO decision of 2026-09-09 — so `canSubmitFromRail` never counted this field |
| Green checks (P25) | **None on this path.** `1762528725798-createValidtionP25.ts:136,321` requires `valid_text(toc_progressive_narrative)` only alongside `toc_result_id IS NOT NULL` — i.e. the planned branch. Verify against the live procedure, not the migration (see OQ-2) |
| Related specs | `docs/specs/bilateral/toc-default-linkage/` — its requirements (`:145`), design (`:156`) and tasks (`:130`) all reference the legacy unplanned "why reported" fallback and must be read before editing |

## 8. Visual Reference

- **Source:** None — this is a field removal with no new UI.
- **Location:** n/a. The "after" state is the existing screen minus the `@if (showWhyReported())` block (`section-toc.component.html:33-45`).
- **Notes:** no mockup requested or needed; no new design token is introduced.

## 9. Requirement Delta Preview

### ADDED Requirements

- *(none — this change only removes a surface)*

### MODIFIED Requirements

- **Bilateral "No" branch renders no follow-up field.** Selecting "No" persists `planned_result = false` and stops there.
- **The bilateral ToC autosave payload never carries a justification.** `toc_progressive_narrative` is only sent on the planned branch (from `narrative`). On the unplanned branch the key is sent **unchanged from what was loaded**, so the stored value is re-affirmed rather than lost (DD-1).
- **Section checklist loses the `toc-why-reported` item** when the answer is "No". Completeness arithmetic is unaffected — the item was `optional: true`.

### REMOVED Requirements

- The required 30-word justification for an unplanned bilateral result (`[required]="true"`, `[maxWords]="30"`).
- `section-toc.component.spec.ts` assertions that the textarea appears and is required on "No".

## 10. Approach Options

### DD-1 — What the client sends for `toc_progressive_narrative` once the field is hidden

This is the only real decision, and it is **not** cosmetic. The bilateral "No" save path is:

`bilateral-center.service.ts:1105 saveTocMapping` → `:1294 updateTocResultPartial` → `results-toc-results.service.ts:2528 _handleUnplannedResult` → (no `result_toc_results` array) → `:2674 _handleUnplannedSpecialCase`

…and `_handleUnplannedSpecialCase` **deactivates every active row and inserts a brand-new one** with `toc_progressive_narrative: resultTocResult.toc_progressive_narrative ?? null` (`:2697-2699`). 

⚠️ **Omitting the key does not mean "don't touch" on this path.** The usual bilateral discipline (omitted key = preserve) does not hold here, because the row is re-inserted, not updated. The previous text survives only on the now-inactive row, which neither `getTocState` (`bilateral-center.service.ts:1026` reads `firstActive`) nor the QA mapper will ever read again.

| Option | Mechanics | Trade-off |
|---|---|---|
| **A — Keep the value, stop showing it** (recommended) | Hide the textarea; keep the `whyReported` signal, keep hydrating it from the GET, and keep sending it in the autosave payload | Client-only, ~15 LOC net removal, **zero data loss**, zero server change. Cost: a value the user can no longer see keeps riding the payload — must be commented so it does not look like dead code |
| **B — Hide it and stop sending it** | Delete the signal and drop the key from the payload | Smallest diff, but the **next autosave of any existing unplanned result silently nulls its stored justification** — directly contradicts the "conserve" decision. Rejected |
| **C — Make the server preserve it** | Carry the previous active row's narrative forward inside `_handleUnplannedSpecialCase` | Correct in principle, but that method is **shared with the classic W1/W2 v2 write path** — a behavior change with a blast radius far beyond bilateral, for a UI-only requirement. Rejected |

## 11. Recommended Approach

**Option A.** It is the smallest change that satisfies both halves of the request — the reporter stops seeing the question, and no stored justification is destroyed — while staying entirely inside one Angular component. It also keeps the door open: if the PO reverses the decision, restoring the textarea is a template-only edit, because the data never left.

Route: **`/akili-specify` in Lite depth**, with a regression test that pins both halves (the field is gone on "No"; a hydrated justification still round-trips through the autosave payload untouched).

## 12. Risks, Dependencies, And Open Questions

| # | Item | Severity | Handling |
|---|---|---|---|
| R-1 | Silent data loss on existing unplanned results if Option B is taken by mistake | **High** | Regression test asserting the payload still carries the hydrated value; DD-1 documented in `design.md` |
| R-2 | Program teams lose the adaptive-management input for bilateral no-mapped results | Medium | Product decision already taken; flagged here so it is on the record, not discovered later |
| R-3 | Bilateral and classic W1/W2 now behave differently for the same question wording (P2-3142 lineage) | Medium | Explicit non-goal; worth a line in the release note so QA does not report it as a bug on the classic side |
| R-4 | A hidden-but-still-sent field reads as dead code to the next maintainer | Low | Mandatory inline comment citing `_handleUnplannedSpecialCase` re-insert behavior |
| OQ-1 | **No Jira ticket backs this yet.** The PO decision is verbal | — | Create the ticket before `/akili-execute` so the commit's `[SPEC:…]` has a traceable requester |
| OQ-2 | The repo's `validation_*` migrations are known to lag the deployed procedures | — | Before closing, confirm with `SHOW CREATE FUNCTION` on the target environment that no live green-check reads `toc_progressive_narrative` on the unplanned branch |
| OQ-3 | Should the answer "No" show any replacement affordance (e.g. an info note explaining what happens next)? | — | Assumed **no** — the question simply ends. Confirm with the PO during `/akili-specify` |

## 13. Success Criteria

1. On a bilateral result in the Contributors & partners section, answering **"No"** renders no *"Why is this result being reported?"* textarea and no required-field marker.
2. Answering **"Yes"**, and the P/A defer checkbox, behave exactly as before (level, node, indicator, contribution, pathway narrative).
3. A result that already had a saved justification still has the identical `toc_progressive_narrative` value in its active `results_toc_result` row after being reopened, edited elsewhere, and autosaved.
4. Section completeness and the Submit-for-review gate are unchanged.
5. `npx jest --testPathPattern="section-toc"` and `npx ng lint --quiet` pass; no test still asserts the removed field.
6. The classic W1/W2 form is byte-for-byte unchanged.

## 14. Next Step

```text
/akili-specify docs/specs/changes/toc-why-reported-bilateral
```

Lite depth, Change track. The spec must carry DD-1 into `design.md` and turn success criterion 3 into an explicit regression test.
