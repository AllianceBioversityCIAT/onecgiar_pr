import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RetrieveModalComponent } from './retrieve-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../../../../../custom-fields/pr-select/pr-select.component';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { LabelNamePipe } from '../../../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TooltipModule } from 'primeng/tooltip';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RouterTestingModule } from '@angular/router/testing';
import { RetrieveModalService } from './retrieve-modal.service';
import { Router } from '@angular/router';

jest.useFakeTimers();
describe('RetrieveModalComponent', () => {
  let component: RetrieveModalComponent;
  let fixture: ComponentFixture<RetrieveModalComponent>;
  let mockApiService: any;
  let mockResultLevelService: any;
  let mockRetrieveModalService: any;
  let router: Router;

  const mockPOST_updateRequestResponse = {
    newResultHeader: {
      result_code: '123'
    } };
  const mockGET_AllInitiativesResponse = [{
    initiative_id: 1,
    full_name: 'name'
  }]

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_AllInitiatives: () => of({ response: mockGET_AllInitiativesResponse }),
        GET_TypeByResultLevel: () => of({ response: [] }),
        POST_updateRequest: () => of({ response: mockPOST_updateRequestResponse }),
      },
      dataControlSE: {
        showRetrieveRequest: false
      },
      alertsFe: {
        show: jest.fn()
      }
    }
    mockResultLevelService = {
      resultBody: {
        result_level_id: 'result_level_id',
        result_type_id: 'result_type_id'
      }
    };
    mockRetrieveModalService = {
      retrieveRequestBody: {
        result_level_id: 'result_level_id',
        result_type_id: 'result_type_id'
      }
    }
    await TestBed.configureTestingModule({
      declarations: [
        RetrieveModalComponent,
        PrSelectComponent,
        PrButtonComponent,
        PrFieldHeaderComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        DialogModule,
        ScrollingModule,
        TooltipModule,
        RouterTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: ResultLevelService,
          useValue: mockResultLevelService
        },
        {
          provide: RetrieveModalService,
          useValue: mockRetrieveModalService
        },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RetrieveModalComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

  });

  describe('ngOnInit', () => {
    it('should call GET_AllInitiatives', () => {
      const spy = jest.spyOn(component, 'GET_AllInitiatives');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should update allInitiatives on successful GET_AllInitiatives call', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(component.allInitiatives).toEqual(mockGET_AllInitiativesResponse);
    });
  });

  describe('cleanObject', () => {
    it('should set showForm to false and then true after a timeout', () => {
      component.cleanObject();
      expect(component.showForm).toBeFalsy();

      jest.runAllTimers();

      expect(component.showForm).toBeTruthy();

    });
  });

  describe('onRequestRetrieve', () => {
    it('should set requesting to true and make POST_updateRequest call on success', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_updateRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onRequestRetrieve();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalledWith(mockRetrieveModalService.retrieveRequestBody);
      expect(spyShow).toHaveBeenCalledWith({
        id: 'partners',
        title: 'The Legacy Result was retrieved successfully!',
        description: 'The selected result is already list in the reported results.',
        status: 'success',
      });
      expect(component.requesting).toBeFalsy();
      expect(mockApiService.dataControlSE.showRetrieveRequest).toBeFalsy();
      expect(navigateSpy).toHaveBeenCalledWith(['/result/result-detail/123/general-information']);
    });

    it('should handle error on POST_updateRequest call', async () => {
      const errorMessage = {
        error:{
          message: 'error message'
        }
        };
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_updateRequest')
        .mockReturnValue(throwError(errorMessage));

      component.onRequestRetrieve();

      expect(spy).toHaveBeenCalledWith(mockRetrieveModalService.retrieveRequestBody);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'partners-error',
        title: 'error message',
        description: '',
        status: 'error',
      });
      expect(component.requesting).toBeFalsy();
    });
    it('should handle error on POST_updateRequest call and the response does not have error.message', async () => {
      const errorMessage = {error:{}};
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_updateRequest')
        .mockReturnValue(throwError(errorMessage));

      component.onRequestRetrieve();
      expect(spy).toHaveBeenCalledWith(mockRetrieveModalService.retrieveRequestBody);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'partners-error',
        title: 'Error',
        description: '',
        status: 'error',
      });
      expect(component.requesting).toBeFalsy();
    });
  });
});

