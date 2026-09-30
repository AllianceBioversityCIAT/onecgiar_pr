# Tasks — "Report manually" Opens the Normal Create Drawer

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `ai-queue-report-manually`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Ticket:** P2-3853 · commits `<emoji> <type>(<scope>) [P2-3853] [SPEC:bilateral/ai-queue-report-manually]: …`
- **Owner / driver:** Juan David Delgado
- **Status:** done
- **Budget (design §10):** 4 tasks · ~220 LOC · 1–2 review rounds per code task. Exceeding it → the Leader stops and escalates.

## 2. Pre-flight checklist

- [ ] Branch `JuanGuzman-io/p2-3853-jira-understanding`. Re-check it before every commit (memory: the branch changes under other terminals).
- [ ] `src/environments/environment.ts` present in the client (gitignored; without it every suite dies with `Cannot find module`).
- [ ] Client suites are run **scoped**: `npx jest <path> --silent --reporters=summary --no-coverage`.

## 3. Task list

### [x] `ARM-T-1` — Flow service: `beginFromJob`, `externalEntry`, close on path change

- **Type:** client
- **Description:** Add to `BilateralManualCreateFlowService`:
  - **`beginFromJob({ projectId, centerId, centerAcronym })`:**
    - No-op when any field is missing.
    - In-place rule from the router URL (design §7.2): segment 1 = `bilateral`, segment 2 = `centerAcronym`, segment 3 ≠ `result`. When the rule fails, it navigates to `['/bilateral', centerAcronym, 'home']` with no query params and continues only if navigation resolves `true`.
    - Then one `GET_bilateralProjects(centerId)`. Find `Number(p.id) === projectId`, then `beginFromProject(p)` and emit `externalEntry`.
    - Not found, or request error → `api.alertsFe` error toast, drawer closed.
    - A request token so a superseded call never opens the drawer.
    - It does not write `creationService.projects()`.
  - **`externalEntry`:** an event with no replay.
  - **Close on path change:** subscribe to router `NavigationEnd`; `closeDrawer()` when the path (without query or fragment) differs from the path recorded at open. `beginFromJob` records the path after its own navigation.
  - **Copy:** the not-found toast text goes in `internationalization/bilateral-manual-create.copy.ts`.
- **Implements:** `ARM-R-1` state half (A: "Program step visible with no Program chosen", "must NOT open on the Manual entry form"; B: "Program already chosen", "no reporting way is preselected"); `ARM-R-2` A ("goes to Center D's home", "must NOT navigate to `/create`", "must NOT carry `way` or `project`"), B (one shot), C (outside bilateral), D (routing half: `result/:id` → home); `ARM-R-4` A ("opens only once the job's project is resolved", "must NOT open with an empty project or an empty Program list"), B, C; `ARM-NFR-2`, `ARM-NFR-3`; design DD-2, DD-4 (rule), DD-6, §7.1–7.3.
- **Files:** `pages/bilateral/services/bilateral-manual-create-flow.service.ts` (+spec), `internationalization/bilateral-manual-create.copy.ts`
- **Depends on:** — · **Blocks:** T-2, T-3 · **Estimate:** M
- **Review:** `full`. New async logic with a race guard and a router side effect.
- **Tests (flow spec, `Router` and `BilateralApiService` stubbed):**
  - In-place table:
    - `/bilateral/CIP/drafts` + job `CIP` → no `navigate`;
    - `/bilateral/CIP/result/123` + `CIP` → navigate home;
    - `/bilateral/ABC/home` + `CIP` → navigate `['/bilateral','CIP','home']` with no second argument (no query);
    - `/result/framework` + `CIP` → navigate home.
  - Found, 2 Programs → `drawerOpen()` true, `selectedReportingWay()` null, `selectedPrimarySp()` null. Found, 1 Program → the Program is chosen and the reporting way is still null.
  - Deferred `GET_bilateralProjects` (a `Subject` emitted after the click): drawer closed before the emit, open after.
  - Two calls, first response late → only the second project opens.
  - Not found / error → toast shown, drawer closed. Missing field → no HTTP, no navigate.
  - Navigate resolves `false` → no HTTP.
  - `externalEntry` fires on success only. A subscriber added after the success receives nothing (no replay).
  - Path change → `drawerOpen()` false. Query-only change → stays open.
  - Exactly one `GET_bilateralProjects` per call.
