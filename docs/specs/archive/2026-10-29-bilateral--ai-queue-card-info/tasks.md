# Tasks — Bilateral AI Queue Confirmation Card: Informational Style

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `ai-queue-card-info`
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** Maria Camila Giraldo (M.Giraldo@cgiar.org)
- **Status:** `done` — `AQC-T-1` is `[x]`: Reviewer `PASS`, HITL visual check confirmed by the user 2026-10-29 (see `execution.md`)

---

## 2. Pre-flight checklist

- `requirements.md`: approved by the user, 2026-10-29 (Continue).
- `design.md`: approved by the user, 2026-10-29 (Continue, no judgment-day).
- Open questions: `OQ-1` resolved to its default (card follows the blue toast; the violet banner is untouched).
- Conflicting in-flight specs: none found under `docs/specs/bilateral/` touching `bilateral-ai-upload`.
- Migration / CLARISA: n/a.

---

## 3. Task list

### `AQC-T-1` — Restyle the confirmation card as info and lock it with tests `[x]`

> Reviewer `PASS`, evidence re-run `VERIFIED`, HITL visual check (`AQC-D4` / `AQC-AC-5`) confirmed by the user 2026-10-29 after a hard refresh (the dev server had served a stale bundle). See `execution.md`.

- **Type:** `client`, `tests`, `docs`
- **Description:** In the confirmation card, swap `task_alt` for `info` and the success tokens for the blue-scale tokens of `design.md` DD-1. Extend the existing submit spec with the real-DOM assertions of DD-4. Correct the folder `CLAUDE.md` and re-stamp `Verified:`.
- **Implements:** `AQC-R-1`, `AQC-R-2`, `AQC-R-3`, `AQC-NFR-1..3`, `AQC-AC-1..5`
- **Design refs:** DD-1, DD-2, DD-4, DD-5
- **Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.html` (`:4`, `:8`, `:10`, `:25`)
  - `…/bilateral-ai-upload.component.spec.ts` (card assertions near `:314-316`)
  - `…/bilateral-ai-upload/CLAUDE.md`
- **Depends on:** `—`
- **Estimate:** `S`
- **Review:** `checklist` — one template block plus one spec; no shared symbol, selector or payload changes (`P-3`).
- **Skills:** `angular-developer`, `tailwind-design-system`, `frontend-design`
- **First step:** write the new assertions first and run them against the unchanged template, so the red is observed (see Red run).
- **Verification:**
  - **Falsifier:**
    - (D1) Put `task_alt` back in the card icon → the new icon-text assertion fails.
    - (D2) Put one `--pr-status-approved-fg` back on any one of the four spots (title, border, icon, secondary button) → the `outerHTML` no-`status-approved` assertion fails. Run it on each spot in turn, not only one, because a single-spot mutation would leave an all-spots claim unchecked.
    - (D3) Make **Open AI processes** call `bilateralAiService.openDrawer()` directly instead of `onOpenAiProcesses()` → the existing click test at `:380` fails (already in place, must not be weakened).
    - (D5) Replace one `blue` token with a misspelled one (`--pr-color-bleu-700`) → `npm run build` still passes (Tailwind does not validate CSS variables), so this is **not** caught by the build; it is caught only by the `pr-color-blue` presence assertion and the HITL check. Record this blind spot instead of claiming the build covers it.
  - **Red run:** `predicted — the new assertions do not exist yet (observed in AQC-T-1)`. The Implementer runs `npx jest --silent --testPathPattern=bilateral-ai-upload.component.spec` with the new assertions on the unchanged template and quotes the failing line (expected `info`, received `task_alt`) in `execution.md` before editing the template. The baseline fact itself is already observed: `grep -n "task_alt\|status-approved" …html` → lines 4, 8, 10, 25 at `36a367680`. A red that is a setup or timeout error and not the assertion does not count.
  - **Disqualifier:**
    - `AQC-D4` has no automated gate: jsdom cannot resolve `var()` or measure contrast. If the HITL check shows a color that is not blue, a missing background, or the card not reading as informational, stop and re-spec the tokens; green Jest does not clear it.
    - The contrast figures (≈ 6.2:1, ≈ 3.4:1) are hand computations. Re-compute them with a stated formula in `execution.md`; if either falls below 4.5:1 (text) or 3:1 (icon), that is a FAIL, not a note.
    - The `pr-color-blue` presence assertion proves the tokens are in the markup, not that they paint.
  - **Consumers:** `aiu-confirmation-card`, `aiu-confirmation-open-drawer`, `aiu-confirmation-choose-another` and the card text are read only by `bilateral-ai-upload.component.spec.ts` (`:314`, `:380`, `:385`, `:411`) — `P-3`: `grep -rn "aiu-confirmation" onecgiar-pr-client/src onecgiar-pr-client/cypress` → `.html`, `.spec.ts`. The test-ids and text do not change.
- **Definition of done:**
  - [ ] Card shows `info` and the blue tokens at all four spots; text and both actions unchanged (`AQC-AC-1..4`).
  - [ ] Red observed and quoted before the edit; falsifiers D1, D2 (each spot) and D3 executed and observed red, then reverted.
  - [ ] `npx jest --silent --testPathPattern=bilateral-ai-upload.component.spec` green (touched module only, client rule 25).
  - [ ] `npx ng lint --quiet` clean; `npm run build` passes (from `onecgiar-pr-client/`).
  - [ ] Contrast computed and recorded.
  - [ ] **HITL visual check (`AQC-D4`, `AQC-AC-5`):** submit one AI job locally; the card sits next to the toast and reads as informational, not completed. The user confirms.
  - [ ] Folder `CLAUDE.md` corrected (card is info too) and `Verified:` re-stamped, in the same commit.
  - [ ] `git diff --stat` shows no `.ts` (non-spec), `.scss`, `colors.scss`, copy or `pr-toast` file touched.
  - [ ] No secret or token in logs or messages (`.cursorrules`).
  - [ ] Commit follows convention, e.g. `🎨 style(bilateral-ai-upload) [SPEC:bilateral/ai-queue-card-info]: show the queued confirmation card as info instead of success` (no apostrophes, `$` or quotes in the subject).

---

## 4. Dependency graph

```
AQC-T-1   (only task)
```

## 5. Coverage closure (scenario and clause level)

| Clause | Owner |
|---|---|
| `AQC-R-1` scenario: info icon, blue tokens, unchanged text | `AQC-T-1` |
| `AQC-R-1` BUT must NOT `task_alt` / `status-approved` | `AQC-T-1` (D1, D2) |
| `AQC-R-1` AND IT MUST contrast AA | `AQC-T-1` (contrast record + HITL) |
| `AQC-R-2` Open AI processes | `AQC-T-1` (existing test, D3) |
| `AQC-R-2` Choose another project, blue button, focus ring unchanged | `AQC-T-1` (existing test, D2 on the button spot, HITL for ring) |
| `AQC-R-3` same family, no new token/hex/SCSS | `AQC-T-1` (`git diff --stat` gate) |
| `AQC-NFR-1..3` | `AQC-T-1` (`role`/`aria-hidden` untouched in diff; no i18n/API; no SCSS) |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `AQC-TEST-1` | Jest (client) | `AQC-AC-1`, `AQC-AC-2`, `AQC-AC-3` | `bilateral-ai-upload.component.spec.ts` near `:314` (extended) |
| `AQC-TEST-2` | Jest (client) | `AQC-AC-4` | same file `:380`, `:411` (existing, unchanged) |
| `AQC-TEST-3` | manual (HITL) | `AQC-AC-5`, `AQC-D4` | local run, card beside toast |

Client coverage stays above 50/60/60/60.

## 7. Rollout, follow-ups, rollback

- PR vs `staging`/`master` per release cadence; single PR (≈ 25 LOC).
- CI green (lint, Jest, build); manual QA on prtest: card is blue with the `info` icon after an AI submission.
- No new UX pattern to promote into `docs/ux-ui/design.md`.
- Rollback: revert the commit; no data, flag or migration.
