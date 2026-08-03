## bilateral-accordion-layout

Accordion-based form layout for the bilateral result detail. Collapsible sections with completion indicators, progressive disclosure of non-MDS fields, and persistent expandable state.

### Requirements

- REQ-1: Sections 1–5 rendered as collapsible accordion panels.
- REQ-2: Section 0 (dashboard) is always visible, not collapsible.
- REQ-3: Default state: Section 1 (General Info) open, all others collapsed.
- REQ-4: Single-open behavior: opening one section auto-closes the previously open section.
- REQ-5: Accordion header shows: section icon, section name, completion dot (green/amber/gray), field count badge ("3/5 fields"), micro progress bar.
- REQ-6: Non-MDS fields hidden behind "Show all fields" expandable link within each section.
- REQ-7: Expandable state persisted in localStorage per result per section.
- REQ-8: Accordion collapse flushes pending auto-saves before closing.
- REQ-9: Smooth expand/collapse animation (300ms ease).

### Section Definitions

| Section | Label | Icon | MDS Fields | Component |
|---|---|---|---|---|
| 0 | Result Summary | dashboard | N/A (dashboard) | `section-zero-dashboard` |
| 1 | General Information | description | title, description | `section-general-info` |
| 2 | Contributors & Partners | people | primary_sp, lead_center, contributing_projects, toc_work_packages | `section-contributors` |
| 3 | Geographic Location | map | geographic_scope, regions, countries | `section-geography` |
| 4 | Evidence | attachment | evidence_count, evidence_links_valid | `section-evidence` |
| 5 | Type-Specific | category | varies by result_type_id | `section-type-specific` |

### Accordion Header Template

```html
<div class="bp-accordion-header" (click)="toggle()">
  <i class="material-icons-round bp-section-icon">{{ section.icon }}</i>
  <span class="bp-section-label">{{ section.label }}</span>
  <span class="bp-completion-dot" [class]="mdsStatus"></span>
  <span class="bp-field-count">{{ filledFields }}/{{ totalFields }} fields</span>
  <div class="bp-micro-progress">
    <div class="bp-micro-progress-fill" [style.width.%]="percentage"></div>
  </div>
  <i class="material-icons-round bp-chevron" [class.rotated]="isOpen">
    expand_more
  </i>
</div>
```

### Expandable State Persistence

```typescript
// Key pattern
const key = `bp_expand_${resultId}_${sectionName}`;

// Default values
const defaults: Record<string, boolean> = {
  'general-info': true,       // Section 1 open by default
  'contributors': false,      // Section 2 collapsed
  'geography': false,         // Section 3 collapsed
  'evidence': false,          // Section 4 collapsed
  'type-specific': false,     // Section 5 collapsed
};

// Read
getExpandState(resultId: number, sectionName: string): boolean {
  const stored = localStorage.getItem(`bp_expand_${resultId}_${sectionName}`);
  return stored !== null ? stored === 'true' : defaults[sectionName] ?? false;
}

// Write
setExpandState(resultId: number, sectionName: string, isOpen: boolean): void {
  localStorage.setItem(`bp_expand_${resultId}_${sectionName}`, String(isOpen));
}
```

### "Show All Fields" Expandable

Within each accordion section, non-MDS fields are hidden behind a "Show all fields" link:

```html
<div class="bp-section-body">
  <!-- MDS fields always visible -->
  <ng-content select="[mds-fields]"></ng-content>

  <!-- Non-MDS fields behind expandable -->
  @if (showAllFields()) {
    <div class="bp-extra-fields">
      <ng-content select="[extra-fields]"></ng-content>
    </div>
  }

  <a class="bp-show-all-link" (click)="toggleShowAll()">
    {{ showAllFields() ? 'Hide' : 'Show' }} additional fields
  </a>
</div>
```

The "show all fields" state is also persisted in localStorage with key pattern `bp_extra_${resultId}_${sectionName}`.
