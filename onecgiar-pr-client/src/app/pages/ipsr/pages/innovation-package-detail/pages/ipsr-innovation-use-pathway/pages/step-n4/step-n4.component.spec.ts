import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4Component } from './step-n4.component';

describe('StepN4Component', () => {
  let component: StepN4Component;
  let fixture: ComponentFixture<StepN4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN4Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