- **Verification:** `npx jest src/app/pages/bilateral/services/bilateral-manual-create-flow --silent --reporters=summary --no-coverage` · `npx tsc --noEmit -p tsconfig.app.json` · `npx tsc --noEmit -p tsconfig.spec.json` · `npx ng lint --quiet`
- **Falsifier:** drop the segment-3 `result` check → the `/result/123` row is red. Drop the token → the late-response case opens the first project (red). Resolve the catalogue synchronously in the implementation (open before the fetch) → the deferred case is red before the emit. Compare full URLs instead of paths → the query-only case closes (red).
- **Red run:** before the implementation, the new cases fail on their `expect` lines (`beginFromJob is not a function` is a compile or setup failure, **not** a red). Write the methods as empty stubs first, then observe the assertion-level reds.
- **Disqualifier:** a green where `GET_bilateralProjects` is `of(...)` (synchronous) in the race case is not evidence for R-4 A. A deferred emission is mandatory.
- **Consumers:** `bilateral-manual-create-flow.service.spec.ts`; the other `beginFromProject` specs keep passing unchanged: `bilateral-manual-create-drawer-host.component.spec.ts`, `bilateral-result-creator.component.spec.ts` (P-7).
- **Done:** all of the above green; falsifiers executed against the post-change code and observed red; no `new Date(`, hex or hard-coded copy added.
- **Skills:** `angular-developer`, `tdd`

### [x] `ARM-T-2` — Mount the create drawer once in the bilateral shell

- **Type:** client
- **Description:**
  - Import `BilateralManualCreateDrawerHostComponent` (standalone) into `BilateralModule`, and render `<app-bilateral-manual-create-drawer-host />` in `bilateral.component.html` next to the `router-outlet`.
  - Remove the mount and its import from `bilateral-result-creator` and from `bilateral-projects-panel` (template and `imports`).
  - Move the panel's DI-regression test (`bilateral-projects-panel.component.spec.ts:240-250`, which opens the drawer via `beginFromProject` and picks a primary Program with secondary Programs) to a spec that renders the host **without** `BilateralAutoSaveService`, so it renders the drawer's list-layout child tree with no creator-scoped provider (amended 2026-09-30: the accordion is not rendered in `list` layout; its optional-inject guard is `bilateral-sp-selector.component.spec.ts:377`).
  - Update the folder `CLAUDE.md` files of the creator, the projects panel and the drawer host to the single-mount model.
- **Implements:** `ARM-R-3` A ("the create drawer opens on `drafts`"), B ("exactly one create drawer is rendered", "AND IT MUST keep the current behavior of both existing entries"); design DD-1 (with its reversion-challenge items 1 and 2).
- **Files:** `pages/bilateral/bilateral.component.html`, `bilateral.module.ts`, `bilateral.component.spec.ts`; `pages/bilateral-result-creator/bilateral-result-creator.component.{ts,html}` (+spec if it asserts the host); `pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.{ts,html,spec.ts}`; host spec; the three `CLAUDE.md` files
- **Depends on:** T-1 (DD-6 must exist before the host outlives pages) · **Blocks:** T-4 · **Estimate:** S
- **Review:** `checklist`. Mechanical move, but the DI move needs a conformance check.
- **Tests:**
  - Shell spec: the rendered `BilateralComponent` contains exactly 1 `app-bilateral-manual-create-drawer-host`.
  - Creator and panel specs: 0 instances inside each component.
  - The moved DI test is green without an autosave provider.
  - Static gate: `grep -rn "<app-bilateral-manual-create-drawer-host" onecgiar-pr-client/src/app --include='*.html'` → exactly 1 hit, in `bilateral.component.html`. Baseline before the change: 2 hits (creator `:39`, panel `:448`).
