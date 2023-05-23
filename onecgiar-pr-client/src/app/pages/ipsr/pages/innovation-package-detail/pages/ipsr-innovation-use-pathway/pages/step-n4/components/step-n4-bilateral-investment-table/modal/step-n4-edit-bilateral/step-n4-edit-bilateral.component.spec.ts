import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4EditBilateralComponent } from './step-n4-edit-bilateral.component';

describe('StepN4EditBilateralComponent', () => {
  let component: StepN4EditBilateralComponent;
  let fixture: ComponentFixture<StepN4EditBilateralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN4EditBilateralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN4EditBilateralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
