import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SubGeoscopeComponent } from './sub-geoscope.component';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

jest.useFakeTimers();

describe('SubGeoscopeComponent', () => {
  let component: SubGeoscopeComponent;
  let fixture: ComponentFixture<SubGeoscopeComponent>;
  let mockApiService: any;
  let mockResponse = [
    {
      geonameId: 1,
      name: 'name'
    }
  ];

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        getSubNationalLevelOne: () => of({ response: mockResponse }),
        getSubNationalLevelTwo: () => of({ response: mockResponse }),
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        SubGeoscopeComponent,
        PrSelectComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        ScrollingModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubGeoscopeComponent);
    component = fixture.componentInstance;
    component.countrySelected = 1;
    component.body.countries = [{
      id: 1,
      name: 'Colombia'
    }];
    component.subNationalOne = [
      {
        geonameId: 1,
        name: 'name'
      }
    ];
    component.body.geoScopeSubNatinals = [{}];
    fixture.detectChanges();
  });

  describe('getSubNationalLevelOne', () => {
    it('should set properties and call API correctly when subNationalOne has elements and body.geoScopeSubNatinals has elements', () => {
      component.getSubNationalLevelOne(0);
      jest.runAllTimers();

      expect(component.subNationalOne).toEqual(mockResponse);
      expect(component.exitsSubLevelOne).toBeTruthy();
      expect(component.exitsSubLevelTwo).toBeTruthy();
      expect(component.body.geoScopeSubNatinals.length).toBe(1);
      expect(component.body.geoScopeSubNatinals[0]).toEqual({ idCountry: 1, isRegister: 0 });
      expect(component.subNationalOneSelected).toBeNull();
      expect(component.showNationalLevelSelect).toBeTruthy();
      expect(component.showNationalLevelTwoSelect).toBeTruthy();
    });

    it('should set properties and call API correctly when subNationalOne is empty and body.geoScopeSubNatinals is empty', () => {
      mockResponse = []
      component.body.geoScopeSubNatinals = [];

      component.getSubNationalLevelOne(0);
      jest.runAllTimers();

      expect(component.subNationalOne).toEqual(mockResponse);
      expect(component.exitsSubLevelOne).toBeFalsy();
      expect(component.exitsSubLevelTwo).toBeFalsy();
      expect(component.nameCountry).toEqual('Colombia');
      expect(component.nameCountryTwo).toEqual('Colombia');
      expect(component.body.geoScopeSubNatinals.length).toBe(1);
      expect(component.body.geoScopeSubNatinals[0]).toEqual({ idCountry: 1, isRegister: 0 });
      expect(component.subNationalOneSelected).toBeNull();
      expect(component.showNationalLevelSelect).toBeTruthy();
      expect(component.showNationalLevelTwoSelect).toBeTruthy();
    });
  });

  describe('getSSubNationalLevelTwo', () => {
    it('should set properties and call getSubNationalLevelTwo API correctly when subNationalTwo has elements', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'getSubNationalLevelTwo');
      component.subNationalOneSelected = 1;

      component.getSSubNationalLevelTwo(0);
      jest.runAllTimers();

      expect(spy).toHaveBeenCalled();
      expect(component.subNationalTwo).toEqual(mockResponse);
      expect(component.exitsSubLevelTwo).toBeFalsy();
      expect(component.body.geoScopeSubNatinals.length).toBe(1);
      expect(component.body.geoScopeSubNatinals[0]).toEqual({
        idCountry: 1,
        sub_level_one_id: 1,
        sub_level_one_name: 'name',
        isRegister: 1
      });
      expect(component.subNationalTwoSelected).toBeNull();
      expect(component.showNationalLevelTwoSelect).toBeTruthy();
    });
    it('should set properties and call getSubNationalLevelTwo API correctly when subNationalTwo is empty', () => {
      mockResponse = [];
      const spy = jest.spyOn(mockApiService.resultsSE, 'getSubNationalLevelTwo');
      component.subNationalOneSelected = 1;

      component.getSSubNationalLevelTwo(0);
      jest.runAllTimers();

      expect(spy).toHaveBeenCalled();
      expect(component.exitsSubLevelTwo).toBeFalsy();
      expect(component.nameCountryTwo).toEqual('name');
      expect(component.subNationalTwo).toEqual(mockResponse);
      expect(component.body.geoScopeSubNatinals.length).toBe(1);
      expect(component.body.geoScopeSubNatinals[0]).toEqual({
        idCountry: 1,
        sub_level_one_id: 1,
        sub_level_one_name: 'name',
        isRegister: 1
      });
      expect(component.subNationalTwoSelected).toBeNull();
      expect(component.showNationalLevelTwoSelect).toBeTruthy();
    });
  });
  describe('delete', () => {
    it('should emit selectOptionEvent and remove item from geoScopeSubNatinals', () => {
      const emitSpy = jest.spyOn(component.selectOptionEvent, 'emit');
      component.body.geoScopeSubNatinals = [{}, {}];

      component.delete(1);
  
      expect(emitSpy).toHaveBeenCalledWith(1);
      expect(component.body.geoScopeSubNatinals.length).toBe(1);
      expect(component.body.geoScopeSubNatinals).toEqual([{}]);
    });
  });

  describe('selectSubLevelTwo', () => {
    it('should update geoScopeSubNatinals with sub_level_one and sub_level_two information', () => {
      component.subNationalOne = [
        { 
          geonameId: 1, 
          name: 'nameOne' 
        },
      ];
      component.subNationalTwo = [
        { 
          geonameId: 11, 
          name: 'nameTwo' 
        },
      ];
      component.subNationalOneSelected = 1;
      component.subNationalTwoSelected = 11;
  
      component.selectSubLevelTwo(0);

      expect(component.body.geoScopeSubNatinals[0]).toEqual({
        idCountry: 1,
        sub_level_one_id: 1,
        sub_level_one_name: 'nameOne',
        sub_level_two_id: 11,
        sub_level_two_name: 'nameTwo',
        isRegister: 2,
      });
    });
  });
});
