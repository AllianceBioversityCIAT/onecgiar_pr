import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubGeoscopeComponent } from './sub-geoscope.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
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
      const emitSpy = jest.spyOn(component.changed, 'emit');

      component.deleteSubNational(index);

      expect(component.obj_country.sub_national).toEqual([]);
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('deleteCountry()', () => {
    it('should delete country', () => {
      const index = 0;
      component.obj_countrySelected = [{ name: 'Country' }];
      const emitSpy = jest.spyOn(component.changed, 'emit');

      component.deleteCountry(index);

      expect(component.obj_countrySelected).toEqual([]);
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  it('should emit when sub-national selections change', () => {
    const emitSpy = jest.spyOn(component.changed, 'emit');

    component.onSubNationalChange();

    expect(emitSpy).toHaveBeenCalled();
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

  /**
   * P2-3647 — toggling the scope Sub-national -> Country -> Sub-national made the chosen level
   * vanish and the screen claim the country had no sub-national levels, which is false.
   *
   * The toggle DESTROYS this component (`geoscope-management.component.html:78` renders it under
   * `*ngIf="body.geo_scope_id == 5"`) and builds a fresh one, so `subNationList` is empty again on
   * every round trip. The template used to read that single empty array as the answer to three
   * different questions: "still loading", "the request failed" and "this country genuinely has
   * none".
   */
  describe('an empty catalogue is not a statement about the country (P2-3647)', () => {
    it('does not claim anything while the catalogue is still in flight', () => {
      // A subscribe that never emits: the request is open, nothing is known yet.
      jest.spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2').mockReturnValue(new Subject());
      component.obj_country = { iso_alpha_2: 'AF', name: 'Afghanistan', sub_national: [] };

      component.ngOnInit();

      expect(component.subNationalStatus).toBe('loading');
    });

    it('says the request failed instead of blaming the country', () => {
      jest.spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2').mockReturnValue(throwError(() => new Error('503')));
      component.obj_country = { iso_alpha_2: 'AF', name: 'Afghanistan', sub_national: [] };

      component.ngOnInit();

      expect(component.subNationalStatus).toBe('failed');
      expect(component.subNationList).toEqual([]);
    });

    it('only states the country has no levels once the catalogue actually arrived', () => {
      jest.spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2').mockReturnValue(of({ response: [] }));
      component.obj_country = { iso_alpha_2: 'VA', name: 'Holy See', sub_national: [] };

      component.ngOnInit();

      expect(component.subNationalStatus).toBe('loaded');
    });

    it('does not ask the catalogue for a country with no ISO code', () => {
      const spy = jest.spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2');
      component.obj_country = { name: 'Nowhere', sub_national: [] };

      component.ngOnInit();

      expect(spy).not.toHaveBeenCalled();
      expect(component.subNationalStatus).toBe('failed');
    });

    it('keeps the label of an already chosen level when the catalogue comes back empty', () => {
      // This is the "it disappeared" half: the chip is painted through [innerHtml]="sub?.formatedName",
      // so overwriting the label with undefined rendered an empty box for a row still in the model.
      jest.spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2').mockReturnValue(of({ response: [] }));
      component.obj_country = {
        iso_alpha_2: 'AF',
        name: 'Afghanistan',
        sub_national: [{ code: 'AF-BDS', formatedName: '<strong>Badakhshān</strong>' }]
      };

      component.ngOnInit();

      expect(component.obj_country.sub_national[0].formatedName).toBe('<strong>Badakhshān</strong>');
    });

    it('still upgrades the label when the catalogue does know the level', () => {
      jest
        .spyOn(mockResultsApiService, 'GET_subNationalByIsoAlpha2')
        .mockReturnValue(of({ response: [{ code: 'AF-BDS', name: 'Badakhshan' }] }));
      component.obj_country = {
        iso_alpha_2: 'AF',
        name: 'Afghanistan',
        sub_national: [{ code: 'AF-BDS', formatedName: 'stale' }]
      };

      component.ngOnInit();

      expect(component.obj_country.sub_national[0].formatedName).toBe('<strong>Badakhshan</strong>');
    });
  });
});
