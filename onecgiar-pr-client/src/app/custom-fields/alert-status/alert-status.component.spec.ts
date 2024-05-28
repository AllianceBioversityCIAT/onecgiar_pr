import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertStatusComponent } from './alert-status.component';

describe('AlertStatusComponent', () => {
  let component: AlertStatusComponent;
  let fixture: ComponentFixture<AlertStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept only "info" or "warning" status values', () => {
    // Set valid status value
    component.status = 'info';
    expect(() => fixture.detectChanges()).not.toThrowError();

    component.status = 'warning';
    expect(() => fixture.detectChanges()).not.toThrowError();
  });
});
