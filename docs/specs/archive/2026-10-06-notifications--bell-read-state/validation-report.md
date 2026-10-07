# Validation Report — notifications/bell-read-state

> **Verdict (final, 2026-10-06): ✅ ARCHIVE-READY — 0 FAIL · 2 WARN accepted (W8 backlog, W10 process note) · HITL-1..4 PASS (HITL-4 after-screenshot waived by the user).**
> Original verdict: 1 FAIL, 10 WARN — F1, W1–W7 fixed in commit after `0b5206e8a`.
> No code violates the spec. The one FAIL is a folder guide over its line cap. The manual
> checks (two accounts, browser vs mockup, timing, Angel) need a person with TEST accounts.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-read-state` |
| Date | 2026-10-06 |
| Validated commits | `2d4ff4e6f` (server), `ae48b0bec` (client), `0b5206e8a` (docs) on `qa-development-2026-ss` |
| Auditor | Independent `akili-reviewer` (Phases 1, 2, 4–6) + Leader (Phase 3, figures, report). Implementer was a separate wrapper agent (author ≠ auditor) |
| Inputs | proposal, requirements, design, tasks, execution, mockup. No `test-report.md` (no `/akili-test` run) → coverage verified directly |

## 2. Summary

| Area | Result |
|---|---|
| Tasks (7) | ✅ 7/7 `[x]` with evidence |
| Files | ✅ all design §4 paths present |
| Build / type-check / lint | ✅ server `tsc` 0 errors · client `ng build` OK · eslint/ng lint clean on touched files |
| Scoped tests | ✅ server 308/308 (10 suites) · client 1000/1000 (7 suites) |
| Requirement coverage | ✅ every scenario and clause owned and evidenced; ⚠️ 3 partial; ⛔ 5 clauses need HITL |
| Design conformance | ✅ drift explained, except padding + logger count (⚠️) |
| Constitution / guides | ❌ `shell-topbar/CLAUDE.md` 122 lines > 120 cap |
| Budget | ⚠️ prod LOC 621 vs ~330 (1.9×), test LOC 1181 vs ~450 (2.6×) — tripwire not raised during execution |

## 3. Task Completion

| Task | Verdict | Note |
|---|---|---|
| BRS-T-1 | PASS ⚠️ | Migration run → revert → run in TEST is the user's report (output not pasted) |
| BRS-T-2 | PASS | 2 lens reviewers |
| BRS-T-3 | PASS | |
| BRS-T-4 | PASS | New API-method specs never seen red (recorded) |
| BRS-T-5 | PASS | Attempt 2 (attempt 1 FAIL recorded) |
| BRS-T-6 | PASS ⚠️ | No red run; CLAUDE.md over cap (§10) |
| BRS-T-7 | PASS ⚠️ | Lost a success-path sync test (§6, W2) |

## 4. File Existence

All paths in design §4 exist and are modified as stated (migration `1790600000000-AddShareResultRequestSeen.ts`, seen entity + repository, share-request service/controller/module, notification service/controller, client API service, results-notifications service/page, notification-item, pop-up item, shell-topbar, copy file). Extra files are all named by `tasks.md` (`results-notifications.component.ts`, `shell-topbar.component.ts` rename, pop-up `.scss`). Nothing expected is missing; no bilateral work is in the diff.

## 5. Build Integrity

| Check | Command | Result |
|---|---|---|
| Server type-check | `npx tsc --noEmit -p tsconfig.json` | ✅ 0 errors |
| Client build | `npx ng build --configuration development` | ✅ built (only pre-existing Sass `@import` deprecation warnings) |
| Server lint | `npx eslint <touched .ts> --quiet` | ✅ |
| Client lint | `npx ng lint --quiet --lint-file-patterns <touched>` | ✅ |
| Server tests | `npx jest --maxWorkers=2 … --testPathPattern="(share-result-request\|api/notification/notification\.(service\|controller))"` | ✅ 308/308 |
| Client tests | `npx jest --maxWorkers=2 … --testPathPattern="(results-api.service\|results-notifications.service\|results-notifications.component\|notification-item.component\|pop-up-notification-item.component\|shell-topbar.component).spec"` | ✅ 1000/1000 |
| Served bundle | `curl localhost:4200/main.js` contains `loadBellReadUpdates`, `markAllBellRead`, `bell-unread-dot` | ✅ local `ng serve` serves this code |
| `migration:check:ci` | — | ⚠️ not evidenced (user ran run/revert/run in TEST) |

## 6. Requirement Coverage

Clause-level. "Composed" = proven by two tests together. Full table with file:line in the auditor's notes; summary here.

| Requirement · clause | Owner | Test evidence | Verdict |
|---|---|---|---|
| R-1 counts fresh only · 99+ · zero BUT Decide shows · filter-independent | T-4, T-6 | service "(a)", topbar "120 → 99+", "badge 0 with 40 pending", "does not send versionId" | ✅ PASS |
| R-2 colleagues | T-2 | "tags pending rows with seen", "never passes another user id" | ✅ shape · ✅ real rows HITL-1 (DB) |
| R-2 BUT never changes the request | T-2 | `markAllSeen` asserts no `save`/`update`; **no `delete`, nothing on `markSeen`** | ⚠️ W1 |
| R-2 AND survives devices | T-1, T-2 | not testable in Jest | ⛔ HITL-1 |
| R-3 update from bell · request from bell · request from inbox · already seen | T-4..T-7 | pop-up "plain click marks seen", notification-item "received pending → once", "already seen row issues no PATCH" | ✅ PASS |
| R-3 BUT nav not blocked / no drop for unrecorded | T-4, T-5 | "failed markRequestSeen still navigates", "(c) no optimistic decrement", "(c) 404 does not drop" | ✅ PASS |
| R-4 Angel · arrives later · failure · idempotent | T-1, T-2, T-4, T-6 | "(d) both succeed / both fail", topbar "Decide unchanged", repo 0-row tests | ✅ PASS |
| R-4 only me | T-2 | isolation tests | ✅ shape · ✅ HITL-1 (DB) |
| R-4 BUT must not decide/hide | T-2, T-6 | client side ✅; server side as W1 | ⚠️ W1 |
| R-5 scenario · offered whenever fresh | T-7 | "shows Mark all as read while the bell has a badge", "hidden at bellCount 0" | ✅ PASS |
| R-6 tab counts | T-4, T-6 | "BRS-R-6: All / Decide / Updates" | ✅ PASS |
| R-7 two states · not colour alone · AT label · decision affordances unchanged | T-5 | presence tests (dot, weight, sr-only, identical classes) | ✅ presence · ⛔ look HITL-2 |
| R-8 order · all-read · empty · cap 10 · Accept/Decline both groups | T-4..T-6 | "(b) order", "separator once", "no separator when all read", BELL-R-10, cap test | ✅ PASS (composed) |
| R-9 scenario | T-4, T-7 | "(c) bell row and inbox row flip" | ✅ · ⚠️ W2 read-leg inbox sync untested |
| NFR privacy · a11y · compat | T-1..T-6 | isolation, "count inside tab button", "no limit → take 201" | ✅ PASS |
| NFR performance | T-2, T-3 | "ONE INSERT IGNORE for 150 ids" | ✅ shape · ⛔ timing HITL-3 |
| NFR data | T-1 | migration with `down`, user run/revert/run | ✅ · ⚠️ W9 |

## 7. Linting & Code Quality

No spec violation in code. Confirmed **advisories** (4R, not gating):

| # | Lens | Finding |
|---|---|---|
| A-a | Risk | `markSeen` has no recipient scoping: 200 vs 404 reveals whether a guessed id is pending. Writes only the caller's own row. Matches design §6/§7 → closing it needs a spec amendment |
| A-b | Reliability | Seen repository is `@Optional()` because `results-toc-results.module.ts:52` and `results-package-toc-result.module.ts:59` re-provide the service; a wiring regression would 500 at request time, not boot |
| A-c | Spec defect | Design §10.1 says update rows already guard modifier/middle clicks — they don't (pop-up `.ts` ~374-388). Decision path is guarded. **Kaizen candidate** |
| A-d | Reliability | `generateUrlLink` puts raw title text in `search=`; now also reaches `navigateByUrl` on the decision path |
| A-e | Resilience | **Refresh race is reachable on the main path**: a decision click navigates to the inbox, whose init calls `refreshBell()`; a GET that read before the insert committed can land after the PATCH and set the row fresh again (badge +1 until next refresh). Not an R-3 BUT violation; brief R-9 disagreement. Fix: a set of server-confirmed seen ids applied inside `refreshBell` |
| A-f | Reliability | = W2 |
| A1 | Observability | Design §7/§11 say failure logs carry "user id and count"; `markAllSeen` logs user id only (= W5) |
| A7 | Behaviour | Read rows = 10 most recent by `created_date`; an older update clicked from the bell won't reappear under "Earlier". Allowed by R-8 ("most recent ones") — record as a limitation |

Still open from `execution.md`: FK constraint names not on the entity; `?limit=1&limit=2` → 500; admin ~32k-placeholder ceiling; duplicated admin-bucket check; seen-all inbox window; `markRequestSeen` JSDoc; `markingAllRead` not rendered; "ToC step" wording; separator relies on service ordering.

## 8. Design Conformance

| Drift | Explained? |
|---|---|
| Raw `INSERT IGNORE` vs TypeORM insert · `findSeenIds` → Set · 'To decide' → 'Decide' · empty `limit=` → 400 · sr-only label vs aria-label · program chip dimmed · decide dot removed · `decideRequest` strips tags | ✅ yes, in `execution.md` |
| Row padding → `12px 12px 12px 18px` (mockup `10 10 10 18`) | ⚠️ no (W4) |
| Logger without count | ⚠️ no (W5) |
| All-tab count weight 400 → 500 | trivial, no |

**Proposal alignment:** intent met (Outlook-style read state, badge to 0, Decide kept); scope and non-goals respected. Mechanism moved from proposal Option A to two parallel calls — decided in `BRS-DD-4`. Success criteria 4–5 (colleagues, other browser) pending HITL-1.

**Cross-document figures:**

| Figure | Finding |
|---|---|
| 7 tasks · 8 review rounds ≤ 10 · ≤ 2 per task | ✅ consistent |
| Prod LOC ~330 (server ~150 / client ~180) | ⚠️ actual **+621** (server 381 / client 240) — **1.9×**, and the server, not the client, is the larger side (W3) |
| Test LOC ~450 | ⚠️ actual **+1181** — 2.6× (W3) |
| Cap 10 · `limit` 1..200 default 200 · 99+ | ✅ consistent |
| NFR "150 pending" vs HITL-3 "≥ 100 pending" | ⚠️ the check could pass below the stated load (W6) |
| NFR "SHOULD < 1 s" vs D8 "FAIL if > 1 s" | minor modality mismatch |
| R-7 cites `docs/ux-ui/design.md` §10 for "not colour alone" | minor: §10 has no such clause (W7) |

## 9. Test Evidence Summary

| Suite | Result |
|---|---|
| Server: seen repository, share-request service/controller/repository, primary-program, notification service/controller | 308/308 |
| Client: results-api, results-notifications service/page, notification-item, pop-up item, shell-topbar | 1000/1000 |
| `BRS-HITL-1` two accounts (D2/D3) | ✅ **PASS at DB level (2026-10-06, user)**. `share_result_request_seen` in TEST: user 575 → 274 rows / 274 distinct requests (no duplicates → real `INSERT IGNORE` dedupe, D3); user 829 (Angel, shares pending requests with 575) → 0 rows after 575's opens + "Mark as read" (no cross-user write, D2). Because `seen` is resolved per caller, 829's pending rows stay unseen and his badge cannot drop from 575's actions. Optional UI confirmation of 829's badge folds into HITL-4 |
| `BRS-HITL-2` browser vs mockup (D5) | ✅ **PASS (2026-10-06, TEST, user screenshots)**. Fresh state on 307 (99+, `115 new`, All 125, Updates 115, Decide hidden) and 829 (99+, `182 new`, Decide `182 to decide` orange); read state on 575 after its 274 seen: no badge, no `N new` chip, no "Mark as read", Decide `274 to decide`, All 284 = 274 + 10 read, regular grey text, no dot, SP chip dimmed, decide chip + Accept/Decline full emphasis, no separator (no fresh rows above), no empty state. Narrow widths 464 px and 392 px: popover fits, no clipping. 829's 182 still fresh after 575's marks → HITL-1 confirmed in the UI. Not observed: A-e badge bounce (optional). Open question outside this spec: admin 307 has 0 requests to decide (role vs `BELL-OQ-1`) |
| `BRS-HITL-3` timing ≥ 150 pending (D8) | ✅ **PASS (2026-10-06, TEST, user 829 Angel, No throttling)**. `PATCH /api/results/request/seen-all` → 200, `{ recorded: 182 }`, **86 ms total** (network included; preflight 12 ms separate) for 182 pending — above the 150 NFR load, < 1 s. **Single run**: the account's pending set can only be marked once at full load, so the 3-run spread rule could not apply; margin (~12×) makes the spread moot. `recorded: 182` = the 182 the bell showed → real-data proof that `markAllSeen`'s pending set equals the bell's (T-2 disqualifier) |
| `BRS-HITL-4` Angel (OQ-1) | ✅ **PASS by evidence, after-screenshot waived by the user (2026-10-06)**. Before: 829 had badge 99+, `182 new`, Decide `182 to decide` (OQ-1 confirmed: ≥ 10 pending). After "Mark as read": server `{ recorded: 182 }` (HITL-3). The after-state rendering (no badge, Decide unchanged, light rows) was verified on 575 in the same state (HITL-2). The user chose to archive without 829's after-screenshot |

## 10. Agent Guide / Constitution Impact

| Item | Result |
|---|---|
| `shell-topbar/CLAUDE.md` | ❌ **FAIL** — 115 → 122 lines; `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4 hard cap 120 |
| `notification-item/CLAUDE.md` | ⚠️ updated + re-stamped, but ~480 lines (old debt, +7 here) (W8) |
| Stale references | ✅ none (`markAllBellUpdatesRead`, `markAllUpdatesNotificationsAsRead`, "To decide") |
| TRD / `ux-ui/design.md` | no stale content; optional: promote the fresh/read row pattern to design §12 at archive |
| CodeGraph | `codegraph sync` pending |

