import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterNotificationByPhasePipe } from './pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from './pipes/filter-notification-by-initiative.pipe';
import { PrSelectComponent } from '../../../../../../custom-fields/pr-select/pr-select.component';
import { NoDataTextComponent } from '../../../../../../custom-fields/no-data-text/no-data-text.component';
import { LabelNamePipe } from '../../../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../shared/enum/api.enum';

describe('ResultsNotificationsComponent', () => {
  let component: ResultsNotificationsComponent;
  let fixture: ComponentFixture<ResultsNotificationsComponent>;
  let mockApiService: any;
  let mockShareRequestModalService: any;
  const mockGET_versioningResponse = [
    {
      id: 1,
      status: {}
    }
  ]

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_AllInitiatives: () => of({ response: [] }),
        GET_versioning: () => of({ response: mockGET_versioningResponse }),
        GET_allRequest: () => of({ response: [] }),
        GET_requestStatus: () => of({ response: [] }),
      },
      rolesSE: {
        isAdmin: true
      },
      updateUserData: jest.fn()
    };

    mockShareRequestModalService = {
      inNotifications: false
    };

    await TestBed.configureTestingModule({
      declarations: [
        ResultsNotificationsComponent,
        FilterNotificationByPhasePipe,
        FilterNotificationByInitiativePipe,
        PrSelectComponent,
        NoDataTextComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ScrollingModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: ShareRequestModalService,
          useValue: mockShareRequestModalService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('should call getAllPhases and GET_AllInitiatives, and updateUserData on ngOnInit ', () => {
      const spyGetAllPhases = jest.spyOn(component, 'getAllPhases');
      const spyGET_AllInitiatives = jest.spyOn(component, 'GET_AllInitiatives');
      const spyUpdateUserData = jest.spyOn(mockApiService, 'updateUserData');
      mockApiService.updateUserData.mockImplementationOnce(callback => callback());

      component.ngOnInit();

      expect(spyGetAllPhases).toHaveBeenCalled();
      expect(spyGET_AllInitiatives).toHaveBeenCalled();
      expect(spyUpdateUserData).toHaveBeenCalled();
      expect(mockShareRequestModalService.inNotifications).toBeTruthy();
    });
  });

  describe('GET_AllInitiatives()', () => {
    it('should update allInitiatives', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spy).toHaveBeenCalled();
      expect(component.allInitiatives).toEqual([]);
    });
    it('should not call GET_AllInitiatives API', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getAllPhases()', () => {
    it('should update phaseList and phaseFilter', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_versioning');

      component.getAllPhases();

      expect(spy).toHaveBeenCalledWith(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING);
      expect(component.phaseList).toEqual([
        {
          disabled: false,
          id: 1,
          selected: false,
          status: {},
        },
      ]);
      expect(component.phaseFilter).toEqual(1)
    });
  });
});
