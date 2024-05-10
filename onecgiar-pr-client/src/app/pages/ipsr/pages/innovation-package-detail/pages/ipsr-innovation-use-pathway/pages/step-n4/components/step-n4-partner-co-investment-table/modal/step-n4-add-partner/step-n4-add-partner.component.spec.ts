import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddPartnerComponent } from './step-n4-add-partner.component';
import { HttpClientModule } from '@angular/common/http';

describe('StepN4AddPartnerComponent', () => {
  let component: StepN4AddPartnerComponent;
  let fixture: ComponentFixture<StepN4AddPartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4AddPartnerComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4AddPartnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
