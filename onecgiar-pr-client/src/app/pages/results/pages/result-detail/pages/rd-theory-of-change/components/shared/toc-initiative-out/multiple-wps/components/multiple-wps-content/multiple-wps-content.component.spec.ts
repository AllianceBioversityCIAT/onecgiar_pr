import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MultipleWPsContentComponent } from './multiple-wps-content.component';
import { MappedResultsModalComponent } from '../mapped-results-modal/mapped-results-modal.component';
import { jest } from '@jest/globals';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

describe('MultipleWPsContentComponent', () => {
  let component: MultipleWPsContentComponent;
  let fixture: ComponentFixture<MultipleWPsContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultipleWPsContentComponent, MappedResultsModalComponent],
      imports: [HttpClientTestingModule, DialogModule, TableModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MultipleWPsContentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
