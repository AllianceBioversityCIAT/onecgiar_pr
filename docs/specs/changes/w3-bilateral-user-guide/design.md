# Design — W3/Bilateral Manual Reporting User Guide

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w3-bilateral-user-guide` |
| Depth | Standard |
| Approval Mode | pre-approved · **Phase 2 gate: auto-approved (pre-approved mode)** — judgment-day still runs (see §12) |
| Requirements | `requirements.md` (`BG-R-1`…`BG-R-30`) |
| Design prefix | `BG-DD-*` |
| Verified at | `96b891ca3` — every citation in §11 was run against this commit |
| Delegation | None. All exploration done inline; the 4+ file threshold was not crossed (CodeGraph/grep lookups do not count) |
| Architecturally significant | No — no new module, integration, persistence, or topology change. `software-architect` not loaded; rationale in §3.1 |

---

## 2. Executive Summary

Copy the W1/W2 Playwright→PDF tooling into this spec, teach the capturer to **reach interaction-only states**, and make **read-only capture a hard gate**. Everything else is content.

Three mechanisms carry the design:

| Mechanism | Solves | Requirement |
|---|---|---|
| Declarative per-route `steps` (click / waitFor / press / fill) run between `goto` and annotation | The drawer and the six editor sections have no URL | `BG-R-14`, `BG-R-3`, `BG-R-4` |
| Request-interception guard that aborts the run on any non-GET to the PRMS API | A click sequence could submit a real result or trigger a billable AI assessment | `BG-R-7` |
| Anchors on `[data-guide]` / `[data-testid]` instead of text and `:nth-of-type` | The W1/W2 config's brittle selectors | `BG-R-6` |

The guide is assembled from one markdown file per section plus one JSON route config, so adding a section needs no code change.

---

## 3. Architecture Overview

### 3.1 Position in the system

This spec adds **no runtime component**. It is dev-only tooling plus a document, living entirely under `docs/specs/changes/w3-bilateral-user-guide/`. Nothing is imported by `onecgiar-pr-client` or `onecgiar-pr-server`; nothing deploys. `software-architect` was deliberately not loaded — there is no new module, integration, persistence change, or stated NFR impact on the product, which is the trigger condition for that skill. The relevant architectural constraint is the opposite of additive: the pipeline must touch the running app **only by reading it**.

### 3.2 Pipeline

The copied pipeline keeps its four stages and its `build-guide` composition. One stage changes.

```
capture.ts    goto → [NEW: steps] → readySelector → skeleton gate → annotate → screenshot
                 ↑ guarded by the read-only interceptor for the whole run
