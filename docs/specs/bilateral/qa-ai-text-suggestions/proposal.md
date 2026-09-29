# Proposal — QA AI: edit Title/Description in the verdict drawer, with optional AI suggestions (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/qa-ai-text-suggestions/` |
| Slug | `qa-ai-text-suggestions`, derived from the free-text argument ("hacer los ajustes a nivel del drawer … sugerir un title y una description … acotado a eso … esos dos suggest como opcionales"). It sits under `bilateral/` per the domain-module taxonomy, following `bilateral/qa-ai-traffic-light` and `bilateral/qa-ai-verdict-drawer`. |
| Type | **Change** |
| Approval Mode | **gated** (default) |
| Status | **approved** 2026-09-29. OQ-1 Check again · OQ-2 no edit on green · OQ-3 out · OQ-4 sub-task under P2-3150 |
| Owner | Juan David Delgado |
| Date | 2026-09-29 |
| Trigger | Email from Nicoleta Trifa (2026-09-29). Users go back and forth between the reporting form and the AI comments. She asks for the AI to suggest a better title/description when those are amber/red, and cites Daniel's Bulk Uploader drawer as the model. |
| Ticket(s) | None yet. Natural home: a sub-task under [P2-3150](https://cgiarmel.atlassian.net/browse/P2-3150) (*QA AI: Result Quality Assessment on Submission*), epic [P2-3482](https://cgiarmel.atlassian.net/browse/P2-3482). Confirm before `/akili-specify`. |
| Baseline | `docs/prd.md` US-S1/US-S4 (the submitter iterates before submitting), AC-4 (additive contracts), AC-9 · `docs/ux-ui/design.md` §6 (*drawers for stateful side-by-side review/edit*), §7 tokens + DD-12, §8, §10 a11y · `docs/trd/trd.md` W1, W8 (no payload bodies in logs) |
| Related specs | **`bilateral/qa-ai-traffic-light`** (owns the flow, contract v0.2, `BIL-QAI-R-6` freshness) · **`bilateral/qa-ai-verdict-drawer`** (owns the drawer; this amends its `BIL-QAD-R-8` exclusion for two fields only) · `changes/ai-review-save-flow` (W1/W2 AI Review: the *proposal → apply → editable field → save* pattern reused here) |
| Depends on | none in-repo. The suggestion half is **inert until the AI team ships it**, by design. |
| Parallel-safe | **no**. It touches the same drawer component and the same AI client as the two related specs. Run it after both are closed (both are). |

---

## 1. Intent

Let the Centre user fix **Title** and **Description** from inside the QA verdict drawer, next to the AI's feedback, without leaving it. When the AI returns a suggested title or description, show it with an **Apply** action. The AI fields are **optional**: the feature ships and is useful before the AI team has the time to produce suggestions.

## 2. Problem / Current Behavior

- The drawer only reads. Per section it shows `comments`, `issues` and `strengths` (`onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/bilateral-quality-assessment-dialog.component.html:96,133-142`). Its only way back to the form is **Make adjustments**, which closes it (`…component.html:168`).
- The per-field suggest/accept controls were **excluded on purpose** when the modal became a drawer (`docs/specs/bilateral/qa-ai-verdict-drawer/requirements.md:201-205`, `BIL-QAD-R-8`). The reference image that exclusion refers to is `docs/specs/bilateral/qa-ai-verdict-drawer/mockup/reference-ai-review-drawer.png`.
- The AI contract v0.2 returns no proposed text. A section is `{verdict, score?, comments, strengths[], issues[]}` plus the optional `fields[]` annotation (`onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-rules.ts:26-43`; `docs/bilateral-module/integration-contracts.md` §Response).
- **Latent gap:** unknown keys inside a section already reach the database unsanitized. `sanitizeScores` spreads `...rest` from each section (`bilateral-quality-assessment.client.ts:433-438`), and `sections` is a `json` column (`entities/bilateral-quality-assessment.entity.ts:132-135`). If the AI sent a `suggestions` key today, it would be persisted raw, with no type, length or URL check.
- Saving the title/description changes the content hash. A later **Submit anyway** with the old assessment is then rejected as stale (`bilateral-center.service.ts:2302-2305`: *"The quality assessment is stale. Run it again after changing the result."*), in line with `BIL-QAI-R-6`.
- The W1/W2 AI Review already has this interaction: proposal, *Apply proposal*, an editable field and *Save changes* (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.html:24-75`). Bilateral title/description are saved through `PATCH api/results/bilateral/general-info/:resultId` (`bilateral-api.service.ts:103-104`), with `title`/`description` optional strings (`update-bilateral-general-info.dto.ts`). The form caps them at 30 and 300 words (`section-general-info.component.html:24,38`).

## 3. Proposed Outcome

1. In the drawer, the **General information** card shows the title and description as editable fields, each with **Save** (word limits as in the form). The card shows them only when the section verdict is **amber or red**. Green and grey stay read-only, as today.
2. When the assessment carries a suggestion for one of them, an **AI suggestion** block appears above that field with **Apply**. Apply copies the text into the field. The user may adjust it, then Save. **No suggestion → no block**, and the field is still editable.
3. After a save the verdict is **outdated**. The drawer says so and offers **Check again**. **Submit anyway** requires a current check, so `BIL-QAI-R-6` is untouched.
4. The contract gains **two optional response keys**. PRMS validates and sanitizes them, and **never** marks a response malformed because they are absent or bad.

## 4. Scope

- Client: the drawer's General information card (edit, apply, save, outdated state, check again). It reuses the existing `PATCH_generalInfo` endpoint and the existing assessment run.
- Server: validate and sanitize the two optional keys in the AI client. Persist them inside the existing `sections` JSON. Serve them on the existing assessment read. **No migration, no new endpoint.**
- Close the latent gap: unknown section keys are dropped, not persisted.
- Docs: define the keys in `docs/bilateral-module/integration-contracts.md` §Quality assessment, with a change-log row, and write a short hand-off note for the AI team (§12).

## 5. Non-Goals

- **Any field other than Title and Description.** No short title, no ToC, no partners, no evidence, no type-specific fields (owner decision, 2026-09-29).
- Making the AI produce the suggestions. That is the AI team's work, and it is unscheduled.
- Suggestions for green or grey sections.
- The reference drawer's other features: the *N of N reviewed* counter, *Re-run review* per field, *Keep my version*, *Finish review*.
- A W1/W2-style tracking table (`result_field_revision`, AI events). See OQ-3.
- Changing the request payload or `contract_version`.
- Knowledge Products: KP titles/descriptions come from CGSpace and the AI never sees a KP (`BIL-QAI-R-9`).

## 6. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Centre reporters (bilateral form) | Can fix title/description inside the drawer and optionally take the AI's text |
| AI QA service team (Daniela) | Receives the hand-off note; nothing breaks if they never implement it |
| Program reviewers | None directly. The stored assessment gains two optional texts |
| `bilateral-quality-assessment.client.ts` | Validate/sanitize the new keys; drop unknown section keys |
| `bilateral-quality-rules.ts` (`QualitySectionResult`) | The type gains the optional `suggestions` |
| `bilateral-quality-assessment-dialog` component + `bilateral-quality-assessment-ui.service.ts` | Edit/apply/save/outdated/check-again |
| `docs/bilateral-module/integration-contracts.md` | Contract copy + change log |
| Specs `qa-ai-traffic-light`, `qa-ai-verdict-drawer` | Amended by reference: `BIL-QAD-R-8` narrowed for two fields |

## 7. Visual Reference

- Source: reference image already in the repo, plus the existing W1/W2 AI Review modal as the interaction model.
- Location: `docs/specs/bilateral/qa-ai-verdict-drawer/mockup/reference-ai-review-drawer.png` · `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.html`
- Notes: only the *AI suggestion → Apply → Your version → Save* sub-block of the reference is adopted, and only inside the General information card. A generated mockup of the card (Stitch / Claude Design) can be produced before `/akili-specify` if wanted; not generated yet.

## 8. Requirement Delta Preview

### ADDED

- The drawer's General information card lets the user edit and save Title and Description when that section is amber or red.
- When present and valid, `sections.general_information.suggestions.title` / `.description` render as an AI suggestion with **Apply**.
- After a save from the drawer, the verdict shows as outdated and **Check again** runs a fresh assessment.
- Server validation of the two optional keys (§12). Invalid keys are dropped, and a count of dropped keys is logged, never their text.

### MODIFIED

- `BIL-QAD-R-8`: the ban on per-field suggestion/accept controls is lifted **for Title and Description in General information only**.
- The AI client drops unknown keys inside a section instead of persisting them.

### REMOVED

- Nothing.

## 9. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Edit in drawer + optional suggestions (recommended)** | §3 as written | Delivers Nicoleta's ask 1 now and ask 2 whenever the AI is ready. One contract addition, no migration |
| B. Suggestions only, still edit in the form | Show the suggested text with *Copy*; the user pastes it in the form | Smallest diff, but it keeps the back-and-forth that is the actual complaint, and does nothing until the AI ships |
| C. Wait for the AI team, then do both | Nothing now | No throwaway risk, but nothing ships, and the edit half never needed the AI |

**Recommended: A.** Editing in the drawer needs nothing from the AI. The suggestion half is additive and optional, so it costs one render branch and one validator, and it switches on without a PRMS release when the AI starts sending it.

## 10. Recommended Approach

1. **Contract (§12):** one optional object `suggestions` under `sections.general_information`, holding `title` and `description`. It is additive and optional both ways, so per the bump procedure (`integration-contracts.md` §Contract version bump procedure: *"a purely additive field … may ship without a bump"*) `contract_version` stays `0.2`. Add a change-log row.
2. **Server:** in `sanitizeScores`, rebuild each section from an explicit key list (`verdict, score, comments, strengths, issues, fields`, plus `suggestions` for `general_information` only) instead of `...rest`. Normalize `suggestions` the way `fields` is normalized: clean away, never reject.
3. **Client:** extend the General information card. Reuse `PATCH_generalInfo`, the form's word limits and the W1/W2 apply/save pattern. On save, set an `outdated` flag in the UI service. The footer then offers **Check again**, which calls the existing `POST quality-assessment/:resultId`, and disables **Submit anyway** until the check is current.
4. **Hand-off:** send §12 to the AI team as the spec for their side, with the explicit note that PRMS already tolerates its absence.

## 11. Risks, Dependencies, And Open Questions

| # | Item | Note |
|---|---|---|
| R-1 | **Check again costs another AI call** (up to `BILATERAL_AI_QUALITY_TIMEOUT_MS`, 60 s default) | This is the price of keeping `BIL-QAI-R-6`. The alternative (let a stale verdict submit) is OQ-1 |
| R-2 | Tightening `sanitizeScores` to an allow-list could drop a key the AI already sends and someone relies on | Today only `fields` is known beyond the base keys (`bilateral-quality-rules.ts:32-42`). `UNVERIFIED — confirm at source before relying on it`: check a few stored `sections` rows in prtest for other keys before `/akili-specify` |
| R-3 | AI suggestion over the word limit | Dropped server-side (§12). Never truncated: a cut title reads worse than none |
| R-4 | Autosave collision: the form behind the drawer autosaves general info (`bilateral-auto-save.service.ts:488`) | The drawer save must refresh the form's title/description, or the next form autosave rewrites the old text. Design must settle the refresh path |
| R-5 | Suggestion is the AI's text: prompt-injection/markup | Rendered as plain text only (like `degraded_reason`); URLs are allowed in prose, but no HTML/markdown rendering |
| OQ-1 | After a drawer save, should **Submit anyway** re-check silently or require **Check again**? | Recommended: explicit **Check again** (visible, and the user sees whether the change fixed the colour) |
| OQ-2 | Also allow editing when General information is **green**? | Recommended: no, to keep the card's purpose clear. The form is one click away |
| OQ-3 | Record whether the saved text came from the AI (`was_ai_suggested`)? | Out of scope unless the owner wants the metric. It would need a column or a revision table, so it is not additive to this spec |
| OQ-4 | Ticket: sub-task under P2-3150, or new under P2-3482? | Confirm before specify |

## 12. Contract addition, for the AI team

**Where:** response only, inside `sections.general_information`. **Request unchanged. `contract_version` stays `"0.2"`.**

```json
"general_information": {
  "verdict": "amber",
  "score": 58,
  "comments": "…",
  "strengths": [],
  "issues": ["The title does not say what changed or for whom."],
  "fields": ["title"],
  "suggestions": {
    "title": "Improved rice variety adopted by 12,000 smallholder farmers in Côte d'Ivoire",
    "description": null
  }
}
```

| Key | Type | Required | Rule |
|---|---|---|---|
| `suggestions` | object \| null | **no** | Omit, `null` or `{}` all mean "no suggestion". Only read when the section `verdict` is `amber` or `red`; ignored on `green`/`grey` |
| `suggestions.title` | string \| null | **no** | Full replacement title, not a diff or a comment. Plain text, one line, **≤ 30 words**, English, no markdown/HTML, no surrounding quotes |
| `suggestions.description` | string \| null | **no** | Full replacement description. Plain text, **≤ 300 words**, paragraphs separated by `\n`, no markdown/HTML |

What PRMS does with them:

- **Never fails the response because of them.** An absent key, a wrong type, an empty/whitespace string, text over the word limit, or text identical to the current value all drop **that suggestion only**. The verdict is kept.
- Trims whitespace and stores the text verbatim in the assessment row. It renders it as plain text, never logs it, and never sends it back to the AI.
- Suggestions are expected to act on the section's `issues`. Suggesting a title while `issues` says nothing about the title is allowed but pointless.
- Suggestions must be built only from content present in the request. No invented numbers, places or partners: the user may take the text verbatim.
- Other keys inside `suggestions` (e.g. `short_title`) are ignored. More fields would need a new agreement.

## 13. Success Criteria

- With no suggestion from the AI (today's reality), a user with an amber/red General information section can fix title/description, save and re-check without closing the drawer.
- With a valid suggestion, **Apply** then **Save** persists exactly that text through the normal general-info endpoint, and the form shows it afterwards.
- A response with malformed `suggestions` still yields a verdict (never `malformed`/`unavailable` because of it).
- Unknown section keys no longer reach `bilateral_quality_assessments.sections`.
- **Submit anyway** is never allowed on a stale verdict, and `BIL-QAI-R-6` tests still pass.
- The contract copy and change log describe the two keys. The hand-off note is sent to the AI team.

## 14. Next Step

```text
/akili-specify bilateral/qa-ai-text-suggestions
```
