import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TocInitiativeOutComponent } from './toc-initiative-out.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { PrYesOrNotComponent } from '../../../../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, provideZonelessChangeDetection } from '@angular/core';
import { FeedbackValidationDirective } from '../../../../../../../../../shared/directives/feedback-validation.directive';
import { FieldsManagerService } from '../../../../../../../../../shared/services/fields-manager.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-changes-services.service';

// Minimal stand-ins for the two children the template renders, so the assertions can be made on the
// real rendered DOM without pulling PrimeNG / the whole ToC tree into the fixture.
@Component({
  selector: 'app-pr-yes-or-not',
  template: `<button data-testid="pick-no" (click)="pick(false)">No</button>`,
  standalone: false
})
class StubPrYesOrNotComponent {
  @Input() label: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() editable: boolean;
  @Input() required: boolean;
  @Input() hideOptions: boolean;
  @Input() hideDescription: boolean;
  @Input() ngModel: any;
  @Output() ngModelChange = new EventEmitter<any>();
  @Output() selectOptionEvent = new EventEmitter<boolean>();

  pick(value: boolean) {
    this.ngModelChange.emit(value);
    this.selectOptionEvent.emit(value);
  }
}

@Component({
  selector: 'app-multiple-wps',
  template: `<div data-testid="wps-content" *ngIf="showMultipleWPsContent">Level / HLO / KPI form</div>`,
  standalone: false
})
class StubMultipleWPsComponent {
  @Input() editable: boolean;
  @Input() initiative: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean;
  @Input() isContributor: boolean;
  @Input() isNotifications: boolean;
  @Input() showMultipleWPsContent: boolean = true;
}

jest.useFakeTimers();

