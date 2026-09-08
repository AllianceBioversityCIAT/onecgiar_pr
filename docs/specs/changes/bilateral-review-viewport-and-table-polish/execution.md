# Execution Log — Bilateral review: viewport lock, pinned filters, table color and columns

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-viewport-and-table-polish/` |
| **Module code** | `BRV` |
| **Approval Mode** | pre-approved (owner, 2026-09-08) |
| **Execution limits** | ≤ 1 Reviewer round per task (scoped re-review protocol); targeted Jest; lint; CT on every task; `ng build` on T-1 (new `styleUrl`); verification in the foreground; Leader look after T-1 and T-2 (Orca dedicated page or owner screenshot) |
| **Budget (design §12)** | 3 tasks · ~650 source LOC · ~800 test LOC · tripwire > 1000 source or any third attempt |
| **Started** | 2026-09-08 02:52 (GMT-5), branch `qa-development-2026`, base `28fd3a05c` |
| **Leader** | Claude Code session (Fable 5.1, T1) · Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` (opus) |
| **Pre-flight** | ticked in `tasks.md` §2; owner "before" screenshot `after-polish-1.png`; live probe confirmed host `position: static` and document scroll (polish log, 02:20) |

## Task Execution History

### `BRV-T-1` — Viewport lock and pinned chrome

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer spawned 02:55, fresh worker) |
| Date | 2026-09-08 |
| Gate before start | pre-flight ticked; judgment-day APPROVED after one fix pass (9 severe families); owner: "el hero y los filtros no deberían moverse" |
| Skills assigned | `angular-developer` (task list) |
| Effort | high (structural fix proven only by computed geometry) |

**Attempt 1 — Implementer report (03:25):** 5 files (`.ts` +38, `.html` +22/−5, new `.scss` 29 lines, `.spec.ts` +35, `.cy.ts` +240/−5); `Tests: 439 passed` · lint clean · CT `40 passing` · `ng build --configuration development` → bundle complete (the `@use` depth compiles). RED probes (verbatim, reverted): host-static → `documentElement.scrollHeight(4217) <= clientHeight(900): expected 4217 to be at most 900`; drop-sticky → `pinned.top(-544.0) === workArea.top(56.0) ± 1: expected 600 to be at most 1`. Measured in CT: pinned wrapper **142 px** (toolbar 54 + collapsed band 87) → **AC-2/R-2 cap recalibrated to 150** (measured + 8; the 130 had no derivation); `firstRow − workArea` 212 (was 223). Judgment calls accepted: CT host is `[data-cy-root]`; `scroll-margin-top` via `:host ::ng-deep` in the new SCSS with a Jest assertion on the SCSS source (jsdom applies no component CSS). LOC: source +85 / −4 · tests +274 / −1. Reviewer (opus, lens checklist, high) spawned 03:28 on the 5-file diff (477 lines, `v1.diff`).

**Leader HITL look #1 (03:30, dedicated Orca page, SP02, 1273 CSS px):**

| Check | Result |
|---|---|
| Lock | host computed `position: absolute`, `display: flex`; document **not** scrollable; work area scrollable ✅ (R-1, AC-1) |
| Pin after `scrollTo(0, 600)` | `scrollTop 600`, `window.scrollY 0`; hero top 0 → 0; `pinned.top 219 === workArea.top 219`; `filterBand.bottom 391 === pinned.bottom 391`; stat bar top −209 (under); first row under the chrome at 424 ✅ (R-2, AC-2, scenario "Scroll the queue") |
| Pinned wrapper | `position: sticky`, `z-index: 15` ✅; height **172 px at 1273** (toolbar wraps to two rows below ~1400; the 150 cap is stated at 1536, where CT measured 142) — recorded |
| Popover clip | popover bottom 608 / right 917 inside work area 1130 / 1273 ✅ (AC-3b) |
| `--brv-pinned-h` | `172px` set on the work area ✅ |
| **`scroll-margin-top` on rows** | **computed `0px` ❌** — the compiled rule is `[_nghost-ng-c3515921629] #workArea tr, … [data-testid="bilateral-review-card"] { scroll-margin-top: var(--brv-pinned-h, 130px) }`; **`#workArea` is a template reference variable, not an id**, so the selector never matches (the same trap the `BRP` T-3 Reviewer flagged in the CT). R-2's focus-safety clause is unmet. Fix: give the work area `data-testid="bilateral-review-work-area"` (page html is in T-1's Files) and target it, or drop the `#workArea` qualifier; add a CT computed-style assertion (`getComputedStyle(tr).scrollMarginTop !== '0px'`) since Jest cannot see it |

