# Tasks — Portfolio Overview: CGIAR Centers block, W3 only, New vs Replicated

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/centers-new-vs-replicated/` |
| Depth | Standard |
| Approval Mode | gated (requirements and design rev 2 approved 2026-10-15, rebased on #7; no Judgment Day by user choice) |
| Budget | 3 code tasks + 1 human check · ≈ 240 LOC changed · 1 review round per task · **tripwire: more than 4 tasks or more than 320 changed LOC** (`design.md` §14) |
| Precondition | 🛑 Family #7 `remove-centers-progress` is **executed and committed**, and `family.md` marks it `done`. `git status` shows no changes under `portfolio-overview/` before CNR-T-1 starts. Otherwise, HALT |

**Machine rule for every task:**
- Jest runs **always** with `--maxWorkers=2` and is scoped with `--testPathPattern`.
- Only one test run at a time on the machine.
- Lint runs only on the touched files with `npx ng lint --quiet --lint-file-patterns <files>` (the client has no ESLint flat config).
- No commit without the user's explicit OK.

**Paths:** `PO` = `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview`, `CB` = `PO/components/centers-block`, `I18N` = `onecgiar-pr-client/src/app/internationalization`.

**Order:** CNR-T-1 → CNR-T-2 → CNR-T-3 → CNR-T-H, serially.

## Clause ownership

| Requirement clause | Owner |
|---|---|
| CNR-1: every figure counts W3 rows only (total, % approved, Centers reporting, donut, tiles) | T-1 (`isW3Row`), T-2 (load-time filter + mixed-fixture spec) |
| CNR-1 Scenario 1 THEN: total 10, Editing 2, Approved 7 | T-2 |
| CNR-1 Scenario 1 BUT: the W3 Submitted row still counts in the total | T-2 |
| CNR-1 Scenario 2: a W1/W2-only Center is not in N | T-2 |
| CNR-1 Scenario 2 AND IT MUST: still counted in M | T-2 |
| CNR-2: total, New, Replicated; New + Replicated = total | T-1 (invariant), T-2 (`kpis()`), T-3 (rendered card) |
| CNR-2 AND IT MUST: the flag encodings | T-1 |
| CNR-2 Zero scenario | T-2 (logic), T-3 (rendered) |
| CNR-3: the origin restricts the donut and tiles | T-2 |
| CNR-3 AND: the active-filter strip names the origin | T-3 |
| CNR-3 AND: the KPI card unchanged | T-2 |
| CNR-3 BUT: Centers reporting and % approved unchanged by the origin | T-2 |
| CNR-3 toggle off (same button, or Clear filter) | T-2 (`toggleOrigin`, `clearFilters`), T-3 (DOM) |
| CNR-4: the filters compose; the tile is pressed and the donut highlights it as today | T-2 |
| CNR-4 AND: the strip shows "New · Pending review" | T-3 |
| CNR-4 AND: Clear filter clears both | T-2, T-3 |
| CNR-4 BUT: neither filter resets the other | T-2 |
| CNR-5: Tab, Enter/Space, `aria-pressed`, focus ring | T-3 (DOM), T-H (visible ring) |
| CNR-6: the subtitle without the Center-Overview claim; W3 per Center + shared rule | T-3 |
| CNR-7: the link carries `funding=bilateral` + status | T-2 |
| CNR-7: the link is hidden while origin ≠ all; Clear filter still there | T-2 (`showResultsCenterLink`), T-3 (DOM) |
| CNR-N1: no new request, no server change | T-2 (call count spec; diff check) |
| CNR-N2: derived; a late or retried Center updates every figure | T-2 (late-load + retry-under-filter specs) |
| CNR-N3: #7's loading / error / partial-retry / empty states keep working; skeleton on the counts | T-2 (#7's state specs green), T-3 (skeleton markup) |
| CNR-N4: strings in `I18N`, tokens, px | T-3 |
| CNR-N5: `PO/CLAUDE.md` updated and re-stamped | T-3 |
| Defect class: layout, 375 px, visible ring (no automated check) | T-H |
| Defect class: real-data reconciliation | T-H |

---

## [x] CNR-T-1 — Origin and source classifiers (pure functions)

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, Reviewer PASS attempt 1) |
| Size | S (≈ 60 LOC incl. spec) |
| Depends on | Precondition |
| Requirements | CNR-1, CNR-2 |
| Design | §6.2 aggregate table, CNR-P-1, CNR-P-2 |
| Skills | `angular-developer`, `tdd` |

**Scope:**
- `CB/centers-block.aggregate.ts`: add `isW3Row`, `isReplicatedRow`, `CenterOrigin`, `byOrigin` and `originCounts`, as in design §6.2.
- `buildCenterRow`, `sumRows` and `CENTER_STATUS_IDS` stay unchanged.

**Tests (red first), in `CB/centers-block.aggregate.spec.ts`:**
- **Encoding matrix:**
  - `1`, `'1'` and `true` are replicated.
  - `0`, `'0'`, `false`, `null`, `undefined` and a missing key are new.
- **`isW3Row`:** `'API'` → true; `'Result'` → false; missing → false.
- **`byOrigin`:** `all` / `new` / `replicated` on a 5-row fixture with 2 new and 3 replicated.
- **`originCounts` invariant:** on that fixture and on `[]`.

**Verify:**
1. `cd onecgiar-pr-client && npx jest --testPathPattern="centers-block\.aggregate\.spec" --maxWorkers=2 --silent --reporters=summary --no-coverage`. Red before, green after; the existing tests are untouched.
2. `npx ng lint --quiet --lint-file-patterns <the two files>`.

**Fail input:**
- `is_replicated === true` fails the `1` / `'1'` cases.
- Swapped `byOrigin` branches fail the 2-vs-3 counts.

**Disqualifier:**
- If new and replicated counts are equal in the fixture, the run is not evidence.
- If an existing `buildCenterRow` test had to change, report it.

**Done:** both verify steps pass; the diff of `buildCenterRow` / `sumRows` is empty.

---

## [x] CNR-T-2 — Component: W3-only load, origin signal, filter composition

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, Reviewer PASS attempt 1) |
| Size | M (≈ 120 LOC incl. spec) |
| Depends on | CNR-T-1 |
| Requirements | CNR-1, CNR-2, CNR-3, CNR-4, CNR-7, CNR-N1, CNR-N2, CNR-N3 |
| Design | §2, §6.2 component bullets, DD-1, DD-2, DD-4, DD-5, §10.1, §10.2 |
| Skills | `angular-developer`, `tdd` |

**Step 0 (CNR-P-6 check):** re-read `CB/centers-block.component.ts` and its spec as #7 left them. Confirm:
- `CenterRowState { code, acronym, state, row }`;
- `loadedCenterRows` → `centerTotals` → `kpis` / `segments`;
- `retryFailedCenters()` calls `loadCenter()`;
- `toggleStatus` has no sort side effect.

If any of these differs, **HALT** and report. Do not adapt silently.

**Scope** (`CB/centers-block.component.ts`, plus the `I18N` keys it needs to compile):
- `CenterRowState.row` → `w3Rows: BilateralCenterResult[] | null`. `loadCenter` stores `(envelope?.response ?? []).filter(isW3Row)`; the `versionId === null` branch stores `[]`.
- New signals and handlers: `origin = signal<CenterOrigin>('all')`, `toggleOrigin(o)` and `clearFilters()`.
- `viewRows` (computed) feeds `loadedCenterRows`.
- `kpis()` reads unfiltered W3 rows and adds `bilateralNew` / `bilateralReplicated` (DD-4).
- `activeFilterLabel`, `resultsCenterParams()` → `{ funding: 'bilateral', status }`, and `showResultsCenterLink`.

**Spec edits in `CB/centers-block.component.spec.ts` (design §10.1):**
- `source: 'API'` on every fixture row and every in-test override.
- `resultsCenterParams()` → `{ funding: 'bilateral', status: 5 }`.
- The KPI test gains `bilateralNew` / `bilateralReplicated`.
- `.row` reads → `viewRows()` / `loadedCenterRows()`.

**New specs (logic):**
1. A mixed fixture across 2 Centers covering W3 new, W3 replicated, W1/W2, and a W3 status-3 row. Assert `kpis()`, `centerTotals()` and `segments()`, with distinct counts per bucket.
2. Origin = Replicated:
   - `segments()` / `centerTotals()` are restricted;
   - `kpis()` is identical to origin = All.
3. Compose:
   - status 5, then origin `new` → status still 5;
   - origin `replicated`, then toggle status → origin still `replicated`;
   - `clearFilters()` → both cleared.
4. `toggleOrigin('new')` twice → `'all'`.
5. `showResultsCenterLink()`:
   - false under `new` + a status;
   - true under `all` + a status.
6. A Center with only W1/W2 rows: not in `centersReporting`, still in `centersCount`.
7. Retry under a filter:
   - one Center fails, origin = `new`;
   - `retryFailedCenters()` recovers it with mixed rows;
   - figures include only its new W3 rows;
   - one request per retry.
8. Late load:
   - a `Subject`-backed Center emits after the first render;
   - every figure updates;
   - one call per Center.
9. Zero W3: `kpis()` 0 / 0 / 0, and `bilateralApproved` is a number.

**Verify:**
1. `cd onecgiar-pr-client && npx jest --testPathPattern="centers-block" --maxWorkers=2 --silent --reporters=summary --no-coverage`. The new specs are red before, and all `centers-block` suites are green after.
2. `npm run build:dev`.
3. `npx ng lint --quiet --lint-file-patterns <touched files>`.
4. `git diff --stat`: only `CB/` and `I18N/portfolio-centers-block.copy.ts`. No `GET_`/`http` additions.

**Fail input:**
- `kpis()` reading the origin-filtered rows fails spec 2.
- A `loadCenter` that stores raw rows fails specs 1 and 7.
- `toggleOrigin` resetting the status fails spec 3.

**Disqualifier:**
- The mixed fixture's buckets must be pairwise distinct, or the run is not evidence.
- If one of #7's state specs (error, partial-retry, empty) had to change beyond `source`, report it as a behaviour change.

**Done:** Step 0 confirmed, the 4 verify steps pass, the spec edits match §10.1, and no template changed.

---

## [x] CNR-T-3 — Template, copy and module guide

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, Reviewer PASS attempt 1) |
| Size | S–M (≈ 60 LOC incl. spec) |
| Depends on | CNR-T-2 |
| Requirements | CNR-2, CNR-3, CNR-4, CNR-5, CNR-6, CNR-7, CNR-N3, CNR-N4, CNR-N5 |
| Design | §6.2 template + copy, §6.3, DD-3 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

**Scope:**
- `CB/centers-block.component.html` — W3/Bilateral KPI card:
  - an `hlm-separator`;
  - two `<button type="button">` elements, `data-testid="origin-new"` / `"origin-replicated"`, with label + `tabular-nums` count, `[attr.aria-pressed]`, and the status tiles' classes;
  - a `focus-visible` ring (`--pr-color-primary-300`);
  - `pr-skeleton` on the counts while loading.
- Active-filter strip:
  - shown when `activeFilterLabel()` is non-null and binds it;
  - the link is wrapped in `@if (showResultsCenterLink())`;
  - "Clear filter" calls `clearFilters()`.
- `CB/centers-block.component.ts`: import `HlmSeparator`, if not already imported.
- `I18N/portfolio-centers-block.copy.ts`: rewrite `subtitle` (CNR-6); add `originNew`, `originReplicated` and `filterSeparator` if T-2 did not.
- `PO/CLAUDE.md`:
  - rewrite the ⚠️ "repeats the Center Overview" note;
  - document the origin filter and DD-4;
  - re-stamp `Verified:`;
  - stay within 120 lines.

**New specs (DOM):**
1. The card renders the total, New and Replicated from the mixed fixture; clicking `origin-replicated` flips `aria-pressed` and changes the tile counts.
2. The origin elements are `BUTTON`s.
3. With both filters set:
   - the strip reads "New · Pending review";
   - the link is absent;
   - "Clear filter" removes the strip.
4. The rendered block text has neither "Center Overview shows" nor "same numbers".
5. Zero W3 rows: the card shows `0`, `0`, `0`.

**Verify:**
1. `cd onecgiar-pr-client && npx jest --testPathPattern="centers-block" --maxWorkers=2 --silent --reporters=summary --no-coverage`.
2. `npm run build:dev`.
3. `npx ng lint --quiet --lint-file-patterns <touched TS files>`.
4. `grep -rn "same numbers each Center Overview" onecgiar-pr-client/src` → 0 hits.

**Fail input:**
- `<div (click)>` origin controls fail spec 2.
- The old subtitle fails spec 4 and the grep.
- A link outside the `@if` fails spec 3.

**Disqualifier:**
- Presence assertions cannot prove the visible ring, overflow, or the 375 px layout. Those belong to T-H.
- On NG0311 for `hlm-separator`, check `tests/mocks/spartanBrainMock.ts` first.

**Done:** the 4 verify steps pass and `PO/CLAUDE.md` is re-stamped.

---

## [x] CNR-T-H — Browser check (human / T6)

| Field | Value |
|---|---|
| Status | [x] done (2026-10-15, browser evidence in execution.md) |
| Size | XS (no code) |
| Depends on | CNR-T-3, and the commit reaching `performance-refactor` if checked on PRTest |
| Requirements | CNR-2, CNR-3, CNR-4, CNR-5, CNR-7 (visual / real data), layout defect class |

**Check on `/portfolio-overview`, admin session, at 375 / 768 / 1280 px:**
- The CGIAR Centers card shows the total with New and Replicated, and New + Replicated = total.
- On PRTest, the 2026-10-15 reference is 712 = 548 + 164. It may drift; the invariant must hold.
- Clicking Replicated changes the donut and tiles. The card, "% approved" and "Centers reporting" do not change.
- New + a status shows "New · Pending review". The link is hidden; under All it reappears with `funding=bilateral`.
- Tab reaches New / Replicated with a visible ring, and Enter toggles.
- Nothing wraps badly or is clipped at 375 px.

**Rules:** confirm the served bundle carries the new subtitle first. Read-only; no write buttons.

**Disqualifier:** a screenshot without the bundle check is not evidence.

**Done:** the user confirms, or the evidence is recorded in `execution.md`.

---

## Summary

| Task | Δ LOC (≈) | Depends on |
|---|---|---|
| CNR-T-1 | +60 | #7 committed |
| CNR-T-2 | +90 / −30 | T-1 |
| CNR-T-3 | +50 / −10 | T-2 |
| CNR-T-H | 0 | T-3 |
| **Total** | **≈ 240 changed** | serial |
