import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1EoiOutcomesComponent } from './step-n1-eoi-outcomes.component';

describe('StepN1EoiOutcomesComponent', () => {
  let component: StepN1EoiOutcomesComponent;
  let fixture: ComponentFixture<StepN1EoiOutcomesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN1EoiOutcomesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN1EoiOutcomesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
