## bilateral-section-zero-dashboard

Command center header for the bilateral result form. Shows project context, Science Program badges, MDS progress ring, and action buttons. Always visible (not collapsible).

### Requirements

- REQ-1: Three-column card layout: Project Context | MDS Progress | Actions.
- REQ-2: Project Context card shows: project code, project name, lead center, SP badges with allocation %.
- REQ-3: MDS Progress card shows: circular progress ring (SVG, 80px), overall percentage, per-section breakdown with micro progress bars.
- REQ-4: Actions card shows: Generate Narrative, Download PDF, AI Review (disabled until MDS complete), Submit for Review.
- REQ-5: Responsive: cards stack vertically on mobile (< 768px).
- REQ-6: Progress ring color: < 40% red, 40-80% amber, > 80% green.
- REQ-7: Click on section name in progress breakdown scrolls to that accordion section.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  PROJECT               │  │  PROGRESS    │  │  ACTIONS               │  │
│  │                        │  │              │  │                        │  │
│  │  P2837                 │  │    ╭───╮     │  │  [Generate Narrative]  │  │
│  │  CIMMYT Wheat Yield    │  │   ╱ 67%╲    │  │  [Download PDF]        │  │
│  │  Improvement           │  │  │  ▓▓▓ │   │  │  [AI Review]           │  │
│  │                        │  │  │  ▓▓░ │   │  │  [Submit for Review]   │  │
│  │  ┌──────────────────┐  │  │   ╲ ▓░╱    │  │                        │  │
│  │  │ Climate Action   │  │  │    ╰──╯     │  │                        │  │
│  │  │ ████████░░ 45%   │  │  │              │  │                        │  │
│  │  └──────────────────┘  │  │  ──────────  │  │                        │  │
│  │  ┌──────────────────┐  │  │  ● General 3/3│  │                        │  │
│  │  │○ Breeding Tomato │  │  │  ● Contrib 5/8│  │                        │  │
│  │  │  ████░░░░░ 25%   │  │  │  ● Geo     3/3│  │                        │  │
│  │  └──────────────────┘  │  │  ○ Evidence 2/4│  │                        │  │
│  │                        │  │  ○ Type    6/10│  │                        │  │
│  │  Result: R-2026-0142   │  │              │  │                        │  │
│  │  Status: ● Editing     │  │              │  │                        │  │
│  └────────────────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Progress Ring (SVG)

```html
<svg width="80" height="80" viewBox="0 0 80 80">
  <!-- Track -->
  <circle cx="40" cy="40" r="34" fill="none" stroke="#EEEEEE" stroke-width="8"/>
  <!-- Fill -->
  <circle cx="40" cy="40" r="34" fill="none"
    [attr.stroke]="ringColor"
    stroke-width="8"
    stroke-linecap="round"
    [attr.stroke-dasharray]="circumference"
    [attr.stroke-dashoffset]="dashOffset"
    transform="rotate(-90 40 40)"/>
  <!-- Center text -->
  <text x="40" y="44" text-anchor="middle" class="bp-ring-text">
    {{ percentage }}%
  </text>
</svg>
```

- Circumference = 2 * π * 34 ≈ 213.6
- dashOffset = circumference * (1 - percentage / 100)
- ringColor: percentage < 40 → #C62828, 40-80 → #F57F17, > 80 → #2E7D32

### Action Buttons

| Button | Enabled When | Action |
|---|---|---|
| Generate Narrative | Always | Opens side panel with AI-generated narrative (Phase 3) |
| Download PDF | Always | Reuses existing `pdf-actions` component logic |
| AI Review | Overall MDS = 100% | Triggers traffic-light QA analysis (Phase 4) |
| Submit for Review | Overall MDS = 100% | Status transition: Editing(1) → Pending Review(5) |

### Responsive Behavior

```
DESKTOP (> 1200px): 3-column grid (1fr 200px 1fr)
TABLET (768-1200px): 2-column (Project + Progress row, Actions below)
MOBILE (< 768px): single column, all cards stacked
```
