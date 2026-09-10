# Archive Summary — Evidence Modal Sticky Actions

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `EVM` |
| Original spec path | `docs/specs/bugfix/evidence-modal-sticky-actions/` |
| Type | Bug · Depth: Lite |
| Archive date | 2026-09-08 |
| Branch | `qa-development-2026-ss` (spec branch — default is `master`) |
| Final status | **Shipped** — commit `85a3de85b` 🔧 `fix(rd-evidences): keep evidence popup header/footer visible and reduce scroll`. Single task, 4 attempts, all resolved. |

## 2. Requirements Delivered

| ID | Statement | Delivered by |
|---|---|---|
| `EVM-R-1` | `.modal_header` (title + close ✕) stays visible/reachable at all times | `EVM-T-1` (attempts 2–3) |
| `EVM-R-2` | `.buttons` (Cancel/Add evidence/Save changes) stays visible/clickable at all times | `EVM-T-1` (attempts 2–3) |
| `EVM-R-3` | Only the embedded form scrolls — exactly one scrolling region, no second hidden-header/footer path | `EVM-T-1` (attempt 2) |

`EVM-AC-1` (constrained-height, header/footer stay put) and `EVM-AC-2` (no regression at baseline size) both closed with live browser evidence, not just the jsdom CSS-contract test. `EVM-OQ-1` (whether other `app-pr-dialog` consumers share the pattern) stays open, deliberately deferred.

## 3. Files Changed Summary (from `execution.md`)

| File | Attempt(s) | Nature |
|---|---|---|
| `rd-evidences.component.scss` | 1 (superseded), 2, 3, 4 | attempt 1: `position: sticky` on header/footer (DD-1) — later found insufficient; attempt 2: DD-2 fallback — `.evidence_modal` becomes `overflow-y: hidden`, new `.modal_body` is the sole scrolling flex child, `position: sticky` removed entirely; attempt 3: height buffer `max-height: min(85vh, calc(100vh - 300px))` → clears the app-shell's fixed header; attempt 4: gap/spacing trim (24px→20px) + buffer trimmed to `calc(100vh - 260px)` |
| `rd-evidences.component.html` | 2 | wrapped `<app-evidence-item>` in new `<div class="modal_body">` |
| `rd-evidences.component.spec.ts` | 1–4 | regression suite rewritten each attempt to match the current structure; red→green demonstrated at every step |
| `evidence-item.component.ts` | 4 | fixed a genuine pre-existing bug: `evidencesType` used numeric `id: 0/1` against a boolean `is_sharepoint`, so neither "Source of evidence" radio ever rendered selected (`false === 0` is `false` in JS) |
| `evidence-item.component.scss` | 4 | scoped `::ng-deep .field_card { margin: 4px 0; }` inside `.evidence_item.embedded` only (global `field-card.scss` 20px margin untouched for every other consumer); `.evidence_fields` gap 24px→16px |
| `rd-evidences/CLAUDE.md` | every attempt | re-stamped each time, Trampas entries documenting DD-1→DD-2 transition, the compositing quirk, and the density fixes |

No server, data model, or API change. `pr-dialog.component.ts/scss` deliberately never touched (per `requirements.md` §3 Out of Scope) — see §6 for the follow-up this produced.

## 4. Test Evidence Summary

No separate `test-report.md` — evidence is embedded in `execution.md` per attempt.

| Check | Result |
|---|---|
| `npx jest --testPathPattern="rd-evidences" --no-coverage` | 3 suites / 107 tests passed (final, attempt 4) |
| `npx ng lint --quiet` | clean, every attempt |
| Red→green regression discipline (Bug Mode requirement) | demonstrated at every attempt — each rewritten test suite fails against the prior attempt's structure and passes against the new one |
| Live browser verification | performed **twice** at structural milestones (attempt 1 and attempt 2), each with real DOM `scrollTop` manipulation + `getBoundingClientRect()` before/after (not just `getComputedStyle` presence), plus 2 further live re-verifications for attempts 3–4. All via a user-supplied session token, never logged, `.env` restored byte-for-byte after each local-stack use (confirmed via `git status`) |

## 5. Validation Summary

No separate `validation-report.md`. Reviewer verdicts recorded inline: **PASS** on attempt 1 (structurally correct per the design chosen, but blocked from `[x]` by the outstanding live-check gap) and **PASS** on attempt 2 (the DD-2 structural fix, with a point-by-point re-verification of the border-box/padding-override math proving the outer `.pr-dialog` scroll is now provably inert). Attempts 3 and 4 were **Leader-inline fixes**, not sent through the Implementer/Reviewer loop — single-file, single-root-caused CSS changes, self-verified live by the Leader directly in the browser, explicitly within the documented Leader delegation-threshold exception (`.agents/leader.md`).

