import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN1SdgTargetsComponent } from './step-n1-sdg-targets.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';

describe('StepN1SdgTargetsComponent', () => {
  let component: StepN1SdgTargetsComponent;
  let fixture: ComponentFixture<StepN1SdgTargetsComponent>;
  let apiService: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1SdgTargetsComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1SdgTargetsComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call GETAllClarisaSdgsTargets method and set sdgTargetLis', () => {
    const mockResponse = { response: [{ sdg: { usnd_code: 'sdg1', short_name: 'SDG 1' }, sdgList: [{ sdg_target_code: 'target1', sdg_target: 'Target 1' }] }] };
    const spy = jest.spyOn(apiService.resultsSE, 'GETAllClarisaSdgsTargets').mockReturnValue(of(mockResponse));

    component.GETAllClarisaSdgsTargets();

    expect(spy).toHaveBeenCalled();
    expect(component.sdgTargetLis).toEqual(mockResponse.response);
    expect(component.sdgTargetLis[0].sdgId).toEqual('sdg1');
    expect(component.sdgTargetLis[0].short_name).toEqual('SDG 1');
    expect(component.sdgTargetLis[0].sdgList[0].full_name).toEqual('<strong>target1</strong> - Target 1');
  });

  it('should console error when GETAllClarisaSdgsTargets method fails', () => {
    const errorResponse = 'Test error';
    jest.spyOn(apiService.resultsSE, 'GETAllClarisaSdgsTargets').mockReturnValue(throwError(() => errorResponse));

    const consoleSpy = jest.spyOn(console, 'error');

    component.GETAllClarisaSdgsTargets();

    expect(consoleSpy).toHaveBeenCalledWith(errorResponse);
  });

  it('should remove option from body.sdgTargets', () => {
    component.body.sdgTargets = [{ id: 1 }, { id: 2 }, { id: 3 }] as any;

    component.removeOption({ id: 2 });

    expect(component.body.sdgTargets).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('should set selected SDG and currentsdgID', () => {
    component.sdgTargetLis = [{ sdgId: 'sdg1', selected: false }];
    const option = { sdgId: 'sdg2', selected: false };

    component.onSelectSDG(option);

    expect(component.sdgTargetLis[0].selected).toBeFalsy();
    expect(option.selected).toBeTruthy();
    expect(component.currentsdgID).toEqual('sdg2');
  });
});
