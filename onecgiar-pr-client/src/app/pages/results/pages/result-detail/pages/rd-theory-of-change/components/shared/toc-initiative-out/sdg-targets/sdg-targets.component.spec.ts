import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SdgTargetsComponent } from './sdg-targets.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

describe('SdgTargetsComponent', () => {
  let component: SdgTargetsComponent;
  let fixture: ComponentFixture<SdgTargetsComponent>;
  let mockApiService: any;
  const mockResponse = [
    {
      sdg: {
        usnd_code: 1,
        short_name: 'name'
      },
      sdgList: [
        {
          sdg_target_code: 'code',
          sdg_target: 'Target'
        },
      ]
    }
  ]


  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        GETAllClarisaSdgsTargets: () => of({ response: mockResponse }),
      },
    }

    await TestBed.configureTestingModule({
      declarations: [
        SdgTargetsComponent,
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

    fixture = TestBed.createComponent(SdgTargetsComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call GETAllClarisaSdgsTargets()on initialization', () => {
      const spy = jest.spyOn(component, 'GETAllClarisaSdgsTargets');

      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('dropDownPlaceHolder()', () => {
    it('should return correct placeholder for SDG targets dropdown', () => {
      const name = 'SDG';

      const result = component.dropDownPlaceHolder(name);

      expect(result).toBe('Select SDG target(s)');
    });
  });

  describe('GETAllClarisaSdgsTargets()', () => {
    it('should set sdgTargetLis with transformed response on successful API call', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETAllClarisaSdgsTargets')

      component.GETAllClarisaSdgsTargets();

      expect(spy).toHaveBeenCalled();
      expect(component.sdgTargetLis).toEqual(mockResponse);
      expect(component.sdgTargetLis[0].sdgList).toEqual([
        {
          full_name: "<strong>code</strong> - Target",
          sdg_target: "Target", "sdg_target_code": "code"
        }
      ]);
    });
    it('should handle error when GETAllClarisaSdgsTargets call fails', () => {
      const errorMessage = 'Your error message';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETAllClarisaSdgsTargets')
        .mockReturnValue(throwError(errorMessage));;
      const spyConsoleError = jest.spyOn(console, 'error');

      component.GETAllClarisaSdgsTargets();

      expect(spy).toHaveBeenCalled();
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('removeOption()', () => {
    it('should set body correctly in removeOption', () => {
      component.body = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const option = { id: 2 };

      component.removeOption(option);

      expect(component.body).toEqual([{ id: 1 }, { id: 3 }]);
    });
  });

  describe('onSelectSDG()', () => {
    it('should set selected SDG and currentsdgID in onSelectSDG', () => {
      const sdgItem = { sdgId: 1, selected: false };
      component.sdgTargetLis = [{ sdgId: 1, selected: false }, { sdgId: 2, selected: false }];

      component.onSelectSDG(sdgItem);

      expect(component.sdgTargetLis[0].selected).toBeFalsy();
      expect(component.sdgTargetLis[1].selected).toBeFalsy();
      expect(component.currentsdgID).toBe(1);
    });
  });
});
