import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1InstitutionsComponent } from './step-n1-institutions.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN1InstitutionsComponent', () => {
  let component: StepN1InstitutionsComponent;
  let fixture: ComponentFixture<StepN1InstitutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1InstitutionsComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1InstitutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
