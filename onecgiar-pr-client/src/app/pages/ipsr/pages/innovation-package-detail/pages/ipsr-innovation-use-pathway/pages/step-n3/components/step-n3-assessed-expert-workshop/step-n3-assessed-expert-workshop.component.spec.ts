import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN3AssessedExpertWorkshopComponent } from './step-n3-assessed-expert-workshop.component';

describe('StepN3AssessedExpertWorkshopComponent', () => {
  let component: StepN3AssessedExpertWorkshopComponent;
  let fixture: ComponentFixture<StepN3AssessedExpertWorkshopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN3AssessedExpertWorkshopComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN3AssessedExpertWorkshopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
