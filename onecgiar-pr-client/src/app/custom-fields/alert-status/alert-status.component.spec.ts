import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertStatusComponent } from './alert-status.component';

describe('AlertStatusComponent', () => {
  let component: AlertStatusComponent;
  let fixture: ComponentFixture<AlertStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
