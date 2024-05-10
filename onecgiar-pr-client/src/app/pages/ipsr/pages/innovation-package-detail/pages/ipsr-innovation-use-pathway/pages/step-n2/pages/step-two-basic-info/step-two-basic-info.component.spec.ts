import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { HttpClientModule } from '@angular/common/http';

describe('StepTwoBasicInfoComponent', () => {
  let component: StepTwoBasicInfoComponent;
  let fixture: ComponentFixture<StepTwoBasicInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepTwoBasicInfoComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepTwoBasicInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
