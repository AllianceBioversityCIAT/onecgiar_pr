# Design — Bilateral AI Draft Results: "New" Indicator

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-draft-new-indicator/` |
| **Requirements** | `requirements.md` (same folder) — `ADN-R-1..5`, `ADN-AC-1..8`, `ADN-D1..D7` |
| **Depth** | Standard (confirmed by §Budget) |
| **Approval Mode** | gated |
| **Status** | approved (gated, 2026-10-27; `JUDGMENT: APPROVED ✅`) — revision 2, after Judgment Day round 1 (`judgment.md` JD-1..JD-8) |
| **Verified at** | `c3dd5409c` |
| **Baseline cited** | `docs/prd.md` US-S1 · `docs/ux-ui/design.md` §7, §8 patterns 10–11, §10, DD-9, DD-12 · `docs/trd/trd.md` `bilateral` client module |
| **Kaizen lessons applied** | `docs/specs/kaizen-log.md` does not exist. `bilateral--ai-processing-feedback` **L1** (measure the baseline before any overflow check) shapes the HITL check in `ADN-DD-4` |

---

## 1. Summary

The feature is **client-only**. `BilateralAiService` already sees the viewer's own jobs move from active to terminal (`detectTerminalTransitions`). It will now also keep a session-scoped set of **fresh job ids**, and reload the drafts list (latest response wins) when such a job completes with drafts. `MyDraftResultsComponent` flags the session groups whose job id is in that set and renders a violet **"New" badge** on them. It remembers which fresh ids it actually showed, and consumes those ids when the page is destroyed or the center changes.

Trade-off accepted (product decision, `requirements.md` §3.3): the state lives only in memory, so a reload after completion loses it.

---

## 1A. Premise Ledger

Count: **14 verified, 0 `UNVERIFIED`** (0 High, 0 Low).
Blast-radius triggers: **live-path** (user action "job finishes → open Draft Results"; branch point: center switch) · **shared-state** (`BilateralAiService.draftList` gets a new writer and `loadAllDrafts` gains a guard; the session card already styled by `--me`) · **consumer** (`DraftSessionGroup` gains a field; `detectTerminalTransitions` and `loadAllDrafts` change).

Paths are relative to `onecgiar-pr-client/` unless prefixed with `onecgiar-pr-server/`.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The jobs list the client polls holds only the caller's jobs, so "own job" needs no client-side user check | data-env | `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:337-360`, where both queries filter `user_id: userId` / `job.user_id = :userId` | `c3dd5409c` | `ADN-DD-1` adds a check of `draft.job.user_id` against the session user. The field is already read at `my-draft-results.component.ts:439`, so no payload change is needed. Low | — |
| P-2 | A job is "newly terminal" only when the previous poll had it active, so a job already terminal at the first poll is never reported | existence | `src/app/pages/bilateral/services/bilateral-ai.service.ts:379-392` (`prev !== undefined && ACTIVE_STATUSES.has(prev.status)`) | `c3dd5409c` | `ADN-AC-3` breaks; `ADN-DD-1` needs its own seen-active guard. Low | — |
| P-3 | Nothing reloads the drafts list when a job completes | existence | From `onecgiar-pr-client/`: `grep -rn "loadAllDrafts()" src/app --include='*.ts' \| grep -v spec` returns 7 lines: 5 **call sites** (`bilateral.component.ts:28`, `ai-processes-drawer-host.component.ts:106`, `my-draft-results.component.ts:357`, `bilateral-ai.service.ts:117`, `:445`), the definition `:451` and a comment `:112`. No call site is in `detectTerminalTransitions` | `c3dd5409c` | `ADN-DD-2` is unnecessary. Low | — |
| P-4 | `unseenFinishedIds` is cleared whenever the drawer opens, so it cannot be reused as the fresh-job set | existence | `bilateral-ai.service.ts:148-153` (`openDrawer` → `this.unseenFinishedIds.set(new Set())`) | `c3dd5409c` | Reuse it instead of adding a new signal. Low | — |
| P-5 | `BilateralAiService` is a root singleton: it survives tab navigation and a reload resets it | location | `bilateral-ai.service.ts:54` `@Injectable({ providedIn: 'root' })` | `c3dd5409c` | Fresh ids would die on a tab change, and `ADN-R-3`'s "not yet visited" scenario fails. **High** | — |
| P-6 (live-path) | Every entry to Draft Results mounts `MyDraftResultsComponent` on route `drafts`. Leaving for another tab or a result destroys it. Review is an in-page aside | live-path | Route: `src/app/shared/routing/routing-data.ts:743-749`. Entry points: drawer `ai-processes-drawer-host.component.ts:108` (`?job=`), toast `bilateral-ai.service.ts:446`, bell `src/app/shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.ts:404-411` (`navigateByUrl(path)`; the server link is `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts:190`), header tab `bilateral-page-header.component.html:360`. Reuse: `src/app/shared/components/ai-assistant/prms-route-reuse.strategy.ts:15-20` special-cases only `params['id']` and otherwise defers to the default, which reuses on the same `routeConfig` and destroys on a different route. Review: `my-draft-results.component.ts:772-774` (`selectedDraft.set`, no navigation) | `c3dd5409c` | If Review navigated away, `ADN-AC-6` fails. **High** | — |
| P-7 (shared-state) | Readers of `draftList` all see the extra reload, and `loadAllDrafts` never resets the loaded flag | shared-state | `grep -rn "draftList()" src/app --include='*.ts' --include='*.html' \| grep -v "spec\|\.cy\."` → 3 readers: `bilateral-overview.component.ts:311`, `my-draft-results.component.ts:392` (`allDrafts`), `bilateral-ai.service.ts:102` (`draftCount` → header badge `bilateral-page-header.component.html:369`). The other 2 hits are comments (`bilateral-overview.service.ts:35`, `bilateral-overview.aggregate.ts:87`). `loadAllDrafts` at `bilateral-ai.service.ts:451-466` sets `draftList` and `isDraftListLoaded(true)` and never sets it to `false`, so there is no skeleton flash | `c3dd5409c` | A reader that cannot handle a mid-page list swap needs a guard. Low (all three are `computed`) | — |
| P-8 (consumer) | Test files that pin the changed symbols | consumer | `grep -rln "GET_bilateralAiDrafts\|loadAllDrafts" src cypress \| grep "spec\|cy\."` → 7 files: `bilateral.component.spec.ts`, `ai-processes-drawer-host.component.spec.ts` (`:163` asserts `toHaveBeenCalledTimes(1)` on a stub, unaffected), `bilateral-ai-upload.component.spec.ts`, `bilateral-overview.cy.ts`, `bilateral-result-creator.component.spec.ts`, `my-draft-results.component.spec.ts`, `bilateral-ai.service.spec.ts` (`:391` "terminal diff toasts" drives real transitions). `grep -rn "DraftSessionGroup\|sessionGroups()" src --include='*.ts'` outside the component → only `my-draft-results.component.spec.ts` (`:793,811,1185,1217,1245,1269`) | `c3dd5409c` | A pinning spec not listed here goes red in CI. Low | — |
| P-9 (shared-state) | Every own-job session card already has a 4px green left border from an unlayered SCSS rule that beats Tailwind's layered utilities. A New group is always an own job | shared-state | `my-draft-results.component.html:241` (`[class.mdr-session-card--me]="group.isCurrentUser"`); `my-draft-results.component.scss:221-242` (`.mdr-session-card` border + `&--me { border-left: 4px solid … }`); `src/styles.scss:5` `@layer theme, base, components, utilities;` | `c3dd5409c` | A card-level accent would become viable. This row is why `ADN-DD-4` uses the badge only. **High** (refuted the revision-1 accent, JD-1) | — |
| P-10 (live-path) | Switching center on the Drafts tab changes only the parent `:acronym` param, so the shell and the Drafts component are reused, not destroyed. The shell clears `centerInstitutionId` until the new center resolves | live-path | `src/app/pages/bilateral/bilateral.component.ts:30-45` (subscribes to `paramMap`, `setCenter(..., sameCenter ? … : null)`); the reuse rule is the same as P-6 | `c3dd5409c` | If the component is destroyed on a switch instead, the center-change consume in `ADN-DD-5` is redundant but harmless. Low | — |
| P-11 (shared-state) | Polling runs on every route (the watcher is in the app shell), and `loadAllDrafts` silently returns when no center is resolved | shared-state | `src/app/app.component.html:67` (`<app-bilateral-ai-job-watcher>`); `bilateral-ai.service.ts:452-453` (`if (centerId == null) return;`) | `c3dd5409c` | A completion outside the bilateral module would hit the wrong path. `ADN-DD-2` states this no-op case and relies on `ngOnInit`'s load (`my-draft-results.component.ts:357`) at the next visit. Low | — |
| P-12 (shared-state) | `loadAllDrafts` has no cancel or latest-wins handling, and several callers can overlap (shell init, component init, toast, drawer, the new reload) | shared-state | `bilateral-ai.service.ts:457-465` (plain `subscribe`, the last response to arrive wins); the callers are as in P-3 | `c3dd5409c` | The guard in `ADN-DD-2` is unnecessary. Low | — |
| P-14 | Tailwind `xl` fires at 1280 px: the project sets no `--breakpoint-*` override, and media-query `rem` resolves against the 16 px initial value, not the 12 px `html` font | data-env | `grep -n "breakpoint" onecgiar-pr-client/src/styles.scss` → 0 hits; `docs/specs/notifications/detail-side-panel/design.md:47` `(min-width: 1280px)` | `c3dd5409c` | The HITL widths in `ADN-R-4` would miss the switch point. Low | — |
| P-13 | A reload while a job is active restarts polling, so a mid-run reload still observes the completion | existence | `bilateral-ai.service.ts:123` (`if (legacyJobId \|\| this.hasActiveHint()) this.ensurePolling();`) plus P-2 | `c3dd5409c` | The wording in `requirements.md` §3.3 would be wrong again. Low | — |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** none.
- **Client modules touched:**
  - `pages/bilateral/services/bilateral-ai.service.ts`
  - `pages/bilateral/pages/my-draft-results/`: the component `.ts` and `.html`, and the folder `CLAUDE.md`
  - `internationalization/bilateral-ai-processes.copy.ts`
- **External integrations touched:** none.

### 2.2 Sequence

```
[poll, app-wide — P-11] GET …/ai/jobs (own jobs, P-1)
  └── detectTerminalTransitions
        ├── job was active, now COMPLETED, resultCount > 0
        │     ├── freshDraftJobIds = new Set([...prev, jobId])     (ADN-DD-1)
        │     └── loadAllDrafts() — once per poll, latest wins     (ADN-DD-2)
        │           └── no center resolved → no-op; next visit loads (P-11)
        └── existing: unseenFinishedIds, toasts (unchanged)

