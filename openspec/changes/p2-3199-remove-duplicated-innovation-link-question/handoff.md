# Handoff — P2-3199

Session close, 28 Jul 2026. This file is the pick-up point if the ticket comes back with change requests.

Jira: https://cgiarmel.atlassian.net/browse/P2-3199 — the two comments there carry the full write-up (what was done, how to verify, backend hand-off, out of scope).

## Where it stands

- Branch `P2-3199-remove-duplicated-innovation-link-question` (cut from `staging`), pushed.
- Commits: `77809ea5d` (fix + specs), `b5eeee461` (task tracking).
- Merged into `dev` as `a5721c952`. Jenkins `prms-reporting-tool-dev` build **#1906 SUCCESS**.
- Santiago Sánchez notified on Slack with the QA steps. **Waiting on his QA.**
- **No PR to `staging` yet** — deliberate, it waits for his approval.

## What changed, in three lines

1. The innovation link question and its "Please select a result" selector were removed from Section 4 (Innovation Use info) — `innovation-use-form.component.html`. It survives only in Section 2.
2. `innovation-use-info.component.ts` now re-reads `has_innovation_link` / `linked_results` from the server inside `onSaveSection()` and sends those values, falling back to the ones held in the component if the read fails. It never sends `null` / `undefined`.
3. The orphan `[contributors-partners]-is-lead-by-partner` definition was removed from `fields-manager.service.ts` (its label was a copy of the same question; no template consumed it).

## The trap — read this before "simplifying" the fix

The instinctive fix is to stop sending `has_innovation_link` from Section 4. **Do not.** The server does:

```ts
if (!has_innovation_link) {
  await this._linkedResultService.createForInnovationUse(InnUseRes.results_id, [], user);
}
```

An absent field arrives as `undefined`, which is falsy, so omitting it deletes the user's linked results on every Section 4 save. The re-read exists precisely because the client cannot omit the field until the backend stops treating "absent" as "No".

## Verification already done

- Jest: 378 suites / 3,974 tests passing. Coverage above thresholds (S 83.3 / B 64.7 / F 81.3 / L 83.7). Lint clean.
- Browser against the test backend, result `8609`: Section 2 saved as Yes + linked result `8738`; Section 4 renders without the question; saving Section 4 sent `has_innovation_link: true, linked_results: [8738]`; both sections still return that afterwards.
- Edge case seen live: with no innovation-use record yet the read returns 404 and the save still sends `false` — defined, never null.
- P22 result opens and renders clean (not saved, to avoid touching other people's data).
- Screenshot: `onecgiar_pr/.local-screenshots/p2-3199-section4-without-duplicated-question.png` (gitignored).

Only `tasks.md` item 5.4 is unchecked: forcing the stale-state path from the browser was not possible because Angular re-mounts the section on navigation. It is covered by unit test, not by manual browser test.

## Open, owned by others

- **Backend (Juan David Delgado):** make the innovation-use PATCH ignore absent fields. Written up in the Jira comment with the file reference. No server code was touched here.
- **Green check mismatch (Santiago + Ángel + Juan David):** Contributors and partners does not force an answer, Innovation Use requires one — a result can sit with Section 2 green and Section 4 grey forever, and now the question is not on that screen to fix it. Likely the same root cause as P2-3191.

## Frozen by Santiago until rules are agreed with Ángel

- The evidence note link.
- The Qualitative / Quantitative indicators cross-check coming from ToC.

## If changes are requested

1. `git checkout P2-3199-remove-duplicated-innovation-link-question`
2. Re-read this file and `design.md` (decision D2 explains why the field is still sent).
3. Amend, run `npx jest` on the three touched specs, then the full suite for the coverage gate.
4. Merge to `dev` again and re-notify Santiago.
