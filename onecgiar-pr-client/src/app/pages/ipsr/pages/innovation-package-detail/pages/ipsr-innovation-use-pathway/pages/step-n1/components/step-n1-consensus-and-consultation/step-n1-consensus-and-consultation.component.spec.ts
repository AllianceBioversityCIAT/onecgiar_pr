import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1ConsensusAndConsultationComponent } from './step-n1-consensus-and-consultation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN1ConsensusAndConsultationComponent', () => {
  let component: StepN1ConsensusAndConsultationComponent;
  let fixture: ComponentFixture<StepN1ConsensusAndConsultationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1ConsensusAndConsultationComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1ConsensusAndConsultationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
