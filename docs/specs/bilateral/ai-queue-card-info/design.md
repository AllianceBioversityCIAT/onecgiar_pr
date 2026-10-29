# Design — Bilateral AI Queue Confirmation Card: Informational Style

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-queue-card-info/` |
| **Requirements** | [`requirements.md`](./requirements.md) (`AQC-*`) |
| **Depth** | Lite |
| **Status** | draft — awaiting Phase 2 approval |
| **Baseline cited** | `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, `--pr-*`, no hex) · `docs/ux-ui/design.md` §10 a11y |

---

## 1. Executive Summary

One template block changes. In `bilateral-ai-upload.component.html` the confirmation card swaps its success tokens and `task_alt` icon for blue-scale tokens and the `info` icon, using Tailwind arbitrary `var()` utilities the file already uses. No TypeScript, SCSS, i18n, API or token-file change. One spec gains assertions, and the folder `CLAUDE.md` is corrected.

---

## 2. Premise Ledger

Count: 5 verified, 0 `UNVERIFIED` (0 High, 0 Low).
Blast-radius triggers: `consumer` fires (the change edits DOM hooks, classes and an icon of a rendered block); `live-path` fires (a user action reaches the card); `shared-state` does not apply — the card's classes are per-instance template attributes, no shared style, service or base class changes.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | All green styling of the card is in five spots of one template: border + bg (`:4`), icon (`:8`), title (`:10`), secondary button border + text (`:25`) | location | `grep -n "status-approved\|task_alt" bilateral-ai-upload.component.html` → lines 4, 8, 10, 25 (and no other hit in the file) | `36a367680` | T1 scope grows to the missed spot (Low) | — |
| P-2 | The card is reached only through the `202` handler: `justSubmittedProjectName` is set at `:593`, right before the queued toast, and cleared at `:166,:174` | live-path | `grep -n "justSubmittedProjectName" bilateral-ai-upload.component.ts` → `:84,:166,:174,:593`; entry: `onSubmit()` → `POST_bilateralAiJob` (`:580`) → `.set(projectLabel)` (`:593`); the template `@if` reads it at `html:1`. No portfolio or flag branch on that path | `36a367680` | The manual browser check needs another path to reach the card (Low) | — |
| P-3 | Nothing outside the template and its spec reads the card's hooks or text | consumer | `grep -rn "aiu-confirmation" onecgiar-pr-client/src onecgiar-pr-client/cypress` (all file types, excl. `node_modules`) → `.html`, `.spec.ts` only. `grep -rn "added to the AI queue" …` → `bilateral-ai-processes.copy.ts`, the `.html`, the `.spec.ts` only. Alternate names: the card is also `confirmation` in `copy.confirmation.*` (copy file, unchanged) | `36a367680` | T1 Consumers grows (Low) | — |
| P-4 | The blue scale tokens exist and the template already uses the arbitrary-`var()` Tailwind form | existence | `colors.scss:119-128` (`--pr-color-blue-50…950`); `bilateral-ai-upload.component.html:4` (`border-[var(--pr-status-approved-fg)]`, same form) — parity with the form, not proof it paints (see `AQC-D4`) | `36a367680` | A new token would be needed, in `colors.scss` first (High: scope changes) | — |
| P-5 | The "reporting on behalf of" banner is violet (primary scale), not blue | data-env | `bilateral-ai-upload.component.scss:21-23` → `--pr-color-primary-50/100/600` | `36a367680` | If it were blue, `OQ-1` disappears and the card could copy its tokens (Low) | — |

---

## 3. Design Decisions

### DD-1 — Token mapping (`AQC-R-1`, `AQC-R-3`)

Blue scale, same family as `pr-toast--info` (`blue-500`), no new tokens:

| Card part | Today | Becomes |
|---|---|---|
| Root background | `--pr-status-approved-bg` | `--pr-color-blue-50` |
| Root border | `--pr-status-approved-fg` | `--pr-color-blue-200` |
| Icon (`task_alt`) | `--pr-status-approved-fg` | `info` icon in `--pr-color-blue-500`, the toast icon color |
| Title | `--pr-status-approved-fg` | `--pr-color-blue-700` |
| Subtitle | `--pr-text-secondary` | unchanged |
| **Open AI processes** (primary, violet) | violet, white text | unchanged (primary action color, not part of the status family) |
| **Choose another project** border + text | `--pr-status-approved-fg` | `--pr-color-blue-700`; hover stays `bg-white` |

Why `blue-700` for text: `blue-700` on `blue-50` is ≈ 6.2:1 by hand (≥ 4.5 AA); the `blue-500` icon on `blue-50` is ≈ 3.4:1 (≥ 3:1 non-text). Both are hand computations, re-run in T1. The toast's `blue-500` alone is too light for 13.5px text, which is why text takes `700` and only the icon takes `500`.

Rejected: `--pr-status-submitted-fg/bg` (`blue-700`/`blue-100`, `colors.scss:247-248`). It is a workflow-status pair, and `docs` UI rule 9 says status pairs are fixed and must not be reused for other meaning. Rejected: following the violet banner (`OQ-1`, ticket goal says the toast).

### DD-2 — Icon

Swap the text of the existing `<i class="material-icons-round …">` from `task_alt` to `info`. Same element, so size (`text-[20px]`) and `aria-hidden` stay. No new icon library (`@ng-icons/lucide` is for new redesign surfaces; the neighbor banner already uses Material `info`).

### DD-3 — Reversion challenge (Step 2.3)

This removes already-delivered green styling (`AIQ-R-7` B). **Question: what does removing it break?** Answer: nothing reads it — `P-3` shows the spec asserts only the test ids and the text, no class or icon. The green success meaning is exactly what the ticket calls wrong. The completion toast ("ready") stays green, so queued vs. finished stay distinct (`AQT-R-1`).

### DD-4 — Tests (`AQC-D1`, `AQC-D2`)

Extend the existing submit test in `bilateral-ai-upload.component.spec.ts` (`:314-316`, the card render). Add: icon text is `info` and not `task_alt` (read the real element); the card `outerHTML` has no `status-approved` and contains `pr-color-blue`. The existing click tests (`:380`, `:411`) stay untouched.

### DD-5 — Docs

`bilateral-ai-upload/CLAUDE.md` currently says the card "no cambió" (line in "Al enviar (202)"). Update it to say the card is now info/blue too, and re-stamp `Verified:` in the same commit (client rule, `onecgiar-pr-client/CLAUDE.md` §10).

---

## 4. Files

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.html` | the five spots in P-1 |
| `…/bilateral-ai-upload.component.spec.ts` | extra assertions, DD-4 |
| `…/bilateral-ai-upload/CLAUDE.md` | DD-5 |

No change: `.ts`, `.scss`, `colors.scss`, `bilateral-ai-processes.copy.ts`, `pr-toast`.

---

## 5. Risks and rollback

| Risk | Handling |
|---|---|
| Tailwind does not emit the class, so the card paints unstyled (`AQC-D5`) | `npm run build` + the HITL visual check |
| Contrast shortfall on a real screen | T1 re-computes; HITL check |
| Rollback | Revert the commit; no data, flag or migration |

---

## 6. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
|---|---|
| Tasks | 1 |
| LOC | ≈ 25 (≈ 6 template lines, ≈ 12 spec, ≈ 5 doc) |
| Review rounds | 1 |

The estimate matches the Lite depth, so no depth change. A cosmetic-only spec could go through `/akili-quick`, but the folder `CLAUDE.md` correction and the test lock were asked for by the repo rules, so this stays a spec.
