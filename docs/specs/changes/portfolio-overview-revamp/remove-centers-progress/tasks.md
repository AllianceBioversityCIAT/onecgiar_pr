# Tasks — CGIAR Centers block: remove "Progress by Center"

## 1. Scope of this task list

- **Feature:** family #7 `remove-centers-progress` (client only)
- **Linked spec:** `requirements.md` (RCP-1..5, RCP-N1..N5) + `design.md` (§8, budget §11)
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** done (RCP-T-1 [x], RCP-T-2 [x] 2026-10-15)

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-10-15, Phase 1 gate)
- [x] `design.md` approved (2026-10-15, Phase 2 gate)
- [x] Open questions resolved (OQ-1: keep the donut and tiles)
- [x] No conflicting in-flight spec. #3 `centers-new-vs-replicated` touches the same folder but is still `pending`, so this spec runs first (`family.md`)
- [n/a] CLARISA and migrations: none

## 3. Task list

### RCP-T-1 — Remove the card, move the error recovery, update the specs

- **Type:** client + tests
- **Description:**
  - Implement design §8.1–§8.5 in one pass, because the template, the component, the charts, the copy and the spec only compile together:
    - Delete the Progress by Center card and its state, handlers, builders, icons and copy keys.
    - Add the `role="status"` partial note + `retryFailedCenters()` button and the empty-catalogue message.
    - Strip the sort side effect from `toggleStatus()`.
  - Rewrite, delete and add the component spec cases exactly as listed in design §8.5.
  - Delete the two builder cases in the charts spec.
- **Implements:** RCP-1, RCP-2, RCP-3, RCP-4, RCP-5, RCP-N1, RCP-N2, RCP-N3, RCP-N5
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/centers-block/centers-block.{component.html,component.ts,component.spec.ts,charts.ts,charts.spec.ts}`
  - `onecgiar-pr-client/src/app/internationalization/portfolio-centers-block.copy.ts`
- **Depends on:** —
- **Blocks:** RCP-T-2
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan` (button styling consistent with the existing outline Retry; no new primitive expected)
- **Verification:**
  - **Falsifier:** each of these inputs makes the check fail:
    - The block still contains any of `detail-modes`, `detail-search`, `centers-table`, `centers-detail-chart`, or the text "Progress by Center".
    - With one Center mocked to error, `centers-retry-failed` is absent, or clicking it re-requests a healthy Center.
    - Two quick clicks issue two requests for the failed Center.
    - With every Center OK, the button renders.
    - With an empty catalogue, `centers-empty` is absent or a per-Center call is made.
    - The KPI fixture test reads a different total than before.
  - **Red run:** `cd onecgiar-pr-client && npm run test:local -- --testPathPattern=centers-block`. The new RCP-1, RCP-4 and RCP-5 cases are written first and fail on current code (the card exists, `retryFailedCenters` and `centers-empty` do not). They pass after the change. The kept "KPI cards show…" case passes **unchanged** both before and after; that is the RCP-2 evidence.
  - **Also:** `npm run build:dev` (template typecheck: catches a dangling reference to a deleted signal or copy key, which Jest with mocks can miss) and `npx eslint <touched .ts files> --quiet` (unused imports and icons).
  - **Disqualifier:** stop and re-specify instead of patching if either of these happens:
    - Removing the card requires changing `centers-block.aggregate.ts`, `centerTotals`, `segments` or `kpis`. Those would change figures, which RCP-2 forbids.
    - A deleted copy key or builder turns out to have a consumer outside `centers-block/`.

    If the RCP-2 KPI test needs its expectations edited to pass, that is a figure change, not a test fix.
  - **What the presence-assertions cannot prove:** that the status card has no layout gap or orphan spacing where the card was (jsdom has no layout). RCP-T-2 covers it.
  - **Consumers:**
    - `PORTFOLIO_CENTERS_BLOCK_COPY`: only `centers-block.component.ts`.
    - `buildShareOption` / `buildRowsTable`: only `centers-block.component.ts` + the charts spec.
    - `CenterRowState`: only the component and its spec.

    Re-grep before deleting.
