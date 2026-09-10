# P2-2932 — Requirement audit (pre-build understanding session)

| Field | Value |
|---|---|
| Ticket | **P2-2932** — *Cross-section consistency: Section 2 (ToC) vs Section 5 (result typology) values* |
| Epic | P2-2928 — ToC Planning and Reporting Alignment |
| Branch audited | `performance-refactor` @ `144244f07` |
| Type | **Requirement audit only** — no production code was written |
| Purpose | Material for the PO understanding session: the requirement checked line by line against the code, with contradictions and open questions already found |
| Author | Requirement audit pass, 2026-08-31 |

> Read with: `onecgiar-pr-server/docs/p25-toc-result-type-rules.md` (ToC typology rules) and
> `docs/prd.md` / `docs/trd/trd.md` (constitutional baseline).

---

## 1. Reconciling the title against the description

**They are not two halves of the same thing. The description describes the work; the title describes a
side effect of it — and the title's section numbers are stale.**

### 1.1 The field both refer to

Both title and description point at one column:

- `result_indicators_targets.contributing_indicator` — `decimal(12,2) NULL`
  - entity: `onecgiar-pr-server/src/api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts:28-35`
  - created as `text NOT NULL` in `onecgiar-pr-server/src/migrations/1694081217251-CreateTableIndicatorTarget.ts:7`
  - → `decimal(6,2)` in `1701461558478-migrateDataIntoTargetsStringValues.ts:69`
  - → `decimal(9,2)` in `1707941142995-updatePrecisionIndicatorsTargets.ts:10`
  - → `decimal(12,2)` in `1770755147261-ContributingIndicatorPrecision.ts:7`

The precision history is itself evidence: the column was widened twice, most recently to 12,2
(max 9,999,999,999.99). Nobody trains ten billion people — the widening was driven by monetary
values already being entered in this field.

### 1.2 "Achieved Yearly Value" is not a label that exists

Grepped the whole repo: the string *"Achieved Yearly Value"* appears nowhere. The same column is
called four different things on four screens:

