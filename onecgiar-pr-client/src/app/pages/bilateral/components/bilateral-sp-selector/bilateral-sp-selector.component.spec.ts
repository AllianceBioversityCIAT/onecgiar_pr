import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralSpSelectorComponent } from './bilateral-sp-selector.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
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
    };

    await TestBed.configureTestingModule({
      imports: [BilateralSpSelectorComponent],
      providers: [{ provide: BilateralCreationService, useValue: creationService }],
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
      sciencePrograms: [{ programId: 1, spShortName: 'Short', allocation: '49.6' }]
    } as any);
    creationService.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '49.6' });
    expect(component.selectedPrimaryLabel()).toBe('SP01 — Short (50%)');
    expect(component.selectedPrimaryIcon()).toContain('SP01.png');
  });

  it('omits the allocation and the short name when they are missing', () => {
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
});
