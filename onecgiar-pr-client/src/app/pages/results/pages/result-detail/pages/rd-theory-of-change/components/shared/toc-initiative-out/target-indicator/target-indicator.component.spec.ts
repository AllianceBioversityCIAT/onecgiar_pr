import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TargetIndicatorComponent } from './target-indicator.component';
import { environment } from '../../../../../../../../../../../environments/environment';
import { AlertStatusComponent } from '../../../../../../../../../../custom-fields/alert-status/alert-status.component';
import { ResultsApiService } from '../../../../../../../../../../shared/services/api/results-api.service';

describe('TargetIndicatorComponent', () => {
  let component: TargetIndicatorComponent;
  let fixture: ComponentFixture<TargetIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TargetIndicatorComponent, AlertStatusComponent],
      imports: [HttpClientTestingModule],
      providers: [ResultsApiService]
    }).compileComponents();

    fixture = TestBed.createComponent(TargetIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set mappedResultsModal to true and isTarget to true when calling mappedResultsModal method', () => {
    const statement = 'Test statement';
    const measure = 'Test measure';
    const overall = 'Test overall';
    const date = 'Test date';
    const contributors = ['Test contributor'];

    component.mappedResultsModal(statement, measure, overall, date, contributors);

    expect(component.mappedResultService.mappedResultsModal).toBe(true);
    expect(component.mappedResultService.isTarget).toBe(true);
    expect(component.mappedResultService.targetData).toEqual({
      statement: statement,
      measure: measure,
      overall: overall,
      date: date,
      contributors: contributors
    });
  });

  it('should return the correct description when calling descriptionAlert method', () => {
    const expectedDescription = `Please ensure the planned location is reflected in section <a class='open_route alert-event' href="${environment.frontBaseUrl}result/result-detail/${component.api.resultsSE.currentResultCode}/geographic-location?phase=${component.api.resultsSE.currentResultPhase}" target='_blank'>4. Geographic location</a>. If you decide to change remember to update your TOC result framework. DD is working to automate the geolocation and in the near future you will not need to fill section 4 again.`;

    const description = component.descriptionAlert();

    expect(description).toBe(expectedDescription);
  });

  it('should return the sum of two numbers when calling getOverallProgress method', () => {
    const overallContributing = 5;
    const contributing = 3;
    const expectedProgress = overallContributing + contributing;

    const progress = component.getOverallProgress(overallContributing, contributing);

    expect(progress).toBe(expectedProgress);
  });

  it('should return the correct description when calling descriptionWarning method', () => {
    const type1 = 'Type 1';
    const type2 = 'Type 2';
    const expectedDescription = `The type of result ${type1} you are reporting does not match the type ${type2} of this indicator, therefore, progress cannot be reported. Please ensure that the indicator category matches the indicator type for accurate reporting.`;

    const description = component.descriptionWarning(type1, type2);

    expect(description).toBe(expectedDescription);
  });

  it('should return the correct description object when calling descriptionWarningYear method', () => {
    const dateFormat = '2022-01-01';
    const year = 2022;
    const expectedDescription = {
      is_alert: false,
      description:
        'You are reporting against an indicator that had a target in a following year. If you feel the TOC Result Framework is outdated please edit it. If the result framework is correct and you are reporting this result in advance, please go ahead.'
    };

    const description = component.descriptionWarningYear(dateFormat, year);

    expect(description).toEqual(expectedDescription);
  });

  it('should return the sum of a number and 1 when calling sumIndicator method', () => {
    const item = '5';
    const expectedSum = Number(item) + 1;

    const sum = component.sumIndicator(item);

    expect(sum).toBe(expectedSum);
  });

  it('should return true when calling checkAlert method with valid conditions', () => {
    component.initiative = {
      type_value: 'custom1',
      number_result_type: 2,
      result: {
        result_type_id: 5
      }
    };

    const result = component.checkAlert();

    expect(result).toBe(true);
  });

  it('should return false when calling checkAlert method with invalid conditions', () => {
    component.initiative = {
      type_value: 'custom',
      number_result_type: 2,
      result: {
        result_type_id: 8
      }
    };

    const result = component.checkAlert();

    expect(result).toBe(false);
  });
});
