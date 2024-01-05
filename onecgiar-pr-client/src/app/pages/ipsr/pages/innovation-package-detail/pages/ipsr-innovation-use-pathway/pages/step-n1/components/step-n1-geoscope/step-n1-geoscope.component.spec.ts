import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1GeoscopeComponent } from './step-n1-geoscope.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN1GeoscopeComponent', () => {
  let component: StepN1GeoscopeComponent;
  let fixture: ComponentFixture<StepN1GeoscopeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1GeoscopeComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1GeoscopeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
