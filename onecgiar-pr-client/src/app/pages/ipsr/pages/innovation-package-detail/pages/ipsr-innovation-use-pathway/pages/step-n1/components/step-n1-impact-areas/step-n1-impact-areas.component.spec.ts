import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN1ImpactAreasComponent } from './step-n1-impact-areas.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of } from 'rxjs';

describe('StepN1ImpactAreasComponent', () => {
  let component: StepN1ImpactAreasComponent;
  let fixture: ComponentFixture<StepN1ImpactAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1ImpactAreasComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1ImpactAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize impactAreasData', () => {
    expect(component.impactAreasData).toEqual([
      { id: 1, imageRoute: '1', selected: false, color: '#ec7427', name: 'Nutrition, Health and Food Security' },
      { id: 2, imageRoute: '2', selected: false, color: '#1275ba', name: 'Poverty Reduction, Livelihoods and Jobs' },
      { id: 3, imageRoute: '3', selected: false, color: '#fdca3d', name: 'Gender Equality, Youth and Social Inclusion' },
      { id: 4, imageRoute: '4', selected: false, color: '#377431', name: 'Climate Adaptation and Mitigation' },
      { id: 5, imageRoute: '5', selected: false, color: '#8ebf3e', name: 'Environmental Health and Biodiversity' }
    ]);
  });

  it('should call GET_AllClarisaImpactAreaIndicators on ngOnInit', () => {
    jest.spyOn(component, 'GET_AllClarisaImpactAreaIndicators');
    component.ngOnInit();
    expect(component.GET_AllClarisaImpactAreaIndicators).toHaveBeenCalled();
  });

  it('should set allImpactAreaIndicators on GET_AllClarisaImpactAreaIndicators', () => {
    const mockResponse = { response: [{ name: 'Indicator 1', target: 'Target 1' }] };
    jest.spyOn(component.api.resultsSE, 'GET_AllglobalTarget').mockReturnValue(of(mockResponse));
    component.GET_AllClarisaImpactAreaIndicators();
    expect(component.allImpactAreaIndicators).toEqual([{ name: 'Indicator 1', target: 'Target 1', full_name: '<strong>Indicator 1</strong> - Target 1' }]);
  });

  it('should filter impactAreaIndicators by impactAreaID', () => {
    component.allImpactAreaIndicators = [
      { impactAreaId: 1, name: 'Indicator 1' },
      { impactAreaId: 2, name: 'Indicator 2' },
      { impactAreaId: 1, name: 'Indicator 3' }
    ];
    const filteredIndicators = component.filterImpactAreaIndicatorsByImpactAreaID(1);
    expect(filteredIndicators).toEqual([
      { impactAreaId: 1, name: 'Indicator 1' },
      { impactAreaId: 1, name: 'Indicator 3' }
    ]);
  });

  it('should remove option from impactAreas', () => {
    component.body.impactAreas = [
      { targetId: 1, name: 'Option 1' },
      { targetId: 2, name: 'Option 2' },
      { targetId: 3, name: 'Option 3' }
    ] as any;
    component.removeOption({ targetId: 2, name: 'Option 2' });
    expect(component.body.impactAreas).toEqual([
      { targetId: 1, name: 'Option 1' },
      { targetId: 3, name: 'Option 3' }
    ]);
  });

  it('should select impactArea', () => {
    component.api.rolesSE.readOnly = false;
    const impactAreaItem = { id: 1, selected: false };
    component.selectImpactArea(impactAreaItem);
    expect(component.impactAreasData[0].selected).toBe(false);
    expect(component.currentImpactAreaID).toBe(1);
  });
});