**Attempt 1 — Reviewer verdict (03:44): `STATUS: FAIL`**, 2 issues. Verified green otherwise: SCSS mirrors `programme-results` (depth 5, `display: block` before the mixin, build green); wrapper contract; both RED probes real and reverted; AC-1 pre-condition and AC-2 `scrollTop === 600` asserted first; 150 cap measured; 1024 DETECTOR injection extended to the host; 840 inert gate; scope = 5 files.

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | `scroll-margin-top` rule targets `#workArea` — a template reference, not an id — so it never matches; only a source-text Jest "proved" it (same finding as HITL #1) | R-2 focus-safety clause; §10 "Focus hidden under pinned chrome"; design §6.1 | Scope to `.custom_scroll` (or add `id`), CT computed-style gate on a real row at 1536, SCSS fallback 142 |
| 2 | `BRP` single-scroller gate not extended with the host `position: absolute` assertion | R-10, R-9 tail, §10 "Second scroller" | Add the host assertion to the 1536 case; `scrollY === 0` already covered by AC-2 |

**ADVISORY (recorded):** ~400 lines not re-indented inside the wrapper (accepted — keeps the diff reviewable; a format pass later); `ResizeObserver` guard no longer latches in Jest (idempotent); tasks.md still said 130 → **fixed by the Leader** (150); design fallback aligned to 142.

**Leader relay (03:46):** FAIL report verbatim + HITL evidence + attempt history to the same Implementer. **Attempt 2** — the one allowed Reviewer round.

**Attempt 2 — Implementer landed (03:52):** rule scoped to `.custom_scroll tr` / cards, fallback 142; Jest source-text test corrected; **new CT gate** on a real row's computed `scrollMarginTop` (RED before the fix, GREEN after); single-scroller 1536 case asserts the host `position: absolute`. `Tests: 439` · lint clean · CT `41 passing` · `ng build` complete. **Leader live re-check (03:54):** `getComputedStyle(tr).scrollMarginTop === '172px'` = `--brv-pinned-h` ✅. Scoped re-review sent to the same Reviewer (03:55) with the full diff + a 72-line interdiff.

**Attempt 2 — Reviewer verdict (03:58): `STATUS: PASS`.** "Both FAIL issues are fixed at the root, not papered over — the dead `#workArea` id selector is now a real class hook proven by a live computed-style gate against the measured pinned height, and the single-scroller gate carries the host `position: absolute` assertion at ≥ 900 with its exclusion list verbatim." Scope check: the other `.custom_scroll` nodes in the host (select panels) contain no `tr`/card, so the selector cannot bleed.

**Final — `BRV-T-1` PASS on attempt 2 (2026-09-08 04:00)**

| Field | Value |
|---|---|
| Attempts | 2 |
| Files | `bilateral-review.component.{ts,html,spec.ts}`, new `bilateral-review.component.scss`, `bilateral-review.cy.ts` |
| Verification | `Tests: 439 passed`; lint clean; CT `41 passing`; `ng build --configuration development` complete |
| Live evidence | HITL #1 + re-check: host `absolute`, document not scrollable, pin geometry exact after 600 px, popover inside the work area, `scrollMarginTop 172px` = pinned var |
| Requirements covered | BRV-R-1, R-2, R-9 (b)(c), R-10, R-20; AC-1, 2, 3, 3b, 12; scenario "Scroll the queue" |
| Decisions | (1) Pinned cap 130 → **150** (measured 142 + 8; at 1273 px the toolbar wraps and the wrapper is 172 — the cap is stated at 1536). (2) CT host is `[data-cy-root]`. (3) `scroll-margin-top` via `:host ::ng-deep .custom_scroll tr` with a CT computed-style gate (source-text proof rejected). |
| Issues | The `#workArea`-is-not-an-id trap bit a third time in this module (BRP CT comment, BRP T-3 probe, now the SCSS) — guide gotcha in T-3. |
| Gate | auto-approved (pre-approved mode) |

