import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1InstitutionsComponent } from './step-n1-institutions.component';

describe('StepN1InstitutionsComponent', () => {
  let component: StepN1InstitutionsComponent;
  let fixture: ComponentFixture<StepN1InstitutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN1InstitutionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN1InstitutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