| Surface | Label | file:line |
|---|---|---|
| Contributors & Partners (P25, phase 2026) | **"Contribution to indicator target"** | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html:125` |
| Contributors & Partners (P25, phase 2025) | **"Enter target"** (placeholder) | same file, `:147` |
| Theory of Change mapped-results modal (P22) | **"Contribution"** | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/target-indicator/target-indicator.component.ts:35` |
| RFR "view results" drawer | **"Achieved value"** | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-view-results-drawer/aow-view-results-drawer.component.ts:54` |
| RFR AoW/HLO table (aggregate) | **"Achieved value"** = `SUM(contributing_indicator)` | `.../aow-hlo-table/aow-hlo-table.component.ts:156` |

"Achieved Yearly Value" is almost certainly the RFR-side name (`actual_achieved_value_sum`) read
back onto the per-result field. Confirm with the PO before writing any spec (see Q1).

### 1.3 The section numbers in the title are stale

Section numbering is derived positionally from `resultDetailRouting`
(`onecgiar-pr-client/src/app/shared/routing/routing-data.ts:359-418`, consumed by
`.../result-detail/components/result-sections-sidebar/result-sections.service.ts:63-70`).

Commit `798fcbabf` (**P2-3175**, 2026-07-23) moved Evidence to the end of the form. The numbering
before and after:

| Portfolio | Before P2-3175 | **Today (`performance-refactor`)** |
|---|---|---|
| **P25** | 1 General info · **2 Contributors & partners (ToC)** · 3 Geographic location · 4 Evidence · **5 result typology** | 1 General info · **2 Contributors & partners (ToC)** · 3 Geographic location · **4 result typology** · 5 Evidence |
| **P22** | 1 General info · **2 Theory of change** · 3 Partners & Contributors · 4 Geographic location · 5 Links to results · 6 Evidence · 7 result typology | 1 General info · **2 Theory of change** · 3 Partners & Contributors · 4 Geographic location · 5 Links to results · **6 result typology** · 7 Evidence |

So the title's "Section 2 (ToC) vs Section 5 (result typology)" describes the **P25 layout as it was
before 2026-07-23**. Section 2 is still ToC. The typology page is now **Section 4** in P25 and
**Section 6** in P22, and Section 5 in P25 is Evidence. The ticket must be re-worded or the session
will discuss the wrong screen.

(That Section 2 is named "Theory of Change" in P25 even though the route is `contributor-partners`
is confirmed in the UI copy itself:
`.../rd-contributors-and-partners/components/multiple-wps/components/knowledge-product-selector/knowledge-product-selector.component.ts:54`
— *"…directly linked to Section 2, Theory of Change"*.)

### 1.4 Verdict

- **The description is the work.** It is a concrete, implementable behaviour: derive
  `contributing_indicator` from type-specific data instead of asking the user to type it.
- **The title is the consequence.** "Cross-section consistency" is what you get once the derivation
  exists: Section 2's number can no longer disagree with the typology section's numbers, because it
  *is* those numbers.
- They diverge on one material point: a **consistency** ticket could be satisfied by a read-only
  cross-check/warning ("these two numbers disagree"), which is far cheaper and far less destructive
  than auto-population. Auto-population is a one-way door — it overwrites what users typed, and it
  moves live progress percentages (§4). **The PO must pick one (Q2).**

---

## 2. Field mapping — the five per-type rules against the code

Legend: ✅ exists as a single field · ⚠️ exists but not in the shape the rule assumes · ❌ does not exist.

| # | Rule (from the description) | Status | What actually exists |
|---|---|---|---|
| 1 | **KP** — default 1, user may set 0 when the KP is an "enabler" | ⚠️ / ❌ | The 1/0 rule already exists **as tooltip prose**, not as behaviour. The word "enabler" is **not** a KP concept anywhere in the codebase. |
| 2 | **Capacity Development** — always = Total Number of People Trained | ❌ | There is **no total column**. Four separate counts, never summed anywhere. |
| 3 | **Innovation Development** — default 1, same as KP | ⚠️ | No count field exists other than `number_of_varieties` (a different concept). The "default 1" would be a pure constant. |
| 4 | **Policy Change** — 1 / actors influenced / USD | ❌ (two of three) | No three-way contribution-type selector, and **no "actors influenced" field at all**. A USD `amount` exists but is gated on the wrong-looking type id. |
| 5 | **Innovation Use** — actors using-or-benefiting / USD leveraged | ⚠️ | Both concepts exist but as **repeatable lists**, not single values. No field is called "leveraged", and the reporting-option toggle does not exist — the blocks are simultaneous, not alternative. |

### 2.1 Knowledge Product — the "enabler" concept does not exist

- Entity `onecgiar-pr-server/src/api/results/results-knowledge-products/entities/results-knowledge-product.entity.ts`
  — 20 columns (`handle`, `doi`, `knowledge_product_type`, `licence`, FAIR scores, MELIA fields,
  `cgspace_regions`/`cgspace_countries`, audit). **No `enabler`, no `is_enabler`, no equivalent flag.**
- `grep -ri enabler` across server + client returns hits **only** in
  Innovation Package / IPSR (`complementary_innovation_enabler_types`,
  `results_innovatio_packages_enabler_type`, migration
  `onecgiar-pr-server/src/migrations/1686314961010-insertInTablecomplementaryInnovationEnablerType.ts`)
  — a different result type entirely (type 10/11), not KP.

**But the rule already ships as guidance.** The 2026 tooltip under the field says, verbatim
(`.../multiple-wps-content.component.ts:75-79`):

> *"If you are reporting a Knowledge Product and have mapped it to a TOC KPI/indicator, enter **1** as
> the contribution to target. If the KP does not count independently toward the yearly target — for
> example, because it serves as a complementary result supporting the achievement of another result
> that carries the count — enter **0**."*

So P2-2932's KP rule is *"automate the tooltip"*. Note the tooltip says **"complementary result"**,
not "enabler" — and "complementary" is an IPSR term with its own meaning. The vocabulary needs
settling before a flag gets named (Q4).

**Consequence:** the 0-case cannot be derived. Nothing in the KP data says "this KP does not count".
Automating this rule means either (a) always 1, and keep the field editable so the user can override
to 0, or (b) add a new KP-level boolean. Option (b) is new schema + new UI, i.e. materially bigger
than the ticket reads (Q4).

### 2.2 Capacity Development — "Total Number of People Trained" is not a field

- Entity `onecgiar-pr-server/src/api/results/summary/entities/results-capacity-developments.entity.ts`:
  - `male_using` — `bigint`, `:36-40`
  - `female_using` — `bigint`, `:43-47`
  - `non_binary_using` — `bigint`, `:50-54`
  - `has_unkown_using` — `bigint`, `:57-61`
  - **no `total_participants` / `total_trained` column** (grepped the whole server tree — zero hits)
- Client (result detail, Section 4/6):
  `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/cap-dev-info/cap-dev-info.component.html:11,13,20,27`
  — four independent `app-pr-input type="number"` fields labelled Women / Men / Non-binary /
  Unknown. **Nothing on this screen displays a total.**
- Neither the P22 nor the P25 validation function sums them: `validation_capdev_*` requires all four
  to be present, not that they add to anything.

**Consequence:** "always equals the Total Number of People Trained" requires the platform to define
the total as `female_using + male_using + non_binary_using + has_unkown_using`. That definition does
not exist yet. Two sub-decisions fall out: does the total include `has_unkown_using`, and should the
total be shown on screen so the user can see what will be pushed to Section 2 (Q5).

Also note: there is **no individual-vs-group training discriminator**. There is no
`is_attending_matter` and no `training_type_id`. The only adjacent fields are
`is_attending_for_organization` (boolean, `:113-118` — "were the trainees attending on behalf of an
organization?") and `capdev_term_id` (`:73-77` — short/long term). If the business rule ever needs
to count *sessions* rather than *people*, nothing in the schema supports it.

### 2.3 Innovation Development — no count exists; "default 1" is a constant

- Entity `onecgiar-pr-server/src/api/results/summary/entities/results-innovations-dev.entity.ts`.
  The only count-like column is `number_of_varieties` (`bigint`, `:95-100`), gated by
  `is_new_variety` (`:81-86`) — that is "how many plant varieties/breeds does this innovation
  comprise", not "how many innovations this result represents".
- One reported result = one innovation, so the rule reduces to a literal `1`. That is genuinely
  trivial to implement, and equally has the same 0-override problem as KP (§2.1).

### 2.4 Policy Change — the selector the rule assumes does not exist

Entity `onecgiar-pr-server/src/api/results/summary/entities/results-policy-changes.entity.ts`,
full column list:

| Column | Type | Line |
|---|---|---|
| `result_policy_change_id` | PK | `:18-21` |
| `result_id` | FK | `:31-36` |
| `policy_stage_id` | FK → `clarisa_policy_stage` | `:38-42` |
| `policy_type_id` | FK → `clarisa_policy_type` | `:44-48` |
| `amount` | `float` | `:50-55` |
| `status_amount` | `text` (Confirmed / Estimated / Unknown) | `:57-62` |
| `linked_innovation_dev` | `boolean` | `:64-70` |
| `linked_innovation_use` | `boolean` | `:72-78` |
| `result_related_engagement` | `boolean` | `:80-85` |
| audit columns | | |

Against the rule's three branches:

| Rule branch | Field | Status |
|---|---|---|
| "a policy change" → **1** | — | ✅ trivially a constant |
| "capacity development of key actors" → **number of actors influenced** | — | ❌ **no such column anywhere.** Grepped `results_policy_changes` and the whole `summary/` tree for `actor` / `influenc` — zero hits. `result_actors` exists but is wired to Innovation Use (`section_id` → `result_innov_section`), not Policy Change. |
| "programme budget or investment" → **USD amount** | `amount` + `status_amount` | ⚠️ exists, but see below |

**There is no three-way "policy contribution type" selector.** What exists is two different,
partially-overlapping things:

1. `policy_type_id` — the **CLARISA policy-instrument catalog**: *Policy or strategy* / *Legal
   instrument* / *Program, budget or investment* (guidance text at
   `onecgiar-pr-client/.../policy-change-info/policy-change-info.component.ts:96-102`). This
   classifies the instrument, not the contribution mechanism. It is synced from CLARISA
   (`onecgiar-pr-server/src/clarisa/clarisa-policy-types/clarisa-policy-types.repository.ts:13`
   does `DELETE FROM clarisa_policy_type` then repopulates), so its ids are **not owned by this
   repo** and can change.
2. A DB-seeded `result_questions` row rendered as a select
   (`policy-change-info.component.html:44-52`, `policyChangeQuestions.optionsWithAnswers`). Its text
   and options live only in the database, not in any migration in this repo, so the exact wording
   cannot be pinned from source. A **dead** constant in the same component
   (`policy-change-info.component.ts:21-24`) still lists exactly two of the ticket's three branches:
   `'Policy change'` and `'The capacity development of key actors in a policy process'` — strong
   evidence this question *is* what the ticket means by "policy contribution type", and that it has
   **two** options, not three.

**Suspected pre-existing defect (verify before building on it).** The USD amount is shown only when
`policy_type_id == 1`:

```ts
// onecgiar-pr-client/.../policy-change-info/policy-change-info.component.ts:15
private static readonly POLICY_TYPE_WITH_AMOUNT = 1;
```
```html
<!-- .../policy-change-info.component.html:23,34 -->
*ngIf="innovationUseInfoBody.policy_type_id == 1"
```

The ticket says the USD amount belongs to **"a programme budget or investment"**, which is the
*third* item in the guidance list. If CLARISA id 1 is *"Policy or strategy"*, the USD field is
attached to the wrong policy type today. This cannot be settled from the repo — `clarisa_policy_type`
is populated at runtime from CLARISA. **Needs a DB check in the target environment** before P2-2932
derives anything from `amount` (Q6).

### 2.5 Innovation Use — both concepts exist, neither as a single value

There is **no "reporting option" toggle**. The actors block, the organizations block and the
quantitative-measures block all render simultaneously
(`onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html`).

**"Number of actors using or benefiting"** — a repeatable list, one row per actor type:

| Field | Entity | Line | Client |
|---|---|---|---|
| `how_many` | `onecgiar-pr-server/src/api/results/result-actors/entities/result-actor.entity.ts` | `:57-62` | `innovation-use-form.component.html:142` ("Total") / `:153` ("How many") |
| `women`, `women_youth`, `men`, `men_youth` | same entity | `:21-45` | `innovation-use-form.component.html:77,86,110,119` |
| `sex_and_age_disaggregation` | same entity | `:52-56` | `:65` |
| `actor_type_id` | same entity | `:114-118` | `:39` |

Plus a **second** count list for organizations —
`onecgiar-pr-server/src/api/results/results_by_institution_types/entities/results_by_institution_type.entity.ts`:
`how_many` (`:23-28`), `graduate_students` (`:37-42`), client `innovation-use-form.component.html:230,239`.

So "number of actors" would be `SUM(result_actors.how_many)` across N rows — and it is an open
question whether organizations count as "actors benefiting" (Q7).

**"USD amount leveraged during the reporting period"** — the word *leveraged* appears **nowhere** in
the codebase. What exists is three parallel investment tables, each a repeatable list with a
`kind_cash decimal(10,2)` and an `is_determined` flag
(created in `onecgiar-pr-server/src/migrations/1693404266259-addedKindCashColumnBudget.ts:7-9`):

| Screen block | Table | Entity |
|---|---|---|
| "Estimated total USD-value of investment by CGIAR Programs during the reporting period" (`body.investment_programs`) | `result_initiative_budget` | `onecgiar-pr-server/src/api/results/result_budget/entities/result_initiative_budget.entity.ts:44-51` |
| "…by CGIAR W3 or bilateral projects during the reporting period" (`body.investment_bilateral`) | `non_pooled_projetct_budget` | `.../non_pooled_proyect_budget.entity.ts:52-59` |
| "…(co-)investment by partners during the reporting period" (`body.investment_partners`) | `result_institutions_budget` | `.../result_institutions_budget.entity.ts:44-51` |

Client: `onecgiar-pr-client/src/app/shared/components/innovation-use-form/components/estimates/estimates.component.html:5,17,48,58,87,95`.

So "USD amount leveraged" maps to **a sum over one, two, or all three of these tables** — a choice
the ticket does not make (Q7). Note also `kind_cash` is `decimal(10,2)` (max 99,999,999.99) while
`contributing_indicator` is now `decimal(12,2)`; a sum of three tables can exceed the source
precision but not the destination's.

⚠️ Separately, the **bilateral** Innovation Use screen shows a field literally labelled *"Estimated
total USD-value of investment by CGIAR W3 or bilateral projects during the reporting period"* bound
to `body.investment_bilateral_usd` — it is **hard-disabled with a "Coming soon" badge and has no
server column**
(`onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.html:124-150`),
and two further "Investment (USD)" rows there are static "Not available yet" placeholders (`:332-341`).
Do not mistake those for storage.

---

## 3. AC6 — reactivity

> *"whenever the underlying indicator values change, the Achieved Yearly Value updates automatically
> to stay consistent."*

### 3.1 Where the value is written today

**Client-owned, in four independent places. There is no server-side derivation of any kind.**

| # | Surface | Client binding | Endpoint |
|---|---|---|---|
| 1 | **Contributors & Partners, Section 2 (P25)** — the manual field | `activeTab.indicators[0].targets[0].contributing_indicator`, plain `<input type="number">` + `ngModel` (`.../multiple-wps-content.component.html:145-152`); saved by `rd-contributors-and-partners.component.ts:570` | `PATCH /v2/api/contributors-partners/:resultId` — `results-api.service.ts:1501-1503` → `onecgiar-pr-server/src/api/results-framework-reporting/contributors-partners/contributors-partners.controller.ts:47-59` |
| 2 | **Theory of Change, Section 2 (P22 legacy)** — field is called **"Quantitative contribution"** and binds a *different property name*, `item.contributing`, gated on `item.indicator_question` | `.../rd-theory-of-change/components/shared/toc-initiative-out/target-indicator/target-indicator.component.html:109-111` | `POST toc/create/toc/result/:resultId` — `results-api.service.ts:390` → `results-toc-results.controller.ts:26` |
| 3 | **RFR "Report result" modal** (AoW/HLO table) — set at result **creation** | `contribution_to_indicator_target` → `contributing_indicator` (`aow-hlo-create-modal.component.ts:495`, `.../shared/report-result/create-result-payload.util.ts:129`) | `POST results-framework-reporting/create` → `link-framework-result-toc.service.ts:26` → `framework-result-toc-indicators.service.ts:110-193` `_upsertIndicatorTargetRecord` |
| 4 | **Dashboard-lab report form** — same payload | `contribution_to_indicator_target` (`lab-report-form.component.ts:109,307,523`) | same as #3 |

Paths 1 and 2 converge on one repository method — the only place the column is written in the
result-detail flow:

- `saveInditicatorsContributing`, `onecgiar-pr-server/src/api/results/results-toc-results/repositories/results-toc-results.repository.ts:1715-1912`
  - `contributing_indicator: this.toNumberOrNull(target.contributing_indicator ?? target.contributing)` (`:1831-1832`, `:1895-1896`)
  - the `?? target.contributing` fallback is what lets the P22 property name land in the same column

The DTO field is `create-results-toc-result-v2.dto.ts:54-59` — and its own API description already
encodes the P2-3088 contract that P2-2932 would break (see C3):

```ts
@ApiPropertyOptional({
  description: 'Contribution to target for this indicator (accepts 0 for qualitative indicators).',
})
contributing_indicator?: number | null;
```

**The save is bulk, never granular.** `PATCH /v2/api/contributors-partners/:resultId` carries the
entire section — ToC mapping, institutions, centers, linked results — in one body. A derived value
can only be written by participating in that payload, or by a new endpoint.

A fifth, separate write path exists in the bilateral module
(`onecgiar-pr-server/src/api/bilateral/dto/save-bilateral-toc-mapping.dto.ts:53`,
`bilateral.service.ts:1563`, `bilateral-center.service.ts:282-304`) against the same entity.

Any implementation of P2-2932 must cover all of these or the value will be right on one path and
stale on the others.

### 3.2 Is there existing cross-section plumbing? No.

Every result section is an **independent PATCH** with its own controller and its own transaction:

| Section | Endpoint | file:line |
|---|---|---|
| Capacity development | `PATCH summary/capacity-developent/create/result/:id` | `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:508-512` |
| Policy change | `PATCH summary/policy-changes/create/result/:id` | `:638-642` |
| Innovation use (P22) | `PATCH summary/innovation-use/create/result/:id` | `:471-475` |
| Innovation use (P25) | `PATCH v2 innovation-use/create/result/:id` | `:483-487` |

All four route into `summary.service.ts`, which contains **zero** references to `ResultsTocResult`,
`contributing_indicator` or `saveInditicatorsContributing`. Saving capacity development, innovation
use, innovation development or policy change never touches `result_indicators_targets`.

Three further negatives, each verified by grep over `onecgiar-pr-server/src`:

- **No database trigger** touches `result_indicators_targets`. The only `CREATE TRIGGER` in the whole
  migration history is `1769300000000-BilateralResultCodeAutoIncrement.ts` (bilateral result-code
  auto-increment), unrelated.
- **No recompute/sync service exists.** `grep -ri "recalcul|recomput"` over the server source returns
  **zero** matches. On the client every match is an unrelated Angular `computed()` comment.
- **Every sum in the codebase is read-time only.** `results.service.ts:3116`,
  `aow-bilateral.repository.ts:774`, `existing-result-contributors.mapper.ts:7-41`, and the aux
  totals in `results-toc-results.repository.ts` all aggregate on the fly for display; none writes a
  derived value back.

Even the bulk Contributors & Partners PATCH only rewrites `contributing_indicator` when **the caller
itself** sends a changed `indicators[]` array in that same request. There is no server-side
derivation from any other section's data.

**AC6 needs new plumbing whichever way it is built.**

There is one closely-related precedent worth citing at the session:
`77809ea5d 🔧 fix(innovation-use-form) P2-3199: remove duplicated innovation link question and stop
section 4 from overwriting section 2` — the last time a section write reached into another section,
it was treated as a **bug** and removed. P2-2932 asks for exactly that coupling, deliberately.

### 3.3 The three implementable shapes

| Option | Where | Cost | Risk |
|---|---|---|---|
| **A. Server-derived on read** — never store; compute `contributing_indicator` in the GET | one place, always consistent | medium | breaks the manual-override case (KP 0, qualitative results); the RFR aggregate SQL (`SUM(rit.contributing_indicator)`) reads the **table**, so it would also have to change |
| **B. Server-derived on write** — each Section 4/6 PATCH recomputes and upserts the target row | 4+ services to touch | medium-high | partial writes; a result mapped to N ToC indicators (§3.4) has no single row to write |
| **C. Client pre-fill + editable** — Section 2 pre-populates from the typology data, user can override | 1 component | low | not actually "automatic" — AC6 is only satisfied while the user visits Section 2 after editing Section 4/6 |

Option C is what the existing tooltip already asks the user to do by hand and is the smallest honest
reading of the description. Option A/B are what AC6 literally demands. **The PO must choose (Q3).**

### 3.4 The multiplicity problem (blocks all three options)

`contributing_indicator` is **not one value per result**. Its grain is:

```
result → results_toc_result (one per ToC node / contributing initiative, N tabs in the UI)
       → results_toc_result_indicators (one per selected KPI)
       → result_indicators_targets (one per YEAR — `target_date int`, entity :52-56)
