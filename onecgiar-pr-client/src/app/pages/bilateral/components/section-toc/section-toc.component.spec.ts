import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionTocComponent } from './section-toc.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('SectionTocComponent', () => {
  let component: SectionTocComponent;
  let fixture: ComponentFixture<SectionTocComponent>;
  let creationService: any;
  let autoSave: any;
  let api: any;

  beforeEach(async () => {
    creationService = {
      currentResultId: signal(123),
      resultLevelId: signal(3),
      resultTypeId: signal(1),
      resultInitiativeId: signal(42),
      selectedPrimarySp: signal({ programId: 456, programCode: 'SP01', allocation: '40' }),
    };

    autoSave = {
      updateFieldsBatch: jest.fn(),
      saveTocMapping: jest.fn(),
      loadTocState: jest.fn().mockResolvedValue({
        planned_result: null,
        toc_level_id: null,
        toc_result_id: null,
        indicator_id: null,
        contributing_indicator: null,
        toc_progressive_narrative: null,
      }),
    };

    api = {
      dataControlSE: {
        myInitiativesList: [{ official_code: 'SP01', id: 42 }],
      },
      tocApiSE: {
        GET_AllTocLevels: jest.fn().mockReturnValue(of({
          response: [
            { toc_level_id: 1, name: 'High Level Output' },
            { toc_level_id: 2, name: 'Intermediate Outcome' },
            { toc_level_id: 3, name: '2030 Outcome' },
          ]
        })),
        GET_tocLevelsByconfig: jest.fn().mockReturnValue(of({ response: [] })),
      },
    };

    await TestBed.configureTestingModule({
      imports: [SectionTocComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralMdsTrackerService, useValue: { updateSection: jest.fn() } },
        { provide: ApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionTocComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should fetch lists when user clicks Yes (planned=true)', () => {
    fixture.detectChanges();
    component.onPlannedChange(true);
    fixture.detectChanges();
    expect(api.tocApiSE.GET_AllTocLevels).toHaveBeenCalledWith(true);
    expect(api.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalledWith(123, 42, 1, true, true, true);
    expect(api.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalledWith(123, 42, 2, true, true, true);
    expect(api.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalledWith(123, 42, 3, true, true, true);
  });

  it('should not fetch lists until user chooses planned or unplanned', () => {
    fixture.detectChanges();
    expect(api.tocApiSE.GET_tocLevelsByconfig).not.toHaveBeenCalled();
  });

  it('should show active list when level selected', () => {
    component.outputList.set([{ toc_result_id: 1, title: 'Output 1' }]);
    component.onLevelChange(1);
    expect(component.activeList().length).toBe(1);
  });

  it('should hide all when unplanned', () => {
    fixture.detectChanges();
    component.onPlannedChange(false);
    expect(component.isPlanned()).toBe(false);
    expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({
      planned_result: false,
      programCode: 'SP01',
    });
  });

  it('should match policy indicator', () => {
    const info = component.getIndicatorMatchInfo({ type_value: '%Number of Policy%' });
    expect(info.cssClass).toBe('bp-toc-match--match');
  });

  it('should flag non-matching as other type', () => {
    creationService.resultTypeId.set(1);
    const info = component.getIndicatorMatchInfo({ type_value: '%Number of innovations%' });
    expect(info.cssClass).toBe('bp-toc-match--other');
  });

  it('should ignore re-selecting the already-selected level', () => {
    component.selectedLevelId.set(2);
    component.selectedTocResultId.set(10);
    component.selectedIndicatorId.set('ind-1');
    component.onLevelChange(2);
    expect(component.selectedTocResultId()).toBe(10);
    expect(component.selectedIndicatorId()).toBe('ind-1');
    expect(autoSave.saveTocMapping).not.toHaveBeenCalled();
  });

  it('should ignore re-selecting the already-selected ToC result', () => {
    component.selectedTocResultId.set(10);
    component.selectedIndicatorId.set('ind-1');
    component.onTocResultSelect(10);
    expect(component.selectedTocResultId()).toBe(10);
    expect(component.selectedIndicatorId()).toBe('ind-1');
  });

  it('should ignore re-selecting the already-selected indicator', () => {
    component.selectedIndicatorId.set('ind-1');
    component.contributionValue.set(5);
    component.onIndicatorSelect('ind-1');
    expect(component.contributionValue()).toBe(5);
  });

  it('should build plain-text select labels without HTML markup', () => {
    component.selectedLevelId.set(1);
    component.outputList.set([
      { toc_result_id: 1, wp_short_name: 'WP1', title: 'Output 1', indicators: [{ type_value: '%Number of Policy%' }] },
    ]);
    const label = component.tocResultItems()[0].select_label;
    expect(label).not.toContain('<');
    expect(label).toContain('WP1');
    expect(label).toContain('Output 1');
  });
});
