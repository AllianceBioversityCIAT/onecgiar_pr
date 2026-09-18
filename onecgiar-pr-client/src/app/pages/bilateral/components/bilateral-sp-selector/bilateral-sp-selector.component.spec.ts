import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralSpSelectorComponent } from './bilateral-sp-selector.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { signal } from '@angular/core';

describe('BilateralSpSelectorComponent', () => {
  let component: BilateralSpSelectorComponent;
  let fixture: ComponentFixture<BilateralSpSelectorComponent>;
  let creationService: any;

  beforeEach(async () => {
    creationService = {
      selectedProject: signal(null),
      selectedPrimarySp: signal(null),
      selectedSecondarySps: signal([]),
      selectPrimarySp: jest.fn(),
      toggleSecondarySp: jest.fn(),
      // Read by the nested `app-bilateral-accordion` (the "coming soon" disclosure, `APF-R-11`)
      // when it is opened — not otherwise exercised by this component.
      isLoadingResult: jest.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralSpSelectorComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        // `app-bilateral-accordion` injects this unconditionally on construction; it has no
        // `providedIn: 'root'`, so it must be supplied here once the "coming soon" block renders.
        { provide: BilateralAutoSaveService, useValue: { flush: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralSpSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty hint when no project selected', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Select a project');
  });

  it('should populate available SPs from project', () => {
    const project = {
      sciencePrograms: [
        { programId: 100, programCode: 'P11', allocation: '45.00', spName: 'Climate Action', spShortName: 'CA' },
        { programId: 200, programCode: 'P12', allocation: '25.00', spName: 'Breeding', spShortName: 'BfT' },
      ],
    } as any;
    creationService.selectedProject.set(project);
    fixture.detectChanges();
    expect(component.availableSps().length).toBe(2);
  });

  it('renders primary SP options inline with radio indicators when primaryLayout is list', () => {
    creationService.selectedProject.set({
      sciencePrograms: [
        { programId: 100, programCode: 'SP06', allocation: '45.00', spName: 'Climate Action', spShortName: 'CA' },
        { programId: 200, programCode: 'SP12', allocation: '25.00', spName: 'Breeding', spShortName: 'BfT' }
      ]
    } as any);
    fixture.componentRef.setInput('primaryLayout', 'list');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.sps-field')).toBeNull();
    expect(el.querySelectorAll('.sps-option--list').length).toBe(2);
    expect(el.textContent).toContain('Climate Action');
    expect(el.textContent).toContain('Breeding');
    // Radio indicator is present
    expect(el.querySelector('.sps-indicator--radio')).not.toBeNull();
  });

  it('renders contributing SP options inline with checkbox indicators in list mode (0 clicks to view)', () => {
    creationService.selectedProject.set({
      sciencePrograms: [
        { programId: 100, programCode: 'SP06', allocation: '45.00', spName: 'Climate Action', spShortName: 'CA' },
        { programId: 200, programCode: 'SP12', allocation: '25.00', spName: 'Breeding', spShortName: 'BfT' }
      ]
    } as any);
    creationService.selectedPrimarySp.set({ programId: 100, programCode: 'SP06', allocation: '45.00' });
    fixture.componentRef.setInput('primaryLayout', 'list');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const inlineContributing = el.querySelector('[data-testid="sps-contributing-inline"]');
    expect(inlineContributing).not.toBeNull();
    expect(el.querySelector('.bp-accordion-header')).toBeNull();

    const contributingCard = el.querySelector('.sps-option--contributing') as HTMLElement;
    expect(contributingCard).not.toBeNull();
    expect(contributingCard.textContent).toContain('Breeding');
    expect(contributingCard.querySelector('.sps-indicator--checkbox')).not.toBeNull();

    contributingCard.click();
    expect(creationService.toggleSecondarySp).toHaveBeenCalledWith({
      programId: 200,
      programCode: 'SP12',
      allocation: '25.00'
    });
  });

  it('should call selectPrimarySp on primary selection', () => {
    const emitSpy = jest.spyOn(component.primarySelected, 'emit');
    const sps = [
      { programId: 100, programCode: 'P11', allocation: '45.00', spName: 'Climate Action', spShortName: 'CA' },
    ];
    const project = { sciencePrograms: sps } as any;
    creationService.selectedProject.set(project);
    component.selectPrimary(100, 'P11', '45.00');
    expect(creationService.selectPrimarySp).toHaveBeenCalledWith({ programId: 100, programCode: 'P11', allocation: '45.00' });
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should call toggleSecondarySp', () => {
    component.toggleSecondary(200, 'P12', '25.00');
    expect(creationService.toggleSecondarySp).toHaveBeenCalledWith({ programId: 200, programCode: 'P12', allocation: '25.00' });
  });

  it('defaults the available SPs to an empty list when the project has none', () => {
    creationService.selectedProject.set({ id: 1 });
    expect(component.availableSps()).toEqual([]);
  });

  it('excludes the primary SP from the secondary options', () => {
    creationService.selectedProject.set({ sciencePrograms: [{ programId: 1 }, { programId: 2 }] } as any);
    creationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '50' });
    expect(component.availableSecondarySps().map((s: any) => s.programId)).toEqual([2]);
  });

  it('builds the primary label with the rounded allocation and the icon', () => {
    creationService.selectedProject.set({
      sciencePrograms: [
        { programId: 1, spName: 'Sustainable Farming', spShortName: 'Short', allocation: '49.6' }
      ]
    } as any);
    creationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '49.6' });
    expect(component.selectedPrimaryLabel()).toBe('SP01 — Sustainable Farming (50%)');
    expect(component.selectedPrimaryIcon()).toContain('SP01.png');
  });

  // The label carries the full name only. It used to read `spShortName`, which — once
  // the names started resolving from clarisa_initiatives — duplicated the name here.
  it('labels with the name and never the short name', () => {
    creationService.selectedProject.set({
      sciencePrograms: [
        { programId: 1, spName: 'Sustainable Farming', spShortName: 'Short', allocation: '50' }
      ]
    } as any);
    creationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '50' });

    const label = component.selectedPrimaryLabel();
    expect(label).toContain('Sustainable Farming');
    expect(label).not.toContain('Short');
  });

  it('omits the allocation and the name when they are missing', () => {
    creationService.selectedProject.set({ sciencePrograms: [{ programId: 1 }] } as any);
    creationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '' });
    expect(component.selectedPrimaryLabel()).toBe('SP01 — ');
  });

  it('falls back to the placeholder label and no icon without a primary SP', () => {
    expect(component.selectedPrimaryLabel()).toBe('Select primary SP');
    expect(component.selectedPrimaryIcon()).toBeNull();
  });

  it('formats allocations', () => {
    expect(component.formatAllocation(null)).toBe('');
    expect(component.formatAllocation(undefined)).toBe('');
    expect(component.formatAllocation('')).toBe('');
    expect(component.formatAllocation('abc')).toBe('abc');
    expect(component.formatAllocation('33.4')).toBe('33');
  });

  it('builds the SP icon path', () => {
    expect(component.spIconSrc('SP07')).toBe('assets/result-framework-reporting/SPs-Icons/SP07.png');
  });

  it('toggles and closes the dropdowns', () => {
    expect(component.showPrimaryDropdown()).toBe(false);
    component.togglePrimary();
    expect(component.showPrimaryDropdown()).toBe(true);
    component.togglePrimary();
    expect(component.showPrimaryDropdown()).toBe(false);
    component.showPrimaryDropdown.set(true);
    component.showSecondaryDropdown.set(true);
    component.closeDropdowns();
    expect(component.showPrimaryDropdown()).toBe(false);
    expect(component.showSecondaryDropdown()).toBe(false);
  });

  it('defaults a missing allocation to an empty string on select and toggle', () => {
    component.selectPrimary(3, 'SP03', null as any);
    expect(creationService.selectPrimarySp).toHaveBeenCalledWith({
      programId: 3,
      programCode: 'SP03',
      allocation: ''
    });
    component.toggleSecondary(6, 'SP06', undefined as any);
    expect(creationService.toggleSecondarySp).toHaveBeenLastCalledWith({
      programId: 6,
      programCode: 'SP06',
      allocation: ''
    });
  });

  it('reports whether a secondary SP is selected', () => {
    creationService.selectedSecondarySps.set([{ programId: 4 }]);
    expect(component.isSecondarySelected(4)).toBe(true);
    expect(component.isSecondarySelected(5)).toBe(false);
  });

  describe('auto-selection effect', () => {
    const mount = () => {
      const f = TestBed.createComponent(BilateralSpSelectorComponent);
      f.detectChanges();
      return f;
    };

    it('auto-selects the only available SP', () => {
      creationService.selectedProject.set({
        sciencePrograms: [{ programId: 8, programCode: 'SP08', allocation: '100' }]
      } as any);
      mount();
      expect(creationService.selectPrimarySp).toHaveBeenCalledWith({
        programId: 8,
        programCode: 'SP08',
        allocation: '100'
      });
    });

    it('defaults the auto-selected allocation to an empty string', () => {
      creationService.selectedProject.set({
        sciencePrograms: [{ programId: 8, programCode: 'SP08' }]
      } as any);
      mount();
      expect(creationService.selectPrimarySp).toHaveBeenCalledWith({
        programId: 8,
        programCode: 'SP08',
        allocation: ''
      });
    });

    it('does not auto-select when there are several SPs', () => {
      creationService.selectedProject.set({
        sciencePrograms: [
          { programId: 8, programCode: 'SP08' },
          { programId: 9, programCode: 'SP09' }
        ]
      } as any);
      mount();
      expect(creationService.selectPrimarySp).not.toHaveBeenCalled();
    });

    it('does not auto-select when a primary SP already exists', () => {
      creationService.selectedProject.set({
        sciencePrograms: [{ programId: 8, programCode: 'SP08' }]
      } as any);
      creationService.selectedPrimarySp.set({ programId: 8, programCode: 'SP08', allocation: '100' });
      mount();
      expect(creationService.selectPrimarySp).not.toHaveBeenCalled();
    });
  });

  /**
   * The secondary programme chips are rendered but nothing chosen in them is ever persisted:
   * `createResult` posts only the primary programme, and no DTO carries the secondary ones. They
   * are disabled with a `Coming soon` tag rather than removed, so the design still shows what is
   * coming — and the old help text promising "you can also add or change them later in the form"
   * is gone, because the section's own control is disabled for the very same reason.
   *
   * `toggleSecondary` is deliberately left in place: it is the wiring to re-enable, not dead code.
   */
  describe('contributing Science Programs selection', () => {
    it('renders secondary chips as enabled and clickable buttons', () => {
      const template = readFileSync(join(__dirname, 'bilateral-sp-selector.component.html'), 'utf8');
      const chipBlock = template.slice(template.indexOf('sps-chip-grid'));

      expect(chipBlock).not.toContain('sps-chip--disabled');
      expect(chipBlock).not.toContain('disabled');
      expect(chipBlock).toContain('(click)="toggleSecondary(');
    });

    it('uses Contributing Science Programs label without Coming soon', () => {
      const template = readFileSync(join(__dirname, 'bilateral-sp-selector.component.html'), 'utf8');

      expect(template).not.toContain('Coming soon');
      expect(template).toContain('copy.spGate.contributingSpsTitle');
    });
  });

  describe('"Contributing Science Programs" disclosure (APF-R-11, APF-DD-11)', () => {
    const withSecondarySps = () => {
      creationService.selectedProject.set({
        sciencePrograms: [
          { programId: 1, programCode: 'SP01', spName: 'Climate Action', spShortName: 'CA', allocation: '60.00' },
          { programId: 2, programCode: 'SP02', spName: 'Breeding for Tomorrow', spShortName: 'BfT', allocation: '40.00' },
        ],
      } as any);
      creationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '60.00' });
      fixture.detectChanges();
    };

    it('renders the block collapsed behind a one-line disclosure by default', () => {
      withSecondarySps();

      expect(fixture.nativeElement.querySelector('.bp-accordion-header')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.bp-accordion-body')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Contributing Science Programs');
    });

    it('expands on click to reveal the secondary chips', () => {
      withSecondarySps();

      const header = fixture.nativeElement.querySelector('.bp-accordion-header');
      header.click();
      fixture.detectChanges();

      const body = fixture.nativeElement.querySelector('.bp-accordion-body');
      expect(body).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.sps-chip').length).toBe(1);
      // The chip grid renders `spShortName`, not the full `spName` (see the component's own note).
      expect(fixture.nativeElement.textContent).toContain('BfT');
      expect(fixture.nativeElement.textContent).toContain('SP02');
    });

    it('leaves primary SP selection and the primary field untouched, collapsed or expanded', () => {
      withSecondarySps();
      expect(component.selectedPrimaryLabel()).toContain('SP01');
      expect(fixture.nativeElement.querySelector('.sps-field')).not.toBeNull();

      fixture.nativeElement.querySelector('.bp-accordion-header').click();
      fixture.detectChanges();

      expect(component.selectedPrimaryLabel()).toContain('SP01');
      expect(fixture.nativeElement.querySelector('.sps-field')).not.toBeNull();
    });

    it('toggles secondary SP selection when chip is clicked', () => {
      withSecondarySps();

      const header = fixture.nativeElement.querySelector('.bp-accordion-header');
      header.click();
      fixture.detectChanges();

      const chip = fixture.nativeElement.querySelector('.sps-chip') as HTMLElement;
      expect(chip).toBeTruthy();
      chip.click();
      fixture.detectChanges();

      expect(creationService.toggleSecondarySp).toHaveBeenCalledWith({
        programId: 2,
        programCode: 'SP02',
        allocation: '40.00',
      });
    });
  });

  /**
   * `APF-T-7` rework (Reviewer FAIL issue 1): this suite's top-level `beforeEach` provides a
   * `BilateralAutoSaveService` mock, which would hide a real `NullInjectorError` regression —
   * that service is `@Injectable()` with no `providedIn: 'root'`, and its only provider in the app
   * is component-local on `bilateral-result-creator.component.ts`. `app-bilateral-sp-selector` is
   * also mounted from `bilateral-manual-create-drawer-host` (with `primaryLayout="list"`), outside
   * that provider's scope. This suite reconfigures `TestBed` WITHOUT the provider — the production
   * DI shape for that host — to prove the accordion's now-optional injection actually works, not
   * just that a mock was supplied.
   */
  describe('DI regression: no BilateralAutoSaveService provider (production shape of the drawer host)', () => {
    let noAutoSaveFixture: ComponentFixture<BilateralSpSelectorComponent>;
    let noAutoSaveCreationService: any;

    beforeEach(async () => {
      noAutoSaveCreationService = {
        selectedProject: signal(null),
        selectedPrimarySp: signal(null),
        selectedSecondarySps: signal([]),
        selectPrimarySp: jest.fn(),
        toggleSecondarySp: jest.fn(),
        isLoadingResult: jest.fn().mockReturnValue(false),
      };

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [BilateralSpSelectorComponent],
        providers: [{ provide: BilateralCreationService, useValue: noAutoSaveCreationService }],
        // No BilateralAutoSaveService provider — deliberate.
      }).compileComponents();

      noAutoSaveFixture = TestBed.createComponent(BilateralSpSelectorComponent);
    });

    it('renders the accordion without throwing when a primary SP leaves secondaries behind in dropdown mode', () => {
      noAutoSaveFixture.componentRef.setInput('primaryLayout', 'dropdown');
      noAutoSaveCreationService.selectedProject.set({
        sciencePrograms: [
          { programId: 1, programCode: 'SP01', spName: 'Climate Action', spShortName: 'CA', allocation: '60.00' },
          { programId: 2, programCode: 'SP02', spName: 'Breeding for Tomorrow', spShortName: 'BfT', allocation: '40.00' },
        ],
      } as any);
      noAutoSaveCreationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '60.00' });

      expect(() => noAutoSaveFixture.detectChanges()).not.toThrow();

      const header = noAutoSaveFixture.nativeElement.querySelector('.bp-accordion-header');
      expect(header).not.toBeNull();

      // Toggling (which flushes autosave when present) must also stay null-safe.
      expect(() => {
        header.click();
        noAutoSaveFixture.detectChanges();
      }).not.toThrow();
      expect(noAutoSaveFixture.nativeElement.querySelector('.bp-accordion-body')).not.toBeNull();
    });

    it('renders the inline contributing section without throwing in list mode', () => {
      noAutoSaveFixture.componentRef.setInput('primaryLayout', 'list');
      noAutoSaveCreationService.selectedProject.set({
        sciencePrograms: [
          { programId: 1, programCode: 'SP01', spName: 'Climate Action', spShortName: 'CA', allocation: '60.00' },
          { programId: 2, programCode: 'SP02', spName: 'Breeding for Tomorrow', spShortName: 'BfT', allocation: '40.00' },
        ],
      } as any);
      noAutoSaveCreationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '60.00' });

      expect(() => noAutoSaveFixture.detectChanges()).not.toThrow();

      const inlineSection = noAutoSaveFixture.nativeElement.querySelector('[data-testid="sps-contributing-inline"]');
      expect(inlineSection).not.toBeNull();
      expect(noAutoSaveFixture.nativeElement.querySelector('.bp-accordion-header')).toBeNull();
    });
  });
});
