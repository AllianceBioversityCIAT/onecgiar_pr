import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeOneReportComponent } from './type-one-report.component';

describe('TypeOneReportComponent', () => {
  let component: TypeOneReportComponent;
  let fixture: ComponentFixture<TypeOneReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TypeOneReportComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeOneReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
