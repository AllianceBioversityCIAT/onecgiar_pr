import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportNewResultButtonComponent } from './report-new-result-button.component';

describe('ReportNewResultButtonComponent', () => {
  let component: ReportNewResultButtonComponent;
  let fixture: ComponentFixture<ReportNewResultButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportNewResultButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportNewResultButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
