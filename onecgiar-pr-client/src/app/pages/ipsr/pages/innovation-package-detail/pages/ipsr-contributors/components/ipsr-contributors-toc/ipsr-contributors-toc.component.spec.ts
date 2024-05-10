import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrContributorsTocComponent } from './ipsr-contributors-toc.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

describe('IpsrContributorsTocComponent', () => {
  let component: IpsrContributorsTocComponent;
  let fixture: ComponentFixture<IpsrContributorsTocComponent>;
  let mockApiService: any;
  const mockResponse = [{ id: 1, name: 'Initiative 1' }]

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_AllWithoutResults: () => of({ response: mockResponse }),
      },
    };

    await TestBed.configureTestingModule({
      declarations: [
        IpsrContributorsTocComponent,
        PrFieldHeaderComponent,
        PrMultiSelectComponent
       ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService,
        },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsTocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit', () => {
    it('should call GET_AllWithoutResults on ngOnInit', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllWithoutResults');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_AllWithoutResults', () => {
    it('should call GET_AllWithoutResults on ngOnInit', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllWithoutResults');

      component.GET_AllWithoutResults();

      expect(spy).toHaveBeenCalled();
      expect(component.contributingInitiativesList).toEqual(mockResponse)
    });
  });

  describe('getcontributingInitiativesList', () => {
    it('getcontributingInitiativesList should filter out the current initiative', () => {
      component.contributorsBody.result_toc_result = {
        initiative_id: 1,
        planned_result: false,
        official_code: 'code',
        short_name: 'name',
        result_toc_results: []
      };
      component.contributingInitiativesList = mockResponse;

      const result = component.getcontributingInitiativesList;

      expect(result).toEqual([]);
    });
  });

  describe('toggleActiveContributor', () => {
    it('toggleActiveContributor should toggle is_active property', () => {
      const item = { is_active: false };

      component.toggleActiveContributor(item);

      expect(item.is_active).toBeTruthy();

      component.toggleActiveContributor(item);

      expect(item.is_active).toBeFalsy();
    });
  })
});