[Draft Results rendered]
  sessionGroups(): group.isNew = freshDraftJobIds.has(group.sessionId)   (ADN-DD-3)
  shownFreshIds += ids of isNew groups (component-local)                 (ADN-DD-5)
  template: "New" badge in the session header                            (ADN-DD-4)

[Leave tab: ngOnDestroy]  or  [center change while mounted: P-10]
  consumeFreshDraftJobs(shownFreshIds); shownFreshIds = ∅                (ADN-DD-5)
```

---

## 3. Data Model Changes

None. No entity, migration, or CLARISA change.

## 4. API Surface

None. No endpoint is new or changed, and `bilateral-result-summaries.en.md` is untouched (`ADN-R-5`).

## 5. Server Workflow / Business Rules

None (client-only).

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change (P-6).

### 6.2 Components & services

| Unit | Change | Requirement |
|---|---|---|
| `BilateralAiService` | <ul><li>New public signal `freshDraftJobIds` holding a `ReadonlySet<string>` (writable, like `unseenFinishedIds`; amended 2026-10-27 at execute, ADN-T-1 advisory), always **replaced** with a new `Set` and never mutated, so `computed`s re-run. This is the same idiom as `unseenFinishedIds` at `:385-389`.</li><li>In `detectTerminalTransitions`, each newly terminal job with status `COMPLETED` and `resultCount > 0` is added to the set.</li><li>When at least one job was added in a poll, `loadAllDrafts()` is called **once**.</li><li>New method `consumeFreshDraftJobs(jobIds)`.</li><li>Toasts and `unseenFinishedIds` are untouched.</li></ul> | `ADN-R-1`, `ADN-R-2`, `ADN-R-3` |
| `BilateralAiService.loadAllDrafts` | A request-sequence guard (P-12). The counter increments only **after** the `centerId == null` early return. A superseded response, whether success or error, is ignored. When the newest call errors, it still sets `isDraftListLoaded(true)` and keeps the current list. The lookups (`loadProjectNames`, `loadInitiativeNames`) are unchanged, so a reload stays at 3 GETs, as the NFR states | `ADN-R-2` |
| `DraftSessionGroup` (exported interface) | New field `isNew: boolean` | `ADN-R-1` |
| `MyDraftResultsComponent.sessionGroups` | Reads `freshDraftJobIds()` and sets `isNew` by `sessionId` (= `job_id`). Groups keyed by the `draft-<id>` fallback are never new | `ADN-R-1` |
| `MyDraftResultsComponent` (consume) | <ul><li>A component-local `shownFreshIds` collects the ids of the `isNew` groups that `sessionGroups()` has produced (an effect that reads `sessionGroups()` unconditionally — page-guide trap).</li><li>On `ngOnDestroy`, and on every transition of `ctx.centerInstitutionId()` **away from a non-null value** (X→null or X→Y; `null`→X never consumes) (P-10), the component calls `consumeFreshDraftJobs(shownFreshIds)` and clears the set.</li><li>Create Result (`promoteDraft`, `bilateral-ai.service.ts:514-536`) navigates to the result editor and destroys the page, so it consumes **all** shown ids. Delete (`discardDraft`, `:551`) navigates to the same `drafts` route, which reuses the page and keeps them.</li><li>A job whose drafts never reached the list stays fresh.</li><li>A job whose only draft was promoted is still consumed, because it was shown.</li></ul> | `ADN-R-3` |
| Template (session header) | Badge placed after the creator badge. No card-level styling change (P-9) | `ADN-R-4` |
| `BILATERAL_AI_PROCESSES_COPY` | New `drafts.newBadge` section: label `New`, plus the screen-reader suffix `generated in your latest AI run` | `ADN-R-4`, DD-9 |
| `my-draft-results/CLAUDE.md` | Contract: the New badge, `freshDraftJobIds`, the consume rule. Traps: P-9 (unlayered `--me` border) and the center-switch reuse (P-10). Bump `Verified:`. The file is **already at the 120-line hard cap** (`wc -l` = 120; `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4), so existing text must be trimmed to stay ≤ 120 | client guide rule |

