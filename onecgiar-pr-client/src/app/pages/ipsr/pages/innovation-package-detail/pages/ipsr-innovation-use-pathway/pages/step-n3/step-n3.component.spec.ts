import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN3Component } from './step-n3.component';

describe('StepN3Component', () => {
  let component: StepN3Component;
  let fixture: ComponentFixture<StepN3Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN3Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
