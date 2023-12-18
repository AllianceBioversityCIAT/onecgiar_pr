import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';

describe('StepTwoBasicInfoComponent', () => {
  let component: StepTwoBasicInfoComponent;
  let fixture: ComponentFixture<StepTwoBasicInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepTwoBasicInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepTwoBasicInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