The state boundary: the fresh set lives in the root service (P-5), and the per-visit "shown" set lives in the component. Nothing is stored in `localStorage`.

### 6.3 Design system usage

| Element | Token / class source |
|---|---|
| Badge | The violet badge of design.md §8 pattern 10 (`bg-violet-50 text-violet-700 border border-violet-200`), with the pill shape and size of the existing draft-count pill (`px-[8px] py-[1px] text-[11px] font-semibold rounded-full`). Tailwind utilities on a new element, so P-9's layering does not apply |
| Icon | `material-icons-round` `auto_awesome` at 14px, with `aria-hidden="true"` |
| Card | Unchanged. The existing green `--me` accent and the `?job=` ring stay as they are |
| Text alternative | Visible `New`, plus an `sr-only` suffix from the copy file |
| Responsive | The header row is `flex-wrap` (`my-draft-results.component.html:248`). At `xl` (1280 px, P-14) it switches to a single row with `justify-between`, and the project title truncates at `xl:max-w-[280px]` (`:274`, `:281`). The badge sits in the left cluster |

### 6.4 Real-time / notification UX

No new socket event or notification setting. The polling cadence is unchanged.

---

## 7. Security & Authorization

There is no new input, endpoint, or storage. "Own job" is enforced by the server scope of the jobs list (P-1). Nothing is logged.

