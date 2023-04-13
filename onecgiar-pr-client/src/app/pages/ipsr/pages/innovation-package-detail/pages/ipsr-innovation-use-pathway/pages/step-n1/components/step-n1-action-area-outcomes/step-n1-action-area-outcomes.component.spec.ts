import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1ActionAreaOutcomesComponent } from './step-n1-action-area-outcomes.component';

describe('StepN1ActionAreaOutcomesComponent', () => {
  let component: StepN1ActionAreaOutcomesComponent;
  let fixture: ComponentFixture<StepN1ActionAreaOutcomesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN1ActionAreaOutcomesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN1ActionAreaOutcomesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