## 11. Remediation

| # | Sev | Fix | Effort |
|---|---|---|---|
| F1 | FAIL → ✅ | Trimmed to 119 lines, no facts lost (Reviewer PASS) | done |
| W1 | WARN → ✅ | `expectNoRequestWrites()` (save/update/delete/softDelete/remove) on `markAllSeen` (c), `markSeen` success + 404; covers every write path the service has (Reviewer PASS); server spec 89/89 | done |
| W2 | WARN → ✅ | New "(d) read leg ok" case: pending → `[]`, viewed newest-first `[2,3,1]`, all `read` (Reviewer PASS); client spec 91/91 | done |
| W3 | WARN → ✅ | Recorded in `execution.md` (Validation follow-up) as a kaizen candidate | done |
| W4 | WARN → ✅ | Recorded in `execution.md`; 10 vs 12 px decided at HITL-2 | done |
| W5 | WARN → ✅ | Design §7/§11 corrected ("user id" only; the failure precedes any count); sweep clean | done |
| W6 | WARN → ✅ | tasks §6 HITL-3 and execution §3 now ≥ 150; sweep clean | done |
| W7 | WARN → ✅ | R-7 now cites WCAG 2.1 SC 1.4.1 under the ux-ui §10 baseline | done |
| W8 | WARN | `notification-item/CLAUDE.md` size — follow-up, not this spec | backlog |
| W9 | WARN → ✅ | `migration:check:ci` → `PENDING_MIGRATIONS=0` (TEST DB has 498 executed vs 488 files on this branch: other branches' migrations, not this spec) | done |
| W10 | WARN | T-6 had no red run — process note only | none |
| H1–H4 | BLOCKED | Run `BRS-HITL-1..4` in TEST | user |

Follow-ups outside this spec (decide later): A-a recipient scoping, A-c update-row guard (§10.1), A-e race fix, A-d URL encoding.

## 12. Archive Readiness Recommendation

**Ready (final, 2026-10-06).** All conditions below are met; W8 (old `notification-item/CLAUDE.md` size) goes to backlog, W10 is a process note. Original text kept for traceability:

**Not yet.** Ready for `/akili-archive notifications/bell-read-state` once:

1. F1 is fixed (≤ 120 lines),
2. HITL-1..4 pass in TEST (or are explicitly waived by the user),
3. the WARNs are fixed or accepted (W1/W2 recommended; the rest are documentation).