## 8. Performance & Capacity

At most one extra `loadAllDrafts()` per poll cycle that sees at least one own completion with drafts. That is 3 GETs today: drafts, projects, and initiatives (`bilateral-ai.service.ts:455-457`). Polls run every 5–30 s, and only while a job is active or the drawer is open.

## 9. Observability

None added.

---

## 10. Testing Plan (forward-looking)

| Defect class | Test |
|---|---|
| `ADN-D1` | Service spec, using the multi-poll harness of `bilateral-ai.service.spec.ts:391`: the fresh set for COMPLETED>0, COMPLETED=0, FAILED, a job terminal at the first poll, and a job active at the first poll after a "reload" (fresh service + active hint). Component spec: `isNew` only on matching groups |
| `ADN-D2` | Service spec: `loadAllDrafts` runs once on a poll with 2 completions and never on a poll with none. Two overlapping `loadAllDrafts` calls whose responses arrive out of order leave the **later** call's data. Component spec: filters and `selectedDraft` survive a `draftList` swap |
| `ADN-D3` | Component spec: destroy consumes the ids. Center change consumes them. Review, filter, and delete of another draft keep them. A job absent from the list stays fresh. Create Result on any draft consumes all shown ids. A center change X→null→Y consumes; a cold `null`→X does not |
| `ADN-D4` | Spec: no write method of `BilateralApiService` is called on the indicator path |
| `ADN-D5` | `npx ng build --configuration development` |
| `ADN-D6`, `ADN-D7` | A Jest DOM assertion for the visible text and the `sr-only` suffix. HITL visual check at 375 / 900 / 1000 / 1280 px (host zoom 100 %), measuring the baseline header first (kaizen L1) |

