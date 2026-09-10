## Why

`P2-3384` asks the bilateral Knowledge Product section to show the full metadata of the result:
the MELIA questions the researcher answers, the bibliographic metadata that arrives already
populated from CGSpace / Web of Science / Unpaywall / Altmetric, the FAIR score, and a Sync
button. Today the section is 56 lines rendering **7 read-only rows**, with no MELIA block at all
(`grep -ri melia pages/bilateral/` returns nothing) — so a researcher reporting a bilateral
Knowledge Product cannot answer the MELIA questions anywhere.

Its green check is worse than incomplete: the checklist is a single item on `handle`, a field the
researcher cannot edit. The section therefore turns green on data the user never touched, while
the story requires the green check to be driven by the MELIA answers.

The ticket states the target plainly: *"The W1/W2 Knowledge Product section already implements
this behaviour. For bilateral results, the same section must be used with the same logic — no MDS
subset, no toggle."*

## What Changes

- Extract the response→view mapping of the W1/W2 section (`_mapFields`, the CGSpace and WoS
  readers, `transformBoolean`, the FAIR splitter) into a **pure module shared by both flows**, so
  "the same logic" is literally the same code and the two cannot drift. The W1/W2 component
  delegates to it with no behaviour change.
- Build the bilateral Knowledge Product section on top of that module: the two fixed info alerts
  plus one alert per API warning, the MELIA conditional tree, the read-only metadata rows, the
  FAIR score as four radials, and the Sync button with its confirmation.
- Re-point the section's MDS checklist at the MELIA fields, so the green check follows what the
  researcher answered instead of the handle.
- No `Complete full metadata` toggle: the ticket puts it out of scope for this type, and all
  fields are always visible.

## Capabilities

### New Capabilities
- `bilateral-knowledge-product-metadata`: the bilateral Knowledge Product section renders the
  MELIA block, the auto-populated metadata, the FAIR score and Sync, and its completion is
  determined by the MELIA answers.

### Modified Capabilities
<!-- None. The W1/W2 section keeps its behaviour exactly; only the mapping moves out of the
     component and is covered by the same spec suite. -->

## Impact

- **Frontend only.** Nothing waits on the backend: the section already calls the endpoint the
  W1/W2 flow uses, and the MELIA payload is in that response today — the bilateral UI simply did
  not render it.
- The W1/W2 result-detail flow already synchronises `resultsSE.currentResultId` when a bilateral
  result is opened (`bilateral-creation.service.ts:87` and `:96`), so the existing MELIA and
  resync endpoints resolve the right result from the bilateral page without new service methods.
- Affected files:
  - `.../rd-result-types-pages/knowledge-product-info/model/knowledge-product-metadata.mapper.ts` — new, the shared mapping.
  - `.../rd-result-types-pages/knowledge-product-info/knowledge-product-info.component.ts` — delegates to it.
  - `.../pages/bilateral/components/section-type-specific/type-knowledge-product/` — the section itself.