describe('TocInitiativeOutComponent', () => {
  let component: TocInitiativeOutComponent;
  let fixture: ComponentFixture<TocInitiativeOutComponent>;
  let mockApiService: any;
  const mockResponse = {
    version_id: '123'
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        get_vesrsionDashboard: () => of({ response: mockResponse })
      },
      dataControlSE: {
        tocUrl: ''
      }
    };

    await TestBed.configureTestingModule({
      declarations: [TocInitiativeOutComponent, YesOrNotByBooleanPipe, PrYesOrNotComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TocInitiativeOutComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call get_versionDashboard()on initialization', () => {
      const spy = jest.spyOn(component, 'get_versionDashboard');

      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getDescription()', () => {
    it('should return correct description for IPSR', () => {
      component.isIpsr = true;
      const officialCode = 'ABC';
      const shortName = 'name';
      component.initiative = {
        result_toc_results: [
          {
            toc_level_id: 1,
            planned_result: false,
            toc_result_id: 1
          }
        ]
      };

      const result = component.getDescription(officialCode, shortName);

      expect(result).toBe(`Is this result planned in the <strong>${officialCode} ${shortName}</strong> ToC?`);
    });
    it('should return correct description for non-IPSR', () => {
      component.isIpsr = false;
      const officialCode = 'XYZ';
      const shortName = 'name';
      component.initiative = {
        result_toc_results: [
          {
            toc_level_id: 1,
            planned_result: false,
            toc_result_id: 1
          }
        ]
      };
      const result = component.getDescription(officialCode, shortName);

      expect(result).toBe(`<strong>${officialCode} ${shortName}</strong> - Does this result match a planned result in your Theory of Change?`);
    });

    it('should return correct description for non-IPSR when initiative.result_toc_results is empty and isContributor is true', () => {
      component.isIpsr = false;
      component.isContributor = true;
      const officialCode = 'XYZ';
      const shortName = 'name';
      component.initiative = {
        result_toc_results: []
      };
      const result = component.getDescription(officialCode, shortName);

      expect(result).toBe(`<strong>${officialCode} ${shortName}</strong> - Pending confirmation`);
    });

    it('should return correct description for non-IPSR when initiative.result_toc_results is empty and isIpsr is true', () => {
      component.isIpsr = true;
      const officialCode = 'XYZ';
      const shortName = 'name';
      component.initiative = {
        result_toc_results: []
      };
      const result = component.getDescription(officialCode, shortName);

      expect(result).toBe(`<strong>${officialCode} ${shortName}</strong> - Pending confirmation`);
    });
  });

  describe('headerDescription()', () => {
    it('should return correct header description', () => {
      const init = 'initiative';

      const result = component.headerDescription(init);

      expect(result).toContain(`At least 1 TOC result of ${init} should be provided.`);
      expect(result).toContain('In most cases a result should be mapped to a single WP for simplicity.');
      expect(result).toContain('In some cases, however, it may be necessary to map a result to two WPs.');
    });
  });

  describe('clearTocResultId()', () => {
    it('should clear toc result id and update initiative properties', () => {
      component.initiative = {
        planned_result: true,
        result_toc_results: [
          {
            toc_level_id: 1,
            planned_result: false,
            toc_result_id: 1
          }
        ],
        showMultipleWPsContent: true
      };
      component.resultLevelId = 1;

      component.clearTocResultId();
      jest.runAllTimers();

      expect(component.initiative.showMultipleWPsContent).toBeTruthy();
      expect(component.initiative.result_toc_results[0]).toEqual({
        planned_result: true,
        toc_level_id: 1,
        toc_result_id: null
      });
    });
    it('should clear toc result id and update initiative properties when initiative.planned_result is true and resultLevelId is not 1 ', () => {
      component.initiative = {
        planned_result: true,
        result_toc_results: [
          {
            toc_level_id: 1,
            planned_result: false,
            toc_result_id: 1
          }
        ],
        showMultipleWPsContent: true
      };
      component.resultLevelId = 2;

      component.clearTocResultId();
      jest.runAllTimers();

      expect(component.initiative.showMultipleWPsContent).toBeTruthy();
      expect(component.initiative.result_toc_results[0]).toEqual({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: null
      });
    });
    it('should clear toc result id and update initiative properties when initiative.planned_result is false', () => {
      component.initiative = {
        planned_result: false,
        result_toc_results: [
          {
            toc_level_id: 1,
            planned_result: false,
            toc_result_id: 1
          }
        ],
        showMultipleWPsContent: true
      };
      component.resultLevelId = 1;

      component.clearTocResultId();
      jest.runAllTimers();

      expect(component.initiative.showMultipleWPsContent).toBeTruthy();
      expect(component.initiative.result_toc_results[0]).toEqual({
        planned_result: false,
        toc_level_id: 3,
        toc_result_id: null
      });
    });
  });

  describe('get_versionDashboard()', () => {
    it('should set fullInitiativeToc on successful get_vesrsionDashboard call', () => {
      component.isNotifications = false;
      component.initiative = {
        result_toc_results: [
          {
            initiative_id: 123
          }
        ]
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard');

      component.get_versionDashboard();

      expect(spy).toHaveBeenCalledWith(123, false);
      expect(component.fullInitiativeToc).toBe(mockResponse.version_id);
    });
    it('should do nothing if isNotifications is true', () => {
      component.isNotifications = true;
      component.initiative = {
        result_toc_results: [
          {
            initiative_id: 123
          }
        ]
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard');

      component.get_versionDashboard();

      expect(spy).not.toHaveBeenCalled();
    });
    it('should do nothing if initiative_id is not present', () => {
      component.isNotifications = false;
      component.initiative = {
        result_toc_results: [{}]
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard');

      component.get_versionDashboard();

      expect(spy).not.toHaveBeenCalled();
    });
    it('should handle error when get_vesrsionDashboard call fails', () => {
      const errorMessage = 'Your error message';
      component.isNotifications = false;
      component.initiative = {
        result_toc_results: [
          {
            initiative_id: 123
          }
        ]
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard').mockReturnValue(throwError(errorMessage));
      const spyConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      component.get_versionDashboard();

      expect(spy).toHaveBeenCalledWith(123, false);
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
    });
  });
});

// P2-3320: `clearTocResultId()` hides the mapping (`showMultipleWPsContent = false`) and brings it
// back inside a `setTimeout`. That flag lives on the external `initiative` object, so — unlike
// P2-3245 / P2-3275, where it was a component field that could be turned into a signal — nothing in
// this component can track it: under zoneless change detection the second write never scheduled a
// render pass and the ToC mapping stayed hidden after changing the "planned result" answer.
// These tests drive the real DOM (click on the yes/no field) and assert on the rendered output, so
// they fail if the re-render notification is removed.
describe('TocInitiativeOutComponent — zoneless re-render after changing the planned result answer', () => {
  let zFixture: ComponentFixture<TocInitiativeOutComponent>;
  let zComponent: TocInitiativeOutComponent;

  const contentEl = () => zFixture.nativeElement.querySelector('[data-testid="wps-content"]');
  const pickNo = () => zFixture.nativeElement.querySelector('[data-testid="pick-no"]') as HTMLButtonElement;
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeEach(async () => {
    jest.useRealTimers();
    TestBed.resetTestingModule();

    const apiMock = {
      resultsSE: { get_vesrsionDashboard: () => of({ response: { version_id: '123' } }) },
      dataControlSE: { tocUrl: 'https://toc.example/' },
      rolesSE: { platformIsClosed: false, isAdmin: true, validateInitiative: () => true }
    };

    await TestBed.configureTestingModule({
      declarations: [TocInitiativeOutComponent, StubPrYesOrNotComponent, StubMultipleWPsComponent, FeedbackValidationDirective],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: FieldsManagerService, useValue: { isP25: () => false, fields: () => ({}) } },
        { provide: RdTheoryOfChangesServicesService, useValue: {} }
      ]
    }).compileComponents();

    zFixture = TestBed.createComponent(TocInitiativeOutComponent);
    zComponent = zFixture.componentInstance;
    zComponent.editable = true;
    zComponent.resultLevelId = 1;
    zComponent.initiative = {
      initiative_id: 1,
      official_code: 'INIT-01',
      short_name: 'INIT',
      planned_result: true,
      showMultipleWPsContent: true,
      result_toc_results: [{ toc_level_id: 1, planned_result: true, toc_result_id: 5, initiative_id: 1 }]
    };

    zFixture.detectChanges();
    await zFixture.whenStable();
  });

  afterEach(() => {
    jest.useFakeTimers();
  });

  it('renders the mapping content once the component is set up', () => {
    expect(contentEl()).toBeTruthy();
  });

  it('renders the mapping content again after the answer changes', async () => {
    pickNo().click();
    await zFixture.whenStable();

    // The hide half already worked before the fix — the listener itself schedules a pass.
    expect(contentEl()).toBeFalsy();

    await wait(100);
    await zFixture.whenStable();

    expect(zComponent.initiative.showMultipleWPsContent).toBe(true);
    // The regression: the flag flipped back but the view stayed frozen on the hidden state.
    expect(contentEl()).toBeTruthy();
  });
});
