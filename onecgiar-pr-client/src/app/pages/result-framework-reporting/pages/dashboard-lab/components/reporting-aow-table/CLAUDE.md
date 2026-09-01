# reporting-aow-table

**Verified:** 2026-09-01 · branch performance-refactor · 181caa352

## What it is
The body of the Science Program shell's **Reporting** tab: the collapsible Area of Work cards (plus
the two programme buckets, `Intermediate` and `2030`) and, in `All indicators` mode, the flat sortable
table. **Pure presentation** — it fetches nothing and injects no service.

## Contract
- Inputs: `groups` (required), `search`, `statusFilter`, `filtersActive`, `viewMode`
  (`'grouped' | 'flat'`), `canReport`, `expandAll`, `expandAllNonce`, `scopeKey`.
- Outputs: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `openAow`, `allOpenChange`,
  `clearFilters`.
- State: the host (`dashboard-lab`) owns the data and the five filters. This component owns only its
  **disclosure** (`overrides`), the expanded titles, and which overlay is open (`openMenuKey`,
  `openInfoKey`).
- Endpoint: none. Rows arrive already built by `dashboard-lab.reportingGroups()`.

## Where it is used
- `dashboard-lab.component.html:1286` — the only consumer, `showPlanned()` branch (Reporting tab),
  reached from route `entity-details/:entityId` (`rfrView: 'planned'`, `routing-data.ts:612`).

## Disclosure — the contract QA keeps re-testing (P2-3251 / P2-3252)
- **Cards arrive COLLAPSED.** `isDefaultOpenAow()` returns `expandAll()`, which the host defaults to
  `false`; sub-groups inside an opened card default to open (`isDefaultOpenHlo()` → `true`). This is
  the approved behaviour: the PO confirmed it on P2-3251 (27 Aug 2026, *"Inicialmente vamos con que
  estén cerradas"*). The ticket's first paragraph describes the situation **before** the change, and
  reading that as the requirement is the mistake QA made twice.
- ⚠️ **Overrides are keyed by `scopeKey` + `expandAll` + `expandAllNonce`.** `AOW01` exists in EVERY
  Science Program, so keying by AoW code alone leaked one programme's open cards into the next.
  Dropping `scopeKey` from the `linkedSignal` source brings that bug straight back.
- ⚠️ **`expandAllNonce` is not decoration.** With `expandAll` alone, a user who opened every card by
  hand asks the host for the value the boolean already holds — the press does nothing while the label
  flips. The nonce is part of the reset key so a press always re-seeds.
- ⚠️ **The collapsed panel STAYS MOUNTED** (height animation, no `@if` pop). So "collapsed" is
  `.pr-collapse` *without* `.is-open` plus `aria-hidden="true"` — never absence of nodes. A DOM test
  that counts rows must scope to `.pr-collapse.is-open`, as the spec's `rows()` helper does.
- The five `describe('collapsed by default, through the header button')` tests press the real
  `section > button[aria-expanded]`. Every other disclosure test calls `component.toggle()` directly,
  so dropping the header's `(click)` binding left the whole suite green — verified 2026-09-01.

## Traps (⚠️ = already broke something)
- ⚠️ **`filtersActive` CANNOT be derived here.** Only `search` and `statusFilter` arrive; the
  **Section / Type / Category** filters are applied by the host when it builds `groups`. A card
  emptied by Category arrived identical to an AoW with nothing planned, and the empty state claimed
  *"this area of work has no planned indicators yet"* over a full card (P2-3405). If you add a sixth
  filter, update `dashboard-lab.reportingFiltersActive()`.
- ⚠️ **The card carries NO `overflow-hidden`.** It did, and it clipped the ⓘ popover to a 6px sliver.
  The animation clip is `.pr-collapse-inner`; the bottom corners are rounded by
  `.pr-collapse--card > .pr-collapse-inner`. Do not put `overflow` back on the `<section>`.
- ⚠️ **`app-pr-table` ships the DARK skin** of the Results Center table (`[_nghost…] .pr-table thead
  th` → navy background, 2px violet underline, its own padding). Those rules reach the projected
  cells, so `.pr-flat-head .pr-flat-cell` and `.pr-flat-body .pr-flat-cell` **re-declare**
  `background` / `border` / `padding`. Remove any of them and the dark pills come back.
- ⚠️ **The horizontal gutter lives in grid tracks 1 and 10, not in `padding`.** With padding, the
  20px strip beside each sticky cell was uncovered and showed the content scrolling underneath.
  Sticky cells go to `left: 0` / `right: 0`.
- ⚠️ **Do not add a second scroller.** `app-pr-table` already renders `.pr-table-wrap` with
  `overflow-x: auto`; wrapping it gave two bars for one axis.
- ⚠️ **`app-pr-table` sorts with `<`/`>` over the raw value and takes no comparator.** Hence
  `flatTableRows()` precomputes `__sortTarget` / `__sortAchieved` / `__sortStatus`:
  `target_value_sum` arrives as a STRING and sorted `"9" > "100"`. "Nothing reported" is `-Infinity`,
  so those rows group at one end instead of passing for 0.
- 🛑 **Do not touch `statusOf` / `progressOf` / `figure` / `ratioOf`.** `aow-hlo-table` and
  `program-overview` read the same derivations; any change silently skews them.
- 🛑 **Do not touch the progress bar or its metric.** `ratioOf` counts KPIs with SOMETHING reported,
  not KPIs at 100%. Open product question on P2-3405 (P2-2276 removed a % bar in 2025).
- `—` and `0` are different facts: `—` = never reported, `0` = reported zero. Do not unify them.
- The `⋯` menu is local. Its two live items re-emit `openAchieved` / `openTarget`; they open no
  surface of their own. `Copy indicator code` is **visible but disabled** (`Coming soon`): the payload
  carries no user-facing indicator code (P2-3405).

## Pending / Coming soon
- Body of the ⓘ popover (the backend carries no AoW description) → P2-3405, flagged to Ángel.
- Optional `Parent` column on the flat table → P2-3405 (field missing in the backend; and the
  `Optional columns` trigger does not exist in the mockup).
- Remembering which AoW the user left open across visits — the PO's own suggestion on P2-3251,
  explicitly **not** in its acceptance criteria and **not built**. Needs its own ticket.
