import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1ScalingAmbitionBlurbComponent } from './step-n1-scaling-ambition-blurb.component';

describe('StepN1ScalingAmbitionBlurbComponent', () => {
  let component: StepN1ScalingAmbitionBlurbComponent;
  let fixture: ComponentFixture<StepN1ScalingAmbitionBlurbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN1ScalingAmbitionBlurbComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN1ScalingAmbitionBlurbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