- **Verification:** `npx jest src/app/pages/bilateral/bilateral.component src/app/pages/bilateral/pages/bilateral-home src/app/pages/bilateral/pages/bilateral-result-creator src/app/pages/bilateral/components/bilateral-manual-create-drawer-host --silent --reporters=summary --no-coverage` · `npx tsc --noEmit -p tsconfig.app.json` · `npx ng lint --quiet` · the static grep above
- **Falsifier:** leave the creator mount in place → the grep returns 2 and the creator "0 instances" spec is red. Add a required `inject(BilateralAutoSaveService)` to `BilateralSpSelectorComponent` → the host DI test is red (amended 2026-09-30; the original accordion mutation cannot go red because the drawer never renders the accordion).
- **Red run:** the shell "exactly 1" spec before adding the mount: 0 found, red on the count assertion.
- **Disqualifier:** a DI test that supplies a `BilateralAutoSaveService` mock proves nothing (the `bilateral-sp-selector.component.spec.ts:368-378` lesson).
- **Consumers:** `bilateral-projects-panel.component.spec.ts`, `bilateral-result-creator.component.spec.ts`, `bilateral-manual-create-drawer-host.component.spec.ts`, `bilateral.component.spec.ts`; comment-only references in `bilateral-accordion.component.ts:32`, `bilateral-ai-upload.component.ts:59,159`, `bilateral-ai-upload.component.spec.ts:364`, `bilateral-sp-selector.component.spec.ts:372` (update the text when it names the panel as the mount).
- **Done:** tests green, grep = 1, falsifiers observed red, `CLAUDE.md` files updated.
- **Skills:** `angular-developer`

### [x] `ARM-T-3` — AI drawer host delegates; the creator reacts to the external entry

- **Type:** client
- **Description:**
  - `ai-processes-drawer-host.onReportManually(job)` sets `service.drawerOpen(false)` and calls `manualCreateFlow.beginFromJob({ projectId, centerId, centerAcronym })`. It no longer calls `Router.navigate`.
  - `onUploadDifferentFiles`, `onViewDrafts` and `onStartWithEvidence` are untouched.
  - The creator subscribes to `externalEntry` (`takeUntilDestroyed`). On each event it sets `selectedReportingWay(null)` and resets autosave and MDS, without calling `closeDrawer()`.
  - Update the host spec case `ai-processes-drawer-host.component.spec.ts:144-148`, which today pins `way: 'manual'`.
- **Implements:** `ARM-R-1` A ("the AI drawer closes", "BUT the URL must NOT change"), C (parity: both reporting ways, by reusing `beginFromProject`); `ARM-R-5` A (both clauses); `ARM-R-6` A (non-regression); design DD-3, DD-5.
- **Files:** `components/ai-processes-drawer/ai-processes-drawer-host.component.ts` (+spec), `pages/bilateral-result-creator/bilateral-result-creator.component.ts` (+spec)
- **Depends on:** T-1 · **Blocks:** T-4 · **Estimate:** S
- **Review:** `checklist`.
- **Tests:**
  - Host: Report manually → `navigateSpy` not called, `drawerOpen()` false, `beginFromJob` called with `{ projectId: 88, centerId: <n>, centerAcronym: 'ALLIANCE' }`. Upload different files → still navigates with `way: 'ai'` (existing case kept).
  - Creator: with `selectedReportingWay('ai')` set, emit `externalEntry` → `selectedReportingWay()` null, `closeDrawer` not called, autosave `reset` called.
  - The creator's existing `?way=manual` parser specs (`:490-491`) stay green (DD-7).
- **Verification:** `npx jest src/app/pages/bilateral/components/ai-processes-drawer src/app/pages/bilateral/pages/bilateral-result-creator --silent --reporters=summary --no-coverage` · `npx tsc --noEmit -p tsconfig.spec.json` · `npx ng lint --quiet`
- **Falsifier:** keep the old `router.navigate` next to the new call → the "navigate not called" case is red. Remove the creator subscription → the `'ai'` → null case is red.
- **Red run:** the host case asserting `not.toHaveBeenCalled()` on navigate, before the change: red on that assertion (today it navigates).
- **Disqualifier:** a creator test that sets `selectedReportingWay` to `null` before emitting is inert. The fixture must start at `'ai'`.
- **Consumers:** `ai-processes-drawer-host.component.spec.ts` (`:144-148` rewritten), `ai-processes-drawer.component.spec.ts` and `ai-job-card.component.spec.ts` (emit-only, unchanged), `bilateral-result-creator.component.spec.ts`.
- **Done:** tests green, falsifiers observed red, and the grep `grep -rn "'manual'" onecgiar-pr-client/src/app/pages/bilateral/components/ai-processes-drawer --include='*.ts' | grep -v spec` returns 0.
- **Skills:** `angular-developer`

