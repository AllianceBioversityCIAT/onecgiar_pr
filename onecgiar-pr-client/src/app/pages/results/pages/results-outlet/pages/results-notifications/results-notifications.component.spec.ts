import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsNotificationsComponent } from './results-notifications.component';

describe('ResultsNotificationsComponent', () => {
  let component: ResultsNotificationsComponent;
  let fixture: ComponentFixture<ResultsNotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsNotificationsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