## 6. Accepted Warnings / Follow-Ups

- **`EVM-OQ-1`** (do other `app-pr-dialog` consumers share the non-sticky-header/footer pattern?) — stays open, not actioned.
- **New follow-up surfaced by attempt 3, not actioned here:** a Chromium compositing quirk where a `position: sticky` ancestor (`.app-shell-header`) paints *above* a deeply-nested `position: fixed` descendant (`.pr-dialog-mask`) regardless of z-index — empirically confirmed live (raising z-index from 2000 to 1,000,000, `translateZ(0)`, `will-change`, and `isolation: isolate` all tried, none changed hit-testing/paint order). Root cause: `pr-dialog` renders inline in the component tree rather than via a `document.body` portal, which is what exposes it to this class of bug. Worked around per-consumer here (a height buffer in `rd-evidences.component.scss`) rather than fixed at the `pr-dialog` source, since that file is explicitly out of scope for this spec. Likely affects **any** sufficiently tall `app-pr-dialog` opened while the test-environment banner is visible — worth a dedicated follow-up spec if `pr-dialog` is to be hardened at the source. See the Kaizen entry for the guide-sync pending item this produced.
- **Honest limit, not fully resolved:** the user's separate ask to have the popup "use more of the space below" is only partially achievable — `.pr-dialog-mask` centers the dialog symmetrically, so the same top-clearance buffer that fixes attempt 3's bug also caps how far down the dialog can extend. Full elimination of scrolling for a 4–6-question form isn't achievable within that constraint on short screens; scrolling was substantially reduced (content height ~858px → ~730px) but not eliminated. Fixing this properly needs `pr-dialog.component.scss` (asymmetric/bottom-weighted centering), which is out of scope here — folded into the same `pr-dialog` follow-up above.
- **Not re-tested separately:** the "Edit Evidence" flow (only "Add Evidence" was live-verified) — shares the identical `.evidence_modal` template/binding (`showCreateModal`), so the fix applies identically by construction, not by a second live pass.

## 7. Historical Notes

- This is a rich 4-attempt case, each attempt fixing a genuinely different, real defect that was invisible until exercised at a different real viewport/interaction:
  1. **Attempt 1** (`position: sticky` directly on `.evidence_modal`'s children) passed Reviewer and a live check at an extremely short viewport (1280×575) — but that viewport happened to force `.evidence_modal` itself to be the scrolling ancestor. At a normal desktop height (~1911×952, user-reported), the popup's content fit inside `.evidence_modal`'s own cap without needing its internal scroll, so the **outer** `.pr-dialog` became the actual scrolling element instead — and `position: sticky` only reacts to its own nearest scrolling ancestor, so the pinning had **no effect at all** in that case, producing an overlap/cut-off regression the live check at the short viewport could never have caught.
  2. **Attempt 2** eliminated the ambiguity structurally (DD-2 fallback: exactly one scrolling ancestor in the whole subtree, `.modal_body`), closing the double-scroll-ancestor class of bug for good — re-verified with a real DOM scroll test targeting the *correct* element this time.
  3. **Attempt 3** found and fixed an unrelated defect surfaced only by the fix's own vertical-centering side effect: the dialog's initial position could land behind the app shell's fixed header, root-caused to a genuine Chromium compositing/stacking quirk (not a fixable z-index issue — empirically disproven live).
  4. **Attempt 4** was a pure UX density pass in response to direct user feedback after the structural bug was gone, incidentally catching a **second, unrelated pre-existing bug** (the source-selection radio never rendering as checked, `false === 0` in JS).
  - See the Kaizen entry (`docs/specs/kaizen/bugfix--evidence-modal-sticky-actions.md`) for the standardization lessons this sequence produced.
- **Doc-staleness note (same pattern seen elsewhere in this project):** `tasks.md`'s task header still literally reads `Make the evidence popup's header and action buttons sticky [~]` and its own Definition-of-Done checkboxes are still unchecked `[ ]`, even though `execution.md` §4 explicitly states "Task marked `[x]`" and documents full completion across all 4 attempts. `execution.md` is authoritative; `tasks.md`'s checkboxes were simply never re-ticked after the final attempt. Left as-is (out of this archive's scope to edit historical task docs), flagged here so a future reader isn't misled by `tasks.md` alone.