- **Definition of done:**
  - [x] Scoped Jest green (`--maxWorkers=2`), build:dev green, eslint clean on the touched files
  - [x] Every row of design §8.5 is applied (kept, rewritten, deleted, new)
  - [x] No strings hardcoded in the template; new strings live in the copy file
  - [x] Not committed until the user says so (memory: no auto-commit)

### RCP-T-2 — Folder doc + read-only browser check

- **Type:** docs + manual check
- **Description:**
  - Update `portfolio-overview/CLAUDE.md` per design §8.6:
    - Re-stamp `Verified:`.
    - Centers block contents.
    - Retry-failed behavior.
    - "Removed on purpose" gains Progress by Center.
    - Center Overview shortcut note.
  - Then a read-only browser check of `/portfolio-overview` on the local stack:
    - Confirm the served bundle has the change first.
    - Do not click any write button (memory: local writes to the shared prdb).
    - Check at 1440px and 768px.
- **Implements:** RCP-N4; RCP-1 (layout clause: the block reads header → KPI cards → Reporting status, with no gap); RCP-3 (manual: the tile toggles and the Results Center link carries `?status=`)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md`
- **Depends on:** RCP-T-1
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible (doc) / HITL (visual)
- **Skills:** `cognitive-doc-design` (doc), `claude-in-chrome` (browser check)
- **Verification:**
  - **Falsifier:** at either width, any of these fails the check:
    - an empty bordered card or a double gap remains below the Reporting status card;
    - the "Progress by Center" title is visible;
    - clicking the Editing tile does not show the Active filter strip.
  - **Red run:** n/a (no test gate: layout is a visual property)
  - **Disqualifier:** if the served bundle cannot be confirmed to contain RCP-T-1, the screenshot is not evidence; report it as inconclusive instead of passing it. A forced Center failure is not reproduced in the browser (that needs a write or network tampering); RCP-4 rests on the Jest evidence.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [x] `CLAUDE.md` updated and re-stamped
  - [x] Screenshots at 1440 and 768 shown to the user at the HITL pause, or the check reported as inconclusive with the reason

## 4. Coverage (scenario and clause level)

| Requirement clause | Owner |
|---|---|
| RCP-1 THEN no card / no toggle, search, table or chart | T-1 (new absence test) |
| RCP-1 AND block order header → KPIs → status | T-2 (visual) + T-1 (DOM order in the absence test) |
| RCP-1 BUT header, phase chip, KPIs and status are not altered | T-1 (kept KPI test + kept status-tile test) |
| RCP-1 AND IT MUST NOT show a table skeleton while loading | T-1 (`skeletonRows` deleted; absence test runs in the loading state too) |
| RCP-2 THEN figures are equal | T-1 (unchanged KPI test passes before and after) |
| RCP-2 AND IT MUST keep one call per Center, no new request | T-1 (kept "one call per Center" test) |
| RCP-3 click → pressed + donut + active strip + `?status=` | T-1 (rewritten tile test) + T-2 (manual) |
| RCP-3 second click / Clear clears | T-1 (rewritten tile test) |
| RCP-3 BUT no sort or search dependency | T-1 (`toggleStatus` stripped; sort state deleted) |
| RCP-4 note + button on failure | T-1 (rewritten failure test) |
| RCP-4 retry only the failed ones, figures update | T-1 (rewritten failure test) |
| RCP-4 note and button disappear on recovery | T-1 (rewritten failure test) |
| RCP-4 BUT no duplicate requests | T-1 (rewritten double-click test) |
| RCP-4 AND IT MUST NOT show when nothing failed | T-1 (new test) |
| RCP-5 empty message + no per-Center call | T-1 (rewritten empty test) |
| RCP-N1 no dead code | T-1 (eslint + build:dev + grep of consumers) |
| RCP-N2 no server change, no new request | T-1 (files list is client-only; one-call test) |
| RCP-N3 copy in the copy file | T-1 (DoD) |
| RCP-N4 folder doc | T-2 |
| RCP-N5 real button + `role="status"` | T-1 (failure test asserts the `button` element and the live-region role) |

## 5. Sequencing

T-1 → T-2. Run them serially, with no parallel agents (one Jest run at a time on this machine).
