## Context

In the P25 result form the same question — *"Is this innovation linked or bundled with another CGIAR-reported result…"* — is rendered by two different templates that bind to two different in-memory bodies but end up writing the **same database column**:

| Section | Template | Bound state | Endpoint | Persists to |
|---|---|---|---|---|
| 2 — Contributors and partners | `rd-contributors-and-partners.component.html` (~line 316) | `rdPartnersSE.partnersBody.has_innovation_link` / `.linked_results` | `PATCH_ContributorsPartners` | `results_innovations_use.has_innovation_link` (type 2) or `results_innovations_dev.has_innovation_link` (type 7), plus `linked_result` rows |
| 4 — Innovation Use info | `innovation-use-form.component.html` (lines 2–29), shared component | `innovationUseInfoBody.has_innovation_link` / `.linked_results` | `PATCH_innovationUseP25` | same `results_innovations_use.has_innovation_link` + `linked_result` rows |

Both templates use the **same** field key `[innovation-use-form]-has-innovation-link` from `FieldsManagerService`, which is why the label is identical. The service also carries an orphan entry, `[contributors-partners]-is-lead-by-partner`, whose label was copy-pasted from this question and which **no template consumes** — a latent trap for the next developer.

The shared `innovation-use-form` component is consumed twice:

- `innovation-use-info.component.html` (Section 4, result detail) — `isIpsr` not set.
- `ipsr/.../step-n1.component.html` — `[isIpsr]="true"`, and the whole block lives inside `@if (!this.isIpsr)`, so IPSR never shows it.

Data flow when saving Section 4 today: `innovationUseInfoBody` (loaded once on mount by `getSectionInformationp25()`) → `onSaveSection()` builds `bodyToSend` including `has_innovation_link` and `linked_results` → `PATCH_innovationUseP25` → `innovation-use.service.ts` assigns the flag and then, when the flag is falsy, replaces the result's linked results with an empty array.

Business decision (Santiago Sánchez, 27 Jul 2026): the question stays only in Section 2.

## Goals / Non-Goals

**Goals:**

- The question and its dependent result selector appear exactly once in the P25 form: Section 2.
- Saving Section 4 never changes the answer stored from Section 2, and never removes its linked results.
- P22 and the IPSR pathway keep behaving exactly as they do today.
- Leave the codebase without the copy-paste trap that produced this bug.

**Non-Goals:**

- Changing any server code, DTO, entity or migration. Server is read-only for this change.
- Fixing the green check (`validation_innovation_use_P25`) or P2-3191.
- Touching Section 2's own question, its validation, or its multi-select behaviour.
- Migrating or backfilling data already stored.

## Decisions

### D1 — Remove the block from the shared component, not from the Section 4 page

The radio button and the dependent multi-select live in `innovation-use-form.component.html`, inside the existing `@if (!this.isIpsr)` guard. Removing the block there deletes it from Section 4 while leaving IPSR untouched (IPSR already excluded it).

*Alternative considered:* wrapping the block in a new `@if` driven by a new input (e.g. `[showInnovationLink]`). Rejected — it keeps dead UI and a new flag alive for a question business says must not exist there.

### D2 — Keep sending the field, but re-read it immediately before saving

This is the decision that matters, and it is counter-intuitive.

The obvious fix is to drop `has_innovation_link` / `linked_results` from `bodyToSend`. **That would make the bug worse.** The server does:

```ts
if (!has_innovation_link) {
  await this._linkedResultService.createForInnovationUse(InnUseRes.results_id, [], user);
}
```

An omitted property arrives as `undefined`, `!undefined` is `true`, so the linked results selected in Section 2 would be **deleted on every Section 4 save**.

Therefore Section 4 keeps sending both fields, but sourced from a **fresh read of the server state** performed as part of the save, rather than from `innovationUseInfoBody` as loaded when the component mounted. The stale-state window — user answers in Section 2, returns to a Section 4 view that was loaded earlier, saves, and reverts their own answer — is what actually causes the reported data loss.

*Alternatives considered:*

- *Omit the fields* — rejected, see above: deletes linked results.
- *Send hard-coded `true`* — rejected: fabricates business data.
- *Rely on component re-creation on navigation* — rejected as the sole guarantee: it holds only while the router destroys the component between sections; it is an implicit invariant nobody enforces, and this bug already cost real user data.
- *Fix it server-side (ignore absent fields)* — the correct long-term fix, but out of bounds for this change; it is written up in the proposal for the backend team.

### D3 — Remove the orphan field definition

Delete `[contributors-partners]-is-lead-by-partner` from `FieldsManagerService`. Grep shows no template consumes it; only `fields-manager.service.spec.ts` asserts on it, and those assertions are updated with it. Its label is a verbatim copy of the innovation-link question — leaving it in place invites the exact duplication being removed.

### D4 — Keep Section 2 untouched

`rd-contributors-and-partners.component.html` keeps referencing `fieldRef="[innovation-use-form]-has-innovation-link"`. Renaming that key to a `[contributors-partners]-…` prefix would be tidier, but it touches a working screen for cosmetic gain and is excluded under "minimal, incremental changes". Noted as an open question instead.

## Risks / Trade-offs

- **[The extra read adds a round-trip to every Section 4 save]** → It is one GET against an endpoint the section already calls on mount; the save button already shows a saving state, so no new UX affordance is needed.
- **[The fresh read fails or returns nothing]** → Fall back to the values currently held in `innovationUseInfoBody` (today's behaviour). Never send `undefined`/`null` for `has_innovation_link`, which would trigger the server-side wipe.
- **[P22 uses the same `onSaveSection` and the legacy `PATCH_innovationUse`]** → The payload shape is unchanged for P22; the values still travel. Verify a P22 innovation-use save after the change.
- **[Users mid-form when the release lands]** → No stored-data migration is involved; the field keeps living in the same column, written from Section 2.
- **[The section may stay grey until Section 2 is answered]** → Known and accepted: the green check is out of scope and Santiago validates it with Juan David. Do not "fix" it opportunistically here.
- **[Coverage gate]** → `rd-contributors-and-partners/` is excluded from coverage, but `innovation-use-form` and `innovation-use-info` are not. Their specs must be updated so client thresholds (50/60/60/60) hold.

## Migration Plan

1. Implement on `P2-3199-remove-duplicated-innovation-link-question` (branched from `staging`).
2. Run the client Jest suite for the touched specs, then the full suite for the thresholds.
3. Verify in the browser against the test backend: Section 2 answer + linked results survive a Section 4 save; the question is gone from Section 4; IPSR step 1 and a P22 result are unaffected.
4. Hand the backend note (absent field ⇒ wipe) to the backend team on P2-3199.
5. Rollback: revert the commit — the change is presentation plus payload sourcing, with no schema or data migration.

## Open Questions

- Should the field key `[innovation-use-form]-has-innovation-link` be renamed now that it is owned by Contributors and partners? Deferred; cosmetic and touches a working screen.
- Does the backend team want the "ignore absent fields" fix tracked as its own ticket, or folded into whatever they open for the green check / P2-3191?
