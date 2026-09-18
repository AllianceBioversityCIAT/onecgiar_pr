import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SectionTocDefaultComponent,
  ProjectDefault,
} from './section-toc-default.component';
import { CentersService } from '../../../../shared/services/global/centers.service';

describe('SectionTocDefaultComponent', () => {
  let component: SectionTocDefaultComponent;
  let fixture: ComponentFixture<SectionTocDefaultComponent>;

  const mockTwoNodesDefault: ProjectDefault = {
    project_id: 101,
    project_name: 'Sustainable Agroforestry Initiative',
    nodes: [
      {
        toc_result_id: 1,
        toc_level_id: 1,
        level_name: 'OUTPUT',
        title: 'Improved Agroforestry Practices Adopted',
        indicators: [
          {
            id: 11,
            description: 'Number of smallholder farmers adopting agroforestry packages',
            type: 'Capacity Sharing for Development',
            targets: [{ year: 2026, value: 350 }],
          },
        ],
      },
      {
        toc_result_id: 2,
        toc_level_id: 2,
        level_name: 'OUTCOME',
        title: 'Policy Framework for Sustainable Land Use Ratified',
        indicators: [
          {
            id: 22,
            description: 'Number of regional policy documents referencing agroforestry guidelines',
            type: 'Policy Change',
            targets: [{ year: 2026, value: 12 }],
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionTocDefaultComponent],
      providers: [
        {
          provide: CentersService,
          useValue: {
            centersList: [
              { institutionId: 1, acronym: 'CIAT', name: 'Alliance Bioversity CIAT' },
              { institutionId: 2, acronym: 'IRRI', name: 'International Rice Research Institute' },
            ],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionTocDefaultComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Hub redesign (2026-09-18, user-requested): summary stats up top, full breakdown collapsed by
  // default behind a toggle. Stats MUST be derived from real projectDefault data, never invented.
  it('computes summary stats from real data and starts the breakdown panel collapsed', () => {
    const projectDefault: ProjectDefault = {
      project_id: 194,
      project_name: 'Lead Project',
      nodes: [
        {
          toc_result_id: 1,
          level_name: 'High Level Output',
          title: 'Node A',
          indicators: [
            { id: 1, description: 'Ind 1', type: 't', targets: [{ year: 2026, value: 5, center_ids: [1, 2] }] },
            { id: 2, description: 'Ind 2', type: 't', targets: [{ year: 2026, value: 6, center_ids: [2] }] },
          ],
        },
        {
          toc_result_id: 2,
          level_name: 'Intermediate Outcome',
          title: 'Node B',
          indicators: [{ id: 3, description: 'Ind 3', type: 't', targets: [] }],
        },
      ],
    };
    fixture.componentRef.setInput('projectDefault', projectDefault);
    fixture.detectChanges();

    expect(component.stats()).toEqual([
      { label: 'ToC nodes', value: '2', hint: '1 High Level Output · 1 Intermediate Outcome' },
      { label: 'Indicators', value: '3', hint: 'Across every linked node' },
      { label: 'CGIAR centers', value: '2', hint: 'CIAT, IRRI' },
    ]);

    const toggle: HTMLElement = fixture.nativeElement.querySelector('[data-testid="toc-default-breakdown-toggle"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const panel: HTMLElement = fixture.nativeElement.querySelector('#toc-default-breakdown-panel');
    expect(panel.hidden).toBe(true);

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
  });

  // Post-implementation audit (2026-09-18): one indicator/year can carry several target rows,
  // each broken down by CGIAR center (toc_result_indicator_target_center) — this must render as
  // one labelled chip per center, never as unlabeled duplicate "Target (2026)" chips.
  it('labels each target with its CGIAR center(s) instead of rendering unlabeled duplicates', () => {
    const projectDefault: ProjectDefault = {
      project_id: 194,
      project_name: 'Accelerating Impacts of CGIAR Climate Research',
      nodes: [
        {
          toc_result_id: 6175,
          toc_level_id: 1,
          level_name: 'OUTPUT',
          title: 'Analytical tools and frameworks on climate finance',
          indicators: [
            {
              id: 8385,
              description: 'Number of partners and actors engaged',
              type: 'Other Outputs',
              targets: [
                { year: 2026, value: 5, center_ids: [1, 2] },
                { year: 2026, value: 6, center_ids: [] },
              ],
            },
          ],
        },
      ],
    };
    fixture.componentRef.setInput('projectDefault', projectDefault);
    fixture.detectChanges();

    const targetItems: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '[data-testid="toc-default-target-item"]',
    );
    expect(targetItems.length).toBe(2);
    expect(targetItems[0].textContent).toContain('CIAT');
    expect(targetItems[0].textContent).toContain('IRRI');
    expect(targetItems[0].textContent).toContain('5');
    expect(targetItems[1].textContent).not.toContain('CIAT');
    expect(targetItems[1].textContent).not.toContain('IRRI');
    expect(targetItems[1].textContent).toContain('6');
  });

  // DoD #1 — renders every node and its target
  it('renders all nodes and indicators with titles and target values', () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement;

    // Both node titles appear
    expect(compiled.textContent).toContain('Improved Agroforestry Practices Adopted');
    expect(compiled.textContent).toContain('Policy Framework for Sustainable Land Use Ratified');

    // Both target values appear
    expect(compiled.textContent).toContain('350');
    expect(compiled.textContent).toContain('12');

    // Indicator descriptions and levels appear
    expect(compiled.textContent).toContain('Number of smallholder farmers adopting agroforestry packages');
    expect(compiled.textContent).toContain('Number of regional policy documents referencing agroforestry guidelines');
    expect(compiled.textContent).toContain('OUTPUT');
    expect(compiled.textContent).toContain('OUTCOME');
  });

  // DoD #2 — emits modeChange with 'project_default' on YES click
  it("emits modeChange with 'project_default' on YES click", () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.detectChanges();

    const emitted: string[] = [];
    component.modeChange.subscribe((m) => emitted.push(m));

    const yesBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-yes-btn"]');
    expect(yesBtn).toBeTruthy();
    yesBtn.click();

    expect(emitted).toEqual(['project_default']);
  });

  // DoD #3 — emits modeChange with 'custom' on NO click
  it("emits modeChange with 'custom' on NO click", () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.detectChanges();

    const emitted: string[] = [];
    component.modeChange.subscribe((m) => emitted.push(m));

    const noBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-no-btn"]');
    expect(noBtn).toBeTruthy();
    noBtn.click();

    expect(emitted).toEqual(['custom']);
  });

  // DoD #4 — readOnly disables both options and clicking does NOT emit
  it('readOnly disables both options and clicking YES does not emit', () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();

    const yesBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-yes-btn"]');
    const noBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-no-btn"]');

    expect(yesBtn).toBeTruthy();
    expect(noBtn).toBeTruthy();
    expect(yesBtn.disabled).toBe(true);
    expect(noBtn.disabled).toBe(true);

    const emitted: string[] = [];
    component.modeChange.subscribe((m) => emitted.push(m));

    yesBtn.click();
    noBtn.click();

    expect(emitted).toHaveLength(0);
  });

  // DoD #5 — a node with multiple indicators renders ALL (not just first)
  it('a node with multiple indicators renders all indicators', () => {
    const mockMultiIndicators: ProjectDefault = {
      project_id: 202,
      project_name: 'Multi-Indicator Project',
      nodes: [
        {
          toc_result_id: 99,
          level_name: 'EOI',
          title: 'End of Initiative Outcome on Resilient Crops',
          indicators: [
            {
              id: 901,
              description: 'Indicator A: Field trial yield gain percentage',
              type: 'Innovation Development',
              targets: [{ year: 2026, value: 25 }],
            },
            {
              id: 902,
              description: 'Indicator B: Number of peer-reviewed publications',
              type: 'Knowledge Product',
              targets: [{ year: 2026, value: 8 }],
            },
            {
              id: 903,
              description: 'Indicator C: Number of policy dialogs convened',
              type: 'Policy Change',
              targets: [{ year: 2026, value: 4 }],
            },
          ],
        },
      ],
    };

    fixture.componentRef.setInput('projectDefault', mockMultiIndicators);
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement;
    const indicatorCards = compiled.querySelectorAll('[data-testid="toc-default-indicator-item"]');

    expect(indicatorCards.length).toBe(3);
    expect(compiled.textContent).toContain('Indicator A: Field trial yield gain percentage');
    expect(compiled.textContent).toContain('Indicator B: Number of peer-reviewed publications');
    expect(compiled.textContent).toContain('Indicator C: Number of policy dialogs convened');
    expect(compiled.textContent).toContain('25');
    expect(compiled.textContent).toContain('8');
    expect(compiled.textContent).toContain('4');
  });

  // DoD #6 — toggle group has an accessible name
  it('YES/NO toggle group has an accessible name (aria-label or aria-labelledby)', () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.detectChanges();

    const toggleGroup: HTMLElement = fixture.nativeElement.querySelector('[data-testid="toc-default-toggle-group"]');
    expect(toggleGroup).toBeTruthy();

    const ariaLabel = toggleGroup.getAttribute('aria-label');
    const ariaLabelledBy = toggleGroup.getAttribute('aria-labelledby');

    const hasAccessibleName = Boolean(
      (ariaLabel && ariaLabel.trim().length > 0) ||
      (ariaLabelledBy && ariaLabelledBy.trim().length > 0),
    );
    expect(hasAccessibleName).toBe(true);

    if (ariaLabelledBy) {
      const labelEl = fixture.nativeElement.querySelector(`#${ariaLabelledBy}`);
      expect(labelEl).toBeTruthy();
      expect(labelEl.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  // Additional state assertions
  it('displays source project name when provided', () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.detectChanges();

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('Sustainable Agroforestry Initiative');
  });

  it('marks YES as pressed when mode is project_default', () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.componentRef.setInput('mode', 'project_default');
    fixture.detectChanges();

    const yesBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-yes-btn"]');
    const noBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-no-btn"]');

    expect(yesBtn.getAttribute('aria-pressed')).toBe('true');
    expect(noBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('marks NO as pressed when mode is custom', () => {
    fixture.componentRef.setInput('projectDefault', mockTwoNodesDefault);
    fixture.componentRef.setInput('mode', 'custom');
    fixture.detectChanges();

    const yesBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-yes-btn"]');
    const noBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="toc-default-no-btn"]');

    expect(yesBtn.getAttribute('aria-pressed')).toBe('false');
    expect(noBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('handles null projectDefault gracefully without throwing', () => {
    fixture.componentRef.setInput('projectDefault', null);
    expect(() => fixture.detectChanges()).not.toThrow();

    const emptyMessage = fixture.nativeElement.querySelector('[data-testid="toc-default-empty-nodes"]');
    expect(emptyMessage).toBeTruthy();
  });
});
