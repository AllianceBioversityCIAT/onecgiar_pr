import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultipleWPsContentComponent } from './multiple-wps-content.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MappedResultsModalComponent } from '../mapped-results-modal/mapped-results-modal.component';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';

jest.useFakeTimers();

describe('MultipleWPsContentComponent', () => {
  let component: MultipleWPsContentComponent;
  let fixture: ComponentFixture<MultipleWPsContentComponent>;
  let mockApiService: any;
  let mockResponse = {
    informationIndicator: [{}],
    impactAreas: [
      {
        name: 'name',
        target: 'target'
      }
    ],
    sdgTargets: [
      {
        sdg_target_code: 'code',
        sdg_target: 'target',
      }
    ],
    actionAreaOutcome: [
      {
        actionAreaId: 1,
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      },
      {
        actionAreaId: 2,
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      },
      {
        actionAreaId: 3,
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement'
      }
    ],
    is_sdg_action_impact: true,
    wpinformation: {
      wpTitle: 'title',
      extraInformation: {
        result_title: 'title',
        wp_acronym: 'acronym'
      }
    },
  };

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        Get_indicator: () => of({ response: mockResponse }),
      },
      tocApiSE: {
        GET_AllTocLevels: () => of({ response: [] }),
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        MultipleWPsContentComponent,
        MappedResultsModalComponent
      ],
      imports: [
        HttpClientTestingModule,
        TableModule,
        DialogModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MultipleWPsContentComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnChanges()', () => {
    it('should call getIndicator on ngOnChanges when resultLevelId = 1 and outputList.length > 0 and eoiList.length > 0', () => {
      component.showMultipleWPsContent = true;
      component.resultLevelId = 1;
      component.outputList = [{}];
      component.eoiList = [{}];
      component.activeTab = { toc_result_id: 1, initiative_id: 1 };

      const spy = jest.spyOn(component, 'getIndicator')

      component.ngOnChanges();

      expect(spy).toHaveBeenCalled();
    });

    it('should call getIndicator on ngOnChanges when resultLevelId = 2 and outcomeList.length > 0 and eoiList.length > 0', () => {
      component.showMultipleWPsContent = true;
      component.resultLevelId = 2;
      component.outcomeList = [{}];
      component.eoiList = [{}];
      component.activeTab = { toc_result_id: 1, initiative_id: 1 };

      const spy = jest.spyOn(component, 'getIndicator')

      component.ngOnChanges();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getIndicator()', () => {
    it('should set indicatorView to true after successful Get_indicator call', () => {
      component.activeTab = {};
      const spy = jest.spyOn(mockApiService.resultsSE, 'Get_indicator');

      component.getIndicator();
      jest.runAllTimers();

      expect(spy).toHaveBeenCalledWith(
        component.activeTab?.toc_result_id,
        component.activeTab?.initiative_id
      );
      expect(component.activeTab.indicators).toEqual(mockResponse.informationIndicator);
      expect(component.activeTab.impactAreasTargets[0]).toEqual({
        name: 'name',
        target: 'target',
        full_name: '<strong>name</strong> - target'
      });
      expect(component.activeTab.sdgTargest[0]).toEqual({
        sdg_target_code: 'code',
        sdg_target: 'target',
        full_name: '<strong>code</strong> - target'
      });
      expect(component.activeTab.actionAreaOutcome[0]).toEqual({
        actionAreaId: 1,
        outcomeSMOcode: 'outcomeSMOcode',
        outcomeStatement: 'outcomeStatement',
        full_name: '<strong>Systems Transformation</strong> (outcomeSMOcode) - outcomeStatement'
      });
      expect(component.activeTab.is_sdg_action_impact).toEqual(mockResponse.is_sdg_action_impact);
      expect(component.activeTab.wpinformation).toEqual(mockResponse.wpinformation);
      expect(component.activeTab.wpinformation.wpTitle).toEqual("<strong>acronym</strong> <br> <div class=\"select_item_description\">title</div>");
      expect(component.indicatorView).toBeTruthy();
    });
    it('should set indicatorView to true after successful Get_indicator call when wpinformation?.extraInformation?.wp_acronym is undefined', () => {
      component.activeTab = {};
      mockResponse.wpinformation.extraInformation.wp_acronym = undefined
      const spy = jest.spyOn(mockApiService.resultsSE, 'Get_indicator');

      component.getIndicator();
      jest.runAllTimers();

      expect(spy).toHaveBeenCalledWith(
        component.activeTab?.toc_result_id,
        component.activeTab?.initiative_id
      );
      expect(component.activeTab.indicators).toEqual(mockResponse.informationIndicator);
      expect(component.activeTab.wpinformation.wpTitle).toEqual("<strong>title</strong>");
      expect(component.indicatorView).toBeTruthy();
    });
    it('should handle error when Get_indicator call fails', () => {
      const errorMessage = 'Your error message';
      const spy = jest.spyOn(mockApiService.resultsSE, 'Get_indicator')
        .mockReturnValue(throwError(errorMessage));;
      const spyConsoleError = jest.spyOn(console, 'error');

      component.getIndicator();

      expect(spy).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('narrativeTypeResult()', () => {
    it('should return correct narrative for result level 1 and planned result', () => {
      component.activeTab = { planned_result: true };
      component.resultLevelId = 1;

      const result = component.narrativeTypeResult();

      expect(result).toBe('Indicator(s) of the output selected');
    });
    it('should return correct narrative for result level 1 and no planned result', () => {
      component.activeTab = {};
      component.resultLevelId = 1;

      const result = component.narrativeTypeResult();

      expect(result).toBe('Indicator(s) of the outcome selected');
    });
  });

  describe('dynamicProgressLabel()', () => {
    it('should return correct label for result level 1 and planned result', () => {
      component.activeTab = { planned_result: true };
      component.resultLevelId = 1;

      const result = component.dynamicProgressLabel();

      expect(result).toBe('Progress narrative of the Output');
    });
    it('should return correct label for result level 1 and no planned result', () => {
      component.activeTab = {};
      component.resultLevelId = 1;

      const result = component.dynamicProgressLabel();

      expect(result).toBe('Progress narrative of the Outcome');
    });
  });

  describe('pushSelectedOptions()', () => {
    it('should call validateSelectedOptionOutPut for toc_level_id 1', () => {
      const tab = [{
        toc_level_id: 1,
      }];
      component.allTabsCreated = tab
      const validateSelectedOptionOutPutSpy = jest.spyOn(component, 'validateSelectedOptionOutPut');

      component.pushSelectedOptions();

      expect(validateSelectedOptionOutPutSpy).toHaveBeenCalledWith(tab[0]);
    });
    it('should call validateSelectedOptionOutCome for toc_level_id 2', () => {
      const tab = [{
        toc_level_id: 2,
      }];
      component.allTabsCreated = tab
      const validateSelectedOptionOutComeSpy = jest.spyOn(component, 'validateSelectedOptionOutCome');

      component.pushSelectedOptions();

      expect(validateSelectedOptionOutComeSpy).toHaveBeenCalledWith(tab[0]);
    });
    it('should call validateSelectedOptionEOI for toc_level_id 3', () => {
      const tab = [{
        toc_level_id: 3,
      }];
      component.allTabsCreated = tab
      const validateSelectedOptionEOISpy = jest.spyOn(component, 'validateSelectedOptionEOI');

      component.pushSelectedOptions();

      expect(validateSelectedOptionEOISpy).toHaveBeenCalledWith(tab[0]);
    });
  });

  describe('validateSelectedOptionOutPut()', () => {
    it('should add selected option to selectedOptionsOutput and update outputList', () => {
      const selectedOption = { toc_result_id: 1, work_package_id: 1 };
      const tab = { toc_result_id: 1, uniqueId: 'tabUniqueId' };
      component.activeTab = { toc_result_id: 1, uniqueId: 'activeTabUniqueId' };
      component.outputList = [selectedOption];
      component.selectedOptionsOutput = [{
        tabId: 'tabUniqueId'
      }];

      component.validateSelectedOptionOutPut(tab);

      expect(component.selectedOptionsOutput.length).toBe(1);
      expect(component.selectedOptionsOutput[0].tabId).toBe(tab.uniqueId);
      expect(component.outputList.length).toBe(1);
      expect(component.outputList[0].disabledd).toBeTruthy();
    });

    it('should add selected option to selectedOptionsOutput and update outputList when tab is undefined', () => {
      const selectedOption = { toc_result_id: 1, work_package_id: 1 };
      const tab = undefined;
      component.activeTab = { toc_result_id: 1, uniqueId: 'activeTabUniqueId' };
      component.outputList = [selectedOption];
      component.selectedOptionsOutput = [];

      component.validateSelectedOptionOutPut(tab);

      expect(component.selectedOptionsOutput.length).toBe(1);
      expect(component.selectedOptionsOutput[0].tabId).toBe(component.activeTab.uniqueId);
      expect(component.outputList.length).toBe(1);
    });
  });

  describe('validateSelectedOptionOutCome()', () => {
    it('should add selected option to selectedOptionsOutcome and update outcomeList', () => {
      const selectedOption = { toc_result_id: 1, work_package_id: 1 };
      const tab = { toc_result_id: 1, uniqueId: 'tabUniqueId' };
      component.activeTab = { toc_result_id: 1, uniqueId: 'activeTabUniqueId' };
      component.outcomeList = [selectedOption];
      component.selectedOptionsOutcome = [{
        tabId: 'tabUniqueId'
      }];

      component.validateSelectedOptionOutCome(tab);

      expect(component.selectedOptionsOutcome.length).toBe(1);
      expect(component.selectedOptionsOutcome[0].tabId).toBe(tab.uniqueId);
      expect(component.outcomeList.length).toBe(1);
      expect(component.outcomeList[0].disabledd).toBeTruthy();
    });
    it('should add selected option to selectedOptionsOutcome and update outcomeList when tab is undefined', () => {
      const selectedOption = { toc_result_id: 1, work_package_id: 1 };
      const tab = undefined;
      component.activeTab = { toc_result_id: 1, uniqueId: 'activeTabUniqueId' };
      component.outcomeList = [selectedOption];
      component.selectedOptionsOutcome = [];

      component.validateSelectedOptionOutCome(tab);

      expect(component.selectedOptionsOutcome.length).toBe(1);
      expect(component.selectedOptionsOutcome[0].tabId).toBe(component.activeTab.uniqueId);
      expect(component.outcomeList.length).toBe(1);
    });
  });

  describe('validateSelectedOptionEOI()', () => {
    it('should add selected option to selectedOptionsEOI and update eoiList', () => {
      const selectedOption = { toc_result_id: 1, work_package_id: 1 };
      const tab = { toc_result_id: 1, uniqueId: 'tabUniqueId' };
      component.activeTab = { toc_result_id: 1, uniqueId: 'activeTabUniqueId' };
      component.eoiList = [selectedOption];
      component.selectedOptionsEOI = [{
        tabId: 'tabUniqueId'
      }];

      component.validateSelectedOptionEOI(tab);

      expect(component.selectedOptionsEOI.length).toBe(1);
      expect(component.selectedOptionsEOI[0].tabId).toBe(tab.uniqueId);
      expect(component.eoiList.length).toBe(1);
      expect(component.eoiList[0].disabledd).toBeTruthy();
    });
    it('should add selected option to selectedOptionsEOI and update eoiList when tab is undefined', () => {
      const selectedOption = { toc_result_id: 1, work_package_id: 1 };
      const tab = undefined;
      component.activeTab = { toc_result_id: 1, uniqueId: 'activeTabUniqueId' };
      component.eoiList = [selectedOption];
      component.selectedOptionsEOI = [];

      component.validateSelectedOptionEOI(tab);

      expect(component.selectedOptionsEOI.length).toBe(1);
      expect(component.selectedOptionsEOI[0].tabId).toBe(component.activeTab.uniqueId);
      expect(component.eoiList.length).toBe(1);
    });
  });

  describe('dynamicMappedResultButtonText()', () => {
    it('should return correct button text for result level 1 and planned result', () => {
      component.activeTab = { planned_result: true };
      component.resultLevelId = 1;

      const result = component.dynamicMappedResultButtonText();

      expect(result).toBe('See all results contributing to this TOC Output');
    });
    it('should return correct button text for result level 1 and no planned result', () => {
      component.activeTab = {};
      component.resultLevelId = 1;

      const result = component.dynamicMappedResultButtonText();

      expect(result).toBe('See all results contributing to this TOC Outcome');
    });
  });

  describe('dynamicMappedResultButtonText()', () => {
    it('should set mappedResultsModal to true and columnsOrder with correct values', () => {
      component.openMappedResultsModal();

      const expectedColumnsOrder = [
        { title: 'Result code', attr: 'result_code' },
        { title: 'Title', attr: 'title', link: true },
        { title: 'Indicator category', attr: 'result_type_name' },
        { title: 'Phase', attr: 'phase_name' },
        { title: 'Progress narrative against the target', attr: 'toc_progressive_narrative' }
      ];

      expect(component.mappedResultService.mappedResultsModal).toBeTruthy();
      expect(component.mappedResultService.columnsOrder).toEqual(expectedColumnsOrder);
    });
  });

  describe('showNarrative()', () => {
    it('should return true for result level 2', () => {
      component.resultLevelId = 2;

      const result = component.showNarrative();

      expect(result).toBeTruthy();
    });
    it('should return true for result level 1 and no planned result', () => {
      component.resultLevelId = 1;
      component.activeTab = { planned_result: false };

      const result = component.showNarrative();

      expect(result).toBeTruthy();
    });
    it('should return false for result level 1 and planned result', () => {
      component.resultLevelId = 1;
      component.activeTab = { planned_result: true };

      const result = component.showNarrative();

      expect(result).toBeFalsy();
    });
    it('should return true if at least one target has indicator_question === false', () => {
      component.activeTab = {
        indicators: [
          {
            targets: [
              {
                indicator_question: false
              }
            ]
          }
        ]
      };

      const result = component.showNarrative();

      expect(result).toBeTruthy();
    });
  });

  describe('ngOnChanges', () => {
    it('should call getIndicator and pushSelectedOptions when showMultipleWPsContent is true and the required conditions are met', () => {
      component.showMultipleWPsContent = true;
      component.resultLevelId = 1;
      component.outputList = [{}];
      component.eoiList = [{}];
      component.activeTab = { toc_result_id: 1, initiative_id: 1 };
      jest.spyOn(component, 'getIndicator');
      jest.spyOn(component, 'pushSelectedOptions');

      component.ngOnChanges();

      expect(component.getIndicator).toHaveBeenCalled();
      expect(component.pushSelectedOptions).toHaveBeenCalled();
    });

    it('should not call getIndicator and pushSelectedOptions when showMultipleWPsContent is false', () => {
      component.showMultipleWPsContent = false;
      jest.spyOn(component, 'getIndicator');
      jest.spyOn(component, 'pushSelectedOptions');

      component.ngOnChanges();

      expect(component.getIndicator).not.toHaveBeenCalled();
      expect(component.pushSelectedOptions).not.toHaveBeenCalled();
    });
  });

  describe('getIndicator', () => {
    it('should set indicatorView to false', () => {
      component.indicatorView = true;

      component.getIndicator();

      expect(component.indicatorView).toBe(false);
    });

    it('should set indicatorView to true after calling getIndicator', () => {
      component.activeTab = { toc_result_id: 1, initiative_id: 1 };

      component.getIndicator();

      setTimeout(() => {
        expect(component.indicatorView).toBe(true);
      }, 80);
    });
  });

  describe('narrativeTypeResult', () => {
    it('should return "Indicator(s) of the output selected" when calling narrativeTypeResult with planned_result = true and resultLevelId = 1', () => {
      component.activeTab = { planned_result: true };
      component.resultLevelId = 1;

      expect(component.narrativeTypeResult()).toBe('Indicator(s) of the output selected');
    });

    it('should return "Indicator(s) of the outcome selected" when calling narrativeTypeResult without planned_result = false and resultLevelId = 1', () => {
      component.activeTab = {};
      component.resultLevelId = 1;

      expect(component.narrativeTypeResult()).toBe('Indicator(s) of the outcome selected');
    });
  });

  describe('dynamicProgressLabel', () => {
    it('should return "Progress narrative of the Output" when calling dynamicProgressLabel with planned_result = true and resultLevelId = 1', () => {
      component.activeTab = { planned_result: true };
      component.resultLevelId = 1;

      expect(component.dynamicProgressLabel()).toBe('Progress narrative of the Output');
    });

    it('should return "Progress narrative of the Outcome" when calling dynamicProgressLabel without planned_result = false and resultLevelId = 1', () => {
      component.activeTab = {};
      component.resultLevelId = 1;

      expect(component.dynamicProgressLabel()).toBe('Progress narrative of the Outcome');
    });
  });

  describe('pushSelectedOptions', () => {
    it('should call validateSelectedOptionOutPut when toc_level_id = 1', () => {
      const tab = { toc_level_id: 1 };
      component.allTabsCreated = [tab];

      jest.spyOn(component, 'validateSelectedOptionOutPut');

      component.pushSelectedOptions();

      expect(component.validateSelectedOptionOutPut).toHaveBeenCalled();
    });

    it('should call validateSelectedOptionOutCome when toc_level_id = 2', () => {
      const tab = { toc_level_id: 2 };
      component.allTabsCreated = [tab];

      jest.spyOn(component, 'validateSelectedOptionOutCome');

      component.pushSelectedOptions();

      expect(component.validateSelectedOptionOutCome).toHaveBeenCalledWith(tab);
    });

    it('should call validateSelectedOptionEOI when toc_level_id = 3', () => {
      const tab = { toc_level_id: 3 };
      component.allTabsCreated = [tab];

      jest.spyOn(component, 'validateSelectedOptionEOI');

      component.pushSelectedOptions();

      expect(component.validateSelectedOptionEOI).toHaveBeenCalledWith(tab);
    });
  });

  describe('validateSelectedOptionOutPut', () => {
    it('should set disabledd = true if option was selected by another tab', () => {
      const tab = { toc_result_id: 1, uniqueId: 'tab1' };
      component.outputList = [
        { toc_result_id: 1, work_package_id: 1, disabledd: false },
        { toc_result_id: 2, work_package_id: 2, disabledd: false }
      ];
      component.activeTab = { uniqueId: 'tab2' };
      component.selectedOptionsOutput = [];

      component.validateSelectedOptionOutPut(tab);

      expect(component.selectedOptionsOutput.length).toBe(1);
      expect(component.selectedOptionsOutput[0]).toEqual({ toc_result_id: 1, work_package_id: 1, tabId: 'tab1', disabledd: true });

      expect(component.outputList[0].disabledd).toBe(true);
      expect(component.outputList[1].disabledd).toBe(false);
    });

    it('should set disabledd = false if the option is selected by same tab', () => {
      const tab = { toc_result_id: 1, uniqueId: 'tab1' };
      component.outputList = [
        { toc_result_id: 1, work_package_id: 1, disabledd: false },
        { toc_result_id: 2, work_package_id: 2, disabledd: false }
      ];
      component.activeTab = { uniqueId: 'tab1' };
      component.selectedOptionsOutput = [];

      component.validateSelectedOptionOutPut(tab);

      expect(component.selectedOptionsOutput.length).toBe(1);
      expect(component.selectedOptionsOutput[0]).toEqual({ toc_result_id: 1, work_package_id: 1, tabId: 'tab1', disabledd: false });

      expect(component.outputList[0].disabledd).toBe(false);
      expect(component.outputList[1].disabledd).toBe(false);
    });
  });

  describe('validateSelectedOptionOutCome', () => {
    it('should set disabledd = true if option was selected by another tab', () => {
      const tab = { toc_result_id: 1, uniqueId: 'tab1' };
      component.outcomeList = [
        { toc_result_id: 1, work_package_id: 1, disabledd: false },
        { toc_result_id: 2, work_package_id: 2, disabledd: false }
      ];
      component.activeTab = { uniqueId: 'tab2' };
      component.selectedOptionsOutcome = [];

      component.validateSelectedOptionOutCome(tab);

      expect(component.selectedOptionsOutcome.length).toBe(1);
      expect(component.selectedOptionsOutcome[0]).toEqual({ toc_result_id: 1, work_package_id: 1, tabId: 'tab1', disabledd: true });

      expect(component.outcomeList[0].disabledd).toBe(true);
      expect(component.outcomeList[1].disabledd).toBe(false);
    });

    it('should set disabledd = false if the option is selected by same tab', () => {
      const tab = { toc_result_id: 1, uniqueId: 'tab1' };
      component.outcomeList = [
        { toc_result_id: 1, work_package_id: 1, disabledd: false },
        { toc_result_id: 2, work_package_id: 2, disabledd: false }
      ];
      component.activeTab = { uniqueId: 'tab1' };
      component.selectedOptionsOutcome = [];

      component.validateSelectedOptionOutCome(tab);

      expect(component.selectedOptionsOutcome.length).toBe(1);
      expect(component.selectedOptionsOutcome[0]).toEqual({ toc_result_id: 1, work_package_id: 1, tabId: 'tab1', disabledd: false });

      expect(component.outcomeList[0].disabledd).toBe(false);
      expect(component.outcomeList[1].disabledd).toBe(false);
    });
  });

  describe('validateSelectedOptionEOI', () => {
    it('should set disabledd = true if option is selected', () => {
      const tab = { toc_result_id: 1, uniqueId: 'tab1' };
      component.eoiList = [
        { toc_result_id: 1, disabledd: false },
        { toc_result_id: 2, disabledd: false }
      ];
      component.activeTab = { uniqueId: 'tab2' };
      component.selectedOptionsEOI = [];

      component.validateSelectedOptionEOI(tab);

      expect(component.selectedOptionsEOI.length).toBe(1);
      expect(component.selectedOptionsEOI[0]).toEqual({ toc_result_id: 1, tabId: 'tab1', disabledd: true });

      expect(component.eoiList[0].disabledd).toBe(true);
      expect(component.eoiList[1].disabledd).toBe(false);
    });
  });

  describe('dynamicMappedResultButtonText', () => {
    it('should return "See all results contributing to this TOC Output" when calling dynamicProgressNarrative with planned_result = true and resultLevelId = 1', () => {
      component.activeTab = { planned_result: true };
      component.resultLevelId = 1;

      expect(component.dynamicMappedResultButtonText()).toBe('See all results contributing to this TOC Output');
    });

    it('should return "See all results contributing to this TOC Outcome" when calling dynamicProgressNarrative without planned_result = false and resultLevelId = 1', () => {
      component.activeTab = { planned_result: false };
      component.resultLevelId = 1;

      expect(component.dynamicMappedResultButtonText()).toBe('See all results contributing to this TOC Outcome');
    });
  });

  describe('openMappedResultsModal', () => {
    it('should set mappedResultsModal to true and columnsOrder array', () => {
      component.openMappedResultsModal();

      expect(component.mappedResultService.mappedResultsModal).toBe(true);
      expect(component.mappedResultService.columnsOrder).toEqual([
        { title: 'Result code', attr: 'result_code' },
        { title: 'Title', attr: 'title', link: true },
        { title: 'Indicator category', attr: 'result_type_name' },
        { title: 'Phase', attr: 'phase_name' },
        { title: 'Progress narrative against the target', attr: 'toc_progressive_narrative' }
      ]);
    });
  });

  describe('showNarrative', () => {
    it('should return true when resultLevelId is 2', () => {
      component.resultLevelId = 2;

      expect(component.showNarrative()).toBe(true);
    });

    it('should return true when resultLevelId is 1 and planned_result is false', () => {
      component.resultLevelId = 1;
      component.activeTab = { planned_result: false };

      expect(component.showNarrative()).toBe(true);
    });

    it('should return false when resultLevelId is 1, planned_result is true, and activeTab.indicators is undefined', () => {
      component.resultLevelId = 1;
      component.activeTab = { planned_result: true };

      expect(component.showNarrative()).toBe(false);
    });

    it('should return false when resultLevelId is 1, planned_result is true, and activeTab.indicators is an empty array', () => {
      component.resultLevelId = 1;
      component.activeTab = { planned_result: true, indicators: [] };

      expect(component.showNarrative()).toBe(false);
    });

    it('should return false when resultLevelId is 1, planned_result is true, and activeTab.indicators do not have any targets with indicator_question set to false', () => {
      component.resultLevelId = 1;
      component.activeTab = {
        planned_result: true,
        indicators: [{ targets: [{ indicator_question: true }, { indicator_question: true }] }, { targets: [{ indicator_question: true }, { indicator_question: true }] }]
      };

      expect(component.showNarrative()).toBe(false);
    });

    it('should return true when resultLevelId is 1, planned_result is true, and activeTab.indicators have at least one target with indicator_question set to false', () => {
      component.resultLevelId = 1;
      component.activeTab = {
        planned_result: true,
        indicators: [{ targets: [{ indicator_question: true }, { indicator_question: false }] }, { targets: [{ indicator_question: true }, { indicator_question: true }] }]
      };

      expect(component.showNarrative()).toBe(true);
    });
  });
});
