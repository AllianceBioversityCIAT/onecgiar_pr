import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GesiInnovationAssessmentComponent } from './gesi-innovation-assessment.component';

describe('GesiInnovationAssessmentComponent', () => {
  let component: GesiInnovationAssessmentComponent;
  let fixture: ComponentFixture<GesiInnovationAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GesiInnovationAssessmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GesiInnovationAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
