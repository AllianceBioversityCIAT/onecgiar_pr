import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN3AssessedExpertWorkshopComponent } from './step-n3-assessed-expert-workshop.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of } from 'rxjs';

describe('StepN3AssessedExpertWorkshopComponent', () => {
  let component: StepN3AssessedExpertWorkshopComponent;
  let fixture: ComponentFixture<StepN3AssessedExpertWorkshopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN3AssessedExpertWorkshopComponent, PrRadioButtonComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN3AssessedExpertWorkshopComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call ngOnInit', () => {
    const GETAllClarisaInnovationReadinessLevelsSpy = jest.spyOn(component, 'GETAllClarisaInnovationReadinessLevels');
    const GETAllClarisaInnovationUseLevelsSpy = jest.spyOn(component, 'GETAllClarisaInnovationUseLevels');
    const getAssessedDuringExpertWorkshopSpy = jest.spyOn(component.api.resultsSE, 'getAssessedDuringExpertWorkshop').mockReturnValue(of({ response: [] }));
    component.ngOnInit();
    expect(getAssessedDuringExpertWorkshopSpy).toHaveBeenCalled();
    expect(GETAllClarisaInnovationReadinessLevelsSpy).toHaveBeenCalled();
    expect(GETAllClarisaInnovationUseLevelsSpy).toHaveBeenCalled();
  });

  it('should return expected string on useLevelDelfAssessment', () => {
    const result = component.useLevelDelfAssessment();
    expect(result).toBe(`<a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels`);
  });

  it('should return expected string on goToStep', () => {
      component.ipsrDataControlSE = {
      resultInnovationCode: '123',
      resultInnovationPhase: '1'
    } as any;
    const result = component.goToStep();

    expect(result)
      .toBe(`<li>In case you want to add one more complementary innovation/enabler/solution <a class='open_route' href='/ipsr/detail/123/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${component.ipsrDataControlSE.resultInnovationPhase}' target='_blank'> Go to step 2</a>.</li>
    <li><a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view" class="open_route" target="_blank">Click here </a> to see the definition of all readiness levels.</li>
    <li><a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels.</li>
    <li><strong>YOUR READINESS AND USE SCORES IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a> AND <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>
    `);
  });

  it('should call GETAllClarisaInnovationReadinessLevels and map readinessList to update index to string', () => {
    const GETAllClarisaInnovationReadinessLevelsSpy = jest.spyOn(component.api.resultsSE, 'GETAllClarisaInnovationReadinessLevels').mockReturnValue(
      of({
        response: [
          {
            index: 0
          }
        ]
      })
    );
    component.GETAllClarisaInnovationReadinessLevels();
    expect(GETAllClarisaInnovationReadinessLevelsSpy).toHaveBeenCalled();
    expect(component.readinessList).toEqual([{ index: '0' }]);
  });

  it('should call GETAllClarisaInnovationUseLevels and map useList to update index to string', () => {
    const GETAllClarisaInnovationUseLevelsSpy = jest.spyOn(component.api.resultsSE, 'GETAllClarisaInnovationUseLevels').mockReturnValue(
      of({
        response: [
          {
            index: 0
          }
        ]
      })
    );
    component.GETAllClarisaInnovationUseLevels();
    expect(GETAllClarisaInnovationUseLevelsSpy).toHaveBeenCalled();
    expect(component.useList).toEqual([{ index: '0' }]);
  });

  it('should return useList on rangeListByIndex if index % 2 === 0', () => {
    component.useList = [{ index: '0' }];

    component.rangeListByIndex(0);

    expect(component.rangeListByIndex(0)).toEqual([{ index: '0' }]);
  });

  it('should return readinessList on rangeListByIndex if index % 2 !== 0', () => {
    component.readinessList = [{ index: '0' }];

    component.rangeListByIndex(1);

    expect(component.rangeListByIndex(1)).toEqual([{ index: '0' }]);
  });
});