assemble.ts   content/*.md + glossary.json + captures → guide.html
verify-structure.ts   TOC anchors · section presence · caption/figure pairing
pdf.ts        guide.html → dist/w3-bilateral-reporting-user-guide.pdf
```

`steps` runs **after** `goto` and **before** `readySelector`, because the readiness gate must describe the *final* state, not the landing page. Each step carries its own wait; the existing skeleton gate then applies to the state the steps produced.

### 3.3 Read-only enforcement (`BG-DD-3`)

**Default-deny by method, not an origin allowlist.** The first draft matched "the PRMS API origin" — but `environment.ts` configures roughly twenty distinct origins, among them `apiBaseUrl`, `reviewApiUrl` (a separate Lambda the client `POST`s to elsewhere), `modelBaseUrl`, `aiAssistant`, `fileManagerUrl`, `textMiningUrl`, `elastic.baseUrl` and `webSocketUrl`/`pusher`. Enumerating "the PRMS origins" correctly is exactly the kind of audit that reports green while the one call it missed goes through, so the policy is inverted:

| Rule | Applies to | Action |
|---|---|---|
| 1 | `GET` and `HEAD`, any origin | allow |
| 2 | Any other method, origin on the **inert allowlist** (font CDNs, analytics — `hotjar`, `clarity`, `google-analytics`, `tawk`) | allow; blocking these breaks rendering and they cannot write PRMS data |
| 3 | **Any other method, any other origin** | **abort the request and fail the whole run**, recording method, origin, path and route id |

Rule 3 is the default. A new backend, a re-pointed environment, or an origin nobody enumerated lands in rule 3 and stops the run rather than slipping through — which is the property an origin-matching guard could not give.

Two facts make this safe rather than merely strict: the client names its verbs explicitly (`HTTP_METHOD_descriptiveName`, `onecgiar-pr-client/CLAUDE.md`) and every bilateral **read** is a `GET_*`, with writes as `POST_createBilateralHeader`, `PATCH_generalInfo`, `PATCH_tocMapping`, `POST_evidences` and peers (§11 `P-5`); and the bilateral title-uniqueness check is `GET_checkTitleUniqueness`, unlike the sibling W1/W2 module's direct-Elasticsearch `POST` (§11 `P-13`).

**Install order matters (`J-8`).** The handler is installed on the context **before `injectAuth()`**, not merely before the per-route loop: `injectAuth()` itself performs a `goto` plus a `reload` to let `RolesService` pick the session up, and that bootstrap navigation mounts the whole app shell. Installing after it would leave the broadest page load of the run unguarded.

**Acknowledged gap — WebSocket.** Playwright's `page.route()` does not intercept WebSocket frames, so `pusher`/`webSocketUrl` traffic is outside this guard entirely. Two things bound the risk: `pages/bilateral` never imports `PusherService` (verified, §11 `P-13`), and the channel is a receive-only hint feed to a third party, not a PRMS write path. Recorded here as a known blind spot rather than covered, because `requirements.md` §8 treats an unacknowledged blind spot as the expensive kind.

**Fail-closed, not fail-open.** The run aborts rather than skipping the blocked request, because a capture taken *after* a blocked write shows a screen the reporter would never see.

Every decision is written to `dist/capture-requests.log`, the artifact `BG-AC-7` is judged on.

---

## 4. Extended Directory Structure

```
docs/specs/changes/w3-bilateral-user-guide/
├── proposal.md · requirements.md · design.md · tasks.md
└── tooling/                       # copied from the archived W1/W2 spec
    ├── .env.example               # copied verbatim
    ├── .gitignore                 # copied verbatim (.env, dist/*.png, node_modules)
    ├── package.json               # name, description, build-guide 1st step, guard:archive
    ├── package-lock.json          # generated by BG-T-2; committed (not copied)
    ├── tsconfig.json              # copied verbatim
    ├── routes.config.json         # NEW — bilateral routes + steps
    ├── src/
    │   ├── auth.ts                # copied verbatim
    │   ├── tokens.ts              # copied verbatim
    │   ├── annotate.ts            # copied verbatim
    │   ├── assemble.ts            # copied verbatim
    │   ├── verify-structure.ts    # copied verbatim
    │   ├── pdf.ts                 # copied verbatim
    │   ├── capture.ts             # MODIFIED — steps, read-only guard, dimension bounds
    │   └── guards/
    │       ├── archive-immutable.ts # NEW — archive immutability (BG-DD-10)
    │       ├── read-only.ts       # NEW — request interception (BG-DD-3)
    │       └── frame-bounds.ts    # NEW — dimension assertions (BG-DD-6)
    ├── template/                  # copied; cover/title strings changed
    ├── content/
    │   ├── intro.md · glossary.json
    │   └── sections/01…18-*.md    # NEW
    └── dist/                      # PDF + captures + capture-requests.log
```

`BG-R-22` constrains this: everything marked *copied verbatim* must diff clean against its source, so a future promotion to shared tooling stays mechanical.

---

## 5. Data Model

No database entity, migration, or persisted field. **n/a by design** — this spec reads the app and writes files.

The only schema is the route config, extended additively:

| Field | Type | Status | Purpose |
|---|---|---|---|
| `id`, `url`, `readySelector`, `captionKey` | string | existing | unchanged semantics |
| `clickTarget` | string | existing | annotation anchor only — never actuated (§11 `P-4`) |
| `viewport`, `fullPage` | object / bool | existing | per-route framing |
| `annotations` | `CalloutSpec[]` | existing | 2–5 labelled callouts |
| **`steps`** | `Step[]` | **new, optional** | pre-capture interactions |
| **`bounds`** | `{minW,maxW,minH,maxH}` | **new, optional** | frame sanity (`BG-DD-6`) |

`Step` is a closed, **four**-variant union — deliberately not a script. **`click` and `fill` do not wait before reading `count()`** (waiting is `waitFor`'s job), so a config targeting a not-yet-mounted element must interleave a `waitFor` before it or the step reddens as "0 element(s)". `BG-T-8` and `BG-T-9` own that interleaving:

| Variant | Fields | Guard |
|---|---|---|
| `click` | `selector`, optional `label` | selector must match **exactly one** element, else the run fails |
| `waitFor` | `selector` or `ms` | bounded timeout; failure names the step |
| `press` | `key` | no selector |
| `fill` | `selector`, `value` | selector must match **exactly one** element. Needed because the title's word gauge and uniqueness check (`proposal.md` §4 #6) only render meaningfully with real text; chaining single-key `press` steps would defeat `BG-DD-2`'s declarative rationale (`J-10`). `value` is literal content authored in the config — never a credential |

A route whose `steps` fail is a failed route, never a silently different screenshot (`BG-AC-14`).

---

## 6. API Design

**n/a** — no endpoint is added, changed, or removed. The pipeline is a **consumer** of existing routes, and only by `GET`. The contract this design owes the system is the negative one in §3.3: no non-GET reaches the PRMS API.

---

## 7. Backend Module Design

**n/a** — no server code. `onecgiar-pr-server` is untouched (`BG-R-10` guards the adjacent archive; §4.3 of `requirements.md` puts server code out of scope).

---

## 8. Frontend / UX Component Architecture

No client component is added or changed. The design's frontend concern is **which existing surfaces are photographed and by what anchor** — the contract between the guide and the app.

### 8.1 Capture plan

`code` is a real `result_code`; `<acr>` the Center acronym (`BG-OQ-1`).

| # | id | URL | Steps needed | Primary anchors |
|---|---|---|---|---|
| 1 | `workspace-identity` | `/bilateral/<acr>/home` | — | `[data-guide="bilateral-identity"]`, `[data-guide="bilateral-tabs"]` |
| 2 | `catalog` | `/bilateral/<acr>/home` | — | `[data-guide="bilateral-reporting-kpis"]`, `[data-guide="bilateral-project-card"]` |
| 3 | `catalog-create-cta` | `/bilateral/<acr>/home` | — | `[data-guide="bilateral-project-create-result"]` |
| 4 | `drawer-sp` | `/bilateral/<acr>/home` | click *Create result* | drawer step-1 region |
| 5 | `drawer-method` | `/bilateral/<acr>/home` | click *Create result* → select primary SP | *AI-Assisted* / *Complete the Form Manually* cards |
| 6 | `manual-form` | `/bilateral/<acr>/home` | …→ choose *Complete the Form Manually* | level, type, title |
| 7 | `manual-form-title` | `/bilateral/<acr>/home` | …→ choose a result type | title field + word gauge (appears only after type — §11 `P-7`) |
| 8 | `editor-general-info` | `/bilateral/<acr>/result/<code>` | — **this is the landing section** | `[data-testid="bilateral-sections-rail"]`, `bilateral-sections-progress`, `bilateral-section-heading` |
| 9 | `editor-overview` | same | **click the Overview rail entry** | section-zero dashboard body |
| 10–13 | `editor-contributors` · `editor-geography` · `editor-evidence` · `editor-type-specific` | same | click the rail entry | `bilateral-section-heading`, section body |
| 14 | `editor-footer-save` | same | click a rail entry | `bilateral-footer-save`, `bilateral-footer-pending-list`, `bilateral-footer-position` |
| 15 | `rail-submit` | same | — | `bilateral-rail-submit`, `bilateral-rail-submit-note` |
| 16 | `drafts` | `/bilateral/<acr>/drafts` | — | `[data-guide="bilateral-tab-drafts"]` |
| 17 | `results-status` | `/bilateral/<acr>/results?source=w3&method=manual` | — | status badge column |

**Seventeen captures, ten of them requiring steps** — rows 4-7 (drawer sequence, 4), the five captures behind the merged 9-13 row, and row 14. That is the count that makes `BG-DD-2` load-bearing rather than convenient, and it is the single capture figure for the whole spec: `requirements.md` §4.2 and `proposal.md` §5 were corrected to match it.

### 8.2 Two surfaces are deliberately not driven

- **`Create` in the manual form is never clicked.** It would `POST_createBilateralHeader` and create a real result. Captures 6–7 show the filled form, not its submission. The editor captures (8–15) use a **pre-existing** result instead (`BG-DD-5`).
- **`Submit for review` is never clicked**, and the quality-check dialog is not driven. Capture 15 photographs the rail control and its note; the dialog itself is deferred to `BG-OQ-2`, and §8.3 makes that deferral cheap.

### 8.3 Degradation path for the AI quality check (`BG-DD-8`)

Section 15 of the guide is authored so that it reads correctly **with or without** a dialog capture. If `BG-OQ-2` resolves to "no capture", the section keeps its narrative and its rail capture and loses one figure — no restructuring, no re-ordering, no TOC change. This is why the decision can be deferred past design without blocking content work.

---

## 9. Shared Contracts Or Package Extensions

None. `package.json` for the tooling is private and standalone (`"private": true`), and is not added to either workspace. No shared client/server contract, DTO, or exported symbol changes.

---

## 10. Design Decisions

| ID | Decision | Why | Rejected alternatives |
|---|---|---|---|
| `BG-DD-1` | Copy `src/` + `template/` into this spec rather than promoting them to shared tooling | User decision (2026-09-21). Keeps the delivered W1/W2 guide at zero risk; `BG-R-10` makes that testable | **Shared/parameterized tooling** — cleaner long-term, but it edits an archived spec and forces re-verification of a guide already signed off. **Symlink to the archive** — an archived spec is not a dependency surface, and editing through a link defeats `BG-R-10` |
| `BG-DD-2` | Declarative four-variant `steps` union in the route config | Keeps interactions reviewable and diffable; a wrong selector fails loudly instead of screenshotting the wrong screen. **Ten of 17** captures need it | **Per-route imperative TS callback** — unbounded, unreviewable, and invites arbitrary interaction including writes. **Playwright codegen scripts per state** — abandons the config-driven model that made the W1/W2 pipeline maintainable |
| `BG-DD-3` | Read-only enforced by request interception, failing the run on any non-GET to the PRMS API | `BG-R-7` says *enforced by the tooling, not operator discipline*. Safe because client verbs are explicit and all bilateral reads are GET (§11 `P-5`) | **Operator care** — the W1/W2 run proved that a pipeline driving a production-shaped DOM surprises its author. **A read-only account** — flush short-circuits and controls render disabled (§11 `P-6`), so screenshots would show a UI no reporter sees |
| `BG-DD-4` | Anchor callouts and steps on `[data-guide]`/`[data-testid]` only | 11 + ~20 such anchors already exist, were added deliberately with zero layout impact, and are unit-guarded against removal (§11 `P-2`, `P-3`). The W1/W2 config's `text=`/`:nth-of-type()` selectors are why its routes broke | **Text selectors** — break on copy edits, and `BG-R-6` demands a unique match. **XPath/position** — worse on both counts |
| `BG-DD-5` | Capture the editor of a **pre-existing** result; never create one | Creating would write (`POST_createBilateralHeader`). Rail navigation on an unedited result issues no request, because `flush()` early-returns on an empty pending map (§11 `P-1`) | **Create a throwaway result per run** — a write, and it litters the environment. **Deep-link each section** — impossible: there is no `section` query param (§11 `P-8`) |
| `BG-DD-6` | Per-capture dimension bounds, asserted in the pipeline | The W1/W2 run shipped a 1280×720 skeleton frame and a 1280×186177 frame past an exit-0 run and two review gates | **Eyeballing at HITL** — that is the substitute for defects that *cannot* be automated (D8–D10); a numeric bound can, so it should be |
| `BG-DD-7` | Read the font stack and tokens from `fonts.scss`/`colors.scss` at build time and assert them | `design.md` §7 still says Poppins; the app is `Manrope, Poppins, sans-serif` and the correction is a **pending** standardization (§11 `P-9`). Trusting the doc ships the wrong typeface | **Trust `design.md` §7** — known stale. **Hard-code Manrope** — re-creates the same staleness one release later |
| `BG-DD-8` | Author guide section 15 to degrade to prose without restructuring | Lets `BG-OQ-2` — the one genuinely unresolved safety question — be settled during execution instead of blocking the whole spec | **Block on `BG-OQ-2`** — stalls 16 other captures on one dialog. **Capture it by clicking Submit** — violates `BG-R-7` |
| `BG-DD-9` | One markdown file per guide section, assembled in TOC order; glossary as JSON | Adding or reordering a section is a content edit, not a code change (`BG-R-11`). Matches the W1/W2 structure, so the copy stays mechanical | **Single monolithic markdown** — merge-hostile and it was already rejected upstream. **Prose in the template** — couples content to layout |
| `BG-DD-10` | Assert archive immutability as a build step, not a convention | `BG-R-10`/`BG-AC-10` need a command, and a copy operation is exactly the kind of step that mutates its source by a mistyped path | **Trust the copy** — undetectable until someone diffs the archive |

### Step 2.3 — Reversion challenge

**No design decision reverts already-delivered behavior.** Every DD is additive within a new folder: nothing in the shipped codebase, and nothing in the delivered W1/W2 guide, is removed, disabled, or inverted — `BG-DD-1` and `BG-R-10` exist precisely to guarantee that, and `BG-AC-10` tests it. `BG-DD-4` *replaces* the selector style, but only inside this spec's own new config; the archived config keeps its selectors. **The Step 2.3 challenge therefore does not trigger.**

---

## 11. Premise Ledger

**Count:** 13 rows — **13 verified**, **0 `UNVERIFIED`**. Post-judgment: `P-7` promoted to verified (a judge reached its primary source), `P-1` corrected, and `P-11`–`P-13` added for premises the first draft depended on without a row. **`P-10` settled at execute time by `BG-T-4` — and its original claim was found false; the row now states what the sweep actually returned.**
**Blast-radius triggers:** `live-path` **fired three times**, and each now has its own row rather than one row claiming to cover all three — the gap `J-3` and `J-1` exposed: **rail clicks** → `P-1`, **drawer clicks** → `P-12`, **which section the editor opens on load** → `P-11`. `consumer` **fired** (the design adds fields to the `RouteConfig` interface) → `P-10`. `shared-state` **did not fire** — the design changes no state, service, base class, lifecycle hook, or signal that more than one component reads; the copied tooling has exactly one consumer, its own `capture.ts`.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | Clicking a rail entry on a result with **no staged edits** issues no write — because `flush()` is never called at all, not because it runs and finds nothing. | `live-path` | Chain: rail click → `bilateral-result-creator.component.ts:652 selectSection()` → `:653` early-return if same section → **`:655 if (this.autoSaveService.hasPendingFor(current))`** — the actual controlling guard — → `:656 flush(...)` **only inside that branch**. On an untouched result `hasPendingFor(current)` is false, so the branch is skipped entirely. Corroborating: `flush()` itself would also no-op (`bilateral-auto-save.service.ts:207` → `:213-218` empty `_pendingFields` → `:233-235` no `enqueueEndpointRequest`), and `schedulePayload()` issues no HTTP request at all — autosave has **no timer-based flush**. `J-4` corrected this row: the first draft walked the `flush()` body and never named the `:655` gate. | `96b891ca3` | **`BG-DD-5` collapses.** Editor section captures would PATCH, the `BG-DD-3` guard would abort the run, and captures 9–13 would degrade to prose. Impact **High** | verified |
| `P-2` | 11 distinct `[data-guide]` anchors exist in `pages/bilateral`. | `existence` | `grep -rho 'data-guide="[^"]*"' onecgiar-pr-client/src/app/pages/bilateral \| sort -u \| wc -l` → `11`; the set includes `bilateral-identity`, `bilateral-tabs`, `bilateral-reporting-kpis`, `bilateral-project-card`, `bilateral-project-create-result`, `bilateral-tab-{overview,reporting,results,drafts}`, `bilateral-bulk-uploader-cta`, `bilateral-tour-trigger`. | `96b891ca3` | `BG-DD-4` loses its workspace anchors; captures 1–3, 16 fall back to text selectors. Impact **Low** | verified |
| `P-3` | The creator/editor and its `section-*` components expose `[data-testid]` anchors covering the rail, footer, section heading and submit control. | `existence` | `grep -rho 'data-testid="[^"]*"' .../bilateral-result-creator .../components/section-* \| sort -u` → includes `bilateral-sections-rail`, `bilateral-sections-progress`, `bilateral-section-heading`, `bilateral-footer-{save,next,back,position,pending-list,state,dirty}`, `bilateral-rail-{submit,submit-note,status,code,type,back-link}`. | `96b891ca3` | `BG-DD-4` loses its editor anchors; captures 8–15 need new hooks, which §4.3 of `requirements.md` forbids adding. Impact **High** — would force a scope change | verified |
| `P-4` | The existing capturer never actuates `clickTarget`; it is an annotation anchor only, and the pipeline is `goto → readySelector → skeleton gate → annotate → screenshot`. | `location` | `docs/specs/archive/2026-09-16-changes--user-guide-pdf/tooling/src/capture.ts:13` (flow comment), `:28-32` (`annotations` fallback synthesized *from* `clickTarget`), `:88-91` (same). No `.click(` call on `clickTarget` in the file. | `96b891ca3` | `BG-DD-2` is unnecessary — the pipeline could already reach these states. Impact **High** (deletes a task) | verified |
| `P-5` | Bilateral reads are `GET_*`; writes are `POST_*`/`PATCH_*`, so aborting non-GET to the PRMS API blocks writes without starving reads. | `data-env` | `grep -rhno "POST_[a-zA-Z]*\|PATCH_[a-zA-Z]*\|GET_[a-zA-Z]*" onecgiar-pr-client/src/app/pages/bilateral --include='*.ts' \| sort \| uniq -c \| sort -rn` → reads `GET_bilateralProjects` (50), `GET_bilateralCenterResults` (27), `GET_BilateralResultDetail` (26)…; writes `POST_createBilateralHeader` (13), `PATCH_tocMapping` (10), `POST_evidences` (8), `PATCH_generalInfo` (7). Zero `.post<`/`.patch<` issued directly from `pages/bilateral` (0 of each). | `96b891ca3` | **`BG-DD-3` breaks the app under capture.** If any read were a POST, the guard would abort a legitimate page load and no capture would succeed. Impact **High** | verified |
| `P-6` | A read-only session short-circuits autosave and would render disabled controls, so it is not a usable capture identity. | `data-env` | `bilateral-auto-save.service.ts:208` — `async flush(...) { if (this.isReadOnly()) return; }`; `auth.ts` header in the archived tooling documents that injecting only `token` yields `readOnly: true` and an empty initiative list. | `96b891ca3` | The rejected alternative in `BG-DD-3` becomes viable, and the design could drop the interceptor. Impact **Low** | verified |
| `P-7` | The title field appears only after a result type is chosen, so a title capture needs a type-selection step. | `other` | **Promoted to verified during judgment.** Primary source reached: `bilateral-manual-create-form.component.html:161` → `@if (resultTypeId()) {`, wrapping the title field at `:162` (`data-testid="field-title"`) and its word gauge at `:167` (`data-testid="title-word-gauge"`). The module `CLAUDE.md` that was the first draft's only evidence is secondary per citation rule (d) and is no longer load-bearing. | `96b891ca3` | Capture 7 merges into capture 6 and one step disappears. Impact **Low** | verified |
| `P-8` | The editor exposes no `section` query param, so sections are unreachable by URL. | `existence` | `grep -n "queryParam\|'section'" bilateral-result-creator.component.ts` → hits only `:555` (`phase`), `:567`/`:594` (`job`); no `section` key. Alternate names searched: `section`, `tab`, `step`. | `96b891ca3` | `BG-DD-5`'s rejected alternative (deep-link each section) becomes the design, and `BG-DD-2` is needed for the drawer only. Impact **High** | verified |
| `P-9` | `design.md` §7's Poppins entry is stale and its correction is an **unapplied** pending standardization, so the template must read the live stylesheets. | `other` | `docs/specs/kaizen/changes--user-guide-pdf.md` → Pending Items **P5**, `Target: docs/ux-ui/design.md §7`, `Status: pending`, recording the app as `Manrope, Poppins, sans-serif` measured 2026-09-15. | `96b891ca3` | `BG-DD-7` simplifies to trusting `design.md` §7. Impact **Low** | verified |
| `P-10` | ~~Adding optional `steps`/`bounds`/`fill` to `RouteConfig` has exactly one consumer — the same copy's `capture.ts`.~~ **Corrected by the sweep (`BG-T-4`, 2026-09-21): the claim was false as written.** `routes.config.json` has **two** readers, and the type is declared **twice, independently**. The substance survives: no lockstep update is needed for this change. | `consumer` | Sweep as run from the spec folder: `grep -rn "RouteConfig\|routes.config" tooling/` → hits in `src/capture.ts` (declaration `:159`, `loadRoutes()`, usages), **`src/assemble.ts` (`:54` reads the file, `:63` declares its OWN 7-field `RouteConfig`)**, plus incidental filename mentions in `template/README.md:89`, `src/annotate.ts:181`, `src/tokens.ts:172`. Verified at source: `capture.ts:159` declares `interface RouteConfig` **without `export`**, so it is structurally un-importable; `assemble.ts` imports nothing from `capture.ts` and hand-mirrors the shape, already omitting `annotations` today. Because the second declaration is independent and a TS `as RouteConfig[]` cast tolerates unknown extra JSON properties, adding `steps`/`bounds` needs no change in `assemble.ts`. | `96ebafa1e`..`a5f4cc01a` | A second consumer would have to be updated in lockstep. **Outcome: none does, for this change.** Latent risk recorded, not introduced here — two hand-mirrored interfaces over one JSON file will drift, and one already has. Impact **Low** | **verified — settled by `BG-T-4`; original claim refuted and rewritten** |
| `P-11` | The editor does **not** open on Overview — it lands on **General information**. | `live-path` | `grep -n "openSectionName" bilateral-result-creator.component.ts` → `:79 openSectionName = signal<BilateralEditorSection>('general-info')`. `grep -n "openSectionName.set"` → exactly **one** hit, `:678`, inside `selectSection()`. `grep -rn "'section-zero'" pages/bilateral --include='*.ts'` → only `:226` (the nav label) and `bilateral-auto-save.service.ts:35,43` (union member + endpoint map); it is never assigned as the initial section. Branch point: no `ngOnInit`, resolver, or `loadResult` path writes the signal. | `96b891ca3` | **Captures 8 and 9 swap their step requirement.** The first draft would have screenshotted General information and captioned it *Overview* — a `BG-R-3` violation in defect class **D8**, which has no automated gate. Impact **High** | verified — added by `J-1` |
| `P-12` | The drawer click sequence — *Create result* → primary Science Program → creation method → result type — issues **no write**; state stays in local signals until the explicit *Create* button calls `POST_createBilateralHeader`. | `live-path` | Sweep of every `POST_`/`PATCH_`/`PUT_`/`DELETE_` call site under `pages/bilateral`: none is reachable from the selection steps. `bilateral-projects-panel.component.html:240,310,340,383` applies `[attr.data-guide]="$first ? '…' : null"`, so the catalog anchors match exactly one element regardless of catalog size; `openManualCreate()` → `manualCreateFlow.beginFromProject(project, event)` opens the flow without a request. §8.2 never clicks *Create*. | `96b891ca3` | **`BG-DD-2`'s drawer captures (4–7) become unsafe** and would have to be dropped or faked. Impact **High** | verified — added by `J-3`, which found the first draft's trigger line claiming `P-1` covered this path with no citation to it |
| `P-13` | The client exposes ~20 origins, several of them write-capable and outside `apiBaseUrl`; but none is reached by the routes this guide drives. | `data-env` | Key **names** and a distinct-origin **count** extracted from `environment.ts` without printing values — the file also holds `username`, `password`, `key`, `license` (`.cursorrules`): 20 distinct origins, including `reviewApiUrl`, `modelBaseUrl`, `aiAssistant`, `fileManagerUrl`, `textMiningUrl`, `elastic.baseUrl`, `webSocketUrl`, `pusher`. Judge sweeps established: `bilateral-api.service.ts` routes every bilateral read and write through `apiBaseUrl` only; `reviewApiUrl`'s sole caller is `ai-review.service.ts:334` under `pages/results/pages/result-detail/**`; `elastic.baseUrl` is queried directly with embedded Basic credentials and explicitly bypasses the auth interceptor; `pages/bilateral` never imports `PusherService`. | `96b891ca3` | **The origin-matching guard of the first draft was insufficient**, which is why `BG-DD-3` is now default-deny (§3.3) and WebSocket is recorded as an acknowledged gap. Impact **High** | verified — added by `J-7` |

---

## 12. Budget (Step 2.4 — sized against this design)

| Signal | Budget | Derivation |
|---|---|---|
| **Tasks** | **13** | copy + archive guard (1) · install + verbatim diff (1) · read-only guard (1) · `steps` union (1) · frame bounds (1) · font/token assertion (1) · route config in three slices — workspace, drawer, editor (3) · content in three slices (3) · assemble + verify + HITL (1) |
| **LOC** | **1,300–1,700** | authored only: `routes.config.json` 17 routes ≈ 425 · `content/` 18 narratives + intro ≈ 475 · guards (`steps` ≈ 160, read-only ≈ 90, frame bounds ≈ 50, font/token ≈ 40) ≈ 340 · `glossary.json` ≈ 60 · template/cover ≈ 40 · archive guard ≈ 20 → ≈ 1,360 mid-point, with headroom |
| **Review rounds** | **17** | **9 non-rendered tasks × 1 round = 9**, plus **4 rendered-output tasks × 2 rounds = 8**. The four are the three route-config/capture slices and the final assemble+render task — the only tasks whose Definition of Done is an image or a PDF |

**`J-9` corrected this row.** The first draft derived `18` from "2 rounds for each of the nine capture-bearing tasks" — but the 13-task model has only **three** capture slices; `nine` was the *capture* count from `J-5` silently relabelled as tasks. The figure above is derived from the task model itself, and lands at 17 for a reason the model can defend rather than by coincidence.

**This budget is deliberately pessimistic, and says so.** `KZ-REH-1` is at its **fifth** recurrence and was raised to **High** in the W1/W2 kaizen: that spec estimated 650–850 LOC / 2 review rounds and delivered ~2,000 LOC / 9 rounds, because verification and guard code (≈40% of its LOC) and adaptation to a production DOM were unmodelled. Both are modelled here — every guard is a named line item — and `KZ-changes--sp-shell-app-viewport-1` (2 rounds budgeted / 9 run, every FAIL a rendered-output defect) is why rendered tasks carry 2 rounds rather than 1.

**Pre-agreed tripwire response** (per the operator's standing preference, so the tripwire does not become a fresh negotiation mid-run): if actuals exceed **1,700 LOC or 20 review rounds**, the Leader stops and offers, in this order — (1) drop guide sections 16–17 (AI-Assisted contrast, status vocabulary) to a follow-up spec, keeping the manual path whole; (2) reduce captures 10–13 to a single composite figure; (3) continue as-is with the overrun recorded. Cutting the manual path itself is not on the list — it is the deliverable.

**No separate Jest suite.** Following the W1/W2 precedent (a tooling spec with zero unit tests, accepted at archive), the *guards are the tests*: D1–D7 are enforced by runtime assertions that fail the build. Each guard therefore owes a **falsifier run** — the guard observed going red against a deliberately broken input — recorded in its task's Done criteria. `docs/trd/trd.md` §6 coverage thresholds do not apply: no file here is in either package's Jest scope.

---

## 13. Risks Carried Into Execution

| Risk | Mitigation | Owner |
|---|---|---|
| `BG-OQ-2` unresolved — the quality-check dialog cannot be captured safely | `BG-DD-8` degrades guide section 15 to prose with no restructuring | `BG-T-11` |
| `BG-OQ-1` unresolved — no confirmed Center/project, and the reference data may not be multi-SP | Blocks captures 4–7 only; settled as that task's first step, before any config is authored | `BG-T-8` |
| `qa-ai-traffic-light` / `qa-ai-verdict-drawer` land mid-run and move the submit surface | Capture 15 last; re-shoot is one route, not a re-author | `BG-T-9` |
| Rendered defects pass text-only review (`KZ-changes--user-guide-pdf-1`) | Leader measures dimensions **and views** each artifact before spawning the Reviewer; D8/D10 route to a T6 visual pass | Leader |
| Copy drifts from source, breaking `BG-R-22` | `BG-DD-10` archive guard (`BG-T-1`) plus a verbatim-diff check (`BG-T-2`) | `BG-T-1`, `BG-T-2` |
