import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionTocComponent } from './section-toc.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

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

  // ── result type labels ─────────────────────────────────────────────
  describe('resultTypeLabel', () => {
    it('maps a known result type id', () => {
      creationService.resultTypeId.set(5);
      expect(component.resultTypeLabel()).toBe('Capacity Sharing for Development');
    });

    it('falls back to a generic label for an unknown id', () => {
      creationService.resultTypeId.set(99);
      expect(component.resultTypeLabel()).toBe('Type 99');
    });

    it('returns an empty label when there is no result type', () => {
      creationService.resultTypeId.set(null);
      expect(component.resultTypeLabel()).toBe('');
    });

    it('exposes the program code, defaulting to empty', () => {
      expect(component.programCode()).toBe('SP01');
      creationService.selectedPrimarySp.set(null);
      expect(component.programCode()).toBe('');
    });
  });

  // ── level visibility ───────────────────────────────────────────────
  describe('showLevelSelector / filteredLevels', () => {
    const levels = [
      { toc_level_id: 1, name: 'Output' },
      { toc_level_id: 2, name: 'Outcome' },
      { toc_level_id: 3, name: 'EoI' },
    ];

    it('is hidden while the planned question is unanswered', () => {
      expect(component.showLevelSelector()).toBe(false);
      expect(component.filteredLevels()).toEqual([]);
    });

    it('is hidden for an output-level planned result', () => {
      fixture.componentRef.setInput('resultLevelId', 1);
      component.isPlanned.set(true);
      expect(component.showLevelSelector()).toBe(false);
    });

    it('is visible for an output-level unplanned result', () => {
      fixture.componentRef.setInput('resultLevelId', 1);
      component.isPlanned.set(false);
      expect(component.showLevelSelector()).toBe(true);
    });

    it('is visible when there is no result level', () => {
      component.isPlanned.set(true);
      expect(component.showLevelSelector()).toBe(true);
    });

    it('keeps only outputs for result level 1', () => {
      component.tocLevels.set(levels);
      component.isPlanned.set(true);
      fixture.componentRef.setInput('resultLevelId', 1);
      expect(component.filteredLevels().map(l => l.toc_level_id)).toEqual([1]);
    });

    it('drops outputs for result level 3', () => {
      component.tocLevels.set(levels);
      component.isPlanned.set(true);
      fixture.componentRef.setInput('resultLevelId', 3);
      expect(component.filteredLevels().map(l => l.toc_level_id)).toEqual([2, 3]);
    });

    it('keeps only outputs for result level 4', () => {
      component.tocLevels.set(levels);
      component.isPlanned.set(true);
      fixture.componentRef.setInput('resultLevelId', 4);
      expect(component.filteredLevels().map(l => l.toc_level_id)).toEqual([1]);
    });

    it('keeps every level for any other result level', () => {
      component.tocLevels.set(levels);
      component.isPlanned.set(true);
      fixture.componentRef.setInput('resultLevelId', 2);
      expect(component.filteredLevels().length).toBe(3);
    });

    it('resolves the selected level name and defaults to empty', () => {
      component.tocLevels.set(levels);
      expect(component.selectedLevelName()).toBe('');
      component.selectedLevelId.set(2);
      expect(component.selectedLevelName()).toBe('Outcome');
    });

    it('shows the why-reported box only for unplanned results', () => {
      expect(component.showWhyReported()).toBe(false);
      component.isPlanned.set(false);
      expect(component.showWhyReported()).toBe(true);
      component.isPlanned.set(true);
      expect(component.showWhyReported()).toBe(false);
    });
  });

  // ── active list ────────────────────────────────────────────────────
  describe('activeList', () => {
    beforeEach(() => {
      component.outputList.set([{ toc_result_id: 1 }]);
      component.outcomeList.set([{ toc_result_id: 2 }, { toc_result_id: 3 }]);
      component.eoiList.set([{ toc_result_id: 4 }, { toc_result_id: 5 }, { toc_result_id: 6 }]);
    });

    it('returns the output list for level 1', () => {
      component.selectedLevelId.set(1);
      expect(component.activeList().length).toBe(1);
    });

    it('returns the outcome list for level 2', () => {
      component.selectedLevelId.set(2);
      expect(component.activeList().length).toBe(2);
    });

    it('returns the eoi list for level 3', () => {
      component.selectedLevelId.set(3);
      expect(component.activeList().length).toBe(3);
    });

    it('returns nothing for an unknown level', () => {
      component.selectedLevelId.set(9);
      expect(component.activeList()).toEqual([]);
    });
  });

  // ── toc result items ───────────────────────────────────────────────
  describe('tocResultItems', () => {
    beforeEach(() => component.selectedLevelId.set(1));

    it('flags a match and appends the result type badge', () => {
      creationService.resultTypeId.set(1);
      component.outputList.set([
        { toc_result_id: 1, wp_short_name: 'WP1', title: 'T', indicators: [{ type_value: '%Number of Policy%' }] },
      ]);
      const item = component.tocResultItems()[0];
      expect(item.hasMatch).toBe(true);
      expect(item.select_label).toContain('Match [Policy Change]');
    });

    it('flags a review-needed item when only other indicators exist', () => {
      creationService.resultTypeId.set(1);
      component.outputList.set([
        { toc_result_id: 1, wp_short_name: 'WP1', title: 'T', indicators: [{ type_value: '%Number of innovations%' }] },
      ]);
      const item = component.tocResultItems()[0];
      expect(item.hasMatch).toBe(false);
      expect(item.hasOther).toBe(true);
      expect(item.select_label).toContain('Review needed');
    });

    it('adds no badge for neutral indicators and falls back to AOW + extraInformation', () => {
      component.outputList.set([{ toc_result_id: 1, extraInformation: 'Extra' }]);
      const item = component.tocResultItems()[0];
      expect(item.hasMatch).toBe(false);
      expect(item.hasOther).toBe(false);
      expect(item.select_label).toBe('Extra — Extra');
    });

    it('falls back to AOW and an empty title when nothing is provided', () => {
      component.outputList.set([{ toc_result_id: 1 }]);
      expect(component.tocResultItems()[0].select_label).toBe('AOW — ');
    });

    it('escapes HTML in the label', () => {
      component.outputList.set([{ toc_result_id: 1, wp_short_name: '<b>&"', title: 'x' }]);
      const label = component.tocResultItems()[0].select_label;
      expect(label).toContain('&lt;b&gt;&amp;&quot;');
    });
  });

  // ── indicators list ────────────────────────────────────────────────
  describe('indicatorsList', () => {
    beforeEach(() => {
      component.selectedLevelId.set(1);
      creationService.resultTypeId.set(1);
    });

    it('is empty while no toc result is selected', () => {
      expect(component.indicatorsList()).toEqual([]);
    });

    it('is empty when the selected toc result cannot be found', () => {
      component.outputList.set([{ toc_result_id: 1, indicators: [] }]);
      component.selectedTocResultId.set(77);
      expect(component.indicatorsList()).toEqual([]);
    });

    it('adds unit and target badges to matching indicators', () => {
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [
            {
              related_node_id: 'n1',
              indicator_description: 'Desc',
              type_value: '%Number of Policy%',
              unit_messurament: 'policies',
              targets: [{ target_value: 12 }],
            },
          ],
        },
      ]);
      component.selectedTocResultId.set(1);
      expect(component.indicatorsList()[0].select_label).toBe('Desc · policies · Target: 12');
    });

    it('falls back to N/A when no target exists and no unit is given', () => {
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [{ related_node_id: 'n1', type_value: '%Number of Policy%' }],
        },
      ]);
      component.selectedTocResultId.set(1);
      expect(component.indicatorsList()[0].select_label).toBe('Unnamed · Target: N/A');
    });

    it('adds the other-type badge for non matching indicators', () => {
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [{ related_node_id: 'n1', indicator_description: 'D', type_value: '%Number of innovations%' }],
        },
      ]);
      component.selectedTocResultId.set(1);
      expect(component.indicatorsList()[0].select_label).toBe('D · [Innovation Development]');
    });

    it('adds no badge for neutral indicators and tolerates a missing indicators array', () => {
      component.outputList.set([{ toc_result_id: 1 }]);
      component.selectedTocResultId.set(1);
      expect(component.indicatorsList()).toEqual([]);
    });

    it('exposes the selected indicator data and clears it when nothing is selected', () => {
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [{ related_node_id: 'n1', type_value: '%Number of Policy%' }],
        },
      ]);
      component.selectedTocResultId.set(1);
      expect(component.selectedIndicatorData()).toBeNull();
      component.selectedIndicatorId.set('n1');
      expect(component.selectedIndicatorData()?.related_node_id).toBe('n1');
      component.selectedIndicatorId.set('missing');
      expect(component.selectedIndicatorData()).toBeNull();
    });

    it('reports whether a matching indicator is missing', () => {
      expect(component.hasNoMatchingIndicator()).toBe(false);
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [{ related_node_id: 'n1', type_value: '%Number of innovations%' }],
        },
      ]);
      component.selectedTocResultId.set(1);
      expect(component.hasNoMatchingIndicator()).toBe(true);
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [{ related_node_id: 'n1', type_value: '%Number of Policy%' }],
        },
      ]);
      expect(component.hasNoMatchingIndicator()).toBe(false);
    });

    it('finds an indicator by id and returns null otherwise', () => {
      component.outputList.set([
        {
          toc_result_id: 1,
          indicators: [{ related_node_id: 'n1', type_value: '%Number of Policy%' }],
        },
      ]);
      component.selectedTocResultId.set(1);
      expect(component.findIndicatorById('n1')).not.toBeNull();
      expect(component.findIndicatorById('nope')).toBeNull();
    });
  });

  // ── indicator matching ─────────────────────────────────────────────
  describe('getIndicatorMatchInfo', () => {
    it('returns a neutral standard label when there is no type', () => {
      expect(component.getIndicatorMatchInfo({}).cssClass).toBe('bp-toc-match--neutral');
    });

    it.each([
      [2, '%Innovation Use%', 'Innovation Use'],
      [10, '%Innovation Use%', 'Innovation Use'],
      [5, '%Number of people trained%', 'Capacity Sharing'],
      [6, '%Number of knowledge products%', 'Knowledge Product'],
      [7, '%Number of innovations%', 'Innovation Development'],
    ])('matches result type %i with %s', (typeId, typeValue, label) => {
      creationService.resultTypeId.set(typeId);
      const info = component.getIndicatorMatchInfo({ type_value: typeValue });
      expect(info.cssClass).toBe('bp-toc-match--match');
      expect(info.label).toBe(label);
    });

    it('falls back to the indicator type name for an unmapped type', () => {
      creationService.resultTypeId.set(1);
      const info = component.getIndicatorMatchInfo({ type_value: 'unknown', type_name: 'Custom' });
      expect(info).toEqual({ label: 'Custom', cssClass: 'bp-toc-match--neutral' });
    });

    it('falls back to Standard when no type name is present', () => {
      creationService.resultTypeId.set(1);
      expect(component.getIndicatorMatchInfo({ type_value: 'unknown' }).label).toBe('Standard');
    });
  });

  // ── selection handlers ─────────────────────────────────────────────
  describe('selection handlers', () => {
    it('resets downstream selections on level change', () => {
      jest.useFakeTimers();
      component.selectedLevelId.set(1);
      component.selectedTocResultId.set(10);
      component.selectedIndicatorId.set('ind');
      component.contributionValue.set(4);
      component.onLevelChange(2);
      expect(component.selectedTocResultId()).toBeNull();
      expect(component.selectedIndicatorId()).toBeNull();
      expect(component.contributionValue()).toBeNull();
      jest.advanceTimersByTime(1000);
      expect(autoSave.saveTocMapping).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('resets the indicator when a new toc result is picked', () => {
      jest.useFakeTimers();
      component.selectedTocResultId.set(1);
      component.selectedIndicatorId.set('ind');
      component.onTocResultSelect(2);
      expect(component.selectedIndicatorId()).toBeNull();
      jest.advanceTimersByTime(1000);
      expect(autoSave.saveTocMapping).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('resets the contribution when a new indicator is picked', () => {
      jest.useFakeTimers();
      component.selectedIndicatorId.set('a');
      component.contributionValue.set(3);
      component.onIndicatorSelect('b');
      expect(component.contributionValue()).toBeNull();
      jest.advanceTimersByTime(1000);
      jest.useRealTimers();
    });

    it('debounces consecutive saves into one call', () => {
      jest.useFakeTimers();
      component.onLevelChange(1);
      component.onLevelChange(2);
      jest.advanceTimersByTime(1000);
      expect(autoSave.saveTocMapping).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('sends the whole toc payload when values are set', () => {
      jest.useFakeTimers();
      component.isPlanned.set(true);
      component.selectedTocResultId.set(20);
      component.selectedIndicatorId.set('ind-9');
      component.contributionValue.set(7);
      component.narrative.set('Story');
      component.onLevelChange(3);
      jest.advanceTimersByTime(1000);
      expect(autoSave.saveTocMapping).toHaveBeenCalledWith({
        planned_result: true,
        toc_level_id: 3,
        toc_result_id: undefined,
        indicator_id: undefined,
        contributing_indicator: undefined,
        toc_progressive_narrative: 'Story',
      });
      jest.useRealTimers();
    });
  });

  // ── planned change ─────────────────────────────────────────────────
  describe('onPlannedChange', () => {
    it('preselects level 1 for a planned output result', () => {
      fixture.detectChanges();
      fixture.componentRef.setInput('resultLevelId', 1);
      component.onPlannedChange(true);
      expect(component.selectedLevelId()).toBe(1);
    });

    it('clears the level for any other combination', () => {
      fixture.detectChanges();
      fixture.componentRef.setInput('resultLevelId', 3);
      component.onPlannedChange(true);
      expect(component.selectedLevelId()).toBeNull();
    });

    it('omits the program code when there is no primary SP', () => {
      fixture.detectChanges();
      creationService.selectedPrimarySp.set(null);
      component.onPlannedChange(false);
      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({ planned_result: false });
    });
  });

  // ── contribution value ─────────────────────────────────────────────
  describe('setContributionValue', () => {
    it('clears the value for null, empty string and undefined', () => {
      component.contributionValue.set(5);
      component.setContributionValue(null);
      expect(component.contributionValue()).toBeNull();
      component.contributionValue.set(5);
      component.setContributionValue('');
      expect(component.contributionValue()).toBeNull();
      component.contributionValue.set(5);
      component.setContributionValue(undefined as any);
      expect(component.contributionValue()).toBeNull();
    });

    it('clears the value when the input is not a number', () => {
      component.setContributionValue('abc');
      expect(component.contributionValue()).toBeNull();
    });

    it('rounds and clamps negative values to zero', () => {
      component.setContributionValue(-5);
      expect(component.contributionValue()).toBe(0);
      component.setContributionValue('4.6');
      expect(component.contributionValue()).toBe(5);
    });

    it('blocks invalid keystrokes only', () => {
      const blocked = { key: '-', preventDefault: jest.fn() } as any;
      component.preventInvalidKeys(blocked);
      expect(blocked.preventDefault).toHaveBeenCalled();
      const allowed = { key: '5', preventDefault: jest.fn() } as any;
      component.preventInvalidKeys(allowed);
      expect(allowed.preventDefault).not.toHaveBeenCalled();
    });
  });

  // ── narrative ──────────────────────────────────────────────────────
  it('debounces the narrative before saving', () => {
    jest.useFakeTimers();
    component.onNarrativeInput('first');
    component.onNarrativeInput('second');
    expect(component.narrative()).toBe('second');
    jest.advanceTimersByTime(1500);
    jest.advanceTimersByTime(1000);
    expect(autoSave.saveTocMapping).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  // ── display labels ─────────────────────────────────────────────────
  describe('getDisplayLabel', () => {
    it('prefers extraInformation', () => {
      expect(component.getDisplayLabel({ extraInformation: 'Extra', title: 'T' })).toBe('Extra');
    });

    it('combines the work package and title', () => {
      expect(component.getDisplayLabel({ wp_short_name: 'WP1', title: 'T' })).toBe('WP1 - T');
    });

    it('falls back to the title, then to Unnamed', () => {
      expect(component.getDisplayLabel({ title: 'Only title' })).toBe('Only title');
      expect(component.getDisplayLabel({})).toBe('Unnamed');
    });
  });

  // ── loading state ──────────────────────────────────────────────────
  describe('loading', () => {
    it('hydrates the component from the saved toc state', async () => {
      autoSave.loadTocState.mockResolvedValue({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: 33,
        indicator_id: 'ind-3',
        contributing_indicator: 8,
        toc_progressive_narrative: 'saved narrative',
      });
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();
      expect(component.isPlanned()).toBe(true);
      expect(component.selectedLevelId()).toBe(2);
      expect(component.selectedTocResultId()).toBe(33);
      expect(component.selectedIndicatorId()).toBe('ind-3');
      expect(component.contributionValue()).toBe(8);
      expect(component.narrative()).toBe('saved narrative');
    });

    it('keeps the defaults when the saved toc state is empty', async () => {
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();
      expect(component.isPlanned()).toBeNull();
      expect(component.selectedLevelId()).toBeNull();
      expect(component.narrative()).toBe('');
    });

    it('defaults the toc levels to an empty array', () => {
      api.tocApiSE.GET_AllTocLevels.mockReturnValue(of({ response: null }));
      fixture.detectChanges();
      expect(component.tocLevels()).toEqual([]);
    });

    it('empties every list when the toc config requests fail', () => {
      api.tocApiSE.GET_tocLevelsByconfig.mockReturnValue(throwError(() => new Error('boom')));
      fixture.detectChanges();
      component.onPlannedChange(true);
      expect(component.outputList()).toEqual([]);
      expect(component.outcomeList()).toEqual([]);
      expect(component.eoiList()).toEqual([]);
    });

    it('defaults each list to an empty array when the response is null', () => {
      api.tocApiSE.GET_tocLevelsByconfig.mockReturnValue(of({ response: null }));
      fixture.detectChanges();
      component.onPlannedChange(true);
      expect(component.outputList()).toEqual([]);
    });

    it('does not fetch lists on init when there is no initiative', () => {
      creationService.resultInitiativeId.set(null);
      fixture.detectChanges();
      component.ngOnInit();
      expect(api.tocApiSE.GET_tocLevelsByconfig).not.toHaveBeenCalled();
    });

    it('re-fetches on init when the initiative is already known', () => {
      fixture.detectChanges();
      component.isPlanned.set(true);
      api.tocApiSE.GET_tocLevelsByconfig.mockClear();
      component.ngOnInit();
      expect(api.tocApiSE.GET_tocLevelsByconfig).toHaveBeenCalled();
    });

    it('skips fetching lists when there is no result id', () => {
      creationService.currentResultId.set(null);
      fixture.detectChanges();
      api.tocApiSE.GET_tocLevelsByconfig.mockClear();
      component.onPlannedChange(true);
      expect(api.tocApiSE.GET_tocLevelsByconfig).not.toHaveBeenCalled();
    });
  });
});
