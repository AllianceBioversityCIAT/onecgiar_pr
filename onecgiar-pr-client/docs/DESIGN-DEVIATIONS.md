# Design deviations — reporting redesign

**Purpose.** The `docs/reporting-redesign/` zip-snapshot layer is being deleted in favour of the live
Claude Design project. Six deliberate deviations and one architectural decision existed **only** in
those files. They are recorded here so nobody "corrects" them back later.

Live design (visual source of truth):
`https://claude.ai/design/p/b6234307-e82b-43d0-b4c4-a2bb13b12242?file=PRMS+Shell.dc.html`

---

## 1. S12 — sidebar section-label colour raised off the design's value

- **We did:** `--pr-sidebar-fg-subtle: #a79bd4` (`src/styles/colors.scss`, sidebar semantic block).
- **Design said:** `#8B7CC4` for section labels (`MY SCIENCE PROGRAMS`, `PLATFORM`, `EXTRAS`).
- **Why:** `#8b7cc4` **fails WCAG AA on both sidebar surfaces** (`--pr-sidebar-bg` = `#271862` and
  `--pr-sidebar-elevated` = `#33227a`). `#a79bd4` measures 6.2:1 on the sidebar background and clears
  AA. The reason is codified in the token comment itself (`// was #8b7cc4 — failed AA on both sidebar
  surfaces`), so the decision travels with the code, not with the deleted spec. Accessibility wins
  over pixel fidelity.

## 2. `border-brand-200` → `border-brand-300` on soft borders (a documented WCAG bend)

- **We did:** the `brandSoft` `hlm-button` variant keeps `border-brand-300` (`#6b46e5`).
- **Design said:** `border: 1px solid #DDD6FE` (= `--pr-color-primary-200`).
- **Why:** on a white card `#DDD6FE` measures **1.39:1**, far under the **3:1 non-text floor of WCAG
  1.4.11**. Decided by Yeck on 2026-08-06: the reference bends here and accessibility wins. This is a
  deliberate, measured departure — not an oversight. Do **not** restore `#DDD6FE`.
- ⚠️ Related token rule: `primary-100`/`primary-200` are **light tints, not border or focus-ring
  colours**. Content borders are neutral (`--pr-border`); focus rings come from `--pr-focus-ring`.

## 3. P21 — `achieved = 0` stays muted instead of rendering `—`

- **We did:** render the literal `0`, muted, with a **"Nothing reported yet"** treatment.
- **Design said:** treat `0` as unreported and print an em dash `—`.
- **Why:** the test backend (prtest) returns `0` for **every** `achieved` value and never `null`.
  Following the design verbatim would erase the difference between "genuinely zero" and "not yet
  reported" for all data we can currently observe. Reversible in one line if real `null`s ever arrive.

## 4. P5 — cycle chip in the topbar, deferred

- **We did:** no cycle chip in the shell topbar.
- **Design said:** a cycle selector/chip in the topbar chrome.
- **Why:** deferred **by design** — there is no cycle picker in the shell yet, so a chip would be
  decorative and imply switching that the routing does not support. Deferral, not rejection.

## 5. S3 / S4 / S5 — extra sidebar items the design does not show

- **We did:** keep a third group **`Other projects`** (S3); keep `Notifications` (with badge) and
  `Text size` alongside `Release notes` in EXTRAS (S4); keep `My Admin` split into `My Admin` +
  `Admin module` (admin-only children) (S5).
- **Design said:** two programme groups only; EXTRAS holds **only** `Release notes`; one `My Admin`
  entry with five children.
- **Why:** all three are **shipped, working functionality with real users**. Removing them is a
  **product decision**, not a visual one — it needs the owner, not a redesign pass. Left in place
  until product says otherwise.

## 6. Days-left chip absent from the program band

- **We did:** the eyebrow row ships without the days-left chip (the four-state chip: `>30 days`,
  `15–30`, `<15`, `closed`).
- **Design said:** eyebrow = dot + `SP01 · REPORTING CYCLE 2026 · P25` **+ days-left chip**.
- **Why:** at implementation time no cycle end date was available in the client, so every chip state
  would have been fabricated.
- ⚠️ **Known follow-up:** the later gap analysis found that `GET /api/versioning` **does** carry
  `start_date` / `end_date` per phase, and the SP payload's `versionId` is that phase — which is what
  the pace card now uses. So this deviation is the only one here whose *premise* has since changed:
  the chip is now buildable and should be revisited rather than treated as settled.

## 7. Decision (Yeck, 2026-07-31) — multi-programme HTML sidebar, not the screenshot variant

The design reference **contradicted itself**: the HTML export specified a multi-programme sidebar
(`MY SCIENCE PROGRAMS` + `Other science programs` + `PLATFORM`), while `screenshots/reporting-table.png`
showed a single-programme context (`SP01 / Breeding for Tomorrow` · WORK · Overview / My work /
Reporting / Results explorer) — those four labels belong to THAT screenshot only, and are not the
live design's tabs. See "Known contradictions" below.

**Decision: implement the HTML version** — the multi-programme one. The screenshot variant changes
**information architecture and routing**, not just presentation, so it is a separate, later phase.
This is why the shipped sidebar looks unlike that screenshot; it is intentional.

---

## Precedence

1. **The live Claude Design project is the VISUAL truth.** Layout, spacing, states, composition — if
   the live design and any document disagree on how something looks, the live design wins.
2. **The shipped code is the TOKEN truth.** `src/styles/colors.scss` and `src/styles/fonts.scss` are
   authoritative for colour values, ramps, semantic tokens and type. Never re-derive a token from a
   screenshot or a hex in prose.
3. **This file wins wherever we deliberately diverge from the design.** The seven entries above are
   settled decisions with recorded reasons. A change to any of them needs a new decision — not a
   fidelity pass.

