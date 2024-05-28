import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TocInitiativeOutComponent } from './toc-initiative-out.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { PrYesOrNotComponent } from '../../../../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

jest.useFakeTimers();

describe('TocInitiativeOutComponent', () => {
  let component: TocInitiativeOutComponent;
  let fixture: ComponentFixture<TocInitiativeOutComponent>;
  let mockApiService: any;
  const mockResponse = {
    version_id: '123'
  }

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        get_vesrsionDashboard: () => of({ response: mockResponse }),
      },
    }

    await TestBed.configureTestingModule({
      declarations: [
        TocInitiativeOutComponent,
        YesOrNotByBooleanPipe,
        PrYesOrNotComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    })
    .compileComponents();

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

      const result = component.getDescription(officialCode, shortName);

      expect(result).toBe(`Is this result planned in the <strong>${officialCode} ${shortName}</strong> ToC?`);
    });
    it('should return correct description for non-IPSR', () => {
      component.isIpsr = false;
      const officialCode = 'XYZ';
      const shortName = 'name';

      const result = component.getDescription(officialCode, shortName);

      expect(result).toBe(`<strong>${officialCode} ${shortName}</strong> - Does this result match a planned result in your Theory of Change?`);
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
      expect(component.initiative.result_toc_results[0]).toEqual(
        {
          planned_result: true,
          toc_level_id: 1,
          toc_result_id: null
        }
      )
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
      expect(component.initiative.result_toc_results[0]).toEqual(
        {
          planned_result: true,
          toc_level_id: 2,
          toc_result_id: null
        }
      )
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
      expect(component.initiative.result_toc_results[0]).toEqual(
        {
          planned_result: false,
          toc_level_id: 3,
          toc_result_id: null
        }
      )
    });
  });

  describe('get_versionDashboard()', () => {
    it('should set fullInitiativeToc on successful get_vesrsionDashboard call', () => {
      component.isNotifications = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard');

      component.get_versionDashboard();

      expect(spy).toHaveBeenCalledWith(
        component.initiative?.result_toc_results[0]?.toc_result_id,
        component.initiative?.result_toc_results[0]?.initiative_id
      );
      expect(component.fullInitiativeToc).toBe(mockResponse.version_id);
    });
    it('should do nothing if isNotifications is true', () => {
      component.isNotifications = true;
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard');

      component.get_versionDashboard();

      expect(spy).not.toHaveBeenCalled();
    });
    it('should handle error when get_vesrsionDashboard call fails', () => {
      const errorMessage = 'Your error message';
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard')
        .mockReturnValue(throwError(errorMessage));;
      const spyConsoleError = jest.spyOn(console, 'error');

      component.get_versionDashboard();

      expect(spy).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
    });
  });
});