```

- A result mapped to **three** ToC nodes has three tabs, each with its own contribution value.
  Auto-population must decide whether all three get the same derived number (which would triple-count
  in the RFR aggregate — `SUM` across all rows) or whether it is split (and how).
- The client only ever reads/writes `targets[0]` — the **first** target row. If a result has rows for
  more than one `target_date`, the UI silently ignores all but one. This is a latent defect today and
  auto-population would write into the same blind spot.
- Each ToC indicator has its **own unit of measurement** (`unit_messurament`, surfaced read-only at
  `multiple-wps-content.component.html:117-118`). A single result-type-driven rule ignores the unit
  entirely — the current tooltip explicitly tells the user to match the *indicator's* unit
  ("If the indicator measures USD invested or leveraged, enter the corresponding monetary value").
  **The description's rules are result-type-driven; the current guidance is indicator-unit-driven.
  These two rules conflict for every result whose type and indicator unit disagree** (Q8).

### 3.5 Blast radius — this field feeds live progress reporting

Changing how `contributing_indicator` is populated changes numbers on four other surfaces:

| Consumer | What it does | file:line |
|---|---|---|
| **RFR AoW/HLO progress** | `COALESCE(SUM(CAST(rit.contributing_indicator AS DECIMAL(15,2))), 0) AS actual_achieved_value_sum`, filtered by `rit.target_date` (the "yearly" part), `r.status_id IN (2,6)` (QA'd/Approved only) and `r.result_level_id IN (3,4)` → drives `progress_percentage` and the Not started / In progress / Achieved / Overachieved chips | `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts:774`, `:783`, `:794`; percentage at `:666-687` |
| Basic / Excel report export | `IFNULL(CAST(ROUND(toc_rit.contributing_indicator, 0) AS SIGNED), '')` inside a GROUP_CONCAT'd "Target contribution: …" narrative | `onecgiar-pr-server/src/api/results/result.repository.ts:995` (method from `:824`) |
| ToC metadata enrichment | `sum + (Number(target.contributing_indicator) \|\| 0)` per indicator | `onecgiar-pr-server/src/api/results/results.service.ts:3110-3132` |
| RFR "existing contributors to this indicator" | `sumContributingIndicatorForTocIndicator` | `.../results-framework-reporting/.../existing-result-contributors.mapper.ts:7-41`, consumed at `existing-result-contributors-loader.service.ts:88` |
| Program indicator contribution summary | `WHERE rit.contributing_indicator IS NOT NULL` | `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts:827` |
| ToC "overall progress" (P22 + P25 modals) | `sumOverallProgress += Number(item.contributing_indicator)`; server-side `auxTotal + Number(elementC.contributing_indicator)` | `.../rd-contributors-and-partners/components/multiple-wps/components/mapped-results-modal/mapped-results-modal.component.ts:62`; `results-toc-results.repository.ts:1194-1330`, `:1468-1512`, `:1653-1694` |

A backfill of historical results would move every one of those figures. **Whether P2-2932 applies
retroactively is a decision, not a detail (Q9).**

---

## 4. Collision with P2-3253

### 4.1 What P2-3253 is

> *P2-3253 — "Contribution to target" se pone verde sin completar el campo obligatorio*
> (`docs/context-ai/orden-2026-08-26.md:68`, Priority 2, assigned to Juan David)

The branch `p2-3253-contribution-green-check` does **not exist** locally or on `origin` after a
`git fetch --prune`; the work has not been pushed. The state it will change is fully determined
from what is on `performance-refactor`, though.

### 4.2 The precise state of the bug

**Frontend already treats the field as mandatory.** Commit `b4a7755d0` (**P2-3088**, 2026-07-01,
Yecksin) added the required marker plus `appFeedbackValidation` in both edit points. Its message
states the rule explicitly:

> *"Binding: `contributing_indicator`. **0 is accepted as a valid value** (qualitative-result escape,
> confirmed with Ángel); null/empty is treated as incomplete. The section green check (backend
> green_checks query) is tracked separately in **P2-3089**."*

Live in the template at `.../multiple-wps-content.component.html:135-143`:

```
[isComplete]="activeTab.indicators[0].targets[0].contributing_indicator !== null
           && … !== undefined && … !== ''"