## 11. Backwards Compatibility & Migration Plan

The change is additive. Rollback = revert the PR. No flag, no backfill.

---

## 12. Design Decisions (ADRs)

### `ADN-DD-1` — Fresh-job set in `BilateralAiService`, fed by the existing transition detector

- **Context:** the product wants only own jobs the browser saw finish (§3.3). The detector already computes exactly that (P-1, P-2, P-13).
- **Decision:** a separate, immutably replaced signal, fed from `detectTerminalTransitions` and filtered to `COMPLETED` with drafts.
- **Alternatives:**
  - Reuse `unseenFinishedIds`. Rejected: the drawer clears it (P-4).
  - A server `is_new` / `seen_at` column. Rejected: it needs a migration and a payload change.
  - A time window on `completed_date`. Rejected: it contradicts the session-only decision.
- **Consequences:** one new public signal and one new public method on a shared service.

### `ADN-DD-2` — Reload drafts on own completion, latest response wins

- **Context:** `ADN-R-2` requires the drafts to appear without user action, and nothing reloads them today (P-3). Overlapping loads can land out of order (P-12).
- **Decision:**
  - Call `loadAllDrafts()` once per poll that added a fresh id.
  - Add a sequence guard so only the newest call writes.
  - When no center is resolved (outside the bilateral module), the call is a no-op. The id stays fresh and the component's own load at the next visit shows it (P-11).
