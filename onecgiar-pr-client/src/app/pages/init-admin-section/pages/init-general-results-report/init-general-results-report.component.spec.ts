import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitGeneralResultsReportComponent } from './init-general-results-report.component';

describe('InitGeneralResultsReportComponent', () => {
  let component: InitGeneralResultsReportComponent;
  let fixture: ComponentFixture<InitGeneralResultsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InitGeneralResultsReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InitGeneralResultsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
