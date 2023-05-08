import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddBilateralComponent } from './step-n4-add-bilateral.component';

describe('StepN4AddBilateralComponent', () => {
  let component: StepN4AddBilateralComponent;
  let fixture: ComponentFixture<StepN4AddBilateralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN4AddBilateralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN4AddBilateralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
