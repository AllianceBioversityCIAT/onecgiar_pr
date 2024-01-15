import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImpactAreaTargetsComponent } from './impact-area-targets.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

describe('ImpactAreaTargetsComponent', () => {
  let component: ImpactAreaTargetsComponent;
  let fixture: ComponentFixture<ImpactAreaTargetsComponent>;
  let mockApiService: any;
  let mockResponse = [
    {
      name: 'name',
      target: 'target'
    }
  ];

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        GET_AllglobalTarget: () => of({ response: mockResponse }),
      },
      rolesSE: {
        readOnly: false
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        ImpactAreaTargetsComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ImpactAreaTargetsComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call GET_AllClarisaImpactAreaIndicators()on initialization', () => {
      const spy = jest.spyOn(component, 'GET_AllClarisaImpactAreaIndicators');

      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_AllClarisaImpactAreaIndicators()', () => {
    it('should set allImpactAreaIndicators on successful GET_AllglobalTarget response', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllglobalTarget');

      component.GET_AllClarisaImpactAreaIndicators();

      expect(spy).toHaveBeenCalled();
      expect(component.allImpactAreaIndicators).toEqual(mockResponse)
      expect(component.allImpactAreaIndicators[0].full_name).toBe('<strong>name</strong> - target');
    });
  });

  describe('filterImpactAreaIndicatorsByImpactAreaID()', () => {
    it('should filter impact area indicators correctly', () => {
      const mockAllImpactAreaIndicators = [
        { targetId: 1, impactAreaId: 1, name: 'Indicator 1' },
        { targetId: 2, impactAreaId: 1, name: 'Indicator 2' },
        { targetId: 3, impactAreaId: 2, name: 'Indicator 3' },
        { targetId: 4, impactAreaId: 2, name: 'Indicator 4' },
      ];
  
      component.allImpactAreaIndicators = mockAllImpactAreaIndicators;
  
      const filter = component.filterImpactAreaIndicatorsByImpactAreaID(1);
  
      expect(filter.length).toBe(2);
      expect(filter).toEqual([
        { targetId: 1, impactAreaId: 1, name: 'Indicator 1' },
        { targetId: 2, impactAreaId: 1, name: 'Indicator 2' },
      ])
    });
  });

  describe('removeOption()', () => {
    it('should remove option from body', () => {
      const optionToRemove = { targetId: 1 };
      component.body = [
        { targetId: 1 },
        { targetId: 2 },
        { targetId: 3 },
      ];
  
      component.removeOption(optionToRemove);
  
      expect(component.body.length).toBe(2);
      expect(component.body).toEqual([
        { targetId: 2 },
        { targetId: 3 },
      ])
    });
  });

  describe('selectImpactArea()', () => {
    it('should select impact area', () => {
      let impactAreaItem = { id: 1, selected: undefined };
      component.impactAreasData = [
        { 
          id: 1, 
          selected: true ,
          imageRoute: '',
           color: '',
           name: ''
        },
      ];
  
      component.selectImpactArea(impactAreaItem);
  
      expect(impactAreaItem.selected).toBeTruthy();
      expect(component.impactAreasData[0].selected).toBeFalsy();
    });

    it('should not select impact area if rolesSE.readOnly is true', () => {
      mockApiService.rolesSE.readOnly = true;
      let impactAreaItem = { id: 1, selected: undefined };

      component.selectImpactArea(impactAreaItem);
  
      expect(impactAreaItem.selected).toBeFalsy();
      expect(component.currentImpactAreaID).toBeNull();
    });
  });
});
