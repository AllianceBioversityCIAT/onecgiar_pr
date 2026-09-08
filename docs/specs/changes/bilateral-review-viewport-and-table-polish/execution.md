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

### `BRV-T-2` — Table color, columns, emphasis, label

| Field | Value |
|---|---|
| Status | in progress (attempt 1 — Implementer spawned 04:03, fresh worker) |
| Date | 2026-09-08 |
| Gate before start | auto-approved (pre-approved mode) after T-1 PASS. Note: another session committed `779d55fbe` (`bilateral/shell-sp-alignment`) to this branch between T-1's landing and its commit — checked for sweeps of `pages/bilateral-review/**` (see below) |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, `frontend-design` (task list) |
| Effort | high |

Sweep check (04:04): `779d55fbe` touched 0 files under `pages/bilateral-review/`; T-1's commit `609fc73f8` carries exactly its 9 files; the module tree is clean.

**Attempt 1 — Implementer report (04:30):** 7 files; `Tests: 458 passed` · lint clean · CT `49 passing` · `ng build` ok. LOC: source +178 / −64 · tests +502 / −57. Measured: one-line+caption 49 (≤ 50), one-line 37.5 (≤ 44), two-line 63 (≤ 64); group header **61 → ≤ 40** (root cause: ambient `pr-table.component.scss tbody td` padding out-specifying non-`!` utilities on the header `td` — fixed with `!p-0 !border-b-0`); accent 3 px `rgb(180,83,9)` vs `rgb(227,227,232)`. Judgment calls accepted: the cards bar has no `colspan` (three real sites — **R-4 corrected**); AC-6's "Bioversity (Alliance)" does not overflow 150 px in the harness → a longer name proves truncation in CT, the Jest case keeps the original. Reviewer (opus, lens checklist, high) spawned 04:33 on the 7-file diff (1151 lines, `v2.diff`).

**Leader HITL look #2 (04:35, dedicated Orca page, SP02, 1273 CSS px — the requested 1489 viewport did not apply; still ≥ 900):**

| Check | Result |
|---|---|
| Headers | `Code · Title · Lead center · Status · Alignment · Submission date · Actions` (7) ✅ |
| Group headers | max **40 px** ✅ (was 61); pending header `border-left 3px rgb(180,83,9)` ✅; badge "3 pending" in-progress pair, contrast **4.51** ✅ (pre-audited pair, AA) |
| Pills | Pending Review `rgb(180,83,9)` on `rgb(254,243,199)` 4.51 (tint, luminance 0.89 — not a fill) ✅; Editing not-started pair 6.87 ✅ |
| Alignment cell | both placeholders → one "—" + `sr-only` "TOC result: Not specified · Indicator: Not Applicable" ✅ |
| Action tone | "Review" carries `primary-700`, transparent bg, contrast 11.89 ✅; "See" neutral ✅ |
| Labels | "Status" / "Centers · 7" height 16, no overflow ✅ |
| Row caps | one-line max 46 (≤ 50), two-line max 63 (≤ 64) ✅ |
| Pinned / rows | pinned 172 at 1273 (toolbar wraps below ~1400); **11 data rows visible in the first screen** (the owner's "before" screenshot at ~846 px tall showed 8) — AC-13 ✅ |

**Attempt 1 — Reviewer verdict (04:41): `STATUS: FAIL`**, 1 issue. Conforms otherwise: R-3 (per-line Alignment, inner-span truncation, widths, key position), R-4 (`showCenterColumn()` predicate, three `colspan` sites bound, no orphan `colspan="8"`, no dangling `headers.toc/indicator` in `src/`), R-5 (fixed pairs only, never recombined, zero raw palette left in the table component), R-6 table accent + `!p-0 !border-b-0` root cause, R-7 on `canReviewRow`, R-8, R-11; §6.3 intact; scope clean.

| # | Discovered Issue | Violated Rule | Remediation |
|---|---|---|---|
| 1 | The **cards** group-bar accent has no evidence (Jest reads only the table `td`; CT 840 asserts height/ellipsis only); the bar is `border-0 !border-l-[3px]` — a different cascade — so an inert accent below 900 would pass every gate | tasks T-2 Tests ("table header **and cards bar**"); R-6 last sentence | Jest narrow case on both toggles' classes; CT 840 computed `borderLeftWidth 3px` + colour on the cards toggle |

**ADVISORY (recorded):** `columnCount()` hard-codes 7/6 (derive from `copy.headers` — follow-up); `!border-b-0` removes the header's 1 px divider (accepted for the ≤ 40 cap; checked live — the tinted header row reads fine); hlm ghost `hover:text-foreground` erases the "Review" emphasis on hover — **Leader added** `hover:text-[var(--pr-color-primary-700)]`; AC-11 "same left edge" ungated — **Leader added** an equal-width label assertion in the 12-center CT case; T-2 Files omitted `bilateral-review.cy.ts` — **corrected in tasks.md**.

**Leader relay (04:43):** FAIL report verbatim + the two additions to the same Implementer. **Attempt 2** — the one allowed Reviewer round.

**Attempt 2 — Implementer landed (04:50):** cards toggle drops `border-0` (kept `!border-l-[3px]`); Jest narrow accent case on both toggles; CT 840 computed `borderLeftWidth 3px` + `rgb(180, 83, 9)` on the cards toggle; `actionToneClass()` adds `hover:text-[var(--pr-color-primary-700)]`; 12-center CT case asserts equal label widths. Jest 459 · lint clean · CT 49. Scoped re-review sent to the same Reviewer (04:52) with the full diff + a 78-line interdiff.

**Attempt 2 — Reviewer verdict (04:56): `STATUS: PASS`.** "All three items remediated as claimed, each with an effect-level (not presence-level) gate; `border-0` removal is safe because the global base-layer `button { border-width: 0 }` already zeroes the other axes and cannot out-specify the `!` left accent."

**Final — `BRV-T-2` PASS on attempt 2 (2026-09-08 04:58)**

| Field | Value |
|---|---|
| Attempts | 2 |
| Files | `components/bilateral-review-table/*.{ts,html,spec.ts}`, `bilateral-review.copy.ts`, `bilateral-review.component.{html,spec.ts}`, `bilateral-review.cy.ts` |
| Verification | `Tests: 459 passed`; lint clean; CT `49 passing`; `ng build` ok |
| Live evidence | HITL #2: 7 headers with Alignment, group headers 40 px, accent 3 px in-progress colour, pills as tints (4.51 / 6.87), primary "Review" 11.89, labels no overflow, rows 46 / 63, 11 rows visible in the first screen |
| Requirements covered | BRV-R-3..R-8, R-9 (a)(d), R-11; AC-4, 4b, 5, 6, 7, 7b, 8, 9, 10, 11, 13; scenario "Scan by color" |
| Decisions | (1) R-4: three `colspan` sites (the cards bar has none). (2) AC-6 truncation proven with a longer name in CT. (3) `hover:text-primary-700` added so hlm's ghost hover does not erase the emphasis. (4) `!p-0 !border-b-0` on the group header `td` (ambient `pr-table` padding was the 61 px root cause; the header's divider is now the tinted row itself — checked live). |
| Issues | Owner saw the transient `TS2339 copy.headers.indicator` compile error mid-task (copy updated before the template) — expected in-flight state, resolved within the task. |
| Gate | auto-approved (pre-approved mode) |

