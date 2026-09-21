# Judgment Day — `changes/w3-bilateral-user-guide` · `design.md`

## Transaction

| Field | Value |
|---|---|
| Target | `docs/specs/changes/w3-bilateral-user-guide/design.md` (immutable during judging) |
| In-scope context | `requirements.md`, `proposal.md`, cited baseline docs, archived W1/W2 tooling, `onecgiar-pr-client/src/app/pages/bilateral/` |
| Mode | `judgment_day` — blind dual review |
| Round | 1 of 1 — **no re-judgment** (operator standing preference: one pass, fixes applied without re-judging) |
| Judges | Two independent, read-only, launched in parallel, identical scope. Model `sonnet` for both — **author ≠ auditor**: `design.md` was authored on `opus`, and `sonnet` is the registry's own T3 Auditor fallback |
| Verified at | `96b891ca3` |
| Terminal state | **approved** (see *Receipt*) |

## Counts

| Class | Count |
|---|---|
| Severe — confirmed by **both** judges | 0 |
| Severe — reported by **one** judge, then **independently reproduced at source by the orchestrator** | **3** (`J-1`, `J-2`, `J-3`) |
| Warning — confirmed by both judges | 4 (`J-4`, `J-5`, `J-6`, `J-7`) |
| Warning / suggestion — one judge | 3 (`J-8`, `J-9`, `J-10`) |
| Contradictions between judges | 0 |
| Premises attacked and **held** | `P-2`, `P-3`, `P-4`, `P-5`, `P-6`, `P-8`, `P-9` reproduced by both; `P-7` **refuted as `UNVERIFIED`** — a judge found its primary source, so the row is promoted to verified |

### Protocol deviation, recorded

The contract auto-fixes only severe findings **both** judges confirm; a single-judge severe is normally recorded `suspect`. `J-1`, `J-2` and `J-3` were each raised by one judge only, and each was then **reproduced at the primary source by the orchestrator with its own command**, quoted in the row below. The two-judge rule exists to stop action on one judge's *opinion*; a claim re-derived from the source is not opinion. All three are therefore **fixed**, not filed as suspect, and this paragraph is the audit record of that choice.

## Frozen findings ledger

