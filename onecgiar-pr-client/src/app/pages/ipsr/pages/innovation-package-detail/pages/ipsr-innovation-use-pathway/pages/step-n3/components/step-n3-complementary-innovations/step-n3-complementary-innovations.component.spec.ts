import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StepN3ComplementaryInnovationsComponent } from './step-n3-complementary-innovations.component';

describe('StepN3ComplementaryInnovationsComponent', () => {
  let component: StepN3ComplementaryInnovationsComponent;
  let fixture: ComponentFixture<StepN3ComplementaryInnovationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN3ComplementaryInnovationsComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN3ComplementaryInnovationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should change bodyItem.open to true', () => {
    const bodyItem = { open: false };
    component.toggleCollapseItem(true, bodyItem);
    expect(bodyItem.open).toBeTruthy();
  });

  it('should change bodyItem.open to false', () => {
    const bodyItem = { open: true };
    component.toggleCollapseItem(false, bodyItem);
    expect(bodyItem.open).toBeFalsy();
  });

  it('should return a string with the readiness level self-assessment text', () => {
    const result = component.readinessLevelSelfAssessmentText();
    expect(result).toBe(`<li><a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view"  class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels</li>
    <li><strong>YOUR READINESS SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a>.</strong></li>`);
  });

  it('should return a string with the use level self-assessment text', () => {
    const result = component.useLevelDelfAssessment();
    expect(result).toBe(`<li><a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels</li>
    <li><strong>YOUR USE SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`);
  });

  it('should update rangeLevel1Required based on readiness_level_evidence_based_index != 0 and return the value', () => {
    const bodyItem = { readiness_level_evidence_based: 1 };
    const result = component.updateRangeLevel1(bodyItem);
    expect(result).toBeTruthy();
    expect(component.rangeLevel1Required).toBeTruthy();
  });

  it('should update rangeLevel2Required based on use_level_evidence_based_index != 0 and return the value', () => {
    const bodyItem = { use_level_evidence_based: 1 };
    const result = component.updateRangeLevel2(bodyItem);
    expect(result).toBeTruthy();
    expect(component.rangeLevel2Required).toBeTruthy();
  });

  it('should return true if all fields are required', () => {
    const bodyItem = {
      readiness_level_evidence_based: 1,
      use_level_evidence_based: 1,
      readinees_evidence_link: 'https://example.com',
      use_evidence_link: 'https://example.com'
    };
    const result = component.allFieldsRequired(bodyItem);
    expect(result).toBeTruthy();
  });

  it('should return false if any field is missing', () => {
    const bodyItem = {
      readiness_level_evidence_based: 1,
      use_level_evidence_based: 1,
      readinees_evidence_link: 'https://example.com'
    };
    const result = component.allFieldsRequired(bodyItem);
    expect(result).toBeFalsy();
  });
});
