## bilateral-mds-tracker

Frontend-only MDS (Minimum Data Standards) completeness tracker. Computes per-section and overall progress from form field values via Angular signals. No backend calls.

### Requirements

- REQ-1: Tracks MDS field completion per section (General Info, Contributors, Geography, Evidence, Type-Specific).
- REQ-2: Computes overall MDS percentage: `sum(filledFields) / sum(totalFields) * 100`.
- REQ-3: Per-section status: `empty` (0%), `partial` (1-99%), `complete` (100%).
- REQ-4: Reactive — updates automatically when form field signals change.
- REQ-5: Configurable MDS field definitions per result type (type-specific sections have different fields).

### MDS Field Definitions

#### Section 1: General Information (always 2 core fields)
| Field | Required | Signal source |
|---|---|---|
| `title` | Yes | `formSignals.title` |
| `description` | Yes | `formSignals.description` |

#### Section 2: Contributors and Partners
| Field | Required | Signal source |
|---|---|---|
| `primary_sp` | Yes | `formSignals.primarySp` |
| `lead_center` | Yes | `formSignals.leadCenter` (auto-set from project) |
| `contributing_projects` | Yes | `formSignals.contributingProjects` (at least 1) |
| `toc_work_packages` | Yes | `formSignals.tocWorkPackages` (at least 1) |

#### Section 3: Geographic Location
| Field | Required | Signal source |
|---|---|---|
| `geographic_scope` | Yes | `formSignals.geographicScope` |
| `regions` | Conditional | `formSignals.regions` (required if scope = Regional) |
| `countries` | Conditional | `formSignals.countries` (required if scope = National) |

#### Section 4: Evidence
| Field | Required | Signal source |
|---|---|---|
| `evidence_count` | Yes | `formSignals.evidenceList.length` (at least 1) |
| `evidence_links_valid` | Yes | `formSignals.evidenceList.every(e => e.link)` |

#### Section 5: Type-Specific (varies by result_type_id)

**Innovation Development (7):**
| Field | Required |
|---|---|
| `innovation_title` | Yes |
| `innovation_phase` | Yes |
| `innovation_readiness_level` | Yes |
| `typology` (variety/technology/practice/tool/product) | At least 1 |

**Capacity Sharing (5):**
| Field | Required |
|---|---|
| `training_title` | Yes |
| `training_type` | Yes |
| `participant_count` | Yes |
| `partner_institutions` | At least 1 |

**Knowledge Product (6):**
| Field | Required |
|---|---|
| `kp_handle` | Yes |
| `kp_title` | Yes |
| `kp_type` | Yes |

**Innovation Use (2):**
| Field | Required |
|---|---|
| `innovation_use_title` | Yes |
| `innovation_use_type` | Yes |
| `adoption_stage` | Yes |

**Policy Change (1):**
| Field | Required |
|---|---|
| `policy_title` | Yes |
| `policy_type` | Yes |
| `policy_stage` | Yes |

**Other Output (8) / Other Outcome (4):** No type-specific section.

### Service Interface

```typescript
@Injectable({ providedIn: 'root' })
export class BilateralMdsTrackerService {
  // Per-section status
  sectionStatus$: Signal<MdsSectionStatus[]>;

  // Overall percentage (0-100)
  overallPercentage$: Signal<number>;

  // Overall status
  overallStatus$: Signal<'empty' | 'partial' | 'complete'>;

  // Update a field value (called by form components)
  updateField(section: string, fieldName: string, value: unknown): void;

  // Reset all tracking (on new result or route change)
  reset(): void;
}

interface MdsSectionStatus {
  sectionName: string;
  sectionLabel: string;
  totalFields: number;
  filledFields: number;
  percentage: number;
  status: 'empty' | 'partial' | 'complete';
}
```
