import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN2Component } from './step-n2.component';

describe('StepN2Component', () => {
  let component: StepN2Component;
  let fixture: ComponentFixture<StepN2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
