import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScaleImpactAnalysisComponent } from './scale-impact-analysis.component';

describe('ScaleImpactAnalysisComponent', () => {
  let component: ScaleImpactAnalysisComponent;
  let fixture: ComponentFixture<ScaleImpactAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScaleImpactAnalysisComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScaleImpactAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
