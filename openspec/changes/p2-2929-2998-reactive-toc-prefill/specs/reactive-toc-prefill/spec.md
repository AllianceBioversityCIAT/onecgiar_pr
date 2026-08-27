# Spec: reactive-toc-prefill

## ADDED Requirements

### Requirement: reconciliation on ToC node change
When the resolved ToC reference set for Science Programs or Centers changes in-session (node added, changed or removed — Output, Outcome or 2030 Outcome), the from-ToC preselection SHALL reconcile immediately without a page reload: session-preloaded items (`new: true`) no longer in the references SHALL be removed, and missing references SHALL be preselected.

#### Scenario: switching to a node without synergy programs
- **WHEN** the user maps the result to Outcome 1 (SP01/SP03/SP04 preselected) and then switches the mapping to Outcome 2 which has no synergy programs
- **THEN** SP01/SP03/SP04 SHALL disappear from the selection and only the "Other(s)" option SHALL remain available

#### Scenario: removing the node selection
- **WHEN** the user clears the Output/Outcome selection entirely
- **THEN** the session-preloaded SP/Centers SHALL be removed from the selection without requiring F5

#### Scenario: selecting a second node preselects the union
- **WHEN** the user adds a second Outcome whose synergy programs are not yet selected
- **THEN** those programs SHALL become preselected, deduplicated against the ones already selected

#### Scenario: same references, no churn
- **WHEN** effects re-run without an actual change in the resolved references (e.g. unrelated signals fire)
- **THEN** the selection SHALL NOT be modified

### Requirement: user and persisted selections survive reconciliation
Reconciliation SHALL NOT remove: the "Other(s)" sentinel and manual Other selections, persisted items hydrated from the GET (no `new` flag), or accepted/pending contribution items. A user interaction with the dropdowns SHALL NOT disable future reconciliations.

#### Scenario: manual Other selection survives a node change
- **WHEN** the user picked SP/Centers via "Other(s)" and then changes the ToC node
- **THEN** the Other selections SHALL remain selected

#### Scenario: persisted items are not auto-cancelled
- **WHEN** the result already has saved from-ToC items and the user changes the node
- **THEN** the saved items SHALL remain selected (removing them stays a manual user action feeding the existing save/cancel contract)

#### Scenario: touched dropdown still reconciles later
- **WHEN** the user interacts with the SP/Centers dropdown and afterwards changes the ToC node
- **THEN** reconciliation SHALL still run for that node change

### Requirement: P2-3115 anti-resurrection contract preserved
Cold-load behavior SHALL keep the existing guard: once the section is hydrated from the persisted GET and no in-session ToC selection was made, the (possibly empty) persisted state SHALL remain authoritative.

#### Scenario: deliberately-emptied selection stays empty on reload
- **WHEN** a result whose SP/Centers were deliberately emptied and saved is reloaded (F5)
- **THEN** no preselection SHALL occur until the user makes a genuine ToC selection in-session

### Requirement: Centers parity and lead consistency
The Centers preselection SHALL follow the same reconciliation rules as Science Programs, and the possible-lead-centers list SHALL be recomputed after each reconciliation.

#### Scenario: reconciliation removes the current lead center
- **WHEN** a reconciliation removes the preloaded center currently set as lead
- **THEN** the lead options SHALL be recomputed so no stale lead remains