- **Alternatives:**
  - Reload only while Draft Results is mounted. Rejected: the header badge and the overview would stay stale (P-7).
  - Fetch drafts only, without lookups. Rejected: it adds a second load path for a saving of two lookup GETs.
- **Consequences:**
  - `loadAllDrafts` changes behavior for all five callers, and only in the race case (out-of-order responses, or a superseded call's error).
  - The reload targets the center currently in context. A job of another center stays fresh until that center's tab is visited.

### `ADN-DD-3` — Mark at the session-group level

- **Context:** all drafts of one job are new together, and the list already groups by job (`BADR-R-8`).
- **Decision:** one badge per group.
- **Alternatives:**
  - A chip on every row. Rejected: redundant.
  - Sort new groups first. Rejected: the list is already newest-first (`created_date DESC`).
- **Consequences:** a filter that hides some rows of a new group still shows the badge on the remaining rows.

### `ADN-DD-4` — Badge only, reusing the pattern-10 violet tokens with a text label

- **Context:** `ADN-R-4` requires consistency and no reliance on color. The card's left edge is already taken by the green own-job accent, an unlayered SCSS rule that utilities cannot override (P-9, JD-1).
- **Decision:** the visible word "New", the violet tokens of the `Matches` badge, an `auto_awesome` icon, and **no card-level accent**.
- **Alternatives:**
  - A violet left accent. Rejected: inert or clashing (P-9).
  - Overriding `--me` in SCSS for new cards. Rejected: it changes a shipped own-job cue, a reversion.
  - The amber `Emerging` chip. Rejected: amber means warning.
  - Reusing the `?job=` ring. Rejected: it is a deep-link focus cue.
- **Consequences:** a single, text-labelled cue. The HITL check measures the header at 375 / 900 / 1000 / 1280 px before and after (kaizen L1).

### `ADN-DD-5` — Consume what was shown, on destroy or on center change

- **Context:**
  - `ADN-R-3` keeps the mark until the user leaves the tab, a center switch included.
  - A center switch does not destroy the component (P-10).
  - When the page is destroyed, `allDrafts()` may already hold another center's drafts or have lost a promoted draft.
- **Decision:**
  - Collect the ids actually rendered as New in a component-local set.
  - Consume them on `ngOnDestroy` and on every transition of `centerInstitutionId` away from a non-null value; Create Result also consumes, because it navigates away.
- **Alternatives:**
  - Consume on mount. Rejected: the mark would be gone before it renders.
  - Match against `allDrafts()` at destroy (revision 1). Rejected: wrong after a center switch or the promotion of a last draft (JD-2, A-6).
- **Consequences:** depends on P-6 (Review stays an aside). The "shown" effect must read its signals before any early return (page `CLAUDE.md` trap).

**Reversion challenge (Step 2.3):** not triggered. Only `ADN-DD-2`'s guard alters shipped code, and it narrows a race without removing behavior. `ADN-DD-4` explicitly avoids overriding the `--me` accent.

---

## 13. Open Gaps & Follow-ups

- Session-only state: a reload after completion, or a second tab, loses the mark or does not share it (accepted, `requirements.md` §8).
- Layout and contrast have no automated gate (`ADN-D6`/`ADN-D7`); they are covered by the HITL check.
- Pre-existing race, accepted: a reload issued just before an optimistic promote/discard removal can briefly bring the removed draft back until the next load. The new auto-reload makes this slightly more likely; the guard does not cover it (RB-6).

---

## Budget

| Measure | Estimate |
|---|---|
| Tasks | 2 |
| LOC | ~290 (≈80 production, including the guard and the consume effect; ≈190 tests; ≈20 guide, net 0 lines after trimming to the cap) |
| Review rounds | 3 (one per task, plus one margin) |

This matches Standard depth. If execution exceeds the budget, it stops and escalates.

---

## Required cross-references

- `requirements.md` (same folder)
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`
- `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md` (Traps: the live `queryParamMap`, the scroll helper, effect tracking)