---

## Known contradictions

**Tab count was a four-way split.** At deletion time the sources disagreed:

- a deleted spec (`PROGRAM-SHELL-SPEC.md`) described the shell as **two tabs**;
- another deleted doc treated `Results` as a third tab — **three**;
- the code implements **two** — `activeTab` is typed `'overview' | 'reporting'`
  (`reporting-program-band.component.ts`);
- the live Claude Design, verified by grep on 2026-08-21, shows **four**:
  `Overview · Reporting · Results · Drafts`, where `Drafts` is wrapped in
  `<sc-if value="{{ centerMode }}">` and therefore only appears in the Center view, not the
  programme one.

⚠️ Do NOT cite `Overview / My work / Reporting / Results explorer` as the live design's tabs. Those
labels come from `screenshots/reporting-table.png`, a superseded single-programme screenshot, and
`My work` / `Results explorer` appear **nowhere** in the live design file. Confirm tab labels by
grepping `>…</button>` in the live file, never from a rendered image or a doc.

The `Results` tab is **partially blocked on backend**: the table itself is buildable from
`get/all/roles/filter` (scoped by `submitter_id`), but no endpoint returns a programme's results
with their section/AoW or the indicator they belong to — which is why the Section filter, the
Section column, `View indicator` and the indicator subtitle ship disabled with a `Coming soon` tag
(P2-3395, P2-3398, P2-3399).

**From now on, the live Claude Design is the only visual authority.** Contradictions between deleted
snapshots are not evidence of anything; do not resurrect them to argue a case. If the live design and
the code disagree on tab count, that is an open item to raise with the owner — not a licence to guess.

## 8. `#8B7CC4` reinstated as a CHART fill — the opposite call to §1, on purpose

- **We did:** added `--pr-chart-2-muted: #8b7cc4` (`src/styles/colors.scss`, Charts block) and used it
  for the bilateral bar fill on the Science Program Overview tab
  (`dashboard-lab/components/program-overview/`). Added 2026-08-21 for P2-3302 / story P2-3406.
- **Design said:** `#8B7CC4`. We matched it exactly.
- **Why this does NOT contradict §1:** §1 rejected this hex as a **text foreground on dark sidebar
  surfaces**, where it failed WCAG AA (contrast minimum 4.5:1). This is a **non-text graphic on
  white**, governed by WCAG **1.4.11** (3:1). Measured on the `--pr-border-divider` (`#eeeef1`)
  track it is **3.52:1** — it clears. Different criterion, different verdict.
- **Why not substitute an existing token:** `--pr-chart-3` (`#9270f0`) measures **3.50:1** on the same
  track — a dead heat — so swapping buys no accessibility and only deviates from the approved design's
  deliberate own-vs-bilateral colour split. The token comment carries the measurement and a
  NON-TEXT-USE-ONLY warning so §1's lesson is not lost.
- 🛑 **Do not "unify" this with `--pr-sidebar-fg-subtle`, and never use it for text.** They are the
  same hex answering two different questions.

## 9. Reporting tab: Target / Achieved open the shared drawer, not the design's anchored popovers

- **Design says:** clicking a row's `Target` figure opens a 380px popover ("Target details" — the
  figure, a per-Centre contribution list, a unit footnote); clicking `Achieved` opens a 420px popover
  ("Reported results" — one row per report with a status pill, a date and a value, plus
  `See all in Results →`). `PRMS-Reporting.dc.html:1754-1786` and `:1776-1801`.
- **We do:** both open the **shared `indicator-drawer`**, on its `info` tab and its `report` tab
  respectively (`dashboard-lab.component.ts` → `onReportingOpenTarget` / `onReportingOpenAchieved`).
- **Why:** that drawer already ships and is already the surface Results, the legacy AoW table and the
  Report flow all use for this data. Building popovers beside it would put the same two facts behind
  two surfaces that then have to be kept in step — the thing the Results tab (P2-3394) explicitly
  refused to do. The drawer also holds far more than a popover can.
- 🛑 **Do not "restore fidelity" by adding the popovers.** Added 2026-08-21 for P2-3405. Both external
  reviewers on that ticket agreed the drawer is the right information architecture and that the
  reason had to be recorded here rather than left as a source comment — which is why this entry
  exists. The source comments now point at it.

## 10. Reporting tab: Intermediate / 2030 are sibling cards — and the design now agrees

- **We do:** render `Intermediate outcomes` and `2030 outcomes` as **top-level cards, siblings of the
  Area-of-Work cards**, with a tag chip (`Intermediate`, `2030`) instead of an AoW code.
- **History:** a comment in `reporting-aow-table.component.ts` calls this "an owner correction to the
  design … the design reference nests them under each AoW". **That comment is stale.** The live
  design's `repCards` list is flat and its `a.hasTag` branch (`PRMS-Reporting.dc.html:1691-1693`)
  renders exactly these sibling cards. Code and design agree today.
- **Why this entry exists anyway:** so nobody reads the stale comment, concludes the code is off-spec,
  and "fixes" it by nesting them. Verified against the live snapshot 2026-08-21 (P2-3405).

## 11. Reporting tab: empty-state copy says "indicators", not the design's "results"

- **Design says:** `No results match these filters.` (`PRMS-Reporting.dc.html:1671`).
- **We say:** `No indicators match your filters.`
- **Why:** on this tab the list is of **indicators**, and in PRMS a "result" is a specific reported
  entity with its own lifecycle — the word names the wrong noun here and would read as "you have no
  reported results", which is a different and possibly false statement. Added 2026-08-21 (P2-3405).
- We also keep **two** empty states where the design has one: a filtered one (with `Clear filters`)
  and a genuinely-empty one. With no filter active the design's single sentence would be false.
