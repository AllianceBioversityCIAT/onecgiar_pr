import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubGeoscopeComponent } from './sub-geoscope.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';

describe('SubGeoscopeComponent', () => {
  let component: SubGeoscopeComponent;
  let fixture: ComponentFixture<SubGeoscopeComponent>;
  let mockResultsApiService: any;

  beforeEach(async () => {
    mockResultsApiService = {
      GET_subNationalByIsoAlpha2: () => of({ response: [] }),
    };

    await TestBed.configureTestingModule({
      declarations: [SubGeoscopeComponent],
      imports: [
        HttpClientTestingModule
      ],
      providers: [
        {
          provide: ResultsApiService,
          useValue: mockResultsApiService
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SubGeoscopeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('deleteSubNational()', () => {
    it('should delete subNational', () => {
      const index = 0;
      component.obj_country.sub_national = [{ name: 'SubNational' }];

      component.deleteSubNational(index);

      expect(component.obj_country.sub_national).toEqual([]);
    });
  });

  describe('deleteCountry()', () => {
    it('should delete country', () => {
      const index = 0;
      component.obj_countrySelected = [{ name: 'Country' }];

      component.deleteCountry(index);

      expect(component.obj_countrySelected).toEqual([]);
    });
  });

  describe('ngOnInit()', () => {
    it('should initialize sub_national property', () => {
      component.obj_country = { iso_alpha_2: 'US', sub_national: null };

      component.ngOnInit();

      expect(component.obj_country['sub_national']).toEqual([]);
    });
    it('should call getSubNational and map sub_national', () => {
      component.obj_country = {
        iso_alpha_2: 'US',
        sub_national: [
          {
            code: '1',
            other_names: [
              { name: 'Other' }, { name: 'Other2' }
            ]
          }
        ]
      };

      const subNationalList = [{ code: '1', formatedName: 'SubNational1', other_names: [{ name: 'Other' }, { name: 'Other2' }]  }];
      jest.spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2').mockReturnValue(of({ response: subNationalList }));

      component.ngOnInit();

      expect(mockResultsApiService.GET_subNationalByIsoAlpha2).toHaveBeenCalled();
      expect(component.obj_country.sub_national).toEqual([{ 
        code: '1', 
        formatedName: "<strong>No name available</strong> - <span class=\"select_item_description\">Other, Other2</span>",
        other_names: [{"name": "Other"}, {"name": "Other2"}]
      }]);
    });
  });
});