| ID | Sev | Judges | Location | Finding | Orchestrator verification | Disposition |
|---|---|---|---|---|---|---|
| `J-1` | severe | A only | `design.md` §8.1 row 8 | Capture 8 (`editor-overview`) is marked as needing **no step**, assuming Overview is the editor's default section. It is not: the editor opens on **General information**. The screenshot would be narrated as Overview while showing General information — defect class **D8**, which `requirements.md` §8 records as having *no automated gate*. Also a **missing `live-path` row**: "which section opens on load" is exactly a branch point. | **Reproduced.** `grep -n "openSectionName" …component.ts` → `:79 openSectionName = signal<BilateralEditorSection>('general-info')`; `grep -n "openSectionName.set"` → **one** hit, `:678`, inside `selectSection()`; `grep -rn "'section-zero'" pages/bilateral --include='*.ts'` → only `:226` (nav label) and `bilateral-auto-save.service.ts:35,43` (type + endpoint map). Never assigned as the initial section. | **FIXED** — §8.1 rows 8–9 inverted; new premise row `P-11` |
| `J-2` | severe | B only | `requirements.md` §4.1 claim 9; `proposal.md`; guide glossary scope | States "**the eight** types" and then enumerates **seven**. `BG-R-1`/`BG-AC-1` would ship the wrong count into the PDF glossary, and `BG-R-15` requires every fact to trace to a primary source. | **Reproduced.** Parsed `result-types-by-level.ts`: level 3 → `{1 Policy Change, 2 Innovation Use, 4 Other Outcome}`; level 4 → `{5 Capacity Sharing for Development, 6 Knowledge Product, 7 Innovation Development, 8 Other Output}` = **7 entries total**. Ids reach 8 but there is no id 3. | **FIXED** — "eight" → "seven" everywhere; the id-vs-count trap recorded |
| `J-3` | severe | B only | `design.md` §11 trigger line + `P-1` | The `live-path` trigger line claims `P-1` covers "rail clicks **and drawer clicks**", but `P-1`'s chain cites only the rail / `selectSection()` / `flush()` path. The drawer half of a fired trigger has **no citation** — a triggered class without a row. | Accepted on the judge's own sweep (no write endpoint reached by drawer selection; state stays in local signals until the explicit *Create* → `POST_createBilateralHeader`, which §8.2 never clicks) and corroborated by Judge A's independent non-GET sweep (`F8`). | **FIXED** — new `live-path` row `P-12` for the drawer path; trigger line rewritten |
| `J-4` | warning | **A + B** | `design.md` §11 `P-1` | `P-1`'s chain says `selectSection()` calls `flush()`; in fact `flush()` is called **only** when `hasPendingFor(current)` is true, so on an unedited result `flush()` never runs at all. The real guard (`:655`) is not named. Conclusion holds — more strongly than described — but the cited chain does not reproduce. | **Reproduced.** `sed -n '652,657p'` → `if (this.autoSaveService.hasPendingFor(current)) { await this.autoSaveService.flush(...) }`. | **FIXED** — `P-1` chain rewritten around the real guard |
| `J-5` | warning | **A + B** | `design.md` §8.1 closing line; §10 `BG-DD-2` | "**nine** of them requiring steps", stated twice. Counting the table's own *Steps needed* column: rows 4, 5, 6, 7, the five captures behind the merged 9–13 row, and row 14 = **10**. | Counted: 4+5+1 = 10. | **FIXED** — 9 → 10 in both places |
| `J-6` | warning | **A + B** | `design.md` §8.1 vs `requirements.md` §4.2 and `proposal.md` §5/§10 | Three capture counts across the triplet: `~14` (proposal, twice, and requirements) vs `16 or 17` (design prose) vs **17** (the design's own table). Never reconciled. Feeds the §12 LOC budget, which was sized against the stale figure. | Counted the table: 17 capture ids. | **FIXED** — 17 adopted as the single figure; upstream docs corrected; LOC budget re-derived |
| `J-7` | warning | **A + B** (also found independently by the orchestrator before either judge reported) | `design.md` §3.3 | "the PRMS API origin" is treated as singular and is never defined or cited. `environment.ts` carries ~20 origins, including `reviewApiUrl` (separate Lambda, direct `POST` elsewhere in the client) and `elastic.baseUrl` (**queried directly with embedded Basic credentials, explicitly bypassing the auth interceptor**). Playwright's `page.route()` does not intercept **WebSocket** at all (`pusher`/`webSocketUrl`). Both judges verified no *live* hole for the bilateral route set — but only because of incidental implementation choices (`GET_checkTitleUniqueness` is a GET; `pages/bilateral` never imports `PusherService`), which the design never reasoned about. | **Reproduced.** Key names and a distinct-origin **count** extracted from `environment.ts` without printing values (the file also holds `username`, `password`, `key`, `license` — `.cursorrules`). | **FIXED** — §3.3 inverted to **default-deny**; WebSocket recorded as an acknowledged gap; new premise row `P-13` |
| `J-8` | warning | B only | `design.md` §3.3 / §4 | "installed once per browser context, before the first navigation" does not state that the guard must precede **`injectAuth()`**, which itself does `goto` + `reload` before the route loop. Read as "before the loop", that bootstrap navigation runs unguarded. | Accepted — matches the archived `auth.ts` contract already cited by `P-6`. | **FIXED** — ordering made explicit and assigned to a task |
| `J-9` | warning | A only | `design.md` §12 | "2 rounds for each of the **nine capture-bearing tasks**" cannot come from a 13-task breakdown in which only 3 tasks are captures; it is `J-5`'s capture figure relabelled as tasks. The headline `18` does not derive from the design's own task model. | Accepted — arithmetic is checkable in the document. | **FIXED** — review-round budget re-derived from the task model |
| `J-10` | suggestion | A only | `design.md` §5 `Step` union | The union has no **text-input** variant, yet `proposal.md` §4 #6 promises the title's word gauge and uniqueness check — states that only mean something with real text in the field. Typing via chained `press` steps defeats `BG-DD-2`'s "declarative, reviewable" rationale. | Accepted — `bilateral-manual-create-form.component.html:167` `data-testid="title-word-gauge"` is fed by `titleWordCount()`. | **FIXED** — `fill` variant added to the union |

## Premise Ledger outcome

- **Held under attack:** `P-2`, `P-3`, `P-4`, `P-5`, `P-6`, `P-8`, `P-9`.
- **Promoted:** `P-7` — a judge refuted its `UNVERIFIED` status by reaching the primary source. Orchestrator reproduced it: `bilateral-manual-create-form.component.html:161` `@if (resultTypeId()) {`, title at `:162` (`data-testid="field-title"`), word gauge at `:167` (`data-testid="title-word-gauge"`). Row is now **verified**, and the two new anchors are adopted in §8.1.
- **Corrected:** `P-1` (`J-4`).
- **Added:** `P-11` (default open section — the branch point `J-1` exposed), `P-12` (drawer click path — `J-3`), `P-13` (origin surface and the WebSocket gap — `J-7`).
- **Central safety claim survived.** Both judges independently swept every non-GET call site under `pages/bilateral` and found no write fired by page load, rail navigation, or the drawer click sequence. Judge A additionally established that autosave has **no timer-based flush** (`schedulePayload()` never issues an HTTP request) and that the AI job resume path only polls `GET_bilateralAiJob`, and only when `localStorage` already holds a job record — which a fresh Playwright context never does. `BG-DD-3` and `BG-DD-5` stand.

## Receipt

- Correction work units: **10** findings dispositioned, **10 fixed**, 0 suspect, 0 escalated.
- Scoped re-judgment: **not run** — one pass by operator standing preference.
- Skill resolution: `judgment-day` (this file), `/akili-specify` Step 2.5 *Review Design*.
- Artifacts: this ledger; `design.md` fix delta; `requirements.md` and `proposal.md` corrections for `J-2` and `J-6`.

**JUDGMENT: APPROVED ✅** — no finding survives unaddressed; the design's load-bearing safety argument was attacked at the source by two independent judges and held.