### [x] `ARM-T-4` — HITL live check (`ARM-D-1`)

- **Type:** tests (manual, at the HITL pause)
- **Description:** on the local stack (`docs/infrastructure.md` §6), with a job in `no_candidates` state:
  1. From `drafts`, `results` and `overview` of the same Center: the URL does not change; the create drawer shows the project, the Program step and both ways (AC-1, AC-2, AC-4).
  2. From `home` and `create`: one drawer in the DOM (DevTools count), and "+ Create result" and the wizard's Manual entry still work (AC-5).
  3. From another Center, and from a W1/W2 route via the completion toast: lands on `/bilateral/<D>/home` with no query params, the drawer opens once, and reloading does not reopen it (AC-3).
  4. From `result/:id`: goes home, the drawer opens, and returning to the result shows its project and Program unchanged (AC-9).
  5. On `create` with the AI way open: after Report manually, the page-level AI upload is gone (AC-7).
  6. **Focus and overlays (`ARM-NFR-1`):** after the AI drawer closes, focus is inside the create drawer, the Spartan dialog scrim is gone, and Tab stays in the create drawer. The drawer sits above the page header at 375 and 1280 px.
  7. Upload different files is unchanged (AC-8).
- **Implements:** `ARM-NFR-1`; live proof of `ARM-AC-1..9`.
- **Depends on:** T-2, T-3 · **Estimate:** S
- **Review:** `skip-eligible`. The claim to prove at execute time: this task changes no file; its output is the checklist result recorded in `execution.md`.
- **Verification:** the checklist above, recorded with the route, the viewport and pass/fail per item.
- **Falsifier:** a job on a project removed from the catalogue must show the not-found toast. If it opens a drawer, the check is red.
- **Red run:** n/a (manual).
- **Disqualifier:** a check done while a delegated agent runs a build is invalid (root `CLAUDE.md`, concurrency).
- **Consumers:** none.
- **Done:** all 7 items recorded pass, or failures reported verbatim.
- **Skills:** `claude-in-chrome` or `agent-browser` (when the user wants it driven)

## 4. Dependency graph

```text
T-1 ──► T-2 ──┐
  └───► T-3 ──┴──► T-4
```

## 5. Coverage (clause level)

| Clause | Owner |
|---|---|
| R-1 A "AI drawer closes" · "URL must NOT change" | T-3 |
| R-1 A "Program step visible, none chosen" · "must NOT open on Manual entry" · "ways visible, locked until a Program" | T-1 (signals) + T-4 §1 (rendered) |
| R-1 B "Program already chosen" · "no reporting way preselected" | T-1 |
| R-1 C parity · "MUST offer both reporting ways" | T-3 (reuses `beginFromProject`) + T-4 §1 |
| R-2 A "Center D's home" · "must NOT navigate to `/create`" · "must NOT carry `way`/`project`" · "opens once" | T-1 + T-4 §3 |
| R-2 B one shot | T-1 (no replay, in-memory intent) + T-4 §3 |
| R-2 C outside bilateral | T-1 (`/result/framework` row) + T-4 §3 |
| R-2 D `result/:id` · "MUST leave the edited result unchanged" | T-1 (row) + T-4 §4 |
| R-3 A on `drafts` | T-2 (shell mount) + T-4 §1 |
| R-3 B "exactly one" · "MUST keep both existing entries" | T-2 + T-4 §2 |
| R-4 A "opens only once resolved" · "must NOT open empty" | T-1 (deferred) |
| R-4 B toast, drawer closed | T-1 + T-4 falsifier |
| R-4 C no-op | T-1 |
| R-5 A no mixed state · "MUST NOT leave the AI upload open" | T-3 + T-4 §5 |
| R-6 A non-regression | T-3 + T-4 §7 |
| NFR-1 focus / one trap | T-4 §6 (no automated gate, `requirements.md` §8) |
| NFR-2 one call per click | T-1 |
| NFR-3 tokens and copy | T-1 (copy file), lint |

## 6. Rollout, cleanup, roll-back

- **Rollout:** client only; deployed by the pipeline on merge (never by agents).
- **Follow-up (out of scope):** the creator's `?way=manual` branch is now reachable only by a hand-typed URL (DD-7).
- **Roll-back:** revert the T-1..T-3 commits. There is no data or API change.
