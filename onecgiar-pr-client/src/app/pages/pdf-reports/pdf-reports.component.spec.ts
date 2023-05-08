import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfReportsComponent } from './pdf-reports.component';

describe('PdfReportsComponent', () => {
  let component: PdfReportsComponent;
  let fixture: ComponentFixture<PdfReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PdfReportsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
