import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1SdgTargetsComponent } from './step-n1-sdg-targets.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN1SdgTargetsComponent', () => {
  let component: StepN1SdgTargetsComponent;
  let fixture: ComponentFixture<StepN1SdgTargetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1SdgTargetsComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1SdgTargetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
