# QA Status Board — maintenance & AI-self-edit rules

## 1. What this is

- **PUBLIC page** at `/qa-status` (no login, no guard) rendering a data-driven QA status board.
- **Read-only at runtime:** it fetches a JSON asset and renders it. It **NEVER calls an LLM at runtime** — zero cloud cost, zero per-view spend.
- **"AI self-edit"** means a *human-run* AI coding session edits the JSON following these rules. The page just reflects whatever the JSON says on its **next load**. The intelligence happens at edit time (offline), never at view time.
- Goal: a single, always-current public snapshot of the performance-refactor QA state that anyone (QA, UAT, PMs) can read without auth and without us standing up a backend.

----------

## 2. Files

| Role | Path |
|---|---|
| Page (standalone component) | `src/app/pages/qa-status/qa-status.component.ts` / `.html` / `.scss` |
| Data service | `src/app/pages/qa-status/qa-status.service.ts` |
| TypeScript contracts | `src/app/pages/qa-status/qa-status.interfaces.ts` |
| Route registration | `src/app/shared/routing/routing-data.ts` → `routingApp` (public, no guard) |
| **DATA — the only file edited to update the board** | `src/assets/qa-status/perf-refactor.json` |
| Screenshot evidence | `src/assets/qa-status/` (referenced from item `screenshots[]`) |

> ⚠️ For a status/metrics update you touch **only** `perf-refactor.json` (and optionally add screenshots under `src/assets/qa-status/`). No `.ts` / `.html` / `.scss` edits, no recompile of app logic.

----------

## 3. JSON schema

The data file is a single `QaStatusBoard` object. Reproduce the full schema below.

### `QaStatusBoard` (root object)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `boardTitle` | `string` | ✅ | Heading shown at the top of the board. |
| `boardSubtitle` | `string` | ✅ | One-line context under the title. |
| `lastUpdated` | `string` (ISO date `YYYY-MM-DD`) | ✅ | Date of the most recent edit to this file. Bumped every edit. |
| `globalMetrics` | `GlobalMetrics` | ✅ | Headline numbers across the whole refactor (see below). |
| `items` | `QaStatusItem[]` | ✅ | One entry per tracked change. May be empty `[]` but normally has entries. |

### `GlobalMetrics`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `summary` | `string` | ✅ | Plain-language summary of overall progress. |
| `before` | `string` | ✅ | Baseline headline metric (e.g. `"tab switch ~1200ms"`). |
| `after` | `string` | ✅ | Current/target headline metric after the refactor. |
| `testsPassing` | `string` | ✅ | Test status headline (e.g. `"412/412 unit, 18/18 e2e"`). |

### `QaStatusItem` (each entry in `items[]`)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | `string` | ✅ | **Stable, unique** id. Drives `trackBy` + expansion state. **Never recycle an id for a different change.** |
| `ticket` | `string` | ✅ | Jira ticket id (e.g. `"P2-2969"`). |
| `title` | `string` | ✅ | Short human title of the change. |
| `area` | `string` | ✅ | Module/area touched (e.g. `"results"`, `"ipsr"`). |
| `status` | `string` (enum) | ✅ | One of `pendiente` \| `en-progreso` \| `listo-para-pruebas` \| `done`. See §4. |
| `whatChanged` | `string` | ✅ | What was changed, in plain language. |
| `howToTest` | `string[]` | ✅ | Step-by-step QA instructions. May be empty `[]` while pending. |
| `affects` | `string[]` | ✅ | Components/flows impacted. May be `[]`. |
| `risks` | `string[]` | ✅ | Known risks / regression notes / deferral reasons. May be `[]`. |
| `metricsBefore` | `Metrics` | ✅ | Measured baseline for this item (see below). |
| `metricsAfter` | `Metrics` | ✅ | Measured result after the change. |
| `screenshots` | `string[]` | ✅ | Asset paths to evidence images. May be `[]` if none. |

### `Metrics` (used by `metricsBefore` / `metricsAfter`)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `blockingTimeMs` | `number \| null` | ✅ | Measured blocking time in ms. `null` when not yet measured. |
| `notes` | `string` | ✅ | Source/context of the measurement (cite trace or test). |

> **Required vs optional:** every field above is present in every object. "Optional" content is expressed by an **empty array** (`[]`) or by `blockingTimeMs: null` — not by omitting the key. Keep keys present; leave them empty rather than deleting them.

----------

## 4. Status meanings

| Status | Meaning | Chip |
|---|---|---|
| `pendiente` | Not started; planned or explicitly deferred. | grey / neutral |
| `en-progreso` | Actively being implemented right now. | yellow |
| `listo-para-pruebas` | Implemented, ready for QA / UAT. | blue |
| `done` | Verified and accepted. | green |

----------

## 5. Allowed status transitions (state machine)

- **Forward:** `pendiente` → `en-progreso` → `listo-para-pruebas` → `done`.
- **Backward on QA fail / regression:**
  - `listo-para-pruebas` → `en-progreso`
  - `done` → `en-progreso`
- **Skipping forward is NOT allowed** (e.g. `pendiente` → `done`). Work must pass through `listo-para-pruebas` so QA gets a real test window.
- **Any status → `pendiente`** is allowed **only** if work is explicitly deferred. When you do this, **note the reason in `risks`**.

```
pendiente ──▶ en-progreso ──▶ listo-para-pruebas ──▶ done
                  ▲                   │                 │
                  └───────────────────┘                 │
                  └──────────────────────────────────────┘
        (backward only on QA fail / regression)
```

----------

## 6. EXACT contract — how an AI session updates an item

1. **Open** `src/assets/qa-status/perf-refactor.json`. For a status/metrics update this is the **only** file you touch (no recompile).
2. **Locate the item by `id`.** On a status update, do **NOT** change `id`, `ticket`, or `title`.
3. **Set `status`** to a value **reachable from the current one** per §5. If it's a backward move, **append a one-line reason to `risks`**.
4. **Update `metricsBefore` / `metricsAfter`** (and `globalMetrics` if a headline number changed) with **MEASURED** values only — **never invent numbers**. Cite the trace/test source in the `notes` text.
5. **Update `screenshots` paths** if new evidence exists; leave `[]` if none. Local-only paths under `context/` **won't render in the deployed env** — note that and prefer hosted / `src/assets/qa-status/` paths.
6. **Bump `lastUpdated`** to today's ISO date (`YYYY-MM-DD`).
7. **Validate** that the file is valid JSON and that `status` is exactly one of the 4 allowed strings, **then stop.** No code edits. No LLM baked into the page.

**Adding a NEW item:** append an object with a **fresh unique `id`**, start it at `pendiente` or `en-progreso`, and fill **all** required fields (use `[]` / `null` for empty content, never omit keys).

----------

## 7. How the page loads the data (dynamic, no recompile)

- `QaStatusService` calls `HttpClient.get('./assets/qa-status/perf-refactor.json')` at runtime, on component init.
- **Editing the JSON + redeploying the static assets updates the board WITHOUT rebuilding the app logic** — only the static asset changes. No recompile of components/services is needed for a content/status update.
- **Graceful degradation:**
  - Fetch error → error banner.
  - Loading → skeleton.

----------

## 8. Guardrails

- 🛑 **NEVER add runtime LLM / API calls to the page** (cloud-cost rule). All AI work happens offline at edit time.
- 🛑 **NEVER put secrets / tokens in the JSON** — it is a public, world-readable asset.
- ⚠️ **Keep `status` spelling exact.** A typo silently falls back to an unstyled chip — it will not error, just look broken.
