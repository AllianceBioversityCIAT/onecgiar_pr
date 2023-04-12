import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1Component } from './step-n1.component';

describe('StepN1Component', () => {
  let component: StepN1Component;
  let fixture: ComponentFixture<StepN1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN1Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