```

**Backend green check never got done.** `grep contributing_indicator` over
`onecgiar-pr-server/src/migrations/1761849861521-createValidtionP22.ts` and
`.../1762528725798-createValidtionP25.ts` returns **zero hits**. The P25 contributor-partners
validation checks the *target*, not the *contribution*
(`onecgiar-pr-server/src/migrations/1762866499786-updatepartnersContributors.ts:50-53`):

```sql
SUM(valid_text(rtr.toc_progressive_narrative) AND
    rtr.toc_result_id IS NOT NULL AND
    rtri.toc_results_indicator_id IS NOT NULL AND
    rit.number_target > 0) AS valid
```

`number_target` is the planned target; `contributing_indicator` is the achieved contribution. The
section therefore goes green with the mandatory contribution field empty — exactly the reported bug.
**P2-3253 is the unfinished half of P2-3088 (i.e. P2-3089).** Its fix is a new migration adding
`rit.contributing_indicator IS NOT NULL` to that `SUM`.

> Related but distinct: `docs/specs/bugfix/green-checks-not-loading/proposal.md` documents a *DB
> drift* of the same function (`validation_contributor_partner_P25`) returning a mislabelled 404.
> That is an operational fix on the same object, not the same ticket. **Both P2-3253 and P2-2932
> will be editing a function that is known to have drifted from its migration in at least one
> environment** — re-baseline it (`SHOW CREATE FUNCTION`) before either change.

### 4.3 Where the two tickets collide

| # | Collision | Detail |
|---|---|---|
| **C1** | **Same SQL object.** Both need `validation_contributor_partner_P25` rewritten. MySQL functions are replaced whole (`DROP` + `CREATE`), so the second migration to land silently reverts the first unless it is rebased on it. | `onecgiar-pr-server/src/migrations/1762866499786-updatepartnersContributors.ts:50-53` |
| **C2** | **P2-2932 makes P2-3253's check a no-op.** Once the value is auto-populated, `contributing_indicator` is never null, so an `IS NOT NULL` green check always passes. P2-3253's mandatory gate would stop protecting anything the moment P2-2932 ships. | — |
| **C3** | **The 0-value contract is directly contradicted.** P2-3088 established `0` = *valid, deliberate, "qualitative result"*. P2-2932 wants `0` = *"this KP is an enabler and does not count"*. Same stored value, two incompatible meanings, and no way for a validator or a reader to tell them apart. | commit `b4a7755d0` message vs. ticket description |
| **C4** | **Same input control.** P2-3253 may harden or re-gate the input at `.../multiple-wps-content.component.html:125-152`; P2-2932 must make that same control pre-filled and/or read-only. Merge conflict in one ~28-line block. | `.../multiple-wps-content.component.html:125-152` |
| **C5** | **Neither ticket covers all the write paths.** There are four (§3.1): P25 Section 2, the P22 legacy ToC page (`item.contributing`), the RFR create-modal (`aow-hlo-create-modal.component.ts:495`) and dashboard-lab (`lab-report-form.component.ts:523`). P2-3253's SQL fix applies to `validation_contributor_partner_P25` only — a **P25** function — so it does not reach the P22 page at all, and the two creation paths carry only client-side guards. | see §3.1 |
| **C6** | **The P22 legacy page uses a different property name.** `item.contributing`, not `contributing_indicator` (`target-indicator.component.html:109-111`), reconciled server-side by `target.contributing_indicator ?? target.contributing` (`results-toc-results.repository.ts:1831`). Any auto-population that writes only the P25 property silently no-ops on P22 — and any validator written against one name misses the other. | `results-toc-results.repository.ts:1831-1832`, `:1895-1896` |

**Recommended sequencing (for the PO to confirm):** land P2-3253 first — it is a small, well-understood
migration, and it establishes the null/0 contract in the validator. Then design P2-2932 *on top of*
that contract, so the "enabler" case gets its own representation instead of overloading `0` (Q4/Q10).

---

## 5. Open questions for the Product Owner

Each is closed-form with concrete options.

**Q1 — Naming.** "Achieved Yearly Value" appears nowhere in the product. Which existing field does it
mean?
&nbsp;&nbsp;**(a)** `contributing_indicator`, shown in Section 2 as *"Contribution to indicator target"* — the assumption in this audit.
&nbsp;&nbsp;**(b)** the RFR aggregate *"Achieved value"* (`actual_achieved_value_sum`), i.e. the ticket is about the dashboard, not the form.
&nbsp;&nbsp;**(c)** a new field.

**Q2 — Consistency or auto-population?** The title asks for consistency; the description asks for
auto-population. Which is in scope?
&nbsp;&nbsp;**(a)** Auto-populate (write the value). Destructive, moves live progress figures.
&nbsp;&nbsp;**(b)** Cross-check only (warn when Section 2 disagrees with the typology section, user resolves). Non-destructive, ~1/5 the work.
&nbsp;&nbsp;**(c)** Pre-fill on first entry only, never overwrite an existing value.

**Q3 — Where does the derivation live?** (Determines AC6's real cost.)
&nbsp;&nbsp;**(a)** Server, computed on read — always consistent, but the manual override (incl. KP=0) disappears and the RFR aggregate SQL must change too.
&nbsp;&nbsp;**(b)** Server, recomputed on every typology-section save — 4+ services, true AC6 reactivity.
&nbsp;&nbsp;**(c)** Client pre-fill in Section 2, still editable — cheapest, but only "reactive" when the user opens Section 2.

**Q4 — The KP "enabler".** No such concept exists in the schema, and the current tooltip calls it a
*"complementary result"*. How is it captured?
&nbsp;&nbsp;**(a)** No new field: default to 1, leave the input editable, user types 0. (Zero schema change; keeps today's behaviour and today's tooltip.)
&nbsp;&nbsp;**(b)** New boolean on `results_knowledge_product` (e.g. `is_enabler`) plus a question in the KP section, and the contribution derives from it. (New migration + new UI.)
&nbsp;&nbsp;**(c)** Reuse the IPSR `complementary_innovation_enabler_types` vocabulary. (Not recommended — different result type, different meaning.)

**Q5 — Capacity Development total.** No total column exists. Define it:
&nbsp;&nbsp;**(a)** `female_using + male_using + non_binary_using + has_unkown_using`.
&nbsp;&nbsp;**(b)** the same, **excluding** `has_unkown_using`.
&nbsp;&nbsp;**(c)** add a stored `total_trained` column the user fills directly.
&nbsp;&nbsp;And: should the total be **displayed** in the CapDev section so the user sees what Section 2 will receive? (yes / no)

**Q6 — Policy Change: which selector, and is the USD field on the right type?** There is no three-way
contribution-type selector. Which does the rule mean?
&nbsp;&nbsp;**(a)** `policy_type_id` (CLARISA catalog: Policy or strategy / Legal instrument / Program, budget or investment).
&nbsp;&nbsp;**(b)** the DB-seeded `result_questions` policy question, whose dead in-code option list has only **two** branches (`policy-change-info.component.ts:21-24`).
&nbsp;&nbsp;**(c)** a new three-option selector to be built.
&nbsp;&nbsp;**Sub-question (blocking either way):** the USD amount is currently gated on `policy_type_id == 1`
(`policy-change-info.component.ts:15`), but the ticket ties USD to *"programme budget or investment"* —
the **third** guidance item. Is id 1 = "Policy or strategy"? If so, is today's gating a bug to fix
first? (Needs a `SELECT id, name FROM clarisa_policy_type` in the target environment — the catalog is
wiped and repopulated from CLARISA at runtime, so its ids are not owned by this repo and are not
guaranteed identical across environments.)
&nbsp;&nbsp;**And:** "number of actors influenced" **does not exist for Policy Change**. Add a new column, or drop this branch?

**Q7 — Innovation Use: which numbers?** No reporting-option toggle exists; the blocks render together.
&nbsp;&nbsp;**(a)** *Actors* = `SUM(result_actors.how_many)` only, or **also** `SUM(results_by_institution_type.how_many)` (organizations)?
&nbsp;&nbsp;**(b)** *USD* = which of the three investment tables — CGIAR Programs (`result_initiative_budget`), W3/bilateral (`non_pooled_projetct_budget`), partners (`result_institutions_budget`) — one, two, or all three summed?
&nbsp;&nbsp;**(c)** If both an actor count and a USD amount are present (the current UI allows it), which wins — or does a new explicit toggle have to be built?

**Q8 — Result type vs indicator unit.** The rules are **result-type**-driven. The shipped 2026 tooltip
is **indicator-unit**-driven ("use the same unit of measurement as the indicator itself"). They
disagree, e.g. a Capacity Development result mapped to a KPI measured in USD. Which wins?
&nbsp;&nbsp;**(a)** Result type always wins (implement the ticket as written; the tooltip becomes wrong and must be rewritten).
&nbsp;&nbsp;**(b)** Indicator unit wins; the type rules are only a default when the unit is ambiguous.
&nbsp;&nbsp;**(c)** Auto-populate only when the type rule and the indicator unit agree; otherwise leave manual.

**Q9 — Multiplicity and history.** A result can map to several ToC nodes/KPIs, and each mapping has a
row per year (`target_date`).
&nbsp;&nbsp;**(a)** When a result maps to N indicators, does each get the full derived value (which multiplies the total in the RFR `SUM`), or is it split, or is auto-population restricted to single-mapping results?
&nbsp;&nbsp;**(b)** Does this apply **only to the current reporting year's row**, or to every year?
&nbsp;&nbsp;**(c)** Is there a **backfill** of existing results? If yes, every RFR progress percentage and status chip moves — needs a comms plan. If no, old and new results follow different rules within the same dashboard.

**Q10 — Sequencing against P2-3253.** Both tickets rewrite
`validation_contributor_partner_P25` and both touch the same input control, and P2-2932 would make
P2-3253's green check unconditionally pass.
&nbsp;&nbsp;**(a)** Ship P2-3253 first, then build P2-2932 on its contract (recommended).
&nbsp;&nbsp;**(b)** Merge the two into one ticket.
&nbsp;&nbsp;**(c)** Ship P2-2932 first and close P2-3253 as obsolete.
&nbsp;&nbsp;**Sub-question:** P2-3088 fixed `0` = *"valid, qualitative result"*. P2-2932 wants `0` = *"enabler, does not count"*. Are these the same state, or must they be distinguishable in the data?

**Q11 — Section numbering.** The title says "Section 5 (result typology)", which was the P25 layout
before P2-3175 (2026-07-23) moved Evidence to the end. Today the typology page is **Section 4** in
P25 and **Section 6** in P22; Section 5 in P25 is Evidence. Confirm the ticket means the
**result-typology page** regardless of number, and re-title it to avoid the session discussing the
wrong screen.

**Q12 — Portfolio and phase scope.** The field is edited on two different Section 2 screens: the P25
`contributor-partners` page and the still-live P22 `theory-of-change` page (different label,
*"Quantitative contribution"*, and a different property name — see C6). Auto-population applies to:
&nbsp;&nbsp;**(a)** P25 phase 2026+ only (matching the `isCP2026()` gate that already governs the mandatory marker);
&nbsp;&nbsp;**(b)** all P25 phases;
&nbsp;&nbsp;**(c)** P25 and P22 both (roughly doubles the surface: two components, two save paths, two validation functions).

**Q13 — Editability after auto-population.** Once the value is derived, is the Section 2 input:
&nbsp;&nbsp;**(a)** read-only (fully derived);
&nbsp;&nbsp;**(b)** pre-filled but editable, with the override surviving later typology edits;
&nbsp;&nbsp;**(c)** pre-filled but editable, with the override **reset** on the next typology edit (the literal reading of AC6 — and the option that will surprise users most).

---

## 6. Summary of things that do not exist today

Ordered by how much they change the size of the ticket.

| # | Missing artefact | Needed by | Consequence |
|---|---|---|---|
| 1 | Policy Change **"number of actors influenced"** | Rule 4 | New column + new UI, or drop the branch |
| 2 | Policy Change **three-way contribution-type selector** | Rule 4 | Only a 2-option question and a 3-value CLARISA instrument catalog exist |
| 3 | KP **"enabler"** flag | Rule 1 | The 0-case cannot be derived from any data |
| 4 | Capacity Development **total people trained** | Rule 2 | Four counts, no total, no definition |
| 5 | Innovation Use **reporting-option toggle** | Rule 5 | Both blocks are always shown; the "either/or" premise is false |
| 6 | Innovation Use **single "USD leveraged"** value | Rule 5 | Three investment tables of repeatable rows; the word "leveraged" is absent |
| 7 | **Any cross-section reactivity mechanism** | AC6 | Per-section PATCHes only; the last cross-section write was removed as a bug (P2-3199) |
| 8 | Backend green check on `contributing_indicator` | P2-3253 | The mandatory field is not validated server-side at all |

---

## Change log

| Date | Description |
|---|---|
| 2026-08-31 | Initial requirement audit against `performance-refactor` @ `144244f07`. No production code changed. |
